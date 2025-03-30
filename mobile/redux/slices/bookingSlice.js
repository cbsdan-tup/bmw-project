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

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      // Log booking data for debugging
      console.log('Creating booking with data:', JSON.stringify(bookingData));
      
      // Make sure discount structure is correct before sending
      if (bookingData.discount) {
        console.log('Discount included:', JSON.stringify(bookingData.discount));
      }
      
      const response = await api.post('/createRental', bookingData);
      
      // Log the response
      console.log('Booking created response:', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error.response || error);
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create booking'
      );
    }
  }
);

export const updateRentalStatus = createAsyncThunk(
  'bookings/updateRentalStatus',
  async ({rentalId, status}, { rejectWithValue }) => {
    try {
      console.log(`Updating rental ${rentalId} to status: ${status}`);
      const response = await api.put(
        `/rentals/${rentalId}`, 
        {status}
      );
      return response.data;
    } catch (error) {
      console.error('Error updating rental status:', error.response || error);
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update rental status'
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
  bookingSuccess: false,
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
    },
    resetBookingSuccess: (state) => {
      state.bookingSuccess = false;
    },
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
      })

      // Create booking
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.bookingSuccess = false;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookingSuccess = action.payload;  // Store the full response
        state.error = null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.bookingSuccess = false;
      })

      // Update rental status
      .addCase(updateRentalStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRentalStatus.fulfilled, (state, action) => {
        state.loading = false;
        // Update the rental in the bookings list
        const index = state.bookings.findIndex(
          booking => booking._id === action.payload._id
        );
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        // Update selected booking if it's the same
        if (state.selectedBooking && state.selectedBooking._id === action.payload._id) {
          state.selectedBooking = action.payload;
        }
      })
      .addCase(updateRentalStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  setSelectedBooking, 
  clearSelectedBooking,
  resetBookingError,
  resetBookingSuccess
} = bookingSlice.actions;

export default bookingSlice.reducer;
