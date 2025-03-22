import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchAllReviews = createAsyncThunk(
  'adminReviews/fetchAllReviews',
  async ({ page = 1, limit = 10, search = '', searchMode = 'all', sort = 'newest' }, { rejectWithValue }) => {
    try {            
      // Build the query string with search parameters and sorting
      let queryString = `/admin/reviews?page=${page}&limit=${limit}`;
      
      if (search) {
        queryString += `&search=${encodeURIComponent(search)}`;
        if (searchMode !== 'all') {
          queryString += `&searchMode=${searchMode}`;
        }
      }
      
      if (sort) {
        queryString += `&sort=${sort}`;
      }
      
      const response = await api.get(
        queryString,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch reviews'
      );
    }
  }
);

export const deleteReview = createAsyncThunk(
  'adminReviews/deleteReview',
  async (reviewId, { rejectWithValue }) => {
    try {            
      const response = await api.delete(
        `/reviews/${reviewId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return { ...response.data, reviewId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete review'
      );
    }
  }
);

export const fetchReviewById = createAsyncThunk(
  'adminReviews/fetchReviewById',
  async (reviewId, { rejectWithValue }) => {
    try {            
      const response = await api.get(`/reviews/review/${reviewId}`);
      return response.data.review;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch review details'
      );
    }
  }
);

// Initial state
const initialState = {
  reviews: [],
  reviewDetails: null,
  loading: false,
  error: null,
  pagination: {
    totalReviews: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10
  },
  sort: 'newest' // Add default sort option
};

// Admin review slice
const adminReviewSlice = createSlice({
  name: 'adminReviews',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearReviewErrors: (state) => {
      state.error = null;
    },
    setSortOption: (state, action) => {
      state.sort = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all reviews
      .addCase(fetchAllReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload.reviews;
        state.sort = action.payload.sort || 'newest';
        state.pagination = {
          totalReviews: action.payload.totalReviews,
          totalPages: action.payload.totalPages,
          currentPage: action.payload.currentPage,
          limit: action.payload.limit || 10
        };
      })
      .addCase(fetchAllReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete review
      .addCase(deleteReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading = false;
        
        // Remove the deleted review from the state
        state.reviews = state.reviews.filter(review => 
          review._id !== action.payload.reviewId
        );
        
        // Update the total count
        if (state.pagination.totalReviews > 0) {
          state.pagination.totalReviews -= 1;
          state.pagination.totalPages = Math.ceil(
            state.pagination.totalReviews / state.pagination.limit
          );
        }
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch review by ID
      .addCase(fetchReviewById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewById.fulfilled, (state, action) => {
        state.loading = false;
        state.reviewDetails = action.payload;
      })
      .addCase(fetchReviewById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
  }
});

export const { clearError, clearReviewErrors, setSortOption } = adminReviewSlice.actions;

export default adminReviewSlice.reducer;
