import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential 
} from "firebase/auth";
import { auth, refreshFirebaseToken } from '../config/firebase-config';
import { API_URL } from '../config/constants';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error setting auth token in request:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshFirebaseToken();
        
        if (newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          
          await AsyncStorage.setItem('token', newToken);
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

const storeUserData = async (authToken, userData) => {
  await AsyncStorage.setItem('token', authToken);
  await AsyncStorage.setItem('user', JSON.stringify(userData));
};

export const authService = {
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      const response = await api.post('/getUserInfo', { uid: user.uid });
      
      if (response.data.success) {
        await storeUserData(idToken, response.data.user);
        return {
          token: idToken,
          user: response.data.user
        };
      } else {
        throw new Error('User data not found');
      }
    } catch (error) {
      console.log("Login error:", error);
      
      if (error.code === 'auth/user-not-found') {
        throw { message: 'No account found with this email' };
      } else if (error.code === 'auth/wrong-password') {
        throw { message: 'Incorrect password' };
      } else if (error.code === 'auth/invalid-credential') {
        throw { message: 'Invalid login credentials' };
      } else if (error.code === 'auth/too-many-requests') {
        throw { message: 'Too many failed login attempts. Please try again later.' };
      }
      
      throw error.response?.data || { message: error.message || 'Login failed' };
    }
  },
  
  register: async (userData) => {
    try {
      const { email, password, firstName, lastName, avatar } = userData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      const formData = new FormData();
      formData.append("uid", user.uid);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("email", email);
      
      if (avatar) {
        if (typeof avatar === 'string') {
          const uriParts = avatar.split('.');
          const fileType = uriParts[uriParts.length - 1];
          
          formData.append("avatar", {
            uri: avatar,
            name: `avatar-${user.uid}.${fileType}`,
            type: `image/${fileType}`,
          });
        } else if (avatar.uri) {
          const uriParts = avatar.uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          
          formData.append("avatar", {
            uri: avatar.uri,
            name: `avatar-${user.uid}.${fileType}`,
            type: `image/${fileType}`,
          });
        }
      }
      
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${idToken}`
        },
      };
      
      const response = await api.post('/register', formData, config);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.user
        };
      } else {
        throw new Error('Registration failed on server');
      }
    } catch (error) {
      console.log("Registration error:", error);
      throw error.response?.data || { message: error.message || 'Registration failed' };
    }
  },
  
  googleSignIn: async (idToken) => {
    try {
      if (!idToken) {
        throw new Error("No token provided");
      }
      
      const credential = GoogleAuthProvider.credential(null, idToken);
      
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      const fbToken = await user.getIdToken();
      
      try {
        const response = await api.post('/getUserInfo', { uid: user.uid });
        
        if (response.data.success && response.data.user) {
          await storeUserData(fbToken, response.data.user);
          return {
            token: fbToken,
            user: response.data.user
          };
        } else {
          const displayName = user.displayName || '';
          const nameParts = displayName.split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(" ") || '';
          
          const formData = new FormData();
          formData.append("uid", user.uid);
          formData.append("email", user.email);
          formData.append("firstName", firstName);
          formData.append("lastName", lastName);
          
          if (user.photoURL) {
            formData.append("photoURL", user.photoURL);
          }
          
          const config = {
            headers: {
              "Content-Type": "multipart/form-data",
              "Authorization": `Bearer ${fbToken}`
            },
          };
          
          const registerResponse = await api.post('/register', formData, config);
          
          if (registerResponse.data.success) {
            await storeUserData(fbToken, registerResponse.data.user);
            return {
              token: fbToken,
              user: registerResponse.data.user
            };
          } else {
            throw new Error('Failed to register Google user');
          }
        }
      } catch (backendError) {
        console.log("Backend error during Google sign-in:", backendError);
        throw backendError;
      }
    } catch (error) {
      console.log("Google sign-in error:", error);
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        throw { message: 'An account already exists with the same email address but different sign-in credentials' };
      }
      
      throw error.response?.data || { message: error.message || 'Google sign-in failed' };
    }
  },
  
  // Logout
  logout: async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.log("Logout error:", error);
      throw error;
    }
  },
  
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      return !!token && !!user;
    } catch (error) {
      console.log("Auth check error:", error);
      return false;
    }
  },
  
  getCurrentUser: async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.log("Get user error:", error);
      return null;
    }
  },
};

export default api;
