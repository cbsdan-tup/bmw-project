const Notification = require('../models/Notification');
const User = require('../models/User');
const Car = require('../models/Cars');

// Get notifications with filter
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { filter = 'all' } = req.query;
    
    let query = { userId };
    
    if (filter !== 'all') {
      query.type = filter;
    }
    
    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName')
      .populate('carId', 'brand model')
      .sort({ createdAt: -1 })
      .limit(30);
    
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false
    });
    
    res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    
    let query = { userId: req.user._id, isRead: false };
    
    if (filter !== 'all') {
      query.type = filter;
    }
    
    await Notification.updateMany(query, { isRead: true });
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications'
    });
  }
};

// Create notification from message
exports.createFromMessage = async (req, res) => {
  try {
    console.log('Creating notification via API endpoint');
    const { messageId, senderId, receiverId, content, carId } = req.body;
    
    console.log(`Notification params: messageId=${messageId}, senderId=${senderId}, receiverId=${receiverId}, carId=${carId}`);
    
    // Validate all required parameters
    if (!messageId || !senderId || !receiverId || !carId) {
      console.error('Missing required parameters for notification creation');
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Get car details with better error handling
    let car = null;
    try {
      car = await Car.findById(carId);
      console.log(`Car lookup result: ${car ? 'Found' : 'Not found'}`);
    } catch (carError) {
      console.error(`Error finding car with ID ${carId}:`, carError);
      return res.status(500).json({
        success: false,
        message: 'Error finding car'
      });
    }
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }
    
    // Get sender details
    let sender = null;
    try {
      sender = await User.findById(senderId);
      console.log(`Sender lookup result: ${sender ? 'Found' : 'Not found'}`);
    } catch (senderError) {
      console.error(`Error finding sender with ID ${senderId}:`, senderError);
    }
    
    // Continue even if sender lookup fails
    
    const notifications = [];
    
    // Determine if receiver is the car owner
    const carOwnerId = car.owner.toString();
    const isCarOwnerReceiver = carOwnerId === receiverId.toString();
    const isSenderCarOwner = carOwnerId === senderId.toString();
    
    console.log(`Car owner ID: ${carOwnerId}`);
    console.log(`Is receiver the car owner? ${isCarOwnerReceiver}`);
    console.log(`Is sender the car owner? ${isSenderCarOwner}`);
    
    // 1. Create notification for receiver
    try {
      const receiverType = isCarOwnerReceiver ? 'my_car_inquiries' : 'my_inquiries';
      console.log(`Creating ${receiverType} notification for receiver ${receiverId}`);
      
      const receiverNotification = await Notification.create({
        userId: receiverId,
        title: `New message about ${car.brand} ${car.model}`,
        message: content && content.length > 100 ? content.substring(0, 97) + '...' : (content || ''),
        type: receiverType,
        isRead: false,
        relatedId: messageId,
        sender: senderId,
        carId: car._id
      });
      
      console.log(`Receiver notification created: ${receiverNotification._id}`);
      notifications.push(receiverNotification);
    } catch (receiverError) {
      console.error('Error creating receiver notification:', receiverError);
    }
    
    // 2. Create notification for the sender if they're not the car owner
    if (!isSenderCarOwner) {
      try {
        console.log(`Creating my_inquiries notification for sender ${senderId}`);
        
        const senderNotification = await Notification.create({
          userId: senderId,
          title: `Your inquiry about ${car.brand} ${car.model}`,
          message: content && content.length > 100 ? content.substring(0, 97) + '...' : (content || ''),
          type: 'my_inquiries',
          isRead: true,
          relatedId: messageId,
          sender: receiverId,
          carId: car._id
        });
        
        console.log(`Sender notification created: ${senderNotification._id}`);
        notifications.push(senderNotification);
      } catch (senderError) {
        console.error('Error creating sender notification:', senderError);
      }
    }
    
    console.log(`Created ${notifications.length} notifications successfully`);
    
    res.status(201).json({
      success: true,
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error in createFromMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
};
