import React from "react";
import { Sparkles, FileText, Lightbulb, Save, CheckCircle2, BookmarkPlus } from "lucide-react";
import { ReflectionMode } from "../types";

interface JournalEditorProps {
  title: string;
  setTitle: (t: string) => void;
  content: string;
  setContent: (c: string) => void;
  mode: ReflectionMode;
  setMode: (m: ReflectionMode) => void;
  onReflectWithAI: () => void;
  onSummarizeWithAI: () => void;
  onSave: () => void;
  isSaving: boolean;
  isAiReflecting: boolean;
  isAiSummarizing: boolean;
  lastSavedAt: number | null;
}

const PROMPT_STARTERS = [
  "What was the most significant challenge or victory today, and what did it teach me?",
  "A decision I am currently weighing and the underlying trade-offs I feel:",
  "What is one creative idea or project I feel curious to explore next?",
  "A belief or reaction I had recently that I want to question and unpack:",
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  title,
  setTitle,
  content,
  setContent,
  mode,
  setMode,
  onReflectWithAI,
  onSummarizeWithAI,
  onSave,
  isSaving,
  isAiReflecting,
  isAiSummarizing,
  lastSavedAt,
}) => {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleApplyStarter = (prompt: string) => {
    if (!content.trim()) {
      setContent(prompt + "\n\n");
    } else {
      setContent(content + "\n\n" + prompt + "\n\n");
    }
  };

  return (
    <div id="journal-editor-container" className="flex flex-col bg-white rounded-2xl border border-stone-200 shadow-2xs p-5 mb-6">
      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-100">
        <input
          id="journal-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your reflection a title (or let Gemini suggest one)..."
          className="w-full sm:flex-1 text-base sm:text-lg font-semibold text-stone-900 placeholder-stone-400 focus:outline-none border-b border-transparent focus:border-stone-300 pb-0.5 transition"
        />

        {/* Reflection Mode Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 border border-stone-200/60 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("reflect")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
              mode === "reflect"
                ? "bg-white text-stone-900 shadow-2xs font-semibold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Reflect
          </button>
          <button
            type="button"
            onClick={() => setMode("brainstorm")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
              mode === "brainstorm"
                ? "bg-white text-stone-900 shadow-2xs font-semibold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Brainstorm
          </button>
          <button
            type="button"
            onClick={() => setMode("summarize")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
              mode === "summarize"
                ? "bg-white text-stone-900 shadow-2xs font-semibold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Synthesize
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative mb-3">
        <textarea
          id="journal-content-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Begin writing your reflection, notes, or thoughts here... Pour out whatever is on your mind."
          rows={7}
          className="w-full text-stone-800 text-sm leading-relaxed p-4 rounded-xl bg-stone-50/40 border border-stone-200 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition resize-y font-sans"
        />

        <div className="absolute right-3 bottom-3 flex items-center gap-2 pointer-events-none">
          <span className="text-[11px] text-stone-400 bg-white/90 px-2 py-0.5 rounded-md border border-stone-200/60">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
      </div>

      {/* Prompt Starters */}
      {!content.trim() && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Need a spark? Try a reflection starter:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROMPT_STARTERS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyStarter(prompt)}
                className="text-left text-xs p-2.5 rounded-xl bg-stone-50 hover:bg-amber-50/50 hover:border-amber-200 text-stone-600 border border-stone-200/80 transition cursor-pointer leading-snug"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-2">
          {lastSavedAt ? (
            <span className="inline-flex items-center gap-1 text-xs text-stone-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span className="text-xs text-stone-400">Unsaved draft</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Synthesize Button */}
          <button
            id="editor-summarize-ai-btn"
            type="button"
            onClick={onSummarizeWithAI}
            disabled={!content.trim() || isAiSummarizing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 disabled:opacity-40 transition cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isAiSummarizing ? "animate-spin" : ""}`} />
            <span>{isAiSummarizing ? "Synthesizing..." : "Synthesize & Tag"}</span>
          </button>

          {/* Ask Gemini Button */}
          <button
            id="editor-reflect-ai-btn"
            type="button"
            onClick={onReflectWithAI}
            disabled={!content.trim() || isAiReflecting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold disabled:opacity-40 transition shadow-2xs cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiReflecting ? "animate-spin" : ""}`} />
            <span>{isAiReflecting ? "Reflecting..." : "Ask Gemini to Reflect"}</span>
          </button>

          {/* Explicit Save to Firestore Button */}
          <button
            id="editor-save-firestore-btn"
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-95 disabled:opacity-50 transition shadow-2xs cursor-pointer"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-pulse" : ""}`} />
            <span>{isSaving ? "Saving..." : "Save to Firestore"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
