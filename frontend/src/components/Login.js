import React, { useState } from 'react';
import API_CONFIG from '../config/apiConfig';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ?
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}` :
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REGISTER}`;

      const payload = isLogin ?
        { username: formData.username, password: formData.password } :
        {
          username: formData.username,
          email: formData.email,
          password: formData.password, // Changed from password1
          password2: formData.password2
        };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: API_CONFIG.getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ FIX: Pass both the auth token (data.key) AND the username from the form
        if (isLogin) {
            onLogin(data.key, formData.username);
        } else {
            // After registration, you could automatically log them in or show a success message
            setIsLogin(true);
            alert("Registration successful! Please log in.");
        }
      } else {
        // Handle both dictionary and list errors from Django REST Framework
        let errorMessage = 'Authentication failed. Please check your details.';
        if (typeof data === 'object' && data !== null) {
            const errorKeys = Object.keys(data);
            if (errorKeys.length > 0) {
                // Join all error messages
                errorMessage = errorKeys.map(key => `${key}: ${data[key].join(', ')}`).join('; ');
            }
        }
        setError(errorMessage);
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-header">
          <div className="login-logo">
            <span>N</span>
          </div>
          <h2>N-Connect</h2>
          <p></p>
        </div>

        <div className="login-card">
          <div className="login-tabs">
            <button
              onClick={() => setIsLogin(true)}
              className={`login-tab ${isLogin ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`login-tab ${!isLogin ? 'active' : ''}`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.password2}
                  onChange={(e) => setFormData({...formData, password2: e.target.value})}
                  required
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;