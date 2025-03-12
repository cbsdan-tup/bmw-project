const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, isAdmin } = require("../middleware/auth");

const {
  createRent,
  getAllRentDetails,
  getRentDetails,
  updateRent,
  myRentals,
  myCarRental,
  deleteRent,
  getRentalsByCarId,
  getMonthlyIncome,
  calculateSalesChart,
  top3CarsController,
} = require("../controllers/rental");

router.get("/rentals", isAuthenticatedUser, getAllRentDetails);
router.get("/rentals/:id", isAuthenticatedUser, getRentDetails);
router.post("/createRental", isAuthenticatedUser, createRent);
router.get('/estimated-income', getMonthlyIncome);
router.get("/my-rentals/:renterId", isAuthenticatedUser, myRentals);
router.get("/my-car-rentals/:ownerId", isAuthenticatedUser, myCarRental);
router.get("/top3cars", isAdmin, top3CarsController);
router.get("/sales", isAdmin, calculateSalesChart);
router.get("/car-rentals/:carId", getRentalsByCarId);
router
  .route("/rentals/:id")
  .put(isAuthenticatedUser, updateRent)
  .delete(isAuthenticatedUser, deleteRent);

module.exports = router;
