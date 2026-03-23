import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const selectedUserRef = useRef(null);

  const isUIDMatch = (id1, id2) => {
    if (!id1 || !id2) return false;
    return id1.toString() === id2.toString();
  };

  const formatConversationPreview = (messageSummary = {}) => {
    if (messageSummary.lastMessageType && messageSummary.lastMessageType !== 'text') {
      return messageSummary.lastMessageFileName || messageSummary.lastMessage || 'Attachment';
    }

    return messageSummary.lastMessage || 'Hey there! I am using WhatsApp.';
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const currentUserId = user._id || user.id;
        const [usersResponse, summariesResponse] = await Promise.all([
          userAPI.getAllUsers(),
          messageAPI.getConversationSummaries(currentUserId)
        ]);
        const conversationSummaryMap = new Map(
          summariesResponse.data.map(summary => [summary._id?.toString(), summary])
        );

        const otherUsers = usersResponse.data
          .filter(u => !isUIDMatch(u._id || u.id, currentUserId))
          .map(u => {
            const userId = u._id || u.id;
            const summary = conversationSummaryMap.get(userId?.toString());

            return {
              ...u,
              lastMessage: formatConversationPreview(summary),
              lastMessageTime: summary?.lastMessageTime
                ? new Date(summary.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
              unreadCount: summary?.unreadCount || 0
            };
          });

        setUsers(prev => {
          // If we already have some user data from socket events during loading
          if (prev.length === 0) return otherUsers;
          
          return otherUsers.map(newUser => {
            const existing = prev.find(u => isUIDMatch(u._id || u.id, newUser._id || newUser.id));
            if (existing) {
              // Preserve status and profilePicture if set from socket events
              return { ...newUser, status: existing.status || newUser.status, profilePicture: existing.profilePicture || newUser.profilePicture };
            }
            return newUser;
          });
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    const socketInstance = connectSocket();
    
    const handleConnect = () => {
      if (user) {
        socketInstance.emit('join', (user._id || user.id).toString());
      }
    };

    if (socketInstance && user) {
      if (socketInstance.connected) {
        handleConnect();
      }
      socketInstance.on('connect', handleConnect);
    }

    setSocket(socketInstance);
    fetchUsers();

    return () => {
      if (socketInstance) {
        socketInstance.off('connect', handleConnect);
      }
      disconnectSocket();
    };
  }, [user, navigate]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const markActiveConversationAsRead = useCallback(async (activeUser = selectedUser) => {
    if (!activeUser || !user) return;

    try {
      await messageAPI.markConversationAsRead(user._id || user.id, activeUser._id || activeUser.id);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [selectedUser, user]);

  const fetchMessages = useCallback(async () => {
    if (!selectedUser || !socket || !user) return;

    try {
      const currentUserId = user._id || user.id;
      const selectedId = selectedUser._id || selectedUser.id;
      const response = await messageAPI.getMessages(currentUserId, selectedId);
      setMessages(response.data);
      await markActiveConversationAsRead(selectedUser);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [selectedUser, socket, user, markActiveConversationAsRead]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!socket || !user) return;

    const currentUserId = (user._id || user.id).toString();

    const handleReceiveMessage = (data) => {
      const msgSenderId = data.sender?._id || data.sender;
      const msgReceiverId = data.receiver?._id || data.receiver;
      const activeSelectedUser = selectedUserRef.current;
      const selectedId = activeSelectedUser ? (activeSelectedUser._id || activeSelectedUser.id) : null;

      const isActiveConversationMessage = selectedId &&
        ((isUIDMatch(msgSenderId, currentUserId) && isUIDMatch(msgReceiverId, selectedId)) ||
          (isUIDMatch(msgSenderId, selectedId) && isUIDMatch(msgReceiverId, currentUserId)));

      if (isActiveConversationMessage) {
        setMessages(prev => {
          const exists = prev.some(m => isUIDMatch(m._id || m.id, data._id || data.id));
          if (exists) return prev;
          return [...prev.filter(m => !m.isOptimistic), data];
        });

        if (isUIDMatch(msgSenderId, selectedId) && isUIDMatch(msgReceiverId, currentUserId)) {
          markActiveConversationAsRead(activeSelectedUser);
        }
      }

      setUsers(prevUsers => prevUsers.map(u => {
        const uId = u._id || u.id;
        if (isUIDMatch(uId, msgSenderId) || isUIDMatch(uId, msgReceiverId)) {
          if (isUIDMatch(uId, currentUserId)) return u;
          return {
            ...u,
            lastMessage: data.messageType && data.messageType !== 'text' ? (data.fileName || data.content || 'Attachment') : data.content,
            lastMessageTime: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: (isUIDMatch(uId, msgSenderId) && !isUIDMatch(selectedId, uId)) ? (u.unreadCount || 0) + 1 : (u.unreadCount || 0)
          };
        }
        return u;
      }).sort((a, b) => {
        const aTime = a.lastMessageTime ? new Date(`1970-01-01T${a.lastMessageTime}`).getTime() : 0;
        const bTime = b.lastMessageTime ? new Date(`1970-01-01T${b.lastMessageTime}`).getTime() : 0;
        return bTime - aTime;
      }));
    };

    const handleMessagesRead = ({ senderId, receiverId, messageIds = [] }) => {
      // Receiver of the read receipt (the original sender) should see the blue ticks
      if (!isUIDMatch(receiverId, currentUserId)) {
        return;
      }

      const activeSelectedUser = selectedUserRef.current;
      const selectedId = activeSelectedUser ? (activeSelectedUser._id || activeSelectedUser.id) : null;

      // The senderId in the receipt is the person who read our messages
      if (selectedId && isUIDMatch(senderId, selectedId)) {
        setMessages((prev) =>
          prev.map((message) =>
            messageIds.some((id) => isUIDMatch(id, message._id || message.id))
              ? { ...message, isRead: true, isDelivered: true }
              : message
          )
        );
      }
    };

    const handleMessagesDelivered = ({ senderId, receiverId, messageIds = [] }) => {
      // Receiver of the delivery notification (original sender) should see the double gray ticks
      if (!isUIDMatch(senderId, currentUserId)) {
        return;
      }

      const activeSelectedUser = selectedUserRef.current;
      const selectedId = activeSelectedUser ? (activeSelectedUser._id || activeSelectedUser.id) : null;

      // The receiverId in the notification is the person who received our messages
      if (selectedId && isUIDMatch(receiverId, selectedId)) {
        setMessages((prev) =>
          prev.map((message) =>
            messageIds.some((id) => isUIDMatch(id, message._id || message.id))
              ? { ...message, isDelivered: true }
              : message
          )
        );
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('messages_delivered', handleMessagesDelivered);

    const handleStatusChange = ({ userId, status }) => {
      console.log(`[Socket] Received status change: User ${userId} is now ${status}`);
      setUsers(prev => {
        const updatedUsers = prev.map(u => {
          if (isUIDMatch(u._id || u.id, userId)) {
            return { ...u, status };
          }
          return u;
        });
        console.log(`[StatusUpdate] Updated list for user ${userId}. Count matches:`, updatedUsers.filter(u => isUIDMatch(u._id || u.id, userId)).length);
        return updatedUsers;
      });

      const activeSelectedUser = selectedUserRef.current;
      if (activeSelectedUser && isUIDMatch(activeSelectedUser._id || activeSelectedUser.id, userId)) {
        setSelectedUser(prev => {
          if (prev && isUIDMatch(prev._id || prev.id, userId)) {
            console.log(`[StatusUpdate] Updating active selectedUser ${userId} to ${status}`);
            const updated = { ...prev, status };
            selectedUserRef.current = updated;
            return updated;
          }
          return prev;
        });
      }
    };

    socket.on('user_status_change', handleStatusChange);

    socket.on('user_typing', ({ senderId }) => {
      const activeSelectedUser = selectedUserRef.current;
      if (activeSelectedUser && isUIDMatch(activeSelectedUser._id || activeSelectedUser.id, senderId)) {
        setIsTyping(true);
      }
    });

    socket.on('user_stop_typing', ({ senderId }) => {
      const activeSelectedUser = selectedUserRef.current;
      if (activeSelectedUser && isUIDMatch(activeSelectedUser._id || activeSelectedUser.id, senderId)) {
        setIsTyping(false);
      }
    });

    const handleProfileUpdate = ({ userId, profilePicture, username }) => {
      setUsers(prev => prev.map(u => {
        if (isUIDMatch(u._id || u.id, userId)) {
          return { ...u, profilePicture: profilePicture || u.profilePicture, username: username || u.username };
        }
        return u;
      }));

      const activeSelectedUser = selectedUserRef.current;
      if (activeSelectedUser && isUIDMatch(activeSelectedUser._id || activeSelectedUser.id, userId)) {
        setSelectedUser(prev => {
          if (prev && isUIDMatch(prev._id || prev.id, userId)) {
            const updated = {
              ...prev,
              profilePicture: profilePicture || prev.profilePicture,
              username: username || prev.username
            };
            selectedUserRef.current = updated;
            return updated;
          }
          return prev;
        });
      }
    };

    socket.on('user_profile_update', handleProfileUpdate);

    const handleNewUser = (newUser) => {
      setUsers(prev => {
        const exists = prev.some(u => (u._id || u.id).toString() === (newUser._id || newUser.id).toString());
        if (exists || (user._id || user.id).toString() === (newUser._id || newUser.id).toString()) {
          return prev;
        }

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
      socket.off('messages_read', handleMessagesRead);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('user_status_change', handleStatusChange);
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('user_profile_update', handleProfileUpdate);
      socket.off('new_user', handleNewUser);
    };
  }, [user, socket, markActiveConversationAsRead]);

  const handleSendMessage = async (content) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || !selectedUser) return;

    const currentUserId = user._id || user.id;
    const selectedId = selectedUser._id || selectedUser.id;
    const optimisticId = `temp_text_${Date.now()}`;

    const optimisticMessage = {
      _id: optimisticId,
      sender: currentUserId,
      receiver: selectedId,
      content: trimmedContent,
      messageType: 'text',
      timestamp: new Date(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const messageData = {
        sender: currentUserId,
        receiver: selectedId,
        content: trimmedContent
      };
      const response = await messageAPI.sendMessage(messageData);

      setMessages(prev =>
        prev.map(message => message._id === optimisticId ? response.data : message)
      );

      if (socket) {
        socket.emit('send_message', response.data);
      }
    } catch (error) {
      setMessages(prev => prev.filter(message => message._id !== optimisticId));
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleDeleteChat = (userId) => {
    setUsers(prevUsers => prevUsers.filter(u => (u._id || u.id).toString() !== userId.toString()));
    setMessages([]);
    setSelectedUser(null);
    selectedUserRef.current = null;
  };

  const handleSelectUser = async (userToSelect) => {
    setSelectedUser(userToSelect);
    selectedUserRef.current = userToSelect;
    setUsers(prev => prev.map(u => {
      if ((u._id || u.id).toString() === (userToSelect._id || userToSelect.id).toString()) {
        return { ...u, unreadCount: 0 };
      }
      return u;
    }));

    await markActiveConversationAsRead(userToSelect);
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
            <div className="empty-logo-container">
              <FaWhatsapp size={120} color="#00a884" />
            </div>
            <div className="empty-quotes-container">
              <h3>Welcome to WhatsApp</h3>
              <p>"Connect with anyone, anywhere, anytime"</p>
              <p className="quote-sub">End-to-end encrypted messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
