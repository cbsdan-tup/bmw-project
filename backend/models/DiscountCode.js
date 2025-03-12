const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Code is required.'],
        unique: [true, "The code already exists"]
    },
    discountPercentage: {
        type: Number,
        required: [true, 'Discount percentage is required.'],
        min: [1, 'Discount percentage must be at least 1.'],
        max: [100, 'Discount percentage must be at most 100.']
    },
    isOneTime: {
        type: Boolean,
        required: [true, 'isOneTime is required.'],
        default: false
    },
    description: {
        type: String,
        maxlength: [255, 'Description cannot exceed 255 characters.']
    },
    discountLogo: {
        imageUrl: {
            type: String,
            required: [true, 'Image URL is required.']
        },
        publicId: {
            type: String,
            required: [true, 'Public ID is required.']
        }
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required.']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required.']
    },
    createdAt: {
        type: Date,
        required: [true, 'Creation date is required.'],
        default: Date.now
    }
});

const Discount = mongoose.model('DiscountCode', discountSchema);

module.exports = Discount;
