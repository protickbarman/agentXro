import { create } from 'zustand';

export const useChatStore = create((set) => ({
  conversations: [],
  activeConvId: null,
  messages: {},
  streamSegments: [],
  nextSegId: 0,
  isTyping: false,

  setConversations: (v) => set({ conversations: v }),

  addConversation: (conv) => set((s) => ({
    conversations: [conv, ...s.conversations.filter(c => c.id !== conv.id)],
  })),

  removeConversation: (id) => set((s) => ({
    conversations: s.conversations.filter(c => c.id !== id),
    activeConvId: s.activeConvId === id ? null : s.activeConvId,
  })),

  setActiveConv: (id) => set({
    activeConvId: id,
    isTyping: false,
  }),

  migrateConv: (fromKey, toId) => set((s) => {
    const fromMsgs = s.messages[fromKey] || [];
    const next = { ...s.messages };
    if (fromMsgs.length > 0) next[toId] = fromMsgs;
    return { activeConvId: toId, messages: next };
  }),

  setMessages: (convId, msgs) => set((s) => ({
    messages: { ...s.messages, [convId]: msgs },
  })),

  clearMessages: (convId) => set((s) => {
    const next = { ...s.messages };
    delete next[convId];
    return { messages: next };
  }),

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

  setTyping: (v) => set({ isTyping: v }),

  appendToSegment: (type, chunk) => set((s) => {
    const segs = [...s.streamSegments];
    const last = segs[segs.length - 1];
    if (last && last.type === type && typeof last.content === 'string') {
      segs[segs.length - 1] = { ...last, content: last.content + chunk };
    } else {
      segs.push({ id: s.nextSegId, type, content: chunk });
    }
    return {
      streamSegments: segs,
      nextSegId: last && last.type === type && typeof last.content === 'string' ? s.nextSegId : s.nextSegId + 1,
    };
  }),

  addSegment: (type, data) => set((s) => ({
    streamSegments: [...s.streamSegments, { id: s.nextSegId, type, ...data }],
    nextSegId: s.nextSegId + 1,
  })),

  clearStream: () => set({ streamSegments: [], nextSegId: 0 }),
}));