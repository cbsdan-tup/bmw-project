const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cars',
    required: true,
  },
  maintenanceDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 255,
  },
  cost: {
    type: Number,
    required: true,
  },
  images: [
    {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const MaintenanceRecord = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);


module.exports = MaintenanceRecord;
