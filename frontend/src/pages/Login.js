import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaWhatsapp } from 'react-icons/fa';
import { MdOutlineComputer } from 'react-icons/md';
import { QRCodeSVG } from 'qrcode.react';
import './WhatsAppLogin.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
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

        {/* Main Card */}
        <div className="wa-main-card">
          {!showEmailForm ? (
            <div className="wa-qr-layout">
              <div className="qr-instructions">
                <h2>Scan to log in</h2>
                <ol className="instruction-list">
                  <li>Scan the QR code with your phone's camera</li>
                  <li>Tap the link to open WhatsApp <FaWhatsapp className="inline-icon" /></li>
                  <li>Scan the QR code again to link to your account</li>
                </ol>
                <a href="#help" className="wa-help-link">Need help? ↗</a>

                <div className="stay-logged-in">
                  <input type="checkbox" id="stay-logged-in" defaultChecked />
                  <label htmlFor="stay-logged-in">Stay logged in on this browser ⓘ</label>
                </div>
              </div>

              <div className="qr-code-section">
                <div className="qr-wrapper">
                  <QRCodeSVG 
                    value="https://www.whatsapp.com/download" 
                    size={264} 
                    fgColor="#111b21"
                  />
                  <div className="qr-logo-overlay">
                    <FaWhatsapp size={32} color="#00a884" />
                  </div>
                </div>
                <button 
                  className="switch-login-btn"
                  onClick={() => setShowEmailForm(true)}
                >
                  Log in with email &gt;
                </button>
              </div>
            </div>
          ) : (
            <div className="wa-email-layout">
              <div className="email-form-container">
                <h2>Log in with Email/Password</h2>
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

                <button 
                  className="switch-login-btn back-btn"
                  onClick={() => setShowEmailForm(false)}
                >
                  &lt; Back to QR Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="wa-landing-footer">
        <p>Don't have a WhatsApp account? <Link to="/signup">Get started ↗</Link></p>
      </div>
    </div>
  );
};

export default Login;
