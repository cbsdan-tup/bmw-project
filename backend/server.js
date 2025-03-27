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
