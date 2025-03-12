const express = require('express');
const upload = require('../utils/multer');
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");

const {
    createRecord,
    getAllRecords,
    getRecordDetail,
    updateRecord,
    deleteRecord,
    getMaintenanceCostVsRentalIncome
} = require('../controllers/maintenanceRecord');

// Routes for maintenance records
router.get('/maintenanceRecords', isAuthenticatedUser, getAllRecords);
router.get('/maintenanceRecords/:id', isAuthenticatedUser, getRecordDetail);
router.get('/maintenance-vs-rental', getMaintenanceCostVsRentalIncome);
router.post('/createRecord', isAuthenticatedUser, upload.array('images', 10), createRecord);
router.route('/maintenanceRecords/:id')
    .put( upload.array('images', 10), isAuthenticatedUser, updateRecord)
    .delete( isAuthenticatedUser, deleteRecord);

module.exports = router;