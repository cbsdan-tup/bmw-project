const { Expo } = require('expo-server-sdk');

/**
 * Send push notifications via Expo service
 * 
 * @param {Object} options - Notification options
 * @param {Array<string>} options.tokens - Array of Expo push tokens
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Additional data to send with notification
 * @param {boolean} options.sound - Whether to play sound (default: true)
 * @param {boolean} options.badge - Whether to increment badge count (default: true)
 * @returns {Promise<Array>} Array of ticket objects
 */
const sendExpoNotifications = async (options) => {
  try {
    const { tokens, title, body, data = {}, sound = true, badge = true } = options;
    
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.error('No valid tokens provided for push notification');
      return [];
    }
    
    // Initialize Expo SDK client - try without accessToken first
    // This avoids Firebase authentication issues when not needed
    const expo = new Expo();
    
    // Create message array with enhanced settings for maximum visibility
    const messages = tokens
      .filter(token => {
        const isValid = Expo.isExpoPushToken(token);
        if (!isValid) {
          console.log(`Skipping invalid token: ${token}`);
        }
        return isValid;
      })
      .map(token => {
        // Base notification with critical settings
        const message = {
          to: token,
          sound: sound ? 'default' : null,
          title: title,
          body: body,
          data: {
            ...data,
            _displayInForeground: true,  // Force display in foreground
          },
          badge: badge ? 1 : null,
          priority: 'high',
          channelId: data?.type === 'rentalUpdate' ? 'rental-updates' : 'default',
          // Use proper category identifier
          categoryId: data?.type || 'default', 
          
          // Ensure notification is visible in all states
          _contentAvailable: true,      // Will wake up iOS app in background
          _mutableContent: true,        // iOS: Allow notification modification by app
        };
        
        // Android-specific overrides
        if (token.includes('ExponentPushToken')) {
          message.android = {
            priority: 'high',
            sound: 'default',
            sticky: false,
            vibrate: [0, 250, 250, 250],
            channelId: data?.type === 'rentalUpdate' ? 'rental-updates' : 'default',
          };
        }
        
        return message;
      });
    
    if (messages.length === 0) {
      console.error('No valid Expo push tokens provided');
      return [];
    }
    
    // Log notification attempt
    console.log(`Attempting to send notifications to ${messages.length} devices`);
    console.log('Notification content:', { title, body, data });
    
    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    
    // Process each chunk
    for (const chunk of chunks) {
      try {
        console.log(`Sending chunk with ${chunk.length} messages`);
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Notification chunk sent successfully');
        
        // Log each ticket to have more info for debugging
        ticketChunk.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            console.error(`Error sending notification to token ${chunk[index]?.to}:`, ticket.message, ticket.details);
          } else {
            console.log(`Successfully sent notification to ${chunk[index]?.to}, ticket: ${ticket.id}`);
          }
        });
        
        tickets.push(...ticketChunk);
        
        // Check for receipts after a delay to allow processing
        setTimeout(async () => {
          try {
            const receiptIds = ticketChunk
              .filter(ticket => ticket.status === 'ok')
              .map(ticket => ticket.id);
              
            if (receiptIds.length > 0) {
              console.log(`Checking ${receiptIds.length} receipts after 5 seconds...`);
              const receipts = await checkNotificationReceipts(receiptIds);
              console.log('Receipt check results:', receipts);
            }
          } catch (receiptError) {
            console.error('Error checking notification receipts:', receiptError);
          }
        }, 5000); // Check after 5 seconds
        
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }
    
    return tickets;
  } catch (error) {
    console.error('Error in sendExpoNotifications:', error);
    return [];
  }
};

/**
 * Check receipts for push notifications
 * 
 * @param {Array<string>} receiptIds - Array of receipt IDs from tickets
 * @returns {Promise<Object>} Receipt objects
 */
const checkNotificationReceipts = async (receiptIds) => {
  if (!receiptIds || receiptIds.length === 0) return {};
  
  try {
    const expo = new Expo();
    const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    let receipts = {};
    
    for (const chunk of receiptChunks) {
      try {
        const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
        receipts = { ...receipts, ...receiptChunk };
        
        // Handle any receipt errors
        for (const [receiptId, receipt] of Object.entries(receiptChunk)) {
          if (receipt.status === 'error') {
            console.error(`Error in receipt ${receiptId}:`, receipt.message);
          }
        }
      } catch (error) {
        console.error('Error checking notification receipts:', error);
      }
    }
    
    return receipts;
  } catch (error) {
    console.error('Error processing notification receipts:', error);
    return {};
  }
};

module.exports = {
  sendExpoNotifications,
  checkNotificationReceipts
};
