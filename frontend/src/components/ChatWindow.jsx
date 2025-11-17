import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";

export default function ChatWindow() {
  const { chats, activeChatId, sendMessage, loadChatMessages } = useChatStore();
  const activeChat = chats.find((c) => c.id === activeChatId);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (activeChatId) loadChatMessages(activeChatId);
  }, [activeChatId, loadChatMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages?.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const message = input.trim();
    setInput("");
    await sendMessage(message);

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // No chat selected
  if (!activeChatId) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex-1 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-mono mb-2 text-black">No chat selected</h2>
            <p className="text-sm text-black">
              Click "+ New Chat" or select an existing conversation
            </p>
          </div>
        </div>

        {/* input */}
        <div className="border-t border-gray-300 p-3 bg-gray-100">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-white text-black border border-gray-400 rounded-md px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Start a new conversation..."
            />
            <button className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-md"
              onClick={handleSend}>
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* header */}
      <div className="px-4 py-3 border-b border-gray-300 bg-white">
        <div className="text-lg font-mono text-black">
          {activeChat.title || "New Chat"}
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
        {activeChat.messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[78%] px-4 py-2 rounded-xl text-sm shadow whitespace-pre-wrap ${
              msg.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto bg-gray-200 text-black border border-gray-300"
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="border-t border-gray-300 p-3 bg-gray-100">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-white text-black border border-gray-400 rounded-md px-3 py-2 outline-none focus:border-blue-500"
            placeholder="Type a message..."
          />

          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
