import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks for fetching dashboard data
export const fetchDashboardStats = createAsyncThunk(
  'adminDashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const [userStats, carStats, rentalStats, reviewStats, salesStats] = await Promise.all([
        api.get('/admin/stats/users'),
        api.get('/admin/stats/cars'),
        api.get('/admin/stats/rentals'),
        api.get('/admin/stats/reviews'),
        api.get('/admin/stats/sales'),
      ]);
      
      return {
        users: userStats.data,
        cars: carStats.data,
        rentals: rentalStats.data,
        reviews: reviewStats.data,
        sales: salesStats.data,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch dashboard statistics');
    }
  }
);

export const fetchTopRentedCars = createAsyncThunk(
  'adminDashboard/fetchTopRentedCars',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/stats/top-rented-cars');
      return response.data.cars;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch top rented cars');
    }
  }
);

export const fetchMonthlySales = createAsyncThunk(
  'adminDashboard/fetchMonthlySales',
  async (year = new Date().getFullYear(), { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/stats/monthly-sales?year=${year}`);
      return response.data.sales;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch monthly sales data');
    }
  }
);

export const fetchUserActivity = createAsyncThunk(
  'adminDashboard/fetchUserActivity',
  async (days = 30, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/stats/user-activity?days=${days}`);
      return response.data.activity;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch user activity');
    }
  }
);

// Add a new thunk for fetching discount statistics
export const fetchDiscountStats = createAsyncThunk(
  'adminDashboard/fetchDiscountStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/stats/discounts');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch discount statistics');
    }
  }
);

// Initial state for admin dashboard
const initialState = {
  loading: false,
  error: null,
  userStats: {
    total: 0,
    active: 0,
    disabled: 0,
    newUsersThisMonth: 0,
    roleDistribution: { user: 0, admin: 0 }
  },
  carStats: {
    total: 0,
    active: 0,
    inactive: 0,
    byType: [],
    byBrand: []
  },
  rentalStats: {
    total: 0,
    active: 0,
    completed: 0,
    canceled: 0,
    pending: 0,
    averageDuration: 0
  },
  reviewStats: {
    total: 0,
    averageRating: 0,
    ratingDistribution: {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    }
  },
  salesStats: {
    totalRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    averageOrderValue: 0
  },
  topRentedCars: [],
  monthlySales: [],
  userActivity: [],
  selectedYear: new Date().getFullYear(),
  discountStats: {
    discountUsage: {
      totalDiscountedRentals: 0,
      totalSuccessfulRentals: 0,
      percentageWithDiscount: 0,
      totalDiscountAmount: 0
    },
    topDiscounts: [],
    monthlyTrends: []
  }
};

const adminDashboardSlice = createSlice({
  name: 'adminDashboard',
  initialState,
  reducers: {
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchDashboardStats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update user statistics
        if (action.payload.users) {
          state.userStats = action.payload.users.statistics;
        }
        
        // Update car statistics
        if (action.payload.cars) {
          state.carStats = action.payload.cars.statistics;
        }
        
        // Update rental statistics
        if (action.payload.rentals) {
          state.rentalStats = action.payload.rentals.statistics;
        }
        
        // Update review statistics
        if (action.payload.reviews) {
          state.reviewStats = action.payload.reviews.statistics;
        }
        
        // Update sales statistics - Fix handling of sales data
        if (action.payload.sales) {
          // Ensure we handle it properly by using the right property path
          // The API might be returning sales data in different structures
          if (action.payload.sales.statistics) {
            state.salesStats = action.payload.sales.statistics;
          } else {
            // Fallback to using direct properties if statistics is not present
            state.salesStats = {
              totalRevenue: action.payload.sales.totalRevenue || 0,
              totalDiscountAmount: action.payload.sales.totalDiscountAmount || 0,
              revenueBeforeDiscounts: action.payload.sales.revenueBeforeDiscounts || 0,
              discountPercentage: action.payload.sales.discountPercentage || 0,
              rentalsCount: action.payload.sales.rentalsCount || 0,
              averageOrderValue: action.payload.sales.averageOrderValue || 0,
              monthlySales: action.payload.sales.monthlySales || []
            };
          }
        }
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch dashboard statistics';
      })
      
      // Handle fetchTopRentedCars
      .addCase(fetchTopRentedCars.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTopRentedCars.fulfilled, (state, action) => {
        state.loading = false;
        state.topRentedCars = action.payload;
      })
      .addCase(fetchTopRentedCars.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch top rented cars';
      })
      
      // Handle fetchMonthlySales
      .addCase(fetchMonthlySales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlySales.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlySales = action.payload;
      })
      .addCase(fetchMonthlySales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch monthly sales data';
      })
      
      // Handle fetchUserActivity
      .addCase(fetchUserActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserActivity.fulfilled, (state, action) => {
        state.loading = false;
        state.userActivity = action.payload;
      })
      .addCase(fetchUserActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch user activity';
      })
      
      // Handle fetchDiscountStats
      .addCase(fetchDiscountStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDiscountStats.fulfilled, (state, action) => {
        state.loading = false;
        state.discountStats = action.payload;
      })
      .addCase(fetchDiscountStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch discount statistics';
      });
  }
});

export const { setSelectedYear, clearError } = adminDashboardSlice.actions;
export default adminDashboardSlice.reducer;
