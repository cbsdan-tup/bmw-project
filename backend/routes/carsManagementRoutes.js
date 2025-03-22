const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, isAdmin } = require("../middleware/auth");
const upload = require('../utils/multer');

const {
  getAllCars,
  getCarById,
  updateCarStatus,
  updateCar,
  deleteCar,
  getCarRentals,
  getCarStatistics,
  createCar
} = require('../controllers/adminCarController');

router.get('/admin/cars', isAuthenticatedUser, isAdmin, getAllCars);
router.get('/admin/cars/statistics', isAuthenticatedUser, isAdmin, getCarStatistics);
router.get('/admin/cars/:id', isAuthenticatedUser, isAdmin, getCarById);
router.get('/admin/cars/:id/rentals', isAuthenticatedUser, isAdmin, getCarRentals);
router.put('/admin/cars/:id/status', isAuthenticatedUser, isAdmin, updateCarStatus);
router.put('/admin/cars/:id', isAuthenticatedUser, isAdmin, upload.array('images'), updateCar);
router.delete('/admin/cars/:id', isAuthenticatedUser, isAdmin, deleteCar);
router.post('/admin/cars', isAuthenticatedUser, isAdmin, upload.array('images'), createCar);

module.exports = router;
