const Discount = require('../models/DiscountCode');
const cloudinary = require('cloudinary'); 

exports.createDiscount = async (req, res) => {
    try {
        console.log(`Req Body: ${JSON.stringify(req.body)}`)
        console.log(`Req Files: ${JSON.stringify(req.file)}`)

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a discount logo'
            });
        }

        const fileTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!fileTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported file type! Please upload a JPEG, JPG, or PNG image.'
            });
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'discounts',
            width: 150,
            crop: "scale"
        });

        const discount = new Discount({
            code: req.body.code,
            discountPercentage: req.body.discountPercentage,
            isOneTime: req.body.isOneTime,
            description: req.body.description,
            discountLogo: {
                imageUrl: result.secure_url, 
                publicId: result.public_id 
            },
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            createdAt: new Date()
        });

        await discount.save();
        res.status(201).json({
            success: true,
            message: 'Discount created successfully',
            discount
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(error => error.message);
            return res.status(400).json({ success: false, errors: messages });
        }
    
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'The code already exists. Please choose a different code.' });
        }
    
        return res.status(500).json({ success: false, message: 'An unexpected error occurred', error: err.message });
    }
};

exports.getDiscounts = async (req, res) => {
    try {
        const discounts = await Discount.find();

        if (!discounts.length) {
            return res.status(404).json({ success: false, message: 'No discounts found.' });
        }

        res.status(200).json({
            success: true,
            discounts
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'An unexpected error occurred', error: err.message });
    }
};

exports.getDiscountById = async (req, res) => {
    try {
        const { id } = req.params;
        const discount = await Discount.findById(id);

        if (!discount) {
            return res.status(404).json({ success: false, message: 'Discount not found' });
        }

        res.status(200).json({ success: true, discount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

exports.deleteDiscount = async (req, res) => {
    console.log(`Req Params: ${JSON.stringify(req.params)}`)
    try {
        const discount = await Discount.findByIdAndDelete(req.params.id);
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found'
            })
        }
        
        return res.status(200).json({
            success: true,
            message: 'Discount deleted'
        })

    } catch (err) {
        return res.status(500).json({ success: false, message: 'An unexpected error occurred', error: err.message });
    }
}


exports.updateDiscount = async (req, res) => {
    try {
        console.log(`Req Params: ${JSON.stringify(req.params)}`)
        console.log(`Req Body: ${JSON.stringify(req.body)}`)
        console.log(`Req File: ${req.file?.length}`)
        const discountId = req.params.id;

        const discount = await Discount.findById(discountId);
        if (!discount) {
            return res.status(404).json({ success: false, message: 'Discount not found.' });
        }

        discount.code = req.body.code || discount.code;
        discount.discountPercentage = req.body.discountPercentage || discount.discountPercentage;
        discount.isOneTime = req.body.isOneTime !== undefined ? req.body.isOneTime : discount.isOneTime;
        discount.description = req.body.description || discount.description;
        discount.startDate = req.body.startDate || discount.startDate;
        discount.endDate = req.body.endDate || discount.endDate;

        if (req.file) {
            if (discount.discountLogo.publicId) {
                await cloudinary.uploader.destroy(discount.discountLogo.publicId);
            }

            const logoFile = req.file.path;
            const result = await cloudinary.uploader.upload(logoFile,  {
                folder: 'discounts',
                width: 150,
                crop: "scale"
            });
            
            discount.discountLogo = {
                imageUrl: result.secure_url,
                publicId: result.public_id
            };
        }

        await discount.save();

        res.status(200).json({
            success: true,
            message: 'Discount updated successfully.',
            discount
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(error => error.message);
            return res.status(400).json({ success: false, errors: messages });
        }
        return res.status(500).json({ success: false, message: 'An unexpected error occurred', error: err.message });
    }
};
