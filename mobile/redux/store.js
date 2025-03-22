import { configureStore } from "@reduxjs/toolkit";
import carReducer from "./slices/carSlice";
import reviewReducer from "./slices/reviewSlice";
import bookingReducer from "./slices/bookingSlice";
import inquiryReducer from "./slices/inquirySlice";
import adminUserReducer from "./slices/adminUserSlice";
import adminCarSlice from './slices/adminCarSlice';
import adminRentalReducer from './slices/adminRentalSlice';
import adminReviewReducer from './slices/adminReviewSlice';

export const store = configureStore({
  reducer: {
    cars: carReducer,
    reviews: reviewReducer,
    bookings: bookingReducer,
    inquiries: inquiryReducer,
    adminUsers: adminUserReducer,
    adminCars: adminCarSlice,
    adminRentals: adminRentalReducer,
    adminReviews: adminReviewReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
