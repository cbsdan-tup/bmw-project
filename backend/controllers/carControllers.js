const Cars = require("../models/Cars");
const cloudinary = require("cloudinary");
const Rental = require("../models/Rental");
const FavoriteCar = require("../models/FavoriteCar");
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

    // Parse existingImages and removedImageIds if they exist
    let existingImages = [];
    let removedImageIds = [];

    try {
      if (req.body.existingImages) {
        existingImages = JSON.parse(req.body.existingImages);
      }
      if (req.body.removedImageIds) {
        removedImageIds = JSON.parse(req.body.removedImageIds);
      }
    } catch (error) {
      console.error("Error parsing JSON fields:", error);
    }

    // Handle image updates
    let finalImages = [];

    // 1. Keep existing images that aren't being removed
    if (existingImages.length > 0) {
      // Filter current car images to find ones that match the existingImages URLs
      const keptImages = car.images.filter((img) => {
        const imgUrl = typeof img.url === "string" ? img.url : img.url;
        return existingImages.includes(imgUrl);
      });

      finalImages = [...keptImages];
    }

    // 2. Delete only specific images if removedImageIds is provided
    if (removedImageIds.length > 0) {
      // Delete specified images from cloudinary
      for (let publicId of removedImageIds) {
        try {
          await cloudinary.v2.uploader.destroy(publicId);
          console.log(`Deleted image with public_id: ${publicId}`);
        } catch (error) {
          console.error(`Failed to delete image ${publicId}:`, error);
        }
      }
    }

    // 3. Add new uploaded images
    if (req.files && req.files.length > 0) {
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
      finalImages = [...finalImages, ...imagesLinks];
    }

    // Only update images if we have final images or they were modified
    if (
      finalImages.length > 0 ||
      removedImageIds.length > 0 ||
      (req.files && req.files.length > 0)
    ) {
      updateData.images = finalImages;
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

    // Check if the car is currently on rental
    const activeRental = rentals.find((rental) =>
      ["Pending", "Active", "Confirmed"].includes(rental.status)
    );

    const isOnRental = activeRental ? true : false;

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
        isOnRental,
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
          brand: { $first: "$brand" },
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

exports.searchAndFilterCars = async (req, res) => {
  try {
    const {
      pickUpLocation,
      minPricePerDay,
      maxPricePerDay,
      year,
      brand,
      transmission,
      rating,
      query,
    } = req.query;

    console.log("Query Parameters:", req.query);

    // Start by building the aggregation pipeline
    let aggregatePipeline = [
      {
        $match: {
          isActive: true,
        },
      },
    ];

    // Search across multiple fields if query parameter exists
    if (query) {
      const searchRegex = new RegExp(query, "i");
      aggregatePipeline.push({
        $match: {
          $or: [
            { brand: { $regex: searchRegex } },
            { model: { $regex: searchRegex } },
            { pickUpLocation: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            { vehicleType: { $regex: searchRegex } },
            { fuel: { $regex: searchRegex } },
          ],
        },
      });
    }

    // Apply filters directly in the aggregation pipeline
    if (pickUpLocation) {
      aggregatePipeline.push({
        $match: {
          pickUpLocation: { $regex: new RegExp(pickUpLocation, "i") },
        },
      });
    }

    if (brand) {
      aggregatePipeline.push({
        $match: {
          brand: { $regex: new RegExp(brand, "i") },
        },
      });
    }

    if (transmission) {
      aggregatePipeline.push({
        $match: {
          transmission: { $regex: new RegExp(transmission, "i") },
        },
      });
    }

    // Handle price range filtering
    if (minPricePerDay || maxPricePerDay) {
      const priceMatch = {};

      if (minPricePerDay) {
        priceMatch.$gte = Number(minPricePerDay);
      }

      if (maxPricePerDay) {
        priceMatch.$lte = Number(maxPricePerDay);
      }

      if (Object.keys(priceMatch).length > 0) {
        aggregatePipeline.push({
          $match: {
            pricePerDay: priceMatch,
          },
        });
      }
    }

    if (year) {
      aggregatePipeline.push({
        $match: {
          year: { $lte: Number(year) },
        },
      });
    }

    // Rest of the aggregation pipeline
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
        $lookup: {
          from: "reviews",
          let: { rentalIds: "$rentals._id" },
          pipeline: [
            { $match: { $expr: { $in: ["$rental", "$$rentalIds"] } } },
          ],
          as: "reviews",
        },
      },
      {
        $group: {
          _id: "$_id",
          brand: { $first: "$brand" },
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
          reviews: { $first: "$reviews" },
          totalRating: { $sum: { $sum: "$reviews.rating" } },
          reviewCount: { $first: { $size: "$reviews" } },
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: ["$reviewCount", 0] },
              then: {
                $round: [{ $divide: ["$totalRating", "$reviewCount"] }, 1],
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
          averageRating: { $gte: Number(rating) },
        },
      });
    }

    const cars = await Cars.aggregate(aggregatePipeline);

    const carsWithImages = cars.map((car) => {
      return {
        ...car,
        images: Array.isArray(car.images)
          ? car.images.map((image) => image.url)
          : [],
        averageRating: car.averageRating || 0,
        reviewCount: car.reviewCount || 0,
      };
    });

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
    const allActiveCars = await Cars.find({
      isActive: true,
    }).limit(20);

    if (!allActiveCars || allActiveCars.length === 0) {
      return res.status(200).json({
        success: true,
        cars: [],
        message: "No featured cars found",
      });
    }

    const availableCars = [];

    for (const car of allActiveCars) {
      const activeRentals = await Rental.find({
        car: car._id,
        status: { $in: ["Pending", "Confirmed", "Active"] },
      });

      // Only include cars with no active rentals
      if (activeRentals.length === 0) {
        availableCars.push(car);
      }
    }

    // Limit to 20 available cars
    const featuredCars = availableCars.slice(0, 20);

    if (featuredCars.length === 0) {
      return res.status(200).json({
        success: true,
        cars: [],
        message: "No available featured cars found",
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
    console.error("Error fetching featured cars:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getUserCarsWithActiveRentals = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching cars with active rentals for user:", userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find all cars owned by the user
    const userCars = await Cars.find({ owner: userId });
    console.log(`Found ${userCars.length} cars owned by user`);

    if (!userCars.length) {
      return res.status(200).json({
        success: true,
        activeRentedCars: [],
        message: "No cars found for this user",
      });
    }

    // Get the car IDs
    const carIds = userCars.map((car) => car._id);

    // Find active rentals for these cars with proper error handling
    let activeRentals = [];
    try {
      activeRentals = await Rental.find({
        car: { $in: carIds },
        status: { $in: ["Pending", "Confirmed", "Active"] },
      }).populate(
        "renter",
        "firstName lastName email phone profileImage location"
      ); // Updated fields for better renter details

      console.log(
        `Found ${activeRentals.length} active rentals for user's cars`
      );
    } catch (rentalError) {
      console.error("Error fetching rentals:", rentalError);
      return res.status(500).json({
        success: false,
        message: "Error fetching rental information",
        error: rentalError.message,
      });
    }

    if (!activeRentals.length) {
      return res.status(200).json({
        success: true,
        activeRentedCars: [],
        message: "No active rentals found for user's cars",
      });
    }

    // Build response with cars and their active rentals
    const activeRentedCars = [];

    for (const car of userCars) {
      try {
        const rentalsForThisCar = activeRentals.filter(
          (rental) => rental.car && rental.car.toString() === car._id.toString()
        );

        if (rentalsForThisCar.length > 0) {
          // Format car data with rentals
          // Safely handle images transformation
          const images = car.images
            ? car.images
                .map((img) => {
                  if (!img) return null;
                  return typeof img === "string" ? img : img.url || null;
                })
                .filter((img) => img)
            : [];

          const carWithRentals = {
            ...car.toObject(),
            images: images,
            activeRentals: rentalsForThisCar.map((rental) => ({
              ...rental.toObject(),
              renter: rental.renter || { name: "Unknown", email: "" }, // Changed from rental.user to rental.renter
            })),
          };

          activeRentedCars.push(carWithRentals);
        }
      } catch (carError) {
        console.error(`Error processing car ${car._id}:`, carError);
        // Continue processing other cars instead of failing completely
      }
    }

    console.log(
      `Returning ${activeRentedCars.length} cars with active rentals`
    );

    return res.status(200).json({
      success: true,
      activeRentedCars,
    });
  } catch (error) {
    console.error("Error fetching user's cars with active rentals:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getUserCompletedRentals = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching cars with completed rentals for user:", userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find all cars owned by the user
    const userCars = await Cars.find({ owner: userId });
    console.log(`Found ${userCars.length} cars owned by user`);

    if (!userCars.length) {
      return res.status(200).json({
        success: true,
        completedRentedCars: [],
        message: "No cars found for this user",
      });
    }

    // Get the car IDs
    const carIds = userCars.map((car) => car._id);

    // Find completed rentals for these cars with proper error handling
    let completedRentals = [];
    try {
      completedRentals = await Rental.find({
        car: { $in: carIds },
        status: "Returned", // Only returned rentals
      }).populate(
        "renter",
        "firstName lastName email phone profileImage location"
      );

      console.log(
        `Found ${completedRentals.length} completed rentals for user's cars`
      );
    } catch (rentalError) {
      console.error("Error fetching rentals:", rentalError);
      return res.status(500).json({
        success: false,
        message: "Error fetching rental information",
        error: rentalError.message,
      });
    }

    if (!completedRentals.length) {
      return res.status(200).json({
        success: true,
        completedRentedCars: [],
        message: "No completed rentals found for user's cars",
      });
    }

    // Build response with cars and their completed rentals
    const completedRentedCars = [];

    for (const car of userCars) {
      try {
        const rentalsForThisCar = completedRentals.filter(
          (rental) => rental.car && rental.car.toString() === car._id.toString()
        );

        if (rentalsForThisCar.length > 0) {
          // Format car data with rentals
          // Safely handle images transformation
          const images = car.images
            ? car.images
                .map((img) => {
                  if (!img) return null;
                  return typeof img === "string" ? img : img.url || null;
                })
                .filter((img) => img)
            : [];

          const carWithRentals = {
            ...car.toObject(),
            images: images,
            completedRentals: rentalsForThisCar.map((rental) => ({
              ...rental.toObject(),
              renter: rental.renter || { name: "Unknown", email: "" },
            })),
          };

          completedRentedCars.push(carWithRentals);
        }
      } catch (carError) {
        console.error(`Error processing car ${car._id}:`, carError);
        // Continue processing other cars instead of failing completely
      }
    }

    console.log(
      `Returning ${completedRentedCars.length} cars with completed rentals`
    );

    return res.status(200).json({
      success: true,
      completedRentedCars,
    });
  } catch (error) {
    console.error("Error fetching user's cars with completed rentals:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

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

    // First find the car to check ownership
    const existingCar = await Cars.findById(id);
    
    if (!existingCar) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Verify ownership
    if (existingCar.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this car status'
      });
    }

    const car = await Cars.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email');

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
