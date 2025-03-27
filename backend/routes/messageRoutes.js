const express = require("express");
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");
const upload = require("../utils/multer");
const {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  getCarUserMessages,
  getCarInquiries,
  markMessagesAsRead,
  markMessageRead,
  markMessageDelivered, // Add this new controller function
} = require("../controllers/messageController");

router.post(
  "/messages",
  isAuthenticatedUser,
  upload.array("images", 5), // Allow up to 5 images
  sendMessage
);
router.get("/messages/:userId", isAuthenticatedUser, getMessages);
router.get(
  "/messages/:receiverId/:carId",
  isAuthenticatedUser,
  getCarUserMessages
);
router.get("/car-inquiries/:carId", isAuthenticatedUser, getCarInquiries);
router.put("/messages/:id", isAuthenticatedUser, updateMessage);
router.delete("/messages/:id", isAuthenticatedUser, deleteMessage);
router.put(
  "/messages/read/:senderId/:carId",
  isAuthenticatedUser,
  markMessagesAsRead
);
router.put("/messages/:id/read", isAuthenticatedUser, markMessageRead);
router.put(
  "/messages/:id/delivered",
  isAuthenticatedUser,
  markMessageDelivered
);

module.exports = router;
