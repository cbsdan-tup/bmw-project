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
  getUserActivity
} = require('../controllers/adminStatsController');

const router = express.Router();

// Protect all routes with admin middleware
router.use(isAdmin);

// Statistics endpoints
router.get('/admin/stats/users', getUserStats);
router.get('/admin/stats/cars', getCarStats);
router.get('/admin/stats/rentals', getRentalStats);
router.get('/admin/stats/reviews', getReviewStats);
router.get('/admin/stats/sales', getSalesStats);

// Dashboard data endpoints
router.get('/admin/stats/top-rented-cars', getTopRentedCars);
router.get('/admin/stats/monthly-sales', getMonthlySales);
router.get('/admin/stats/user-activity', getUserActivity);

module.exports = router;
