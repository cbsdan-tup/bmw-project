import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunk to fetch notification count
export const fetchNotificationCount = createAsyncThunk(
  'notifications/fetchCount',
  async (_, { rejectWithValue, getState }) => {
    try {      
      const response = await api.get('/notifications?limit=1');
      
      if (response.data.success) {
        return { unreadCount: response.data.unreadCount || 0 };
      } else {
        throw new Error(response.data.message || 'Failed to fetch notification count');
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
      return rejectWithValue(error.message || 'An error occurred');
    }
  }
);

// Initial state
const initialState = {
  unreadCount: 0,
  loading: false,
  error: null,
  lastUpdated: null
};

// Create the slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotificationCount: (state) => {
      state.unreadCount = 0;
    },
    decrementNotificationCount: (state) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
    incrementNotificationCount: (state) => {
      state.unreadCount = state.unreadCount + 1;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationCount.fulfilled, (state, action) => {
        state.loading = false;
        state.unreadCount = action.payload.unreadCount;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchNotificationCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// Export actions and reducer
export const { clearNotificationCount, decrementNotificationCount, incrementNotificationCount } = notificationSlice.actions;
export default notificationSlice.reducer;
