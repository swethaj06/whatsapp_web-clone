import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaWhatsapp } from 'react-icons/fa';
import './WhatsAppLogin.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
            <FaWhatsapp className="logo-small" />
            <h1>WhatsApp</h1>
          </div>

          <div className="whatsapp-info">
            <h2>Open WhatsApp on your phone</h2>
            <ul>
              <li>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked devices</strong></li>
              <li>Tap on <strong>Link a device</strong></li>
              <li>Point your phone to this screen to scan the code</li>
            </ul>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right-panel">
          <div className="login-card">
            <h2>Login to Chat</h2>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
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

              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-divider">
              <span>Don't have an account?</span>
            </div>

            <Link to="/signup" className="signup-link">
              Create a new account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
