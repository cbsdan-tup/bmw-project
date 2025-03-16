const Message = require("../models/message");
const cloudinary = require("cloudinary");
const { getUser } = require("../utils/onlineUsers");

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, carId } = req.body;
    let images = [];

    if (!receiverId || !carId) {
      return res.status(400).json({
        success: false,
        message: "receiverId and carId are required",
      });
    }

    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: "messages",
        });
        images.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }
    }

    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      carId,
      content,
      images,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "name email")
      .populate("receiverId", "name email");

    // Emit socket event for real-time message
    const receiver = getUser(receiverId);
    if (receiver && receiver.socketId) {
      req.app
        .get("io")
        .to(receiver.socketId)
        .emit("getMessage", populatedMessage);
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id },
      ],
      isDeleted: { $ne: true }, // Only fetch messages that are not deleted
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    const EDIT_WINDOW_MINUTES = 20;

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    // Check if message is within edit window
    const messageTime = new Date(message.createdAt).getTime();
    const currentTime = new Date().getTime();
    const diffInMinutes = (currentTime - messageTime) / (1000 * 60);

    if (diffInMinutes > EDIT_WINDOW_MINUTES) {
      return res.status(403).json({
        success: false,
        message: "Message can no longer be edited (20 minute limit exceeded)",
      });
    }

    // Check if content exists in request body
    if (!req.body.hasOwnProperty("content")) {
      return res.status(400).json({
        success: false,
        message: "Content field is required",
      });
    }

    const { content } = req.body;

    // Update the message
    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      {
        content: content,
        isEdited: true,
      },
      { new: true }
    );

    // Emit socket event for message update
    const io = req.app.get("io");
    const receiver = getUser(message.receiverId.toString());

    if (io && receiver && receiver.socketId) {
      io.to(receiver.socketId).emit("messageUpdated", updatedMessage);
    }

    res.status(200).json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    message.isDeleted = true;
    await message.save();

    // Emit socket event for message deletion
    const io = req.app.get("io");
    const receiver = getUser(message.receiverId.toString());

    if (io && receiver && receiver.socketId) {
      io.to(receiver.socketId).emit("messageDeleted", {
        messageId: message._id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Message marked as deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getCarUserMessages = async (req, res) => {
  try {
    const { receiverId, carId } = req.params;
    const messages = await Message.find({
      carId,
      $or: [
        { senderId: req.user._id, receiverId },
        { senderId: receiverId, receiverId: req.user._id },
      ],
      isDeleted: { $ne: true },
    })
      .populate("senderId", "name email avatar")
      .populate("receiverId", "name email avatar")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
