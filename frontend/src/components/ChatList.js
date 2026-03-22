import React, { useState, useEffect, useRef } from 'react';
import { MdSearch, MdMoreVert, MdOutlineAddComment, MdStar, MdStarBorder } from 'react-icons/md';
import { IoMdPeople } from 'react-icons/io';
import { AiOutlineStar } from 'react-icons/ai';
import { BiCheckDouble, BiLockAlt } from 'react-icons/bi';
import { MdOutlinePlaylistAddCheck, MdLogout } from 'react-icons/md';
import './ChatList.css';

const ChatList = ({ users, currentUser, selectedUser, onSelectUser, onLogout, onProfileClick }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [favourites, setFavourites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('whatsapp_favourites')) || [];
    } catch (e) {
      return [];
    }
  });
  const dropdownRef = useRef(null);

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

  // ... (keep useEffect)

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <div className="header-left">
          <h2>WhatsApp</h2>
        </div>
        <div className="header-icons">
          <MdOutlineAddComment className="header-icon" />
          <div className="dropdown-wrapper" ref={dropdownRef}>
            <MdMoreVert 
              className={`header-icon ${showDropdown ? 'active' : ''}`} 
              onClick={() => setShowDropdown(!showDropdown)}
            />
            {showDropdown && (
              <div className="chat-list-dropdown">
                <div className="dropdown-item"><IoMdPeople className="menu-icon" /> New group</div>
                <div className="dropdown-item"><AiOutlineStar className="menu-icon" /> Starred messages</div>
                <div className="dropdown-item"><MdOutlinePlaylistAddCheck className="menu-icon" /> Select chats</div>
                <div className="dropdown-item"><BiCheckDouble className="menu-icon" /> Mark all as read</div>
                <div className="dropdown-item"><BiLockAlt className="menu-icon" /> App lock</div>
                <div className="dropdown-item logout" onClick={onLogout}><MdLogout className="menu-icon" /> Log out</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="chat-list-search-container">
        <div className="chat-search-bar">
          <MdSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search or start a new chat" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />        
        </div>
      </div>

      <div className="chat-filter-chips">
        <div className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All</div>
        <div className={`filter-chip ${activeFilter === 'unread' ? 'active' : ''}`} onClick={() => setActiveFilter('unread')}>Unread</div>
        <div className={`filter-chip ${activeFilter === 'favourites' ? 'active' : ''}`} onClick={() => setActiveFilter('favourites')}>Favourites</div>
      </div>

      <div className="chat-list-items">
        {(() => {
          let listToFilter = users;
          if (activeFilter === 'unread') {
            listToFilter = listToFilter.filter(u => u.unreadCount && u.unreadCount > 0);
          } else if (activeFilter === 'favourites') {
            listToFilter = listToFilter.filter(u => favourites.includes(u._id || u.id));
          }

          const filteredUsers = listToFilter.filter((u) =>
            u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.phoneNumber?.includes(searchQuery) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredUsers.length === 0) {
            return <div className="no-users">No users found</div>;
          }

          return filteredUsers.map(u => {
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
                  {u.profilePicture ? (
                    <img
                      src={u.profilePicture}
                      alt={u.username}
                      className="chat-item-avatar-image"
                    />
                  ) : (
                    u.username ? u.username.charAt(0).toUpperCase() : '?'
                  )}
                  {u?.status && u.status === 'online' && <div className="online-indicator"></div>}
                </div>
                <div className="chat-item-content">
                  <div className="chat-item-name-row">
                    <div className="chat-item-name">{u.username}</div>
                  </div>
                  <div className="chat-item-preview">{u.lastMessage || 'Hey there! I am using WhatsApp.'}</div>
                </div>
                <div className="chat-item-meta">
                  {u.lastMessageTime && <div className="chat-time">{u.lastMessageTime}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', justifyContent: 'flex-end' }}>
                    {u.unreadCount > 0 && <div className="unread-badge">{u.unreadCount}</div>}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};

export default ChatList;
