const mongoose = require('mongoose');

const favoriteCarSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cars',
    required: true
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  }
});

favoriteCarSchema.index({ user: 1, car: 1 }, { unique: true});

const FavoriteCar = mongoose.model('FavoriteCar', favoriteCarSchema);

module.exports = FavoriteCar;
