import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { MdCall, MdVideoCall, MdSearch, MdSend, MdMoreVert, MdDeleteOutline, MdClose, MdHistory, MdArrowBack, MdStar, MdStarBorder } from 'react-icons/md';
import { BsEmojiSmile, BsPaperclip, BsMic, BsFillPlusCircleFill } from 'react-icons/bs';
import { IoMdInformationCircleOutline } from 'react-icons/io';
import { AiOutlineClear } from 'react-icons/ai';
import { FaFileLines, FaImage, FaCamera, FaHeadphones, FaUser, FaCheckToSlot, FaCalendarDays, FaFaceGrinWide } from 'react-icons/fa6';
import { BiCheckDouble } from 'react-icons/bi';
import { messageAPI } from '../services/api';
import './ChatWindow.css';

const ChatWindow = ({ selectedUser, messages, onSendMessage, currentUser, isTyping, socket, onClearChat, onDeleteChat, setMessages }) => {
  const [messageText, setMessageText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [favourites, setFavourites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('whatsapp_favourites')) || [];
    } catch (e) {
      return [];
    }
  });
  const typingTimeoutRef = useRef(null);

  const toggleFavourite = (userId, e) => {
    e.stopPropagation();
    let newFavs;
    if (favourites.includes(userId)) {
      newFavs = favourites.filter(id => id !== userId);
    } else {
      newFavs = [...favourites, userId];
    }
    setFavourites(newFavs);
    localStorage.setItem('whatsapp_favourites', JSON.stringify(newFavs));
    window.dispatchEvent(new CustomEvent('favourites_updated', { detail: newFavs }));
  };

  useEffect(() => {
    const handleFavouritesUpdate = (e) => {
      setFavourites(e.detail);
    };
    window.addEventListener('favourites_updated', handleFavouritesUpdate);
    return () => {
      window.removeEventListener('favourites_updated', handleFavouritesUpdate);
    };
  }, []);

  // Handle typing events
  useEffect(() => {
    if (!socket || !selectedUser) return;

    if (messageText.trim().length > 0) {
      socket.emit('typing', {
        senderId: currentUser._id || currentUser.id,
        receiverId: selectedUser._id || selectedUser.id
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', {
          senderId: currentUser._id || currentUser.id,
          receiverId: selectedUser._id || selectedUser.id
        });
      }, 3000);
    } else {
      socket.emit('stop_typing', {
        senderId: currentUser._id || currentUser.id,
        receiverId: selectedUser._id || selectedUser.id
      });
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [messageText, socket, selectedUser, currentUser]);
  const dropdownRef = useRef(null);
  const attachmentRef = useRef(null);
  const emojiRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (attachmentRef.current && !attachmentRef.current.contains(event.target)) {
        setShowAttachments(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText('');
      setShowEmojiPicker(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  const handleContactInfo = () => {
    setShowContactInfo(true);
    setShowDropdown(false);
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear all messages in this conversation? This action cannot be undone.')) {
      return;
    }
    try {
      const currentUserId = currentUser._id || currentUser.id;
      const selectedId = selectedUser._id || selectedUser.id;
      await messageAPI.deleteMessages(currentUserId, selectedId);
      // Clear messages from UI
      if (setMessages) setMessages([]);
      setShowDropdown(false);
      alert('Chat cleared successfully');
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear chat');
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('Delete this conversation? This action cannot be undone.')) {
      return;
    }
    try {
      const currentUserId = currentUser._id || currentUser.id;
      const selectedId = selectedUser._id || selectedUser.id;
      await messageAPI.deleteMessages(currentUserId, selectedId);
      // Notify parent component to remove this user from list and clear selection
      if (onDeleteChat) {
        onDeleteChat(selectedId);
      }
      setShowDropdown(false);
      alert('Conversation deleted successfully');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  return (
    <div className="chat-window-wrapper">
      <div className="chat-window">
        <div className="chat-window-header">
          <div className="chat-window-user-info">
            <div className="chat-window-avatar" onClick={() => setShowContactInfo(true)} style={{cursor: 'pointer'}}>
              {selectedUser?.profilePicture ? (
                <img src={selectedUser.profilePicture} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                selectedUser.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="chat-window-user-details" onClick={() => setShowContactInfo(true)} style={{cursor: 'pointer'}}>
              <h3>{selectedUser.username}</h3>
              {isTyping ? (
                <p className="typing-indicator">typing...</p>
              ) : (
                <p>{selectedUser.status === 'online' ? 'online' : 'offline'}</p>
              )}
            </div>
          </div>
          <div className="chat-window-header-actions">
          <button className="icon-button"><MdVideoCall size={26} /></button>
          <button className="icon-button"><MdCall size={22} /></button>
          <div className="divider"></div>
          <button className="icon-button"><MdSearch size={22} /></button>
          <div className="dropdown-wrapper" ref={dropdownRef}>
            <button 
              className={`icon-button ${showDropdown ? 'active' : ''}`}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <MdMoreVert size={22} />
            </button>
            {showDropdown && (
              <div className="chat-window-dropdown">
                <div className="dropdown-item" onClick={(e) => { toggleFavourite(selectedUser._id || selectedUser.id, e); setShowDropdown(false); }}>
                  {favourites.includes(selectedUser._id || selectedUser.id) ? (
                    <><MdStar className="menu-icon" style={{color: '#00a884'}} /> Remove favourite</>
                  ) : (
                    <><MdStarBorder className="menu-icon" /> Add to favourites</>
                  )}
                </div>
                <div className="dropdown-item" onClick={handleContactInfo}>
                  <IoMdInformationCircleOutline className="menu-icon" /> Contact info
                </div>
                <div className="dropdown-item" onClick={handleClearChat}>
                  <AiOutlineClear className="menu-icon" /> Clear chat
                </div>
                <div className="dropdown-item delete" onClick={handleDeleteChat}>
                  <MdDeleteOutline className="menu-icon" /> Delete chat
                </div>
              </div>
            )}
          </div>
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
                (msg.sender._id || msg.sender).toString() === (currentUser._id || currentUser.id).toString() ? 'sent' : 'received'
              }`}
            >
              <div className="message-content">
                <p>{msg.content}</p>
                <div className="message-meta">
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {(msg.sender?._id || msg.sender)?.toString() === (currentUser?._id || currentUser?.id)?.toString() && <BiCheckDouble className="read-receipt" />}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {isRecording ? (
        <div className="voice-recording-container">
          <div className="recording-trash" onClick={() => setIsRecording(false)}><MdDeleteOutline size={24} /></div>
          <div className="recording-status">
            <span className="recording-dot"></span>
            <span className="recording-time">0:01</span>
          </div>
          <div className="recording-visualizer">
            <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
            <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
            <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
          </div>
          <div className="recording-pause" onClick={() => setIsRecording(false)}><MdClose size={24} /></div>
          <div className="recording-once"><MdHistory size={20} /></div>
          <button className="send-button voice-send" onClick={() => setIsRecording(false)}><MdSend size={24} /></button>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="message-input-form">
          <div className="emoji-wrapper" ref={emojiRef}>
            <button 
              type="button" 
              className={`icon-button ${showEmojiPicker ? 'active' : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <BsEmojiSmile size={24} />
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker-container">
                <EmojiPicker onEmojiClick={onEmojiClick} width={350} height={400} />
              </div>
            )}
          </div>
          <div className="attachment-wrapper" ref={attachmentRef}>
            <button 
              type="button" 
              className={`icon-button ${showAttachments ? 'active' : ''}`}
              onClick={() => setShowAttachments(!showAttachments)}
            >
              {showAttachments ? <BsFillPlusCircleFill size={22} color="#00a884" style={{transform: 'rotate(45deg)', transition: '0.2s'}} /> : <BsPaperclip size={24} />}
            </button>
            {showAttachments && (
              <div className="attachment-popup">
                <div className="attach-item document"><FaFileLines className="attach-icon" /> Document</div>
                <div className="attach-item photos"><FaImage className="attach-icon" /> Photos & videos</div>
                <div className="attach-item camera"><FaCamera className="attach-icon" /> Camera</div>
                <div className="attach-item audio"><FaHeadphones className="attach-icon" /> Audio</div>
                <div className="attach-item contact"><FaUser className="attach-icon" /> Contact</div>
                <div className="attach-item poll"><FaCheckToSlot className="attach-icon" /> Poll</div>
                <div className="attach-item event"><FaCalendarDays className="attach-icon" /> Event</div>
                <div className="attach-item sticker"><FaFaceGrinWide className="attach-icon" /> New sticker</div>
              </div>
            )}
          </div>
          
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
            <button type="button" className="send-button" onClick={() => setIsRecording(true)}>
              <BsMic size={24} />
            </button>
          )}
        </form>
      )}
      </div>

      {showContactInfo && (
        <div className="contact-info-sidepanel">
          <div className="contact-drawer-header">
            <div className="contact-drawer-header-content">
              <button className="back-btn" onClick={() => setShowContactInfo(false)}>
                <MdArrowBack size={24} />
              </button>
              <span>Profile</span>
            </div>
          </div>
          <div className="contact-info-content">
            <div className="contact-photo-section">
              <div className="contact-photo-large view-only">
                {selectedUser?.profilePicture ? (
                  <img src={selectedUser.profilePicture} alt="Profile" />
                ) : (
                  selectedUser.username.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            
            <div className="contact-photo-name">
              {selectedUser.username}
            </div>

            <div className="contact-info-section">
              <label>About</label>
              <div className="contact-info-row">
                <div className="contact-info-text">Available</div>
              </div>
            </div>

            <div className="contact-info-section">
              <label>Phone number</label>
              <div className="contact-info-row">
                <div className="contact-info-text">{selectedUser.phoneNumber || selectedUser.email}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
