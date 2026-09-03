import React, { useState } from "react";
import { Search, Calendar, Trash2, Tag, ChevronRight, BookMarked, Sparkles } from "lucide-react";
import { JournalInteraction } from "../types";
import { TelegramSettings } from "./TelegramSettings";

interface HistorySidebarProps {
  entries: JournalInteraction[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalInteraction) => void;
  onDeleteEntry: (id: string, e: React.MouseEvent) => void;
  isLoading?: boolean;
  onTelegramStatusChange?: (connected: boolean, chatId: string | null) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onDeleteEntry,
  isLoading,
  onTelegramStatusChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEntries = entries.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const contentMatch = item.content?.toLowerCase().includes(q);
    const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(q));
    const moodMatch = item.mood?.toLowerCase().includes(q);
    const themeMatch = item.themes?.some((t) => t.toLowerCase().includes(q));
    const coachMatch = item.coachPrompt?.toLowerCase().includes(q);
    return titleMatch || contentMatch || tagMatch || moodMatch || themeMatch || coachMatch;
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <aside className="w-full md:w-80 lg:w-88 shrink-0 bg-stone-50/70 border-r border-stone-200 flex flex-col h-[calc(100vh-4rem)]">
      {/* Sidebar Header & Search */}
      <div className="p-4 border-b border-stone-200 space-y-3 bg-white/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-stone-700" />
            <h2 className="text-sm font-semibold text-stone-900">Your Reflections</h2>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
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
            return (
              <div
                key={entry.id}
                id={`sidebar-entry-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isActive
                    ? "bg-white border-stone-400 shadow-xs ring-1 ring-stone-900/5"
                    : "bg-white/70 border-stone-200 hover:border-stone-300 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-xs font-semibold text-stone-900 truncate flex-1">
                    {entry.title || "Untitled Reflection"}
                  </h3>
                  <span className="text-[10px] text-stone-400 shrink-0 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {formatDate(entry.updatedAt)}
                  </span>
                </div>

                <p className="text-[11px] text-stone-500 line-clamp-2 mb-2 leading-relaxed">
                  {entry.content || (entry.messages.length > 0 ? entry.messages[0].content : "No reflection body yet...")}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                    {entry.mood && (
                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 font-medium">
                        {entry.mood}
                      </span>
                    )}
                    {entry.messages && entry.messages.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-500">
                        <Sparkles className="w-2.5 h-2.5 text-stone-400" />
                        {entry.messages.length}
                      </span>
                    )}
                  </div>

                  <button
                    id={`delete-entry-btn-${entry.id}`}
                    onClick={(e) => onDeleteEntry(entry.id, e)}
                    title="Delete Entry"
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 rounded transition cursor-pointer"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Telegram Notifications Settings Panel */}
      <TelegramSettings onStatusChange={onTelegramStatusChange} />
    </aside>
  );
};
