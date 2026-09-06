import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Wand2,
  Layers,
  ListChecks,
  AlertTriangle,
  Rocket,
  ExternalLink,
  Loader2,
  Download,
  Copy,
  Check,
  Save,
  Edit3,
  X,
  FileText,
} from "lucide-react";
import { ideate, refineIdea, IdeateResponse } from "../lib/geminiApi";
import { ProjectIdea } from "../types";
import { buildProjectSpecMarkdown, slugify, downloadTextFile, copyText } from "../lib/buildSpec";
import { ErrorBanner } from "./ErrorBanner";

const IDEATION_STAGES = [
  "Generating the core concept…",
  "Selecting the right AI capabilities…",
  "Drafting the architecture blueprint…",
  "Planning your first actionable steps…",
];

const PROJECT_STAGES = ["Idea", "Planning", "Building", "Testing", "Shipped"];
const STAGE_STYLES: Record<string, string> = {
  Idea: "bg-stone-100 text-stone-700 border-stone-200",
  Planning: "bg-amber-50 text-amber-800 border-amber-200",
  Building: "bg-blue-50 text-blue-700 border-blue-200",
  Testing: "bg-purple-50 text-purple-700 border-purple-200",
  Shipped: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface ProjectStudioProps {
  onSaveIdea?: (idea: ProjectIdea) => Promise<void> | void;
  onUpdateIdea?: (id: string, patch: Partial<ProjectIdea>) => Promise<void> | void;
  initialIdea?: ProjectIdea | null;
  onClearInitialIdea?: () => void;
}

export const ProjectStudio: React.FC<ProjectStudioProps> = ({
  onSaveIdea,
  onUpdateIdea,
  initialIdea,
  onClearInitialIdea,
}) => {
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProjectIdea | null>(null);
  const [lastCallSeed, setLastCallSeed] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editOneLiner, setEditOneLiner] = useState("");
  const [editFirstStep, setEditFirstStep] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [editStage, setEditStage] = useState<string>("Idea");
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Refine / expand state
  const [isRefiningOpen, setIsRefiningOpen] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [pendingRefinedIdea, setPendingRefinedIdea] = useState<ProjectIdea | null>(null);

  // Sync initialIdea into active result whenever initialIdea changes
  useEffect(() => {
    if (initialIdea) {
      setResult(initialIdea);
      setError(null);
      setIsEditing(false);
      setEditTitle(initialIdea.title || "");
      setEditOneLiner(initialIdea.oneLiner || "");
      setEditFirstStep(initialIdea.firstStep || "");
      setEditNotes(initialIdea.notes || "");
      setEditTags(Array.isArray(initialIdea.tags) ? initialIdea.tags : []);
      setEditStage(initialIdea.stage || "Idea");
      setSaveStatus("idle");
      setPendingRefinedIdea(null);
      setIsRefiningOpen(false);
    }
  }, [initialIdea]);

  const handleStartNewIdea = () => {
    setResult(null);
    setSeed("");
    setError(null);
    setIsEditing(false);
    setPendingRefinedIdea(null);
    setIsRefiningOpen(false);
    setEditTags([]);
    setEditStage("Idea");
    if (onClearInitialIdea) {
      onClearInitialIdea();
    }
  };

  // Staged advancing status that mirrors the real agent order
  useEffect(() => {
    if (!loading) {
      return;
    }
    setStageIndex(0);
    const interval = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, IDEATION_STAGES.length - 1));
    }, 2500);

    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async (inputSeed: string) => {
    setLoading(true);
    setError(null);
    setLastCallSeed(inputSeed);
    setIsEditing(false);
    setPendingRefinedIdea(null);
    setIsRefiningOpen(false);
    setEditTags([]);
    setEditStage("Idea");
    if (onClearInitialIdea) {
      onClearInitialIdea();
    }
    try {
      const data = await ideate(inputSeed);
      setResult({ ...data, stage: data.stage || "Idea" });
      setEditTitle(data.title || "");
      setEditOneLiner(data.oneLiner || "");
      setEditFirstStep(data.firstStep || "");
      setEditNotes(data.notes || "");
    } catch (err: any) {
      setError(err?.message || "Failed to generate project idea.");
    } finally {
      setLoading(false);
    }
  };

  const addEditTag = () => {
    const t = tagDraft.trim();
    if (!t || editTags.length >= 8) { setTagDraft(""); return; }
    if (editTags.some((x) => x.toLowerCase() === t.toLowerCase())) { setTagDraft(""); return; }
    setEditTags((prev) => [...prev, t.slice(0, 24)]);
    setTagDraft("");
  };
  const removeEditTag = (t: string) => setEditTags((prev) => prev.filter((x) => x !== t));

  const activeIdea = result || initialIdea;

  const handleDownloadSpec = () => {
    if (!activeIdea) return;
    const md = buildProjectSpecMarkdown(activeIdea);
    downloadTextFile(`${slugify(activeIdea.title || "project")}-build-spec.md`, md);
  };

  const handleCopySpec = async () => {
    if (!activeIdea) return;
    const ok = await copyText(buildProjectSpecMarkdown(activeIdea));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleSave = async () => {
    if (!activeIdea || !onSaveIdea) return;
    setSaving(true);
    try {
      await onSaveIdea(activeIdea);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStageChange = async (newStage: string) => {
    if (!activeIdea) return;
    setResult((prev) => (prev ? { ...prev, stage: newStage } : prev));
    setEditStage(newStage);
    const id = activeIdea.id || initialIdea?.id;
    if (id && onUpdateIdea) {
      try { await onUpdateIdea(id, { stage: newStage }); } catch (e) { /* non-blocking */ }
    }
  };

  // Save changes from Edit mode back to the SAME Firestore document
  const handleSaveEditedIdea = async () => {
    const targetId = initialIdea?.id || activeIdea?.id;
    setIsUpdating(true);
    try {
      const patch: Partial<ProjectIdea> = {
        title: editTitle.trim() || activeIdea?.title,
        oneLiner: editOneLiner.trim() || activeIdea?.oneLiner,
        firstStep: editFirstStep.trim() || activeIdea?.firstStep,
        notes: editNotes.trim(),
        tags: editTags,
        stage: editStage,
      };

      if (targetId && onUpdateIdea) {
        await onUpdateIdea(targetId, patch);
      } else if (onSaveIdea && activeIdea) {
        await onSaveIdea({ ...activeIdea, ...patch });
      }

      setResult((prev) => (prev ? { ...prev, ...patch } : { ...activeIdea, ...patch }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Failed to update idea:", err);
      setSaveStatus("error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Refine & expand idea action
  const handleRefineIdea = async () => {
    if (!activeIdea) return;
    setRefining(true);
    setRefineError(null);
    try {
      const improved = await refineIdea(activeIdea, refineInstruction);
      setPendingRefinedIdea(improved);
      setResult(improved);
      setEditTitle(improved.title || "");
      setEditOneLiner(improved.oneLiner || "");
      setEditFirstStep(improved.firstStep || "");
      setEditNotes(improved.notes || "");
      setIsRefiningOpen(false);
    } catch (err: any) {
      setRefineError(err?.message || "Failed to refine project idea.");
    } finally {
      setRefining(false);
    }
  };

  // Commit refined idea to the same Firestore doc
  const handleSaveRefined = async () => {
    if (!pendingRefinedIdea) return;
    const targetId = initialIdea?.id || activeIdea?.id;
    setIsUpdating(true);
    try {
      if (targetId && onUpdateIdea) {
        await onUpdateIdea(targetId, pendingRefinedIdea);
      } else if (onSaveIdea) {
        await onSaveIdea(pendingRefinedIdea);
      }
      setResult(pendingRefinedIdea);
      setPendingRefinedIdea(null);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err: any) {
      console.error("Failed to save refined idea:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Discard refined proposal
  const handleDiscardRefined = () => {
    if (initialIdea) {
      setResult(initialIdea);
      setEditTitle(initialIdea.title || "");
      setEditOneLiner(initialIdea.oneLiner || "");
      setEditFirstStep(initialIdea.firstStep || "");
      setEditNotes(initialIdea.notes || "");
    }
    setPendingRefinedIdea(null);
  };

  const hasIdeaCard = Boolean(activeIdea?.title || activeIdea?.oneLiner || activeIdea?.idea);
  const hasCapabilitiesCard = Boolean(
    activeIdea?.capabilities && activeIdea.capabilities.length > 0
  );
  const hasBlueprintCard = Boolean(
    (activeIdea?.stack && activeIdea.stack.length > 0) ||
      (activeIdea?.uiComponents && activeIdea.uiComponents.length > 0) ||
      (activeIdea?.infra && activeIdea.infra.length > 0) ||
      activeIdea?.dataFlow ||
      (activeIdea?.milestones && activeIdea.milestones.length > 0)
  );
  const hasNextStepsCard = Boolean(
    (activeIdea?.risks && activeIdea.risks.length > 0) || activeIdea?.firstStep
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Studio Header: Shows either active saved idea banner or generator form */}
      {initialIdea ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center border border-amber-200/60 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  Saved Project Idea
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/70">
                  From History
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500">
                Viewing saved build concept from your history.
              </p>
            </div>
          </div>
          <button
            id="studio-start-new-btn"
            type="button"
            onClick={handleStartNewIdea}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs sm:text-sm font-medium hover:bg-stone-800 active:scale-[0.98] transition shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Wand2 className="w-4 h-4 text-amber-400" />
            <span>Start a new idea</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center border border-amber-200/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                AI Project Studio
              </h1>
              <p className="text-xs sm:text-sm text-stone-500">
                Brainstorm your next Gemini-powered build.
              </p>
            </div>
          </div>

          {/* Prompt Input Form */}
          <div className="mt-4 space-y-3">
            <textarea
              id="studio-seed-input"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              disabled={loading}
              placeholder="Optional: a theme, domain, or vibe… leave blank to surprise me"
              rows={3}
              className="w-full p-3.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none text-sm text-stone-800 placeholder:text-stone-400 resize-none transition bg-stone-50/50 disabled:opacity-60 disabled:cursor-not-allowed"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="studio-generate-btn"
                type="button"
                disabled={loading || !seed.trim()}
                title={!seed.trim() ? "Enter a seed idea, or hit Surprise Me for a random one" : "Generate an idea from your seed"}
                onClick={() => handleGenerate(seed)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs sm:text-sm font-medium hover:bg-stone-800 active:scale-[0.98] transition shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Wand2 className="w-4 h-4 text-amber-400" />
                )}
                <span>Generate Idea</span>
              </button>

              <button
                id="studio-surprise-btn"
                type="button"
                disabled={loading}
                onClick={() => handleGenerate("")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300/80 bg-amber-50/70 text-amber-900 text-xs sm:text-sm font-medium hover:bg-amber-100 active:scale-[0.98] transition shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Surprise Me</span>
              </button>
            </div>

            {!seed.trim() && !loading && (
              <p className="text-[11px] text-stone-400">
                Type a theme above to shape the idea, or hit <span className="font-medium text-amber-700">Surprise Me</span> for a random one.
              </p>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center justify-between text-xs sm:text-sm text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-xl px-4 py-3 shadow-xs animate-pulse">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                  <span className="font-medium">{IDEATION_STAGES[stageIndex]}</span>
                </div>
                <span className="text-[11px] text-amber-700/80 font-mono shrink-0">
                  (step {stageIndex + 1} of {IDEATION_STAGES.length})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => handleGenerate(lastCallSeed)}
          onDismiss={() => setError(null)}
          retryLabel="Retry Ideation"
        />
      )}

      {/* Results Region - Graceful Degradation */}
      {activeIdea && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Refined Proposal Review Banner */}
          {pendingRefinedIdea && (
            <div
              id="studio-refined-review-banner"
              className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-900">
                    Refined version ready for review
                  </div>
                  <p className="text-xs text-stone-600">
                    Inspecting refined blueprint with Gemini. Save changes to update your history document or discard.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  id="studio-refined-save-btn"
                  type="button"
                  onClick={handleSaveRefined}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
                >
                  {isUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Save changes</span>
                </button>
                <button
                  id="studio-refined-discard-btn"
                  type="button"
                  onClick={handleDiscardRefined}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-medium hover:bg-stone-50 active:scale-[0.98] transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-stone-500" />
                  <span>Discard</span>
                </button>
              </div>
            </div>
          )}

          {/* Actions: save + edit + refine + portable build spec export + start new */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-stone-600 mr-1">Actions:</span>

            {/* Edit Toggle for Active Ideas */}
            {activeIdea && (
              <button
                id="studio-edit-toggle-btn"
                type="button"
                onClick={() => {
                  if (!isEditing && activeIdea) {
                    setEditTitle(activeIdea.title || "");
                    setEditOneLiner(activeIdea.oneLiner || "");
                    setEditFirstStep(activeIdea.firstStep || "");
                    setEditNotes(activeIdea.notes || "");
                    setEditTags(Array.isArray(activeIdea.tags) ? activeIdea.tags : []);
                    setEditStage(activeIdea.stage || "Idea");
                  }
                  setIsEditing((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  isEditing
                    ? "bg-amber-100/90 border-amber-300 text-amber-950 font-semibold"
                    : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>{isEditing ? "Editing…" : "Edit"}</span>
              </button>
            )}

            {/* Refine / Expand Action */}
            {activeIdea && (
              <button
                id="studio-refine-toggle-btn"
                type="button"
                onClick={() => setIsRefiningOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  isRefiningOpen
                    ? "bg-amber-100/90 border-amber-300 text-amber-950 font-semibold"
                    : "border-amber-300/80 bg-amber-50/70 text-amber-900 hover:bg-amber-100"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Refine / expand</span>
              </button>
            )}

            {onSaveIdea && (
              <button
                id="studio-save-idea-btn"
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>{saving ? "Saving…" : "Save to history"}</span>
              </button>
            )}

            <button
              id="studio-download-spec-btn"
              type="button"
              onClick={handleDownloadSpec}
              title="Download a provider-agnostic .md build spec"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-xs font-medium hover:bg-stone-50 active:scale-[0.98] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Download .md</span>
            </button>

            <button
              id="studio-copy-spec-btn"
              type="button"
              onClick={handleCopySpec}
              title="Copy the build spec to clipboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300/80 bg-amber-50/70 text-amber-900 text-xs font-medium hover:bg-amber-100 active:scale-[0.98] transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-amber-600" />}
              <span>{copied ? "Copied" : "Copy spec"}</span>
            </button>

            {initialIdea && (
              <button
                id="studio-start-new-action-btn"
                type="button"
                onClick={handleStartNewIdea}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-xs font-medium hover:bg-stone-50 active:scale-[0.98] transition cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Start a new idea</span>
              </button>
            )}

            {/* Small Saved Confirmation Indicator */}
            {saveStatus === "saved" && (
              <span
                id="studio-saved-confirmation"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-fadeIn"
              >
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}

            <span className="w-full sm:w-auto sm:ml-auto text-[11px] text-stone-400">
              Build it in Gemini, Claude, or a local model (Ollama).
            </span>
          </div>

          {/* Refine / Expand Panel */}
          {isRefiningOpen && (
            <div
              id="studio-refine-panel"
              className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 space-y-3 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Refine & Expand with Gemini</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRefiningOpen(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-stone-600">
                Provide instructions to regenerate an improved version (e.g. &ldquo;add more capabilities&rdquo;, &ldquo;simplify the tech stack&rdquo;, &ldquo;deepen data flow and execution steps&rdquo;).
              </p>
              <textarea
                id="studio-refine-instruction-input"
                value={refineInstruction}
                onChange={(e) => setRefineInstruction(e.target.value)}
                placeholder="e.g. Add real-time streaming capabilities and simplify the tech stack..."
                rows={2}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRefiningOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="studio-refine-submit-btn"
                  type="button"
                  onClick={handleRefineIdea}
                  disabled={refining}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-900 text-amber-50 text-xs font-medium hover:bg-amber-800 active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
                >
                  {refining ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Refining idea…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Refine with Gemini</span>
                    </>
                  )}
                </button>
              </div>
              {refineError && (
                <p className="text-xs text-red-600 font-medium">{refineError}</p>
              )}
            </div>
          )}

          {/* Edit Saved Idea Mode */}
          {isEditing && (
            <div
              id="studio-edit-card"
              className="rounded-2xl border border-amber-300 bg-white p-5 sm:p-6 shadow-xs space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Editing Saved Idea</span>
                </div>
                {saveStatus === "saved" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    Saved
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label htmlFor="studio-edit-title" className="block text-xs font-semibold text-stone-700 mb-1">
                    Project Title
                  </label>
                  <input
                    id="studio-edit-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-sm font-semibold p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                    placeholder="Project title..."
                  />
                </div>

                <div>
                  <label htmlFor="studio-edit-oneliner" className="block text-xs font-semibold text-stone-700 mb-1">
                    One-Liner Pitch
                  </label>
                  <input
                    id="studio-edit-oneliner"
                    type="text"
                    value={editOneLiner}
                    onChange={(e) => setEditOneLiner(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                    placeholder="Single-sentence pitch..."
                  />
                </div>

                <div>
                  <label htmlFor="studio-edit-firststep" className="block text-xs font-semibold text-stone-700 mb-1">
                    First Actionable Step
                  </label>
                  <textarea
                    id="studio-edit-firststep"
                    value={editFirstStep}
                    onChange={(e) => setEditFirstStep(e.target.value)}
                    rows={2}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                    placeholder="Concrete first step to begin..."
                  />
                </div>

                <div>
                  <label htmlFor="studio-edit-notes" className="block text-xs font-semibold text-stone-700 mb-1">
                    My Notes (free-text)
                  </label>
                  <textarea
                    id="studio-edit-notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                    placeholder="Personal notes, constraints, research links, implementation thoughts..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Completion Stage</label>
                  <select
                    id="studio-edit-stage"
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                  >
                    {PROJECT_STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Tags (max 8)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editTags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                        #{t}
                        <button type="button" onClick={() => removeEditTag(t)} className="text-stone-400 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {editTags.length === 0 && (<span className="text-[11px] text-stone-400">No tags yet</span>)}
                  </div>
                  <input
                    id="studio-edit-tag-input"
                    type="text"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditTag(); } }}
                    placeholder="Type a tag and press Enter…"
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <button
                  id="studio-edit-cancel-btn"
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(activeIdea?.title || "");
                    setEditOneLiner(activeIdea?.oneLiner || "");
                    setEditFirstStep(activeIdea?.firstStep || "");
                    setEditNotes(activeIdea?.notes || "");
                    setEditTags(Array.isArray(activeIdea?.tags) ? activeIdea.tags : []);
                    setEditStage(activeIdea?.stage || "Idea");
                    setTagDraft("");
                  }}
                  className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-medium hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    id="studio-edit-save-btn"
                    type="button"
                    onClick={handleSaveEditedIdea}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Save changes</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Standard Idea Card (Read-only view) */}
          {!isEditing && hasIdeaCard && (
            <div
              id="studio-idea-card"
              className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Project Concept</span>
              </div>

              {activeIdea.title && (
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight leading-snug">
                  {activeIdea.title}
                </h2>
              )}

              {activeIdea.oneLiner && (
                <p className="text-sm sm:text-base italic text-amber-800 font-medium border-l-2 border-amber-400 pl-3 py-0.5">
                  {activeIdea.oneLiner}
                </p>
              )}

              {activeIdea.idea && (
                <p className="text-sm sm:text-base text-stone-700 leading-relaxed pt-1">
                  {activeIdea.idea}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <label htmlFor="studio-quick-stage" className="sr-only">Completion stage</label>
                <select
                  id="studio-quick-stage"
                  value={activeIdea.stage || "Idea"}
                  onChange={(e) => handleQuickStageChange(e.target.value)}
                  title="Set completion stage"
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-200 ${STAGE_STYLES[activeIdea.stage || "Idea"] || STAGE_STYLES.Idea}`}
                >
                  {PROJECT_STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                {activeIdea.tags?.map((t, i) => (
                  <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* My Notes Display Card (when notes exist and not currently editing) */}
          {!isEditing && activeIdea?.notes && (
            <div
              id="studio-notes-card"
              className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 tracking-wider uppercase">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>My Notes</span>
              </div>
              <p className="text-xs sm:text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                {activeIdea.notes}
              </p>
            </div>
          )}

          {/* Capabilities Card */}
          {hasCapabilitiesCard && (
            <div
              id="studio-capabilities-card"
              className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-semibold text-stone-900 text-base">
                  Recommended Capabilities
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {activeIdea.capabilities?.map((cap, idx) => {
                  const isSafeHttpsDocUrl =
                    typeof cap.docUrl === "string" &&
                    cap.docUrl.startsWith("https://") &&
                    cap.docUrl.trim().length > 0;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-stone-900">
                            {cap.name}
                          </span>
                          {isSafeHttpsDocUrl && (
                            <a
                              href={cap.docUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded transition shrink-0"
                            >
                              <span>Docs</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                          {cap.why}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Blueprint Card */}
          {hasBlueprintCard && (
            <div
              id="studio-blueprint-card"
              className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-semibold text-stone-900 text-base">
                  Architecture Blueprint
                </h3>
              </div>

              {/* Three Chip/Pill Sections */}
              <div className="space-y-4">
                {activeIdea.stack && activeIdea.stack.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-2">
                      Tech Stack
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeIdea.stack.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 text-stone-700 border border-stone-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeIdea.uiComponents && activeIdea.uiComponents.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-2">
                      UI Components
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeIdea.uiComponents.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeIdea.infra && activeIdea.infra.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-2">
                      Infra & Compute
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeIdea.infra.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 text-stone-700 border border-stone-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Data Flow */}
              {activeIdea.dataFlow && (
                <div className="pt-2 border-t border-stone-100">
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">
                    Data Flow
                  </span>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                    {activeIdea.dataFlow}
                  </p>
                </div>
              )}

              {/* Milestones */}
              {activeIdea.milestones && activeIdea.milestones.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ListChecks className="w-4 h-4 text-stone-500" />
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                      Milestones
                    </span>
                  </div>
                  <ol className="space-y-1.5 text-xs sm:text-sm text-stone-700 list-decimal list-inside pl-1">
                    {activeIdea.milestones.map((m, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="ml-1">{m}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Next Steps Card */}
          {hasNextStepsCard && (
            <div
              id="studio-next-steps-card"
              className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-semibold text-stone-900 text-base">
                  Next Steps & Execution
                </h3>
              </div>

              {activeIdea.risks && activeIdea.risks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Key Risks & Mitigations
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs sm:text-sm text-stone-600 list-disc list-inside pl-1">
                    {activeIdea.risks.map((risk, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="ml-1">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeIdea.firstStep && (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-4 space-y-1">
                  <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider block">
                    First Actionable Step
                  </span>
                  <p className="text-xs sm:text-sm text-stone-800 font-medium leading-relaxed">
                    {activeIdea.firstStep}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer with Model Name */}
          {activeIdea.modelUsed && (
            <div className="text-center text-xs text-stone-400 py-1">
              Generated with {activeIdea.modelUsed}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
