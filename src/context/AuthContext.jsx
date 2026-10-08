import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(token ? { token } : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role') || 'admin';
    const savedUsername = localStorage.getItem('username') || 'admin';
    if (savedToken) {
      setToken(savedToken);
      setUser({ token: savedToken, role: savedRole, username: savedUsername });
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`/api/login`, {
        username,
        password
      });
      const { accessToken, role } = response.data;
      const userRole = role || 'admin';
      localStorage.setItem('token', accessToken);
      localStorage.setItem('role', userRole);
      localStorage.setItem('username', username);
      setToken(accessToken);
      setUser({ token: accessToken, role: userRole, username });
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      return { success: true, role: userRole };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token: token || localStorage.getItem('token'), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
