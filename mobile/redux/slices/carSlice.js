import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import api from '../../services/api';

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

export const toggleFavorite = createAsyncThunk(
  'cars/toggleFavorite',
  async ({ carId, userId, carDetails }, { rejectWithValue }) => {
    try {
      const response = await api.post('/favorite-car', {
        user: userId,
        car: carId
      });
            
      return { 
        carId, 
        isAdded: response.data.message.includes('added'),
        carDetails
      };
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return rejectWithValue(
        error?.message || 'Failed to update favorites. Please try again.'
      );
    }
  }
);

export const fetchUserFavorites = createAsyncThunk(
  'cars/fetchUserFavorites',
  async (userId, { rejectWithValue }) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const response = await api.get(`/favorite-cars/${userId}`);
      
      // Extract favorite car IDs for the favorites array
      const favoriteIds = response.data.favoriteCars.map(fav => fav.car._id);
      
      return {
        favoriteCarsData: response.data.favoriteCars,
        favoriteIds
      };
    } catch (error) {
      console.error('Error fetching favorite cars:', error);
      return rejectWithValue(error.response?.data || 'Failed to fetch favorite cars');
    }
  }
);

export const deleteFavoriteCar = createAsyncThunk(
  'cars/deleteFavoriteCar',
  async ({ favoriteId, carDetails }, { rejectWithValue }) => {
    try {
      await api.delete(`/favorite-car/${favoriteId}`);
      
      return { 
        favoriteId,
        carDetails
      };
    } catch (error) {
      console.error('Error deleting favorite car:', error);
      return rejectWithValue(
        error?.message || 'Failed to delete favorite car. Please try again.'
      );
    }
  }
);

const initialState = {
  featuredCars: [],
  filteredCars: [],
  currentCar: null,
  favorites: [],
  favoriteCarsData: [], 
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
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
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

      // Fetch Filtered Cars
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

      //Fetch Car by ID
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
      })

      //Toggle Favorite
      .addCase(toggleFavorite.pending, (state) => {
        state.error = null;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { carId } = action.payload;
        const index = state.favorites.indexOf(carId);
        if (index !== -1) {
          state.favorites.splice(index, 1);
        } else {
          state.favorites.push(carId);
        }
        state.error = null;
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.error = action.payload || 'Failed to toggle favorite';
      })

      // Fetch User Favorites
      .addCase(fetchUserFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = action.payload.favoriteIds;
        state.favoriteCarsData = action.payload.favoriteCarsData;
      })
      .addCase(fetchUserFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch favorite cars';
      })

      //Deletion of Favorite Car
      .addCase(deleteFavoriteCar.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteFavoriteCar.fulfilled, (state, action) => {
        const { favoriteId, carDetails } = action.payload;
        
        state.favoriteCarsData = state.favoriteCarsData.filter(
          fav => fav._id !== favoriteId
        );
        
        if (carDetails && carDetails.car) {
          const carId = carDetails.car._id;
          const index = state.favorites.indexOf(carId);
          if (index !== -1) {
            state.favorites.splice(index, 1);
          }
        }
      })
      .addCase(deleteFavoriteCar.rejected, (state, action) => {
        state.error = action.payload || 'Failed to delete favorite car';
      });
  }
});

export const { 
  setFilterParams,
  resetFilters,
  clearError
} = carSlice.actions;

export default carSlice.reducer;
