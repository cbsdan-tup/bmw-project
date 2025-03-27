import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import io from "socket.io-client";
import { API_URL } from "../config/constants";
import FastImage from "react-native-fast-image";
import api from "../services/api";
import * as ImagePicker from "expo-image-picker";
import ImageViewer from "react-native-image-zoom-viewer";

const ChatScreen = ({ route }) => {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const { recipientId, carId } = route.params; // Add carId from route params
  const currentUserId = user?._id;
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const flatListRef = useRef(null);
  const [pendingMessages, setPendingMessages] = useState({});
  const messageListRef = useRef(null);
  const [socketDebug, setSocketDebug] = useState([]);
  // New state variables for real-time features
  const [refreshing, setRefreshing] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

  const EDIT_WINDOW_MINUTES = 20;

  const isWithinEditWindow = (createdAt) => {
    const messageTime = new Date(createdAt).getTime();
    const currentTime = new Date().getTime();
    const diffInMinutes = (currentTime - messageTime) / (1000 * 60);
    return diffInMinutes <= EDIT_WINDOW_MINUTES;
  };

  const getRemainingEditTime = (createdAt) => {
    const messageTime = new Date(createdAt).getTime();
    const currentTime = new Date().getTime();
    const diffInMinutes = (currentTime - messageTime) / (1000 * 60);
    return Math.max(0, Math.round(EDIT_WINDOW_MINUTES - diffInMinutes));
  };

  // Create a chatRoomId for socket communication
  const chatRoomId = [currentUserId, recipientId, carId].sort().join("-");

  // Better logging function
  const logSocketEvent = (event, data) => {
    console.log(`[SOCKET ${event}]`, data);
    setSocketDebug((prev) => [
      ...prev,
      { event, time: new Date().toISOString(), data },
    ]);
  };

  useEffect(() => {
    // Reset socket connection on mount to ensure a fresh connection
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    connectSocket();
    fetchMessages(true); // Show loading only for initial load

    // Mark messages as read on load
    markMessagesAsRead();

    return () => {
      if (socketRef.current) {
        logSocketEvent("cleanup", "Leaving room and disconnecting");
        socketRef.current.emit("leaveRoom", chatRoomId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const connectSocket = () => {
    logSocketEvent("connect", "Initializing socket connection");

    try {
      // Fix: Get just the base URL without any path fragments
      const baseUrl = API_URL.split("/api")[0]; // Remove API path if present

      logSocketEvent("connect-url", `Connecting to: ${baseUrl}`);

      // Simplified socket options to reduce potential issues
      const newSocket = io(baseUrl, {
        auth: { token },
        transports: ["websocket", "polling"], // Allow fallback to polling
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: true,
      });

      newSocket.on("connect", () => {
        setIsConnected(true);
        logSocketEvent(
          "connected",
          `Socket connected with ID: ${newSocket.id}`
        );

        // Explicitly identify the user to the server
        newSocket.emit("addUser", currentUserId);

        // Join the chat room with explicit userId information
        newSocket.emit("joinRoom", {
          roomId: chatRoomId,
          userId: currentUserId,
          recipientId: recipientId,
          carId: carId,
        });

        logSocketEvent("joinRoom", `Joined room: ${chatRoomId}`);

        // Refresh messages after successful connection
        fetchMessages();
      });

      newSocket.on("disconnect", (reason) => {
        setIsConnected(false);
        logSocketEvent("disconnected", `Socket disconnected: ${reason}`);
      });

      newSocket.on("connect_error", (error) => {
        logSocketEvent("connect_error", error.message);
        console.error("Socket connection error:", error);
      });

      newSocket.on("error", (error) => {
        logSocketEvent("error", error);
        console.error("Socket error:", error);
      });

      // Improved message handler with new message count
      newSocket.on("getMessage", (message) => {
        logSocketEvent("getMessage", message);

        // Simplified checking - just make sure we have a valid message object
        if (!message || !message._id) {
          logSocketEvent("getMessage-error", "Invalid message format");
          return;
        }

        // Check if message belongs to this conversation (more permissive)
        const belongsToConversation =
          // Either sender or receiver is the current user
          (message.senderId?._id === currentUserId ||
            message.receiverId?._id === currentUserId) &&
          // And the other person is our chat partner
          (message.senderId?._id === recipientId ||
            message.receiverId?._id === recipientId) &&
          // Make sure it's for the right car
          message.carId === carId;

        if (belongsToConversation) {
          setMessages((prev) => {
            // Don't add duplicate messages
            if (prev.some((m) => m._id === message._id)) {
              logSocketEvent("getMessage-skip", "Duplicate message");
              return prev;
            }

            logSocketEvent("getMessage-add", "Adding new message to state");

            // If message is from the other person, increment new message count
            if (message.senderId?._id === recipientId) {
              setNewMessageCount((count) => count + 1);
            }

            // Auto mark received messages as read
            if (message.senderId?._id === recipientId && !message.isRead) {
              markMessageAsRead(message._id);
            }

            // Update last synced timestamp
            setLastUpdated(new Date());

            // Add new message and sort
            return [...prev, message].sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
          });
        } else {
          logSocketEvent(
            "getMessage-skip",
            "Message does not belong to this conversation"
          );
        }
      });

      // Add listener for broadcast messages (fallback delivery mechanism)
      newSocket.on("getMessageBroadcast", (data) => {
        const { message, chatRoomId: msgRoomId } = data;

        logSocketEvent("getMessageBroadcast", {
          messageId: message?._id,
          msgRoomId,
          currentRoom: chatRoomId,
        });

        // Check if this broadcast is for our current chat room
        if (msgRoomId === chatRoomId && message && message._id) {
          // Process it like a regular message
          setMessages((prev) => {
            // Don't add duplicate messages
            if (prev.some((m) => m._id === message._id)) {
              logSocketEvent("getMessageBroadcast-skip", "Duplicate message");
              return prev;
            }

            // Auto mark received messages as read if we're the recipient
            if (message.senderId?._id === recipientId && !message.isRead) {
              markMessageAsRead(message._id);
            }

            return [...prev, message].sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
          });
        }
      });

      // Add handler for confirmation of room join
      newSocket.on("roomJoined", (data) => {
        logSocketEvent("roomJoined", data);
      });

      newSocket.on("messageUpdated", (updatedMessage) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          )
        );
      });

      newSocket.on("messageDeleted", ({ messageId }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, isDeleted: true } : msg
          )
        );
      });

      // Add handlers for reconnection
      newSocket.on("reconnect_attempt", (attemptNumber) => {
        logSocketEvent("reconnect_attempt", `Attempt ${attemptNumber}`);
      });

      newSocket.on("reconnect", (attemptNumber) => {
        logSocketEvent(
          "reconnect",
          `Reconnected after ${attemptNumber} attempts`
        );

        // Rejoin the chat room after reconnection
        newSocket.emit("addUser", currentUserId);
        newSocket.emit("joinRoom", {
          roomId: chatRoomId,
          userId: currentUserId,
          recipientId: recipientId,
          carId: carId,
        });

        // Refresh messages to make sure we're in sync
        fetchMessages();
      });

      newSocket.on("reconnect_error", (error) => {
        logSocketEvent("reconnect_error", error.message);
      });

      newSocket.on("reconnect_failed", () => {
        logSocketEvent(
          "reconnect_failed",
          "Failed to reconnect after all attempts"
        );
        Alert.alert(
          "Connection Lost",
          "Could not reconnect to the server. Please try again later.",
          [{ text: "OK" }]
        );
      });

      socketRef.current = newSocket;
    } catch (err) {
      console.error("Socket initialization error:", err);
      logSocketEvent("connect-error", `Socket init error: ${err.message}`);

      // Simplified fallback - just use basic configuration
      try {
        const baseUrl = API_URL.split("/api")[0];
        const fallbackSocket = io(baseUrl, {
          transports: ["polling"],
          forceNew: true,
        });

        socketRef.current = fallbackSocket;
        logSocketEvent(
          "connect-fallback",
          "Attempting fallback connection with polling only"
        );
      } catch (fallbackErr) {
        console.error("Fallback socket connection failed:", fallbackErr);
        logSocketEvent("connect-fallback-error", fallbackErr.message);
      }
    }
  };

  // Modify the fetchMessages function to accept a showLoading parameter
  const fetchMessages = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      setIsSyncing(showLoading ? true : false);

      logSocketEvent(
        "fetchMessages",
        `Fetching messages for recipient ${recipientId} and car ${carId}`
      );

      const response = await api.get(`/messages/${recipientId}/${carId}`);

      if (response.data.success) {
        // Sort messages by creation time (oldest first)
        const sortedMessages = response.data.messages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        logSocketEvent(
          "fetchMessages-success",
          `Received ${sortedMessages.length} messages`
        );

        setMessages(sortedMessages);
        setLastUpdated(new Date());
        setNewMessageCount(0); // Reset new message count after refresh

        // Mark unread messages as read
        markMessagesAsRead();
      } else {
        logSocketEvent(
          "fetchMessages-error",
          response.data.message || "Unknown error"
        );
        setError(response.data.message || "Failed to load messages");
      }
    } catch (error) {
      logSocketEvent("fetchMessages-exception", error.message);
      console.error("Fetch messages error:", error);
      setError(error.response?.data?.message || "Failed to load messages");

      // Try to reconnect socket if fetch failed
      if (socketRef.current && !socketRef.current.connected) {
        logSocketEvent(
          "fetchMessages-reconnect",
          "Attempting to reconnect socket"
        );
        socketRef.current.connect();
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
      setIsSyncing(false);
    }
  };

  // Add a new function for background fetching
  const fetchMessagesInBackground = () => {
    fetchMessages(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Generate a temporary ID for this message
      const tempId = `temp-${Date.now()}`;
      const messageToSend = newMessage.trim();
      setNewMessage("");

      logSocketEvent(
        "sendMessage",
        `Sending message: ${messageToSend.substring(0, 20)}...`
      );

      // Create a message object to display immediately
      const tempMessage = {
        _id: tempId,
        content: messageToSend,
        senderId: {
          _id: currentUserId,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
        receiverId: {
          _id: recipientId,
        },
        carId: carId,
        createdAt: new Date(),
        isTemporary: true,
      };

      // Add to messages with "sending" status
      setMessages((prev) => [...prev, tempMessage]);
      setPendingMessages((prev) => ({ ...prev, [tempId]: "sending" }));

      // Send the actual message
      const messageData = {
        content: messageToSend,
        receiverId: recipientId,
        carId: carId,
      };

      const response = await api.post(`/messages`, messageData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        logSocketEvent(
          "sendMessage-success",
          `Message sent with ID: ${response.data.message._id}`
        );

        // Fetch all messages without loading indicator
        fetchMessagesInBackground();

        // Remove the temp status and update to "sent"
        setPendingMessages((prev) => {
          const updated = { ...prev };
          delete updated[tempId]; // Remove temp id
          updated[response.data.message._id] = "sent"; // Add real id with "sent" status
          return updated;
        });

        // Emit a delivery confirmation after a short delay
        setTimeout(() => {
          if (socketRef.current) {
            logSocketEvent(
              "confirmDelivery",
              `Confirming delivery for: ${response.data.message._id}`
            );
            socketRef.current.emit("confirmDelivery", {
              messageId: response.data.message._id,
              receiverId: recipientId,
              senderId: currentUserId,
              carId: carId,
            });
          }
        }, 500);
      } else {
        logSocketEvent(
          "sendMessage-error",
          response.data.message || "Unknown error"
        );
        // Mark as failed if the server rejected it
        setPendingMessages((prev) => ({ ...prev, [tempId]: "failed" }));
      }
    } catch (error) {
      logSocketEvent("sendMessage-exception", error.message);
      console.error("Send message error:", error);

      // Find the temporary message and mark as failed
      setMessages((prev) => {
        const tempMsg = prev.find((m) => m.isTemporary);
        if (tempMsg) {
          setPendingMessages((prev) => ({ ...prev, [tempMsg._id]: "failed" }));
        }
        return prev;
      });

      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to send message"
      );
    }
  };

  // Mark all unread messages as read
  const markMessagesAsRead = async () => {
    if (markingAsRead) return;

    try {
      setMarkingAsRead(true);
      await api.put(`/messages/read/${recipientId}/${carId}`);

      // Update local message state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId._id === recipientId && !msg.isRead
            ? { ...msg, isRead: true }
            : msg
        )
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    } finally {
      setMarkingAsRead(false);
    }
  };

  // Mark a single message as read
  const markMessageAsRead = async (messageId) => {
    try {
      await api.put(`/messages/${messageId}/read`);

      // Fetch all messages to ensure read status is reflected consistently
      fetchMessages();
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  // Update useEffect to handle socket events better
  useEffect(() => {
    if (socketRef.current) {
      // Clear all previous listeners to avoid duplicates
      socketRef.current.off("getMessage");
      socketRef.current.off("getMessageBroadcast");
      socketRef.current.off("messageDelivered");
      socketRef.current.off("messageUpdated");
      socketRef.current.off("messageDeleted");
      socketRef.current.off("messageRead");
      socketRef.current.off("refreshMessages");

      // Add listener for refresh messages events
      socketRef.current.on("refreshMessages", (data) => {
        logSocketEvent("refreshMessages", `Refresh trigger: ${data.action}`);
        // Fetch all messages to ensure we're in sync - without loading indicator
        fetchMessagesInBackground();
      });

      // Reattach getMessage listener
      socketRef.current.on("getMessage", (newMessage) => {
        logSocketEvent("getMessage-effect", `Got message: ${newMessage._id}`);

        // Immediately mark received messages as read if we're in the chat
        if (newMessage.senderId?._id === recipientId && !newMessage.isRead) {
          markMessageAsRead(newMessage._id);
        }

        // Always fetch all messages when we receive a new one - without loading indicator
        fetchMessagesInBackground();
      });

      // Add broadcast message listener
      socketRef.current.on("getMessageBroadcast", (data) => {
        const { message, chatRoomId: msgRoomId } = data;

        if (msgRoomId === chatRoomId && message && message._id) {
          logSocketEvent(
            "getMessageBroadcast-effect",
            `Got broadcast message: ${message._id}`
          );

          // Always fetch all messages when we receive a broadcast - without loading indicator
          fetchMessagesInBackground();
        }
      });

      // Reattach other listeners with background refresh behavior
      socketRef.current.on("messageDelivered", ({ messageId }) => {
        setPendingMessages((prev) => {
          const updated = { ...prev };
          updated[messageId] = "delivered";
          return updated;
        });

        // Fetch all messages without loading indicator
        fetchMessagesInBackground();
      });

      socketRef.current.on("messageUpdated", (updatedMessage) => {
        // Fetch all messages without loading indicator
        fetchMessagesInBackground();
      });

      socketRef.current.on("messageDeleted", ({ messageId }) => {
        // Fetch all messages without loading indicator
        fetchMessagesInBackground();
      });

      // Enhanced listener for message read status updates
      socketRef.current.on("messageRead", (data) => {
        console.log(`Message ${data.messageId} was read by recipient`, data);

        // Update message status locally with reader information
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId
              ? {
                  ...msg,
                  isRead: true,
                  readAt: data.readAt,
                  reader: data.reader || data.message?.readBy || null,
                }
              : msg
          )
        );

        setPendingMessages((prev) => {
          const updated = { ...prev };
          updated[data.messageId] = "read";
          return updated;
        });

        // Fetch all messages without loading indicator
        fetchMessagesInBackground();
      });
    }

    // Refresh connection if needed
    return () => {
      if (socketRef.current) {
        // Only clean up the listeners, don't disconnect here
        socketRef.current.off("getMessage");
        socketRef.current.off("getMessageBroadcast");
        socketRef.current.off("messageDelivered");
        socketRef.current.off("messageUpdated");
        socketRef.current.off("messageDeleted");
        socketRef.current.off("messageRead");
        socketRef.current.off("refreshMessages");
      }
    };
  }, [socketRef.current, recipientId]);

  const deleteMessage = async (messageId) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await api.delete(`/messages/${messageId}`);
              // Fetch all messages without loading indicator
              fetchMessagesInBackground();
            } catch (error) {
              Alert.alert("Error", "Failed to delete message");
            }
          },
        },
      ]
    );
  };

  const startEditing = (messageId, content) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const updateMessage = async (messageId) => {
    if (!editingContent.trim()) return;

    try {
      const response = await api.put(`/messages/${messageId}`, {
        content: editingContent.trim(),
      });

      // Fetch all messages without loading indicator
      fetchMessagesInBackground();

      setEditingMessageId(null);
      setEditingContent("");
    } catch (error) {
      Alert.alert("Error", "Failed to update message");
    }
  };

  const getMessageStatus = (message) => {
    if (pendingMessages[message._id]) {
      return pendingMessages[message._id];
    }

    if (message.isRead) return "read";
    if (message.isDelivered) return "delivered";
    return "sent";
  };

  // Update the renderMessageStatus function to include seen with profile picture
  const renderMessageStatus = (status, message) => {
    switch (status) {
      case "sending":
        return (
          <View style={styles.statusWithText}>
            <Icon name="clock-o" size={12} color="#9E9E9E" />
            <Text style={styles.statusText}>Sending</Text>
          </View>
        );
      case "sent":
        return (
          <View style={styles.statusWithText}>
            <Icon name="check" size={12} color="#9E9E9E" />
            <Text style={styles.statusText}>Sent</Text>
          </View>
        );
      case "delivered":
        return (
          <View style={styles.statusWithText}>
            <Icon name="check" size={12} color="#2196F3" />
            <Text style={styles.statusText}>Delivered</Text>
          </View>
        );
      case "read":
        return (
          <View style={styles.statusWithText}>
            <View style={styles.seenContainer}>
              <Icon name="check-circle" size={12} color="#4CAF50" />
              <Text style={styles.statusText}>Seen</Text>
              {message.reader && (
                <View style={styles.readerContainer}>
                  {message.reader.avatar?.url ? (
                    <FastImage
                      source={{ uri: message.reader.avatar.url }}
                      style={styles.readerAvatar}
                    />
                  ) : (
                    <View
                      style={[styles.readerAvatar, styles.avatarPlaceholder]}
                    >
                      <Text style={styles.readerInitial}>
                        {message.reader.firstName?.charAt(0) || "U"}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      case "failed":
        return (
          <View style={styles.statusWithText}>
            <Icon name="exclamation-circle" size={12} color="#FF3B30" />
            <Text style={styles.statusText}>Failed</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // Add this function to handle image taps
  const handleImagePress = (images, index) => {
    const imageUrls = images.map((img) => ({ url: img.url }));
    setCurrentImages(imageUrls);
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  // Update the renderMessage function to include image handling
  const renderMessage = ({ item }) => {
    const isOwnMessage = item.senderId._id === currentUserId;
    const isEditing = item._id === editingMessageId;
    const canEdit =
      isOwnMessage && isWithinEditWindow(item.createdAt) && !item.isTemporary;
    const remainingTime = getRemainingEditTime(item.createdAt);
    const messageStatus = getMessageStatus(item);

    // Get sender name properly
    const senderName = item.senderId
      ? `${item.senderId.firstName || ""} ${
          item.senderId.lastName || ""
        }`.trim()
      : "Unknown User";

    // Get avatar URL properly
    const avatarUrl = item.senderId?.avatar?.url;

    const renderMessageActions = () => {
      if (!isOwnMessage || item.isDeleted) return null;

      const isImageOnlyMessage =
        item.images?.length > 0 &&
        (!item.content || item.content.trim() === "");

      return (
        <View style={styles.messageActions}>
          <TouchableOpacity
            onPress={() =>
              setActiveMenuId(activeMenuId === item._id ? null : item._id)
            }
            style={styles.menuButton}
          >
            <Icon name="ellipsis-v" size={14} color="#666666" />
          </TouchableOpacity>

          {activeMenuId === item._id && (
            <>
              <TouchableOpacity
                style={styles.menuBackdrop}
                onPress={() => setActiveMenuId(null)}
              />
              <View
                style={[
                  styles.menuDropdown,
                  isOwnMessage
                    ? styles.menuDropdownRight
                    : styles.menuDropdownLeft,
                ]}
              >
                {/* Only show edit option if message has text content */}
                {!isImageOnlyMessage && canEdit && (
                  <TouchableOpacity
                    onPress={() => {
                      startEditing(item._id, item.content);
                      setActiveMenuId(null);
                    }}
                    style={styles.menuItem}
                  >
                    <Icon name="edit" size={16} color="#007AFF" />
                    <Text style={styles.menuItemText}>
                      Edit ({remainingTime}m)
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    deleteMessage(item._id);
                    setActiveMenuId(null);
                  }}
                  style={styles.menuItem}
                >
                  <Icon name="trash" size={16} color="#FF3B30" />
                  <Text style={[styles.menuItemText, styles.deleteText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      );
    };

    const renderMessageContent = () => {
      if (isEditing) {
        return (
          <View
            style={[
              styles.editingContent,
              isOwnMessage
                ? styles.editingContentOwn
                : styles.editingContentOther,
            ]}
          >
            {item.images && item.images.length > 0 && (
              <View style={styles.editingImagesPreview}>
                <View style={styles.imageGrid}>
                  {item.images.map((image, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleImagePress(item.images, index)}
                      style={[styles.editingImageWrapper]}
                    >
                      <FastImage
                        source={{ uri: image.url }}
                        style={styles.editingImageThumb}
                        resizeMode={FastImage.resizeMode.cover}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.editingImagesHint}>
                  Images cannot be edited or removed
                </Text>
              </View>
            )}
            <TextInput
              value={editingContent}
              onChangeText={setEditingContent}
              style={[
                styles.editInput,
                { color: isOwnMessage ? "#FFFFFF" : "#000000" },
              ]}
              multiline
              autoFocus
              placeholder="Edit message text..."
              placeholderTextColor={isOwnMessage ? "#FFFFFF80" : "#00000080"}
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={() => updateMessage(item._id)}
                style={[styles.editButton, { backgroundColor: colors.primary }]}
              >
                <Icon name="check" size={16} color="#FFFFFF" />
                <Text style={[styles.editButtonText, { color: "#FFFFFF" }]}>
                  Save
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={cancelEditing}
                style={[styles.editButton, { backgroundColor: colors.border }]}
              >
                <Icon name="times" size={16} color="#000000" />
                <Text style={styles.editButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      return (
        <View>
          {item.content && item.content.trim() !== "" && (
            <Text
              style={[
                styles.messageText,
                { color: isOwnMessage ? "#FFFFFF" : "#000000" },
              ]}
            >
              {item.content}
            </Text>
          )}
          {item.images && item.images.length > 0 && (
            <View style={styles.messageImagesContainer}>
              <View style={styles.imageGrid}>
                {item.images.map((image, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleImagePress(item.images, index)}
                    style={[
                      styles.imageWrapper,
                      item.images.length === 1 && styles.singleImageWrapper,
                      item.images.length === 2 && styles.halfWidthWrapper,
                      item.images.length >= 3 && styles.thirdWidthWrapper,
                    ]}
                  >
                    <FastImage
                      source={{ uri: image.url }}
                      style={[styles.messageImage]}
                      resizeMode={FastImage.resizeMode.cover}
                    />
                    {item.images.length > 1 && (
                      <View style={styles.imageIndexBadge}>
                        <Text style={styles.imageIndexText}>
                          {index + 1}/{item.images.length}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      );
    };

    return (
      <View
        style={[
          styles.messageRowContainer,
          isOwnMessage ? styles.ownMessageRow : styles.otherMessageRow,
        ]}
      >
        {isOwnMessage && renderMessageActions()}
        <View
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
          ]}
        >
          {!isOwnMessage && (
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <FastImage source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {item.senderId?.firstName?.charAt(0) || "U"}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.messageContentWrapper}>
            {!isOwnMessage && (
              <Text style={styles.senderName}>{senderName}</Text>
            )}

            {item.isDeleted ? (
              <View
                style={[
                  styles.messageContent,
                  isOwnMessage
                    ? styles.ownMessageContent
                    : styles.otherMessageContent,
                ]}
              >
                <Text style={styles.deletedMessage}>
                  This message was deleted
                </Text>
              </View>
            ) : isEditing ? (
              <View
                style={[
                  styles.messageContent,
                  styles.editingContent,
                  isOwnMessage
                    ? styles.ownMessageContent
                    : styles.otherMessageContent,
                ]}
              >
                <TextInput
                  value={editingContent}
                  onChangeText={setEditingContent}
                  style={[
                    styles.editInput,
                    { color: isOwnMessage ? "#FFFFFF" : "#000000" },
                  ]}
                  multiline
                  autoFocus
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={() => updateMessage(item._id)}
                    style={[
                      styles.editButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.editButtonText, { color: "#FFFFFF" }]}>
                      Save
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={cancelEditing}
                    style={[
                      styles.editButton,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <Text style={styles.editButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.messageContent,
                  isOwnMessage
                    ? styles.ownMessageContent
                    : styles.otherMessageContent,
                ]}
              >
                {renderMessageContent()}
                <View style={styles.messageFooter}>
                  {item.isEdited && (
                    <Text
                      style={[
                        styles.editedLabel,
                        { color: isOwnMessage ? "#E0E0E0" : "#666666" },
                      ]}
                    >
                      edited
                    </Text>
                  )}
                  {isOwnMessage && (
                    <View style={styles.statusContainer}>
                      {renderMessageStatus(messageStatus, item)}
                      {messageStatus === "failed" && (
                        <TouchableOpacity
                          onPress={() => {
                            // Retry sending the message
                            setNewMessage(item.content);
                            setMessages((prev) =>
                              prev.filter((msg) => msg._id !== item._id)
                            );
                          }}
                          style={styles.retryButton}
                        >
                          <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.timestamp,
                    { color: "#666666" },
                    { alignSelf: isOwnMessage ? "flex-end" : "flex-start" },
                  ]}
                >
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
        {!isOwnMessage && renderMessageActions()}
      </View>
    );
  };

  // Add a function to handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages(false); // Don't show loading spinner, RefreshControl will handle that
  };

  // Function to reconnect socket if disconnected
  const reconnectSocket = () => {
    if (socketRef.current) {
      logSocketEvent("manual-reconnect", "Manually reconnecting socket");
      // First disconnect properly
      try {
        socketRef.current.disconnect();
      } catch (e) {
        console.log("Disconnect error:", e);
      }
      // Then reconnect with fresh connection
      setIsSyncing(true);
      logSocketEvent("manual-reconnect", "Manually reconnecting socket");
      // Recreate the socket connection
      connectSocket();

      // Set a timeout to turn off syncing indicator if it takes too long
      setTimeout(() => {
        setIsSyncing(false);
      }, 3000);
    } else {
      // If no socket exists, create a new one
      connectSocket();
    }
  };

  const compressAndResizeImage = async (imageUri) => {
    try {
      // Import ImageManipulator dynamically if needed
      const ImageManipulator = require("expo-image-manipulator");

      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      return manipResult.uri;
    } catch (err) {
      console.error("Image compression error:", err);
      return imageUri; // Return original if compression fails
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library"
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (result.assets.length > 5) {
          Alert.alert(
            "Too many images",
            "You can only send up to 5 images at once"
          );
          setSelectedImages(result.assets.slice(0, 5));
        } else {
          setSelectedImages(result.assets);
        }
      }
    } catch (error) {
      console.error("ImagePicker Error:", error);
      Alert.alert("Error", "Failed to select images");
    }
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const renderImagePreviews = () => {
    if (selectedImages.length === 0) return null;

    return (
      <View style={styles.imagePreviewContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {selectedImages.map((image, index) => (
            <View key={index} style={styles.imagePreviewWrapper}>
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <Icon name="times-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.sendImagesButton} onPress={sendImages}>
          <Text style={styles.sendImagesButtonText}>
            Send {selectedImages.length}{" "}
            {selectedImages.length === 1 ? "image" : "images"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const sendImages = async () => {
    if (selectedImages.length === 0) return;

    try {
      // Show uploading indicator
      setIsSyncing(true);

      const formData = new FormData();

      // Add image files with proper handling for different platforms
      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i];

        // Get proper URI based on platform
        const imageUri =
          Platform.OS === "android"
            ? image.uri
            : image.uri.replace("file://", "");

        // Extract file name and type
        const imageName = imageUri.split("/").pop() || `image_${i}.jpg`;
        // Ensure we have a valid extension, default to jpeg if none
        const imageExtension = (
          imageName.split(".").pop() || "jpeg"
        ).toLowerCase();
        const imageType = `image/${imageExtension}`;

        // Log each image being added to help with debugging
        console.log(
          `Adding image ${i + 1}/${
            selectedImages.length
          }: ${imageName} (${imageType})`
        );

        // Add to form data with proper structure
        formData.append("images", {
          uri: imageUri,
          name: imageName,
          type: imageType,
        });
      }

      // Explicitly add content field with empty string (IMPORTANT)
      formData.append("content", " "); // Add a space instead of empty string

      // Add other required data
      formData.append("receiverId", recipientId);
      formData.append("carId", carId);

      // Add a timeout to the request
      const timeoutMs = 30000; // 30 seconds timeout

      console.log(`Sending ${selectedImages.length} images to server...`);

      // Log the formData for debugging
      console.log("Form data entries:");
      for (let [key, value] of Object.entries(formData)) {
        console.log(`${key}: ${value}`);
      }

      // Use the regular message endpoint with longer timeout
      const response = await api.post("/messages", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
        timeout: timeoutMs,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });

      if (response.data.success) {
        console.log("Images sent successfully");
        setSelectedImages([]);
        // Fetch messages to update the chat
        fetchMessagesInBackground();
      } else {
        console.error("Server responded with error:", response.data.message);
        Alert.alert("Error", response.data.message || "Failed to send images");
      }
    } catch (error) {
      console.error("Send images error:", error);

      // More detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
        Alert.alert(
          "Server Error",
          `Error code: ${error.response.status}. Please try again.`
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
        Alert.alert(
          "Network Error",
          "The server did not respond. Please check your connection and try again."
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error setting up request:", error.message);
        Alert.alert("Error", "Failed to send images: " + error.message);
      }

      if (error.code === "ECONNABORTED") {
        Alert.alert(
          "Request Timeout",
          "The request took too long to complete. Try with fewer or smaller images."
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading messages...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="exclamation-circle" size={40} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={fetchMessages}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading messages...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Icon name="exclamation-circle" size={40} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchMessages}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {!isConnected && (
            <TouchableOpacity
              style={styles.connectionBanner}
              onPress={reconnectSocket}
            >
              <Text style={styles.connectionText}>
                Connection lost. Tap to reconnect
              </Text>
            </TouchableOpacity>
          )}

          {isSyncing && (
            <View style={styles.syncingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.syncingText}>Syncing messages...</Text>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            style={styles.messagesList}
            inverted={true}
            contentContainerStyle={[
              styles.messagesContainer,
              { flexGrow: 1, justifyContent: "flex-end" },
            ]}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />

          {newMessageCount > 0 && (
            <TouchableOpacity
              style={[
                styles.newMessageBanner,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                flatListRef.current?.scrollToOffset({
                  offset: 0,
                  animated: true,
                });
                setNewMessageCount(0);
              }}
            >
              <Text style={styles.newMessageText}>
                {newMessageCount} new{" "}
                {newMessageCount === 1 ? "message" : "messages"}
              </Text>
              <Icon name="arrow-down" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </>
      )}

      {renderImagePreviews()}

      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.attachButton} onPress={pickImages}>
          <Icon name="image" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
            },
          ]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.text}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: newMessage.trim() ? 1 : 0.5 }]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Icon name="send" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Add the Image Viewer Modal */}
      <Modal visible={imageViewerVisible} transparent={true}>
        <ImageViewer
          imageUrls={currentImages}
          index={selectedImageIndex}
          onSwipeDown={() => setImageViewerVisible(false)}
          enableSwipeDown={true}
          onCancel={() => setImageViewerVisible(false)}
          backgroundColor="rgba(0,0,0,0.9)"
          renderHeader={() => (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setImageViewerVisible(false)}
            >
              <Icon name="times" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  messagesList: {
    flex: 1,
    padding: 10,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: "80%",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  messageContent: {
    padding: 12,
    borderRadius: 20,
    maxWidth: "100%",
  },
  ownMessageContent: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  otherMessageContent: {
    backgroundColor: "#E8E8E8",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  timestamp: {
    fontSize: 12,
    marginRight: 10,
    color: "gray",
  },
  likeIcon: {
    marginHorizontal: 5,
  },
  deleteIcon: {
    marginLeft: 10,
  },
  likeCount: {
    fontSize: 12,
    color: "gray",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  sendButton: {
    padding: 10,
  },
  deletedMessage: {
    fontStyle: "italic",
    color: "gray",
  },
  editedLabel: {
    fontSize: 12,
    marginLeft: 5,
    color: "#666666",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    padding: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  connectionBanner: {
    backgroundColor: "#FF9500",
    padding: 8,
    alignItems: "center",
  },
  connectionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: "#FFFFFF",
  },
  messagesContainer: {
    paddingVertical: 16,
    flexDirection: "column-reverse", // This helps with inverted list
  },
  editingContent: {
    padding: 8,
  },
  editInput: {
    fontSize: 16,
    minHeight: 40,
    padding: 4,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  editButton: {
    marginLeft: 12,
    padding: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  senderName: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 2,
    marginLeft: 12,
  },
  editingContent: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  editInput: {
    fontSize: 16,
    minHeight: 40,
    padding: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    marginLeft: 8,
  },
  deletedMessage: {
    fontStyle: "italic",
    color: "#999999",
    fontSize: 14,
  },
  editTimeText: {
    fontSize: 10,
    color: "#E0E0E0",
    marginLeft: 2,
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 50,
  },
  messageContentWrapper: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
    marginRight: 8,
  },
  menuButton: {
    position: "absolute",
    left: 60,
    top: 25,
    width: 400,
    height: 400,
  },
  menuBackdrop: {
    position: "absolute",
    backgroundColor: "transparent",
    zIndex: 999,
  },
  menuDropdown: {
    position: "absolute",
    top: 7,
    left: 80,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    width: 150,
  },
  menuDropdownRight: {
    right: 0,
  },
  menuDropdownLeft: {
    left: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    borderRadius: 8,
  },
  menuItemText: {
    marginLeft: 12,
    color: "#333333",
    fontSize: 15,
    fontWeight: "500",
  },
  deleteText: {
    color: "#FF3B30",
  },
  avatarPlaceholder: {
    backgroundColor: "#CCCCCC",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  retryButton: {
    marginLeft: 6,
  },
  retryText: {
    color: "#FF3B30",
    fontSize: 12,
  },
  debugButton: {
    position: "absolute",
    bottom: 70,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
    borderRadius: 5,
  },
  debugButtonText: {
    color: "white",
    fontSize: 10,
  },
  newMessageBanner: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newMessageText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginRight: 8,
  },
  lastUpdatedText: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    marginBottom: 4,
  },
  syncingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  syncingText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  statusWithText: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#666666",
  },
  seenContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  readerContainer: {
    marginLeft: 4,
  },
  readerAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 4,
  },
  readerInitial: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  imagePreviewContainer: {
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  imagePreviewWrapper: {
    marginRight: 10,
    position: "relative",
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 2,
  },
  sendImagesButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 20,
    marginTop: 10,
    alignItems: "center",
  },
  sendImagesButtonText: {
    color: "white",
    fontWeight: "600",
  },
  attachButton: {
    padding: 10,
    marginRight: 5,
  },
  messageImagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    marginTop: 5,
  },
  singleImage: {
    width: 200,
    height: 100,
    borderRadius: 8,
  },
  gridImage: {
    borderRadius: 8,
  },
  halfWidth: {
    width: Dimensions.get("window").width * 0.35,
    height: Dimensions.get("window").width * 0.35,
  },
  thirdWidth: {
    width: Dimensions.get("window").width * 0.25,
    height: Dimensions.get("window").width * 0.25,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 100,
    padding: 10,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  editingContent: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  editingContentOwn: {
    borderColor: "#FFFFFF40",
    backgroundColor: "#FFFFFF10",
  },
  editingContentOther: {
    borderColor: "#00000020",
    backgroundColor: "#00000005",
  },
  editingImagesPreview: {
    backgroundColor: "#00000010",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  editingImagesText: {
    fontSize: 14,
    color: "#666666",
    fontStyle: "italic",
  },
  editingImagesHint: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    marginTop: 8,
  },
  imageWrapper: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  singleImageWrapper: {
    width: 240,
    height: 240,
  },
  halfWidthWrapper: {
    width: "49%",
    aspectRatio: 1,
  },
  thirdWidthWrapper: {
    width: "32%",
    aspectRatio: 1,
  },
  messageImage: {
    width: "100%",
    height: "100%",
  },
  imageIndexBadge: {
    position: "absolute",
    right: 4,
    top: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  imageIndexText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
});

export default ChatScreen;
