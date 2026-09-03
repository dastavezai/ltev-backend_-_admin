import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(token ? { token } : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setUser({ token: savedToken });
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
      const { accessToken } = response.data;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser({ token: accessToken });
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
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
