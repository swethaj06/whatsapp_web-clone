import React, { useState, useEffect, useRef } from 'react';
import { MdCall, MdVideoCall, MdSearch, MdSend } from 'react-icons/md';
import { BsEmojiSmile, BsPaperclip, BsMic } from 'react-icons/bs';
import './ChatWindow.css';

const ChatWindow = ({ selectedUser, messages, onSendMessage, currentUser }) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText('');
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-window-user-info">
          <div className="chat-window-avatar">
            {selectedUser.username.charAt(0).toUpperCase()}
          </div>
          <div className="chat-window-user-details">
            <h3>{selectedUser.username}</h3>
            <p>online</p>
          </div>
        </div>
        <div className="chat-window-header-actions">
          <button className="icon-button"><MdVideoCall size={26} /></button>
          <button className="icon-button"><MdCall size={22} /></button>
          <div className="divider"></div>
          <button className="icon-button"><MdSearch size={22} /></button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
           <div className="no-messages">
             <p>No messages yet. Start the conversation!</p>
           </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id || msg.id}
              className={`message ${
                (msg.sender._id || msg.sender) === (currentUser._id || currentUser.id) ? 'sent' : 'received'
              }`}
            >
              <div className="message-content">
                <p>{msg.content}</p>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input-form">
        <button type="button" className="icon-button"><BsEmojiSmile size={24} /></button>
        <button type="button" className="icon-button"><BsPaperclip size={24} /></button>
        
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message"
          className="message-input"
        />
        
        {messageText.trim() ? (
          <button type="submit" className="send-button active">
            <MdSend size={24} />
          </button>
        ) : (
          <button type="button" className="send-button">
            <BsMic size={24} />
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatWindow;
