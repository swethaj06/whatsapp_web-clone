import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, messageAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import './Chat.css';

const Chat = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch all users
    const fetchUsers = async () => {
      try {
        const response = await userAPI.getAllUsers();
        // Filter out current user
        const currentUserId = user._id || user.id;
        const otherUsers = response.data.filter(u => (u._id || u.id) !== currentUserId);
        setUsers(otherUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    // Connect to socket
    const socketInstance = connectSocket();
    if (socketInstance && user) {
      socketInstance.emit('join', user._id || user.id);
    }
    setSocket(socketInstance);

    fetchUsers();

    return () => {
      disconnectSocket();
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!selectedUser || !socket) return;

    // Fetch messages for selected user
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

    // Listen for new messages
    const handleReceiveMessage = (data) => {
      const msgSenderId = data.sender._id || data.sender;
      const msgReceiverId = data.receiver._id || data.receiver;
      const currentUserId = user._id || user.id;
      const selectedId = selectedUser._id || selectedUser.id;

      if (
        (msgSenderId === currentUserId && msgReceiverId === selectedId) ||
        (msgSenderId === selectedId && msgReceiverId === currentUserId)
      ) {
        setMessages(prev => {
          if (prev.some(m => (m._id || m.id) === (data._id || data.id))) return prev;
          return [...prev, data];
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [selectedUser, user, socket]);

  const handleSendMessage = async (content) => {
    if (!content.trim() || !selectedUser) return;

    try {
      const messageData = {
        sender: user._id || user.id,
        receiver: selectedUser._id || selectedUser.id,
        content
      };

      const response = await messageAPI.sendMessage(messageData);
      setMessages(prev => [...prev, response.data]);

      // Emit via socket for real-time update
      if (socket) {
        socket.emit('send_message', response.data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate('/login');
  };

  if (loading) {
    return <div className="chat-loading">Loading...</div>;
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>WhatsApp Clone</h1>
        <div className="user-info">
          <span>Welcome, {user?.username}!</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>
      <div className="chat-main">
        <ChatList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />
        {selectedUser ? (
          <ChatWindow
            selectedUser={selectedUser}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUser={user}
          />
        ) : (
          <div className="no-chat-selected">
            <p>Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
