const Cars = require("../models/Cars");
const cloudinary = require("cloudinary");
const Rental = require("../models/Rental");
const FavoriteCar = require("../models/FavoriteCar");
const APIFeatures = require("../utils/apiFeatures");
const Reviews = require('../models/Review');

exports.createCar = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images uploaded.",
      });
    }

    let imagesLinks = [];

    for (let file of req.files) {
      try {
        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: "Cars",
          width: 1024,
          crop: "scale",
        });

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      } catch (error) {
        console.log("Error uploading to Cloudinary:", error);
        return res.status(500).json({
          success: false,
          message: "Error uploading images to Cloudinary",
          error: error.message,
        });
      }
    }

    req.body.images = imagesLinks;

    const {
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
      isActive,
    } = req.body;

    const carData = {
      images: imagesLinks,
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
      isActive,
    };

    const car = await Cars.create(carData);

    res.status(201).json({
      success: true,
      message: "Car created successfully!",
      car,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error creating car",
      error: err.message,
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
    const carId = req.params.id;
    const deletedCar = await Cars.findByIdAndDelete(carId);

    if (!deletedCar) {
      return res.status(404).json({ message: "Car not found" });
    }

    await FavoriteCar.deleteMany({ carId });

    await Rental.deleteMany({ carId });

    res.status(200).json({ message: "Car deleted successfully", deletedCar });
  } catch (error) {
    console.error("Error deleting car:", error);
    res
      .status(500)
      .json({ message: "Error deleting car", error: error.message });
  }
};

exports.updateCar = async (req, res, next) => {
  try {
    console.log(req.body);
    console.log(req.files);

    let car = await Cars.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < car.images.length; i++) {
        await cloudinary.v2.uploader.destroy(car.images[i].public_id);
      }

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

      req.body.images = imagesLinks;
    }

    car = await Cars.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    return res.status(200).json({
      success: true,
      car,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating car",
      error: err.message,
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
    const { userId } = req.params;

    const cars = await Cars.find({ owner: userId }).populate("owner");

    if (!cars || cars.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cars found for this user",
      });
    }

    const carsWithImages = cars.map((car) => ({
      ...car.toObject(),
      images: car.images.map((image) => image.url),
    }));

    return res.status(200).json({
      success: true,
      cars: carsWithImages,
    });
  } catch (error) {
    console.error("Error fetching cars by user ID:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getAllCarsInfinite = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const resPerPage = parseInt(req.query.resPerPage) || 10; 
    const skip = (page - 1) * resPerPage;

    const cars = await Cars.find({isActive: true}).populate("owner").skip(skip).limit(resPerPage);

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
      };
    });

    console.log("Filtered Cars with Images:", carsWithImages);

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
                  count: { $sum: 1 }
              }
          }
      ]);

      const data = carCounts.map(item => ({
          category: item._id,
          count: item.count
      }));

      res.status(200).json({ success: true, availability: data });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
};
