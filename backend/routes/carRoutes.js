const express = require("express");
const upload = require("../utils/multer");
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");

const {
  createCar,
  getAllCars,
  deleteCar,
  updateCar,
  getSingleCar,
  getCarsByUserId,
  getAllCarsInfinite,
  filterCars,
  getCarAvailability,
  getFeaturedCars,
  searchAndFilterCars,
  getUserCarsWithActiveRentals,
  getUserCompletedRentals,
} = require("../controllers/carControllers");

router.get("/Cars", getAllCars);
// Important: Place the featured route BEFORE the :id route to avoid the parameter conflict
router.get("/Cars/featured", getFeaturedCars);
router.get("/Cars/infinite", getAllCarsInfinite);
router.get("/Cars/filter", filterCars);
router.get("/Cars/search-filter", searchAndFilterCars);
router.get("/Cars/:id", getSingleCar);
router.get("/my-cars/:userId", isAuthenticatedUser, getCarsByUserId);
router.get(
  "/user-cars-with-rentals/:userId",
  isAuthenticatedUser,
  getUserCarsWithActiveRentals
);
router.get(
  "/user-completed-rentals/:userId",
  isAuthenticatedUser,
  getUserCompletedRentals
);
router.post(
  "/CreateCar",
  isAuthenticatedUser,
  upload.array("images", 10),
  createCar
);
router
  .route("/Cars/:id")
  .put(isAuthenticatedUser, upload.array("images", 10), updateCar)
  .delete(isAuthenticatedUser, deleteCar);

router.get("/car-availability", getCarAvailability);

module.exports = router;
