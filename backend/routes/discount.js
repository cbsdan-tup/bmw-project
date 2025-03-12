const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAdmin} = require("../middleware/auth") 

const { 
    createDiscount,
    getDiscounts,
    getDiscountById,
    updateDiscount,
    deleteDiscount
} = require('../controllers/discountCode');

router.get('/discounts', getDiscounts);
router.get('/discounts/:id', getDiscountById);
router.post('/create-discount', isAdmin, upload.single('logo'), createDiscount);
router.put('/discount/:id', isAdmin, upload.single('logo'), updateDiscount);
router.delete('/discount/:id', isAdmin,  deleteDiscount);


module.exports = router;
