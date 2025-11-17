import React, { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { clearAuth } from "../api";

export default function Sidebar({ onLogout }) {
  const {
    activeChatId,
    addNewChat,
    setActiveChat,
    deleteChat,
    renameChat,
    loading,
    searchQuery,
    setSearchQuery,
    getFilteredChats,
  } = useChatStore();

  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredChats = getFilteredChats();

  function handleLogout() {
    clearAuth();
    onLogout?.();
  }

  async function handleDeleteChat(e, chatId) {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteChat(chatId);
    } catch {
      alert("Failed to delete chat. Please try again.");
    }
  }

  function startEditing(e, chat) {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  }

  async function saveEdit(chatId) {
    if (!editTitle.trim()) {
      setEditingChatId(null);
      return;
    }

    try {
      await renameChat(chatId, editTitle.trim());
    } finally {
      setEditingChatId(null);
    }
  }

  return (
    <div className="group bg-white border-r border-gray-300 w-[72px] hover:w-[260px] transition-all duration-300 flex flex-col overflow-hidden">
      
      {/* New Chat Button */}
      <div className="p-3 border-b border-gray-300">
        <button
          onClick={addNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded transition"
        >
          <span className="hidden group-hover:inline">+ New Chat</span>
          <span className="group-hover:hidden text-lg">＋</span>
        </button>
      </div>

      {/* Search Field */}
      <div className="p-3 border-b border-gray-300 hidden group-hover:block">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chats..."
          className="w-full px-3 py-2 bg-white text-black border border-gray-400 rounded-md 
                     outline-none focus:border-blue-500 transition text-sm"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="text-center text-gray-500 mt-4 px-3 text-sm">Loading...</div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center text-gray-500 mt-4 px-3 text-sm">
            {searchQuery ? "No chats found" : "No chats yet"}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => !editingChatId && setActiveChat(chat.id)}
              className={`group/item cursor-pointer px-3 py-2 rounded-md mx-2 mb-1 flex items-center justify-between gap-2 transition ${
                chat.id === activeChatId
                  ? "bg-blue-600 text-white"
                  : "text-black hover:bg-gray-200"
              }`}
            >
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                  onBlur={() => saveEdit(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(chat.id);
                    if (e.key === "Escape") setEditingChatId(null);
                  }}
                  className="flex-1 px-2 py-1 bg-white border border-blue-500 rounded text-sm outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="truncate flex-1 text-sm">
                  {chat.title || "New Chat"}
                </div>
              )}

              {!editingChatId && (
                <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition">
                  
                  {/* Rename Icon*/}
                  <button
                    onClick={(e) => startEditing(e, chat)}
                    className="p-1 hover:bg-blue-100 rounded transition-colors"
                    title="Rename chat"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="text-black hover:bg-gray-200"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 2 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  {/* Delete Icon*/}
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Delete chat"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 2 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 1 00-1-1h-4a1 1 1 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>

                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Logout Button */}
      <div className="p-3 border-t border-gray-300">
        <button
          onClick={handleLogout}
          className="w-full py-2 px-3 rounded bg-gray-200 text-black hover:bg-red-500 hover:text-white transition"
        >
          <span className="hidden group-hover:inline">Logout</span>
          <span className="group-hover:hidden">🚪</span>
        </button>
      </div>
    </div>
  );
}
