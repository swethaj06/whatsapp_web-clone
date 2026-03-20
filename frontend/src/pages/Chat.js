import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, messageAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import toast from 'react-hot-toast';
import './Chat.css';
import { FaWhatsapp } from 'react-icons/fa';
import { MdLockOutline, MdChat, MdDonutLarge, MdGroups, MdSettings, MdLaptopMac, MdInsertDriveFile, MdPersonAddAlt1, MdArrowBack, MdEdit } from 'react-icons/md';

const Chat = () => {
  const navigate = useNavigate();
  const { user, logout, updateUserProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const [response] = await Promise.all([
          userAPI.getAllUsers(),
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);
        const currentUserId = user._id || user.id;
        const otherUsers = response.data
          .filter(u => (u._id || u.id).toString() !== currentUserId.toString())
          .map(u => ({
            ...u,
            lastMessage: u.lastMessage || 'Hey there! I am using WhatsApp.',
            lastMessageTime: u.lastMessageTime || ''
          }));
        setUsers(otherUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    const socketInstance = connectSocket();
    if (socketInstance && user) {
      socketInstance.emit('join', (user._id || user.id).toString());
    }
    setSocket(socketInstance);
    fetchUsers();

    return () => {
      disconnectSocket();
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!selectedUser || !socket) return;

    const fetchMessages = async () => {
      try {
        const currentUserId = user._id || user.id;
        const selectedId = selectedUser._id || selectedUser.id;
        const response = await messageAPI.getMessages(currentUserId, selectedId);
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    const handleReceiveMessage = (data) => {
      const msgSenderId = (data.sender._id || data.sender).toString();
      const msgReceiverId = (data.receiver._id || data.receiver).toString();
      const currentUserId = (user._id || user.id).toString();
      const selectedId = selectedUser ? (selectedUser._id || selectedUser.id).toString() : null;

      if (
        selectedId && 
        ((msgSenderId === currentUserId && msgReceiverId === selectedId) ||
         (msgSenderId === selectedId && msgReceiverId === currentUserId))
      ) {
        setMessages(prev => {
          const exists = prev.some(m => (m._id || m.id).toString() === (data._id || data.id).toString());
          if (exists) return prev;
          return [...prev, data];
        });
      }

      setUsers(prevUsers => prevUsers.map(u => {
        const uId = (u._id || u.id).toString();
        if (uId === msgSenderId || uId === msgReceiverId) {
          if (uId === currentUserId) return u; 
          return {
            ...u,
            lastMessage: data.content,
            lastMessageTime: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: (uId === msgSenderId && selectedId !== uId) ? (u.unreadCount || 0) + 1 : (u.unreadCount || 0)
          };
        }
        return u;
      }));
    };

    socket.on('receive_message', handleReceiveMessage);

    const handleStatusChange = ({ userId, status }) => {
      setUsers(prev => prev.map(u => {
        if ((u._id || u.id).toString() === userId.toString()) {
          return { ...u, status };
        }
        return u;
      }));
      if (selectedUser && (selectedUser._id || selectedUser.id).toString() === userId.toString()) {
        setSelectedUser(prev => ({ ...prev, status }));
      }
    };

    socket.on('user_status_change', handleStatusChange);

    socket.on('user_typing', ({ senderId }) => {
      if (selectedUser && (selectedUser._id || selectedUser.id).toString() === senderId.toString()) {
        setIsTyping(true);
      }
    });

    socket.on('user_stop_typing', ({ senderId }) => {
      if (selectedUser && (selectedUser._id || selectedUser.id).toString() === senderId.toString()) {
        setIsTyping(false);
      }
    });

    const handleProfileUpdate = ({ userId, profilePicture, username }) => {
      setUsers(prev => prev.map(u => {
        if ((u._id || u.id).toString() === userId.toString()) {
          return { ...u, profilePicture: profilePicture || u.profilePicture, username: username || u.username };
        }
        return u;
      }));
      if (selectedUser && (selectedUser._id || selectedUser.id).toString() === userId.toString()) {
        setSelectedUser(prev => ({ ...prev, profilePicture: profilePicture || prev.profilePicture, username: username || prev.username }));
      }
    };

    socket.on('user_profile_update', handleProfileUpdate);

    const handleNewUser = (newUser) => {
      setUsers(prev => {
        const exists = prev.some(u => (u._id || u.id).toString() === (newUser._id || newUser.id).toString());
        if (exists || (user._id || user.id).toString() === (newUser._id || newUser.id).toString()) {
          return prev;
        }

        // Show a professional toast notification when a new user joins
        toast(`${newUser.username} is on your contact. You can search and message them!`, {
          icon: '👋',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
          duration: 5000,
        });

        return [...prev, {
          ...newUser,
          lastMessage: 'Hey there! I am using WhatsApp.',
          lastMessageTime: ''
        }];
      });
    };

    socket.on('new_user', handleNewUser);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_status_change', handleStatusChange);
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('user_profile_update', handleProfileUpdate);
      socket.off('new_user', handleNewUser);
    };
  }, [selectedUser, user, socket]);

  const handleSendMessage = async (content) => {
    if (!content.trim() || !selectedUser) return;
    try {
      const currentUserId = user._id || user.id;
      const selectedId = selectedUser._id || selectedUser.id;
      const messageData = {
        sender: currentUserId,
        receiver: selectedId,
        content
      };
      const response = await messageAPI.sendMessage(messageData);
      if (socket) {
        socket.emit('send_message', response.data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleClearChat = (userId) => {
    setMessages([]);
  };

  const handleDeleteChat = (userId) => {
    // Remove user from the list
    setUsers(prevUsers => prevUsers.filter(u => (u._id || u.id).toString() !== userId.toString()));
    // Clear messages and selected user
    setMessages([]);
    setSelectedUser(null);
  };

  const handleSelectUser = (userToSelect) => {
    setSelectedUser(userToSelect);
    // Clear unread count for this user
    setUsers(prev => prev.map(u => {
      if ((u._id || u.id).toString() === (userToSelect._id || userToSelect.id).toString()) {
        return { ...u, unreadCount: 0 };
      }
      return u;
    }));
  };

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate('/login');
  };

  const getShortName = (fullName) => {
    if (!fullName) return '';
    return fullName.split(/[_\s]/)[0];
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await updateUserProfile({ profilePicture: reader.result });
        if (socket) {
          socket.emit('update_profile', {
            userId: user._id || user.id,
            profilePicture: reader.result,
            username: user.username
          });
        }
      } catch (error) {
        console.error('Failed to update profile picture:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="wa-chat-connecting">
        <div className="connecting-content">
          <FaWhatsapp className="connecting-logo" />
          <h2 className="connecting-title">Loading your chats</h2>
          <div className="connecting-progress-container">
            <div className="connecting-progress-bar"></div>
          </div>
          <div className="connecting-encryption">
            <MdLockOutline size={14} /> End-to-end encrypted
          </div>
        </div>
        <button className="connecting-logout-btn" onClick={handleLogout}>Log out</button>
      </div>
    );
  }

  return (
    <div className="chat-layout-dark">
      <div className="chat-sidebar-thin">
        <div className="sidebar-top">
          <div className={`sidebar-icon ${!showProfile ? 'active-icon' : ''}`} title="Chats" onClick={() => setShowProfile(false)}><MdChat size={22} /></div>
          <div className="sidebar-icon" title="Status"><MdDonutLarge size={22} /></div>
          <div className="sidebar-icon" title="Communities"><MdGroups size={24} /></div>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-icon" title="Settings"><MdSettings size={24} /></div>
          <div className={`sidebar-icon profile-icon ${showProfile ? 'active-icon' : ''}`} onClick={() => setShowProfile(true)} title="Profile">
             {user?.profilePicture ? (
               <img src={user.profilePicture} alt="S" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
             ) : (
               user?.username ? user.username.charAt(0).toUpperCase() : '?'
             )}
          </div>
        </div>
      </div>

      <div className="chat-list-panel">
        {showProfile ? (
          <div className="profile-drawer">
            <div className="drawer-header">
              <div className="drawer-header-content">
                <button className="back-btn" onClick={() => setShowProfile(false)}>
                  <MdArrowBack size={24} />
                </button>
                <span>Profile</span>
              </div>
            </div>
            <div className="drawer-content">
              <div className="profile-photo-section">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <div className="profile-photo-large" onClick={handleImageClick}>
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user?.username ? user.username.charAt(0).toUpperCase() : '?'
                  )}
                </div>
              </div>
              
              <div className="profile-info-section">
                <label>Your name</label>
                <div className="profile-info-row">
                  <div className="profile-info-text">{getShortName(user?.username)}</div>
                  <MdEdit className="edit-icon" />
                </div>
                <p className="profile-disclaimer">This is not your username or PIN. This name will be visible to your WhatsApp contacts.</p>
              </div>

              <div className="profile-info-section">
                <label>About</label>
                <div className="profile-info-row">
                  <div className="profile-info-text">Available</div>
                  <MdEdit className="edit-icon" />
                </div>
              </div>

              <div className="profile-info-section">
                <label>Phone number</label>
                <div className="profile-info-row">
                  <div className="profile-info-text">{user?.phoneNumber || user?.email}</div>
                </div>
              </div>

              <div className="profile-logout-section">
                <button className="profile-logout-btn" onClick={handleLogout}>Log out</button>
              </div>
            </div>
          </div>
        ) : (
          <ChatList
            users={users}
            currentUser={user}
            selectedUser={selectedUser}
            onSelectUser={handleSelectUser}
            onLogout={handleLogout}
            onProfileClick={() => setShowProfile(true)}
          />
        )}
      </div>

      <div className="chat-window-panel">
        {selectedUser ? (
          <ChatWindow
            selectedUser={selectedUser}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUser={user}
            isTyping={isTyping}
            socket={socket}
            onClearChat={handleClearChat}
            onDeleteChat={handleDeleteChat}
            setMessages={setMessages}
          />
        ) : (
          <div className="empty-chat-state">
             <div className="empty-download-card">
               <div className="laptop-graphic">
                 <MdLaptopMac size={80} color="#00a884" />
               </div>
               <h2>Download WhatsApp for Windows</h2>
               <p>Get extra features like voice and video calling, screen sharing and more.</p>
               <button className="empty-download-btn" onClick={() => window.open('https://www.whatsapp.com/download')}>Download</button>
             </div>
             
             <div className="empty-quick-actions">
               <div className="action-pill-wrapper">
                 <div className="action-pill"><MdInsertDriveFile className="pill-icon" /></div>
                 <span className="pill-text">Send document</span>
               </div>
               <div className="action-pill-wrapper">
                 <div className="action-pill"><MdPersonAddAlt1 className="pill-icon" /></div>
                 <span className="pill-text">Add contact</span>
               </div>
               <div className="action-pill-wrapper">
                 <div className="action-pill"><MdDonutLarge color="#33b2ff" className="pill-icon" /></div>
                 <span className="pill-text">Ask Meta AI</span>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
