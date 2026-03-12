import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { login, getMe } from './services/pelotonAPI';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a persisted user session (stored after last login).
  // The actual session cookie is managed by the browser; we just restore the
  // cached user profile so the Dashboard renders without a round-trip.
  useEffect(() => {
    const storedUser = localStorage.getItem('peloton_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('peloton_user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Called by Login when the user submits email + password.
   * Calls POST /auth/login via the Vite proxy → Peloton sets the session cookie
   * → we fetch /api/me with that cookie to get the full profile.
   */
  const handleLogin = async (email, password) => {
    // login() POSTs to /auth/login and returns { userId, userData }
    const { userData } = await login(email, password);

    // userData from the login response is often partial; fetch the full profile.
    let profile = userData;
    try {
      profile = await getMe();
    } catch {
      // If /api/me fails for any reason, fall back to the login payload.
    }

    localStorage.setItem('peloton_user', JSON.stringify(profile));
    setCurrentUser(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('peloton_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    // The browser will clear the session cookie naturally on expiry;
    // optionally we could POST /auth/logout here too.
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
