const express = require('express');
const { isAdmin } = require('../middleware/auth');
const { 
  getUserStats,
  getCarStats,
  getRentalStats,
  getReviewStats,
  getSalesStats,
  getTopRentedCars,
  getMonthlySales,
  getUserActivity,
  getDiscountStats
} = require('../controllers/adminStatsController');

const router = express.Router();

// Statistics endpoints
router.get('/admin/stats/users', isAdmin, getUserStats);
router.get('/admin/stats/cars', isAdmin, getCarStats);
router.get('/admin/stats/rentals', isAdmin, getRentalStats);
router.get('/admin/stats/reviews', isAdmin, getReviewStats);
router.get('/admin/stats/sales', isAdmin, getSalesStats);

// Dashboard data endpoints
router.get('/admin/stats/top-rented-cars', isAdmin, getTopRentedCars);
router.get('/admin/stats/monthly-sales', isAdmin, getMonthlySales);
router.get('/admin/stats/user-activity', isAdmin, getUserActivity);
router.get("/admin/stats/discounts", isAdmin, getDiscountStats);

module.exports = router;
