import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaWhatsapp } from 'react-icons/fa';
import { MdOutlineComputer } from 'react-icons/md';
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
    <div className="wa-landing-container">
      {/* Top Left Header */}
      <div className="wa-landing-header">
        <FaWhatsapp className="wa-header-logo" />
        <span>WhatsApp</span>
      </div>

      <div className="wa-landing-content">
        {/* Banner */}
        <div className="wa-download-banner">
          <div className="banner-left">
            <div className="banner-icon">
              <MdOutlineComputer size={24} />
            </div>
            <div className="banner-text">
              <h3>Download WhatsApp for Windows</h3>
              <p>Get extra features like voice and video calling, screen sharing and more.</p>
            </div>
          </div>
          <button 
            className="banner-btn"
            onClick={() => window.open('https://www.whatsapp.com/download', '_blank')}
          >
            Download <span>↓</span>
          </button>
        </div>

        <div className="wa-main-card">
          <div className="wa-qr-layout">
            
            {/* Left Side: Information */}
            <div className="qr-instructions" style={{ paddingRight: '20px' }}>
              <h2>Join WhatsApp</h2>
              <ol className="instruction-list" style={{ marginTop: '20px' }}>
                <li>Create an integrated profile to chat securely with friends and family</li>
                <li>Experience end-to-end encryption to keep your data private</li>
                <li>Sync your chats instantly across all your desktop and mobile devices</li>
              </ol>
            </div>

            {/* Right Side: Signup Form */}
            <div className="wa-email-layout" style={{ flex: 1, padding: '0 0 0 50px', borderLeft: '1px solid #e9edef', alignItems: 'flex-start' }}>
              <div className="email-form-container" style={{ margin: 0, maxWidth: '100%' }}>
                <h2 style={{ textAlign: 'left', marginBottom: '25px' }}>Sign up</h2>
                
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

                  <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
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
                    <div style={{ flex: 1 }}>
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
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-btn"
                    style={{marginTop: '10px'}}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>

                <Link 
                  to="/login" 
                  className="switch-login-btn back-btn"
                  style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginTop: '25px' }}
                >
                  &lt; Back to Login
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <div className="wa-landing-footer">
        <p>WhatsApp Web Clone App</p>
      </div>
    </div>
  );
};

export default Signup;
