import React, { useState, useEffect, useCallback } from 'react';
import { statusAPI } from '../services/api';
import { normalizeFileUrl } from '../services/api';
import './StatusBar.css';
import { MdAdd } from 'react-icons/md';

const StatusBar = ({ currentUser, onStatusClick, onCreateStatusClick, hideCreateButton = false, refreshTrigger = 0 }) => {
  const [statuses, setStatuses] = useState([]);
  const [viewedStatusIds, setViewedStatusIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await statusAPI.getStatuses();
      
      let allStatuses = response.data || [];
      
      // Sort: current user's status first, then by creation date
      allStatuses.sort((a, b) => {
        const aIsCurrentUser = a.user._id === currentUser?._id || a.user._id.toString() === currentUser?._id.toString();
        const bIsCurrentUser = b.user._id === currentUser?._id || b.user._id.toString() === currentUser?._id.toString();
        
        if (aIsCurrentUser && !bIsCurrentUser) return -1;
        if (!aIsCurrentUser && bIsCurrentUser) return 1;
        
        return new Date(b.statuses[0]?.createdAt || 0) - new Date(a.statuses[0]?.createdAt || 0);
      });
      
      setStatuses(allStatuses);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id]);

  useEffect(() => {
    fetchStatuses();
  }, [refreshTrigger, currentUser?._id, fetchStatuses]);

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

  // Find current user's statuses
  const currentUserStatuses = statuses.find(
    s => s.user._id === currentUser?._id || s.user._id.toString() === currentUser?._id.toString()
  );
  const otherUsersStatuses = statuses.filter(
    s => s.user._id !== currentUser?._id && s.user._id.toString() !== currentUser?._id.toString()
  );

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

        {/* Display current user's already uploaded statuses */}
        {currentUserStatuses && currentUserStatuses.statuses.length > 0 && (
          <div
            className={`status-item ${currentUserStatuses.statuses.some(s => !viewedStatusIds.has(s._id)) ? 'unviewed' : 'viewed'}`}
            onClick={() => handleStatusClick(currentUserStatuses)}
          >
            <div className="status-avatar">
              {currentUserStatuses.user.profilePicture ? (
                <img src={normalizeFileUrl(currentUserStatuses.user.profilePicture)} alt={currentUserStatuses.user.username} />
              ) : (
                <div className="default-avatar">{currentUserStatuses.user.username?.charAt(0).toUpperCase()}</div>
              )}
              <div className={`status-ring ${currentUserStatuses.statuses.some(s => !viewedStatusIds.has(s._id)) ? 'unviewed' : 'viewed'}`}></div>
            </div>
            <p className="status-name">Your statuses ({currentUserStatuses.statuses.length})</p>
          </div>
        )}

        {/* Display statuses from other users */}
        {otherUsersStatuses.map((userStatus) => {
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
