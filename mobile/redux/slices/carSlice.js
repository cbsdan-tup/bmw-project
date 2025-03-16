import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../config/constants';

// Async thunks for API calls
export const fetchFeaturedCars = createAsyncThunk(
  'cars/fetchFeatured',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/Cars/featured`);
      
      // Process each car's images
      const cars = response.data.cars.map(car => {
        if (car.images && Array.isArray(car.images)) {
          car.images = car.images.map(image => 
            typeof image === 'string' ? image : image.url
          );
        }
        return car;
      });
      
      console.log("Cars:", cars);
      return cars;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch featured cars');
    }
  }
);

export const fetchFilteredCars = createAsyncThunk(
  'cars/fetchFiltered',
  async (filterParams, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(filterParams).filter(([_, v]) => v))
      ).toString();
      const response = await axios.get(`${API_URL}/Cars/filter?${query}`);
      return response.data.cars;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch filtered cars');
    }
  }
);

export const fetchCarByID = createAsyncThunk(
  'cars/fetchById',
  async (carId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/Cars/${carId}`);
      
      // Transform the car data to ensure images are in the expected format
      const car = response.data.car;
      
      // Process images to ensure consistent format (always use url string)
      if (car && car.images && Array.isArray(car.images)) {
        car.images = car.images.map(image => 
          typeof image === 'string' ? image : image.url
        );
      }
      
      return car;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch car details');
    }
  }
);

const initialState = {
  featuredCars: [],
  filteredCars: [],
  currentCar: null,
  favorites: [],
  loading: false,
  error: null,
  filterParams: {
    transmission: "",
    pickUpLocation: "",
    brand: "",
    pricePerDay: "",
    year: "",
    rating: ""
  }
};

const carSlice = createSlice({
  name: 'cars',
  initialState,
  reducers: {
    setFilterParams: (state, action) => {
      state.filterParams = { ...state.filterParams, ...action.payload };
    },
    resetFilters: (state) => {
      state.filterParams = initialState.filterParams;
    },
    toggleFavorite: (state, action) => {
      const carId = action.payload;
      const index = state.favorites.indexOf(carId);
      if (index !== -1) {
        state.favorites.splice(index, 1);
      } else {
        state.favorites.push(carId);
      }
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Featured cars
      .addCase(fetchFeaturedCars.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeaturedCars.fulfilled, (state, action) => {
        state.loading = false;
        state.featuredCars = action.payload;
      })
      .addCase(fetchFeaturedCars.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch featured cars';
      })
      // Filtered cars
      .addCase(fetchFilteredCars.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFilteredCars.fulfilled, (state, action) => {
        state.loading = false;
        state.filteredCars = action.payload;
      })
      .addCase(fetchFilteredCars.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch filtered cars';
      })
      // Car by ID
      .addCase(fetchCarByID.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCarByID.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCar = action.payload;
      })
      .addCase(fetchCarByID.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch car details';
      });
  }
});

export const { 
  setFilterParams,
  resetFilters,
  toggleFavorite,
  clearError
} = carSlice.actions;

export default carSlice.reducer;
