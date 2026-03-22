import React, { useEffect } from 'react';
import { MdCheckCircle, MdErrorOutline, MdClose } from 'react-icons/md';
import './NotificationModal.css';

const NotificationModal = ({ isOpen, type = 'success', title, message, onClose, autoClose = true, duration = 3000 }) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div className="notification-overlay">
      <div className={`notification-content notification-${type}`}>
        <div className="notification-icon">
          {type === 'success' && <MdCheckCircle size={48} />}
          {type === 'error' && <MdErrorOutline size={48} />}
        </div>
        <div className="notification-text">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
        <button className="notification-close" onClick={onClose}>
          <MdClose size={24} />
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;
