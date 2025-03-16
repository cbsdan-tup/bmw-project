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
router.put("/messages/:id", isAuthenticatedUser, updateMessage);
router.delete("/messages/:id", isAuthenticatedUser, deleteMessage);

module.exports = router;
