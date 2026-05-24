import React, { useEffect, useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useChatStore } from './store/chatStore.js';
import { ws } from './services/ws.js';
import { sendMessage, getMessages, getConversations } from './services/api.js';
import LoginPage from './components/LoginPage.jsx';
import RegisterPage from './components/RegisterPage.jsx';
import ChatLayout from './components/ChatLayout.jsx';

function RequireAuth({ children }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

function RequireGuest({ children }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (isLoggedIn) return <Navigate to="/new" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <RequireGuest><LoginPage /></RequireGuest>
        } />
        <Route path="/register" element={
          <RequireGuest><RegisterPage /></RequireGuest>
        } />
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={
          <RequireAuth><ChatApp /></RequireAuth>
        } />
        <Route path="/xro/:convId" element={
          <RequireAuth><ChatApp /></RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}

function loadConversation(convId, setActiveConv, ws, getMessages, setMessages) {
  if (!convId) return;
  setActiveConv(convId);
  ws.subscribe(convId);
  getMessages(convId).then(msgs => setMessages(convId, msgs)).catch(() => {});
}

function ChatApp() {
  const { convId } = useParams();
  const navigate = useNavigate();
  const {
    activeConvId, setActiveConv, setMessages, addMessage,
    addConversation, setConversations, conversations,
    appendStreaming, clearStreaming, updateMessage,
    setTyping, setWsStatus,
  } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeConv = conversations.find(c => c.id === (activeConvId || convId));

  // WS connect once + register handlers
  useEffect(() => {
    ws.connect();
    const offStatus = ws.on('status', ({ status }) => setWsStatus(status));
    const offChunk = ws.on('content_chunk', (data) => {
      appendStreaming(data.content || '');
    });
    const offResult = ws.on('final_result', (data) => {
      setTyping(false);
      clearStreaming();
      if (!data.conversationId) return;
      const store = useChatStore.getState();
      const msgs = store.messages[data.conversationId] || [];
      const streamingMsg = msgs.find(m => m.streaming === true);
      if (streamingMsg) {
        updateMessage(data.conversationId, streamingMsg.id, {
          content: data.content || '',
          streaming: false,
          agentType: data.agentType,
          tokensUsed: data.tokensUsed,
          metadata: { agentType: data.agentType, tokensUsed: data.tokensUsed },
        });
      } else {
        addMessage(data.conversationId, {
          id: `ai-${Date.now()}`,
          role: 'agent',
          content: data.content || '',
          agentType: data.agentType,
          tokensUsed: data.tokensUsed,
          created_at: new Date().toISOString(),
          metadata: { agentType: data.agentType, tokensUsed: data.tokensUsed },
        });
      }
      getConversations().then(setConversations).catch(() => {});
    });
    return () => { offStatus(); offChunk(); offResult(); };
  }, []);

  // On mount: if URL has convId, load that conversation
  useEffect(() => {
    loadConversation(convId, setActiveConv, ws, getMessages, setMessages);
  }, []);

  const handleSelectConv = useCallback(async (conv) => {
    setActiveConv(conv.id);
    ws.subscribe(conv.id);
    setSidebarOpen(false);
    navigate(`/xro/${conv.id}`);
    try {
      const msgs = await getMessages(conv.id);
      setMessages(conv.id, msgs);
    } catch {}
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConv(null);
    clearStreaming();
    setTyping(false);
    setSidebarOpen(false);
    navigate('/new');
  }, []);

  const handleSend = useCallback(async (text) => {
    if (!text.trim()) return;
    setTyping(true);
    clearStreaming();
    const tempUserMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    let convIdVal = activeConvId || convId;
    try {
      const result = await sendMessage(text, convIdVal || null);
      if (!result || !result.conversationId) {
        throw new Error('No conversationId in response');
      }
      convIdVal = result.conversationId;
      if (!activeConvId || activeConvId !== convIdVal) {
        const newConv = {
          id: convIdVal,
          title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          created_at: new Date().toISOString(),
        };
        addConversation(newConv);
        setActiveConv(convIdVal);
        ws.subscribe(convIdVal);
      }
      addMessage(convIdVal, tempUserMsg);
      addMessage(convIdVal, { id: `ai-stream-${Date.now()}`, role: 'agent', content: '', streaming: true, created_at: new Date().toISOString() });
      if (window.location.pathname !== `/xro/${convIdVal}`) {
        navigate(`/xro/${convIdVal}`);
      }
    } catch (err) {
      setTyping(false);
      addMessage(convIdVal || 'error', {
        id: `err-${Date.now()}`,
        role: 'agent',
        content: `Error: ${err.message}`,
        agentType: 'error',
        created_at: new Date().toISOString(),
      });
    }
  }, [activeConvId, convId]);

  const targetConvId = activeConvId || convId;
  const targetConv = conversations.find(c => c.id === targetConvId);

  return (
    <ChatLayout
      activeConv={targetConv}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      onSelectConv={handleSelectConv}
      onNewChat={handleNewChat}
      onSend={handleSend}
    />
  );
}
