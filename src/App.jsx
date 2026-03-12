import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { autoLogin, login, setAuthToken, getMe } from './services/pelotonAPI';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  // null = still trying auto-login, true = show form, false = skip form
  const [showLoginForm, setShowLoginForm] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    // 1. Restore a cached session (token + user profile from a previous login)
    const storedToken = localStorage.getItem('peloton_token');
    const storedUser = localStorage.getItem('peloton_user');
    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken);
        setCurrentUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        setShowLoginForm(false);
        return;
      } catch {
        localStorage.removeItem('peloton_token');
        localStorage.removeItem('peloton_user');
      }
    }

    // 2. Try auto-login with vault credentials (Bureau container only)
    try {
      const { accessToken, hasVaultCreds } = await autoLogin();
      if (accessToken) {
        const profile = await getMe();
        localStorage.setItem('peloton_token', accessToken);
        localStorage.setItem('peloton_user', JSON.stringify(profile));
        setCurrentUser(profile);
        setIsAuthenticated(true);
        setShowLoginForm(false);
        return;
      }
      // Vault creds not set → fall through to login form
      setShowLoginForm(true);
    } catch {
      // auto-login endpoint unreachable or failed → show login form
      setShowLoginForm(true);
    }
  }

  // Called by Login form (manual email/password)
  const handleLogin = async (email, password) => {
    const { accessToken } = await login(email, password);
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
    setShowLoginForm(true);
  };

  // Still checking auto-login
  if (showLoginForm === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <div className="text-gray-400 text-sm">Connecting…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard currentUser={currentUser} onLogout={handleLogout} />;
}

export default App;
