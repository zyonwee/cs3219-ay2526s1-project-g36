"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../../../context/ThemeContext";

export default function ChatPanel() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<{ sender: "me" | "other"; text: string }[]>([
    { sender: "other", text: "Hello!" },
    { sender: "me", text: "Hey there 👋" },
  ]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const emojis = ["😀", "😂", "👍", "❤️", "🔥"];

  const handleSend = (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText) return;
    setMessages((prev) => [...prev, { sender: "me", text: messageText }]);
    setInput("");
    setShowEmoji(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="w-1/3 flex flex-col border rounded-xl shadow-sm overflow-hidden"
      style={{
        backgroundColor: theme.card.background,
        borderColor: theme.border,
      }}
    >
      {/* Header */}
      <div
        className="border-b p-3 flex items-center gap-3"
        style={{ borderColor: theme.border }}
      >
        <img
          src="https://api.dicebear.com/7.x/thumbs/svg?seed=peer"
          alt="avatar"
          className="w-8 h-8 rounded-full"
        />
        <div>
          <div className="text-sm font-semibold" style={{ color: theme.text }}>
            Collaborator
          </div>
          <div className="text-xs" style={{ color: theme.textSecondary }}>
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[70%] px-3 py-2 rounded-2xl text-sm"
              style={{
                backgroundColor:
                  m.sender === "me" ? theme.primary : theme.surface,
                color:
                  m.sender === "me" ? theme.button.text : theme.text,
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="flex items-center gap-2 p-3 border-t"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.surface,
        }}
      >
        {/* Emoji Picker */}
        <div className="relative">
          <button
            onClick={() => setShowEmoji((s) => !s)}
            className="text-lg px-2"
            style={{ color: theme.text }}
          >
            🙂
          </button>
          {showEmoji && (
            <div
              className="absolute bottom-10 left-0 rounded-lg shadow-md p-2 flex gap-2"
              style={{
                backgroundColor: theme.card.background,
                border: `1px solid ${theme.border}`,
              }}
            >
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSend(emoji)} // instantly send emoji
                  className="text-lg hover:scale-110 transition-transform"
                  style={{ color: theme.text }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input Field */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 border rounded-full px-3 py-1 text-sm outline-none"
          style={{
            backgroundColor: theme.input.background,
            color: theme.input.text,
            border: `1px solid ${theme.input.border}`,
          }}
        />

        {/* Send Button */}
        <button
          onClick={() => handleSend()}
          className="rounded-full px-4 py-1 text-sm font-semibold"
          style={{
            backgroundColor: theme.primary,
            color: theme.button.text,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
