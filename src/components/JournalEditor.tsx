import React, { useState } from "react";
import { Sparkles, Lightbulb, Save, CheckCircle2, Tag, Plus, X } from "lucide-react";
import { ReflectionMode } from "../types";

interface JournalEditorProps {
  title: string;
  setTitle: (t: string) => void;
  content: string;
  setContent: (c: string) => void;
  mode: ReflectionMode;
  setMode: (m: ReflectionMode) => void;
  tags?: string[];
  setTags?: (tags: string[]) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onReflectWithAI: () => void;
  onSummarizeWithAI: () => void;
  onSave: () => void;
  isSaving: boolean;
  isAiReflecting: boolean;
  isAiSummarizing: boolean;
  lastSavedAt: number | null;
}

const REFLECT_STARTERS = [
  "What was the most significant challenge or victory today, and what did it teach me?",
  "A decision I am currently weighing and the underlying trade-offs I feel:",
  "A belief or reaction I had recently that I want to question and unpack:",
  "What is draining or energizing me right now, and why?",
];

const BRAINSTORM_STARTERS = [
  "A problem I keep running into that I'd love a fresh solution for:",
  "A wild 'what if' idea I want to push further:",
  "Something I want to build, create, or experiment with next:",
  "A goal I have — help me break it into concrete first steps:",
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  title,
  setTitle,
  content,
  setContent,
  mode,
  setMode,
  tags = [],
  setTags,
  onAddTag,
  onRemoveTag,
  onReflectWithAI,
  onSummarizeWithAI,
  onSave,
  isSaving,
  isAiReflecting,
  isAiSummarizing,
  lastSavedAt,
}) => {
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const sanitizeTag = (t: string): string => {
    return t
      .trim()
      .replace(/^#+/, "")
      .replace(/[<>{}[\]\\\/]/g, "")
      .trim();
  };

  const handleAddTagAction = (raw: string) => {
    setTagError(null);
    const cleaned = sanitizeTag(raw);
    if (!cleaned) return;
    if (cleaned.length > 30) {
      setTagError("Tag must be 30 characters or fewer.");
      return;
    }
    const currentList = Array.isArray(tags) ? tags : [];
    if (currentList.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      setTagError("Tag already added.");
      return;
    }
    if (currentList.length >= 25) {
      setTagError("Maximum 25 tags per reflection.");
      return;
    }

    if (onAddTag) {
      onAddTag(cleaned);
    } else if (setTags) {
      setTags([...currentList, cleaned]);
    }
    setTagInput("");
  };

  const handleRemoveTagAction = (tagToRemove: string) => {
    setTagError(null);
    if (onRemoveTag) {
      onRemoveTag(tagToRemove);
    } else if (setTags) {
      const currentList = Array.isArray(tags) ? tags : [];
      setTags(currentList.filter((t) => t !== tagToRemove));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTagAction(tagInput);
    }
  };

  const handleApplyStarter = (prompt: string) => {
    if (!content.trim()) {
      setContent(prompt + "\n\n");
    } else {
      setContent(content + "\n\n" + prompt + "\n\n");
    }
  };

  const activeMode = mode === "brainstorm" ? "brainstorm" : "reflect";
  const starters = activeMode === "brainstorm" ? BRAINSTORM_STARTERS : REFLECT_STARTERS;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100">
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

      {/* 3. Custom Tags Section (Removable Pills & Inline Input) */}
      <div id="journal-tags-section" className="mb-3 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
          <div className="flex items-center gap-1 text-stone-400 mr-0.5">
            <Tag className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Tags:
            </span>
          </div>

          {/* Removable Tag Pills */}
          {tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              id={`journal-tag-pill-${idx}`}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-50/80 text-amber-900 border border-amber-200/70 hover:border-amber-300 transition shadow-2xs group"
            >
              <span className="text-amber-700/70 font-semibold text-[11px]">#</span>
              <span className="max-w-[150px] truncate">{tag}</span>
              <button
                id={`journal-remove-tag-btn-${idx}`}
                type="button"
                onClick={() => handleRemoveTagAction(tag)}
                title={`Remove tag "${tag}"`}
                aria-label={`Remove tag "${tag}"`}
                className="p-0.5 rounded-full text-amber-700/60 hover:text-red-600 hover:bg-amber-100 active:scale-95 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Inline Add Tag Input */}
          <div className="inline-flex items-center gap-1">
            <input
              id="journal-tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                if (tagError) setTagError(null);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={tags.length > 0 ? "+ tag…" : "Add tags (e.g. mindfulness, idea)…"}
              maxLength={30}
              className="px-2.5 py-0.5 text-xs rounded-full border border-stone-200 bg-stone-50/60 hover:bg-white focus:bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500 transition w-36 sm:w-48"
            />
            {tagInput.trim() && (
              <button
                id="journal-add-tag-btn"
                type="button"
                onClick={() => handleAddTagAction(tagInput)}
                title="Add tag"
                className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-600 text-white hover:bg-amber-700 active:scale-95 transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>

        {tagError && (
          <p className="text-[11px] text-red-600 pl-1">{tagError}</p>
        )}
      </div>

      {/* 4. Main Textarea */}
      <div className="relative mb-3">
        <textarea
          id="journal-content-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={activeMode === "brainstorm"
            ? "Drop a problem, goal, or half-formed idea here… let's explore angles and next steps."
            : "Begin writing your reflection, notes, or thoughts here… pour out whatever is on your mind."}
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
            <span>{activeMode === "brainstorm" ? "Need a spark? Try a brainstorm starter:" : "Need a spark? Try a reflection starter:"}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {starters.map((prompt, idx) => (
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
              title="Runs all 4 agents once for a structured summary (title, mood, themes, coach question)."
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
            title="Starts a back-and-forth conversation below."
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
