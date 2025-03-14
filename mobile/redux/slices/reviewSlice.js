import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../config/constants';

// Async thunks for reviews
export const fetchReviewsByCarId = createAsyncThunk(
  'reviews/fetchByCarId',
  async (carId, { rejectWithValue }) => {
    try {
      console.log(`Fetching reviews for car ID: ${carId}`);

      const response = await axios.get(`${API_URL}/reviews/${carId}`);
      console.log('Reviews API response:', response.data);
      
      if (!response.data || !response.data.reviews) {
        console.warn('Unexpected response format:', response.data);
        return [];
      }
      
      return response.data.reviews;
    } catch (error) {
      console.error('Error fetching reviews:', error.response || error);
      return rejectWithValue(error.response?.data || 'Failed to fetch reviews');
    }
  }
);

export const addReview = createAsyncThunk(
  'reviews/add',
  async (reviewData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/reviews`, reviewData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.data.review;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to add review');
    }
  }
);

const initialState = {
  reviews: [],
  loading: false,
  error: null,
  averageRating: 0
};

const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearReviews: (state) => {
      state.reviews = [];
      state.averageRating = 0;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch reviews
      .addCase(fetchReviewsByCarId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewsByCarId.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload || [];
        
        // Calculate average rating
        if (state.reviews.length > 0) {
          let totalRating = 0;
          let validRatings = 0;
          
          state.reviews.forEach(review => {
            if (review && typeof review.rating === 'number') {
              totalRating += review.rating;
              validRatings++;
            }
          });
          
          state.averageRating = validRatings > 0 ? (totalRating / validRatings) : 0;
          console.log(`Calculated average rating: ${state.averageRating} from ${validRatings} reviews`);
        } else {
          state.averageRating = 0;
        }
      })
      .addCase(fetchReviewsByCarId.rejected, (state, action) => {
        state.loading = false;
        // Ensure we always store a string in error, not an object
        state.error = action.payload?.message || action.error?.message || 'Failed to fetch reviews';
      })
      
      // Add review
      .addCase(addReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addReview.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews.push(action.payload);
        
        // Recalculate average
        const sum = state.reviews.reduce((total, review) => total + review.rating, 0);
        state.averageRating = sum / state.reviews.length;
      })
      .addCase(addReview.rejected, (state, action) => {
        state.loading = false;
        // Ensure we always store a string in error, not an object
        state.error = action.payload?.message || action.error?.message || 'Failed to add review';
      });
  }
});

export const { clearReviews, clearError } = reviewSlice.actions;

export default reviewSlice.reducer;
