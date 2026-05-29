import React, { useEffect, useCallback, useState } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate,
  useParams, useNavigate, useLocation,
} from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useChatStore } from './store/chatStore.js';
import {
  sendMessage, getConversations, deleteConversation, getMessages,
  ensureFreshToken,
} from './services/api.js';
import LoginPage    from './components/LoginPage.jsx';
import RegisterPage from './components/RegisterPage.jsx';
import ChatLayout   from './components/ChatLayout.jsx';

function RequireAuth({ children }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}
function RequireGuest({ children }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  return isLoggedIn ? <Navigate to="/new" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"       element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/register"    element={<RequireGuest><RegisterPage /></RequireGuest>} />
        <Route path="/"            element={<Navigate to="/new" replace />} />
        <Route path="/new"         element={<RequireAuth><ChatApp /></RequireAuth>} />
        <Route path="/xro/:convId" element={<RequireAuth><ChatApp /></RequireAuth>} />
        <Route path="*"            element={<Navigate to="/new" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ChatApp() {
  const navigate = useNavigate();
  const { convId: paramConvId } = useParams();
  const { pathname } = useLocation();
  const isNew = pathname === '/new';

  const {
    activeConvId, setActiveConv, migrateConv,
    setMessages, addMessage, updateMessage,
    setConversations, addConversation,
    appendToSegment, addSegment, clearStream,
    setTyping,
    clearMessages,
  } = useChatStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    ensureFreshToken().catch(() => {});
    const id = setInterval(() => ensureFreshToken().catch(() => {}), 8 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getConversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) {
      clearMessages('temp');
      setActiveConv(null);
      return;
    }
    if (!paramConvId) return;
    const store = useChatStore.getState();
    if (store.activeConvId !== paramConvId) setActiveConv(paramConvId);
    if (!(store.messages[paramConvId]?.length > 0)) {
      getMessages(paramConvId)
        .then(msgs => setMessages(paramConvId, msgs))
        .catch(() => {});
    }
  }, [paramConvId, isNew]);

  const handleSelectConv = useCallback((conv) => {
    clearStream();
    setSidebarOpen(false);
    navigate(`/xro/${conv.id}`);
  }, []);

  const handleNewChat = useCallback(() => {
    clearMessages('temp');
    setSidebarOpen(false);
    navigate('/new');
  }, [clearMessages]);

  const handleDeleteConv = useCallback(async (id) => {
    await deleteConversation(id).catch(() => {});
    useChatStore.getState().removeConversation(id);
    if (useChatStore.getState().activeConvId === id) navigate('/new');
  }, []);

  const handleSend = useCallback(async (text) => {
    if (!text.trim()) return;

    const initialKey = activeConvId || 'temp';
    const streamMsgId = `ai-${Date.now()}`;

    setTyping(true);
    clearStream();

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    const streamMsg = {
      id: streamMsgId,
      role: 'agent',
      content: '',
      streaming: true,
      created_at: new Date().toISOString(),
    };

    addMessage(initialKey, userMsg);
    addMessage(initialKey, streamMsg);

    const finishStream = () => {
      const store  = useChatStore.getState();
      const key    = store.activeConvId || initialKey;
      const finalContent = (store.streamSegments || [])
        .filter(s => s.type === 'content')
        .map(s => s.content)
        .join('');

      updateMessage(key, streamMsgId, {
        content:   finalContent,
        streaming: false,
      });

      setTyping(false);
    };

    const failStream = (errMsg) => {
      const store = useChatStore.getState();
      const key   = store.activeConvId || initialKey;
      updateMessage(key, streamMsgId, {
        content:   errMsg,
        streaming: false,
        agentType: 'error',
      });
      setTyping(false);
    };

    try {
      await sendMessage(text, activeConvId, {

        onContent: (chunk) => {
          appendToSegment('content', chunk);
        },

        onToolCall: (tc) => {
          addSegment('tool_call', { name: tc.name, arguments: tc.arguments });
        },

        onReasoning: (chunk) => {
          appendToSegment('reasoning', chunk);
        },

        onConversationCreated: (newConvId, isNewConv) => {
          if (isNewConv) {
            migrateConv(initialKey, newConvId);
            navigate(`/xro/${newConvId}`, { replace: true });
            addConversation({
              id:         newConvId,
              title:      text.substring(0, 60),
              created_at: new Date().toISOString(),
            });
          }
        },

        onDone: finishStream,
      });
    } catch (err) {
      failStream(`⚠️ ${err.message}`);
    }
  }, [activeConvId]);

  const conversations = useChatStore(s => s.conversations);
  const targetConv    = conversations.find(c => c.id === activeConvId) || null;

  return (
    <ChatLayout
      activeConv={targetConv}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      onSelectConv={handleSelectConv}
      onNewChat={handleNewChat}
      onSend={handleSend}
      onDeleteConv={handleDeleteConv}
    />
  );
}
