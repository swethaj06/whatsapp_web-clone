import React from 'react';
import './ChatList.css';

const ChatList = ({ users, selectedUser, onSelectUser }) => {
  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Chats</h2>
      </div>
      <div className="chat-list-items">
        {users.length === 0 ? (
          <div className="no-users">No users available</div>
        ) : (
          users.map(u => {
            const userId = u._id || u.id;
            const selectedId = selectedUser ? (selectedUser._id || selectedUser.id) : null;
            const isActive = selectedId === userId;
            
            return (
              <div
                key={userId}
                className={`chat-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectUser(u)}
              >
                <div className="chat-item-avatar">
                  {u.username ? u.username.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="chat-item-content">
                  <div className="chat-item-name">{u.username}</div>
                  <div className="chat-item-preview">{u.lastMessage || u.email}</div>
                </div>
                <div className="chat-item-meta">
                  {u.lastMessageTime && <div className="chat-time">{u.lastMessageTime}</div>}
                  {u.unreadCount > 0 && <div className="unread-badge">{u.unreadCount}</div>}
                </div>
                {isActive && <div className="active-indicator" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;
