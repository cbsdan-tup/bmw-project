import { configureStore } from '@reduxjs/toolkit';
import carReducer from './slices/carSlice';
import reviewReducer from './slices/reviewSlice';

export const store = configureStore({
  reducer: {
    cars: carReducer,
    reviews: reviewReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
