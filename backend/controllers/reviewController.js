const Review = require("../models/Review");
const Rental = require("../models/Rental");
const Filter = require("bad-words");
const cloudinary = require("cloudinary").v2;

const getAllReview = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate({
        path: "rental",
        populate: {
          path: "car",
        },
      })
      .populate("renter")
      .sort({ createdAt: -1 });
    res.status(200).json({ message: "Fetched reviews successfully", reviews });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching reviews", error: err.message });
  }
};

const getReviews = async (req, res) => {
  try {
    const { carId } = req.params;

    const rentals = await Rental.find({ car: carId });

    if (!rentals.length) {
      return res
        .status(200)
        .json({ message: "Fetched reviews successfully", reviews: [] });
    }

    const rentalIds = rentals.map((rental) => rental._id);
    const reviews = await Review.find({ rental: { $in: rentalIds } }).populate(
      "renter rental"
    );

    res.status(200).json({ message: "Fetched reviews successfully", reviews });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching reviews", error: err.message });
  }
};

const getReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId)
      .populate("renter rental")
      .sort({ createdAt: -1 });
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.status(200).json({ message: "Fetched review successfully", review });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching review", error: err.message });
  }
};

const createReview = async (req, res) => {
  try {
    const { rental, renter, rating } = req.body;
    let { comment } = req.body;

    console.log('Creating review with data:', { 
      rental, 
      renter, 
      rating, 
      comment, 
      files: req.files?.length || 0 
    });

    if (!rental || !renter || !rating) {
      return res.status(400).json({ 
        message: "Missing required fields", 
        required: ["rental", "renter", "rating"],
        received: { rental, renter, rating }
      });
    }

    // Check if a review already exists for this rental
    const existingReview = await Review.findOne({ rental });
    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this rental",
        reviewId: existingReview._id
      });
    }

    // Set a default comment if none provided
    if (!comment || comment.trim() === '') {
      comment = "Good experience";
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded images`);
      try {
        const uploadedImages = await Promise.all(
          req.files.map((file) =>
            cloudinary.uploader.upload(file.path, {
              folder: "reviews",
              width: 600,
              crop: "scale",
            })
          )
        );
        images = uploadedImages.map((result) => ({
          public_id: result.public_id,
          url: result.secure_url,
        }));
      } catch (uploadError) {
        console.error('Error uploading images:', uploadError);
        // Continue creating the review even if image upload fails
      }
    }
    
    const filter = new Filter();
    const filteredComment = filter.clean(comment);
    comment = filteredComment;
    
    const review = new Review({
      rental,
      renter,
      rating,
      comment,
      images 
    });

    const error = review.validateSync();
    if (error) {
      const errorsArray = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ errors: errorsArray, message: "Validation Errors" });
    }

    await review.save();
    console.log('Review created successfully:', review._id);
    res.status(201).json({ message: "Review created successfully", review });
  } catch (err) {
    console.error('Error creating review:', err);
    res
      .status(500)
      .json({ message: "Error creating review", error: err.message });
  }
};

const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, retainedImages } = req.body;

    const updates = {};
    if (rating) updates.rating = rating;
    if (comment) {
      const filter = new Filter();
      const filteredComment = filter.clean(comment);
      updates.comment = filteredComment;
    }

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    let imagesToKeep = [];
    if (retainedImages) {
      try {
        const parsedRetainedImages =
          typeof retainedImages === "string"
            ? JSON.parse(retainedImages)
            : retainedImages;

        const imagesToDelete = review.images.filter(
          (image) => !parsedRetainedImages.includes(image.public_id)
        );

        await Promise.all(
          imagesToDelete.map(async (image) => {
            await cloudinary.uploader.destroy(image.public_id);
          })
        );

        imagesToKeep = review.images.filter((image) =>
          parsedRetainedImages.includes(image.public_id)
        );
      } catch (error) {
        console.error("Error processing retained images:", error);
      }
    } else if (review.images && review.images.length > 0) {
      await Promise.all(
        review.images.map(async (image) => {
          await cloudinary.uploader.destroy(image.public_id);
        })
      );
    }

    let newImages = [];
    if (req.files && req.files.length > 0) {
      const uploadedImages = await Promise.all(
        req.files.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "reviews",
            width: 600,
            public_id: file.filename,
          });
          return {
            public_id: result.public_id,
            url: result.secure_url,
          };
        })
      );
      newImages = uploadedImages;
    }

    updates.images = [...imagesToKeep, ...newImages];

    const updatedReview = await Review.findByIdAndUpdate(reviewId, updates, {
      new: true,
    });
    if (!updatedReview)
      return res.status(404).json({ message: "Review not found" });

    const error = updatedReview.validateSync();
    if (error) {
      const errorsArray = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ errors: errorsArray, message: "Validation Errors" });
    }

    res
      .status(200)
      .json({ message: "Review updated successfully", review: updatedReview });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating review", error: err.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting review", error: err.message });
  }
};

const getReviewsByCarId = async (req, res) => {
  try {
    const { carId } = req.params;

    const rentals = await Rental.find({ car: carId });

    if (!rentals.length) {
      return res.status(404).json({ message: "No rentals found for this car" });
    }

    const rentalIds = rentals.map((rental) => rental._id);

    const reviews = await Review.find({ rental: { $in: rentalIds } })
      .populate("renter")
      .populate({
        path: "rental",
        populate: {
          path: "car",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ message: "Fetched reviews successfully", reviews });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching reviews", error: err.message });
  }
};

const getReviewsByRentalId = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const reviews = await Review.find({ rental: rentalId })
      .populate("renter")
      .populate({
        path: "rental",
        populate: {
          path: "car",
        },
      })
      .sort({ createdAt: -1 });

    if (!reviews.length) {
      return res
        .status(404)
        .json({ message: "No reviews found for this rental" });
    }

    res.status(200).json({ message: "Fetched reviews successfully", reviews });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching reviews", error: err.message });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ renter: userId })
      .populate({
        path: "rental",
        populate: {
          path: "car",
        },
      })
      .populate("renter")
      .sort({ createdAt: -1 });

    if (!reviews.length) {
      return res
        .status(200)
        .json({ message: "No reviews found for this user", reviews: [] });
    }

    res
      .status(200)
      .json({ message: "Fetched user reviews successfully", reviews });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching user reviews", error: err.message });
  }
};

module.exports = {
  getAllReview,
  getReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  getReviewsByCarId,
  getReviewsByRentalId,
  getUserReviews,
};
