import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchAllDiscounts = createAsyncThunk(
  'adminDiscounts/fetchAllDiscounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/discounts');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch discounts'
      );
    }
  }
);

export const fetchDiscountById = createAsyncThunk(
  'adminDiscounts/fetchDiscountById',
  async (discountId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/discounts/${discountId}`);
      return response.data.discount;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch discount details'
      );
    }
  }
);

export const createDiscount = createAsyncThunk(
  'adminDiscounts/createDiscount',
  async (discountData, { rejectWithValue }) => {
    try {
      const response = await api.post(
        '/create-discount',
        discountData,
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
        error.response?.data?.errors ||
        error.message || 
        'Failed to create discount'
      );
    }
  }
);

export const updateDiscount = createAsyncThunk(
  'adminDiscounts/updateDiscount',
  async ({ discountId, discountData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/discount/${discountId}`,
        discountData,
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
        error.response?.data?.errors ||
        error.message || 
        'Failed to update discount'
      );
    }
  }
);

export const deleteDiscount = createAsyncThunk(
  'adminDiscounts/deleteDiscount',
  async (discountId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/discount/${discountId}`);
      return { ...response.data, discountId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete discount'
      );
    }
  }
);

export const fetchDiscountByCode = createAsyncThunk(
  'adminDiscounts/fetchDiscountByCode',
  async (code, { rejectWithValue }) => {
    try {
      const response = await api.get(`/discounts/code/${code}`);
      return response.data.discount;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch discount details'
      );
    }
  }
);

const initialState = {
  discounts: [],
  discountDetails: null,
  loading: false,
  error: null,
};

const adminDiscountSlice = createSlice({
  name: 'adminDiscounts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearDiscountDetails: (state) => {
      state.discountDetails = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all discounts
      .addCase(fetchAllDiscounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllDiscounts.fulfilled, (state, action) => {
        state.loading = false;
        state.discounts = action.payload.discounts;
      })
      .addCase(fetchAllDiscounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch discount by ID
      .addCase(fetchDiscountById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDiscountById.fulfilled, (state, action) => {
        state.loading = false;
        state.discountDetails = action.payload;
      })
      .addCase(fetchDiscountById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create discount
      .addCase(createDiscount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDiscount.fulfilled, (state, action) => {
        state.loading = false;
        state.discounts = [action.payload.discount, ...state.discounts];
      })
      .addCase(createDiscount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update discount
      .addCase(updateDiscount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDiscount.fulfilled, (state, action) => {
        state.loading = false;
        state.discountDetails = action.payload.discount;
        state.discounts = state.discounts.map(discount => 
          discount._id === action.payload.discount._id ? action.payload.discount : discount
        );
      })
      .addCase(updateDiscount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete discount
      .addCase(deleteDiscount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDiscount.fulfilled, (state, action) => {
        state.loading = false;
        state.discounts = state.discounts.filter(discount => 
          discount._id !== action.payload.discountId
        );
      })
      .addCase(deleteDiscount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch discount by code
      .addCase(fetchDiscountByCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDiscountByCode.fulfilled, (state, action) => {
        state.loading = false;
        state.discountDetails = action.payload;
      })
      .addCase(fetchDiscountByCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, clearDiscountDetails } = adminDiscountSlice.actions;

export default adminDiscountSlice.reducer;
