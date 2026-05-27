import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  /* ── Conversations ── */
  conversations: [],
  activeConvId: null,

  /* ── Messages keyed by convId (or 'temp') ── */
  messages: {},

  /* ── Streaming state ── */
  streamingContent: '',
  isTyping: false,
  reasoningBuffer: '',

  /* ── File cards keyed by message id ── */
  fileCards: {},

  addFileCard: (msgId, card) => set((s) => ({
    fileCards: { ...s.fileCards, [msgId]: [...(s.fileCards[msgId] || []), card] },
  })),

  clearFileCards: (msgId) => set((s) => {
    const next = { ...s.fileCards };
    delete next[msgId];
    return { fileCards: next };
  }),

  /* ── Reasoning buffer for live streaming ── */
  appendReasoning: (chunk) => set((s) => ({ reasoningBuffer: s.reasoningBuffer + chunk })),
  clearReasoning:   () => set({ reasoningBuffer: '' }),

  /* ─────────────── Actions ─────────────── */

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) => set((s) => ({
    conversations: [conv, ...s.conversations.filter(c => c.id !== conv.id)],
  })),

  removeConversation: (id) => set((s) => ({
    conversations: s.conversations.filter(c => c.id !== id),
    activeConvId: s.activeConvId === id ? null : s.activeConvId,
  })),

  /* Full switch — resets all ephemeral state */
  setActiveConv: (id) => set({
    activeConvId: id,
    streamingContent: '',
    isTyping: false,
    reasoningBuffer: '',
  }),

  /* Migrate temp messages to real convId WITHOUT touching streaming buffers */
  migrateConv: (fromKey, toId) => set((s) => {
    const fromMsgs = s.messages[fromKey] || [];
    const next = { ...s.messages };
    if (fromMsgs.length > 0) next[toId] = fromMsgs;
    return { activeConvId: toId, messages: next };
  }),

  /* Messages */
  setMessages: (convId, msgs) => set((s) => ({
    messages: { ...s.messages, [convId]: msgs },
  })),

  addMessage: (convId, msg) => set((s) => ({
    messages: { ...s.messages, [convId]: [...(s.messages[convId] || []), msg] },
  })),

  updateMessage: (convId, msgId, updates) => set((s) => {
    const arr = s.messages[convId];
    if (!arr) return {};
    return {
      messages: {
        ...s.messages,
        [convId]: arr.map(m => m.id === msgId ? { ...m, ...updates } : m),
      },
    };
  }),

  appendStreaming: (chunk) => set((s) => ({ streamingContent: s.streamingContent + chunk })),
  clearStreaming:  () => set({ streamingContent: '' }),

  setTyping: (v) => set({ isTyping: v }),
}));
