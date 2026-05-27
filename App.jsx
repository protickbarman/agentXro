import React, { useEffect, useCallback, useState } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate,
  useParams, useNavigate, useLocation,
} from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useChatStore } from './store/chatStore.js';
import {
  sendMessage, getConversations, deleteConversation, getMessages,
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
    appendStreaming, clearStreaming,
    setTyping,
    addFileCard,
    appendReasoning, clearReasoning,
  } = useChatStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Load conversation list on mount ── */
  useEffect(() => {
    getConversations().then(setConversations).catch(() => {});
  }, []);

  /* ── Helper: populate fileCards from message metadata ── */
  const populateFilesFromMessages = useCallback((msgs) => {
    msgs.forEach(msg => {
      const files = msg.metadata?.files;
      if (files && files.length > 0) {
        files.forEach(f => useChatStore.getState().addFileCard(msg.id, f));
      }
    });
  }, []);

  /* ── Sync URL → store (deep-link / back-forward nav) ── */
  useEffect(() => {
    if (isNew || !paramConvId) return;
    const store = useChatStore.getState();
    if (store.activeConvId !== paramConvId) setActiveConv(paramConvId);
    if (!(store.messages[paramConvId]?.length > 0)) {
      getMessages(paramConvId)
        .then(msgs => {
          setMessages(paramConvId, msgs);
          populateFilesFromMessages(msgs);
        })
        .catch(() => {});
    }
  }, [paramConvId, isNew]);

  const handleSelectConv = useCallback((conv) => {
    setActiveConv(conv.id);
    setSidebarOpen(false);
    navigate(`/xro/${conv.id}`);
    const store = useChatStore.getState();
    if (!(store.messages[conv.id]?.length > 0)) {
      getMessages(conv.id).then(msgs => {
        setMessages(conv.id, msgs);
        populateFilesFromMessages(msgs);
      }).catch(() => {});
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConv(null);
    setSidebarOpen(false);
    navigate('/new');
  }, []);

  const handleDeleteConv = useCallback(async (id) => {
    await deleteConversation(id).catch(() => {});
    useChatStore.getState().removeConversation(id);
    if (useChatStore.getState().activeConvId === id) navigate('/new');
  }, []);

  /* ── Send message — full streaming lifecycle ── */
  const handleSend = useCallback(async (text) => {
    if (!text.trim()) return;

    const initialKey = useChatStore.getState().activeConvId || 'temp';
    const streamMsgId = `ai-${Date.now()}`;

    /* Reset UI state */
    setTyping(true);
    clearStreaming();
    clearReasoning();

    /* Optimistically add user + placeholder AI messages */
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

    /* ── Commit the final message when stream is done ── */
    const finishStream = () => {
      const store = useChatStore.getState();
      const key   = store.activeConvId || initialKey;

      const finalContent = store.streamingContent || '';

      updateMessage(key, streamMsgId, {
        content:   finalContent,
        streaming: false,
      });

      setTyping(false);
      clearStreaming();
      clearReasoning();
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
      clearStreaming();
    };

    try {
      await sendMessage(text, activeConvId, {

        onContent: (chunk) => {
          appendStreaming(chunk);
        },

        onReasoning: (chunk) => {
          appendReasoning(chunk);
        },

        onToolStep: (stepData) => {
          const store = useChatStore.getState();
          /* flush reasoning buffer on first non-reasoning event */
          if (store.reasoningBuffer) {
            const r = store.reasoningBuffer;
            clearReasoning();
            appendStreaming(`<details class="ts ts-reasoning" open><summary>🧠 Reasoning</summary>${r}</details>`);
          }
          if (stepData.stepType === 'start') {
            appendStreaming(
              `<details class="ts ts--run" data-tool-id="${stepData.id}">` +
              `<summary>🔧 ${stepData.tool}: ${stepData.message || ''}</summary></details>`
            );
          } else {
            /* swap running step → done step with status text */
            const s = useChatStore.getState();
            const marker = `data-tool-id="${stepData.id}"`;
            const idx = s.streamingContent.indexOf(marker);
            if (idx === -1) return;
            const openStart = s.streamingContent.lastIndexOf('<details ', idx);
            const closeEnd = s.streamingContent.indexOf('</details>', idx);
            if (openStart === -1 || closeEnd === -1) return;
            const before = s.streamingContent.slice(0, openStart);
            const inner = s.streamingContent.slice(openStart, closeEnd + 10);
            const after = s.streamingContent.slice(closeEnd + 10);
            const updated = inner
              .replace('ts--run', 'ts--done')
              .replace('<details ', '<details open ')
              .replace('</details>', `<p>${stepData.summary || stepData.status || 'Done'}</p></details>`);
            useChatStore.setState({ streamingContent: before + updated + after });
          }
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

        onFileCreated: (fileData) => {
          const store = useChatStore.getState();
          const key   = store.activeConvId || initialKey;
          const msgs  = store.messages[key] || [];
          const lastAi = [...msgs].reverse().find(m => m.role === 'agent' && m.streaming);
          if (lastAi) addFileCard(lastAi.id, fileData);
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
