import React, { createContext, useState, useContext, useEffect } from 'react';
import { userAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      // Fetch latest profile to get profile picture since it might not be in localStorage
      const parsedUser = JSON.parse(storedUser);
      const userId = parsedUser._id || parsedUser.id;
      userAPI.getUser(userId).then(res => {
        setUser(res.data);
        // deliberately avoiding putting potentially huge photo in localstorage here
      }).catch(err => console.error('Failed to fetch latest user info', err));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await userAPI.login({ email, password });
      const { user, token } = response.data;
      setUser(user);
      setToken(token);
      
      const userToStore = { ...user };
      if (userToStore.profilePicture && userToStore.profilePicture.length > 500000) {
        delete userToStore.profilePicture;
      }
      localStorage.setItem('user', JSON.stringify(userToStore));
      localStorage.setItem('token', token);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await userAPI.signup({ username, email, password });
      const { user, token } = response.data;
      setUser(user);
      setToken(token);
      
      const userToStore = { ...user };
      if (userToStore.profilePicture && userToStore.profilePicture.length > 500000) {
        delete userToStore.profilePicture;
      }
      localStorage.setItem('user', JSON.stringify(userToStore));
      localStorage.setItem('token', token);
      return user;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateUserProfile = async (updates) => {
    try {
      const currentUserId = user._id || user.id;
      const response = await userAPI.updateUser(currentUserId, updates);
      const updatedUser = response.data;
      setUser(updatedUser);
      
      // Prevent QuotaExceededError by removing large profile pictures from localStorage
      const userToStore = { ...updatedUser };
      if (userToStore.profilePicture && userToStore.profilePicture.length > 500000) {
        delete userToStore.profilePicture;
      }
      localStorage.setItem('user', JSON.stringify(userToStore));
      
      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    updateUserProfile,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
