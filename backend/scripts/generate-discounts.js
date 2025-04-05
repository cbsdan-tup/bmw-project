const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const DiscountCode = require('../models/DiscountCode');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Connect to MongoDB
console.log(`Connecting to MongoDB at: ${process.env.DB_URI ? process.env.DB_URI.substring(0, 20) + '...' : 'undefined'}`);

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Function to upload discount placeholder image
async function uploadDiscountPlaceholder() {
  try {
    // Get the proper path to the placeholder image
    const placeholderPath = path.resolve(__dirname, '../images/discount-placeholder.jpg');
    console.log('Looking for discount placeholder image at:', placeholderPath);
    
    // Check if the file exists
    if (fs.existsSync(placeholderPath)) {
      console.log('Found discount placeholder image, uploading to Cloudinary...');
      try {
        // Upload the actual image file to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(placeholderPath, {
          folder: 'discount_images',
          public_id: 'discount-placeholder',
          overwrite: true
        });
        
        console.log('Successfully uploaded discount placeholder image:', uploadResult.public_id);
        return {
          publicId: uploadResult.public_id,
          imageUrl: uploadResult.secure_url
        };
      } catch (uploadError) {
        console.error('Error uploading discount placeholder image:', uploadError);
        return createGeneratedDiscountPlaceholder();
      }
    } else {
      console.error('Discount placeholder image not found at:', placeholderPath);
      console.log('Creating images directory if it doesn\'t exist...');
      
      // Create the images directory if it doesn't exist
      const imagesDir = path.resolve(__dirname, '../images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      return createGeneratedDiscountPlaceholder();
    }
  } catch (error) {
    console.error('Unexpected error in placeholder creation:', error);
    return createGeneratedDiscountPlaceholder();
  }
}

// Helper function to create a generated discount placeholder
async function createGeneratedDiscountPlaceholder() {
  try {
    // Create a simple colored square with % symbol as a placeholder
    const dataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAGEklEQVR4nO2bW2wUVRjHf2d2drfb7V1aKNBSoFAuQkURAwpECCFKJEESTTTRxMQHE318MB2fTHgy8UEbE03UQIgPaqIYEuMFuRQQKaAUCi1QWmhLd7vXmZ3j0912pjs7O3NmZwv1/5Kms+eb7/v+55zvfOecGSGlJJOhhL2YHhOEYgD0Xhkl1hvzCdcMCHolRDn/A+ADVC1WZB/XWc6TvXdR4vE0lRMj37BRRWH3hT+x1lfR+sYSVCWabnN/G2YtGAaxTi/fvXeaWG8/QkhQFFAVEAKEAKH0Hs9aYyvtEaLX79/9/9fQnhRSCMVoR1VYv7OemvqK1HnFqG1mDEjHDcXoafmQe+vrQDEEVBLioSikFdZomxQjCCmBZBIpJQKQppZm9DALGOjuZf8rX3C7+c9UOxVFP19ZZECMaER7/dztbCPZdZdEVyey9zaJ7g5kPE7wucUEnnoa/8LFaIEgKAqKP4jimzx/Kw2Uu3c48c5PdLX3oKrKwMBLKY3uzRQDkklkPIbW04XseILW3kqs7QrxK38Qu34NCWhFxZS8sJHy7e8QmF+HUFXvk7SAKGP0HP+Vwx+fZahvwLAVjR5nxACZTJLo6iB++QJDv58h3nIROR4pqKpKaPUays5fQAuGXEzIAmI0ytnPT3H6m1+Q6tg4CkUZbIDWP0js0kVG/jhL9MJ5ZDiMKCgg9NIW/AuX4K8pp/zIUZSiYldGWEVi9C6nPznBxR9b0JTxE7NsA6SUaIO9RC6cI3L2DLHLl5DxOFpxMYHGJQSfXUagaTna9BmIoiKU0lK0GbNQK6e7M8EKQcJ3e2g+cIarvy1MJRTTE/Jkd4NyJELk3Fki588ROXeWZHc3oqCA4MpVBJc2EVi2nMCixajlFSiVkwFQq6aiTJ4ysfFD2nvqGif3HKfzylxUSyMvlclvgJQkO9qJnD1NZOLRnzUL/8JF+BctJrCsCf+ixWjTZwIgiotRyspQysp1A5wkiA4QHmL32R+4dGgJmmpdIqcZoI/8qVOE9+8jcv4cMhZDLS/Hv3AR/ro6fHPm4Js9G9/MWaplUXTBS0r1kU9vEm0TMRCN8POeE9w+P8eWeDoDpEwSv3GdyJnTRM6fJXr+HCSTiMJCfLNmE1y5isCSJQSWLcM3ew5qVRVCVa0NeBqJZKSfc/tOcee3mWhq9pjZMkDG48QuXSR85DCRs2dIdndBIoFSWoq/vp7A0iYCS5fibwyhVlQiiopsuZ0LJOPce6TQfPAMnVdqUSxmpawGJHu6iZ49Q2T/PqK/N6NomvFC07gI//IVBNetJ7huPWp1NUJTbLucCxLRPs58cZqbZ+tQFGvn5awGjLkSCqGUlREYCuGbM4+SHTsIvrABYXGzMdGIR7s5ue84d5pm2T7X1pZILdGPxKoaQps2E9qyFd+sOaZnJYYjoPV1EL98kfiN66Q+r41H2t/nQsIDjJw7Q/OP57j08wJUM/8yYPuzACklWncX0QtNDO3/iejF80jL7aYeBPyhEoZ6+rPWc0WuqXBijGRPD7G/rhK7conoxSaGDh3S62RoK2y2VXaP2nXP2D9nHkObNhPa+jrB1Wv0nV+GTnHwWbMcNnYWRUJTqdi5i+DqtQht/DtsKpxvEMzXXRXmN9XT/dcNtMIiG81NjKwGZNsMDDHR2YFv7jwLzU08LCdBSyRGGOrpt9HcxMi+CsphhCWZWU6uH5GtE+JcNGe7F/hfPQ3am3LO3gB9Vc65HZCs93L8cFxTJ2FrPZ6JATpSxvRDSvZ7udHLsTZknVN0zO+Ix+5mvBvsxu0wgZPhfspbIRvrWUckCO9NYMwBkXZ+uxDWBxTtreQWYd8EqY1Blsf4sVp5hcNA5mKA9GJTnFHgRuLtG6CTx2uA49WOPUHLcP01QCfDRVfeoXh5I5T+LDl7lmnXgKG+SMavoZ4aIAEZjxPv6sT8gzEvIUBVCJXPIVw2C5Hx24vPbwWEQJSUULL9LYQvgHAwYXmFADRFUMFc/v3oVbTuS8isvxd4fh+goj8JFA0OTLjHOcMBgcJC5KEDxR4ZYBdfvv8vfSEf3yBnIcYAAAAASUVORK5CYII=';
    
    console.log('Uploading a generated discount placeholder image to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(dataURL, {
      folder: 'discount_images',
      public_id: 'discount-placeholder',
      overwrite: true
    });
    
    console.log('Successfully created generated discount placeholder:', uploadResult.public_id);
    return {
      publicId: uploadResult.public_id,
      imageUrl: uploadResult.secure_url
    };
  } catch (uploadError) {
    console.error('Error uploading generated discount placeholder:', uploadError);
    
    // If all else fails, use a hardcoded fallback
    return {
      publicId: 'discount_images/discount-placeholder',
      imageUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/discount_images/discount-placeholder.png`
    };
  }
}

// Generate realistic discount codes
const generateDiscountCodes = () => {
  const currentDate = new Date();
  
  const discounts = [
    {
      code: 'WELCOME15',
      discountPercentage: 15,
      isOneTime: true,
      description: 'Welcome discount for new users. 15% off your first rental.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 5, 30)
    },
    {
      code: 'SUMMER2024',
      discountPercentage: 20,
      isOneTime: false,
      description: 'Summer vacation special! 20% off all rentals from June to August.',
      startDate: new Date(currentDate.getFullYear(), 5, 1), // June 1
      endDate: new Date(currentDate.getFullYear(), 7, 31) // August 31
    },
    {
      code: 'WEEKEND30',
      discountPercentage: 30,
      isOneTime: false,
      description: 'Special weekend discount! 30% off for weekend rentals (Friday to Sunday).',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 30)
    },
    {
      code: 'HOLIDAY25',
      discountPercentage: 25,
      isOneTime: false,
      description: 'Holiday season special! 25% off all rentals during December.',
      startDate: new Date(currentDate.getFullYear(), 11, 1), // December 1
      endDate: new Date(currentDate.getFullYear(), 11, 31) // December 31
    },
    {
      code: 'LONGTERM10',
      discountPercentage: 10,
      isOneTime: false,
      description: 'Special discount for long-term rentals of 7+ days. 10% off the total price.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1),
      endDate: new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1)
    },
    {
      code: 'FIRSTRIDE',
      discountPercentage: 50,
      isOneTime: true,
      description: 'Special one-time 50% discount for your very first rental! Limited time offer.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    },
    {
      code: 'PREMIUM20',
      discountPercentage: 20,
      isOneTime: false,
      description: '20% off premium car rentals. Valid for luxury and sports cars only.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 30)
    },
    {
      code: 'EARLY15',
      discountPercentage: 15,
      isOneTime: false,
      description: 'Early bird special! 15% off when you book at least 14 days in advance.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      endDate: new Date(currentDate.getFullYear() + 1, 0, 31) // Next year January 31
    },
    {
      code: 'STUDENT10',
      discountPercentage: 10,
      isOneTime: false,
      description: 'Student discount - 10% off for verified students. ID may be required.',
      startDate: new Date(currentDate.getFullYear(), 0, 1), // January 1
      endDate: new Date(currentDate.getFullYear(), 11, 31) // December 31
    },
    {
      code: 'FLASH40',
      discountPercentage: 40,
      isOneTime: false,
      description: 'Flash sale! 40% off all rentals this week only. Book now!',
      startDate: currentDate,
      endDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    {
      code: 'LOYAL25',
      discountPercentage: 25,
      isOneTime: false,
      description: 'Loyalty discount for returning customers. 25% off your next rental.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 30)
    },
    {
      code: 'MIDWEEK15',
      discountPercentage: 15,
      isOneTime: false,
      description: 'Mid-week special! 15% off rentals starting Monday through Thursday.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 30)
    },
    {
      code: 'APP10',
      discountPercentage: 10,
      isOneTime: false,
      description: 'Download our app and get 10% off your next booking!',
      startDate: new Date(currentDate.getFullYear(), 0, 1), // January 1
      endDate: new Date(currentDate.getFullYear(), 11, 31) // December 31
    },
    {
      code: 'ECO20',
      discountPercentage: 20,
      isOneTime: false,
      description: 'Go green! 20% discount on all electric and hybrid vehicle rentals.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 10, 30)
    },
    {
      code: 'BDAY30',
      discountPercentage: 30,
      isOneTime: true,
      description: 'Happy Birthday! 30% off your rental during your birthday month.',
      startDate: new Date(currentDate.getFullYear(), 0, 1), // January 1
      endDate: new Date(currentDate.getFullYear(), 11, 31) // December 31
    },
    {
      code: 'WEEKDAY10',
      discountPercentage: 10,
      isOneTime: false,
      description: 'Weekday discount! 10% off all rentals Monday through Friday.',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 30)
    }
  ];
  
  return discounts;
};

// Main function to create all discount codes
async function createDiscountCodes() {
  try {
    // Upload or create the discount logo placeholder
    console.log('Setting up discount logo placeholder...');
    const logoData = await uploadDiscountPlaceholder();
    console.log('Using logo:', logoData);
    
    // Generate discount codes
    const discountCodes = generateDiscountCodes();
    console.log(`Generated ${discountCodes.length} discount codes.`);
    
    // Save discount codes to the database
    let createdCount = 0;
    
    for (const discount of discountCodes) {
      try {
        // Add the logo data to each discount
        const discountWithLogo = {
          ...discount,
          discountLogo: {
            imageUrl: logoData.imageUrl,
            publicId: logoData.publicId
          },
          createdAt: new Date()
        };
        
        // Create the discount code in the database
        const newDiscount = await DiscountCode.create(discountWithLogo);
        createdCount++;
        console.log(`Created discount code: ${newDiscount.code} - ${newDiscount.description.substring(0, 30)}...`);
      } catch (error) {
        console.error(`Error creating discount code ${discount.code}:`, error.message);
      }
    }
    
    console.log(`Successfully created ${createdCount} discount codes.`);
  } catch (error) {
    console.error('Error generating discount codes:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
createDiscountCodes();
