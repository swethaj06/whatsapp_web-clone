import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AuthNew.css';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await signup(username, email, password);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-new-container">
      <div className="auth-new-wrapper">
        {/* Left Panel */}
        <div className="auth-left-panel">
          <div className="whatsapp-header">
            <svg
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="logo-small"
            >
              <circle cx="100" cy="100" r="95" fill="#128c7e" />
              <path
                d="M100 35C65.82 35 38 62.82 38 97c0 10.74 2.7 21.05 7.84 29.98L40 165l39.49-20.65C88.15 157.7 93.85 160 100 160c34.18 0 62-27.82 62-62 0-34.18-27.82-62-62-62zm0 112.5c-5.97 0-11.8-1.54-16.85-4.45l-1.2-.73-12.53 6.57 6.73-12.18-.76-1.22c-3.3-5.4-5.04-11.58-5.04-17.99 0-27.92 22.75-50.67 50.67-50.67 27.92 0 50.67 22.75 50.67 50.67-0.01 27.92-22.76 50.67-50.67 50.67z"
                fill="white"
              />
              <path
                d="M75.5 85.5c-.5-1-.99-1-2.05-1-1.04 0-2.08.32-3.11 1.03-1.03.7-3.9 3.8-3.9 9.28 0 5.5 3.99 10.78 4.53 11.51.55.73 7.72 11.8 18.71 16.56 10.99 4.76 10.99 3.17 12.98 2.97 1.99-.2 6.41-2.62 7.31-5.14.9-2.52.9-4.68.63-5.14-.27-.46-1.3-.73-2.33-1.25s-6.41-3.16-7.44-3.52c-1.03-.36-1.79-.55-2.54.55-.76 1.1-2.94 3.69-3.6 4.43-.66.73-1.32.82-2.36.27-1.04-.55-4.39-1.62-8.36-5.16-3.09-2.75-5.18-6.15-5.78-7.25-.6-1.1.06-1.7.55-2.24.55-.6 1.23-1.57 1.85-2.36.62-.79 1.03-1.35 1.55-2.24.52-.89.26-1.66-.13-2.33s-2.54-6.12-3.48-8.38z"
                fill="white"
              />
            </svg>
            <h1>WhatsApp</h1>
          </div>

          <div className="whatsapp-info">
            <h2>Create your account</h2>
            <p>Join WhatsApp to start chatting with friends and family securely.</p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right-panel">
          <div className="login-card">
            <h2>Create Account</h2>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-divider">
              <span>Already have an account?</span>
            </div>

            <Link to="/login" className="signup-link">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
