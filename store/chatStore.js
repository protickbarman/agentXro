import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConvId: null,
  messages: {},
  streamingContent: '',
  steps: [],
  stepsExpanded: false,
  isTyping: false,
  wsStatus: 'disconnected',

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) => set((s) => ({
    conversations: [conv, ...s.conversations.filter(c => c.id !== conv.id)],
  })),

  removeConversation: (id) => set((s) => ({
    conversations: s.conversations.filter(c => c.id !== id),
    activeConvId: s.activeConvId === id ? null : s.activeConvId,
  })),

  setActiveConv: (id) => set({ activeConvId: id, streamingContent: '', steps: [], stepsExpanded: false }),

  setMessages: (convId, messages) => set((s) => ({
    messages: { ...s.messages, [convId]: messages },
  })),

  addMessage: (convId, msg) => set((s) => ({
    messages: {
      ...s.messages,
      [convId]: [...(s.messages[convId] || []), msg],
    },
  })),

  updateMessage: (convId, msgId, updates) => set((s) => ({
    messages: {
      ...s.messages,
      [convId]: (s.messages[convId] || []).map(m =>
        m.id === msgId ? { ...m, ...updates } : m
      ),
    },
  })),

  appendStreaming: (chunk) => set((s) => ({
    streamingContent: s.streamingContent + chunk,
  })),

  clearStreaming: () => set({ streamingContent: '' }),

  addStep: (step) => set((s) => {
    const prev = s.steps.map(st => ({ ...st, completed: true }));
    return { steps: [...prev, { ...step, completed: false, timestamp: Date.now() }] };
  }),

  clearSteps: () => set({ steps: [], stepsExpanded: false }),

  toggleSteps: () => set((s) => ({ stepsExpanded: !s.stepsExpanded })),

  setTyping: (v) => set({ isTyping: v }),
  setWsStatus: (wsStatus) => set({ wsStatus }),
}));
