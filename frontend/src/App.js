import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import API_CONFIG from './config/apiConfig';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [userStatus, setUserStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUserStatus();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchUserStatus = async () => {
    setIsLoading(true);
    try {
      // ✅ THE FIX IS ON THIS LINE:
      // Changed from "/auth/user/" to use the correct config variable for your custom view.
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.USER_STATUS}`, {
        headers: API_CONFIG.getHeaders(token)
      });

      if (response.ok) {
        const userData = await response.json();
        // This log is crucial for debugging. Let's keep it.
        console.log('User Data Received from /api/user-status/:', userData);
        setUserStatus(userData);
      } else {
        console.error('Failed to fetch user status, token might be invalid.');
        handleLogout();
      }
    } catch (error) {
      console.error('Network error while fetching user status:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (authToken, loginUsername) => {
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('username', loginUsername);
    setToken(authToken);
    setUsername(loginUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setUserStatus(null);
  };

  const isAdmin = () => {
    // This check now works because the correct API endpoint sends 'is_superuser'.
    return userStatus && userStatus.is_superuser === true;
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading N-Connect...</div>
        <div className="loading-subtext">Verifying user credentials</div>
      </div>
    );
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  // Render the correct dashboard based on the fetched user status.
  return (
    <>
      {userStatus ? ( // Only render a dashboard if we have user data
        isAdmin() ? (
          <AdminDashboard
            token={token}
            username={username}
            userStatus={userStatus}
            onLogout={handleLogout}
          />
        ) : (
          <UserDashboard
            token={token}
            username={username}
            userStatus={userStatus}
            onLogout={handleLogout}
          />
        )
      ) : (
        // This can show briefly if the userStatus hasn't loaded yet.
        <div className="loading-container">
            <div className="loading-spinner"></div>
        </div>
      )}
    </>
  );
}

export default App;