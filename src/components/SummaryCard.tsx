import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Tag,
  Check,
  HeartHandshake,
  Loader2,
  Compass,
  HelpCircle,
  Brain,
  Smile,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SummaryResult } from "../types";

export interface AgentLoadingState {
  reflection: boolean;
  sentiment: boolean;
  pattern: boolean;
  coach: boolean;
}

interface SummaryCardProps {
  summary?: SummaryResult | null;
  agentLoadingState?: AgentLoadingState | null;
  onApplyTitle?: (title: string) => void;
  onClose?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  agentLoadingState,
  onApplyTitle,
  onClose,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevSummaryRef = useRef(summary);

  useEffect(() => {
    // When fresh results arrive or results change, default to expanded state
    if (summary && summary !== prevSummaryRef.current) {
      setIsCollapsed(false);
    }
    prevSummaryRef.current = summary;
  }, [summary]);

  const isAgentWorking =
    agentLoadingState &&
    (agentLoadingState.reflection ||
      agentLoadingState.sentiment ||
      agentLoadingState.pattern ||
      agentLoadingState.coach);

  if (!summary && !isAgentWorking) {
    return null;
  }

  // Active status for the 4 specialist agent chips (for graceful degradation visibility)
  const reflectionActive = Boolean(summary?.reflection || summary?.summary);
  const sentimentActive = Boolean(summary?.sentiment || summary?.mood);
  const patternActive = Boolean(summary?.themes && summary.themes.length > 0);
  const coachActive = Boolean(summary?.coachPrompt && summary.coachPrompt.trim());

  const modelDisplay = summary?.modelUsed || "gemini-3.6-flash";

  // Reflection text (safe string, strictly encoded by React JSX text nodes)
  const reflectionContent = summary?.reflection || summary?.summary;

  // Recurring themes (Pattern agent)
  const themesList =
    summary?.themes && summary.themes.length > 0
      ? summary.themes
      : summary?.insights && summary.insights.length > 0
      ? summary.insights
      : [];

  // Format confidence to one decimal place
  const sentimentConfidence =
    typeof summary?.sentiment?.confidence === "number"
      ? summary.sentiment.confidence.toFixed(1)
      : "0.9";
  const sentimentTag = summary?.sentiment?.tag || summary?.mood;

  // Collapsed single summary bar
  if (isCollapsed && !isAgentWorking) {
    return (
      <div
        id="ai-summary-card"
        className="rounded-2xl border border-amber-200/90 bg-linear-to-br from-amber-50/80 via-white to-stone-50 px-4 py-3 shadow-xs mb-6 transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Reflection ready + Suggested Title + Mood Tag */}
          <div
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-2.5 flex-1 min-w-[200px] cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200/80 shadow-2xs shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200/80 shrink-0">
              Reflection ready
            </span>

            {summary?.suggestedTitle && (
              <span className="text-xs font-semibold text-stone-800 truncate max-w-xs sm:max-w-md group-hover:text-amber-950 transition">
                "{summary.suggestedTitle}"
              </span>
            )}

            {sentimentTag && (
              <span
                id="sentiment-mood-badge"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100/90 text-amber-950 border border-amber-300 shadow-2xs shrink-0"
              >
                <HeartHandshake className="w-3 h-3 text-amber-800" />
                <span>{sentimentTag}</span>
              </span>
            )}
          </div>

          {/* Right: Actions (Use Title, Expand Chevron, Dismiss) */}
          <div className="flex items-center gap-2 shrink-0">
            {summary?.suggestedTitle && onApplyTitle && (
              <button
                id="apply-suggested-title-btn"
                type="button"
                onClick={() => onApplyTitle(summary.suggestedTitle!)}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
              >
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="hidden sm:inline">Use Title</span>
              </button>
            )}

            <button
              id="toggle-summary-collapse-btn"
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-950 bg-amber-100/80 hover:bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200/80 transition cursor-pointer"
            >
              <span>Expand</span>
              <ChevronDown className="w-3.5 h-3.5 text-amber-800" />
            </button>

            {onClose && (
              <button
                id="close-summary-card-btn"
                type="button"
                onClick={onClose}
                className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 rounded-md hover:bg-stone-100 transition cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="ai-summary-card"
      className="rounded-2xl border border-amber-200/90 bg-linear-to-br from-amber-50/70 via-white to-stone-50 p-5 shadow-xs mb-6 transition-all duration-200"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3.5 border-b border-amber-100">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200/80 shadow-2xs shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">
                Multi-Agent Reflection
              </h3>
              {isAgentWorking && (
                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analyzing
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              4 specialist agents · {modelDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Sentiment Badge: "Sentiment: {tag} · {confidence}" */}
          {sentimentTag && (
            <span
              id="sentiment-mood-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100/90 text-amber-950 border border-amber-300 shadow-2xs"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-amber-800" />
              <span>
                Sentiment: {sentimentTag} · {sentimentConfidence}
              </span>
            </span>
          )}

          {/* Collapse Toggle */}
          <button
            id="toggle-summary-collapse-btn"
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded-md hover:bg-stone-100 transition cursor-pointer"
            title="Collapse reflection summary"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Collapse</span>
          </button>

          {onClose && (
            <button
              id="close-summary-card-btn"
              type="button"
              onClick={onClose}
              className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 rounded-md hover:bg-stone-100 transition cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Row of 4 Agent Chips: Reflection · Sentiment · Pattern · Coach */}
      <div
        id="specialist-agent-chips-row"
        className="flex items-center gap-1.5 flex-wrap pb-3.5 mb-3.5 border-b border-amber-100/80"
      >
        <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mr-1">
          Specialist Brain:
        </span>

        {/* 1. Reflection Agent Chip */}
        <span
          id="agent-chip-reflection"
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border transition-all ${
            agentLoadingState?.reflection
              ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse font-medium"
              : reflectionActive
              ? "bg-white text-stone-800 border-amber-200/90 font-medium shadow-2xs"
              : "bg-stone-100/50 text-stone-400 border-stone-200/60 opacity-50"
          }`}
        >
          {agentLoadingState?.reflection ? (
            <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
          ) : (
            <Brain className="w-3 h-3 text-amber-600" />
          )}
          Reflection
        </span>

        {/* 2. Sentiment Agent Chip */}
        <span
          id="agent-chip-sentiment"
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border transition-all ${
            agentLoadingState?.sentiment
              ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse font-medium"
              : sentimentActive
              ? "bg-white text-stone-800 border-amber-200/90 font-medium shadow-2xs"
              : "bg-stone-100/50 text-stone-400 border-stone-200/60 opacity-50"
          }`}
        >
          {agentLoadingState?.sentiment ? (
            <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
          ) : (
            <Smile className="w-3 h-3 text-amber-600" />
          )}
          Sentiment
        </span>

        {/* 3. Pattern Agent Chip */}
        <span
          id="agent-chip-pattern"
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border transition-all ${
            agentLoadingState?.pattern
              ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse font-medium"
              : patternActive
              ? "bg-white text-stone-800 border-amber-200/90 font-medium shadow-2xs"
              : "bg-stone-100/50 text-stone-400 border-stone-200/60 opacity-50"
          }`}
        >
          {agentLoadingState?.pattern ? (
            <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
          ) : (
            <Compass className="w-3 h-3 text-amber-600" />
          )}
          Pattern
        </span>

        {/* 4. Coach Agent Chip */}
        <span
          id="agent-chip-coach"
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border transition-all ${
            agentLoadingState?.coach
              ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse font-medium"
              : coachActive
              ? "bg-white text-stone-800 border-amber-200/90 font-medium shadow-2xs"
              : "bg-stone-100/50 text-stone-400 border-stone-200/60 opacity-50"
          }`}
        >
          {agentLoadingState?.coach ? (
            <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
          ) : (
            <HelpCircle className="w-3 h-3 text-amber-600" />
          )}
          Coach
        </span>
      </div>

      {/* Suggested Title Row (if present) */}
      {summary?.suggestedTitle && (
        <div
          id="suggested-title-container"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-stone-200/80 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Suggested Title:
            </span>
            <span className="text-xs font-semibold text-stone-800">
              "{summary.suggestedTitle}"
            </span>
          </div>
          {onApplyTitle && (
            <button
              id="apply-suggested-title-btn"
              onClick={() => onApplyTitle(summary.suggestedTitle!)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Use This Title
            </button>
          )}
        </div>
      )}

      {/* Section: "Reflection" (Reflection Agent Output) */}
      {reflectionContent && (
        <div id="reflection-agent-section" className="mb-4">
          <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Reflection
          </h4>
          <p className="text-xs text-stone-800 leading-relaxed bg-white/95 p-3.5 rounded-xl border border-amber-200/80 shadow-2xs font-medium">
            {reflectionContent}
          </p>
        </div>
      )}

      {/* Section: "Recurring Themes" (Pattern Agent Output - Hidden when empty) */}
      {themesList && themesList.length > 0 && (
        <div id="recurring-themes-section" className="mb-4">
          <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-700" />
            Recurring Themes
          </h4>
          <div className="flex flex-wrap items-center gap-1.5">
            {themesList.map((theme, idx) => (
              <span
                key={idx}
                id={`recurring-theme-chip-${idx}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section: "One question to sit with" (Coach Agent Callout - Hidden if absent) */}
      {summary?.coachPrompt && (
        <div
          id="coach-question-callout"
          className="mb-4 p-4 rounded-xl bg-amber-100/60 border border-amber-300/80 shadow-2xs relative overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <HelpCircle className="w-3.5 h-3.5 text-amber-800" />
            </div>
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              One question to sit with
            </h4>
          </div>
          <p className="text-sm font-medium text-stone-900 leading-relaxed pl-7 italic">
            "{summary.coachPrompt}"
          </p>
        </div>
      )}

      {/* Section: Tags */}
      {summary?.tags && summary.tags.length > 0 && (
        <div
          id="summary-tags-row"
          className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-amber-100"
        >
          <Tag className="w-3 h-3 text-stone-400" />
          <span className="text-[11px] font-medium text-stone-500 mr-1">
            Tags:
          </span>
          {summary.tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-700 font-medium shadow-2xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
