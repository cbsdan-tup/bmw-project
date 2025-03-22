import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAllRentals = createAsyncThunk(
  'adminRentals/fetchAll',
  async ({ 
    status = 'All', 
    page = 1, 
    limit = 10, 
    searchQuery = '', 
    searchType = '',
    sort = 'createdAt:desc' 
  }, { rejectWithValue }) => {
    try {
      let url = '/admin/rentals';
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (status && status !== 'All') {
        params.append('status', status);
      }
      
      // Add pagination parameters
      params.append('page', page);
      params.append('limit', limit);
      
      // Add search parameters if provided
      if (searchQuery && searchType) {
        params.append('searchQuery', searchQuery);
        params.append('searchType', searchType);
      }
      
      // Add sort parameter
      if (sort) {
        params.append('sort', sort);
      }
      
      // Append query string if there are any parameters
      if (params.toString()) {
        url = `${url}?${params.toString()}`;
      }
      
      const { data } = await api.get(url);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch rentals');
    }
  }
);

// Get rental by ID
export const fetchRentalById = createAsyncThunk(
  'adminRentals/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/admin/rentals/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch rental details');
    }
  }
);

// Update rental status
export const updateRentalStatus = createAsyncThunk(
  'adminRentals/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      // Get token dynamically instead of using an undefined variable
      const { data } = await api.put(`/admin/rentals/${id}/status`, { status });
      return data.rental;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update rental status');
    }
  }
);

// Get rental statistics
export const fetchRentalStats = createAsyncThunk(
  'adminRentals/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/admin/rental-stats`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch rental statistics');
    }
  }
);

const initialState = {
  rentals: [],
  rentalDetails: null,
  statistics: null,
  loading: false,
  error: null,
  updateSuccess: false,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  },
};

const adminRentalSlice = createSlice({
  name: 'adminRentals',
  initialState,
  reducers: {
    clearRentalErrors: (state) => {
      state.error = null;
      state.updateSuccess = false;
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Rentals
      .addCase(fetchAllRentals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllRentals.fulfilled, (state, action) => {
        state.loading = false;
        state.rentals = action.payload.rentals || action.payload;
        
        // Update pagination info if provided
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchAllRentals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Rental By ID
      .addCase(fetchRentalById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRentalById.fulfilled, (state, action) => {
        state.loading = false;
        state.rentalDetails = action.payload;
      })
      .addCase(fetchRentalById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Rental Status
      .addCase(updateRentalStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateRentalStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.updateSuccess = true;
        
        // Update the rental in the rentals array if it exists
        const index = state.rentals.findIndex(rental => rental._id === action.payload._id);
        if (index !== -1) {
          state.rentals[index] = action.payload;
        }
        
        // Update rental details if it's the same rental
        if (state.rentalDetails && state.rentalDetails._id === action.payload._id) {
          state.rentalDetails = action.payload;
        }
      })
      .addCase(updateRentalStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.updateSuccess = false;
      })
      
      // Fetch Rental Statistics
      .addCase(fetchRentalStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRentalStats.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchRentalStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearRentalErrors, setCurrentPage } = adminRentalSlice.actions;
export default adminRentalSlice.reducer;
