import { configureStore } from "@reduxjs/toolkit";
import carReducer from "./slices/carSlice";
import reviewReducer from "./slices/reviewSlice";
import bookingReducer from "./slices/bookingSlice";
import inquiryReducer from "./slices/inquirySlice";

export const store = configureStore({
  reducer: {
    cars: carReducer,
    reviews: reviewReducer,
    bookings: bookingReducer,
    inquiries: inquiryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
