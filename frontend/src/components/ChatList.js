import React, { useState, useEffect, useRef } from 'react';
import { MdSearch, MdMoreVert, MdOutlineAddComment } from 'react-icons/md';
import { IoMdPeople } from 'react-icons/io';
import { MdLogout } from 'react-icons/md';
import GroupCreationModal from './GroupCreationModal';
import StatusSection from './StatusSection';
import './ChatList.css';

const ChatList = ({ users, currentUser, selectedUser, onSelectUser, onLogout, onProfileClick, onCreateGroup, groups = [], onStatusClick = null, onCreateStatusClick = null, statusRefreshTrigger = 0 }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [favourites, setFavourites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('whatsapp_favourites')) || [];
    } catch (e) {
      return [];
    }
  });
  const dropdownRef = useRef(null);

  // eslint-disable-next-line no-unused-vars
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

  const handleNewGroupClick = () => {
    setShowGroupModal(true);
    setShowDropdown(false);
  };

  const handleCreateGroup = async (groupData) => {
    if (onCreateGroup) {
      await onCreateGroup(groupData);
    }
  };

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
                <div className="dropdown-item" onClick={handleNewGroupClick}><IoMdPeople className="menu-icon" /> New group</div>
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
        <div className={`filter-chip ${activeFilter === 'status' ? 'active' : ''}`} onClick={() => setActiveFilter('status')}>Status</div>
      </div>

      <div className="chat-list-items">
        {activeFilter === 'status' ? (
          <StatusSection 
            currentUser={currentUser}
            onStatusClick={onStatusClick || (() => {})}
            onCreateStatusClick={onCreateStatusClick || (() => {})}
            refreshTrigger={statusRefreshTrigger}
          />
        ) : (
          (() => {
            // Combine users and groups into a single list
            const allChats = [
              ...users.map(u => ({ ...u, type: 'user' })),
              ...(groups || []).map(g => ({ ...g, type: 'group', isGroup: true }))
            ];

            let listToFilter = allChats;
            if (activeFilter === 'unread') {
              listToFilter = listToFilter.filter(item => item.unreadCount && item.unreadCount > 0);
            } else if (activeFilter === 'favourites') {
              listToFilter = listToFilter.filter(item => favourites.includes(item._id || item.id));
            }

            // Search filter for both users and groups
            const filteredChats = listToFilter.filter((item) => {
              const searchLower = searchQuery.toLowerCase();
              if (item.type === 'user') {
                return (
                  item.username?.toLowerCase().includes(searchLower) ||
                  item.phoneNumber?.includes(searchLower) ||
                  item.email?.toLowerCase().includes(searchLower)
                );
              } else {
                return item.name?.toLowerCase().includes(searchLower);
              }
            });

            // Sort by last message time, most recent first
            filteredChats.sort((a, b) => {
              const timeA = a.lastMessageTimeRaw ? new Date(a.lastMessageTimeRaw).getTime() : 0;
              const timeB = b.lastMessageTimeRaw ? new Date(b.lastMessageTimeRaw).getTime() : 0;
              return timeB - timeA;
            });

            if (filteredChats.length === 0) {
              return <div className="no-users">No chats found</div>;
            }

            return filteredChats.map(item => {
              const itemId = item._id || item.id;
              let isActive = false;

              if (item.type === 'user' && selectedUser) {
                isActive = selectedUser._id === itemId || selectedUser.id === itemId;
              } else if (item.type === 'group' && currentUser?.selectedGroupId === itemId) {
                isActive = true;
              }

              return (
                <div
                  key={`${item.type}-${itemId}`}
                  className={`chat-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (item.type === 'user') {
                      onSelectUser(item);
                    } else if (onSelectUser) {
                      onSelectUser({ ...item, isGroup: true });
                    }
                  }}
                >
                  <div className="chat-item-avatar">
                    {item.type === 'group' ? (
                      <div className="group-avatar">
                        <IoMdPeople size={24} />
                      </div>
                    ) : item.profilePicture ? (
                      <img
                        src={item.profilePicture}
                        alt={item.username || item.name}
                        className="chat-item-avatar-image"
                      />
                    ) : (
                      (item.username || item.name)?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  <div className="chat-item-content">
                    <div className="chat-item-name-row">
                      <div className="chat-item-name">
                        {item.type === 'group' ? item.name : item.username}
                        {item.type === 'group' && <span className="group-badge">Group</span>}
                      </div>
                    </div>
                    <div className="chat-item-preview">
                      {item.type === 'group' 
                        ? `${item.members?.length || 0} members` 
                        : (item.lastMessage || 'Hey there! I am using WhatsApp.')
                      }
                    </div>
                  </div>
                  <div className="chat-item-meta">
                    {item.lastMessageTime && <div className="chat-time">{item.lastMessageTime}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', justifyContent: 'flex-end' }}>
                      {item.unreadCount > 0 && <div className="unread-badge">{item.unreadCount}</div>}
                    </div>
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      <GroupCreationModal 
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        users={users}
        currentUserId={currentUser?._id || currentUser?.id}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
};

export default ChatList;
