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
          password: formData.password,
          password2: formData.password2
        };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: API_CONFIG.getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
            onLogin(data.key, formData.username);
        } else {
            setIsLogin(true);
            alert("Registration successful! Please log in.");
        }
      } else {
        let errorMessage = 'Authentication failed. Please check your details.';
        if (typeof data === 'object' && data !== null) {
            const errorKeys = Object.keys(data);
            if (errorKeys.length > 0) {
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
      <div className="login-left-panel">
        <div className="login-branding">
          <div className="login-logo">
            <i className="fas fa-building"></i>
          </div>
          <h1>N-Connect</h1>
          <p>Premium Society Management Solution</p>
        </div>

        <ul className="features-list">
          <li><i className="fas fa-shield-alt"></i> Secure community management</li>
          <li><i className="fas fa-users"></i> Connect with your neighbors</li>
          <li><i className="fas fa-bolt"></i> Quick issue resolution</li>
        </ul>
      </div>

      <div className="login-right-panel">
        <div className="login-wrapper">
          <div className="login-card">
            <div className="login-header">
              <h2>Member Login</h2>
              <p>Access your society dashboard</p>
            </div>

            <div className="login-tabs">
              <button
                onClick={() => setIsLogin(true)}
                className={`login-tab ${isLogin ? 'active' : ''}`}
              >
                <i className="fas fa-sign-in-alt"></i> Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`login-tab ${!isLogin ? 'active' : ''}`}
              >
                <i className="fas fa-user-plus"></i> Sign Up
              </button>
            </div>

            {error && (
              <div className="login-error">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <div className="input-with-icon">
                  <i className="fas fa-user"></i>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="form-group">
                  <div className="input-with-icon">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <div className="input-with-icon">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="form-group">
                  <div className="input-with-icon">
                    <i className="fas fa-lock"></i>
                    <input
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.password2}
                      onChange={(e) => setFormData({...formData, password2: e.target.value})}
                      required
                    />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="login-button">
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Please wait...
                  </>
                ) : isLogin ? (
                  <>
                    <i className="fas fa-sign-in-alt"></i> Login to Dashboard
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i> Create Account
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              <p>New tenant? <a href="#">Register here</a></p>
              <p className="developed-by">
                Made with <i className="fas fa-heart"></i> by Prathmesh | Powered by <a href="https://dybusiness-solutions.com/" target="_blank" rel="noopener noreferrer">DY Business solution</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;