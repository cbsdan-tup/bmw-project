const mongoose = require('mongoose');
const { Schema } = mongoose;

const driverLicenseSchema = new Schema({
  frontSide: {
    public_id: { type: String, required: true },
    url: { type: String, required: true }
  },
  backSide: {
    public_id: { type: String, required: true },
    url: { type: String, required: true }
  },
  selfie: {
    public_id: { type: String, required: true },
    url: { type: String, required: true }
  },
  driverLicenseNumber: { type: String, required: true },
  expirationDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > Date.now();
      },
      message: 'Expiration date must be a future date'
    }
  },
  isApproved: {
    type: Boolean,
    default: false
  }
});

const userInfoSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  contactNo: [{
    type: String,
    validate: {
      validator: function(value) {
        return /^\d{1,15}$/.test(value);
      },
      message: 'Contact number must be numeric and cannot exceed 15 characters'
    }
  }],
  dateOfBirth: Date,
  address: String,
  facebookUrl: {
    type: String,
    validate: {
      validator: function(value) {
        const urlPattern = /^(https?:\/\/)?((www\.)?facebook\.com|fb\.com)\/.*/i;
        return urlPattern.test(value);
      },
      message: 'Invalid Facebook URL'
    }
  },
  driverLicense: driverLicenseSchema,
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('UserInfo', userInfoSchema);
