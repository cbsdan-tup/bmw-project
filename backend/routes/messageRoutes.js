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
} = require("../controllers/messageController");

router.post(
  "/messages",
  isAuthenticatedUser,
  upload.array("images"),
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

module.exports = router;
