import baseURL from '../services/baseUrl';
import { COMMON_COLORS } from '../styles/theme';

export const API_URL = baseURL;

// Re-export common colors from theme.js
export { COMMON_COLORS };

// Image assets
export const CAR_IMAGES = {
  placeholder: require('../assets/images/car-placeholder.png'),
};

// Check if assets are properly linked
try {
  require('../assets/images/summer-discount.png');
  require('../assets/images/weekend-special.png');
} catch (e) {
  console.warn('Warning: Some assets are missing. Please ensure all required images are in the assets folder.');
}

// App configuration
export const APP_CONFIG = {
  featuredCarsLimit: 10,
  initialPageSize: 10,
  // Add ratings configuration
  ratings: {
    excellent: 4.5,
    good: 4.0,
    average: 3.0,
    poor: 2.0
  }
};
