import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import { useChatStore } from "../store/useChatStore";
import { getAuthToken, clearAuth } from "../api";

export default function ChatShell({ onLogout }) {
  const { chats, activeChatId, loadChatsFromServer, syncFromStorage } = useChatStore();

  // Ensure UI updates if another tab logs out
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "auth_cleared_at") {
        clearAuth();
        window.location.reload();
      }
      if (e.key === "chats_updated_at") {
        syncFromStorage();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Load chat list from backend if authenticated
  useEffect(() => {
    if (getAuthToken()) {
      loadChatsFromServer();
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0d12] text-gray-200 overflow-hidden">
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 min-w-0">
        <ChatWindow />
      </div>
    </div>
  );
}
