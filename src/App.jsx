import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { login, setAuthToken, getMe } from './services/pelotonAPI';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore JWT + user profile from localStorage.
  // Tokens from auth-self-service are valid for 24h; we optimistically restore
  // and let the first API call fail if it's expired, which logs the user out.
  useEffect(() => {
    const storedToken = localStorage.getItem('peloton_token');
    const storedUser = localStorage.getItem('peloton_user');
    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken);
        setCurrentUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('peloton_token');
        localStorage.removeItem('peloton_user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Called by Login when the user submits email + password.
   * 1. POSTs to /local-auth/login → local Node.js auth server
   * 2. auth-server calls auth-self-service internally → port-authority JWT
   * 3. Fetches /api/me with that JWT to get the full user profile
   */
  const handleLogin = async (email, password) => {
    const { accessToken } = await login(email, password);

    // Fetch full profile — getMe() uses the JWT we just stored
    const profile = await getMe();

    localStorage.setItem('peloton_token', accessToken);
    localStorage.setItem('peloton_user', JSON.stringify(profile));
    setCurrentUser(profile);
    setIsAuthenticated(true);
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
        <div className="text-white text-xl">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard currentUser={currentUser} onLogout={handleLogout} />;
}

export default App;
