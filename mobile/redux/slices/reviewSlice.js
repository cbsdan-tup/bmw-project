import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks for reviews
export const fetchReviewsByCarId = createAsyncThunk(
  'reviews/fetchByCarId',
  async (carId, { rejectWithValue }) => {
    try {
      console.log(`Fetching reviews for car ID: ${carId}`);

      const response = await api.get(`/reviews/${carId}`);
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

// New async thunk for fetching user reviews
export const fetchUserReviews = createAsyncThunk(
  'reviews/fetchUserReviews',
  async (userId, { rejectWithValue }) => {
    try {
      console.log(`Fetching reviews for user ID: ${userId}`);

      const response = await api.get(`/reviews/user/${userId}`);

      if (!response.data || !response.data.reviews) {
        console.warn('Unexpected response format:', response.data);
        return [];
      }
      
      return response.data.reviews;
    } catch (error) {
      console.error('Error fetching user reviews:', error.response || error);
      return rejectWithValue(error.response?.data || 'Failed to fetch user reviews');
    }
  }
);

export const addReview = createAsyncThunk(
  'reviews/add',
  async (reviewData, { rejectWithValue }) => {
    try {
      const response = await api.post('/reviews', reviewData);
      return response.data.review;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to add review');
    }
  }
);

// Update the update review thunk to handle FormData for images
export const updateReview = createAsyncThunk(
  'reviews/updateReview',
  async ({ reviewId, reviewData, isFormData = false }, { rejectWithValue }) => {
    try {
      console.log(`Updating review ID: ${reviewId}`);
      
      let response;
      if (isFormData) {
        response = await api.put(`reviews/${reviewId}`, reviewData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await api.put(`reviews/${reviewId}`, reviewData);
      }
      
      console.log('Update review response:', response.data);
      return response.data.review;
    } catch (error) {
      console.error('Error updating review:', error.response || error);
      return rejectWithValue(error.response?.data || 'Failed to update review');
    }
  }
);

// New async thunk for creating a review
export const createReview = createAsyncThunk(
  'reviews/createReview',
  async (reviewData, { rejectWithValue }) => {
    try {
      console.log('Creating new review');
      
      const response = await api.post('/reviews/create', reviewData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Create review response:', response.data);
      return response.data.review;
    } catch (error) {
      console.error('Error creating review:', error.response || error);
      return rejectWithValue(error.response?.data || 'Failed to create review');
    }
  }
);

const initialState = {
  reviews: [],
  userReviews: [], 
  userReviewsCount: 0,
  loading: false,
  userReviewsLoading: false, 
  error: null,
  userReviewsError: null, 
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
    clearUserReviews: (state) => {
      state.userReviews = [];
    },
    clearError: (state) => {
      state.error = null;
      state.userReviewsError = null;
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
      
      // User reviews cases
      .addCase(fetchUserReviews.pending, (state) => {
        state.userReviewsLoading = true;
        state.userReviewsError = null;
      })
      .addCase(fetchUserReviews.fulfilled, (state, action) => {
        state.userReviewsLoading = false;
        state.userReviews = action.payload || [];
        state.userReviewsCount = state.userReviews.length;
      })
      .addCase(fetchUserReviews.rejected, (state, action) => {
        state.userReviewsLoading = false;
        state.userReviewsError = action.payload?.message || action.error?.message || 'Failed to fetch user reviews';
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
      })
      
      // Update review cases
      .addCase(updateReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update in reviews array if present
        const reviewIndex = state.reviews.findIndex(review => review._id === action.payload._id);
        if (reviewIndex !== -1) {
          state.reviews[reviewIndex] = action.payload;
          
          // Recalculate average rating if reviews updated
          if (state.reviews.length > 0) {
            const sum = state.reviews.reduce((total, review) => total + review.rating, 0);
            state.averageRating = sum / state.reviews.length;
          }
        }
        
        // Update in userReviews array if present
        const userReviewIndex = state.userReviews.findIndex(review => review._id === action.payload._id);
        if (userReviewIndex !== -1) {
          state.userReviews[userReviewIndex] = action.payload;
        }
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.error?.message || 'Failed to update review';
      })
      
      // Create review cases
      .addCase(createReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add to user reviews
        state.userReviews.unshift(action.payload);
        state.userReviewsCount = state.userReviews.length;
        
        // Add to car reviews if it matches the currently viewed car
        if (state.reviews.length > 0 && action.payload.rental && action.payload.rental.car) {
          const carId = state.reviews[0]?.rental?.car?._id;
          if (carId && carId === action.payload.rental.car._id) {
            state.reviews.unshift(action.payload);
            
            // Recalculate average
            const sum = state.reviews.reduce((total, review) => total + review.rating, 0);
            state.averageRating = sum / state.reviews.length;
          }
        }
      })
      .addCase(createReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.error?.message || 'Failed to create review';
      });
  }
});

export const { clearReviews, clearUserReviews, clearError } = reviewSlice.actions;

export default reviewSlice.reducer;
