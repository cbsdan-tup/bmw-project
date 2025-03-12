const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  rental: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Rental', 
    required: true 
  },
  renter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    maxlength: 255, 
    required: true 
  },
  images: [{
    public_id: { 
      type: String 
    },
    url: { 
      type: String 
    }
  }],
  createdAt: { 
    type: Date, 
    default: Date.now, 
    required: true 
  }
});

reviewSchema.index({ rental: 1, renter: 1 }, { unique: true});
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
