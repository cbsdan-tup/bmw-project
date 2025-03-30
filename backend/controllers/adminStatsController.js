const User = require('../models/User');
const Cars = require('../models/Cars');
const Rental = require('../models/Rental');
const Review = require('../models/Review');
const mongoose = require('mongoose');

// Add the missing calculateRentalDays function
const calculateRentalDays = (pickUpDate, returnDate) => {
  if (!pickUpDate || !returnDate) {
    return 0;
  }
  const pickUp = new Date(pickUpDate);
  const returnD = new Date(returnDate);
  const timeDiff = Math.abs(returnD - pickUp);
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return diffDays;
};

// Get User Statistics
exports.getUserStats = async (req, res) => {
  try {
    // Count total users
    const totalUsers = await User.countDocuments();
    
    // Count users by role
    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Transform role distribution for easier client-side use
    const roleDistributionMap = roleDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Count disabled users (users with active disable records)
    const disabledUsers = await User.countDocuments({
      disableHistory: {
        $elemMatch: {
          isActive: true,
          $or: [
            { isPermanent: true },
            { endDate: { $gt: new Date() } }
          ]
        }
      }
    });

    // Count new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    res.status(200).json({
      success: true,
      statistics: {
        total: totalUsers,
        active: totalUsers - disabledUsers,
        disabled: disabledUsers,
        newUsersThisMonth,
        roleDistribution: roleDistributionMap
      }
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get Car Statistics
exports.getCarStats = async (req, res) => {
  try {
    // Get basic car counts
    const totalCars = await Cars.countDocuments();
    const activeCars = await Cars.countDocuments({ isActive: true });
    
    // Get cars by vehicle type
    const byType = await Cars.aggregate([
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
    const byBrand = await Cars.aggregate([
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
        total: totalCars,
        active: activeCars,
        inactive: totalCars - activeCars,
        byType,
        byBrand,
        carsInUse: carsWithActiveRentals.length
      }
    });
  } catch (error) {
    console.error('Error fetching car statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get Rental Statistics
exports.getRentalStats = async (req, res) => {
  try {
    // Get total rentals
    const totalRentals = await Rental.countDocuments();
    
    // Get rentals by status
    const rentalsByStatus = await Rental.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Transform to object for easier client-side use
    const statusCounts = rentalsByStatus.reduce((acc, item) => {
      acc[item._id.toLowerCase()] = item.count;
      return acc;
    }, {});
    
    // Calculate average rental duration in days
    const rentalDurationStats = await Rental.aggregate([
      {
        $match: { 
          status: { $in: ['Returned', 'Completed'] },
          pickUpDate: { $exists: true },
          returnDate: { $exists: true }
        }
      },
      {
        $project: {
          duration: { 
            $divide: [
              { $subtract: ['$returnDate', '$pickUpDate'] },
              1000 * 60 * 60 * 24 // convert ms to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageDuration: { $avg: '$duration' },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    const averageDuration = rentalDurationStats.length > 0 
      ? parseFloat(rentalDurationStats[0].averageDuration.toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      statistics: {
        total: totalRentals,
        active: statusCounts.active || 0,
        completed: statusCounts.returned || 0,
        pending: statusCounts.pending || 0,
        canceled: statusCounts.canceled || 0,
        averageDuration
      }
    });
  } catch (error) {
    console.error('Error fetching rental statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get Review Statistics
exports.getReviewStats = async (req, res) => {
  try {
    // Get total reviews
    const totalReviews = await Review.countDocuments();
    
    // Get average rating
    const ratingStats = await Review.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);
    
    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Transform to object for easier client-side use
    const ratingDistributionMap = ratingDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    });

    const averageRating = ratingStats.length > 0 
      ? parseFloat(ratingStats[0].averageRating.toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      statistics: {
        total: totalReviews,
        averageRating,
        ratingDistribution: ratingDistributionMap
      }
    });
  } catch (error) {
    console.error('Error fetching review statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get Sales Statistics
exports.getSalesStats = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      dateFilter.createdAt = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      dateFilter.createdAt = { $gte: startDate, $lte: endDate };
    }
    
    // Get completed rentals
    const rentals = await Rental.find({ 
      status: "Returned", 
      ...dateFilter 
    }).populate('car');
    
    // Calculate total revenue considering discounts
    const totalRevenue = rentals.reduce((sum, rental) => {
      return sum + (rental.finalAmount || (calculateRentalDays(rental.pickUpDate, rental.returnDate) * rental.car.pricePerDay));
    }, 0);
    
    // Calculate total discount amount
    const totalDiscountAmount = rentals.reduce((sum, rental) => {
      return sum + (rental.discount?.discountAmount || 0);
    }, 0);
    
    // Calculate revenue before discounts
    const revenueBeforeDiscounts = totalRevenue + totalDiscountAmount;
    
    // Monthly revenue data
    const monthlyData = {};
    rentals.forEach(rental => {
      const date = new Date(rental.createdAt);
      const month = date.getMonth() + 1;
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          revenue: 0,
          discountAmount: 0,
          rentalCount: 0
        };
      }
      
      monthlyData[month].rentalCount++;
      monthlyData[month].revenue += (rental.finalAmount || (calculateRentalDays(rental.pickUpDate, rental.returnDate) * rental.car.pricePerDay));
      monthlyData[month].discountAmount += (rental.discount?.discountAmount || 0);
    });
    
    // Convert to array and sort by month
    const monthlySales = Object.values(monthlyData).sort((a, b) => a.month - b.month);
    
    res.status(200).json({
      success: true,
      totalRevenue,
      totalDiscountAmount,
      revenueBeforeDiscounts,
      discountPercentage: revenueBeforeDiscounts > 0 
        ? (totalDiscountAmount / revenueBeforeDiscounts * 100).toFixed(2) 
        : 0,
      rentalsCount: rentals.length,
      averageOrderValue: rentals.length > 0 ? (totalRevenue / rentals.length).toFixed(2) : 0,
      monthlySales
    });
  } catch (error) {
    console.error('Error fetching sales statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales statistics',
      error: error.message
    });
  }
};

// Get top rented cars - Update to only include "Returned" rentals
exports.getTopRentedCars = async (req, res) => {
  try {
    // Find the cars with most rentals - filter by status "Returned" only
    const topRentedCars = await Rental.aggregate([
      {
        $match: {
          status: "Returned" // Add this status filter
        }
      },
      {
        $group: {
          _id: '$car',
          rentalCount: { $sum: 1 }
        }
      },
      {
        $sort: { rentalCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'cars',
          localField: '_id',
          foreignField: '_id',
          as: 'carDetails'
        }
      },
      {
        $unwind: '$carDetails'
      },
      {
        $project: {
          _id: '$carDetails._id',
          brand: '$carDetails.brand',
          model: '$carDetails.model',
          year: '$carDetails.year',
          vehicleType: '$carDetails.vehicleType',
          images: { $arrayElemAt: ['$carDetails.images.url', 0] },
          rentalCount: 1
        }
      }
    ]);

    // Add average ratings
    const carsWithRating = await Promise.all(topRentedCars.map(async (car) => {
      // Find all rentals for this car
      const rentals = await Rental.find({ car: car._id });
      const rentalIds = rentals.map(rental => rental._id);
      
      // Find reviews for these rentals
      const reviews = await Review.find({ rental: { $in: rentalIds } });
      
      // Calculate average rating
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : null;
        
      return {
        ...car,
        averageRating
      };
    }));

    res.status(200).json({
      success: true,
      cars: carsWithRating
    });
  } catch (error) {
    console.error('Error fetching top rented cars:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get monthly sales data for a given year
exports.getMonthlySales = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    
    const monthlySales = await Rental.aggregate([
      {
        $match: {
          status: { $in: ['Completed', 'Returned'] },
          paymentStatus: 'Paid',
          createdAt: { 
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $lookup: {
          from: 'cars',
          localField: 'car',
          foreignField: '_id',
          as: 'carDetails'
        }
      },
      {
        $unwind: '$carDetails'
      },
      {
        $project: {
          month: { $month: '$createdAt' },
          rentalDuration: {
            $divide: [
              { $subtract: ['$returnDate', '$pickUpDate'] },
              1000 * 60 * 60 * 24 // Convert ms to days
            ]
          },
          pricePerDay: '$carDetails.pricePerDay'
        }
      },
      {
        $project: {
          month: 1,
          rentalCost: { $multiply: ['$rentalDuration', '$pricePerDay'] }
        }
      },
      {
        $group: {
          _id: '$month',
          revenue: { $sum: '$rentalCost' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          revenue: { $round: ['$revenue', 2] },
          count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      year,
      sales: monthlySales
    });
  } catch (error) {
    console.error('Error fetching monthly sales data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user activity over a period
exports.getUserActivity = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get new user registrations per day
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          count: 1,
          type: { $literal: 'registration' }
        }
      }
    ]);
    
    // Get rental bookings per day
    const rentalBookings = await Rental.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          count: 1,
          type: { $literal: 'rental' }
        }
      }
    ]);
    
    // Combine all activity
    const activity = [...userRegistrations, ...rentalBookings].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.status(200).json({
      success: true,
      daysAnalyzed: days,
      activity
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get Discount Statistics
exports.getDiscountStats = async (req, res) => {
  try {
    // Get rentals with completed status and discount applied
    const discountedRentals = await Rental.find({
      status: "Returned",
      "discount.code": { $exists: true, $ne: null }
    }).populate('renter', 'firstName lastName');

    // Count total successful rentals
    const totalSuccessfulRentals = await Rental.countDocuments({ status: "Returned" });
    
    // Calculate discount usage metrics with proper fallbacks for null/undefined values
    const totalDiscountAmount = discountedRentals.reduce((sum, rental) => {
      const discountAmount = rental.discount && rental.discount.discountAmount 
        ? Number(rental.discount.discountAmount) 
        : 0;
      return sum + discountAmount;
    }, 0);
    
    const discountUsage = {
      totalDiscountedRentals: discountedRentals.length,
      totalSuccessfulRentals,
      percentageWithDiscount: totalSuccessfulRentals > 0 
        ? (discountedRentals.length / totalSuccessfulRentals * 100).toFixed(2) 
        : 0,
      totalDiscountAmount
    };

    // Group by discount code with proper null/undefined handling
    const discountsByCode = {};
    discountedRentals.forEach(rental => {
      if (!rental.discount || !rental.discount.code) return;
      
      const code = rental.discount.code;
      if (!discountsByCode[code]) {
        discountsByCode[code] = {
          code,
          count: 0,
          totalAmount: 0,
          percentage: rental.discount.discountPercentage || 0
        };
      }
      discountsByCode[code].count++;
      discountsByCode[code].totalAmount += (rental.discount.discountAmount || 0);
    });

    // Convert to array and sort by usage count
    const topDiscounts = Object.values(discountsByCode)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly discount usage trends
    const monthlyDiscountUsage = {};
    discountedRentals.forEach(rental => {
      const date = new Date(rental.createdAt);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyDiscountUsage[monthYear]) {
        monthlyDiscountUsage[monthYear] = {
          month: monthYear,
          count: 0,
          amount: 0
        };
      }
      
      monthlyDiscountUsage[monthYear].count++;
      monthlyDiscountUsage[monthYear].amount += (rental.discount.discountAmount || 0);
    });

    // Convert to array and sort by month
    const monthlyTrends = Object.values(monthlyDiscountUsage).sort((a, b) => a.month.localeCompare(b.month));

    res.status(200).json({
      success: true,
      discountUsage,
      topDiscounts,
      monthlyTrends
    });
  } catch (error) {
    console.error('Error fetching discount statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching discount statistics',
      error: error.message
    });
  }
};


