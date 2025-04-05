const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Car = require('../models/Cars');
const cloudinary = require('cloudinary').v2;
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

// Car brands and models database
const carDatabase = {
  Toyota: {
    models: {
      'Vios': {
        type: 'Sedan',
        priceRange: { min: 800, max: 1500 },
        displacement: { min: 1300, max: 1500 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol'],
        description: 'The Toyota Vios is a subcompact sedan known for its reliability and fuel efficiency. Perfect for city driving and everyday use.'
      },
      'Fortuner': {
        type: 'SUV',
        priceRange: { min: 2000, max: 3500 },
        displacement: { min: 2400, max: 2800 },
        seatCapacity: 7,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Diesel'],
        description: 'The Toyota Fortuner is a mid-size SUV with excellent off-road capabilities. Spacious interior and commanding presence on the road.'
      },
      'Land Cruiser': {
        type: 'SUV',
        priceRange: { min: 5000, max: 8000 },
        displacement: { min: 4000, max: 5700 },
        seatCapacity: 8,
        transmissions: ['Automatic'],
        fuels: ['Petrol', 'Diesel'],
        description: 'The Toyota Land Cruiser is a premium full-size SUV with unmatched reliability and off-road capabilities. Luxury and performance combined.'
      }
    }
  },
  Honda: {
    models: {
      'Civic': {
        type: 'Sedan',
        priceRange: { min: 1500, max: 2500 },
        displacement: { min: 1500, max: 1800 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol'],
        description: 'The Honda Civic is a compact sedan with sporty styling and performance. Fuel-efficient and loaded with technology features.'
      },
      'CR-V': {
        type: 'SUV',
        priceRange: { min: 2500, max: 3500 },
        displacement: { min: 1500, max: 2000 },
        seatCapacity: 5,
        transmissions: ['Automatic'],
        fuels: ['Petrol', 'Diesel'],
        description: 'The Honda CR-V is a compact SUV with ample cargo space and passenger comfort. Ideal for family trips and city driving.'
      },
      'City': {
        type: 'Sedan',
        priceRange: { min: 1000, max: 1800 },
        displacement: { min: 1300, max: 1500 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol'],
        description: 'The Honda City is a subcompact sedan that offers excellent fuel economy and a comfortable ride. Perfect for daily commuting.'
      }
    }
  },
  BMW: {
    models: {
      '3 Series': {
        type: 'Sedan',
        priceRange: { min: 4000, max: 6000 },
        displacement: { min: 1500, max: 3000 },
        seatCapacity: 5,
        transmissions: ['Automatic'],
        fuels: ['Petrol', 'Diesel', 'Plugin Hybrid'],
        description: 'The BMW 3 Series is a luxury compact sedan known for its dynamic handling and premium features. The ultimate driving machine.'
      },
      'X5': {
        type: 'SUV',
        priceRange: { min: 6000, max: 10000 },
        displacement: { min: 2000, max: 4400 },
        seatCapacity: 7,
        transmissions: ['Automatic'],
        fuels: ['Petrol', 'Diesel', 'Plugin Hybrid'],
        description: 'The BMW X5 is a luxury midsize SUV with powerful performance and elegant styling. Perfect blend of luxury, technology, and capability.'
      },
      'M4': {
        type: 'Sport Car',
        priceRange: { min: 8000, max: 12000 },
        displacement: { min: 3000, max: 3200 },
        seatCapacity: 4,
        transmissions: ['Automatic'],
        fuels: ['Petrol'],
        description: 'The BMW M4 is a high-performance luxury coupe with track-ready capabilities. Thrilling acceleration and precise handling.'
      }
    }
  },
  Mercedes: {
    models: {
      'C-Class': {
        type: 'Sedan',
        priceRange: { min: 4500, max: 7000 },
        displacement: { min: 1500, max: 3000 },
        seatCapacity: 5,
        transmissions: ['Automatic'],
        fuels: ['Petrol', 'Diesel', 'Plugin Hybrid'],
        description: 'The Mercedes-Benz C-Class is a luxury compact sedan with elegant design and advanced technology. Refined comfort and performance.'
      },
      'GLC': {
        type: 'SUV',
        priceRange: { min: 5500, max: 8500 },
        displacement: { min: 1500, max: 3000 },
        seatCapacity: 5,
        transmissions: ['Automatic'],
        fuels: ['Petrol', 'Diesel', 'Plugin Hybrid'],
        description: 'The Mercedes-Benz GLC is a luxury compact SUV with stylish design and a comfortable ride. Perfect blend of versatility and sophistication.'
      },
      'AMG GT': {
        type: 'Sport Car',
        priceRange: { min: 12000, max: 18000 },
        displacement: { min: 4000, max: 4500 },
        seatCapacity: 2,
        transmissions: ['Automatic'],
        fuels: ['Petrol'],
        description: 'The Mercedes-AMG GT is a high-performance sports car with breathtaking design and exhilarating performance. A true masterpiece of engineering.'
      }
    }
  },
  Ford: {
    models: {
      'Ranger': {
        type: 'SUV',
        priceRange: { min: 1800, max: 3000 },
        displacement: { min: 2000, max: 3200 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Diesel'],
        description: 'The Ford Ranger is a mid-size pickup truck with impressive towing capacity and off-road capabilities. Built tough for work and adventure.'
      },
      'Everest': {
        type: 'SUV',
        priceRange: { min: 2500, max: 4000 },
        displacement: { min: 2000, max: 3200 },
        seatCapacity: 7,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Diesel'],
        description: 'The Ford Everest is a mid-size SUV with excellent off-road capabilities and spacious interior. Perfect for family adventures.'
      },
      'Mustang': {
        type: 'Sport Car',
        priceRange: { min: 5000, max: 8000 },
        displacement: { min: 2300, max: 5700 },
        seatCapacity: 4,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol'],
        description: 'The Ford Mustang is an iconic sports car with powerful performance and head-turning design. American muscle at its finest.'
      }
    }
  },
  Mitsubishi: {
    models: {
      'Mirage': {
        type: 'Sedan',
        priceRange: { min: 600, max: 1000 },
        displacement: { min: 1000, max: 1200 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol'],
        description: 'The Mitsubishi Mirage is a subcompact car with exceptional fuel efficiency and affordable price. Economical and practical for city driving.'
      },
      'Montero Sport': {
        type: 'SUV',
        priceRange: { min: 2200, max: 3800 },
        displacement: { min: 2400, max: 2500 },
        seatCapacity: 7,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Diesel'],
        description: 'The Mitsubishi Montero Sport is a mid-size SUV with robust design and reliable performance. Built to handle various terrains with confidence.'
      },
      'Xpander': {
        type: 'SUV',
        priceRange: { min: 1200, max: 1800 },
        displacement: { min: 1500, max: 1600 },
        seatCapacity: 7,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol'],
        description: 'The Mitsubishi Xpander is a compact MPV with dynamic styling and spacious interior. Versatile and practical for family use.'
      }
    }
  },
  Nissan: {
    models: {
      'Navara': {
        type: 'SUV',
        priceRange: { min: 1800, max: 2800 },
        displacement: { min: 2300, max: 2500 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Diesel'],
        description: 'The Nissan Navara is a rugged pickup truck with car-like comfort and impressive capability. Built for both work and leisure.'
      },
      'Terra': {
        type: 'SUV',
        priceRange: { min: 2200, max: 3500 },
        displacement: { min: 2300, max: 2500 },
        seatCapacity: 7,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Diesel'],
        description: 'The Nissan Terra is a mid-size SUV with excellent off-road performance and spacious cabin. Perfect for family adventures.'
      },
      'GT-R': {
        type: 'Sport Car',
        priceRange: { min: 10000, max: 15000 },
        displacement: { min: 3800, max: 3900 },
        seatCapacity: 4,
        transmissions: ['Automatic'],
        fuels: ['Petrol'],
        description: 'The Nissan GT-R is a high-performance sports car with legendary status. Known as Godzilla, it delivers phenomenal speed and handling.'
      }
    }
  },
  Hyundai: {
    models: {
      'Accent': {
        type: 'Sedan',
        priceRange: { min: 900, max: 1500 },
        displacement: { min: 1400, max: 1600 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol', 'Diesel'],
        description: 'The Hyundai Accent is a subcompact sedan with modern design and good fuel economy. Reliable and value-packed for everyday driving.'
      },
      'Tucson': {
        type: 'SUV',
        priceRange: { min: 1800, max: 2800 },
        displacement: { min: 1600, max: 2200 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol', 'Diesel'],
        description: 'The Hyundai Tucson is a compact SUV with bold styling and comfortable interior. Packed with technology and safety features.'
      },
      'Santa Fe': {
        type: 'SUV',
        priceRange: { min: 2500, max: 4000 },
        displacement: { min: 2000, max: 2500 },
        seatCapacity: 7,
        transmissions: ['Automatic'],
        fuels: ['Petrol', 'Diesel'],
        description: 'The Hyundai Santa Fe is a mid-size SUV with premium features and spacious cabin. Elegant design with advanced safety technology.'
      }
    }
  },
  Kia: {
    models: {
      'Soluto': {
        type: 'Sedan',
        priceRange: { min: 800, max: 1200 },
        displacement: { min: 1300, max: 1400 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol'],
        description: 'The Kia Soluto is a subcompact sedan with modern features and affordable price. Practical and economical for daily commuting.'
      },
      'Sportage': {
        type: 'SUV',
        priceRange: { min: 1800, max: 2800 },
        displacement: { min: 1600, max: 2200 },
        seatCapacity: 5,
        transmissions: ['Manual', 'Automatic'],
        fuels: ['Petrol', 'Diesel'],
        description: 'The Kia Sportage is a compact SUV with distinctive design and versatile performance. Stylish exterior with a feature-rich interior.'
      },
      'Carnival': {
        type: 'SUV',
        priceRange: { min: 2500, max: 4500 },
        displacement: { min: 2200, max: 3500 },
        seatCapacity: 7,
        transmissions: ['Automatic'],
        fuels: ['Petrol', 'Diesel'],
        description: 'The Kia Carnival is a premium minivan with upscale amenities and spacious interior. The ultimate family vehicle with SUV styling.'
      }
    }
  },
  Tesla: {
    models: {
      'Model 3': {
        type: 'Sedan',
        priceRange: { min: 5000, max: 7500 },
        displacement: { min: 1, max: 1 }, // Electric doesn't have displacement, but schema requires it
        seatCapacity: 5,
        transmissions: ['Automatic'],
        fuels: ['Electric'],
        description: 'The Tesla Model 3 is an all-electric compact sedan with cutting-edge technology and impressive range. Zero emissions with exhilarating performance.'
      },
      'Model Y': {
        type: 'SUV',
        priceRange: { min: 6000, max: 8500 },
        displacement: { min: 1, max: 1 },
        seatCapacity: 5,
        transmissions: ['Automatic'],
        fuels: ['Electric'],
        description: 'The Tesla Model Y is an all-electric compact SUV with versatile interior space and long-range capability. Sustainable transportation for the modern family.'
      },
      'Model S': {
        type: 'Sedan',
        priceRange: { min: 8000, max: 12000 },
        displacement: { min: 1, max: 1 },
        seatCapacity: 5,
        transmissions: ['Automatic'],
        fuels: ['Electric'],
        description: 'The Tesla Model S is a premium all-electric sedan with ludicrous acceleration and cutting-edge autonomous features. A technological marvel.'
      }
    }
  }
};

// Philippine locations for pickup
const pickupLocations = [
  'Makati City, Metro Manila',
  'Quezon City, Metro Manila',
  'Taguig City, Metro Manila',
  'Pasig City, Metro Manila',
  'Mandaluyong City, Metro Manila',
  'Manila City, Metro Manila',
  'Pasay City, Metro Manila',
  'Paranaque City, Metro Manila',
  'Alabang, Muntinlupa City',
  'BGC, Taguig City',
  'Eastwood, Quezon City',
  'Ortigas Center, Pasig City',
  'Cebu City, Cebu',
  'Davao City, Davao',
  'Baguio City, Benguet',
  'Tagaytay City, Cavite',
  'Angeles City, Pampanga',
  'Iloilo City, Iloilo',
  'Bacolod City, Negros Occidental',
  'Cagayan de Oro City, Misamis Oriental'
];

// Standard terms and conditions
const termsAndConditions = [
  'Must be 21 years or older with valid driver\'s license. Security deposit of PHP 5,000 required. No smoking in the vehicle. Return with same fuel level. Late returns charged PHP 500/hour.',
  'Driver must be at least 23 years old with 2+ years of driving experience. Full tank policy. PHP 10,000 security deposit. Additional driver fee of PHP 500/day. Daily mileage limit of 200km.',
  'Valid Philippine or International driver\'s license required. Security deposit via credit card authorization. Return to same location. Cleaning fee for excessive dirt. No pets allowed.',
  'Minimum age 25 for luxury vehicles. Security deposit of PHP 20,000. Premium fuel required. No off-road driving. PHP 15/km charge for excess mileage beyond 150km/day.',
  'Valid ID and credit card required for rental. PHP 8,000 security deposit. Fuel should be at same level upon return. Late return fee of PHP 800/hour. No pets or smoking in vehicle.'
];

// Single placeholder image for all cars
const placeholderImage = {
  public_id: 'car_images/car-placeholder',
  url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/car_images/car-placeholder.png`
};

// Function to upload placeholder image from the images folder
async function ensurePlaceholderImage() {
  try {
    // Get the proper path to the placeholder image
    const placeholderPath = path.resolve(__dirname, '../images/car-placeholder.png');
    console.log('Looking for placeholder image at:', placeholderPath);
    
    // Check if the file exists
    if (fs.existsSync(placeholderPath)) {
      console.log('Found placeholder image, uploading to Cloudinary...');
      try {
        // Upload the actual image file to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(placeholderPath, {
          folder: 'car_images',
          public_id: 'car-placeholder',
          overwrite: true
        });
        
        console.log('Successfully uploaded placeholder image:', uploadResult.public_id);
        return {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url
        };
      } catch (uploadError) {
        console.error('Error uploading placeholder image:', uploadError);
        return placeholderImage; // Fall back to default placeholder
      }
    } else {
      console.error('Placeholder image not found at:', placeholderPath);
      console.log('Creating images directory if it doesn\'t exist...');
      
      // Create the images directory if it doesn't exist
      const imagesDir = path.resolve(__dirname, '../images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      // Fall back to creating a simple placeholder if file doesn't exist
      console.log('Using a generated placeholder image instead');
      return createGeneratedPlaceholder();
    }
  } catch (error) {
    console.error('Unexpected error in placeholder creation:', error);
    return placeholderImage; // Fall back to default placeholder
  }
}

// Helper function to create a generated placeholder as fallback
async function createGeneratedPlaceholder() {
  try {
    // Create a simple colored square as a placeholder
    const dataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TtaIVBTuIOGSoThZERRylikWwUNoKrTqYXPohNGlIUlwcBdeCgx+LVQcXZ10dXAVB8APE0clJ0UVK/F9SaBHjwXE/3t173L0DhGaVqWbPOKBqlpFOxMVcflUMvCKIEYQxICIzy5iTpBQ8x9c9fHy9i/Es73N/jgG1YDLAJxLPMd2wiDeIZzYtnfM+cZSVJIX4nHjcoAsSP3JddvmNc9FhP8+MGpn0PHGUWCh2sNzBrGSoxFPEMUXVKF/Iuqxw3uKsVmqsdU/+wlBeW0lzneYI4lhCAkmIkFFDGRVYiNGqkWIiTfsJD/+Q40+SSyZXGYwcC6hCheT4wf/gd7dmcXLCTQrGgeCLbX+MAsFdoNWw7e9j226dAP5n4Err+GtNIP5JerOjRY+AgW3g4rqjKXvA5Q4w9KTLhuxIfppCsQi8n9E35YDBW6B/ze2tvY/TByBLXaVvgINDYLxE2Wse7+7p7u3fM+3+fgDIPnLGGteRtQAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+gFBAwEHFKh954AAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAABFUlEQVR42u3asQ3CMBCFYTtSZIAMAV0KxAQZICMwD0VACR0dI1AxQVIQpFBiyS+KSBEFsv1f+xu8u+edVErTtK21tmytHfS3BhEZRaQrpXzMzJXu3JrznPO2073qumZrrd1pFYBzrmqaJggAj/y+CcBrHbsEcP8Nw66u666UMgwRdCGCRhG0QAStEEEzRNAOEQhABAIQgQBEIAARCEAEAhCBAEQgABEIQAQCEIEARCAAEQhABAIQgQBEIAARCEAEAhCBAEQgABEIQAQCEIEARCAAEQjwK8A0TSt92mxrLXmeX79/pQ8A9Pf5nQOYx3HcNE1z0MdR5nk+ptT3/Z4IWiCC45/vV9d1R+fcNedcHfkCPgFZubtHIUqKZAAAAABJRU5ErkJggg==';
    
    console.log('Uploading a generated placeholder image to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(dataURL, {
      folder: 'car_images',
      public_id: 'car-placeholder',
      overwrite: true
    });
    
    console.log('Successfully created generated placeholder:', uploadResult.public_id);
    return {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url
    };
  } catch (uploadError) {
    console.error('Error uploading generated placeholder:', uploadError);
    
    // If all else fails, use a hardcoded fallback
    return {
      public_id: 'placeholder',
      url: 'https://res.cloudinary.com/dodljgvyh/image/upload/v1/placeholder'
    };
  }
}

// Helper functions
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomYear() {
  return getRandomInt(2015, new Date().getFullYear());
}

// Fixed mileage function to ensure mileage is always at least 1
function getRandomMileage(year) {
  const age = new Date().getFullYear() - year;
  const baseMileage = 10000; // 10,000 km per year
  
  // For new cars (current year), set a minimum mileage range
  if (age === 0) {
    return getRandomInt(100, 500); // New cars still have some mileage from testing/delivery
  }
  
  // For older cars, calculate based on age but ensure minimum value
  const minMileage = Math.max(1000, Math.floor(age * baseMileage * 0.5));
  const maxMileage = Math.max(minMileage + 1000, Math.floor(age * baseMileage * 1.5));
  
  return getRandomInt(minMileage, maxMileage);
}

async function generateCarsForUsers() {
  try {
    // Ensure we have a placeholder image
    console.log('Setting up placeholder image...');
    const imageData = await ensurePlaceholderImage();
    console.log('Using image:', imageData);
    
    // Prepare three image variations (front, side, interior) using the same placeholder
    const standardImageSet = [
      { public_id: imageData.public_id, url: imageData.url },
      { public_id: imageData.public_id, url: imageData.url },
      { public_id: imageData.public_id, url: imageData.url }
    ];
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users. Generating cars for each...`);
    
    let totalCarsCreated = 0;
    
    for (const user of users) {
      console.log(`Generating cars for user: ${user.firstName} ${user.lastName} (${user.email})`);
      
      // Generate 3 cars per user
      const carsToCreate = 3;
      let userCarsCreated = 0;
      
      // Create a set to track which brand/models we've already created for this user
      const userCarTracker = new Set();
      
      for (let i = 0; i < carsToCreate; i++) {
        // Randomly select a brand
        const brands = Object.keys(carDatabase);
        let randomBrand, randomModel, carDetails;
        
        // Ensure unique brand/model combinations for each user
        do {
          randomBrand = getRandomElement(brands);
          const models = Object.keys(carDatabase[randomBrand].models);
          randomModel = getRandomElement(models);
          carDetails = carDatabase[randomBrand].models[randomModel];
          
          // Create a unique key for this brand/model
          const carKey = `${randomBrand}-${randomModel}`;
          
          // If we haven't used this brand/model for this user yet, proceed
          if (!userCarTracker.has(carKey)) {
            userCarTracker.add(carKey);
            break;
          }
          
          // If we've tried too many times, just proceed (safeguard against infinite loop)
          if (userCarTracker.size >= 20) break;
          
        } while (true);
        
        // Generate car details
        const year = getRandomYear();
        const mileage = getRandomMileage(year); // This now ensures mileage is at least 1
        const transmission = getRandomElement(carDetails.transmissions);
        const fuel = getRandomElement(carDetails.fuels);
        const displacement = getRandomInt(carDetails.displacement.min, carDetails.displacement.max);
        
        // Fix price calculation - use the range values directly as PHP per day
        // instead of multiplying by 100, which made prices too high
        const pricePerDay = getRandomInt(carDetails.priceRange.min, carDetails.priceRange.max) * 10; // Convert to PHP with a smaller multiplier
        
        const termsAndCondition = getRandomElement(termsAndConditions);
        const pickUpLocation = getRandomElement(pickupLocations);
        
        // Create the car using the standard image set for all cars
        const car = new Car({
          isActive: true,
          images: standardImageSet,
          isAutoApproved: true,
          pricePerDay: pricePerDay,
          vehicleType: carDetails.type,
          brand: randomBrand,
          year: year,
          model: randomModel,
          seatCapacity: carDetails.seatCapacity,
          transmission: transmission,
          fuel: fuel,
          displacement: displacement,
          mileage: mileage,
          description: carDetails.description,
          termsAndConditions: termsAndCondition,
          pickUpLocation: pickUpLocation,
          owner: user._id
        });
        
        await car.save();
        userCarsCreated++;
        totalCarsCreated++;
        console.log(`Created ${randomBrand} ${randomModel} (${year}) for user ${user.email}`);
      }
      
      console.log(`Created ${userCarsCreated} cars for user ${user.email}`);
    }
    
    console.log(`Car generation complete. Created ${totalCarsCreated} cars total.`);
    
  } catch (error) {
    console.error('Error generating cars:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
generateCarsForUsers();
