import React, { useState, useEffect } from 'react';
import { statusAPI, normalizeFileUrl } from '../services/api';
import './StatusViewer.css';
import { MdClose, MdDownload, MdDeleteOutline } from 'react-icons/md';
import toast from 'react-hot-toast';

const StatusViewer = ({ userStatus, currentUserId, onClose, onStatusDeleted }) => {
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [viewers, setViewers] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [statusesWithViewers, setStatusesWithViewers] = useState([]);
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(true);

  const currentStatus = userStatus.statuses[currentStatusIndex];

  useEffect(() => {
    fetchViewersForAllStatuses();
  }, [userStatus]);

  // Auto-play slideshow effect - 2 seconds per story
  useEffect(() => {
    if (!isAutoPlayActive || userStatus.statuses.length <= 1) return;

    const timer = setTimeout(() => {
      setCurrentStatusIndex(prevIndex => {
        if (prevIndex < userStatus.statuses.length - 1) {
          return prevIndex + 1;
        } else {
          // Reached end of stories
          onClose();
          return prevIndex;
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentStatusIndex, isAutoPlayActive, userStatus.statuses.length, onClose]);

  const fetchViewersForAllStatuses = async () => {
    try {
      const viewersData = await Promise.all(
        userStatus.statuses.map(status => 
          statusAPI.getStatusViewers(status._id)
            .then(res => ({ statusId: status._id, viewers: res.data }))
            .catch(() => ({ statusId: status._id, viewers: [] }))
        )
      );
      setStatusesWithViewers(viewersData);
    } catch (error) {
      console.error('Error fetching viewers:', error);
    }
  };

  const handlePrevious = () => {
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(currentStatusIndex - 1);
      setShowViewers(false);
      setIsAutoPlayActive(true); // Resume auto-play
    }
  };

  const handleNext = () => {
    if (currentStatusIndex < userStatus.statuses.length - 1) {
      setCurrentStatusIndex(currentStatusIndex + 1);
      setShowViewers(false);
      setIsAutoPlayActive(true); // Resume auto-play
    }
  };

  const isOwner = currentStatus.userId._id === currentUserId;

  const handleShowViewers = () => {
    const statusViewers = statusesWithViewers.find(
      sv => sv.statusId === currentStatus._id
    );
    setViewers(statusViewers?.viewers || []);
    setShowViewers(true);
    setIsAutoPlayActive(false); // Pause auto-play when showing viewers
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this status?')) {
      try {
        await statusAPI.deleteStatus(currentStatus._id);
        toast.success('Status deleted');
        onStatusDeleted();
        onClose();
      } catch (error) {
        console.error('Error deleting status:', error);
        toast.error('Failed to delete status');
      }
    }
  };

  const handleDownload = async () => {
    if (currentStatus.mediaUrl) {
      const link = document.createElement('a');
      link.href = normalizeFileUrl(currentStatus.mediaUrl);
      link.download = `status_${currentStatus._id}`;
      link.click();
    }
  };

  const formatViewerTime = (viewedAt) => {
    const date = new Date(viewedAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="status-viewer-overlay">
      <div className="status-viewer-container">
        {/* Header */}
        <div className="status-header">
          <div className="user-info">
            <img
              src={normalizeFileUrl(currentStatus.userId.profilePicture)}
              alt={currentStatus.userId.username}
              className="user-avatar"
            />
            <div className="user-details">
              <h3>{currentStatus.userId.username}</h3>
              <p>{new Date(currentStatus.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="header-actions">
            {!isOwner && <button className="action-btn" onClick={handleShowViewers}>
              Seen by {statusesWithViewers.find(sv => sv.statusId === currentStatus._id)?.viewers?.length || 0}
            </button>}
            {isOwner && (
              <>
                <button className="action-btn" onClick={handleDownload} title="Download">
                  <MdDownload />
                </button>
                <button className="action-btn delete" onClick={handleDelete} title="Delete">
                  <MdDeleteOutline />
                </button>
              </>
            )}
            <button className="close-btn" onClick={onClose}>
              <MdClose />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="status-content">
          {currentStatus.mediaType === 'text' ? (
            <div
              className="text-status"
              style={{
                backgroundColor: currentStatus.backgroundColor,
                color: currentStatus.textColor
              }}
            >
              <p>{currentStatus.content}</p>
            </div>
          ) : currentStatus.mediaType === 'image' ? (
            <img
              src={normalizeFileUrl(currentStatus.mediaUrl)}
              alt="Status"
              className="status-media"
            />
          ) : (
            <video
              src={normalizeFileUrl(currentStatus.mediaUrl)}
              controls
              className="status-media"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="status-navigation">
          {currentStatusIndex > 0 && (
            <button className="nav-btn prev" onClick={handlePrevious}>
              ‹
            </button>
          )}
          {currentStatusIndex < userStatus.statuses.length - 1 && (
            <button className="nav-btn next" onClick={handleNext}>
              ›
            </button>
          )}
        </div>

        {/* Progress bars */}
        <div className="progress-bars">
          {userStatus.statuses.map((_, index) => (
            <div
              key={index}
              className={`progress-bar ${index < currentStatusIndex ? 'viewed' : ''} ${index === currentStatusIndex ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Viewers modal */}
        {showViewers && (
          <div className="viewers-modal">
            <div className="modal-header">
              <h4>Seen by ({viewers.length})</h4>
              <button className="modal-close-btn" onClick={() => {
                setShowViewers(false);
                setIsAutoPlayActive(true); // Resume auto-play when closing viewers
              }}>
                <MdClose />
              </button>
            </div>
            {viewers.length > 0 ? (
              <div className="viewers-list">
                {viewers.map(viewer => (
                  <div key={viewer.userId._id} className="viewer-item">
                    <img
                      src={normalizeFileUrl(viewer.userId.profilePicture)}
                      alt={viewer.userId.username}
                      className="viewer-avatar"
                    />
                    <div className="viewer-info">
                      <p className="viewer-name">{viewer.userId.username}</p>
                      <p className="viewer-time">{formatViewerTime(viewer.viewedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-viewers">
                <p>No one has viewed this status yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusViewer;
