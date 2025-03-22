const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, isAdmin } = require("../middleware/auth");

const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  disableUser,
  generatePermissionToken,
  validateUserByEmail
} = require('../controllers/userManagementController');


router.get('/admin/users', isAuthenticatedUser, isAdmin, getAllUsers);
router.get('/admin/users/validate-email', isAuthenticatedUser, isAdmin, validateUserByEmail);
router.get('/admin/users/:id', isAuthenticatedUser, isAdmin, getUserById);
router.put('/admin/users/:id/role', isAuthenticatedUser, isAdmin, updateUserRole);
router.delete('/admin/users/:id', isAuthenticatedUser, isAdmin, deleteUser);
router.put('/admin/users/:id/disable', isAuthenticatedUser, isAdmin, disableUser);
router.post('/admin/users/:id/permission-token', isAuthenticatedUser, isAdmin, generatePermissionToken);

module.exports = router;
