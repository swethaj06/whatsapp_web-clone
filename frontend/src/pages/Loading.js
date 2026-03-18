import React, { useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import './Loading.css';

const Loading = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="whatsapp-logo">
          <FaWhatsapp className="whatsapp-icon" />
        </div>
        <h1>WhatsApp</h1>
        <p className="loading-text">End-to-end encrypted</p>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
