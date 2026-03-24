import React, { useState, useEffect } from 'react';
import { statusAPI } from '../services/api';
import { normalizeFileUrl } from '../services/api';
import './StatusBar.css';
import { MdAdd } from 'react-icons/md';

const StatusBar = ({ currentUser, onStatusClick, onCreateStatusClick, hideCreateButton = false, refreshTrigger = 0 }) => {
  const [statuses, setStatuses] = useState([]);
  const [viewedStatusIds, setViewedStatusIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatuses();
  }, [refreshTrigger]);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const response = await statusAPI.getStatuses();
      setStatuses(response.data || []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (userStatus) => {
    // Mark all statuses from this user as viewed
    userStatus.statuses.forEach(status => {
      if (!viewedStatusIds.has(status._id)) {
        statusAPI.markStatusAsViewed(status._id).catch(console.error);
        setViewedStatusIds(prev => new Set([...prev, status._id]));
      }
    });
    onStatusClick(userStatus);
  };

  if (loading) return <div className="status-bar"><p>Loading...</p></div>;

  return (
    <div className="status-bar">
      <div className="status-list">
        {/* Create status for current user */}
        {!hideCreateButton && (
          <>
            <div className="status-item create-status" onClick={onCreateStatusClick}>
              <div className="status-avatar">
                {currentUser?.profilePicture ? (
                  <img src={normalizeFileUrl(currentUser.profilePicture)} alt="Your status" />
                ) : (
                  <div className="default-avatar">{currentUser?.username?.charAt(0).toUpperCase()}</div>
                )}
                <div className="add-icon">
                  <MdAdd />
                </div>
              </div>
            </div>
            <p className="status-name">Your story</p>
          </>
        )}

        {/* Display statuses from other users */}
        {statuses.map((userStatus) => {
          const hasUnviewedStatus = userStatus.statuses.some(
            status => !viewedStatusIds.has(status._id)
          );

          return (
            <div
              key={userStatus.user._id}
              className={`status-item ${hasUnviewedStatus ? 'unviewed' : 'viewed'}`}
              onClick={() => handleStatusClick(userStatus)}
            >
              <div className="status-avatar">
                {userStatus.user.profilePicture ? (
                  <img src={normalizeFileUrl(userStatus.user.profilePicture)} alt={userStatus.user.username} />
                ) : (
                  <div className="default-avatar">{userStatus.user.username?.charAt(0).toUpperCase()}</div>
                )}
                <div className={`status-ring ${hasUnviewedStatus ? 'unviewed' : 'viewed'}`}></div>
              </div>
              <p className="status-name">{userStatus.user.username}</p>
            </div>
          );
        })}

        {statuses.length === 0 && (
          <p className="no-statuses">No statuses available. Create one or follow friends!</p>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
