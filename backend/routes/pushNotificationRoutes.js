const { Expo } = require('expo-server-sdk');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendExpoNotifications, checkNotificationReceipts } = require('../utils/expoNotifications');

router.get('/send-notification', async (req, res) => {
    try {
        const token = process.env.EXPO_ACCESS_TOKEN;
        console.log(token);
        
        let messages = [];
        let expo = new Expo({
            accessToken: process.env.EXPO_ACCESS_TOKEN,
        });
    
        // Create the messages that you want to send to clients
        let pushTokens = ['ExponentPushToken[*******VeVPCjfpNsI]'];
        for (let pushToken of pushTokens) {
            // Check that all your push tokens appear to be valid Expo push tokens
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }
    
            // Construct a message
            messages.push({
                to: pushToken,
                sound: 'default',
                body: 'This is a test notification',
                data: { withSome: 'data' },
            });
        }
    
        // Chunk the notifications
        let chunks = expo.chunkPushNotifications(messages);
        let tickets = [];
        
        // Send the chunks to the Expo push notification service
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log(ticketChunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }
    
        // Process receipts
        let receiptIds = [];
        for (let ticket of tickets) {
            if (ticket.status === 'ok') {
                receiptIds.push(ticket.id);
            }
        }
    
        let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
        
        // Get receipts
        for (let chunk of receiptIdChunks) {
            try {
                let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
                console.log(receipts);
        
                for (let receiptId in receipts) {
                    let { status, message, details } = receipts[receiptId];
                    if (status === 'ok') {
                        continue;
                    } else if (status === 'error') {
                        console.error(`There was an error sending a notification: ${message}`);
                        if (details && details.error) {
                            console.error(`The error code is ${details.error}`);
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            }
        }
    
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error in push notification route:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Add a more flexible POST endpoint
router.post('/send-notification', async (req, res) => {
    try {
        const { tokens, title, body, data } = req.body;
        
        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "Push tokens are required and must be an array" 
            });
        }
        
        // Use the modular function to send notifications
        const tickets = await sendExpoNotifications({
            tokens,
            title: title || 'New Notification',
            body: body || 'You have a new notification',
            data: data || {},
        });
        
        if (tickets.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Failed to send notifications" 
            });
        }
        
        return res.status(200).json({ 
            success: true,
            tickets: tickets 
        });
    } catch (error) {
        console.error("Error in push notification route:", error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Register a user's push notification token
router.post('/register-token', async (req, res) => {
    try {
        console.log(req.body);
        const { userId, token } = req.body;
        
        if (!userId || !token) {
            return res.status(400).json({
                success: false,
                error: "User ID and token are required"
            });
        }
        
        // Validate the token format
        if (!Expo.isExpoPushToken(token)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Expo push token format"
            });
        }
        
        // Find the user and update their tokens array
        const user = await User.findOne({ uid: userId });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }
        
        // Add the token if it doesn't already exist
        if (!user.pushTokens) {
            user.pushTokens = [];
        }
        
        if (!user.pushTokens.includes(token)) {
            user.pushTokens.push(token);
            await user.save();
            console.log(`Push token registered for user ${userId}`);
        }
        
        return res.status(200).json({
            success: true,
            message: "Push token registered successfully"
        });
    } catch (error) {
        console.error("Error registering push token:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
