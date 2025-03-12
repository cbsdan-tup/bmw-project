const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    firstName: { 
        type: String, 
        maxlength: [30, 'Your First Name cannot exceed 30 characters'],
        trim: true
    },
    lastName: { 
        type: String, 
        maxlength: [30, 'Your Last Name cannot exceed 30 characters'],
        trim: true
    },
    email: { 
        type: String, 
        required: [true, 'Please enter your Email Address'],  
        unique: true,
        validate: [validator.isEmail, 'Please enter a Valid Email Address']
    },
    role: { 
        type: String, 
        default: 'user',
        enum: ['user', 'admin'] 
    },
    avatar: {
        public_id: { 
            type: String, 
        },
        url: { 
            type: String, 
        },
    },
    permissionToken: {
        type: String,
    },
    createdAt: { 
        type: Date, 
        required: true, 
        default: Date.now 
    },
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next()
    }
    this.password = await bcrypt.hash(this.password, 10)
});

userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME
    });
}

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.model('User', userSchema);

module.exports = User;