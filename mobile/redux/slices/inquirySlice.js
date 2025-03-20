import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from "../../config/constants";

export const fetchCarInquiries = createAsyncThunk(
  "inquiries/fetchCarInquiries",
  async (carId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/api/inquiries/car/${carId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response.data.message || "Failed to fetch inquiries"
      );
    }
  }
);

const inquirySlice = createSlice({
  name: "inquiries",
  initialState: {
    inquiries: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearInquiries: (state) => {
      state.inquiries = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCarInquiries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCarInquiries.fulfilled, (state, action) => {
        state.loading = false;
        state.inquiries = action.payload;
      })
      .addCase(fetchCarInquiries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearInquiries } = inquirySlice.actions;
export default inquirySlice.reducer;
