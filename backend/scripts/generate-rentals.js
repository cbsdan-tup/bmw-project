const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
const Car = require('../models/Cars');
const Rental = require('../models/Rental');
const DiscountCode = require('../models/DiscountCode');
const { format, addDays, subDays, differenceInDays } = require('date-fns');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
console.log(`Connecting to MongoDB at: ${process.env.DB_URI ? process.env.DB_URI.substring(0, 20) + '...' : 'undefined'}`);

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Payment methods for rentals
const paymentMethods = ['GCash', 'Credit Card', 'Cash'];

// Helper functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random dates for rentals with proper distribution
function generateRentalDates(status) {
  const now = new Date();
  const twoMonthsAgo = subDays(now, 60);
  const sixMonthsFromNow = addDays(now, 180);
  
  let pickUpDate, returnDate;
  
  switch (status) {
    case 'Returned':
      // For returned rentals, use dates in the past
      pickUpDate = new Date(
        twoMonthsAgo.getTime() + Math.random() * (now.getTime() - twoMonthsAgo.getTime())
      );
      // Return date is 1-14 days after pickup, but before now
      const maxReturnDate = new Date(Math.min(addDays(pickUpDate, 14).getTime(), now.getTime()));
      returnDate = new Date(
        pickUpDate.getTime() + Math.random() * (maxReturnDate.getTime() - pickUpDate.getTime())
      );
      break;
      
    case 'Active':
      // For active rentals, pickup date is in the past, return date is in the future
      pickUpDate = new Date(
        subDays(now, 14).getTime() + Math.random() * (now.getTime() - subDays(now, 14).getTime())
      );
      returnDate = new Date(
        now.getTime() + Math.random() * (addDays(now, 14).getTime() - now.getTime())
      );
      break;
      
    case 'Confirmed':
      // For confirmed rentals, both dates are in the future
      pickUpDate = new Date(
        now.getTime() + Math.random() * (addDays(now, 30).getTime() - now.getTime())
      );
      returnDate = new Date(
        pickUpDate.getTime() + Math.random() * (addDays(pickUpDate, 14).getTime() - pickUpDate.getTime())
      );
      break;
      
    case 'Pending':
      // For pending rentals, both dates are in the future, potentially further out
      pickUpDate = new Date(
        addDays(now, 7).getTime() + Math.random() * (addDays(now, 60).getTime() - addDays(now, 7).getTime())
      );
      returnDate = new Date(
        pickUpDate.getTime() + Math.random() * (addDays(pickUpDate, 14).getTime() - pickUpDate.getTime())
      );
      break;
      
    case 'Canceled':
      // For canceled rentals, both dates are in the past or future (doesn't matter much)
      pickUpDate = new Date(
        twoMonthsAgo.getTime() + Math.random() * (addDays(now, 60).getTime() - twoMonthsAgo.getTime())
      );
      returnDate = new Date(
        pickUpDate.getTime() + Math.random() * (addDays(pickUpDate, 14).getTime() - pickUpDate.getTime())
      );
      break;
      
    default:
      // Default case, both dates in the future
      pickUpDate = new Date(
        now.getTime() + Math.random() * (sixMonthsFromNow.getTime() - now.getTime())
      );
      returnDate = new Date(
        pickUpDate.getTime() + Math.random() * (addDays(pickUpDate, 14).getTime() - pickUpDate.getTime())
      );
  }
  
  return { pickUpDate, returnDate };
}

// Calculate appropriate payment status based on rental status
function getPaymentStatus(rentalStatus) {
  switch (rentalStatus) {
    case 'Returned':
      return 'Paid';
    case 'Active':
      return 'Paid';
    case 'Confirmed':
      return Math.random() > 0.3 ? 'Paid' : 'Pending';
    case 'Pending':
      return 'Pending';
    case 'Canceled':
      return Math.random() > 0.7 ? 'Refunded' : 'Paid';
    default:
      return 'Pending';
  }
}

// Main function to generate rental records
async function generateRentals() {
  try {
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    // Get all cars with their owners
    const cars = await Car.find({}).populate('owner');
    console.log(`Found ${cars.length} cars`);
    
    // Get all discount codes
    const discountCodes = await DiscountCode.find({});
    console.log(`Found ${discountCodes.length} discount codes`);
    
    if (users.length === 0 || cars.length === 0) {
      console.error('Not enough users or cars to generate rentals');
      return;
    }
    
    let totalRentalsCreated = 0;
    
    // For each user, create at least 3 rental records
    for (const user of users) {
      console.log(`Generating rentals for user: ${user.firstName} ${user.lastName}`);
      
      // Filter to get cars that don't belong to the current user
      const availableCars = cars.filter(car => car.owner && car.owner._id.toString() !== user._id.toString());
      
      if (availableCars.length === 0) {
        console.log(`No available cars for user ${user.firstName} to rent, skipping...`);
        continue;
      }
      
      // Define rental statuses for this user (2 Returned, 1 random)
      const rentalStatuses = ['Returned', 'Returned'];
      const otherStatuses = ['Pending', 'Confirmed', 'Active', 'Canceled'];
      rentalStatuses.push(getRandomElement(otherStatuses));
      
      // Shuffle the statuses to randomize which rental gets which status
      rentalStatuses.sort(() => 0.5 - Math.random());
      
      // Create 3 rentals for this user
      const rentalsToCreate = Math.min(3, availableCars.length);
      let userRentalsCreated = 0;
      
      for (let i = 0; i < rentalsToCreate; i++) {
        // Pick a random car to rent
        const car = availableCars[i % availableCars.length];
        const status = rentalStatuses[i];
        
        // Generate appropriate dates based on status
        const { pickUpDate, returnDate } = generateRentalDates(status);
        
        // Calculate rental duration in days
        const rentalDays = Math.max(1, differenceInDays(returnDate, pickUpDate));
        
        // Calculate original amount based on car price per day and duration
        const originalAmount = car.pricePerDay * rentalDays;
        
        // Determine if this rental gets a discount (30% chance)
        const hasDiscount = Math.random() < 0.3 && discountCodes.length > 0;
        
        let finalAmount = originalAmount;
        let discount = null;
        
        if (hasDiscount) {
          // Pick a random discount code
          const discountCode = getRandomElement(discountCodes);
          
          // Calculate discount amount
          const discountAmount = Math.round(originalAmount * (discountCode.discountPercentage / 100));
          
          // Calculate final amount after discount
          finalAmount = originalAmount - discountAmount;
          
          discount = {
            code: discountCode.code,
            discountPercentage: discountCode.discountPercentage,
            discountAmount: discountAmount
          };
        }
        
        // Get appropriate payment status
        const paymentStatus = getPaymentStatus(status);
        
        // Create the rental record
        const rental = new Rental({
          car: car._id,
          renter: user._id,
          pickUpDate: pickUpDate,
          returnDate: returnDate,
          status: status,
          paymentMethod: getRandomElement(paymentMethods),
          paymentStatus: paymentStatus,
          discount: discount,
          originalAmount: originalAmount,
          finalAmount: finalAmount
        });
        
        // Save the rental
        await rental.save();
        userRentalsCreated++;
        totalRentalsCreated++;
        
        console.log(`Created ${status} rental for ${user.firstName} ${user.lastName}: ${car.brand} ${car.model} from ${format(pickUpDate, 'MMM dd, yyyy')} to ${format(returnDate, 'MMM dd, yyyy')} - ${hasDiscount ? `Discounted by ${discount.discountPercentage}%` : 'No discount'}`);
      }
      
      console.log(`Created ${userRentalsCreated} rentals for user ${user.firstName} ${user.lastName}`);
    }
    
    console.log(`Rental generation complete! Created ${totalRentalsCreated} rentals total.`);
    
  } catch (error) {
    console.error('Error generating rentals:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
generateRentals();
