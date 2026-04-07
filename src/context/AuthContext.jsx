import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token     = localStorage.getItem('farmfusion_token');
      const savedUser = localStorage.getItem('farmfusion_user');

      if (!token || !savedUser) {
        setLoading(false);
        return;
      }

      // ✅ Optimistically set user from localStorage first
      // so the app doesn't flicker to login on refresh
      const parsed = JSON.parse(savedUser);

      // ✅ Migrate old id → _id if needed
      if (parsed.id && !parsed._id) {
        parsed._id = parsed.id;
        localStorage.setItem('farmfusion_user', JSON.stringify(parsed));
      }

      setUser(parsed);
      setLoading(false);

      // ✅ Silently validate token in background
      // If token expired, quietly log out
      try {
        const { data } = await authAPI.getMe();
        if (data.user) {
          // Update user data with fresh data from server
          const freshUser = { ...parsed, ...data.user };
          setUser(freshUser);
          localStorage.setItem('farmfusion_user', JSON.stringify(freshUser));
        }
      } catch (err) {
        // ✅ Only logout if it's actually a 401 (token expired/invalid)
        if (err.response?.status === 401) {
          localStorage.removeItem('farmfusion_token');
          localStorage.removeItem('farmfusion_user');
          localStorage.removeItem('farmfusion_enquiry_statuses');
          setUser(null);
        }
        // For other errors (network issues etc), keep user logged in
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('farmfusion_token', data.token);
    localStorage.setItem('farmfusion_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('farmfusion_token', data.token);
    localStorage.setItem('farmfusion_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('farmfusion_token');
    localStorage.removeItem('farmfusion_user');
    localStorage.removeItem('farmfusion_enquiry_statuses');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};