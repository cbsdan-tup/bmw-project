const express = require('express');
const router = express.Router();
const {isAuthenticatedUser} = require("../middleware/auth") 

const { 
    createFavoriteCar, 
    getFavoriteCars, 
    deleteFavoriteCar, 
} = require('../controllers/favoriteCarControllers'); 

router.post('/favorite-car', isAuthenticatedUser, createFavoriteCar);
router.get('/favorite-cars/:userId', isAuthenticatedUser, getFavoriteCars);
router.delete('/favorite-car/:favoriteCarId', isAuthenticatedUser, deleteFavoriteCar);

module.exports = router;