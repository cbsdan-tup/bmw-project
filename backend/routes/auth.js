const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAuthenticatedUser, isAdmin} = require("../middleware/auth") 

const { 
    registerUser,
    getUser,
    getAllUsers,
    getUserDetails,
    updateMyProfile,
    updateUser,
    updateUserAvatar,
    updateUserPassword,
    deletePermissionToken,
    generateAndSendOTP,
    verifyOTP,
    sendMfaSetupCode,
    verifyMfaSetup,
    updateMfaSettings,
    sendLoginMfaCode,
    verifyLoginMfa
} = require('../controllers/auth');


const {
    createUserInfo,
    getUserInfo,
    getAllUserInfo,
    updateUserInfo,
    deleteUserInfo,
} = require('../controllers/userInfoController');

// New OTP routes
router.post('/generate-otp', generateAndSendOTP);
router.post('/verify-otp', verifyOTP);

// New MFA routes
router.post('/users/send-mfa-setup-code', isAuthenticatedUser, sendMfaSetupCode);
router.post('/users/verify-mfa-setup', isAuthenticatedUser, verifyMfaSetup);
router.post('/users/update-mfa-settings', isAuthenticatedUser, updateMfaSettings);

// MFA login verification routes
router.post('/send-login-mfa-code', sendLoginMfaCode);
router.post('/verify-login-mfa', verifyLoginMfa);

router.post('/register', upload.single('avatar'), registerUser);
router.post('/getUserInfo', getUser);
router.get('/admin/all-users', isAdmin, getAllUsers);
router.get('/admin/user/:id', isAdmin, getUserDetails);
router.put('/update-profile/:id', upload.single('avatar'), isAuthenticatedUser, updateMyProfile);
router.put('/update-user/:id', isAuthenticatedUser, updateUser);
router.put('/remove-permission-token/:userId', deletePermissionToken);
router.put('/admin/update-user/:id', isAdmin, updateUser);
router.put('/admin/update-avatar/:id', upload.single('avatar'), updateUserAvatar);
router.put('/admin/update-password/:id', updateUserPassword);

router.get('/user-info', isAuthenticatedUser, getAllUserInfo)
router.get('/user-info/:userId', isAuthenticatedUser, getUserInfo)
router.post('/user-info', upload.fields([{ name: 'frontSide' }, { name: 'backSide' }, { name: 'selfie' }]), isAuthenticatedUser, createUserInfo)
router.put('/user-info/:id', upload.fields([{ name: 'frontSide' }, { name: 'backSide' }, { name: 'selfie' }]), isAuthenticatedUser, updateUserInfo)
router.delete('/user-info/:id', isAuthenticatedUser, deleteUserInfo)

module.exports = router;
