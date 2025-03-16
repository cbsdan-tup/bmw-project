let onlineUsers = new Map();

const addUser = (userId, socketId) => {
  onlineUsers.set(userId, socketId);
};

const removeUser = (socketId) => {
  for (let [userId, sid] of onlineUsers.entries()) {
    if (sid === socketId) {
      onlineUsers.delete(userId);
      break;
    }
  }
};

const getUser = (userId) => {
  const socketId = onlineUsers.get(userId);
  if (!socketId) return null;

  return {
    userId,
    socketId,
  };
};

module.exports = { addUser, removeUser, getUser };
