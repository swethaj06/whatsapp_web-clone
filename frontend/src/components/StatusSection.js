import React, { useState, useEffect } from 'react';
import { statusAPI, normalizeFileUrl } from '../services/api';
import { MdImage, MdVideoLibrary, MdAdd } from 'react-icons/md';
import './StatusSection.css';

const StatusSection = ({ currentUser, onStatusClick, onCreateStatusClick, refreshTrigger = 0 }) => {
  const [statuses, setStatuses] = useState([]);
  const [viewedStatusIds, setViewedStatusIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatuses();
  }, [refreshTrigger, currentUser?._id]);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      console.log('📸 [StatusSection] Fetching all statuses for user:', currentUser?._id);
      const response = await statusAPI.getStatuses();
      console.log('📸 [StatusSection] Received statuses:', response.data);
      
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
      console.error('❌ Error fetching statuses:', error);
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

  if (loading) {
    return <div className="status-section"><p className="status-section-loading">Loading statuses...</p></div>;
  }

  return (
    <div className="status-section">
      <div className="status-section-header">
        <div className="status-section-header-content">
          <h3>Status Updates</h3>
          <p className="status-section-subtitle">{statuses.length} users with statuses</p>
        </div>
        {onCreateStatusClick && (
          <button 
            className="status-create-btn"
            onClick={onCreateStatusClick}
            title="Create a new status"
          >
            <MdAdd size={24} />
          </button>
        )}
      </div>

      <div className="status-section-list">
        {statuses.length === 0 ? (
          <div className="status-section-empty">
            <MdImage size={48} style={{ opacity: 0.3 }} />
            <p>No statuses available</p>
            <small>Create a status or follow friends to see theirs</small>
          </div>
        ) : (
          statuses.map((userStatus) => {
            const isCurrentUserStatus = userStatus.user._id === currentUser?._id || userStatus.user._id.toString() === currentUser?._id.toString();
            const hasUnviewedStatus = userStatus.statuses.some(
              status => !viewedStatusIds.has(status._id)
            );
            
            // Get the first status to show preview
            const firstStatus = userStatus.statuses[0];
            const statusType = firstStatus?.mediaType || 'text';
            
            return (
              <div
                key={userStatus.user._id}
                className={`status-section-item ${hasUnviewedStatus ? 'unviewed' : 'viewed'} ${isCurrentUserStatus ? 'my-story' : ''}`}
                onClick={() => handleStatusClick(userStatus)}
              >
                <div className="status-section-avatar">
                  {userStatus.user.profilePicture ? (
                    <img 
                      src={normalizeFileUrl(userStatus.user.profilePicture)} 
                      alt={userStatus.user.username}
                      className="status-section-avatar-img"
                    />
                  ) : (
                    <div className="status-section-default-avatar">
                      {userStatus.user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {hasUnviewedStatus && <div className="status-section-unviewed-indicator"></div>}
                </div>

                <div className="status-section-info">
                  <div className="status-section-username">
                    {isCurrentUserStatus ? 'My Story' : userStatus.user.username}
                  </div>
                  <div className="status-section-meta">
                    <span className="status-section-count">
                      {userStatus.statuses.length} {userStatus.statuses.length === 1 ? 'story' : 'stories'}
                    </span>
                    {statusType !== 'text' && (
                      <span className="status-section-type">
                        {statusType === 'image' && <MdImage size={16} />}
                        {statusType === 'video' && <MdVideoLibrary size={16} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StatusSection;
