import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore.js';
import { useAuthStore } from '../store/authStore.js';
import { getConversations, deleteConversation, logout } from '../services/api.js';
import { ws } from '../services/ws.js';

export default function Sidebar({ onSelectConv, onNewChat, isOpen }) {
  const navigate = useNavigate();
  const { conversations, setConversations, removeConversation, activeConvId } = useChatStore();
  const { user, clearAuth } = useAuthStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    await deleteConversation(id).catch(() => {});
    removeConversation(id);
  };

  const handleLogout = () => {
    logout();
    ws.disconnect();
    clearAuth();
    navigate('/login', { replace: true });
  };

  const filtered = conversations.filter(c =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">X</div>
          <span className="sidebar-logo-name">Xro Agent</span>
        </div>
        <button className="sidebar-new-btn" onClick={onNewChat}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New conversation
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search-wrap">
        <div className="sidebar-search">
          <svg className="sidebar-search-icon" width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="sidebar-search-input"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length > 0 && <p className="sidebar-section-label">Recent</p>}

      {/* Conversations */}
      <div className="sidebar-scrollarea">
        {loading && (
          <div className="sidebar-skeleton">
            {[...Array(5)].map((_, i) => <div key={i} className="sidebar-skeleton-item" />)}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="sidebar-empty">
            {conversations.length === 0 ? 'No conversations yet' : 'No results found'}
          </p>
        )}
        {!loading && filtered.map(conv => (
          <div
            key={conv.id}
            className={`sidebar-conv-item${activeConvId === conv.id ? ' active' : ''}`}
            onClick={() => onSelectConv(conv)}
          >
            <svg className="sidebar-conv-icon" width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="sidebar-conv-title">{conv.title || 'Untitled'}</span>
            <button
              className="sidebar-conv-delete"
              onClick={e => handleDelete(e, conv.id)}
              title="Delete"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {(user?.username || user?.email || 'U')[0].toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <p className="sidebar-username">{user?.username || 'User'}</p>
          <p className="sidebar-useremail">{user?.email}</p>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout} title="Logout">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
