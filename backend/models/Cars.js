const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    required: [true, 'isActive field is required']
  },
  images: [
    {
      public_id: {
        type: String,
        required: [true, 'Image public_id is required']
      },
      url: {
        type: String,
        required: [true, 'Image URL is required']
      }
    }
  ],
  isAutoApproved: {
    type: Boolean,
    required: [true, 'isAutoApproved field is required']
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required']
  },
  vehicleType: {
    type: String,
    enum: {
      values: ['Sedan', 'SUV', 'Sport Car'],
      message: '{VALUE} is not a valid vehicle type'
    },
    required: [true, 'Vehicle type is required']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required']
  },
  year: {
    type: Number,
    min: [2009, 'Year must be at least 2009'],
    max: [new Date().getFullYear(), `Year cannot be later than ${new Date().getFullYear()}`],
    required: [true, 'Year is required']
  },
  model: {
    type: String,
    required: [true, 'Model is required']
  },
  seatCapacity: {
    type: Number,
    required: [true, 'Seat capacity is required']
  },
  transmission: {
    type: String,
    enum: {
      values: ['Manual', 'Automatic'],
      message: '{VALUE} is not a valid transmission type'
    },
    required: [true, 'Transmission is required']
  },
  fuel: {
    type: String,
    enum: {
      values: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plugin Hybrid'],
      message: '{VALUE} is not a valid fuel type'
    },
    required: [true, 'Fuel type is required']
  },
  displacement: {
    type: Number,
    min: [1, 'Displacement must be at least 1'],
    required: [true, 'Displacement is required']
  },
  mileage: {
    type: Number,
    min: [1, 'Mileage must be at least 1'],
    required: [true, 'Mileage is required']
  },
  description: {
    type: String,
    maxlength: [255, 'Description cannot exceed 255 characters']
  },
  termsAndConditions: {
    type: String,
    maxlength: [255, 'Terms and conditions cannot exceed 255 characters']
  },
  pickUpLocation: {
    type: String,
    maxlength: [255, 'Pickup location cannot exceed 255 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Cars', carSchema);
