const Rental = require("../models/Rental");
const User = require("../models/User");
const Car = require("../models/Cars");
const { sendExpoNotifications } = require("../utils/expoNotifications");

// Get all rentals with optional filtering by status, search and pagination
const getAllAdminRentals = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, searchQuery, searchType, sort = 'createdAt:desc' } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build query based on filters
    const query = {};
    if (status && status !== 'All') {
      query.status = status;
    }

    // Add search functionality
    if (searchQuery && searchType) {
      if (searchType === 'renter') {
        // Find renters by email
        const renters = await User.find({ email: { $regex: searchQuery, $options: 'i' } });
        const renterIds = renters.map(renter => renter._id);
        query.renter = { $in: renterIds };
      } else if (searchType === 'owner') {
        // Find cars owned by users with matching email
        const owners = await User.find({ email: { $regex: searchQuery, $options: 'i' } });
        const ownerIds = owners.map(owner => owner._id);
        const cars = await Car.find({ owner: { $in: ownerIds } });
        const carIds = cars.map(car => car._id);
        query.car = { $in: carIds };
      }
    }

    // Parse sort parameter
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // Default sort
    }

    // Count total documents that match the query
    const totalItems = await Rental.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limitNum);

    // Fetch paginated rentals with dynamic sort
    const rentals = await Rental.find(query)
      .populate({
        path: "car",
        populate: { path: "owner" },
      })
      .populate("renter discountCode")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.json({
      rentals,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems
      }
    });
  } catch (error) {
    console.error("Error retrieving rentals:", error);
    res.status(500).json({ message: "Error retrieving rentals", error: error.message });
  }
};

// Get a single rental by ID
const getAdminRentalById = async (req, res) => {
  try {
    const { id } = req.params;
    const rental = await Rental.findById(id)
      .populate({
        path: "car",
        populate: { path: "owner" },
      })
      .populate("renter discountCode");
    
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }
    
    res.json(rental);
  } catch (error) {
    console.error("Error retrieving rental:", error);
    res.status(500).json({ message: "Error retrieving rental", error: error.message });
  }
};

// Update rental status
const updateRentalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    const rental = await Rental.findByIdAndUpdate(id, { status }, {
      new: true,
      runValidators: true
    }).populate("renter car");

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Check if renter exists and has data
    if (rental.renter) {
      // Send notification using push tokens if available
      if (rental.renter.pushTokens && rental.renter.pushTokens.length > 0) {
        try {
          console.log(`Sending push notification to renter ${rental.renter._id} with ${rental.renter.pushTokens.length} tokens`);
          
          // Use the modular function to send notifications
          const tickets = await sendExpoNotifications({
            tokens: rental.renter.pushTokens,
            title: "BMW Rental Status Update",
            body: `Your rental for ${rental.car?.brand} ${rental.car?.model} has been updated to: ${status}`,
            data: { 
              rentalId: rental._id.toString(),
              status: status,
              type: 'rentalUpdate',
              navigation: {
                screen: 'ProfileTab',
                params: {
                  screen: 'BookingDetails',
                  params: {
                    booking: {
                      _id: rental._id.toString()
                    }
                  }
                }
              }
            },
          });
          
          console.log(`Push notification result: ${tickets.length} tickets created`);
        } catch (error) {
          // Log but don't fail the request
          console.error("Error sending push notification:", error);
        }
      } else {
        console.log(`No push tokens available for renter ${rental.renter._id}`);
      }
      
    }

    res.json({ message: "Rental status updated successfully", rental });
  } catch (error) {
    console.error("Error updating rental status:", error);
    res.status(500).json({ message: "Error updating rental status", error: error.message });
  }
};

// Get rental statistics
const getRentalStatistics = async (req, res) => {
  try {
    const stats = await Rental.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Format statistics
    const formattedStats = {
      Pending: 0,
      Confirmed: 0,
      Active: 0,
      Returned: 0,
      Canceled: 0
    };
    
    stats.forEach(stat => {
      if (formattedStats.hasOwnProperty(stat._id)) {
        formattedStats[stat._id] = stat.count;
      }
    });
    
    res.json(formattedStats);
  } catch (error) {
    console.error("Error retrieving rental statistics:", error);
    res.status(500).json({ message: "Error retrieving rental statistics", error: error.message });
  }
};

module.exports = {
  getAllAdminRentals,
  getAdminRentalById,
  updateRentalStatus,
  getRentalStatistics,
};
