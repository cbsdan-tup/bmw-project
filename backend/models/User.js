const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')

const disableRecordSchema = new mongoose.Schema({
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        default: null // Null means permanent or not determined yet
    },
    reason: {
        type: String,
        required: true
    },
    isPermanent: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true, timestamps: true });

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
    // Replace individual disable fields with an array of disable records
    disableHistory: [disableRecordSchema],
    // Virtual property to be calculated
    isDisabled: {
        type: Boolean,
        default: false,
        // This will be computed via a virtual
    },
    createdAt: { 
        type: Date, 
        required: true, 
        default: Date.now 
    },
});

// Virtual to check if user is currently disabled
userSchema.virtual('isCurrentlyDisabled').get(function() {
    if (!this.disableHistory || this.disableHistory.length === 0) return false;
    
    const now = new Date();
    
    // Check if any active disable record is currently in effect
    return this.disableHistory.some(record => {
        if (!record.isActive) return false;
        
        // If permanent, user is disabled
        if (record.isPermanent) return true;
        
        // If not permanent, check if current date is before end date
        return record.endDate > now;
    });
});

// Method to get current active disable record if any
userSchema.methods.getCurrentDisableRecord = function() {
    if (!this.disableHistory || this.disableHistory.length === 0) return null;
    
    const now = new Date();
    
    // Find the active disable record
    return this.disableHistory.find(record => {
        if (!record.isActive) return false;
        
        if (record.isPermanent) return true;
        
        return record.endDate > now;
    });
};

// Helper to add a new disable record
userSchema.methods.addDisableRecord = function(reason, endDate, isPermanent) {
    // First deactivate any current active records
    if (this.disableHistory && this.disableHistory.length > 0) {
        this.disableHistory.forEach(record => {
            if (record.isActive) record.isActive = false;
        });
    }
    
    // Create new disable record
    const newRecord = {
        startDate: new Date(),
        endDate: isPermanent ? null : endDate,
        reason,
        isPermanent,
        isActive: true
    };
    
    // Add to history
    this.disableHistory.push(newRecord);
    
    return newRecord;
};

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