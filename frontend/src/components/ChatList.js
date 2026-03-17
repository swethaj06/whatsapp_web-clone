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
          users.map(u => (
            <div
              key={u.id}
              className={`chat-item ${selectedUser?.id === u.id ? 'active' : ''}`}
              onClick={() => onSelectUser(u)}
            >
              <div className="chat-item-avatar">
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div className="chat-item-content">
                <div className="chat-item-name">{u.username}</div>
                <div className="chat-item-email">{u.email}</div>
              </div>
              {selectedUser?.id === u.id && <div className="active-indicator" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
