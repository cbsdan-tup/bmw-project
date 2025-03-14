const FavoriteCar = require("../models/FavoriteCar");
const mongoose = require("mongoose");
const Rental = require("../models/Rental");
const Review = require("../models/Review");

const createFavoriteCar = async (req, res) => {
  try {
    const { user, car } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(user) ||
      !mongoose.Types.ObjectId.isValid(car)
    ) {
      return res.status(400).json({ message: "Invalid user ID or car ID" });
    }

    // Check if the car is already in the user's favorites
    const existingFavoriteCar = await FavoriteCar.findOne({ user, car });

    if (existingFavoriteCar) {
      // If the car is already a favorite, delete it
      await FavoriteCar.deleteOne({ user, car });
      return res
        .status(200)

        .json({ message: "Favorite car removed successfully", favoriteCar: existingFavoriteCar });
    }

    // If the car is not a favorite, add it to the favorites
    const favoriteCar = new FavoriteCar({ user, car });
    const validationError = favoriteCar.validateSync();
    if (validationError) {
      const errorMessages = Object.values(validationError.errors).map(
        (error) => error.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errorMessages,
      });
    }

    await favoriteCar.save();
    res
      .status(201)
      .json({ message: "Favorite car added successfully", favoriteCar });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      return res
        .status(400)
        .json({ message: "You already have this car on your favorites." });
    }
    if (err.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", error: err.message });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getFavoriteCars = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const favoriteCars = await FavoriteCar.find({ user: userId }).populate("car");
    
    const enhancedFavoriteCars = await Promise.all(
      favoriteCars.map(async (favCar) => {
        const rentals = await Rental.find({ car: favCar.car._id });
        
        const rentalIds = rentals.map(rental => rental._id);
        
        const reviews = await Review.find({ rental: { $in: rentalIds } });
        
        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0 
          ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1))
          : 0;
          
        const carObj = favCar.car.toObject();
        carObj.reviewCount = reviewCount;
        carObj.averageRating = averageRating;
        
        return {
          ...favCar.toObject(),
          car: carObj
        };
      })
    );
    
    res.status(200).json({ 
      success: true,
      message: "Favorite cars retrieved successfully", 
      favoriteCars: enhancedFavoriteCars 
    });
  } catch (err) {
    console.error('Error fetching favorite cars:', err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

const deleteFavoriteCar = async (req, res) => {
  try {
    const { favoriteCarId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(favoriteCarId)) {
      return res.status(400).json({ message: "Invalid favorite car ID" });
    }

    const favoriteCar = await FavoriteCar.findByIdAndDelete(favoriteCarId);
    if (!favoriteCar) {
      return res.status(404).json({ message: "Favorite car not found" });
    }
    res.status(200).json({ message: "Favorite car deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createFavoriteCar,
  getFavoriteCars,
  deleteFavoriteCar,
};
