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
  console.log("A user connected");

  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", users);
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

app.use(cors({
    origin: ["https://borrow-my-wheel.vercel.app", "http://localhost:5173", "http://localhost:8081"],
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
