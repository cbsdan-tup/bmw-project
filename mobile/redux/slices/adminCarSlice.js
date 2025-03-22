import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchAllCars = createAsyncThunk(
  'adminCars/fetchAllCars',
  async ({ page = 1, limit = 10, search = '' }, { rejectWithValue }) => {
    try {            
      const response = await api.get(
        `/admin/cars?page=${page}&limit=${limit}&search=${search}`,
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
        'Failed to fetch cars'
      );
    }
  }
);

export const toggleCarStatus = createAsyncThunk(
  'adminCars/toggleCarStatus',
  async ({ carId, isActive }, { rejectWithValue }) => {
    try {            
      const response = await api.put(
        `/admin/cars/${carId}/status`,
        { isActive },
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
        'Failed to update car status'
      );
    }
  }
);

export const deleteCar = createAsyncThunk(
  'adminCars/deleteCar',
  async (carId, { rejectWithValue }) => {
    try {            
      const response = await api.delete(
        `/admin/cars/${carId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return { ...response.data, carId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete car'
      );
    }
  }
);

// New actions
export const fetchCarById = createAsyncThunk(
  'adminCars/fetchCarById',
  async (carId, { rejectWithValue }) => {
    try {            
      const response = await api.get(`/admin/cars/${carId}`);
      return response.data.car;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch car details'
      );
    }
  }
);

export const updateCar = createAsyncThunk(
  'adminCars/updateCar',
  async ({ carId, carData }, { rejectWithValue }) => {
    try {            
      const response = await api.put(
        `/admin/cars/${carId}`,
        carData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to update car'
      );
    }
  }
);

export const fetchCarRentals = createAsyncThunk(
  'adminCars/fetchCarRentals',
  async (carId, { rejectWithValue }) => {
    try {            
      const response = await api.get(`/admin/cars/${carId}/rentals`);
      return response.data.rentals;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch car rentals'
      );
    }
  }
);

// Add this new async thunk
export const createNewCar = createAsyncThunk(
  'adminCars/createNewCar',
  async (carData, { rejectWithValue }) => {
    try {            
      const response = await api.post(
        `/admin/cars`,
        carData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to create car'
      );
    }
  }
);

// Initial state
const initialState = {
  cars: [],
  carDetails: null,
  rentals: [],
  loading: false,
  error: null,
  pagination: {
    totalCars: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10
  }
};

// Admin car slice
const adminCarSlice = createSlice({
  name: 'adminCars',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCarErrors: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all cars
      .addCase(fetchAllCars.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCars.fulfilled, (state, action) => {
        state.loading = false;
        state.cars = action.payload.cars;
        state.pagination = {
          totalCars: action.payload.totalCars,
          totalPages: action.payload.totalPages,
          currentPage: action.payload.currentPage,
          limit: action.payload.limit || 10
        };
      })
      .addCase(fetchAllCars.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Toggle car status
      .addCase(toggleCarStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleCarStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCar = action.payload.car;
        
        // Update the car in the state
        state.cars = state.cars.map(car => 
          car._id === updatedCar._id ? updatedCar : car
        );
      })
      .addCase(toggleCarStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete car
      .addCase(deleteCar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCar.fulfilled, (state, action) => {
        state.loading = false;
        
        // Remove the deleted car from the state
        state.cars = state.cars.filter(car => 
          car._id !== action.payload.carId
        );
        
        // Update the total count
        if (state.pagination.totalCars > 0) {
          state.pagination.totalCars -= 1;
          state.pagination.totalPages = Math.ceil(
            state.pagination.totalCars / state.pagination.limit
          );
        }
      })
      .addCase(deleteCar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch car by ID
      .addCase(fetchCarById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCarById.fulfilled, (state, action) => {
        state.loading = false;
        state.carDetails = action.payload;
      })
      .addCase(fetchCarById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update car
      .addCase(updateCar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCar.fulfilled, (state, action) => {
        state.loading = false;
        state.carDetails = action.payload.car;
        
        // Also update in the cars list if present
        if (state.cars.length > 0) {
          state.cars = state.cars.map(car => 
            car._id === action.payload.car._id ? action.payload.car : car
          );
        }
      })
      .addCase(updateCar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch car rentals
      .addCase(fetchCarRentals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCarRentals.fulfilled, (state, action) => {
        state.loading = false;
        state.rentals = action.payload;
      })
      .addCase(fetchCarRentals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create new car
      .addCase(createNewCar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewCar.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add the new car to the state if on the first page
        if (state.pagination.currentPage === 1 && state.cars.length > 0) {
          state.cars = [action.payload.car, ...state.cars];
          
          // If we're at the limit per page, remove the last car
          if (state.cars.length > state.pagination.limit) {
            state.cars.pop();
          }
        }
        
        // Update the total count
        state.pagination.totalCars += 1;
        state.pagination.totalPages = Math.ceil(
          state.pagination.totalCars / state.pagination.limit
        );
      })
      .addCase(createNewCar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, clearCarErrors } = adminCarSlice.actions;

export default adminCarSlice.reducer;
