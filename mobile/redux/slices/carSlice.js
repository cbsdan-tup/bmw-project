import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks for API calls
export const fetchFeaturedCars = createAsyncThunk(
  'cars/fetchFeatured',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/Cars/featured`);
      
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
      const response = await api.get(`/Cars/search-filter?${query}`);
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
      const response = await api.get(`/Cars/${carId}`);
      
      const car = response.data.car;
      
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

export const fetchUserCars = createAsyncThunk(
  'cars/fetchUserCars',
  async (userId, { rejectWithValue }) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const response = await api.get(`/my-cars/${userId}`);
      return response.data.cars || [];
    } catch (error) {
      console.error('Error fetching user cars:', error);
      return rejectWithValue(error.response?.data || 'Failed to fetch your cars');
    }
  }
);

export const createCar = createAsyncThunk(
  'cars/createCar',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post('/CreateCar', formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.car;
    } catch (error) {
      console.error('Error creating car:', error);
      return rejectWithValue(error.response?.data || 'Failed to create car');
    }
  }
);

export const updateCar = createAsyncThunk(
  'cars/updateCar',
  async ({ carId, formData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/Cars/${carId}`, formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.car;
    } catch (error) {
      console.error('Error updating car:', error);
      return rejectWithValue(error.response?.data || 'Failed to update car');
    }
  }
);

export const deleteCar = createAsyncThunk(
  'cars/deleteCar',
  async (carId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/Cars/${carId}`);
      return { carId, success: response.data.success };
    } catch (error) {
      console.error('Error deleting car:', error);
      return rejectWithValue(error.response?.data || 'Failed to delete car');
    }
  }
);

export const updateCarStatus = createAsyncThunk(
  'cars/updateCarStatus',
  async ({ carId, isActive }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/cars/${carId}/status`, { isActive });
      return response.data.car;
    } catch (error) {
      console.error('Error updating car status:', error);
      return rejectWithValue(error.response?.data || 'Failed to update car status');
    }
  }
);

// Update the validateDiscountCode thunk to pass only necessary parameters
export const validateDiscountCode = createAsyncThunk(
  'cars/validateDiscountCode',
  async ({code, userId}, { rejectWithValue }) => {
    try {
      // Build query params for additional validation checks
      const queryParams = new URLSearchParams();
      if (userId) queryParams.append('userId', userId);
      
      const queryString = queryParams.toString();
      const endpoint = `/discounts/code/${code}${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(endpoint);
      return response.data.discount;
    } catch (error) {
      // Extract the specific error message from the API response
      const errorMessage = error.response?.data?.message || 'Invalid discount code';
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  featuredCars: [],
  filteredCars: [],
  currentCar: null,
  favorites: [],
  favoriteCarsData: [], 
  userCars: [], // Add this for storing user's own cars
  loading: false,
  error: null,
  filterParams: {
    transmission: "",
    pickUpLocation: "",
    brand: "",
    minPricePerDay: "",
    maxPricePerDay: "",
    year: "",
    rating: ""
  },
  // Add discount related state
  discount: null,
  discountLoading: false,
  discountError: null
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
    },
    clearDiscount: (state) => {
      state.discount = null;
      state.discountError = null;
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
      })

      // Fetch User Cars
      .addCase(fetchUserCars.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserCars.fulfilled, (state, action) => {
        state.loading = false;
        state.userCars = action.payload;
      })
      .addCase(fetchUserCars.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch user cars';
      })

      // Create Car
      .addCase(createCar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCar.fulfilled, (state, action) => {
        state.loading = false;
        state.userCars.push(action.payload);
      })
      .addCase(createCar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create car';
      })

      // Update Car
      .addCase(updateCar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCar.fulfilled, (state, action) => {
        state.loading = false;
        state.userCars = state.userCars.map(car => 
          car._id === action.payload._id ? action.payload : car
        );
      })
      .addCase(updateCar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update car';
      })

      // Delete Car
      .addCase(deleteCar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCar.fulfilled, (state, action) => {
        state.loading = false;
        state.userCars = state.userCars.filter(car => car._id !== action.payload.carId);
      })
      .addCase(deleteCar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete car';
      })

      // Update Car Status
      .addCase(updateCarStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCarStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.userCars = state.userCars.map(car => 
          car._id === action.payload._id ? action.payload : car
        );
      })
      .addCase(updateCarStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update car status';
      })

      // Validate discount code
      .addCase(validateDiscountCode.pending, (state) => {
        state.discountLoading = true;
        state.discountError = null;
      })
      .addCase(validateDiscountCode.fulfilled, (state, action) => {
        state.discountLoading = false;
        state.discount = action.payload;
      })
      .addCase(validateDiscountCode.rejected, (state, action) => {
        state.discountLoading = false;
        state.discountError = action.payload || 'Failed to validate discount code';
      });
  }
});

export const { 
  setFilterParams,
  resetFilters,
  clearError,
  clearDiscount  // Export the new action
} = carSlice.actions;

export default carSlice.reducer;
