const Cars = require("../models/Cars");
const cloudinary = require("cloudinary");
const Rental = require("../models/Rental");
const FavoriteCar = require("../models/FavoriteCar");
const APIFeatures = require("../utils/apiFeatures");
const Reviews = require("../models/Review");

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

    // Data validation
    const numericFields = ["year", "seatCapacity", "pricePerDay"];
    for (const field of numericFields) {
      req.body[field] = Number(req.body[field]);
      if (isNaN(req.body[field])) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field}: must be a number`,
        });
      }
    }

    const carData = {
      ...req.body,
      images: imagesLinks,
      isActive: true,
      isAutoApproved: req.body.isAutoApproved || false,
    };

    const car = await Cars.create(carData);

    return res.status(201).json({
      success: true,
      message: "Car created successfully!",
      car,
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

exports.getAllCars = async (req, res) => {
  try {
    const cars = await Cars.find();

    const carsWithImages = cars.map((car) => {
      return {
        ...car.toObject(),
        images: car.images.map((image) => image.url),
      };
    });

    res.status(200).json(carsWithImages);
  } catch (error) {
    console.error("Error fetching cars:", error);
    res
      .status(500)
      .json({ message: "Error fetching cars", error: error.message });
  }
};

exports.deleteCar = async (req, res) => {
  try {
    const car = await Cars.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    // Verify ownership
    if (car.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this car",
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
      car.deleteOne(),
    ]);

    res.status(200).json({
      success: true,
      message: "Car and associated data deleted successfully",
      deletedCarId: car._id, // Add this line to return the deleted car ID
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateCar = async (req, res) => {
  try {
    let car = await Cars.findById(req.params.id);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    // Verify ownership and convert ObjectId to string for comparison
    if (car.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this car",
      });
    }

    // Create update object and ensure owner field is properly handled
    const updateData = { ...req.body };
    delete updateData.owner; // Remove owner from update data to prevent modification

    // Handle image updates only if new images are provided
    if (req.files && req.files.length > 0) {
      // Delete old images from cloudinary
      for (let image of car.images) {
        await cloudinary.v2.uploader.destroy(image.public_id);
      }

      // Upload new images
      let imagesLinks = [];
      for (let file of req.files) {
        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: "Cars",
          width: 1024,
          crop: "scale",
        });
        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }
      updateData.images = imagesLinks;
    }

    // Update numeric fields
    ["year", "seatCapacity", "displacement", "mileage", "pricePerDay"].forEach(
      (field) => {
        if (updateData[field]) {
          updateData[field] = Number(updateData[field]);
        }
      }
    );

    // Update the car with sanitized data
    car = await Cars.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Car updated successfully",
      car,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getSingleCar = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await Cars.findById(id).populate("owner");

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    // Fetch all rentals for this car
    const rentals = await Rental.find({ car: id });

    // Get all rental IDs
    const rentalIds = rentals.map((rental) => rental._id);

    // Fetch all reviews for these rentals
    const reviews = await Reviews.find({ rental: { $in: rentalIds } });

    // Calculate average rating and review count
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? Number(
            (
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviewCount
            ).toFixed(1)
          )
        : 0;

    const {
      _id,
      model,
      brand,
      year,
      seatCapacity,
      fuel,
      mileage,
      transmission,
      displacement,
      vehicleType,
      pricePerDay,
      isAutoApproved,
      description,
      termsAndConditions,
      pickUpLocation,
      owner,
      images,
    } = car;

    return res.status(200).json({
      success: true,
      car: {
        _id,
        model,
        brand,
        year,
        seatCapacity,
        fuel,
        mileage,
        transmission,
        displacement,
        vehicleType,
        pricePerDay,
        isAutoApproved,
        description,
        termsAndConditions,
        pickUpLocation,
        owner,
        images,
        averageRating,
        reviewCount,
      },
    });
  } catch (error) {
    console.error("Error fetching car details:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getCarsByUserId = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const cars = await Cars.find({ owner: req.params.userId })
      .populate("owner", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCars = await Cars.countDocuments({ owner: req.params.userId });

    if (!cars.length) {
      return res.status(200).json({
        success: true,
        cars: [],
        totalCars: 0,
        currentPage: page,
        totalPages: 0,
      });
    }

    const carsWithDetails = await Promise.all(
      cars.map(async (car) => {
        const rentals = await Rental.find({ car: car._id });
        const rentalIds = rentals.map((rental) => rental._id);
        const reviews = await Reviews.find({ rental: { $in: rentalIds } });

        // Ensure images are properly formatted
        const formattedImages = car.images.map((img) =>
          typeof img === "string" ? img : img.url
        );

        return {
          ...car.toObject(),
          images: formattedImages,
          averageRating:
            reviews.length > 0
              ? Number(
                  (
                    reviews.reduce((sum, review) => sum + review.rating, 0) /
                    reviews.length
                  ).toFixed(1)
                )
              : 0,
          reviewCount: reviews.length,
        };
      })
    );

    res.status(200).json({
      success: true,
      cars: carsWithDetails,
      totalCars,
      currentPage: page,
      totalPages: Math.ceil(totalCars / limit),
    });
  } catch (error) {
    console.error("Error in getCarsByUserId:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cars",
      error: error.message,
    });
  }
};

exports.getAllCarsInfinite = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const resPerPage = parseInt(req.query.resPerPage) || 10;
    const skip = (page - 1) * resPerPage;

    const cars = await Cars.find({ isActive: true })
      .populate("owner")
      .skip(skip)
      .limit(resPerPage);

    const carsWithImages = cars.map((car) => {
      return {
        ...car.toObject(),
        images: car.images.map((image) => image.url),
      };
    });

    const totalCars = await Cars.countDocuments();
    const totalPages = Math.ceil(totalCars / resPerPage);

    res.status(200).json({
      cars: carsWithImages,
      currentPage: page,
      totalCars,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    res
      .status(500)
      .json({ message: "Error fetching cars", error: error.message });
  }
};

exports.filterCars = async (req, res) => {
  try {
    const { pickUpLocation, pricePerDay, year, brand, transmission, rating } =
      req.query;
    console.log("Query Parameters:", req.query);

    // Start by building the aggregation pipeline
    let aggregatePipeline = [
      {
        $match: {
          isActive: true,
        },
      },
    ];

    // Apply filters directly in the aggregation pipeline
    if (pickUpLocation) {
      aggregatePipeline.push({
        $match: {
          pickUpLocation: { $regex: new RegExp(pickUpLocation, "i") },
        },
      });
      console.log("Filter Applied for pickUpLocation:", pickUpLocation);
    }

    if (brand) {
      aggregatePipeline.push({
        $match: {
          brand: { $regex: new RegExp(brand, "i") },
        },
      });
      console.log("Filter Applied for brand:", brand);
    }

    if (transmission) {
      aggregatePipeline.push({
        $match: {
          transmission: { $regex: new RegExp(transmission, "i") },
        },
      });
      console.log("Filter Applied for transmission:", transmission);
    }

    if (pricePerDay) {
      aggregatePipeline.push({
        $match: {
          pricePerDay: { $lte: Number(pricePerDay) },
        },
      });
      console.log("Filter Applied for pricePerDay:", pricePerDay);
    }

    if (year) {
      aggregatePipeline.push({
        $match: {
          year: { $lte: Number(year) },
        },
      });
      console.log("Filter Applied for year <=:", year);
    }

    aggregatePipeline.push(
      {
        $lookup: {
          from: "rentals",
          localField: "_id",
          foreignField: "car",
          as: "rentals",
        },
      },
      {
        $unwind: {
          path: "$rentals",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "rentals._id",
          foreignField: "rental",
          as: "reviews",
        },
      },
      {
        $unwind: {
          path: "$reviews",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          make: { $first: "$make" },
          model: { $first: "$model" },
          transmission: { $first: "$transmission" },
          pricePerDay: { $first: "$pricePerDay" },
          year: { $first: "$year" },
          seatCapacity: { $first: "$seatCapacity" },
          fuel: { $first: "$fuel" },
          displacement: { $first: "$displacement" },
          mileage: { $first: "$mileage" },
          description: { $first: "$description" },
          pickUpLocation: { $first: "$pickUpLocation" },
          termsAndConditions: { $first: "$termsAndConditions" },
          vehicleType: { $first: "$vehicleType" },
          images: { $first: "$images" },
          rentalCount: { $sum: 1 },
          totalRating: { $sum: "$reviews.rating" },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: ["$reviewCount", 0] },
              then: {
                $round: [{ $divide: ["$totalRating", "$reviewCount"] }, 0],
              },
              else: 0,
            },
          },
          images: { $ifNull: ["$images", []] },
        },
      }
    );

    if (rating) {
      aggregatePipeline.push({
        $match: {
          averageRating: { $eq: Number(rating) },
        },
      });
      console.log("Filter Applied for exact rating =", rating);
    }

    console.log("Aggregation Pipeline:", aggregatePipeline);

    const cars = await Cars.aggregate(aggregatePipeline);

    console.log("Cars after aggregation:", cars);

    const carsWithImages = cars.map((car) => {
      console.log("Car with average rating and images:", car);
      return {
        ...car,
        images: Array.isArray(car.images)
          ? car.images.map((image) => image.url)
          : [],
        averageRating: car.averageRating || 0,
        reviewCount: car.reviewCount || 0,
      };
    });

    console.log("Filtered Cars with Images:", carsWithImages);

    console.log(carsWithImages);

    res.status(200).json({
      success: true,
      count: carsWithImages.length,
      cars: carsWithImages,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCarAvailability = async (req, res) => {
  try {
    const carCounts = await Cars.aggregate([
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 },
        },
      },
    ]);

    const data = carCounts.map((item) => ({
      category: item._id,
      count: item.count,
    }));

    res.status(200).json({ success: true, availability: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeaturedCars = async (req, res) => {
  try {
    const featuredCars = await Cars.find({
      isActive: true,
    }).limit(20);

    if (!featuredCars || featuredCars.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No featured cars found",
      });
    }

    // Get cars with ratings
    const carsWithRatings = await Promise.all(
      featuredCars.map(async (car) => {
        const rentals = await Rental.find({ car: car._id });

        const rentalIds = rentals.map((rental) => rental._id);

        const reviews = await Reviews.find({ rental: { $in: rentalIds } });

        const reviewCount = reviews.length;
        const averageRating =
          reviewCount > 0
            ? Number(
                (
                  reviews.reduce((sum, review) => sum + review.rating, 0) /
                  reviewCount
                ).toFixed(1)
              )
            : 0;

        return {
          ...car.toObject(),
          images: car.images.map((image) => image.url),
          averageRating,
          reviewCount,
        };
      })
    );

    // Sort cars by average rating (highest first)
    const sortedCars = carsWithRatings.sort(
      (a, b) => b.averageRating - a.averageRating
    );

    // Limit to 10 cars after sorting by rating
    const topRatedCars = sortedCars.slice(0, 10);

    return res.status(200).json({
      success: true,
      cars: topRatedCars,
    });
  } catch (error) {
    // ...existing code...
    console.error("Error fetching featured cars:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
