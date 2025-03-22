const User = require("../models/User");

// Get all users - with pagination and search capabilities
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    
    const searchQuery = search 
      ? {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        } 
      : {};
    
    const users = await User.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
      
    const count = await User.countDocuments(searchQuery);
    
    return res.status(200).json({
      success: true,
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id: ${req.params.id}`
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be either 'user' or 'admin'"
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id: ${req.params.id}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id: ${req.params.id}`
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Generate permission token for a user
exports.generatePermissionToken = async (req, res) => {
  try {
    const token = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissionToken: token },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id: ${req.params.id}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Permission token generated successfully",
      user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Disable or enable user
exports.disableUser = async (req, res) => {
  try {
    const { isDisabled, disabledUntil, disabledReason, isPermanent } = req.body;
    
    // Find the user
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id: ${req.params.id}`
      });
    }

    // If we're enabling the user, deactivate all disable records
    if (!isDisabled) {
      if (user.disableHistory && user.disableHistory.length > 0) {
        user.disableHistory.forEach(record => {
          record.isActive = false;
        });
      }
      
      await user.save();
      
      user = await User.findById(req.params.id);
      
      return res.status(200).json({
        success: true,
        message: "User enabled successfully",
        user
      });
    }
    
    // Otherwise, add a new disable record
    const endDate = isPermanent ? null : new Date(disabledUntil);
    
    // Use the model method to add a new disable record
    user.addDisableRecord(disabledReason, endDate, isPermanent);
    
    await user.save();
    
    user = await User.findById(req.params.id);
    
    res.status(200).json({
      success: true,
      message: "User disabled successfully",
      user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Validate if user exists by email
exports.validateUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "User found successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error validating user by email:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
