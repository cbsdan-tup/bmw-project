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
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import io from "socket.io-client";
import { API_URL } from "../config/constants";
import FastImage from "react-native-fast-image";
import api from "../services/api";

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

  useEffect(() => {
    connectSocket();
    fetchMessages();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const connectSocket = () => {
    const newSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    newSocket.on("getMessage", (message) => {
      setMessages((prev) => [...prev, message]);
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

    socketRef.current = newSocket;
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(
        `/messages/${recipientId}/${carId}`,
      );

      if (response.data.success) {
        setMessages(response.data.messages);
      } else {
        setError(response.data.message || "Failed to load messages");
      }
    } catch (error) {
      console.error("Fetch messages error:", error);
      setError(error.response?.data?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        content: newMessage.trim(),
        receiverId: recipientId,
        carId: carId,
      };

      const response = await api.post(`/messages`, messageData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        setMessages((prev) => [...prev, response.data.message]);
        setNewMessage("");
      } else {
        Alert.alert("Error", response.data.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Send message error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to send message"
      );
    }
  };

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on("getMessage", (newMessage) => {
        setMessages((prev) => [newMessage, ...prev]);
      });

      socketRef.current.on("messageUpdated", (updatedMessage) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          )
        );
      });

      socketRef.current.on("messageDeleted", ({ messageId }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, isDeleted: true } : msg
          )
        );
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("getMessage");
        socketRef.current.off("messageUpdated");
        socketRef.current.off("messageDeleted");
      }
    };
  }, [socketRef.current]);

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
              setMessages((prev) =>
                prev.map((msg) =>
                  msg._id === messageId ? { ...msg, isDeleted: true } : msg
                )
              );
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
      const response = await api.put(
        `/messages/${messageId}`,
        { content: editingContent.trim() },
      );

      // Update messages while maintaining order
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...response.data.message, senderId: msg.senderId }
            : msg
        )
      );
      setEditingMessageId(null);
      setEditingContent("");
    } catch (error) {
      Alert.alert("Error", "Failed to update message");
    }
  };

  // Update the socket message handlers
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on("getMessage", (newMessage) => {
        setMessages((prev) =>
          [newMessage, ...prev].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
      });

      socketRef.current.on("messageUpdated", (updatedMessage) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id
              ? { ...updatedMessage, senderId: msg.senderId }
              : msg
          )
        );
      });

      // ... existing socket handlers ...
    }
    // ... existing cleanup ...
  }, [socketRef.current]);

  const getMessageStatus = (message) => {
    if (message.seen) return "seen";
    if (message.delivered) return "delivered";
    return "sent";
  };

  const renderMessageStatus = (status) => {
    switch (status) {
      case "seen":
        return <Icon name="check-circle" size={12} color="#4CAF50" />;
      case "delivered":
        return <Icon name="check" size={12} color="#2196F3" />;
      case "sent":
        return <Icon name="clock-o" size={12} color="#9E9E9E" />;
      default:
        return null;
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.senderId._id === currentUserId;
    const isEditing = item._id === editingMessageId;
    const canEdit = isOwnMessage && isWithinEditWindow(item.createdAt);
    const remainingTime = getRemainingEditTime(item.createdAt);

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
                {canEdit && (
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
              <View>
                <View
                  style={[
                    styles.messageContent,
                    isOwnMessage
                      ? styles.ownMessageContent
                      : styles.otherMessageContent,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isOwnMessage ? "#FFFFFF" : "#000000" },
                    ]}
                  >
                    {item.content}
                  </Text>
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
                        {renderMessageStatus(getMessageStatus(item))}
                      </View>
                    )}
                  </View>
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
        <FlatList
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
        />
      )}

      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 16,
  },
  connectionBanner: {
    backgroundColor: "#FFE58F",
    padding: 8,
    alignItems: "center",
  },
  connectionText: {
    color: "#D4B106",
    fontSize: 14,
  },

  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
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
    padding: 4,
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
    marginLeft: 4,
    marginRight: 8,
  },
  menuButton: {
    // display: "flex",
    // justifyContent: "end",
    // alignItems: "flex-end",
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
    top: 5,
    left: 80,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 8,
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
    padding: 12,
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
});

export default ChatScreen;
