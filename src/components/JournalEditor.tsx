import React from "react";
import { Sparkles, Lightbulb, Save, CheckCircle2 } from "lucide-react";
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

  const activeMode = mode === "brainstorm" ? "brainstorm" : "reflect";

  return (
    <div id="journal-editor-container" className="flex flex-col bg-white rounded-2xl border border-stone-200 shadow-2xs p-5 mb-6">
      {/* 1. Title Input */}
      <div className="mb-3">
        <input
          id="journal-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your reflection a title (or let Gemini suggest one)..."
          className="w-full text-base sm:text-lg font-semibold text-stone-900 placeholder-stone-400 focus:outline-none border-b border-stone-100 focus:border-stone-300 pb-2 transition"
        />
      </div>

      {/* 2. Conversation Tone Pills & Helper Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Tone:
          </span>
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-stone-100/80 border border-stone-200/60">
            <button
              type="button"
              onClick={() => setMode("reflect")}
              className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
                activeMode === "reflect"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900 font-medium"
              }`}
            >
              Reflect
            </button>
            <button
              type="button"
              onClick={() => setMode("brainstorm")}
              className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
                activeMode === "brainstorm"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900 font-medium"
              }`}
            >
              Brainstorm
            </button>
          </div>
        </div>

        <p className="text-xs text-stone-500 italic">
          {activeMode === "brainstorm"
            ? "Gemini pushes ideas outward and expands possibilities."
            : "Gemini reflects your thoughts back and asks deeper questions."}
        </p>
      </div>

      {/* 3. Main Textarea */}
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

      {/* 4. Prompt Starters (only when empty) */}
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

      {/* 5. Action Row with Clear Hierarchy */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
        {/* Left: Demoted Save Draft + Saved Status */}
        <div className="flex items-center gap-2.5">
          <button
            id="editor-save-firestore-btn"
            type="button"
            onClick={onSave}
            disabled={isSaving}
            title="Save current draft to Firestore"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:scale-95 disabled:opacity-40 transition cursor-pointer"
          >
            <Save className={`w-3.5 h-3.5 text-stone-500 ${isSaving ? "animate-pulse" : ""}`} />
            <span>{isSaving ? "Saving..." : "Save draft"}</span>
          </button>

          <span className="text-stone-300">·</span>

          {lastSavedAt ? (
            <span className="inline-flex items-center gap-1 text-xs text-stone-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span className="text-xs text-stone-400">Unsaved draft</span>
          )}
        </div>

        {/* Right: AI Actions (Secondary: Synthesize, Primary: Ask Gemini to Reflect) */}
        <div className="flex items-center justify-end gap-2.5 flex-wrap">
          {/* Secondary: Synthesize (Quieter outline/ghost style with subtitle/tooltip) */}
          <div className="flex items-center">
            <button
              id="editor-summarize-ai-btn"
              type="button"
              onClick={onSummarizeWithAI}
              disabled={!content.trim() || isAiSummarizing}
              title="Run all 4 agents (title, mood, themes, coach question)"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 active:scale-95 disabled:opacity-40 transition shadow-2xs cursor-pointer group"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isAiSummarizing ? "animate-spin" : ""}`} />
              <span>{isAiSummarizing ? "Synthesizing..." : "Synthesize"}</span>
              <span className="text-[10px] text-stone-400 font-normal hidden md:inline group-hover:text-stone-500">
                · 4 agents
              </span>
            </button>
          </div>

          {/* Primary: Ask Gemini to Reflect (Most prominent amber button) */}
          <button
            id="editor-reflect-ai-btn"
            type="button"
            onClick={onReflectWithAI}
            disabled={!content.trim() || isAiReflecting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 shadow-xs hover:shadow-sm disabled:opacity-40 transition cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 text-stone-950 ${isAiReflecting ? "animate-spin" : ""}`} />
            <span>{isAiReflecting ? "Reflecting..." : "Ask Gemini to Reflect"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
