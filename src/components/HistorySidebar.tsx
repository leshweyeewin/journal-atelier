import React, { useState } from "react";
import { Search, Calendar, Trash2, Tag, ChevronRight, ChevronLeft, BookMarked, Sparkles, Lock, LockOpen } from "lucide-react";
import { JournalInteraction } from "../types";

interface HistorySidebarProps {
  entries: JournalInteraction[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalInteraction) => void;
  onDeleteEntry: (id: string, e: React.MouseEvent) => void;
  isLoading?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isUnlocked: boolean;
  onToggleLock: (entry: JournalInteraction) => void;
  onRequestUnlock: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onDeleteEntry,
  isLoading,
  isCollapsed = false,
  onToggleCollapse,
  isUnlocked,
  onToggleLock,
  onRequestUnlock,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const safeEntries = Array.isArray(entries) ? entries : [];

  const filteredEntries = safeEntries.filter((item) => {
    if (!item) return false;
    // SEARCH SAFETY: locked content must never surface via search while locked
    if (item.locked && !isUnlocked && searchQuery.trim()) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const contentMatch = item.content?.toLowerCase().includes(q);
    const tagMatch = Array.isArray(item.tags) && item.tags.some((t) => typeof t === "string" && t.toLowerCase().includes(q));
    const moodMatch = item.mood?.toLowerCase().includes(q);
    const themeMatch = Array.isArray(item.themes) && item.themes.some((t) => typeof t === "string" && t.toLowerCase().includes(q));
    const coachMatch = item.coachPrompt?.toLowerCase().includes(q);
    const ideaMatch = typeof (item as any).idea === "string" && (item as any).idea.toLowerCase().includes(q);
    const oneLinerMatch = typeof (item as any).oneLiner === "string" && (item as any).oneLiner.toLowerCase().includes(q);
    return titleMatch || contentMatch || tagMatch || moodMatch || themeMatch || coachMatch || ideaMatch || oneLinerMatch;
  });

  const formatDate = (timestamp: number | string | undefined) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Thin rail render when collapsed
  if (isCollapsed) {
    return (
      <aside
        id="history-sidebar-collapsed"
        className="w-full md:w-14 shrink-0 bg-stone-50/70 border-r border-stone-200 flex md:flex-col items-center justify-between md:justify-start py-3 px-3 md:px-0 h-auto md:h-[calc(100vh-4rem)] gap-3 transition-all duration-200"
      >
        <button
          id="sidebar-expand-btn"
          type="button"
          onClick={onToggleCollapse}
          title="Expand reflections sidebar"
          className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 active:scale-95 transition cursor-pointer flex items-center md:flex-col gap-1.5"
          aria-label="Expand sidebar"
        >
          <BookMarked className="w-4 h-4 text-stone-700" />
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
        </button>

        <span className="text-[10px] font-medium text-stone-400 md:[writing-mode:vertical-lr] tracking-wider uppercase select-none">
          Reflections ({safeEntries.length})
        </span>
      </aside>
    );
  }

  return (
    <aside
      id="history-sidebar-expanded"
      className="w-full md:w-80 lg:w-88 shrink-0 bg-stone-50/70 border-r border-stone-200 flex flex-col h-[calc(100vh-4rem)] transition-all duration-200"
    >
      {/* Sidebar Header & Search */}
      <div className="p-4 border-b border-stone-200 space-y-3 bg-white/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-stone-700" />
            <h2 className="text-sm font-semibold text-stone-900">Your Reflections</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {safeEntries.length} {safeEntries.length === 1 ? "entry" : "entries"}
            </span>
            {onToggleCollapse && (
              <button
                id="sidebar-collapse-btn"
                type="button"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-md transition cursor-pointer"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            id="sidebar-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries or tags..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition"
          />
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-stone-400 space-y-2">
            <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
            <span className="text-xs">Loading isolated entries...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-xs text-stone-500 font-medium">
              {searchQuery ? "No entries match your search." : "No reflections saved yet."}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              {searchQuery
                ? "Try a different keyword or tag."
                : "Type your thoughts on the right and ask Gemini to reflect or summarize."}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const isMasked = entry.locked && !isUnlocked;
            const cardTitle = isMasked ? "🔒 Locked entry" : (entry.title || "Untitled Reflection");
            const cardPreview = isMasked
              ? "Enter your PIN to view"
              : (entry.content || (entry.messages && entry.messages.length > 0 ? entry.messages[0].content : "No reflection body yet..."));

            return (
              <div
                key={entry.id}
                id={`sidebar-entry-${entry.id}`}
                onClick={() => (isMasked ? onRequestUnlock() : onSelectEntry(entry))}
                className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isActive
                    ? "bg-white border-stone-400 shadow-xs ring-1 ring-stone-900/5"
                    : "bg-white/70 border-stone-200 hover:border-stone-300 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={`text-xs font-semibold truncate flex-1 ${isMasked ? "text-stone-500 italic" : "text-stone-900"}`}>
                    {cardTitle}
                  </h3>
                  <span className="text-[10px] text-stone-400 shrink-0 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {formatDate(entry.updatedAt)}
                  </span>
                </div>

                <p className={`text-[11px] line-clamp-2 mb-2 leading-relaxed ${isMasked ? "text-stone-400 italic" : "text-stone-500"}`}>
                  {cardPreview}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                    {!isMasked && entry.mood && (
                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 font-medium">
                        {entry.mood}
                      </span>
                    )}
                    {!isMasked && entry.messages && entry.messages.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-500">
                        <Sparkles className="w-2.5 h-2.5 text-stone-400" />
                        {entry.messages.length}
                      </span>
                    )}
                    {entry.locked && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{isUnlocked ? "Protected" : "Locked"}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      id={`lock-entry-btn-${entry.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(entry);
                      }}
                      title={entry.locked ? "Unlock entry" : "Lock entry"}
                      className="opacity-60 group-hover:opacity-100 p-1 text-stone-400 hover:text-amber-700 rounded transition cursor-pointer"
                      aria-label={entry.locked ? "Unlock entry" : "Lock entry"}
                    >
                      {entry.locked ? (
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        <LockOpen className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {confirmingId === entry.id ? (
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-stone-500">Delete?</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEntry(entry.id, e);
                            setConfirmingId(null);
                          }}
                          className="font-medium text-red-600 hover:text-red-700 cursor-pointer px-1 py-0.5 rounded hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingId(null);
                          }}
                          className="text-stone-500 hover:text-stone-700 cursor-pointer px-1 py-0.5 rounded hover:bg-stone-100 transition"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        id={`delete-entry-btn-${entry.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingId(entry.id);
                        }}
                        title="Delete Entry"
                        className="opacity-60 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 rounded transition cursor-pointer"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
