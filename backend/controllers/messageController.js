const Message = require("../models/message");
const cloudinary = require("cloudinary");
const { getUser } = require("../utils/onlineUsers");

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, carId } = req.body;
    let content = req.body.content || ""; // Ensure content has a default value
    let images = [];

    if (!receiverId || !carId) {
      return res.status(400).json({
        success: false,
        message: "receiverId and carId are required",
      });
    }

    console.log("Message request body:", req.body);

    // Handle image uploads if present with improved error handling
    if (req.files && req.files.length > 0) {
      try {
        console.log(`Processing ${req.files.length} image uploads`);

        // Process images one at a time
        for (let file of req.files) {
          try {
            console.log(`Uploading file: ${file.path} (${file.size} bytes)`);

            // Set a reasonable timeout for each upload
            const uploadPromise = cloudinary.v2.uploader.upload(file.path, {
              folder: "messages",
              resource_type: "auto",
              timeout: 60000, // 60 seconds timeout
            });

            const result = await uploadPromise;

            console.log(`Upload successful for ${result.public_id}`);
            images.push({
              public_id: result.public_id,
              url: result.secure_url,
            });
          } catch (individualUploadError) {
            console.error(
              `Failed to upload individual file: ${file.path}`,
              individualUploadError
            );
            // Continue with the next image instead of failing completely
          }
        }

        console.log(
          `Successfully processed ${images.length} of ${req.files.length} images`
        );

        // If no images were successfully uploaded but files were provided
        if (images.length === 0 && req.files.length > 0) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload any images. Please try again.",
          });
        }
      } catch (uploadError) {
        console.error("Image upload error details:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload images: " + uploadError.message,
          error: uploadError.message,
        });
      }
    }

    // Ensure we have either content or images
    if (content.trim() === "" && images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message must have either text content or images",
      });
    }

    // Create message with or without content
    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      carId,
      content: content || "", // Ensure empty string if content is falsy
      images,
      isDelivered: false,
      isRead: false,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "firstName lastName email avatar")
      .populate("receiverId", "firstName lastName email avatar");

    // Emit socket event for real-time message
    const io = req.app.get("io");
    if (io) {
      // Create a unique room ID for this conversation
      const chatRoomId = [req.user._id.toString(), receiverId, carId]
        .sort()
        .join("-");
      console.log(
        `Emitting message ${message._id} to chat room: ${chatRoomId}`
      );

      // First try a directed emission to the room (most efficient)
      io.to(chatRoomId).emit("getMessage", populatedMessage);

      // Signal both users to refresh their message list
      io.to(chatRoomId).emit("refreshMessages", {
        action: "newMessage",
        messageId: populatedMessage._id,
        timestamp: Date.now(),
      });

      // Then try direct emissions to specific users as fallback
      const receiver = getUser(receiverId);
      if (receiver && receiver.socketId) {
        console.log(
          `Direct emit to receiver ${receiverId} via socket ${receiver.socketId}`
        );
        io.to(receiver.socketId).emit("getMessage", populatedMessage);
      } else {
        console.log(`Receiver ${receiverId} not found in online users`);
      }

      const sender = getUser(req.user._id.toString());
      if (sender && sender.socketId && sender.socketId !== receiver?.socketId) {
        console.log(
          `Direct emit to sender ${req.user._id} via socket ${sender.socketId}`
        );
        io.to(sender.socketId).emit("getMessage", populatedMessage);
      }

      // Also emit to all users as last resort (but only those in a room)
      console.log(`Broadcasting message as fallback`);
      io.emit("getMessageBroadcast", {
        message: populatedMessage,
        chatRoomId,
        senderId: req.user._id.toString(),
        receiverId,
        carId,
      });
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error details:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Add a new controller function to mark a message as delivered
exports.markMessageDelivered = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.isDelivered = true;
    await message.save();

    // Create chat room ID for consistent room naming
    const chatRoomId = [
      message.senderId.toString(),
      message.receiverId.toString(),
      message.carId,
    ]
      .sort()
      .join("-");

    // Notify the sender that their message was delivered
    const io = req.app.get("io");
    if (io) {
      // Emit to the room first
      io.to(chatRoomId).emit("messageDelivered", {
        messageId: id,
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
      });

      // Signal both users to refresh their message list
      io.to(chatRoomId).emit("refreshMessages", {
        action: "messageDelivered",
        messageId: id,
        timestamp: Date.now(),
      });

      // Direct emission as fallback
      const sender = getUser(message.senderId.toString());
      if (sender && sender.socketId) {
        io.to(sender.socketId).emit("messageDelivered", {
          messageId: id,
          senderId: message.senderId.toString(),
          receiverId: message.receiverId.toString(),
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Message marked as delivered",
    });
  } catch (error) {
    console.error("Mark message delivered error:", error);
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
    )
      .populate("senderId", "firstName lastName email avatar")
      .populate("receiverId", "firstName lastName email avatar");

    // Emit socket event for message update to both users
    const io = req.app.get("io");
    if (io) {
      // Create a unique room ID for this conversation
      const chatRoomId = [
        message.senderId.toString(),
        message.receiverId.toString(),
        message.carId,
      ]
        .sort()
        .join("-");
      console.log("Emitting message update to chat room:", chatRoomId);

      // Emit to the room first
      io.to(chatRoomId).emit("messageUpdated", updatedMessage);

      // Signal both users to refresh their message list
      io.to(chatRoomId).emit("refreshMessages", {
        action: "messageUpdated",
        messageId: updatedMessage._id,
        timestamp: Date.now(),
      });

      // Send to receiver as fallback
      const receiver = getUser(message.receiverId.toString());
      if (receiver && receiver.socketId) {
        console.log(
          `Emitting update directly to receiver socketId: ${receiver.socketId}`
        );
        io.to(receiver.socketId).emit("messageUpdated", updatedMessage);
      }

      // Send to sender as fallback
      const sender = getUser(message.senderId.toString());
      if (sender && sender.socketId && sender.socketId !== receiver?.socketId) {
        console.log(
          `Emitting update directly to sender socketId: ${sender.socketId}`
        );
        io.to(sender.socketId).emit("messageUpdated", updatedMessage);
      }
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
    if (io) {
      // Create a unique room ID for this conversation
      const chatRoomId = [
        message.senderId.toString(),
        message.receiverId.toString(),
        message.carId,
      ]
        .sort()
        .join("-");
      console.log("Emitting message deletion to chat room:", chatRoomId);

      // Emit to the room first
      io.to(chatRoomId).emit("messageDeleted", { messageId: message._id });

      // Signal both users to refresh their message list
      io.to(chatRoomId).emit("refreshMessages", {
        action: "messageDeleted",
        messageId: message._id,
        timestamp: Date.now(),
      });

      // Fallback to direct user emission
      const receiver = getUser(message.receiverId.toString());
      if (receiver && receiver.socketId) {
        console.log(
          `Emitting deletion directly to receiver socketId: ${receiver.socketId}`
        );
        io.to(receiver.socketId).emit("messageDeleted", {
          messageId: message._id,
        });
      }
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

    // Validate ObjectIds
    if (
      !receiverId ||
      !carId ||
      receiverId === "undefined" ||
      carId === "undefined"
    ) {
      return res.status(400).json({
        success: false,
        error: `Invalid parameters: receiverId=${receiverId}, carId=${carId}`,
      });
    }

    const messages = await Message.find({
      carId,
      $or: [
        { senderId: req.user._id, receiverId: receiverId },
        { senderId: receiverId, receiverId: req.user._id },
      ],
      isDeleted: { $ne: true },
    })
      .populate({
        path: "senderId",
        select: "firstName lastName email avatar createdAt",
        model: "User",
      })
      .populate({
        path: "receiverId",
        select: "firstName lastName email avatar",
        model: "User",
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("GetCarUserMessages Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getCarInquiries = async (req, res) => {
  try {
    const { carId } = req.params;

    // Get all messages for this car and populate both sender and receiver details
    const messages = await Message.find({
      carId,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "senderId",
        select: "firstName lastName email avatar createdAt",
        model: "User",
      })
      .populate({
        path: "receiverId",
        select: "firstName lastName email avatar",
        model: "User",
      })
      .sort({ createdAt: -1 });

    // Handle case where sender might be null and group by unique conversations
    const conversationMap = new Map();

    messages.forEach((message) => {
      if (!message.senderId) return;

      const senderId = message.senderId._id.toString();
      if (!conversationMap.has(senderId)) {
        conversationMap.set(senderId, {
          sender: {
            _id: message.senderId._id,
            firstName: message.senderId.firstName || "Unknown",
            lastName: message.senderId.lastName || "User",
            email: message.senderId.email,
            avatar: message.senderId.avatar || null,
            createdAt: message.senderId.createdAt,
          },
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            images: message.images || [],
          },
          messages: [],
          unreadCount: 0,
        });
      }

      const conversation = conversationMap.get(senderId);
      conversation.messages.push(message);

      // Only count unread messages sent by the inquirer
      if (
        !message.isRead &&
        message.senderId._id.toString() !== req.user._id.toString()
      ) {
        conversation.unreadCount += 1;
      }
    });

    // Convert map to array and sort by latest message
    const inquiries = Array.from(conversationMap.values())
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages.sort(
          (a, b) => a.createdAt - b.createdAt
        ),
      }))
      .sort((a, b) => {
        const aDate = new Date(a.lastMessage.createdAt);
        const bDate = new Date(b.lastMessage.createdAt);
        return bDate - aDate;
      });

    res.status(200).json({
      success: true,
      inquiries,
    });
  } catch (error) {
    console.error("Car Inquiries Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update markMessagesAsRead function
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { senderId, carId } = req.params;

    // Validate ObjectIds
    if (
      !senderId ||
      !carId ||
      senderId === "undefined" ||
      carId === "undefined"
    ) {
      return res.status(400).json({
        success: false,
        error: `Invalid parameters: senderId=${senderId}, carId=${carId}`,
      });
    }

    const result = await Message.updateMany(
      {
        carId,
        senderId,
        receiverId: req.user._id,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark Messages Read Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Add a new route to mark a single message as read
exports.markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Only mark as read if the user is the recipient
    if (message.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to mark this message as read",
      });
    }

    message.isRead = true;
    message.readAt = new Date(); // Add timestamp when message was read
    message.readBy = req.user._id; // Add who read the message

    // Also mark as delivered if not already
    if (!message.isDelivered) {
      message.isDelivered = true;
    }

    await message.save();

    // Get the populated message to include user details in the event
    const populatedMessage = await Message.findById(id)
      .populate("senderId", "firstName lastName email avatar")
      .populate("receiverId", "firstName lastName email avatar")
      .populate("readBy", "firstName lastName email avatar"); // Populate readBy field

    // Create chat room ID for consistent room naming
    const chatRoomId = [
      message.senderId.toString(),
      message.receiverId.toString(),
      message.carId,
    ]
      .sort()
      .join("-");

    // Notify the sender that their message was read
    const io = req.app.get("io");
    if (io) {
      // Create reader object with complete info for immediate UI update
      const readerInfo = {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        avatar: req.user.avatar,
      };

      // Send complete data in the event to avoid needing additional fetches
      const messageReadData = {
        messageId: id,
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        readAt: message.readAt,
        message: populatedMessage,
        reader: readerInfo,
        carId: message.carId,
      };

      // Emit to the room first with more complete message data
      io.to(chatRoomId).emit("messageRead", messageReadData);

      // Signal both users to refresh their message list
      io.to(chatRoomId).emit("refreshMessages", {
        action: "messageRead",
        messageId: id,
        timestamp: Date.now(),
      });

      // Direct emission as fallback
      const sender = getUser(message.senderId.toString());
      if (sender && sender.socketId) {
        io.to(sender.socketId).emit("messageRead", messageReadData);
      }
    }

    res.status(200).json({
      success: true,
      message: "Message marked as read",
    });
  } catch (error) {
    console.error("Mark message read error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
