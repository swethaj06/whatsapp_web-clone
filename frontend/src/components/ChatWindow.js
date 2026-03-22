import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { MdCall, MdVideoCall, MdSearch, MdSend, MdMoreVert, MdDeleteOutline, MdClose, MdHistory, MdArrowBack, MdStar, MdStarBorder, MdOpenInNew, MdDownload } from 'react-icons/md';
import { BsEmojiSmile, BsPaperclip, BsMic, BsFillPlusCircleFill } from 'react-icons/bs';
import { IoMdInformationCircleOutline } from 'react-icons/io';
import { AiOutlineClear } from 'react-icons/ai';
import { FaFileLines, FaImage, FaHeadphones } from 'react-icons/fa6';
import { BiCheckDouble } from 'react-icons/bi';
import { messageAPI, normalizeFileUrl } from '../services/api';
import ConfirmationModal from './ConfirmationModal';
import NotificationModal from './NotificationModal';
import './ChatWindow.css';

const ChatWindow = ({ selectedUser, messages, onSendMessage, currentUser, isTyping, socket, onClearChat, onDeleteChat, setMessages }) => {
  const [messageText, setMessageText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({ type: 'success', title: '', message: '' });
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [favourites, setFavourites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('whatsapp_favourites')) || [];
    } catch (e) {
      return [];
    }
  });
  const typingTimeoutRef = useRef(null);
  const photoVideoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

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

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
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

  const getAttachmentType = (file) => {
    if (!file) return 'document';
    if (file.type?.startsWith('image/')) return 'image';
    if (file.type?.startsWith('video/')) return 'video';
    if (file.type?.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getDisplayFileName = (msg) => {
    if (msg.fileName && msg.fileName.trim()) return msg.fileName;
    if (msg.content && msg.content.trim()) return msg.content;
    const normalizedUrl = normalizeFileUrl(msg.fileUrl || '');
    const fileUrlParts = normalizedUrl.split('/') || [];
    return fileUrlParts[fileUrlParts.length - 1] || 'attachment';
  };

  const getFileUrl = (msg) => normalizeFileUrl(msg.fileUrl || '');

  const formatFileSize = (fileSize) => {
    if (!fileSize) return '';
    if (fileSize < 1024) return `${fileSize} B`;
    if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(2)} KB`;
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
  };

  const resetInputValue = (inputRef) => {
    if (inputRef?.current) {
      inputRef.current.value = '';
    }
  };

  const createObjectUrl = (file) => {
    const objectUrl = URL.createObjectURL(file);
    objectUrlsRef.current.add(objectUrl);
    return objectUrl;
  };

  const cleanupObjectUrl = (url) => {
    if (url && url.startsWith('blob:') && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  const handleAttachmentSelect = async (requestedType, file, inputRef) => {
    if (!file || !selectedUser) {
      resetInputValue(inputRef);
      return;
    }

    const resolvedType = requestedType === 'auto' ? getAttachmentType(file) : requestedType;
    const optimisticId = `temp_${Date.now()}_${file.name}`;
    const objectUrl = createObjectUrl(file);

    try {
      const optimisticMessage = {
        _id: optimisticId,
        sender: currentUser._id || currentUser.id,
        receiver: selectedUser._id || selectedUser.id,
        content: file.name,
        messageType: resolvedType,
        fileUrl: objectUrl,
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date(),
        isOptimistic: true
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setShowAttachments(false);

      const formData = new FormData();
      formData.append('sender', currentUser._id || currentUser.id);
      formData.append('receiver', selectedUser._id || selectedUser.id);
      formData.append('content', file.name);
      formData.append('messageType', resolvedType);
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size);
      formData.append('attachment', file);

      const response = await messageAPI.sendAttachment(formData);

      if (response.data) {
        cleanupObjectUrl(objectUrl);
        setMessages(prev =>
          prev.map(msg =>
            msg._id === optimisticId ? response.data : msg
          )
        );

        if (socket) {
          socket.emit('send_message', response.data);
        }
      }
    } catch (error) {
      console.error(`Error sending ${resolvedType}:`, error);
      cleanupObjectUrl(objectUrl);
      setMessages(prev => prev.filter(msg => msg._id !== optimisticId));
      setNotificationData({
        type: 'error',
        title: 'UPLOAD FAILED',
        message: `Failed to send ${resolvedType}. Please try again.`
      });
      setShowNotification(true);
    } finally {
      resetInputValue(inputRef);
    }
  };

  const handlePhotosVideos = () => {
    photoVideoInputRef.current?.click();
  };

  const handleAudio = () => {
    audioInputRef.current?.click();
  };

  const handleDocument = () => {
    documentInputRef.current?.click();
  };

  const handleContactInfo = () => {
    setShowContactInfo(true);
    setShowDropdown(false);
  };

  const handleClearChat = () => {
    setShowClearConfirmation(true);
  };

  const handleConfirmClear = async () => {
    setIsLoadingAction(true);
    try {
      const currentUserId = currentUser._id || currentUser.id;
      const selectedId = selectedUser._id || selectedUser.id;
      await messageAPI.deleteMessages(currentUserId, selectedId);
      if (setMessages) setMessages([]);
      setShowDropdown(false);
      setShowClearConfirmation(false);
      setNotificationData({
        type: 'success',
        title: 'SUCCESS',
        message: 'Chat cleared successfully'
      });
      setShowNotification(true);
    } catch (error) {
      console.error('Error clearing chat:', error);
      setShowClearConfirmation(false);
      setNotificationData({
        type: 'error',
        title: 'ERROR',
        message: 'Failed to clear chat'
      });
      setShowNotification(true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDeleteChat = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    setIsLoadingAction(true);
    try {
      const currentUserId = currentUser._id || currentUser.id;
      const selectedId = selectedUser._id || selectedUser.id;
      await messageAPI.deleteMessages(currentUserId, selectedId);
      if (onDeleteChat) {
        onDeleteChat(selectedId);
      }
      setShowDropdown(false);
      setShowDeleteConfirmation(false);
      setNotificationData({
        type: 'success',
        title: 'SUCCESS',
        message: 'Conversation deleted successfully'
      });
      setShowNotification(true);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setShowDeleteConfirmation(false);
      setNotificationData({
        type: 'error',
        title: 'ERROR',
        message: 'Failed to delete conversation'
      });
      setShowNotification(true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const renderAttachmentMessage = (msg) => {
    const fileUrl = getFileUrl(msg);
    const displayFileName = getDisplayFileName(msg);

    if (msg.messageType === 'image' || msg.messageType === 'video') {
      return (
        <div className="media-preview">
          {msg.messageType === 'image' ? (
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <img
                src={fileUrl}
                alt={displayFileName}
                className="message-media"
              />
            </a>
          ) : (
            <video className="message-media" controls preload="metadata">
              <source src={fileUrl} />
              Your browser does not support the video tag.
            </video>
          )}
          <div className="media-filename">{displayFileName}</div>
          <div className="document-preview">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="document-link">
              <MdOpenInNew size={16} /> Open
            </a>
            <a href={fileUrl} download={displayFileName} className="document-link">
              <MdDownload size={16} /> Download
            </a>
          </div>
        </div>
      );
    }

    if (msg.messageType === 'audio') {
      return (
        <div className="audio-preview">
          <div className="audio-filename">{displayFileName}</div>
          <audio controls className="message-audio">
            <source src={fileUrl} />
            Your browser does not support the audio element.
          </audio>
          <div className="document-preview">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="document-link">
              <MdOpenInNew size={16} /> Open
            </a>
            <a href={fileUrl} download={displayFileName} className="document-link">
              <MdDownload size={16} /> Download
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="document-preview">
        <a href={fileUrl} target="_blank" rel="noreferrer" className="document-link">
          📄 {displayFileName}
        </a>
        <span className="file-size">{msg.fileSize ? `(${formatFileSize(msg.fileSize)})` : ''}</span>
        <div className="document-preview">
          <a href={fileUrl} target="_blank" rel="noreferrer" className="document-link">
            <MdOpenInNew size={16} /> Open
          </a>
          <a href={fileUrl} download={displayFileName} className="document-link">
            <MdDownload size={16} /> Download
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-window-wrapper">
      <div className="chat-window">
        <div className="chat-window-header">
          <div className="chat-window-user-info">
            <div className="chat-window-avatar" onClick={() => setShowContactInfo(true)} style={{ cursor: 'pointer' }}>
              {selectedUser?.profilePicture ? (
                <img src={selectedUser.profilePicture} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                selectedUser.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="chat-window-user-details" onClick={() => setShowContactInfo(true)} style={{ cursor: 'pointer' }}>
              <h3>{selectedUser.username}</h3>
              {isTyping ? (
                <p className="typing-indicator">typing...</p>
              ) : (
                <p>{selectedUser?.status && selectedUser.status === 'online' ? 'online' : 'offline'}</p>
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
                      <><MdStar className="menu-icon" style={{ color: '#00a884' }} /> Remove favourite</>
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
                className={`message ${(msg.sender._id || msg.sender).toString() === (currentUser._id || currentUser.id).toString() ? 'sent' : 'received'}`}
              >
                <div className="message-content">
                  {msg.messageType && msg.messageType !== 'text' ? (
                    <div className={`attachment-message attachment-${msg.messageType}`}>
                      {renderAttachmentMessage(msg)}
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <div className="message-meta">
                    {msg.isOptimistic && (
                      <span className="message-time sending">sending...</span>
                    )}
                    {!msg.isOptimistic && (
                      <>
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {(msg.sender?._id || msg.sender)?.toString() === (currentUser?._id || currentUser?.id)?.toString() && <BiCheckDouble className="read-receipt" />}
                      </>
                    )}
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
                {showAttachments ? <BsFillPlusCircleFill size={22} color="#00a884" style={{ transform: 'rotate(45deg)', transition: '0.2s' }} /> : <BsPaperclip size={24} />}
              </button>
              {showAttachments && (
                <div className="attachment-popup">
                  <div className="attach-item document" onClick={handleDocument}><FaFileLines className="attach-icon" /> Document</div>
                  <div className="attach-item photos" onClick={handlePhotosVideos}><FaImage className="attach-icon" /> Photos & videos</div>
                  <div className="attach-item audio" onClick={handleAudio}><FaHeadphones className="attach-icon" /> Audio</div>
                </div>
              )}
              <input
                type="file"
                ref={photoVideoInputRef}
                onChange={(e) => handleAttachmentSelect('auto', e.target.files?.[0], photoVideoInputRef)}
                accept="image/*,video/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={audioInputRef}
                onChange={(e) => handleAttachmentSelect('audio', e.target.files?.[0], audioInputRef)}
                accept="audio/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={documentInputRef}
                onChange={(e) => handleAttachmentSelect('document', e.target.files?.[0], documentInputRef)}
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                style={{ display: 'none' }}
              />
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

      <ConfirmationModal
        isOpen={showClearConfirmation}
        title="Clear Chat?"
        message="Clear all messages in this conversation? This action cannot be undone."
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirmation(false)}
        isLoading={isLoadingAction}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Delete Conversation?"
        message="Delete this conversation? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirmation(false)}
        isLoading={isLoadingAction}
      />

      <NotificationModal
        isOpen={showNotification}
        type={notificationData.type}
        title={notificationData.title}
        message={notificationData.message}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
};

export default ChatWindow;
