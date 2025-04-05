const admin = require('firebase-admin');
const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Improved Firebase initialization with error handling
let firebaseInitialized = false;

try {
  console.log('Attempting to initialize Firebase Admin SDK with environment variables...');
  
  // Create service account object from environment variables
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
  };
  
  // Validate that required env variables exist
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing required Firebase environment variables');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  firebaseInitialized = true;
  console.log('Firebase Admin SDK initialized successfully with environment variables');
} catch (error) {
  console.error('Error initializing Firebase with environment variables:', error.message);
  console.log('Attempting to use application default credentials instead...');
  
  try {
    // Fallback to application default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized with application default credentials');
  } catch (fallbackError) {
    console.error('Failed to initialize Firebase with fallback method:', fallbackError.message);
    console.error('Please check your environment variables for Firebase configuration');
    console.error('Make sure all FIREBASE_* variables are properly set in the .env file');
  }
}

if (!firebaseInitialized) {
  console.error('Firebase initialization failed. Exiting script.');
  process.exit(1);
}

// Connect to MongoDB with improved error handling
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

// Function to generate a random secure password
function generateRandomPassword() {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  // Ensure we have at least one of each character type
  let password = 
    uppercase.charAt(Math.floor(Math.random() * uppercase.length)) +
    lowercase.charAt(Math.floor(Math.random() * lowercase.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length)) +
    symbols.charAt(Math.floor(Math.random() * symbols.length));
  
  // Fill the rest of the password length with random characters
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Read existing credentials from CSV or create a new CSV file
const csvFilePath = path.resolve(__dirname, '../user_credentials.csv');
const credentialsMap = new Map();

// Check if the credentials file exists and read from it
if (fs.existsSync(csvFilePath)) {
  console.log(`Reading existing credentials from: ${csvFilePath}`);
  const csvData = fs.readFileSync(csvFilePath, 'utf8');
  const lines = csvData.split('\n');
  
  // Skip header line and parse each credential line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      // Handle quoted passwords (might contain commas)
      let email, password;
      if (line.includes('"')) {
        // Complex parsing for quoted passwords
        const firstComma = line.indexOf(',');
        email = line.substring(0, firstComma).trim();
        password = line.substring(firstComma + 1).trim();
        // Remove quotes if present
        password = password.replace(/^"(.*)"$/, '$1');
      } else {
        // Simple split for standard case
        const parts = line.split(',');
        email = parts[0].trim();
        password = parts[1]?.trim() || '';
      }
      
      if (email) {
        credentialsMap.set(email, password);
        console.log(`Found existing credentials for: ${email}`);
      }
    }
  }
  
  console.log(`Found ${credentialsMap.size} existing credentials`);
} else {
  // Create a new CSV file with header
  fs.writeFileSync(csvFilePath, 'Email,Password\n', 'utf8');
  console.log(`Created new credentials CSV file at: ${csvFilePath}`);
}

// Function to update or append credentials to CSV
function updateCredentialsFile() {
  try {
    // Create new CSV content
    let csvContent = 'Email,Password\n';
    
    // Add each credential as a line
    for (const [email, password] of credentialsMap.entries()) {
      // Escape passwords that contain commas
      const formattedPassword = password.includes(',') ? `"${password}"` : password;
      csvContent += `${email},${formattedPassword}\n`;
    }
    
    // Write the entire file
    fs.writeFileSync(csvFilePath, csvContent, 'utf8');
    console.log(`Updated credentials CSV file with ${credentialsMap.size} entries`);
    return true;
  } catch (error) {
    console.error(`Error writing credentials to CSV: ${error.message}`);
    return false;
  }
}

// Function to update credentials in the map and eventually in the CSV
function updateCredentials(email, password) {
  credentialsMap.set(email, password);
}

// Array of 25 user details to create with random passwords
const usersToCreate = [
  { email: 'john.doe@example.com', password: generateRandomPassword(), firstName: 'John', lastName: 'Doe' },
  { email: 'jane.smith@example.com', password: generateRandomPassword(), firstName: 'Jane', lastName: 'Smith' },
  { email: 'robert.johnson@example.com', password: generateRandomPassword(), firstName: 'Robert', lastName: 'Johnson' },
  { email: 'emily.williams@example.com', password: generateRandomPassword(), firstName: 'Emily', lastName: 'Williams' },
  { email: 'michael.brown@example.com', password: generateRandomPassword(), firstName: 'Michael', lastName: 'Brown' },
  { email: 'sarah.jones@example.com', password: generateRandomPassword(), firstName: 'Sarah', lastName: 'Jones' },
  { email: 'david.garcia@example.com', password: generateRandomPassword(), firstName: 'David', lastName: 'Garcia' },
  { email: 'jessica.miller@example.com', password: generateRandomPassword(), firstName: 'Jessica', lastName: 'Miller' },
  { email: 'thomas.davis@example.com', password: generateRandomPassword(), firstName: 'Thomas', lastName: 'Davis' },
  { email: 'jennifer.rodriguez@example.com', password: generateRandomPassword(), firstName: 'Jennifer', lastName: 'Rodriguez' },
  { email: 'daniel.martinez@example.com', password: generateRandomPassword(), firstName: 'Daniel', lastName: 'Martinez' },
  { email: 'lisa.hernandez@example.com', password: generateRandomPassword(), firstName: 'Lisa', lastName: 'Hernandez' },
  { email: 'matthew.lopez@example.com', password: generateRandomPassword(), firstName: 'Matthew', lastName: 'Lopez' },
  { email: 'amanda.gonzalez@example.com', password: generateRandomPassword(), firstName: 'Amanda', lastName: 'Gonzalez' },
  { email: 'james.wilson@example.com', password: generateRandomPassword(), firstName: 'James', lastName: 'Wilson' },
  { email: 'ashley.anderson@example.com', password: generateRandomPassword(), firstName: 'Ashley', lastName: 'Anderson' },
  { email: 'christopher.taylor@example.com', password: generateRandomPassword(), firstName: 'Christopher', lastName: 'Taylor' },
  { email: 'elizabeth.moore@example.com', password: generateRandomPassword(), firstName: 'Elizabeth', lastName: 'Moore' },
  { email: 'andrew.jackson@example.com', password: generateRandomPassword(), firstName: 'Andrew', lastName: 'Jackson' },
  { email: 'stephanie.thompson@example.com', password: generateRandomPassword(), firstName: 'Stephanie', lastName: 'Thompson' },
  { email: 'alexander.clark@example.com', password: generateRandomPassword(), firstName: 'Alexander', lastName: 'Clark' },
  { email: 'victoria.lewis@example.com', password: generateRandomPassword(), firstName: 'Victoria', lastName: 'Lewis' },
  { email: 'ryan.lee@example.com', password: generateRandomPassword(), firstName: 'Ryan', lastName: 'Lee' },
  { email: 'olivia.walker@example.com', password: generateRandomPassword(), firstName: 'Olivia', lastName: 'Walker' },
  { email: 'william.hall@example.com', password: generateRandomPassword(), firstName: 'William', lastName: 'Hall' },
  // Admin user with an easy-to-remember password for development purposes
  { email: 'admin@bmw.com', password: 'Admin123!', firstName: 'Admin', lastName: 'User', role: 'admin' }
];

// Function to create a user in Firebase and MongoDB
async function createUser(userData) {
  try {
    console.log(`Processing user: ${userData.email}`);
    
    // Update the credentials map with this user's password
    updateCredentials(userData.email, userData.password);
    
    // Check if user already exists in Firebase
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(userData.email);
      console.log(`User ${userData.email} already exists in Firebase with UID: ${firebaseUser.uid}`);
      
      // Update the password for existing user
      await admin.auth().updateUser(firebaseUser.uid, {
        password: userData.password,
      });
      console.log(`Updated password for existing user: ${userData.email}`);
    } catch (userNotFoundError) {
      if (userNotFoundError.code === 'auth/user-not-found') {
        // Create new user in Firebase
        console.log(`Creating new Firebase user for: ${userData.email}`);
        firebaseUser = await admin.auth().createUser({
          email: userData.email,
          password: userData.password,
          displayName: `${userData.firstName} ${userData.lastName}`,
        });
        console.log(`Firebase user created with UID: ${firebaseUser.uid}`);
      } else {
        throw userNotFoundError;
      }
    }
    
    // Check if user already exists in MongoDB
    let mongoUser = await User.findOne({ email: userData.email });
    
    if (mongoUser) {
      console.log(`User ${userData.email} already exists in MongoDB`);
    } else {
      // Create user in MongoDB
      mongoUser = new User({
        uid: firebaseUser.uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role || 'user',
      });
      
      await mongoUser.save();
      console.log(`MongoDB user created for: ${userData.email}`);
    }
    
    return { success: true, user: mongoUser };
  } catch (error) {
    console.error(`Error processing user ${userData.email}:`, error.message);
    return { success: false, error };
  }
}

// Process all users
async function processAllUsers() {
  let successCount = 0;
  let failureCount = 0;
  
  console.log(`Starting to process ${usersToCreate.length} users...`);
  
  for (const userData of usersToCreate) {
    const result = await createUser(userData);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  // Write all credentials to file after processing all users
  updateCredentialsFile();
  
  console.log('User creation/update process completed');
  console.log(`Successfully processed: ${successCount} users`);
  console.log(`Failed to process: ${failureCount} users`);
  console.log(`Credentials saved to: ${csvFilePath}`);
  
  mongoose.disconnect();
}

// Start the process
processAllUsers();
