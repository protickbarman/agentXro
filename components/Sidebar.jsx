import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore.js';
import { useAuthStore } from '../store/authStore.js';
import { logout } from '../services/api.js';

/* ── Date grouping helper ─────────────────────────────── */
function groupConversations(convs) {
  const now = new Date();
  const startOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYest     = new Date(startOfToday - 86400000);
  const startOf7Days    = new Date(startOfToday - 6 * 86400000);
  const startOf30Days   = new Date(startOfToday - 29 * 86400000);

  const groups = { Today: [], Yesterday: [], 'Previous 7 days': [], 'Previous 30 days': [], Older: [] };

  for (const c of convs) {
    const d = new Date(c.created_at || 0);
    if (d >= startOfToday)   groups['Today'].push(c);
    else if (d >= startOfYest)  groups['Yesterday'].push(c);
    else if (d >= startOf7Days) groups['Previous 7 days'].push(c);
    else if (d >= startOf30Days) groups['Previous 30 days'].push(c);
    else                        groups['Older'].push(c);
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export default function Sidebar({ onSelectConv, onNewChat, isOpen }) {
  const navigate = useNavigate();
  const { conversations, activeConvId, removeConversation } = useChatStore();
  const { user, clearAuth } = useAuthStore();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const searchRef = useRef(null);

  /* Focus search when sidebar opens on mobile */
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 150);
  }, [isOpen]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    setDeletingId(id);
    try {
      const { deleteConversation } = await import('../services/api.js');
      await deleteConversation(id).catch(() => {});
      removeConversation(id);
      if (activeConvId === id) navigate('/new');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    clearAuth();
    navigate('/login', { replace: true });
  };

  const filtered = search.trim()
    ? conversations.filter(c => (c.title || '').toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const grouped = groupConversations(filtered);

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>

      {/* ── Logo + New ── */}
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">X</div>
          <span className="sidebar-brand-name">Xro Agent</span>
        </div>
        <button className="sidebar-new-btn" onClick={onNewChat} title="New conversation">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      {/* ── Search ── */}
      <div className="sidebar-search-wrap">
        <svg className="sidebar-search-icon" width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={searchRef}
          className="sidebar-search-input"
          placeholder="Search conversations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="sidebar-search-clear" onClick={() => setSearch('')}>
            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Conversation list ── */}
      <div className="sidebar-list">
        {conversations.length === 0 && (
          <p className="sidebar-empty">No conversations yet.<br />Start a new chat!</p>
        )}
        {conversations.length > 0 && filtered.length === 0 && (
          <p className="sidebar-empty">No results for "{search}"</p>
        )}

        {grouped.map(([label, items]) => (
          <div key={label} className="sidebar-group">
            <p className="sidebar-group-label">{label}</p>
            {items.map(conv => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                className={`sidebar-item${activeConvId === conv.id ? ' sidebar-item--active' : ''}${deletingId === conv.id ? ' sidebar-item--deleting' : ''}`}
                onClick={() => onSelectConv(conv)}
                onKeyDown={e => e.key === 'Enter' && onSelectConv(conv)}
              >
                <svg className="sidebar-item-icon" width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="sidebar-item-title">{conv.title || 'Untitled'}</span>
                <button
                  className="sidebar-item-del"
                  onClick={e => handleDelete(e, conv.id)}
                  title="Delete"
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Footer / user ── */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {(user?.username || user?.email || 'U')[0].toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <p className="sidebar-username">{user?.username || 'User'}</p>
          <p className="sidebar-useremail">{user?.email || ''}</p>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Sign out">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
