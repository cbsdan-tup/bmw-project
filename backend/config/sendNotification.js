// sendNotification.js
const { google } = require('googleapis'); 
const serviceAccount = require('./firebase-adminsdk.json'); 
const axios = require("axios");

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
      `https://fcm.googleapis.com/v1/projects/bmw-project-5ab42/messages:send`,
      message,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log('Notification sent successfully:', response.data);
    return response.data;  
  } catch (error) {
    console.error('Error sending notification:', error.message);
    throw new Error('Failed to send notification');
  }
};

module.exports = sendNotification;
