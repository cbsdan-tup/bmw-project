// sendNotification.js
const { google } = require('googleapis'); 
const axios = require("axios");
require('dotenv').config();

// Construct service account from environment variables
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

const getFirebaseAccessToken = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: 'https://www.googleapis.com/auth/firebase.messaging',
    });
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    return accessToken.token;
  } catch (error) {
    console.error('Error getting Firebase access token:', error.message);
    throw new Error('Failed to get Firebase access token');
  }
};

const sendNotification = async (payload) => {
  try {
    // Validate payload
    if (!payload || !payload.permissionToken) {
      console.error('Invalid notification payload');
      throw new Error('Missing required notification data');
    }

    // Add retry logic for more reliability
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        const accessToken = await getFirebaseAccessToken();
        
        const message = {
          message: {
            token: payload.permissionToken,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            webpush: {
              fcm_options: {
                link: 'http://localhost:5173/', // Replace with actual link
              },
            },
          },
        };

        const response = await axios.post(
          `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
          message,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            timeout: 10000 // 10 second timeout
          }
        );

        console.log('Notification sent successfully:', response.data);
        return response.data;
      } catch (error) {
        console.error(`Attempt ${attempts} failed:`, error.message);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error.message);
    throw new Error('Failed to send notification');
  }
};

module.exports = sendNotification;
