import React from 'react';
import Sidebar from './Sidebar.jsx';
import ChatHeader from './ChatHeader.jsx';
import MessageList from './MessageList.jsx';
import ChatInput from './ChatInput.jsx';

export default function ChatLayout({ activeConv, sidebarOpen, setSidebarOpen, onSelectConv, onNewChat, onSend }) {
  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        onSelectConv={(conv) => { onSelectConv(conv); setSidebarOpen(false); }}
        onNewChat={() => { onNewChat(); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
      />

      <div className="chat-main">
        <ChatHeader title={activeConv?.title} onMenuClick={() => setSidebarOpen(true)} />
        <MessageList onPrompt={onSend} />
        <ChatInput onSend={onSend} />
      </div>
    </div>
  );
}
