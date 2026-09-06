import React, { useState } from "react";
import { MessageCircle, X, Send, Plane, Sparkles, HelpCircle } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "👋 Hi! I'm your APIx Flight Price Guide. Ask me anything about flight scores, price spikes, or when to book!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const quickReplies = [
    "What is APIx?",
    "Why did prices go up?",
    "Cheapest way to book?",
    "How is score calculated?",
    "Is this real data?",
  ];

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      if (!res.ok) throw new Error("Network error");
      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: data.reply || "I'm checking the latest price indexes for you!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "I'm having trouble connecting to the live index server right now. Try selecting one of the quick options below!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center space-x-2 group hover:scale-105 border border-amber-400/50"
        >
          <div className="relative">
            <Plane className="w-6 h-6 transform group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-bold text-sm pr-1">Ask APIx Guide</span>
        </button>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-80 md:w-96 flex flex-col h-[500px] overflow-hidden backdrop-blur-xl animate-fadeIn">
          {/* Chat Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">APIx Consumer Assistant</h4>
                <p className="text-xs text-emerald-400 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Live Helper
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs md:text-sm leading-relaxed ${
                    m.sender === "user"
                      ? "bg-amber-500 text-slate-950 font-medium rounded-br-none"
                      : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
                <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
                <span>Checking price database...</span>
              </div>
            )}
          </div>

          {/* Quick Reply Chips */}
          <div className="px-3 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            {quickReplies.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="whitespace-nowrap text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full transition-colors flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a route fare, price spikes, or when to book..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 p-2 rounded-xl transition-colors font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
