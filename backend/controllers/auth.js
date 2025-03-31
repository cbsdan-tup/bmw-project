const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

const otpStore = {};

exports.generateAndSendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Generate 5-digit OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    
    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    // Create email template with BMW branding
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0066b1;">BMW Rental Service</h1>
          <div style="height: 4px; background: linear-gradient(to right, #0066b1, #76b1e6); margin: 10px 0;"></div>
        </div>
        
        <h2 style="color: #333;">Verify Your Email</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">Thank you for choosing BMW Rental Service. Please use the following One-Time Password (OTP) to complete your registration:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">${otp}</div>
          <p style="color: #888; font-size: 14px; margin-top: 10px;">This OTP will expire in 10 minutes.</p>
        </div>
        
        <p style="color: #555; font-size: 16px;">Experience the ultimate driving pleasure with our premium BMW rental fleet. From luxurious sedans to powerful SUVs, we offer the finest vehicles for your journey.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 14px;">
          <p>If you didn't request this OTP, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} BMW Rental Service. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send OTP via email
    await sendEmail({
      email,
      subject: "Your BMW Rental Registration OTP",
      message: emailTemplate,
      html: true
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error sending OTP",
      error: error.message,
    });
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    // Check if OTP exists and is valid
    const storedOTPData = otpStore[email];
    
    if (!storedOTPData) {
      return res.status(400).json({
        success: false,
        message: "Your verification code has expired. Please request a new one.",
      });
    }

    if (Date.now() > storedOTPData.expiresAt) {
      // Clean up expired OTP
      delete otpStore[email];
      
      return res.status(400).json({
        success: false,
        message: "Your verification code has expired. Please request a new one.",
      });
    }

    if (storedOTPData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Incorrect verification code. Please try again.",
      });
    }

    // Mark email as verified in the store
    otpStore[email].verified = true;

    return res.status(200).json({
      success: true,
      message: "Verification successful",
    });
  } catch (error) {
    console.error("OTP verification server error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

exports.registerUser = async (req, res, next) => {
  try {
    console.log(
      `Request Body: ${JSON.stringify(
        req.body
      )},\nRequest file: ${JSON.stringify(req.file)}`
    );

    const { uid, firstName, lastName, email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
        errors: ["Email already exists"],
      });
    }

    let avatar = {
      public_id: null,
      url: null,
    };

    if (req.file) {
      const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!fileTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported file type! Please upload a JPEG, JPG, or PNG image.",
        });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });

      avatar = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    const user = new User({
      uid,
      firstName,
      lastName,
      email,
      avatar,
    });

    const validationError = user.validateSync();
    if (validationError) {
      const errorMessages = Object.values(validationError.errors).map(
        (error) => error.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errorMessages,
      });
    }

    await user.save();

    const token = user.getJwtToken();

    return res.status(201).json({
      success: true,
      message: "Your registration is successful!",
      user,
      token,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Add a function to check if a user is currently disabled
const checkUserDisabled = (user) => {
  if (!user.disableHistory || user.disableHistory.length === 0) return false;
  
  const now = new Date();
  
  // Check if any active disable record is currently in effect
  return user.disableHistory.some(record => {
    if (!record.isActive) return false;
    
    // If permanent, user is disabled
    if (record.isPermanent) return true;
    
    // If not permanent, check if current date is before end date
    return record.endDate && record.endDate > now;
  });
};

exports.getUser = async (req, res, next) => {
  const { uid } = req.body;

  console.log(req.body);
  if (!uid) {
    return res.status(400).json({ message: "Please provide UID" });
  }

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user is disabled
    const isDisabled = checkUserDisabled(user);
    
    // If user is disabled, we still return the user object but with a flag
    // so the front-end can show appropriate messages
    if (isDisabled) {
      const activeDisableRecord = user.disableHistory.find(record => 
        record.isActive && (record.isPermanent || record.endDate > new Date())
      );
      
      return res.status(200).json({
        success: true,
        user,
        isDisabled: true,
        disableInfo: activeDisableRecord
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    if (!users) {
      return res.status(400).json({ message: "no users found" });
    }
    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUserDetails = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res
      .status(400)
      .json({ message: `User does not found with id: ${req.params.id}` });
  }

  return res.status(200).json({
    success: true,
    user,
  });
};
exports.updateMyProfile = async (req, res, next) => {
  try {
    console.log(`Req.files: ${JSON.stringify(req.file)}`);
    const newUserData = {};

    if (req.body.firstName) newUserData.firstName = req.body.firstName;
    if (req.body.lastName) newUserData.lastName = req.body.lastName;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(400)
        .json({ message: `User not found ${req.params.id}` });
    }

    if (user.avatar && user.avatar.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    if (req.file) {
      const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!fileTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported file type! Please upload a JPEG, JPG, or PNG image.",
        });
      }

      const cloudinaryResponse = await cloudinary.uploader.upload(
        req.file.path,
        {
          folder: "avatars",
          width: 150,
          crop: "scale",
        }
      );

      newUserData.avatar = {
        url: cloudinaryResponse.secure_url,
        public_id: cloudinaryResponse.public_id,
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      newUserData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res
        .status(400)
        .json({ message: `User not updated ${req.params.id}` });
    }

    return res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    console.log(`Request Body: ${JSON.stringify(req.body)}`);

    const newUserData = {};
    if (req.body.firstName) newUserData.firstName = req.body.firstName;
    if (req.body.lastName) newUserData.lastName = req.body.lastName;
    if (req.body.email) newUserData.email = req.body.email;
    if (req.body.role) newUserData.role = req.body.role;
    if (req.body.permissionToken) newUserData.permissionToken = req.body.permissionToken;

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: `User not updated ${req.params.id}` });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deletePermissionToken = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { permissionToken: null }, 
      { new: true } 
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ success: "Permission token removed successfully", user });
  } catch (error) {
    console.error("Error removing token:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateUserAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an avatar image",
      });
    }

    const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!fileTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported file type! Please upload a JPEG, JPG, or PNG image.",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id: ${req.params.id}`,
      });
    }

    user.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Avatar updated successfully!",
      user,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateUserPassword = async (req, res) => {
  const { newPassword } = req.body;
  console.log(req.body);

  try {
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new password",
      });
    }

    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id: ${req.params.id}`,
      });
    }

    user.password = newPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully!",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
