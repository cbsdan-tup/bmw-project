const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const Rental = require('../models/Rental');
const Review = require('../models/Review');
const Car = require('../models/Cars');
const User = require('../models/User'); // Add User model import to fix schema error
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// Positive comment templates for high ratings (4-5 stars)
const positiveComments = [
  "Excellent car! {car} was in perfect condition and drove smoothly. The {feature} was a nice bonus. {owner} was very helpful and responsive. Would definitely rent again!",
  "Great experience with this {car}! Very clean and well-maintained. The {feature} made the trip much more enjoyable. {owner} was punctual and professional.",
  "I had an amazing time with this {car}. It was spotless and ran perfectly. The {feature} was fantastic for {activity}. Pickup and return were super easy. Highly recommend!",
  "This {car} exceeded my expectations! Very fuel efficient and comfortable for {activity}. {owner} explained everything clearly and was flexible with pickup time. Will rent again!",
  "Really enjoyed driving this {car}! The {feature} was excellent for {activity}. The car was in great condition and {owner} was very accommodating. 10/10 would recommend!",
  "Perfect rental experience! The {car} was extremely clean and ran without issues. {feature} worked great. {owner} responded quickly to all my messages. Will definitely rent again.",
  "Absolutely loved this {car}! It was ideal for {activity} and the {feature} was a game changer. The car was immaculate and {owner} made the whole process seamless.",
  "Wonderful experience! The {car} was exactly as described. {feature} was very useful during our trip. {owner} was professional and friendly. Would definitely rent again!",
  "Top-notch rental! This {car} was in excellent condition and perfect for {activity}. The {feature} was an added bonus. {owner} was a pleasure to deal with.",
  "Amazing car and owner! The {car} was clean, well-maintained, and drove perfectly. The {feature} made our trip so much better. {owner} was responsive and helpful throughout."
];

// Mixed comment templates for medium ratings (3 stars)
const mixedComments = [
  "The {car} was good overall. {feature} worked well, but there were some minor issues with {issue}. {owner} was helpful though and sorted things out quickly.",
  "Decent experience with the {car}. It was clean but had a few {issue} problems. {owner} was responsive when I reached out. Adequate for {activity}.",
  "Pretty good rental. The {car} got us where we needed to go. The {feature} was nice, but the {issue} was a bit annoying. {owner} was friendly and communicative.",
  "Average experience. The {car} was okay but not as clean as I expected. The {feature} was useful though. {owner} was easy to communicate with.",
  "3 stars because the {car} had some {issue} that wasn't mentioned in the listing. However, {owner} was apologetic and the {feature} worked great for our {activity}.",
  "Mixed feelings about this rental. The {car} was functional and the {feature} was good, but there were some {issue} issues. {owner} was nice though.",
  "The {car} was adequate for our {activity}. The {feature} was helpful, but the car had some {issue} that made it less comfortable. {owner} was responsive to messages.",
  "Satisfactory experience. The {car} had minor {issue} problems but was generally reliable. The {feature} was a plus. {owner} was professional during handover.",
  "Ok rental for the price. The {car} had a {issue} issue, but nothing major. The {feature} functioned well. {owner} was punctual for pickup and return.",
  "Middle-of-the-road experience. {car} was decent with good {feature}, but could use some maintenance for the {issue}. {owner} was friendly and tried to help."
];

// Negative comment templates for low ratings (1-2 stars)
const negativeComments = [
  "Disappointed with this rental. The {car} had significant {issue} problems, and the {feature} didn't work as described. {owner} was difficult to reach when issues arose.",
  "Not a good experience. The {car} wasn't clean and had major {issue} issues. The {feature} was broken. {owner} was late for both pickup and return.",
  "Would not recommend. The {car} broke down during our {activity} due to {issue}. The {feature} didn't work at all. {owner} wasn't helpful in resolving the situation.",
  "Frustrating experience. The {car} was in poor condition with {issue} problems. The {feature} was misleading in the listing. {owner} was unresponsive to our concerns.",
  "Below expectations. The {car} had multiple {issue} issues that made our {activity} stressful. The {feature} was not as advertised. {owner} didn't seem to care about our experience.",
  "Regret renting this {car}. It was dirty and had serious {issue} problems. The {feature} was broken. {owner} was defensive when we reported the issues.",
  "Poor rental experience. The {car} smelled bad and had {issue} issues. The {feature} didn't work properly. {owner} was late and uncommunicative.",
  "Wouldn't rent again. The {car} was unreliable with {issue} problems throughout our trip. The {feature} was disappointing. {owner} didn't provide adequate support.",
  "Bad experience overall. The {car} was not as described with significant {issue} issues. The {feature} was non-functional. {owner} didn't seem to maintain the vehicle well.",
  "Avoid this rental. The {car} was in terrible condition with {issue} problems. The {feature} didn't work at all. {owner} was unwilling to address our concerns."
];

// Car features to mention positively in reviews
const carFeatures = [
  "GPS navigation", "Bluetooth connectivity", "backup camera", "sunroof", "leather seats",
  "fuel efficiency", "spacious trunk", "all-wheel drive", "sport mode", "cruise control",
  "heated seats", "parking sensors", "Apple CarPlay", "Android Auto", "premium sound system",
  "air conditioning", "keyless entry", "automatic transmission", "power windows", "comfortable seating"
];

// Activities people did with the cars
const activities = [
  "road trips", "city driving", "family outings", "business meetings", "weekend getaways",
  "airport transfers", "moving furniture", "beach trips", "mountain drives", "sightseeing",
  "daily commuting", "shopping trips", "visiting relatives", "touring the countryside", "special events"
];

// Possible issues for negative reviews
const issues = [
  "brake", "transmission", "air conditioning", "engine noise", "tire pressure",
  "window operation", "fuel gauge", "battery", "door lock", "starting",
  "headlight", "windshield wiper", "alignment", "squeaking", "steering",
  "suspension", "entertainment system", "seat adjustment", "check engine light", "air bag warning"
];

// Helper functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to upload review placeholder image
async function getReviewImage() {
  try {
    // Define the correct path to the placeholder image
    const placeholderPath = path.resolve(__dirname, '../images/review-placeholder.jpg');
    console.log('Looking for review placeholder image at:', placeholderPath);
    
    // Check if the file exists
    if (fs.existsSync(placeholderPath)) {
      console.log('Found review placeholder image, uploading to Cloudinary...');
      try {
        // Upload the actual image file to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(placeholderPath, {
          folder: 'review_images',
          public_id: 'review-placeholder',
          overwrite: true
        });
        
        console.log('Successfully uploaded review placeholder image:', uploadResult.public_id);
        return {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url
        };
      } catch (uploadError) {
        console.error('Error uploading review placeholder image:', uploadError);
        // Fall back to an existing placeholder if upload fails
        return useExistingPlaceholder();
      }
    } else {
      console.error('Review placeholder image not found at:', placeholderPath);
      // Fall back to an existing placeholder
      return useExistingPlaceholder();
    }
  } catch (error) {
    console.error('Error in getReviewImage:', error);
    // Return a default placeholder URL as last resort
    return {
      public_id: 'review_images/review-placeholder',
      url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/placeholder`
    };
  }
}

// Helper function to use an existing placeholder if available
async function useExistingPlaceholder() {
  try {
    console.log('Checking for existing review placeholder image in Cloudinary...');
    const existingImages = await cloudinary.search
      .expression('folder:review_images')
      .max_results(1)
      .execute();
      
    if (existingImages && existingImages.resources && existingImages.resources.length > 0) {
      console.log('Using existing review placeholder image from Cloudinary');
      const existingImage = existingImages.resources[0];
      return {
        public_id: existingImage.public_id,
        url: existingImage.secure_url
      };
    } else {
      console.log('No existing review placeholder image found, using default URL');
      return {
        public_id: 'review_images/review-placeholder',
        url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/placeholder`
      };
    }
  } catch (error) {
    console.error('Error finding existing placeholder:', error);
    return {
      public_id: 'review_images/review-placeholder',
      url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/placeholder`
    };
  }
}

// Function to format a review comment with real details
async function formatReviewComment(template, car, owner, rating) {
  try {
    // Get car details if only the ID was provided
    let carDetails = car;
    if (typeof car === 'string' || car instanceof mongoose.Types.ObjectId) {
      carDetails = await Car.findById(car);
    }
    
    // Format with car details
    let comment = template;
    
    // Replace car placeholder with brand and model
    if (carDetails && carDetails.brand && carDetails.model) {
      comment = comment.replace('{car}', `${carDetails.brand} ${carDetails.model}`);
    } else {
      comment = comment.replace('{car}', 'vehicle');
    }
    
    // Replace feature placeholder
    comment = comment.replace('{feature}', getRandomElement(carFeatures));
    
    // Replace activity placeholder
    comment = comment.replace('{activity}', getRandomElement(activities));
    
    // Replace owner placeholder
    comment = comment.replace('{owner}', 'The owner');
    
    // If it's a negative or mixed review, add an issue
    if (rating <= 3) {
      comment = comment.replace('{issue}', getRandomElement(issues));
    }
    
    return comment;
  } catch (error) {
    console.error('Error formatting review comment:', error);
    return template; // Return the template if something goes wrong
  }
}

// Main function to generate reviews for returned rentals
async function generateReviews() {
  try {
    // Get a placeholder image for reviews
    console.log('Setting up review image...');
    const reviewImage = await getReviewImage();
    console.log('Using review image:', reviewImage);
    
    // Get all rentals with "Returned" status
    console.log('Fetching returned rentals...');
    // Fetch without populate first to avoid schema errors
    const returnedRentals = await Rental.find({ status: 'Returned' });
    
    if (!returnedRentals || returnedRentals.length === 0) {
      console.log('No returned rentals found. Make sure to run generate-rentals.js first.');
      return;
    }
    
    console.log(`Found ${returnedRentals.length} returned rentals to generate reviews for`);
    
    // Check for existing reviews to avoid duplicates
    const existingReviews = await Review.find({});
    const existingRentalIds = existingReviews.map(review => 
      review.rental && review.rental.toString ? review.rental.toString() : review.rental
    );
    
    let totalReviewsCreated = 0;
    
    // Process each rental
    for (const rental of returnedRentals) {
      // Skip if a review already exists for this rental
      if (existingRentalIds.includes(rental._id.toString())) {
        console.log(`Review already exists for rental ${rental._id}, skipping...`);
        continue;
      }
      
      // Load details needed for review
      console.log(`Loading details for rental ${rental._id}...`);
      const rentalWithDetails = await Rental.findById(rental._id)
        .populate('car')
        .populate('renter');
      
      if (!rentalWithDetails.car || !rentalWithDetails.renter) {
        console.log(`Missing car or renter details for rental ${rental._id}, skipping...`);
        continue;
      }
      
      // Generate a realistic rating (weighted towards positive)
      let rating;
      const ratingRandom = Math.random();
      if (ratingRandom < 0.65) {
        // 65% chance of 4-5 star review
        rating = getRandomInt(4, 5);
      } else if (ratingRandom < 0.85) {
        // 20% chance of 3 star review
        rating = 3;
      } else {
        // 15% chance of 1-2 star review
        rating = getRandomInt(1, 2);
      }
      
      // Select appropriate comment template based on rating
      let commentTemplate;
      if (rating >= 4) {
        commentTemplate = getRandomElement(positiveComments);
      } else if (rating === 3) {
        commentTemplate = getRandomElement(mixedComments);
      } else {
        commentTemplate = getRandomElement(negativeComments);
      }
      
      // Format the comment with real details
      const formattedComment = await formatReviewComment(
        commentTemplate, 
        rentalWithDetails.car, 
        null, // Owner info not needed as we're using placeholder text
        rating
      );
      
      // Decide if we should include images (30% chance)
      const includeImages = Math.random() < 0.3;
      const images = includeImages ? [{ public_id: reviewImage.public_id, url: reviewImage.url }] : [];
      
      try {
        // Create the review
        const review = new Review({
          rental: rental._id,
          renter: rentalWithDetails.renter._id,
          rating: rating,
          comment: formattedComment,
          images: images,
          createdAt: new Date(rental.returnDate.getTime() + getRandomInt(1, 48) * 60 * 60 * 1000) // 1-48 hours after return
        });
        
        // Save the review
        await review.save();
        totalReviewsCreated++;
        
        console.log(`Created ${rating}-star review for ${rentalWithDetails.car.brand} ${rentalWithDetails.car.model} by ${rentalWithDetails.renter.firstName} ${rentalWithDetails.renter.lastName}`);
      } catch (reviewError) {
        console.error(`Error creating review for rental ${rental._id}:`, reviewError.message);
      }
    }
    
    console.log(`Review generation complete! Created ${totalReviewsCreated} reviews.`);
    
  } catch (error) {
    console.error('Error generating reviews:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
generateReviews();
