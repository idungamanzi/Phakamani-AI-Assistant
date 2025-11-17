import { create } from "zustand";
import { 
  createOrAppendChat, 
  generateTitle, 
  streamChat, 
  fetchChats, 
  fetchChatMessages,
  deleteChat as apiDeleteChat,
  updateChatTitle,
  clearAuth
} from "../api";

export const useChatStore = create((set, get) => ({
  chats: [],
  activeChatId: null,
  loading: false,
  error: null,
  searchQuery: "",

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  getFilteredChats: () => {
    const { chats, searchQuery } = get();
    if (!searchQuery.trim()) return chats;
    
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      chat.title?.toLowerCase().includes(query)
    );
  },

  loadChatsFromServer: async () => {
    set({ loading: true, error: null });
    try {
      const chatsFromApi = await fetchChats();
      const transformed = (chatsFromApi || []).map((c) => ({
        id: c.id,
        title: c.title || "New Chat",
        created_at: c.created_at,
        messages: [],
      }));
      set({ chats: transformed, loading: false });
      
      const lastChatId = localStorage.getItem("last_chat_id");
      if (lastChatId && transformed.find(c => c.id === lastChatId)) {
        await get().loadChatMessages(lastChatId);
        set({ activeChatId: lastChatId });
      }
    } catch (err) {
      console.error("Could not fetch chats from server:", err);
      set({ error: err.message, loading: false });
      
      if (err.message === "unauthorized") {
        clearAuth();
        window.location.reload();
      }
    }
  },

  loadChatMessages: async (chatId) => {
    try {
      const data = await fetchChatMessages(chatId);
      const messages = (data.messages || []).map((m) => ({ 
        role: m.role, 
        content: m.content,
        created_at: m.created_at
      }));
      
      set((state) => ({
        chats: state.chats.map((c) => 
          c.id === chatId ? { ...c, messages } : c
        ),
      }));
    } catch (err) {
      console.error("Failed to load chat messages:", err);
      
      if (err.message === "unauthorized") {
        clearAuth();
        window.location.reload();
      }
    }
  },

  addNewChat: () => {
    set({ activeChatId: null, searchQuery: "" });
    localStorage.removeItem("last_chat_id");
  },

  setActiveChat: async (chatId) => {
    set({ activeChatId: chatId });
    localStorage.setItem("last_chat_id", chatId);
    
    const chat = get().chats.find(c => c.id === chatId);
    if (chat && (!chat.messages || chat.messages.length === 0)) {
      await get().loadChatMessages(chatId);
    }
  },

  deleteChat: async (chatId) => {
    try {
      await apiDeleteChat(chatId);
      
      set((state) => ({
        chats: state.chats.filter(c => c.id !== chatId),
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId
      }));
      
      if (get().activeChatId === chatId) {
        localStorage.removeItem("last_chat_id");
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
      set({ error: err.message });
      throw err;
    }
  },

  renameChat: async (chatId, title) => {
    try {
      await updateChatTitle(chatId, title);
      
      set((state) => ({
        chats: state.chats.map((c) => 
          c.id === chatId ? { ...c, title } : c
        ),
      }));
    } catch (err) {
      console.error("Failed to rename chat:", err);
      throw err;
    }
  },

  sendMessage: async (text) => {
    if (!text || !text.trim()) return;
    
    let { activeChatId, chats } = get();
    const userMessage = text.trim();

    try {
      if (!activeChatId) {
        const result = await createOrAppendChat(userMessage);
        activeChatId = result.chat_id;
        
        let title = "New Chat";
        try {
          title = await generateTitle(userMessage);
          await updateChatTitle(activeChatId, title);
        } catch (err) {
          console.warn("Failed to generate title:", err);
        }

        const newChat = {
          id: activeChatId,
          title: title,
          messages: [{ role: "user", content: userMessage }],
          created_at: new Date().toISOString()
        };
        
        set({ 
          chats: [newChat, ...chats],
          activeChatId: activeChatId 
        });
        
        localStorage.setItem("last_chat_id", activeChatId);
      } else {
        await createOrAppendChat(userMessage, activeChatId);
        
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === activeChatId 
              ? { ...c, messages: [...(c.messages || []), { role: "user", content: userMessage }] } 
              : c
          ),
        }));
      }

      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === activeChatId 
            ? { 
                ...c, 
                messages: [...(c.messages || []), { role: "assistant", content: "", _streaming: true }] 
              } 
            : c
        ),
      }));

      let assistantResponse = "";
      
      await streamChat(
        activeChatId,
        userMessage,
        (chunk) => {
          assistantResponse += chunk;
          
          set((state) => ({
            chats: state.chats.map((c) => {
              if (c.id !== activeChatId) return c;
              
              const msgs = [...(c.messages || [])];
              const lastIdx = msgs.length - 1;
              
              if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
                msgs[lastIdx] = { 
                  ...msgs[lastIdx], 
                  content: assistantResponse,
                  _streaming: true 
                };
              }
              
              return { ...c, messages: msgs };
            }),
          }));
        },
        (err) => {
          console.error("Stream error:", err);
          
          set((state) => ({
            chats: state.chats.map((c) =>
              c.id === activeChatId
                ? {
                    ...c,
                    messages: (c.messages || []).map((m) =>
                      m._streaming 
                        ? { role: "assistant", content: "Error: Failed to get response." } 
                        : m
                    ),
                  }
                : c
            ),
          }));
        }
      );

      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === activeChatId
            ? { 
                ...c, 
                messages: (c.messages || []).map((m) => {
                  if (m._streaming) {
                    const { _streaming, ...rest } = m;
                    return rest;
                  }
                  return m;
                })
              }
            : c
        ),
      }));

      await get().loadChatMessages(activeChatId);
      
    } catch (err) {
      console.error("sendMessage error:", err);
      set({ error: err.message });
      
      if (err.message === "unauthorized") {
        clearAuth();
        window.location.reload();
      }
    }
  },

  clearChats: () => {
    set({ chats: [], activeChatId: null, searchQuery: "" });
    localStorage.removeItem("last_chat_id");
  }
}));

window.addEventListener("storage", (e) => {
  if (e.key === "auth_cleared_at") {
    clearAuth();
    window.location.reload();
  }
});