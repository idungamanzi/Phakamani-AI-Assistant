import React, { useState } from "react";
import ChatWindow from "./ChatWindow";

export default function ChatLayout() {
  return (
    <div className="w-full h-screen flex flex-col bg-white text-black font-mono">
      <header className="mb-4 text-xl font-bold border-b border-gray-300 pb-2 px-4">
        Phakamani AI Assistant
      </header>
      <ChatWindow />
    </div>
  );
}
