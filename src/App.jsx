import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { setAuthToken, getMe } from './services/pelotonAPI';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists in localStorage
    const storedToken = localStorage.getItem('peloton_token');
    const storedUser = localStorage.getItem('peloton_user');

    if (storedToken && storedUser) {
      setAuthToken(storedToken);
      setCurrentUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (token) => {
    try {
      setAuthToken(token);

      // Fetch current user info
      const userData = await getMe();

      // Store token and user info
      localStorage.setItem('peloton_token', token);
      localStorage.setItem('peloton_user', JSON.stringify(userData));

      setCurrentUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Authentication failed. Please check your token and try again.');
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('peloton_token');
    localStorage.removeItem('peloton_user');
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard currentUser={currentUser} onLogout={handleLogout} />;
}

export default App;
