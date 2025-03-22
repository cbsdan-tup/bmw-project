const Cars = require("../models/Cars");
const cloudinary = require("cloudinary");
const Rental = require("../models/Rental");
const FavoriteCar = require("../models/FavoriteCar");
const Reviews = require("../models/Review");

// Get all cars with pagination and search
exports.getAllCars = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Create search query
    const searchQuery = search ? {
      $or: [
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { pickUpLocation: { $regex: search, $options: 'i' } },
        { vehicleType: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Fetch cars with pagination
    const cars = await Cars.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'firstName lastName email');

    // Count total cars matching the search
    const totalCars = await Cars.countDocuments(searchQuery);

    // Process car data to include needed information
    const processedCars = await Promise.all(cars.map(async (car) => {
      // Get rentals for this car
      const rentals = await Rental.find({ car: car._id });
      const rentalIds = rentals.map(rental => rental._id);

      // Get reviews for these rentals
      const reviews = await Reviews.find({ rental: { $in: rentalIds } });
      
      // Calculate average rating
      const reviewCount = reviews.length;
      const averageRating = reviewCount > 0
        ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1))
        : 0;

      return {
        ...car.toObject(),
        images: car.images.map(img => img.url),
        averageRating,
        reviewCount,
        activeRentals: rentals.filter(r => 
          ["Pending", "Confirmed", "Active"].includes(r.status)
        ).length
      };
    }));

    res.status(200).json({
      success: true,
      cars: processedCars,
      currentPage: page,
      totalPages: Math.ceil(totalCars / limit),
      totalCars,
      limit
    });
  } catch (error) {
    console.error('Error in getAllCars:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create new car
exports.createCar = async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = [
      "model",
      "brand",
      "year",
      "seatCapacity",
      "fuel",
      "mileage",
      "transmission",
      "displacement",
      "vehicleType",
      "pricePerDay",
      "pickUpLocation",
      "owner",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Image validation with better error handling
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one image",
      });
    }

    let imagesLinks = [];
    try {
      for (let file of req.files) {
        if (!file.path) {
          throw new Error("Invalid file upload");
        }

        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: "Cars",
          width: 1024,
          crop: "scale",
          timeout: 60000, // 60 seconds timeout
        });

        if (!result || !result.secure_url) {
          throw new Error("Failed to upload image to Cloudinary");
        }

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }
    } catch (uploadError) {
      // Cleanup any uploaded images if there's an error
      await Promise.all(
        imagesLinks.map((img) =>
          cloudinary.v2.uploader
            .destroy(img.public_id)
            .catch((err) => console.error("Cleanup error:", err))
        )
      );

      return res.status(500).json({
        success: false,
        message: "Image upload failed: " + uploadError.message,
      });
    }

    // Data validation and conversion for numeric fields
    const numericFields = ["year", "seatCapacity", "displacement", "mileage", "pricePerDay"];
    for (const field of numericFields) {
      if (req.body[field]) {
        req.body[field] = Number(req.body[field]);
        if (isNaN(req.body[field])) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field}: must be a number`,
          });
        }
      }
    }

    // Convert boolean fields
    req.body.isActive = req.body.isActive === 'true' || req.body.isActive === true;
    req.body.isAutoApproved = req.body.isAutoApproved === 'true' || req.body.isAutoApproved === true;

    const carData = {
      ...req.body,
      images: imagesLinks,
    };

    const car = await Cars.create(carData);
    
    // Populate owner info for the response
    const populatedCar = await Cars.findById(car._id)
      .populate('owner', 'firstName lastName email');

    // Format for response
    const formattedCar = {
      ...populatedCar.toObject(),
      images: populatedCar.images.map(img => img.url)
    };

    return res.status(201).json({
      success: true,
      message: "Car created successfully!",
      car: formattedCar,
    });
  } catch (err) {
    // Log the full error for debugging
    console.error("Car creation error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create car: " + (err.message || "Unknown error"),
    });
  }
};

// Update car status (active/inactive)
exports.updateCarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || isActive === null) {
      return res.status(400).json({
        success: false,
        message: 'isActive field is required'
      });
    }

    const car = await Cars.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Format the response
    const formattedCar = {
      ...car.toObject(),
      images: car.images.map(img => img.url)
    };

    res.status(200).json({
      success: true,
      message: `Car ${isActive ? 'activated' : 'deactivated'} successfully`,
      car: formattedCar
    });
  } catch (error) {
    console.error('Error updating car status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Admin delete car - overrides ownership check
exports.deleteCar = async (req, res) => {
  try {
    const car = await Cars.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Delete images from cloudinary
    for (let image of car.images) {
      await cloudinary.v2.uploader.destroy(image.public_id);
    }

    // Delete associated records
    await Promise.all([
      FavoriteCar.deleteMany({ carId: car._id }),
      Rental.deleteMany({ car: car._id }),
      car.deleteOne()
    ]);

    res.status(200).json({
      success: true,
      message: 'Car and associated data deleted successfully',
      deletedCarId: car._id
    });
  } catch (error) {
    console.error('Error deleting car:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get car by ID
exports.getCarById = async (req, res) => {
  try {
    const car = await Cars.findById(req.params.id)
      .populate('owner', 'firstName lastName email');
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Format the car details
    const formattedCar = {
      ...car.toObject(),
      images: car.images.map(img => ({
        public_id: img.public_id,
        url: img.url
      }))
    };

    res.status(200).json({
      success: true,
      car: formattedCar
    });
  } catch (error) {
    console.error('Error fetching car by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update car details
exports.updateCar = async (req, res) => {
  try {
    const car = await Cars.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }
    
    // Process the update data
    const updateData = { ...req.body };
    
    // Convert string numbers to actual numbers
    ['year', 'seatCapacity', 'displacement', 'mileage', 'pricePerDay'].forEach(
      (field) => {
        if (updateData[field]) {
          updateData[field] = Number(updateData[field]);
        }
      }
    );
    
    // Handle image deletion if specified
    const imagesToDelete = req.body.imagesToDelete;
    if (imagesToDelete && Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
      // Filter out images that should be deleted
      car.images = car.images.filter(img => !imagesToDelete.includes(img.public_id));
      
      // Delete from cloudinary
      for (const publicId of imagesToDelete) {
        await cloudinary.v2.uploader.destroy(publicId);
      }
    }
    
    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      let newImages = [];
      
      for (let file of req.files) {
        if (!file.path) {
          continue;
        }
        
        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: "Cars",
          width: 1024,
          crop: "scale",
          timeout: 60000,
        });
        
        if (result && result.secure_url) {
          newImages.push({
            public_id: result.public_id,
            url: result.secure_url,
          });
        }
      }
      
      // Add new images to existing ones
      car.images = [...car.images, ...newImages];
    }
    
    // Save image changes
    await car.save();
    
    // Update other car details
    const updatedCar = await Cars.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');
    
    // Format the response
    const formattedCar = {
      ...updatedCar.toObject(),
      images: updatedCar.images.map(img => img.url)
    };
    
    res.status(200).json({
      success: true,
      message: 'Car updated successfully',
      car: formattedCar
    });
  } catch (error) {
    console.error('Error updating car:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get car rentals
exports.getCarRentals = async (req, res) => {
  try {
    const car = await Cars.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }
    
    // Find all rentals for this car with user and review details
    const rentals = await Rental.find({ car: req.params.id })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email avatar')
      .lean();
    
    // Add review data for each rental
    const rentalIds = rentals.map(rental => rental._id);
    const reviews = await Reviews.find({ rental: { $in: rentalIds } }).lean();
    
    // Map reviews to rentals
    const rentalsWithReviews = rentals.map(rental => {
      const rentalReview = reviews.find(review => 
        review.rental.toString() === rental._id.toString()
      );
      
      return {
        ...rental,
        review: rentalReview || null
      };
    });

    res.status(200).json({
      success: true,
      rentals: rentalsWithReviews
    });
  } catch (error) {
    console.error('Error fetching car rentals:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get car statistics for admin dashboard
exports.getCarStatistics = async (req, res) => {
  try {
    // Get total cars count
    const totalCars = await Cars.countDocuments();
    
    // Get active cars count
    const activeCars = await Cars.countDocuments({ isActive: true });
    
    // Get cars by vehicle type
    const carsByType = await Cars.aggregate([
      {
        $group: {
          _id: '$vehicleType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Get cars by brand
    const carsByBrand = await Cars.aggregate([
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get cars with active rentals
    const carsWithActiveRentals = await Rental.aggregate([
      {
        $match: {
          status: { $in: ['Pending', 'Confirmed', 'Active'] }
        }
      },
      {
        $group: {
          _id: '$car',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      statistics: {
        totalCars,
        activeCars,
        inactiveCars: totalCars - activeCars,
        carsByType,
        carsByBrand,
        carsInUse: carsWithActiveRentals.length
      }
    });
  } catch (error) {
    console.error('Error getting car statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
