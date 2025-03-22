const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, isAdmin } = require("../middleware/auth");
const {
  getAllAdminRentals,
  getAdminRentalById,
  updateRentalStatus,
  getRentalStatistics
} = require("../controllers/adminRentalController");

// Admin Rental Routes
router.get("/admin/rentals", isAuthenticatedUser, isAdmin, getAllAdminRentals);
router.get("/admin/rentals/:id", isAuthenticatedUser, isAdmin, getAdminRentalById);
router.put("/admin/rentals/:id/status", isAuthenticatedUser, isAdmin, updateRentalStatus);
router.get("/admin/rental-stats", isAuthenticatedUser, isAdmin, getRentalStatistics);

module.exports = router;
