import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { FaWhatsapp } from 'react-icons/fa';
import './WhatsAppLogin.css';

const WhatsAppLogin = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken] = useState(Math.random().toString(36).substr(2, 9));

  // If already logged in, redirect to chat
  useEffect(() => {
    if (user) {
      navigate('/chat');
    }
  }, [user, navigate]);

  const handleFormLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      if (stayLoggedIn) {
        localStorage.setItem('rememberMe', 'true');
      }
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // In a real app, this would send the phone number to the backend
      // For demo, we'll simulate with existing users
      if (phoneNumber === '+1234567890') {
        await login('alice@example.com', 'password123');
        navigate('/chat');
      } else {
        setError('Phone number not found. Try +1234567890 for demo.');
      }
    } catch (err) {
      setError('Phone login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showPhoneLogin) {
    return (
      <div className="whatsapp-login-container">
        <div className="whatsapp-login-content">
          <div className="whatsapp-logo-section">
            <FaWhatsapp className="wa-logo" />
            <span className="whatsapp-text">WhatsApp</span>
          </div>

          <div className="phone-login-form">
            <h2>Login with Phone Number</h2>
            {error && <div className="error-banner">{error}</div>}
            
            <form onSubmit={handlePhoneLogin}>
              <div className="form-group">
                <label>Country Code & Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="phone-login-btn">
                {loading ? 'Sending verification code...' : 'Next'}
              </button>
            </form>

            <button 
              onClick={() => setShowPhoneLogin(false)}
              className="back-to-qr-btn"
            >
              ← Back to QR Code
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="whatsapp-login-container">
      {/* Header with Logo */}
      <div className="whatsapp-header-bar">
        <div className="header-logo-section">
          <FaWhatsapp className="header-logo" />
          <span>WhatsApp</span>
        </div>
      </div>

      <div className="login-main-content">
        {/* Download Banner */}
        <div className="download-banner">
          <div className="banner-content">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="download-icon">
              <rect x="10" y="15" width="40" height="30" rx="4" stroke="#333" strokeWidth="2" fill="none" />
              <path d="M20 25L30 35L40 25" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="35" cy="20" r="3" fill="#128c7e" />
            </svg>
            <div className="banner-text">
              <h3>Download WhatsApp for Windows</h3>
              <p>Get extra features like voice and video calling, screen sharing and more.</p>
            </div>
          </div>
          <button className="download-btn">
            Download ↓
          </button>
        </div>

        {/* QR Section */}
        <div className="qr-login-section">
          {/* Left Side - Instructions */}
          <div className="qr-instructions">
            <h2>Scan to log in</h2>
            
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <p>Scan the QR code with your phone's camera</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <p>Tap the link to open WhatsApp <span className="wa-emoji">💬</span></p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <p>Scan the QR code again to link to your account</p>
              </div>
            </div>

            <a href="#help" className="help-link">Need help? →</a>

            <div className="checkbox-section">
              <input
                type="checkbox"
                id="stayLoggedIn"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
              />
              <label htmlFor="stayLoggedIn">Stay logged in on this browser</label>
            </div>

            <button 
              onClick={() => setShowPhoneLogin(true)}
              className="phone-login-link"
            >
              Log in with phone number →
            </button>
          </div>

          {/* Right Side - QR Code */}
          <div className="qr-code-section">
            <div className="qr-wrapper">
              <QRCodeSVG
                value={`whatsapp-clone:${sessionToken}`}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>
        </div>

        {/* Demo: Alternative Login Method */}
        <div className="demo-login-section">
          <h3>Demo Login (for testing)</h3>
          {error && <div className="error-banner">{error}</div>}
          
          <form onSubmit={handleFormLogin} className="demo-login-form">
            <div className="form-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="demo-login-btn">
              {loading ? 'Logging in...' : 'Demo Login'}
            </button>
          </form>

          <p className="demo-hint">
            Try: alice@example.com / password123 or bob@example.com / password123
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="whatsapp-footer">
        Don't have a WhatsApp account? <a href="#signup">Get started →</a>
      </div>
    </div>
  );
};

export default WhatsAppLogin;
