const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Car = require('../models/Cars');
const Message = require('../models/message');
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

// Realistic message templates for inquiries about cars
const inquiryTemplates = [
  "Hi, I'm interested in renting your {car}. Is it available for {dates}?",
  "Hello there! I was wondering if your {car} is still available for rent? I'm planning a trip on {dates}.",
  "Good day! I'd like to inquire about your {car}. I need a vehicle for {dates}. Is it available?",
  "Hi, your {car} looks perfect for my needs. Can I rent it for {dates}?",
  "Hello! I'm looking for a car like your {car} for an upcoming trip. Is it available for {dates}?",
  "I really like your {car} and would like to rent it for {dates}. Is it available?",
  "Your {car} caught my eye. I'm planning a trip on {dates} and would love to rent it. Is that possible?",
  "Hello, I'm interested in your {car}. Would it be available for {dates}? Also, is pickup from {location} ok?",
  "Hi there, I noticed your {car} and it looks perfect for my needs. Do you have availability for {dates}?",
  "I'm looking to rent a car for {dates} and your {car} seems perfect. Is it available?"
];

// Realistic response templates from car owners
const responseTemplates = [
  "Hi there! Yes, my {car} is available for {dates}. When would you like to pick it up?",
  "Hello! Thanks for your interest in my {car}. It is available for {dates}. Would you like to proceed with the booking?",
  "Hi! Yes, the {car} is available for those dates. Let me know if you have any questions about the vehicle.",
  "Hello, thank you for your inquiry. My {car} is available for {dates}. Would you like to know any specific details about it?",
  "Hi! I'd be happy to rent you my {car} for {dates}. It has {feature} which makes it great for {activity}.",
  "Thanks for your interest! The {car} is available for the dates you mentioned. It's great for {activity} and has {feature}.",
  "Hello! My {car} is indeed available for {dates}. It has low mileage and is in excellent condition. Would you like to proceed?",
  "Hi! Yes, my {car} is available then. It's fuel-efficient and perfect for {activity}. Let me know if you'd like to book it.",
  "Thanks for your message! Yes, the {car} is available for {dates}. It comes with {feature}, which many renters appreciate.",
  "Hello! The {car} is available for your dates. It's recently serviced and ready to go. Would you like to make a reservation?"
];

// Follow-up templates from interested renters
const followUpTemplates = [
  "That's great! I'd like to pick it up around {time} on the first day. Does that work for you?",
  "Excellent! Does the car have {feature}? Also, what's the fuel policy?",
  "Perfect! I'm interested in booking it. What documents do I need to bring for the pickup?",
  "Great! I'm excited to rent your {car}. Do you offer delivery to {location} by any chance?",
  "Sounds good! Is there a security deposit required? And how does the return process work?",
  "Awesome! Just to confirm, the total would be {price} for the entire period, right?",
  "Thanks for the quick response! Does the price include insurance, or is that extra?",
  "That works for me! Is there anything I should know about the car before driving it?",
  "Perfect timing! Could you tell me more about the {feature} of the car? I'm particularly interested in that.",
  "Great! Do you have a preferred pickup location in {location}?"
];

// Final response templates from car owners
const finalResponseTemplates = [
  "Yes, {time} works fine for pickup. I'll meet you at {location}. Looking forward to it!",
  "Yes, the car has {feature}. Regarding fuel, I expect it to be returned with the same level as when you received it.",
  "Great! Please bring your driver's license and a valid credit card. We'll complete the paperwork when you arrive.",
  "I can arrange delivery to {location} for an additional {price}. Would that work for you?",
  "There's a refundable security deposit of {price}, and for return, just meet me at the same location where you picked it up.",
  "That's correct, the total is {price} for your rental period. All inclusive with no hidden fees.",
  "The price includes basic insurance. If you want premium coverage, that would be an extra {price} per day.",
  "The car handles very well, but note that {specific_feature} works a bit differently. I'll show you when you pick it up.",
  "The {feature} is actually one of this car's best attributes. It provides {benefit} which is great for {activity}.",
  "I typically do pickups at {location}. Is that convenient for you?"
];

// Car features to mention in messages
const carFeatures = [
  "GPS navigation", "Bluetooth connectivity", "backup camera", "sunroof", "leather seats",
  "fuel efficiency", "spacious trunk", "all-wheel drive", "sport mode", "cruise control",
  "heated seats", "parking sensors", "Apple CarPlay", "Android Auto", "premium sound system",
  "roof rack", "child seats", "tinted windows", "automatic transmission", "keyless entry"
];

// Activities to mention in messages
const activities = [
  "road trips", "city driving", "family outings", "business travel", "weekend getaways",
  "airport transfers", "moving furniture", "beach trips", "mountain drives", "sightseeing",
  "daily commuting", "shopping trips", "visiting friends", "touring the countryside", "special events"
];

// Locations for pickup/dropoff
const locations = [
  "downtown", "the airport", "my office", "the mall", "the hotel",
  "the convention center", "my home address", "your preferred location", "the train station", "the business district"
];

// Random time generator
const times = [
  "9:00 AM", "10:30 AM", "noon", "1:00 PM", "2:30 PM",
  "4:00 PM", "5:30 PM", "6:00 PM", "7:00 PM", "8:00 PM"
];

// Helper functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomPrice() {
  return (Math.floor(Math.random() * 50) + 10) * 100; // Random price between 1000 and 6000 PHP
}

function getRandomFutureDates() {
  const startOffset = Math.floor(Math.random() * 30) + 1; // 1 to 30 days in the future
  const duration = Math.floor(Math.random() * 7) + 1; // 1 to 7 days rental
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + startOffset);
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };
  
  return `${formatDate(startDate)} to ${formatDate(endDate)}`;
}

// Format the message using the template and replacements
function formatMessage(template, car, dates) {
  let message = template.replace('{car}', `${car.brand} ${car.model}`);
  message = message.replace('{dates}', dates);
  message = message.replace('{feature}', getRandomElement(carFeatures));
  message = message.replace('{activity}', getRandomElement(activities));
  message = message.replace('{location}', getRandomElement(locations));
  message = message.replace('{time}', getRandomElement(times));
  message = message.replace('{price}', `₱${getRandomPrice().toLocaleString()}`);
  message = message.replace('{specific_feature}', getRandomElement(carFeatures));
  message = message.replace('{benefit}', 'excellent performance and comfort');
  
  return message;
}

// Main function to generate messages between users
async function generateMessages() {
  try {
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    if (users.length < 2) {
      console.error('Need at least 2 users to generate messages');
      return;
    }
    
    // Get all cars with their owners
    const cars = await Car.find({}).populate('owner');
    console.log(`Found ${cars.length} cars`);
    
    if (cars.length === 0) {
      console.error('No cars found in the database');
      return;
    }
    
    let totalMessagesCreated = 0;
    const createdConversations = new Set(); // Track created conversations to avoid duplicates
    
    // For each user, create conversations with at least 3 messages
    for (const user of users) {
      console.log(`Generating messages for user: ${user.firstName} ${user.lastName}`);
      
      // Filter to get cars that don't belong to the current user
      const availableCars = cars.filter(car => car.owner && car.owner._id.toString() !== user._id.toString());
      
      if (availableCars.length === 0) {
        console.log(`No available cars for user ${user.firstName} to inquire about, skipping...`);
        continue;
      }
      
      // Create at least 3 conversations for this user
      const conversationsToCreate = Math.min(3, availableCars.length);
      let userConversationsCreated = 0;
      
      for (let i = 0; i < conversationsToCreate; i++) {
        // Pick a random car to inquire about
        const car = availableCars[i % availableCars.length];
        const carOwner = car.owner;
        
        // Skip if this conversation has already been created
        const conversationKey = `${user._id}-${carOwner._id}-${car._id}`;
        const reverseConversationKey = `${carOwner._id}-${user._id}-${car._id}`;
        
        if (createdConversations.has(conversationKey) || createdConversations.has(reverseConversationKey)) {
          console.log(`Conversation already exists between ${user.firstName} and ${carOwner.firstName} about ${car.brand} ${car.model}, skipping...`);
          continue;
        }
        
        createdConversations.add(conversationKey);
        createdConversations.add(reverseConversationKey);
        
        // Generate random dates for this conversation
        const dates = getRandomFutureDates();
        
        // First message: Inquiry from user to car owner
        const inquiry = formatMessage(getRandomElement(inquiryTemplates), car, dates);
        const inquiryMessage = new Message({
          senderId: user._id,
          receiverId: carOwner._id,
          carId: car._id.toString(),
          content: inquiry,
          isRead: Math.random() > 0.5, // 50% chance of being read
          readAt: Math.random() > 0.5 ? new Date() : null,
          isDelivered: true,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000)) // Random time in the last ~11 days
        });
        
        await inquiryMessage.save();
        totalMessagesCreated++;
        
        // Add some delay to the timestamp for the next message
        const responseDate = new Date(inquiryMessage.createdAt);
        responseDate.setHours(responseDate.getHours() + Math.floor(Math.random() * 5) + 1); // 1-6 hours later
        
        // Second message: Response from car owner
        const response = formatMessage(getRandomElement(responseTemplates), car, dates);
        const responseMessage = new Message({
          senderId: carOwner._id,
          receiverId: user._id,
          carId: car._id.toString(),
          content: response,
          isRead: Math.random() > 0.3, // 70% chance of being read
          readAt: Math.random() > 0.3 ? new Date() : null,
          isDelivered: true,
          createdAt: responseDate
        });
        
        await responseMessage.save();
        totalMessagesCreated++;
        
        // Add delay for third message
        const followUpDate = new Date(responseMessage.createdAt);
        followUpDate.setHours(followUpDate.getHours() + Math.floor(Math.random() * 3) + 1); // 1-4 hours later
        
        // Third message: Follow-up from the user
        const followUp = formatMessage(getRandomElement(followUpTemplates), car, dates);
        const followUpMessage = new Message({
          senderId: user._id,
          receiverId: carOwner._id,
          carId: car._id.toString(),
          content: followUp,
          isRead: Math.random() > 0.5, // 50% chance of being read
          readAt: Math.random() > 0.5 ? new Date() : null,
          isDelivered: true,
          createdAt: followUpDate
        });
        
        await followUpMessage.save();
        totalMessagesCreated++;
        
        // Add delay for fourth message
        const finalResponseDate = new Date(followUpMessage.createdAt);
        finalResponseDate.setHours(finalResponseDate.getHours() + Math.floor(Math.random() * 4) + 1); // 1-5 hours later
        
        // Fourth message: Final response from car owner
        const finalResponse = formatMessage(getRandomElement(finalResponseTemplates), car, dates);
        const finalResponseMessage = new Message({
          senderId: carOwner._id,
          receiverId: user._id,
          carId: car._id.toString(),
          content: finalResponse,
          isRead: Math.random() > 0.7, // 30% chance of being read
          readAt: Math.random() > 0.7 ? new Date() : null,
          isDelivered: true,
          createdAt: finalResponseDate
        });
        
        await finalResponseMessage.save();
        totalMessagesCreated++;
        
        userConversationsCreated++;
        console.log(`Created conversation between ${user.firstName} and ${carOwner.firstName} about ${car.brand} ${car.model}`);
      }
      
      console.log(`Created ${userConversationsCreated} conversations for user ${user.firstName} ${user.lastName}`);
    }
    
    console.log(`Message generation complete! Created ${totalMessagesCreated} messages total.`);
    
  } catch (error) {
    console.error('Error generating messages:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
generateMessages();
