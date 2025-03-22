import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks for API calls
export const fetchAllUsers = createAsyncThunk(
  'adminUsers/fetchAll',
  async ({page = 1, limit = 10, search = ''}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/users?page=${page}&limit=${limit}&search=${search}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch users');
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'adminUsers/fetchById',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch user');
    }
  }
);

export const updateUserRole = createAsyncThunk(
  'adminUsers/updateRole',
  async ({userId, role}, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to update user role');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'adminUsers/delete',
  async (userId, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      return { userId };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to delete user');
    }
  }
);

export const generatePermissionToken = createAsyncThunk(
  'adminUsers/generateToken',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/admin/users/${userId}/permission-token`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to generate permission token');
    }
  }
);

// Add new async thunk for disabling users
export const disableUser = createAsyncThunk(
  'adminUsers/disableUser',
  async ({userId, isDisabled, disabledUntil, disabledReason, isPermanent}, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/users/${userId}/disable`, { 
        isDisabled, 
        disabledUntil,
        disabledReason,
        isPermanent
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to disable user');
    }
  }
);

// Add this new async thunk
export const validateUserEmail = createAsyncThunk(
  'adminUsers/validateUserEmail',
  async (email, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/users/validate-email?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to validate user email'
      );
    }
  }
);

const initialState = {
  users: [],
  selectedUser: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
  }
};

const adminUserSlice = createSlice({
  name: 'adminUsers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Users
      .addCase(fetchAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
        state.pagination = {
          currentPage: parseInt(action.payload.currentPage),
          totalPages: action.payload.totalPages,
          totalUsers: action.payload.totalUsers
        };
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch users';
      })
      
      // Fetch User By ID
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch user details';
      })
      
      // Update User Role
      .addCase(updateUserRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload.user;
        
        // Update the user in the users array
        const index = state.users.findIndex(user => user._id === action.payload.user._id);
        if (index !== -1) {
          state.users[index] = action.payload.user;
        }
      })
      .addCase(updateUserRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update user role';
      })
      
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter(user => user._id !== action.payload.userId);
        state.pagination.totalUsers -= 1;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete user';
      })
      
      // Generate Permission Token
      .addCase(generatePermissionToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generatePermissionToken.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload.user;
        
        // Update the user in the users array
        const index = state.users.findIndex(user => user._id === action.payload.user._id);
        if (index !== -1) {
          state.users[index] = action.payload.user;
        }
      })
      .addCase(generatePermissionToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to generate permission token';
      })
      
      // Disable User
      .addCase(disableUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(disableUser.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload.user;
        
        // Update the user in the users array
        const index = state.users.findIndex(user => user._id === action.payload.user._id);
        if (index !== -1) {
          state.users[index] = action.payload.user;
        }
      })
      .addCase(disableUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to disable user';
      });
  }
});

export const { clearError, clearSelectedUser } = adminUserSlice.actions;

export default adminUserSlice.reducer;
