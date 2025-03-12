const UserInfo = require('../models/UserInfo');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

const createUserInfo = async (req, res) => {
    try {
        const { user, contactNo, dateOfBirth, address, facebookUrl, driverLicenseNumber, expirationDate, isApproved } = req.body;
        console.log ("Req Files", JSON.stringify(req.file))

        if (!req.files || !req.files.frontSide || !req.files.backSide || !req.files.selfie) {
            return res.status(400).json({ message: 'All driver license images are required' });
        }

        const frontSide = await cloudinary.uploader.upload(req.files.frontSide[0].path);
        const backSide = await cloudinary.uploader.upload(req.files.backSide[0].path);
        const selfie = await cloudinary.uploader.upload(req.files.selfie[0].path);

        const userInfo = new UserInfo({
            user,
            contactNo,
            dateOfBirth,
            address,
            facebookUrl,
            driverLicense: {
              frontSide: { public_id: frontSide.public_id, url: frontSide.secure_url },
              backSide: { public_id: backSide.public_id, url: backSide.secure_url },
              selfie: { public_id: selfie.public_id, url: selfie.secure_url },
              driverLicenseNumber,
              expirationDate,
              isApproved
            },
            updatedAt: Date.now()
        });

        const error = userInfo.validateSync();
        if (error) {
            const errorsArray = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ errors: errorsArray, message: "Validation Errors" });
        }
        await userInfo.save();
        res.status(201).json({ message: 'User info created successfully', userInfo });
    } catch (err) {
        if (err.code === 11000) { 
            return res.status(400).json({ message: 'You already have information on your favorites.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getUserInfo = async (req, res) => {
    try {
      const userId = req.params.userId;
  
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      const userInfo = await UserInfo.findOne({ user: userId }).populate('user');
  
      if (!userInfo) {
        return res.status(404).json({ message: 'User info not found' });
      }
  
      res.status(200).json({ message: 'User info retrieved successfully', userInfo });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getAllUserInfo = async (req, res) => {
    try {
      const userInfoList = await UserInfo.find().populate('user');
      res.status(200).json({ message: 'User info retrieved successfully', userInfoList });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const updateUserInfo = async (req, res) => {
  try {
    console.log(`Req body: ${JSON.stringify(req.body)}`);
    const userInfoId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userInfoId)) {
      return res.status(400).json({ message: 'Invalid user info ID' });
    }

    const existingUserInfo = await UserInfo.findById(userInfoId);
    console.log(existingUserInfo)
    if (!existingUserInfo) {
      return res.status(404).json({ message: 'User info not found' });
    }

    const updates = {
      driverLicense: { ...existingUserInfo.driverLicense },
      updatedAt: Date.now()
    };
    
    if (req.files) {
      if (req.files.frontSide) {
        if (existingUserInfo.driverLicense.frontSide.public_id) {
          await cloudinary.uploader.destroy(existingUserInfo.driverLicense.frontSide.public_id);
        }
        const frontSide = await cloudinary.uploader.upload(req.files.frontSide[0].path);
        updates.driverLicense.frontSide = { public_id: frontSide.public_id, url: frontSide.secure_url };
      }
      if (req.files.backSide) {
        if (existingUserInfo.driverLicense.backSide.public_id) {
          await cloudinary.uploader.destroy(existingUserInfo.driverLicense.backSide.public_id);
        }
        const backSide = await cloudinary.uploader.upload(req.files.backSide[0].path);
        updates.driverLicense.backSide = { public_id: backSide.public_id, url: backSide.secure_url };
      }
      if (req.files.selfie) {
        if (existingUserInfo.driverLicense.selfie.public_id) {
          await cloudinary.uploader.destroy(existingUserInfo.driverLicense.selfie.public_id);
        }
        const selfie = await cloudinary.uploader.upload(req.files.selfie[0].path);
        updates.driverLicense.selfie = { public_id: selfie.public_id, url: selfie.secure_url };
      }
    }

    if (req.body.user !== undefined) updates.user = req.body.user;
    if (req.body.contactNo !== undefined) updates.contactNo = req.body.contactNo;
    if (req.body.dateOfBirth !== undefined) updates.dateOfBirth = req.body.dateOfBirth;
    if (req.body.address !== undefined) updates.address = req.body.address;
    if (req.body.facebookUrl !== undefined) updates.facebookUrl = req.body.facebookUrl;
    if (req.body.driverLicenseNumber !== undefined) updates.driverLicense.driverLicenseNumber = req.body.driverLicenseNumber;
    if (req.body.expirationDate !== undefined) updates.driverLicense.expirationDate = req.body.expirationDate;

    if (req.body.isApproved !== undefined) {
      updates.driverLicense._doc.isApproved = req.body.isApproved === 'true';
    }
    console.log(updates)

    const userInfo = new UserInfo(updates);
    const error = userInfo.validateSync();
    if (error) {
      const errorsArray = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ errors: errorsArray, message: "Validation Errors" });
    }

    const updatedUserInfo = await UserInfo.findByIdAndUpdate(userInfoId, updates, { new: true });
    console.log(updatedUserInfo)
    res.status(200).json({ message: 'User info updated successfully', userInfo: updatedUserInfo });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteUserInfo = async (req, res) => {
  try {
    const userInfoId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userInfoId)) {
      return res.status(400).json({ message: 'Invalid user info ID' });
    }

    const existingUserInfo = await UserInfo.findById(userInfoId);
    if (!existingUserInfo) {
      return res.status(404).json({ message: 'User info not found' });
    }

    if (existingUserInfo.driverLicense) {
      if (existingUserInfo.driverLicense.frontSide.public_id) {
        await cloudinary.uploader.destroy(existingUserInfo.driverLicense.frontSide.public_id);
      }
      if (existingUserInfo.driverLicense.backSide.public_id) {
        await cloudinary.uploader.destroy(existingUserInfo.driverLicense.backSide.public_id);
      }
      if (existingUserInfo.driverLicense.selfie.public_id) {
        await cloudinary.uploader.destroy(existingUserInfo.driverLicense.selfie.public_id);
      }
    }

    await UserInfo.findByIdAndDelete(userInfoId);

    res.status(200).json({ message: 'User info deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


module.exports = {
  createUserInfo,
  getUserInfo,
  getAllUserInfo,
  updateUserInfo,
  deleteUserInfo
};
