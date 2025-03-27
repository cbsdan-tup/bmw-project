require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");

const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const cors = require("cors");
const connectDatabase = require("./config/database");

const mongoose = require("mongoose");
const PORT = process.env.PORT || 8000;

const cloudinary = require("cloudinary");
// Add User model for push notifications
const User = require("./models/User");
// Add expoNotifications utility
const { sendExpoNotifications } = require("./utils/expoNotifications");

const auth = require("./routes/auth");
const discount = require("./routes/discount");
const carRoutes = require("./routes/carRoutes");
const favoriteCarRoutes = require("./routes/favoriteCarRoutes");
const maintenanceRecord = require("./routes/recordRoute");
const rental = require("./routes/rentalRoutes");
const reviewRoute = require("./routes/reviewRoute");
const messageRoutes = require("./routes/messageRoutes");
const userManagementRoutes = require("./routes/userManagementRoutes");
const carsManagementRoutes = require("./routes/carsManagementRoutes");
const rentalManagementRoutes = require("./routes/rentalManagementRoutes");
const adminStatsRoutes = require("./routes/adminStatsRoutes");
const pushNotificationRoutes = require("./routes/pushNotificationRoutes");

const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ["https://borrow-my-wheel.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket connection handling
let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("addUser", (userId) => {
    if (!userId) {
      console.log("addUser called without userId");
      return;
    }

    console.log(`User ${userId} added with socket ${socket.id}`);
    addUser(userId, socket.id);
    io.emit("getUsers", users);

    // Store userId in socket for later use
    socket.userId = userId;
  });

  // Handle joining a chat room with more detailed info
  socket.on("joinRoom", (data) => {
    // Handle both string and object formats for backwards compatibility
    const roomId = typeof data === "string" ? data : data.roomId;

    if (!roomId) {
      console.log("joinRoom called without roomId");
      return;
    }

    console.log(`Socket ${socket.id} joining room: ${roomId}`);
    socket.join(roomId);

    // If we have detailed info, store it
    if (typeof data === "object") {
      const { userId, recipientId, carId } = data;
      socket.chatData = { roomId, userId, recipientId, carId };
      console.log(
        `Chat data stored for ${socket.id}: ${JSON.stringify(socket.chatData)}`
      );
    }

    // Acknowledge room join to client
    socket.emit("roomJoined", { roomId });
  });

  // Add sendMessage event handler
  socket.on("sendMessage", async (data) => {
    const { text, roomId, senderId, receiverId, carId, messageId } = data;

    if (!roomId || !senderId || !receiverId) {
      console.log("sendMessage called with missing data", data);
      return;
    }

    console.log(`Message sent in room ${roomId} from ${senderId} to ${receiverId}`);
    
    // Emit the message to the room
    io.to(roomId).emit("getMessage", data);
    
    // Send push notification to receiver if they're not active in the room
    try {
      await sendNotificationToRecipient(data);
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  });

  // Handle message delivery confirmations with more details
  socket.on("confirmDelivery", (data) => {
    const { messageId, receiverId, senderId, carId } = data;

    if (!messageId || !receiverId) {
      console.log("confirmDelivery called with missing data", data);
      return;
    }

    console.log(
      `Message ${messageId} delivery confirmed by ${socket.userId || "unknown"}`
    );

    // Find the sender socket
    const sender = getUser(senderId || receiverId);
    if (sender && sender.socketId) {
      // Notify the sender that their message was delivered
      console.log(
        `Notifying sender ${sender.userId} via socket ${sender.socketId}`
      );
      io.to(sender.socketId).emit("messageDelivered", { messageId });
    } else {
      console.log(`Sender socket not found for ${senderId || receiverId}`);
    }

    // If we have carId, also emit to the room
    if (carId) {
      const roomId = [senderId || socket.userId, receiverId, carId]
        .sort()
        .join("-");
      console.log(`Also emitting delivery confirmation to room ${roomId}`);
      io.to(roomId).emit("messageDelivered", { messageId });

      // Add refresh signal for both users to fetch all messages
      io.to(roomId).emit("refreshMessages", {
        action: "messageDelivered",
        messageId,
        timestamp: Date.now(),
      });
    }
  });

  // Handle leaving a chat room
  socket.on("leaveRoom", (roomId) => {
    if (!roomId) return;

    console.log(`Socket ${socket.id} leaving room: ${roomId}`);
    socket.leave(roomId);

    // Clear chat data if it matches
    if (socket.chatData && socket.chatData.roomId === roomId) {
      socket.chatData = null;
    }
  });

  // Handle disconnection with better cleanup
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    removeUser(socket.id);
    io.emit("getUsers", users);

    // If we have chat data, leave any rooms
    if (socket.chatData && socket.chatData.roomId) {
      console.log(`Leaving room ${socket.chatData.roomId} on disconnect`);
      socket.leave(socket.chatData.roomId);
    }
  });
});

console.log(process.env.NODE_ENV);

connectDatabase();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(logger);

app.use(
  cors({
    origin: [
      "https://borrow-my-wheel.vercel.app",
      "http://localhost:5173",
      "http://localhost:8081",
    ],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use("/", express.static(path.join(__dirname, "public")));
app.use(errorHandler);

// Modify to ensure push notifications are sent when messages are created via API
app.use((req, res, next) => {
  // Store the original send method
  const originalSend = res.send;
  
  res.send = function(body) {
    // Check if this is a message creation response
    if (req.method === 'POST' && 
        req.originalUrl.includes('/api/v1/messages') && 
        res.statusCode >= 200 && 
        res.statusCode < 300) {
      
      try {
        // Parse response body if it's a string
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        
        console.log('Message API response structure:', JSON.stringify(data));
        
        // If this is a new message created through the API
        if (data && data.success && data.message) {
          console.log('Message created via API, triggering push notification');
          
          const message = data.message;
          console.log('Message object from API:', JSON.stringify(message));
          
          // Handle nested objects in the response
          if (message) {
            // Extract the message ID and content
            const messageId = message._id;
            const content = message.content;
            const carId = message.carId;
            
            // Extract sender/receiver info, handling both string IDs and nested objects
            let senderId, receiverId, senderName;
            
            if (typeof message.senderId === 'object') {
              // If it's a populated object, extract the _id and name
              senderId = message.senderId._id;
              senderName = `${message.senderId.firstName} ${message.senderId.lastName}`;
            } else {
              // If it's a string ID
              senderId = message.senderId;
            }
            
            if (typeof message.receiverId === 'object') {
              // If it's a populated object, extract the _id
              receiverId = message.receiverId._id;
            } else {
              // If it's a string ID
              receiverId = message.receiverId;
            }
            
            if (senderId && receiverId && carId) {
              console.log(`Extracted data - senderId: ${senderId}, receiverId: ${receiverId}, carId: ${carId}`);
              
              // Create room ID
              const roomId = [senderId, receiverId, carId].sort().join('-');
              
              // Try to send push notification
              sendDirectPushNotification({
                messageId,
                text: content,
                roomId,
                senderId,
                receiverId,
                carId,
                senderName // Pass sender name if we have it from the populated object
              }).catch(err => {
                console.error('Error sending direct push notification:', err);
              });
            } else {
              console.error('Missing required data from message response');
            }
          }
        }
      } catch (error) {
        console.error('Error processing message response:', error);
      }
    }
    
    // Call the original send
    return originalSend.call(this, body);
  };
  
  next();
});

// Routes
app.use("/", require("./routes/root"));
app.use("/api/v1", auth);
app.use("/api/v1", discount);
app.use("/api/v1", carRoutes);
app.use("/api/v1", favoriteCarRoutes);
app.use("/api/v1", maintenanceRecord);
app.use("/api/v1", rental);
app.use("/api/v1", reviewRoute);
app.use("/api/v1", messageRoutes);
app.use("/api/v1", userManagementRoutes);
app.use("/api/v1", carsManagementRoutes);
app.use("/api/v1", rentalManagementRoutes);
app.use("/api/v1", adminStatsRoutes);
app.use("/api/v1", pushNotificationRoutes);

//404 not found routes
app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

// New function to send push directly without socket dependency
async function sendDirectPushNotification(data) {
  const { text, senderId, receiverId, carId, messageId, senderName } = data;
  
  console.log(`Attempting direct push notification from ${senderId} to ${receiverId}`);
  
  try {
    // Try to find the receiver by _id first (MongoDB ID)
    let recipient = await User.findById(receiverId);
    
    // If not found, try by uid field
    if (!recipient) {
      console.log(`User not found by _id, trying uid field: ${receiverId}`);
      recipient = await User.findOne({ uid: receiverId });
    }
    
    if (!recipient) {
      console.error(`Recipient not found with either _id or uid: ${receiverId}`);
      return null;
    }
    
    console.log(`Recipient found: ${recipient.firstName} ${recipient.lastName}, Push tokens: ${recipient.pushTokens?.length || 0}`);
    
    if (recipient.pushTokens && recipient.pushTokens.length > 0) {
      // Get sender info for notification title
      let senderDisplayName = senderName; // Use name passed from populated object if available
      
      if (!senderDisplayName) {
        // Try to find sender by _id first
        let sender = await User.findById(senderId);
        if (!sender) {
          sender = await User.findOne({ uid: senderId });
        }
        
        senderDisplayName = sender 
          ? `${sender.firstName} ${sender.lastName}` 
          : "Someone";
      }

      // Fetch car details to include car name in notification
      let carName = "a car";
      try {
        const Car = require('./models/Cars');
        const car = await Car.findById(carId);
        if (car) {
          carName = `${car.brand} ${car.model}`;
        }
      } catch (carError) {
        console.error('Error fetching car details:', carError);
      }
      
      console.log(`Sending push notification from ${senderDisplayName} about ${carName} to ${recipient.firstName} with ${recipient.pushTokens.length} tokens`);
      
      // Send notification with enhanced navigation data and car name in title
      const notificationResult = await sendExpoNotifications({
        tokens: recipient.pushTokens,
        title: `${senderDisplayName} about ${carName}`,
        body: text.length > 100 ? `${text.substring(0, 97)}...` : text,
        data: {
          type: 'message',
          senderId,
          receiverId,
          carId,
          messageId,
          // Add navigation data to route to ChatScreen when notification is clicked
          navigation: {
            screen: 'ChatScreen',
            params: {
              recipientId: senderId, // The sender becomes the recipient when they click the notification
              carId: carId,
              chatName: `${senderDisplayName} - ${carName}` // Include car name in chat header
            }
          }
        },
        sound: true,
        badge: true
      });
      
      console.log(`Push notification sent to ${recipient.firstName}, result:`, 
        notificationResult?.length > 0 ? `${notificationResult.length} tickets` : 'No tickets');
        
      return notificationResult;
    } else {
      console.log(`No push tokens found for user ${recipient.firstName} ${recipient.lastName}`);
    }
  } catch (error) {
    console.error('Error sending direct push notification:', error);
  }
  
  return null;
}

// Update the existing function to use the direct push approach
async function sendNotificationToRecipient(data) {
  const { text, senderId, receiverId, carId, messageId } = data;
  
  console.log(`Attempting to send push notification from ${senderId} to ${receiverId}`);
  
  // Check if receiver is active in the socket connections
  const receiverSocket = getUser(receiverId);
  const isReceiverActive = !!receiverSocket;
  
  console.log(`Receiver ${receiverId} active status: ${isReceiverActive}`);
  
  // If receiver is not active, send push notification
  if (!isReceiverActive) {
    return sendDirectPushNotification(data);
  } else {
    console.log(`Skipping push notification as receiver ${receiverId} is active`);
  }
  
  return null;
}

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
  server.listen(PORT, () =>
    console.log(
      `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
    )
  );
});

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
