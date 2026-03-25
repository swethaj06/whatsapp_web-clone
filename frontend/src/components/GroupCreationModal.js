import React, { useState } from 'react';
import { MdClose, MdCheck } from 'react-icons/md';
import './Modal.css';

const GroupCreationModal = ({ isOpen, onClose, users, currentUserId, onCreateGroup }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const availableUsers = users.filter(
    user => (user._id || user.id).toString() !== currentUserId.toString()
  );

  const filteredUsers = availableUsers.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('Please select at least one member');
      return;
    }

    setLoading(true);
    try {
      await onCreateGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        memberIds: selectedMembers
      });

      // Reset form
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Group</h2>
          <MdClose className="modal-close-icon" onClick={onClose} />
        </div>

        <div className="modal-body">
          {/* Group Name Input */}
          <div className="form-group">
            <label>Group Name *</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={50}
            />
            <small>{groupName.length}/50</small>
          </div>

          {/* Group Description Input */}
          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              placeholder="Add a group description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              maxLength={150}
              rows={3}
            />
            <small>{groupDescription.length}/150</small>
          </div>

          {/* Member Search */}
          <div className="form-group">
            <label>Add Members *</label>
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Selected Members Display */}
          {selectedMembers.length > 0 && (
            <div className="selected-members">
              <div className="selected-members-label">
                Selected Members ({selectedMembers.length})
              </div>
              <div className="selected-members-list">
                {selectedMembers.map(memberId => {
                  const member = availableUsers.find(u => (u._id || u.id).toString() === memberId.toString());
                  return member ? (
                    <div key={memberId} className="selected-member-chip">
                      {member.username}
                      <MdClose
                        className="chip-remove-icon"
                        onClick={() => toggleMemberSelection(memberId)}
                      />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="members-list">
            <div className="members-list-header">Select Members to Add</div>
            <div className="members-scroll">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  const userId = user._id || user.id;
                  const isSelected = selectedMembers.includes(userId);

                  return (
                    <div
                      key={userId}
                      className={`member-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleMemberSelection(userId)}
                    >
                      <div className="member-avatar">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.username} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="member-info">
                        <div className="member-name">{user.username}</div>
                        <div className="member-email">{user.email}</div>
                      </div>
                      {isSelected && <MdCheck className="member-check-icon" />}
                    </div>
                  );
                })
              ) : (
                <div className="no-members-found">No members found</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim() || selectedMembers.length === 0}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupCreationModal;
