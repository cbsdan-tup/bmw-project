import { configureStore } from '@reduxjs/toolkit';
import carReducer from './slices/carSlice';
import reviewReducer from './slices/reviewSlice';
import bookingReducer from './slices/bookingSlice';

export const store = configureStore({
  reducer: {
    cars: carReducer,
    reviews: reviewReducer,
    bookings: bookingReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
