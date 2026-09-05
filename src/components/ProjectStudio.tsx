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
} from "lucide-react";
import { ideate, IdeateResponse } from "../lib/geminiApi";
import { ProjectIdea } from "../types";
import { buildProjectSpecMarkdown, slugify, downloadTextFile, copyText } from "../lib/buildSpec";
import { ErrorBanner } from "./ErrorBanner";

const IDEATION_STAGES = [
  "Generating the core concept…",
  "Selecting the right AI capabilities…",
  "Drafting the architecture blueprint…",
  "Planning your first actionable steps…",
];

interface ProjectStudioProps {
  onSaveIdea?: (idea: ProjectIdea) => Promise<void> | void;
}

export const ProjectStudio: React.FC<ProjectStudioProps> = ({ onSaveIdea }) => {
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdeateResponse | null>(null);
  const [lastCallSeed, setLastCallSeed] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

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
    try {
      const data = await ideate(inputSeed);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Failed to generate project idea.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSpec = () => {
    if (!result) return;
    const md = buildProjectSpecMarkdown(result);
    downloadTextFile(`${slugify(result.title || "project")}-build-spec.md`, md);
  };

  const handleCopySpec = async () => {
    if (!result) return;
    const ok = await copyText(buildProjectSpecMarkdown(result));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleSave = async () => {
    if (!result || !onSaveIdea) return;
    setSaving(true);
    try {
      await onSaveIdea(result);
    } finally {
      setSaving(false);
    }
  };

  const hasIdeaCard = Boolean(result?.title || result?.oneLiner || result?.idea);
  const hasCapabilitiesCard = Boolean(
    result?.capabilities && result.capabilities.length > 0
  );
  const hasBlueprintCard = Boolean(
    (result?.stack && result.stack.length > 0) ||
      (result?.uiComponents && result.uiComponents.length > 0) ||
      (result?.infra && result.infra.length > 0) ||
      result?.dataFlow ||
      (result?.milestones && result.milestones.length > 0)
  );
  const hasNextStepsCard = Boolean(
    (result?.risks && result.risks.length > 0) || result?.firstStep
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Studio Header */}
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
      {result && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Actions: save + portable build spec export */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-stone-600 mr-1">Do more with this idea:</span>

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

            <span className="w-full sm:w-auto sm:ml-auto text-[11px] text-stone-400">
              Build it in Gemini, Claude, or a local model (Ollama).
            </span>
          </div>

          {/* Idea Card */}
          {hasIdeaCard && (
            <div
              id="studio-idea-card"
              className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Project Concept</span>
              </div>

              {result.title && (
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight leading-snug">
                  {result.title}
                </h2>
              )}

              {result.oneLiner && (
                <p className="text-sm sm:text-base italic text-amber-800 font-medium border-l-2 border-amber-400 pl-3 py-0.5">
                  {result.oneLiner}
                </p>
              )}

              {result.idea && (
                <p className="text-sm sm:text-base text-stone-700 leading-relaxed pt-1">
                  {result.idea}
                </p>
              )}
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
                {result.capabilities?.map((cap, idx) => {
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
                {result.stack && result.stack.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-2">
                      Tech Stack
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.stack.map((item, idx) => (
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

                {result.uiComponents && result.uiComponents.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-2">
                      UI Components
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.uiComponents.map((item, idx) => (
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

                {result.infra && result.infra.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-2">
                      Infra & Compute
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.infra.map((item, idx) => (
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
              {result.dataFlow && (
                <div className="pt-2 border-t border-stone-100">
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">
                    Data Flow
                  </span>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                    {result.dataFlow}
                  </p>
                </div>
              )}

              {/* Milestones */}
              {result.milestones && result.milestones.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ListChecks className="w-4 h-4 text-stone-500" />
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                      Milestones
                    </span>
                  </div>
                  <ol className="space-y-1.5 text-xs sm:text-sm text-stone-700 list-decimal list-inside pl-1">
                    {result.milestones.map((m, idx) => (
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

              {result.risks && result.risks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Key Risks & Mitigations
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs sm:text-sm text-stone-600 list-disc list-inside pl-1">
                    {result.risks.map((risk, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="ml-1">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.firstStep && (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-4 space-y-1">
                  <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider block">
                    First Actionable Step
                  </span>
                  <p className="text-xs sm:text-sm text-stone-800 font-medium leading-relaxed">
                    {result.firstStep}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer with Model Name */}
          {result.modelUsed && (
            <div className="text-center text-xs text-stone-400 py-1">
              Generated with {result.modelUsed}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
