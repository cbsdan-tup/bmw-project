const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['all', 'my_car_inquiries', 'my_inquiries', 'booking', 'payment', 'car'],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relatedId: {
    type: String,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  carId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cars',
    default: null
  }
}, { timestamps: true });

// Index for better performance
notificationSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
