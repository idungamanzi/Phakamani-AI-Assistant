import { useState } from "react";

export default function ChatStream({ onSend }) {
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input) return;
    const message = input;
    setInput("");
    onSend(message); // send to parent
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mt-auto flex space-x-2">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        className="flex-1 p-2 rounded bg-gray-800 text-cyberSilver resize-none"
        placeholder="Type a message..."
        rows={2}
      />
      <button onClick={handleSend} className="bg-cyberBlue text-black p-2 rounded">
        Send
      </button>
    </div>
  );
}
