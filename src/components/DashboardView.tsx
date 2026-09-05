import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Sparkles,
  Lock,
  ArrowUpRight,
  Calendar,
  X,
  Filter,
} from "lucide-react";
import { JournalInteraction } from "../types";

interface DashboardViewProps {
  entries: JournalInteraction[];
  onSelectEntry: (entry: JournalInteraction) => void;
  onNewEntry: () => void;
  isUnlocked?: boolean;
}

// Valence mapping for standardized sentiment tags (-2 to +2 scale)
const SENTIMENT_VALENCE_MAP: Record<string, number> = {
  Grateful: 2,
  Inspired: 2,
  Hopeful: 1.5,
  Determined: 1,
  Calm: 1,
  Reflective: 0,
  Vulnerable: 0,
  Restless: -1,
  Frustrated: -1.5,
  Anxious: -2,
};

// Distinctive, warm color tokens conforming to Atelier's aesthetic
const SENTIMENT_COLOR_MAP: Record<string, string> = {
  Grateful: "#059669", // emerald-600
  Inspired: "#0d9488", // teal-600
  Hopeful: "#10b981", // emerald-500
  Determined: "#b45309", // amber-700
  Calm: "#d97706", // amber-600
  Reflective: "#475569", // slate-600
  Vulnerable: "#64748b", // slate-500
  Restless: "#ea580c", // orange-600
  Frustrated: "#dc2626", // red-600
  Anxious: "#e11d48", // rose-600
};

const DEFAULT_SENTIMENT_COLOR = "#78716c"; // stone-500

function getSentimentValence(tag: string): number {
  if (SENTIMENT_VALENCE_MAP[tag] !== undefined) {
    return SENTIMENT_VALENCE_MAP[tag];
  }
  const lower = tag.toLowerCase();
  if (lower.includes("gratitude") || lower.includes("joy") || lower.includes("peace") || lower.includes("optimis")) return 1.5;
  if (lower.includes("stress") || lower.includes("fear") || lower.includes("sad") || lower.includes("worry")) return -1.5;
  return 0;
}

function getSentimentColor(tag: string): string {
  return SENTIMENT_COLOR_MAP[tag] || DEFAULT_SENTIMENT_COLOR;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  entries,
  onSelectEntry,
  onNewEntry,
  isUnlocked = false,
}) => {
  const [timeframe, setTimeframe] = useState<"all" | "30d" | "7d">("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [barChartScope, setBarChartScope] = useState<"month" | "all">("month");

  // Dedicated Past Month (Past 30 Days) Mood Tag Frequency Data
  const pastMonthMoodStats = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Filter all entries created or updated within the past 30 days
    const monthEntries = entries.filter((e) => {
      const entryTime = e.createdAt || e.updatedAt || 0;
      return now - entryTime <= thirtyDaysMs;
    });

    const moodCounts: Record<string, number> = {};
    let totalMoodLogs = 0;

    monthEntries.forEach((e) => {
      const moodTag = (e.mood || e.sentiment?.tag || "").trim();
      if (moodTag) {
        moodCounts[moodTag] = (moodCounts[moodTag] || 0) + 1;
        totalMoodLogs += 1;
      }
    });

    const chartData = Object.entries(moodCounts).map(([mood, count]) => {
      return {
        mood,
        tag: mood,
        count,
        percentage: totalMoodLogs > 0 ? Math.round((count / totalMoodLogs) * 100) : 0,
        color: getSentimentColor(mood),
        valence: getSentimentValence(mood),
      };
    });

    // Sort descending by frequency count, then alphabetically
    chartData.sort((a, b) => b.count - a.count || a.mood.localeCompare(b.mood));

    let topMood: { mood: string; count: number } | null = null;
    if (chartData.length > 0) {
      topMood = { mood: chartData[0].mood, count: chartData[0].count };
    }

    return {
      totalEntriesInMonth: monthEntries.length,
      totalMoodLogs,
      chartData,
      topMood,
      distinctMoodsCount: chartData.length,
    };
  }, [entries]);

  // Filter entries that have sentiment or mood tags, sorted chronologically ascending
  const analyzedEntries = useMemo(() => {
    const valid = entries.filter((e) => {
      const hasTag = Boolean(e.sentiment?.tag || e.mood);
      if (!hasTag) return false;

      if (timeframe === "all") return true;
      const now = Date.now();
      const entryTime = e.createdAt || e.updatedAt || 0;
      const diffDays = (now - entryTime) / (1000 * 60 * 60 * 24);
      if (timeframe === "7d") return diffDays <= 7;
      if (timeframe === "30d") return diffDays <= 30;
      return true;
    });

    return [...valid].sort(
      (a, b) => (a.createdAt || a.updatedAt || 0) - (b.createdAt || b.updatedAt || 0)
    );
  }, [entries, timeframe]);

  // Aggregate KPI stats
  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const totalAnalyzed = analyzedEntries.length;
    const coverageRate = totalEntries > 0 ? Math.round((totalAnalyzed / totalEntries) * 100) : 0;

    const tagCounts: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;
    let totalValence = 0;

    analyzedEntries.forEach((e) => {
      const tag = e.sentiment?.tag || e.mood || "Reflective";
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;

      const valence = getSentimentValence(tag);
      totalValence += valence;

      if (typeof e.sentiment?.confidence === "number") {
        totalConfidence += e.sentiment.confidence;
        confidenceCount += 1;
      }
    });

    let topTag = "None";
    let topTagCount = 0;
    Object.entries(tagCounts).forEach(([tag, count]) => {
      if (count > topTagCount) {
        topTag = tag;
        topTagCount = count;
      }
    });

    const avgConfidence =
      confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 100) : null;
    const avgValence = totalAnalyzed > 0 ? Number((totalValence / totalAnalyzed).toFixed(1)) : 0;

    let valenceLabel = "Neutral / Reflective";
    if (avgValence >= 0.7) valenceLabel = "Positive & Uplifting";
    else if (avgValence > 0.2) valenceLabel = "Grounded & Optimistic";
    else if (avgValence <= -0.7) valenceLabel = "Challenging & Strained";
    else if (avgValence < -0.2) valenceLabel = "Restless & Processing";

    return {
      totalEntries,
      totalAnalyzed,
      coverageRate,
      topTag,
      topTagCount,
      avgConfidence,
      avgValence,
      valenceLabel,
      tagCounts,
    };
  }, [entries.length, analyzedEntries]);

  // Chronological timeline chart data
  const timelineData = useMemo(() => {
    return analyzedEntries.map((e, idx) => {
      const tag = e.sentiment?.tag || e.mood || "Reflective";
      const valence = getSentimentValence(tag);
      const dateObj = new Date(e.createdAt || e.updatedAt || Date.now());
      const dateLabel = dateObj.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const fullDate = dateObj.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return {
        id: e.id,
        index: idx + 1,
        date: dateLabel,
        fullDate,
        title: e.title || "Untitled Reflection",
        tag,
        confidence: typeof e.sentiment?.confidence === "number"
          ? Math.round(e.sentiment.confidence * 100)
          : null,
        valence,
        color: getSentimentColor(tag),
        locked: Boolean(e.locked && !isUnlocked),
        rawEntry: e,
      };
    });
  }, [analyzedEntries, isUnlocked]);

  // Overall frequency distribution data for the BarChart when in "all" scope
  const allTimeDistributionData = useMemo(() => {
    const list = Object.entries(stats.tagCounts).map(([tag, count]) => {
      return {
        mood: tag,
        tag,
        count,
        percentage: stats.totalAnalyzed > 0 ? Math.round((count / stats.totalAnalyzed) * 100) : 0,
        color: getSentimentColor(tag),
        valence: getSentimentValence(tag),
      };
    });

    // Sort descending by count, then by tag name
    return list.sort((a, b) => b.count - a.count || a.mood.localeCompare(b.mood));
  }, [stats.tagCounts, stats.totalAnalyzed]);

  // Active bar chart data depending on chosen scope (Past Month vs All Time)
  const activeBarChartData = barChartScope === "month" ? pastMonthMoodStats.chartData : allTimeDistributionData;

  // Filtered entries for drill-down list
  const filteredList = useMemo(() => {
    if (!selectedTagFilter) return analyzedEntries;
    return entries.filter((e) => {
      const tag = e.sentiment?.tag || e.mood;
      return tag === selectedTagFilter;
    });
  }, [analyzedEntries, entries, selectedTagFilter]);

  // Dedicated friendly empty state if the user has no entries yet
  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col space-y-6 pb-12">
        {/* Top Header */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-semibold text-stone-900 tracking-tight">
              Mood & Sentiment Trends
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl">
            Visualizing your longitudinal emotional landscape and sentiment patterns synthesized by the Atelier's Sentiment Analyst across your private Firestore reflections.
          </p>
        </div>

        {/* Friendly Empty State */}
        <div className="bg-white border border-stone-200 rounded-2xl p-10 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 mx-auto">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-base sm:text-lg font-semibold text-stone-900">
              No entries yet — write your first reflection
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
              Write your first journal reflection and let the multi-agent brain synthesize your sentiment to see emotional trends here.
            </p>
          </div>
          <button
            id="dashboard-new-reflection-btn"
            type="button"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 text-xs font-medium cursor-pointer shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Start a Reflection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 pb-12">
      {/* Top Header & Timeframe Bar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold text-stone-900 tracking-tight">
                Mood & Sentiment Trends
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl">
              Visualizing your longitudinal emotional landscape and sentiment patterns synthesized by the Atelier's Sentiment Analyst across your private Firestore reflections.
            </p>
          </div>

          {/* Timeframe selector buttons */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 border border-stone-200/80 shrink-0 self-start sm:self-auto">
            <button
              id="timeframe-all-btn"
              type="button"
              onClick={() => setTimeframe("all")}
              className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
                timeframe === "all"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900 font-medium"
              }`}
            >
              All Time
            </button>
            <button
              id="timeframe-30d-btn"
              type="button"
              onClick={() => setTimeframe("30d")}
              className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
                timeframe === "30d"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900 font-medium"
              }`}
            >
              Past 30 Days
            </button>
            <button
              id="timeframe-7d-btn"
              type="button"
              onClick={() => setTimeframe("7d")}
              className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
                timeframe === "7d"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900 font-medium"
              }`}
            >
              Past 7 Days
            </button>
          </div>
        </div>

        {/* Quick KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-5 pt-5 border-t border-stone-100">
          {/* 1. Dominant Sentiment */}
          <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/60">
            <span className="text-[11px] font-medium text-stone-500 block">Dominant Sentiment</span>
            <div className="mt-1 flex items-center gap-2">
              {stats.topTag !== "None" ? (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getSentimentColor(stats.topTag) }}
                  />
                  <span className="text-base font-semibold text-stone-900 truncate">
                    {stats.topTag}
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    ({stats.topTagCount}x)
                  </span>
                </>
              ) : (
                <span className="text-sm text-stone-400 font-medium">—</span>
              )}
            </div>
          </div>

          {/* 2. Emotional Valence Index */}
          <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/60">
            <span className="text-[11px] font-medium text-stone-500 block">Emotional Balance</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-stone-900">
                {stats.totalAnalyzed > 0
                  ? `${stats.avgValence > 0 ? "+" : ""}${stats.avgValence}`
                  : "—"}
              </span>
              <span className="text-[11px] text-stone-500 truncate">
                {stats.totalAnalyzed > 0 ? stats.valenceLabel : "Awaiting data"}
              </span>
            </div>
          </div>

          {/* 3. Synthesis Coverage */}
          <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/60">
            <span className="text-[11px] font-medium text-stone-500 block">Synthesis Coverage</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-stone-900">
                {stats.coverageRate}%
              </span>
              <span className="text-xs text-stone-500">
                ({stats.totalAnalyzed}/{stats.totalEntries} entries)
              </span>
            </div>
          </div>

          {/* 4. Mean Confidence */}
          <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/60">
            <span className="text-[11px] font-medium text-stone-500 block">Analyst Confidence</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-stone-900">
                {stats.avgConfidence !== null ? `${stats.avgConfidence}%` : "—"}
              </span>
              <span className="text-xs text-stone-500">avg intensity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualizations or Empty State */}
      {analyzedEntries.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-base font-semibold text-stone-900">
              No sentiment data available for this timeframe
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1.5">
              {entries.length === 0
                ? "Write your first journal reflection and let the multi-agent brain synthesize your sentiment to see emotional trends here."
                : "Your reflections haven't been synthesized with sentiment tags yet. Open an existing entry and click 'Synthesize' or 'Reflect' to generate AI sentiment analysis."}
            </p>
          </div>
          <button
            id="dashboard-new-reflection-btn"
            type="button"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 text-xs font-medium cursor-pointer shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Start a Reflection</span>
          </button>
        </div>
      ) : (
        <>
          {/* Chart Section: 2 Columns on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Emotional Valence & Sentiment Over Time (Area Chart) */}
            <div className="lg:col-span-8 bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">
                    Emotional Valence Over Time
                  </h2>
                  <p className="text-xs text-stone-500">
                    Chronological progression of mood polarity (+2 = Grateful/Inspired, 0 = Reflective, -2 = Anxious/Frustrated)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-stone-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Positive (+1 to +2)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-500" /> Reflective (0)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Strained (-1 to -2)
                  </span>
                </div>
              </div>

              {/* Recharts Area Container */}
              <div className="h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineData}
                    margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="valenceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#78716c", fontSize: 11 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[-2, 2]}
                      ticks={[-2, -1, 0, 1, 2]}
                      tick={{ fill: "#78716c", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="2 2" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-stone-900 text-stone-50 p-3 rounded-xl shadow-xl text-xs border border-stone-700 min-w-[200px]">
                              <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5 mb-1.5">
                                <span className="font-semibold text-stone-200 truncate max-w-[150px]">
                                  {data.title}
                                </span>
                                {data.locked && (
                                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-400">Date:</span>
                                  <span className="font-mono text-stone-300">{data.fullDate}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-400">Sentiment:</span>
                                  <span
                                    className="font-medium px-1.5 py-0.5 rounded text-[10px]"
                                    style={{
                                      backgroundColor: `${data.color}25`,
                                      color: data.color,
                                    }}
                                  >
                                    {data.tag}
                                  </span>
                                </div>
                                {data.confidence !== null && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-stone-400">Confidence:</span>
                                    <span className="font-mono text-stone-300">
                                      {data.confidence}%
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-400">Valence Score:</span>
                                  <span className="font-mono text-stone-300">
                                    {data.valence > 0 ? `+${data.valence}` : data.valence}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-stone-800 text-[10px] text-stone-400 text-center">
                                Click card below to open entry
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="valence"
                      stroke="#b45309"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#valenceGradient)"
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            key={`dot-${payload.id}`}
                            cx={cx}
                            cy={cy}
                            r={4.5}
                            fill={payload.color}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 6, stroke: "#78350f", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Interactive Past-Month Mood Frequency (Bar Chart) */}
            <div
              id="past-month-mood-card"
              className="lg:col-span-4 bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h2 id="past-month-mood-heading" className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Past Month Mood Frequency</span>
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {barChartScope === "month"
                        ? `Frequency of mood tags recorded over the past 30 days (${pastMonthMoodStats.chartData.length} distinct moods)`
                        : `Frequency of mood tags recorded across all reflections (${allTimeDistributionData.length} distinct moods)`}
                    </p>
                  </div>

                  {/* Scope Switcher: Past Month vs All Time */}
                  <div className="flex items-center p-0.5 rounded-lg bg-stone-100 border border-stone-200/60 text-[10px] shrink-0">
                    <button
                      id="chart-scope-month-btn"
                      type="button"
                      onClick={() => setBarChartScope("month")}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        barChartScope === "month"
                          ? "bg-white text-stone-900 shadow-2xs font-semibold"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      Past 30d
                    </button>
                    <button
                      id="chart-scope-all-btn"
                      type="button"
                      onClick={() => setBarChartScope("all")}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        barChartScope === "all"
                          ? "bg-white text-stone-900 shadow-2xs font-semibold"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                </div>

                {/* BarChart Container or Empty State */}
                {activeBarChartData.length === 0 ? (
                  <div className="h-[230px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-stone-200 rounded-xl my-2 bg-stone-50/50">
                    <Calendar className="w-6 h-6 text-stone-400 mb-2" />
                    <p className="text-xs font-semibold text-stone-700">
                      {barChartScope === "month" ? "No mood tags in the past 30 days" : "No mood tags found"}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1 max-w-[200px] leading-relaxed">
                      {barChartScope === "month"
                        ? "Reflections written in the last 30 days with mood or sentiment tags will appear here."
                        : "Start a reflection to analyze your emotional landscape."}
                    </p>
                  </div>
                ) : (
                  <div id="past-month-mood-barchart-container" className="h-[240px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        id="past-month-mood-barchart"
                        data={activeBarChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: "#78716c", fontSize: 11 }}
                          axisLine={{ stroke: "#e2e8f0" }}
                          tickLine={false}
                        />
                        <YAxis
                          dataKey="mood"
                          type="category"
                          tick={{ fill: "#44403c", fontSize: 11, fontWeight: 500 }}
                          axisLine={false}
                          tickLine={false}
                          width={75}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(245, 245, 244, 0.65)" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-stone-900 text-stone-50 p-2.5 rounded-xl shadow-xl text-xs border border-stone-700 min-w-[170px]">
                                  <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5 mb-1.5">
                                    <span className="font-semibold text-stone-100">{item.mood}</span>
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: item.color }}
                                    />
                                  </div>
                                  <div className="space-y-1 text-stone-300">
                                    <div className="flex items-center justify-between">
                                      <span className="text-stone-400">Frequency:</span>
                                      <span className="font-mono font-semibold text-stone-100">
                                        {item.count} {item.count === 1 ? "entry" : "entries"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-stone-400">
                                        {barChartScope === "month" ? "Month Share:" : "Overall Share:"}
                                      </span>
                                      <span className="font-mono text-stone-200">{item.percentage}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-stone-400">Valence:</span>
                                      <span className="font-mono text-stone-200">
                                        {item.valence > 0 ? `+${item.valence}` : item.valence}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 pt-1 border-t border-stone-800 text-[10px] text-amber-300">
                                    {selectedTagFilter === item.mood ? "Click to clear filter" : "Click bar to filter reflections"}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="count"
                          radius={[0, 6, 6, 0]}
                          onClick={(data: any) => {
                            const clickedMood = data?.mood || data?.tag;
                            if (clickedMood) {
                              setSelectedTagFilter((prev) => (prev === clickedMood ? null : clickedMood));
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {activeBarChartData.map((entry, idx) => {
                            const isSelected = selectedTagFilter === entry.mood;
                            return (
                              <Cell
                                key={`bar-cell-${entry.mood}-${idx}`}
                                fill={entry.color}
                                opacity={selectedTagFilter && !isSelected ? 0.35 : 1}
                                stroke={isSelected ? "#1c1917" : "none"}
                                strokeWidth={isSelected ? 2 : 0}
                                className="transition-all duration-200 cursor-pointer"
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Card Footer: Quick Stats & Interactive Tag Filters */}
              <div className="mt-3 pt-3 border-t border-stone-100">
                {/* Past Month summary stats line */}
                {barChartScope === "month" && pastMonthMoodStats.totalMoodLogs > 0 && (
                  <div className="mb-2.5 flex items-center justify-between text-[11px] text-stone-500">
                    <span>
                      <strong>{pastMonthMoodStats.totalMoodLogs}</strong> mood logs this month
                    </span>
                    {pastMonthMoodStats.topMood && (
                      <span className="inline-flex items-center gap-1 font-medium text-stone-700">
                        Top:{" "}
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getSentimentColor(pastMonthMoodStats.topMood.mood) }}
                        />
                        {pastMonthMoodStats.topMood.mood} ({pastMonthMoodStats.topMood.count}x)
                      </span>
                    )}
                  </div>
                )}

                {/* Filter chips */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-stone-400">
                    Filter timeline by mood:
                  </span>
                  {selectedTagFilter && (
                    <button
                      type="button"
                      onClick={() => setSelectedTagFilter(null)}
                      className="text-[10px] text-amber-800 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    id="mood-filter-all-btn"
                    type="button"
                    onClick={() => setSelectedTagFilter(null)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      selectedTagFilter === null
                        ? "bg-stone-900 text-stone-50"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    All ({barChartScope === "month" ? pastMonthMoodStats.totalEntriesInMonth : analyzedEntries.length})
                  </button>
                  {activeBarChartData.map((item) => {
                    const isSelected = selectedTagFilter === item.mood;
                    return (
                      <button
                        key={`filter-${item.mood}`}
                        id={`mood-filter-btn-${item.mood.toLowerCase()}`}
                        type="button"
                        onClick={() => setSelectedTagFilter(isSelected ? null : item.mood)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "bg-stone-900 text-stone-50 ring-1 ring-stone-900"
                            : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.mood}</span>
                        <span className="text-[10px] opacity-70">({item.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Reflection Feed / Drill-Down */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <span>Synthesized Reflections Timeline</span>
                  {selectedTagFilter && (
                    <span className="text-xs font-normal text-stone-500">
                      (Filtered by tag: <strong>{selectedTagFilter}</strong>)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-500">
                  Click any reflection to open it directly in the Journal Atelier.
                </p>
              </div>

              {selectedTagFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedTagFilter(null)}
                  className="text-xs text-amber-800 hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            {filteredList.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                <p className="text-xs text-stone-500 font-medium">
                  No reflections found matching mood "{selectedTagFilter}".
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedTagFilter(null)}
                  className="mt-2 text-xs text-amber-800 underline font-medium cursor-pointer"
                >
                  Show all reflections
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredList.map((entry) => {
                  const tag = entry.sentiment?.tag || entry.mood || "Reflective";
                  const color = getSentimentColor(tag);
                  const confidence =
                    typeof entry.sentiment?.confidence === "number"
                      ? Math.round(entry.sentiment.confidence * 100)
                      : null;
                  const isMasked = Boolean(entry.locked && !isUnlocked);
                  const dateStr = new Date(entry.createdAt || entry.updatedAt || Date.now()).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  );

                  return (
                    <div
                      key={entry.id}
                      id={`dash-entry-${entry.id}`}
                      onClick={() => onSelectEntry(entry)}
                      className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300 transition cursor-pointer flex flex-col justify-between group shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5"
                            style={{
                              backgroundColor: `${color}18`,
                              color: color,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            {tag}
                          </span>

                          <div className="flex items-center gap-1.5 text-stone-400">
                            {entry.locked && (
                              <span title="Locked entry" className="inline-flex">
                                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              </span>
                            )}
                            <span className="text-[11px] font-mono">{dateStr}</span>
                          </div>
                        </div>

                        <h4 className="text-xs sm:text-sm font-semibold text-stone-900 group-hover:text-stone-800 transition line-clamp-1">
                          {entry.title || "Untitled Reflection"}
                        </h4>

                        {/* Display reflective excerpt or masked privacy notice */}
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {isMasked
                            ? "🔒 Text hidden — enter PIN to review full reflection"
                            : entry.reflection || entry.summary || entry.content || "No excerpt"}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">
                          {confidence !== null ? `${confidence}% analyst confidence` : "Synthesized"}
                        </span>
                        <span className="text-stone-700 font-medium inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                          Open <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
