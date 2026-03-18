import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { FaWhatsapp } from 'react-icons/fa';
import { sendOtpApi, verifyOtpApi } from '../config/api';
import './WhatsAppLogin.css';

const WhatsAppLogin = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to chat
  useEffect(() => {
    if (user) {
      navigate('/chat');
    }
  }, [user, navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (phoneNumber.length < 10) {
        setError('Please enter a valid phone number');
        setLoading(false);
        return;
      }
      
      // Send OTP via API
      const data = await sendOtpApi(phoneNumber);
      
      // Show debug OTP in console for demo
      if (data.debug_otp) {
        console.log(`Demo OTP for testing: ${data.debug_otp}`);
      }
      
      setShowOtpScreen(true);
    } catch (err) {
      console.error('OTP Send Error:', err);
      setError(err.message || 'Failed to send OTP. Make sure backend is running on http://localhost:5000');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (otp.length < 4) {
        setError('Please enter a valid OTP');
        setLoading(false);
        return;
      }
      
      // Verify OTP with backend
      const data = await verifyOtpApi(phoneNumber, otp);
      
      // Store token and navigate
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      navigate('/chat');
    } catch (err) {
      console.error('OTP Verify Error:', err);
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showPhoneLogin) {
    // OTP Verification Screen
    if (showOtpScreen) {
      return (
        <div className="whatsapp-login-container">
          <div className="whatsapp-login-content">
            <div className="phone-login-form">
              <h2>Verify OTP</h2>
              <p className="otp-info">Enter the One-Time Password sent to your WhatsApp</p>
              {error && <div className="error-banner">{error}</div>}
              
              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label>One-Time Password (OTP)</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength="6"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="phone-login-btn">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>

              <button 
                onClick={() => {
                  setShowOtpScreen(false);
                  setOtp('');
                  setPhoneNumber('');
                }}
                className="back-to-qr-btn"
              >
                ← Back
              </button>
            </div>

            <div className="whatsapp-logo-section">
              <FaWhatsapp className="wa-logo" />
              <span className="whatsapp-text">WhatsApp</span>
            </div>
          </div>
        </div>
      );
    }

    // Phone Number Input Screen
    return (
      <div className="whatsapp-login-container">
        <div className="whatsapp-login-content">
          <div className="phone-login-form">
            <h2>Sign In with Phone Number</h2>
            <p className="phone-info">We'll send you a One-Time Password (OTP) via WhatsApp</p>
            {error && <div className="error-banner">{error}</div>}
            
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="phone-login-btn">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>

            <button 
              onClick={() => setShowPhoneLogin(false)}
              className="back-to-qr-btn"
            >
              ← Back to QR Code
            </button>
          </div>

          <div className="whatsapp-logo-section">
            <FaWhatsapp className="wa-logo" />
            <span className="whatsapp-text">WhatsApp</span>
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
          <button 
            onClick={() => window.open('https://www.whatsapp.com/download', '_blank')}
            className="download-btn"
          >
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
                value="https://www.whatsapp.com/download"
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>
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
