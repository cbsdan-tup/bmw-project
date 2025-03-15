import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchUserBookings = createAsyncThunk(
  'bookings/fetchUserBookings',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/my-rentals/${userId}`);      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch bookings'
      );
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async (bookingId, { rejectWithValue, getState }) => {
    try {
      const response = await api.put(
        `/rentals/${bookingId}`, 
        {status: 'Canceled'}
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to cancel booking'
      );
    }
  }
);

const initialState = {
  bookings: [],
  bookingsCount: 0,
  loading: false,
  error: null,
  selectedBooking: null,
};

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setSelectedBooking: (state, action) => {
      state.selectedBooking = action.payload;
    },
    clearSelectedBooking: (state) => {
      state.selectedBooking = null;
    },
    resetBookingError: (state) => {
      state.error = null;
    },
    setBookingsCount: (state, action) => {
      state.bookingsCount = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch user bookings cases
      .addCase(fetchUserBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
        state.bookingsCount = action.payload.length || 0;
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Cancel booking cases
      .addCase(cancelBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.bookings.findIndex(
          booking => booking._id === action.payload._id
        );
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        if (state.selectedBooking && state.selectedBooking._id === action.payload._id) {
          state.selectedBooking = action.payload;
        }
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  setSelectedBooking, 
  clearSelectedBooking,
  resetBookingError 
} = bookingSlice.actions;

export default bookingSlice.reducer;
