import React from "react";
import { Sparkles, Tag, Check, ArrowRight, Lightbulb, HeartHandshake } from "lucide-react";
import { SummaryResult } from "../types";

interface SummaryCardProps {
  summary: SummaryResult;
  onApplyTitle?: (title: string) => void;
  onClose?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  onApplyTitle,
  onClose,
}) => {
  return (
    <div
      id="ai-summary-card"
      className="rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/50 via-white to-stone-50 p-5 shadow-xs mb-6"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Gemini Reflection Synthesis</h3>
            <p className="text-[11px] text-stone-500">
              Generated with {summary.modelUsed || "Gemini 3.6 Flash"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {summary.mood && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100/70 text-amber-900 border border-amber-200/60">
              <HeartHandshake className="w-3 h-3 text-amber-700" />
              Mood: {summary.mood}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Suggested Title */}
      {summary.suggestedTitle && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-stone-200/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Suggested Title:</span>
            <span className="text-xs font-semibold text-stone-800">"{summary.suggestedTitle}"</span>
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

      {/* Executive Summary */}
      {summary.summary && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Executive Summary</h4>
          <p className="text-xs text-stone-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-stone-200/60">
            {summary.summary}
          </p>
        </div>
      )}

      {/* Key Takeaways */}
      {summary.insights && summary.insights.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            Key Insights & Patterns
          </h4>
          <ul className="space-y-1.5">
            {summary.insights.map((insight, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-stone-700 bg-white/80 p-2.5 rounded-lg border border-stone-200/60"
              >
                <ArrowRight className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-normal">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {summary.tags && summary.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-amber-100">
          <Tag className="w-3 h-3 text-stone-400" />
          <span className="text-[11px] font-medium text-stone-500 mr-1">Tags:</span>
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
