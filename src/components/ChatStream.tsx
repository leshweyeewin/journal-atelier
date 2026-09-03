import React, { useState } from "react";
import Markdown from "react-markdown";
import { Send, Sparkles, User, Bot, HelpCircle } from "lucide-react";
import { ChatMessage } from "../types";

interface ChatStreamProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "How can I reframe this challenge constructively?",
  "What are 3 small actionable steps for tomorrow?",
  "Help me spot potential blind spots in my perspective.",
  "Brainstorm 3 creative alternative solutions for this.",
];

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  onSendMessage,
  isLoading,
  disabled,
}) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || disabled) return;
    const text = inputText;
    setInputText("");
    try {
      await onSendMessage(text);
    } catch {
      // Re-fill input on failure so user doesn't lose their thought
      setInputText(text);
    }
  };

  const handleSelectSuggested = (prompt: string) => {
    if (isLoading || disabled) return;
    setInputText(prompt);
  };

  return (
    <div id="chat-stream-container" className="flex flex-col h-full bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-stone-900">Gemini Reflection Dialogue</span>
        </div>
        <span className="text-[11px] text-stone-500">Multi-turn session</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-medium text-stone-800 mb-1">Start a Conversation with Gemini</h4>
            <p className="text-xs text-stone-500 max-w-sm mb-4">
              Ask follow-up questions, request brainstorming ideas, or seek constructive reframing on your reflection.
            </p>

            {/* Quick suggested chips */}
            <div className="w-full max-w-md space-y-1.5">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                Suggested Prompts
              </span>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggested(q)}
                  disabled={disabled || isLoading}
                  className="w-full text-left text-xs p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200/80 transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <span>{q}</span>
                  <Send className="w-3 h-3 text-stone-400 group-hover:text-stone-700 opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isModel = msg.role === "model";
            return (
              <div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                className={`flex gap-3 ${isModel ? "justify-start" : "justify-end"}`}
              >
                {isModel && (
                  <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isModel
                      ? "bg-stone-50 border border-stone-200 text-stone-800"
                      : "bg-stone-900 text-stone-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span
                      className={`text-[10px] font-semibold ${
                        isModel ? "text-stone-500" : "text-stone-300"
                      }`}
                    >
                      {isModel ? "Gemini 3.6 Flash" : "You"}
                    </span>
                    <span
                      className={`text-[9px] ${
                        isModel ? "text-stone-400" : "text-stone-400"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {isModel ? (
                    <div className="prose prose-stone prose-xs max-w-none prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {!isModel && (
                  <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-stone-50 border border-stone-200 px-4 py-3 rounded-2xl text-xs text-stone-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-stone-400 animate-pulse" />
              <span>Gemini is reflecting...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Followups when messages exist */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 py-2 bg-stone-50/50 border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto text-[11px] text-stone-600 no-scrollbar">
          <HelpCircle className="w-3 h-3 text-stone-400 shrink-0" />
          <span className="shrink-0 text-stone-400 font-medium">Follow up:</span>
          {SUGGESTED_QUESTIONS.slice(0, 2).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggested(q)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-100 transition cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-stone-200 flex items-center gap-2">
        <input
          id="chat-input-field"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask Gemini to brainstorm, explore a perspective, or advise..."
          disabled={isLoading || disabled}
          className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition"
        />
        <button
          id="chat-submit-btn"
          type="submit"
          disabled={!inputText.trim() || isLoading || disabled}
          className="p-2.5 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-95 disabled:opacity-40 transition shadow-2xs cursor-pointer"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
