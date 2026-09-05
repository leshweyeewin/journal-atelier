import React, { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Lock, LockOpen } from "lucide-react";
import { auth } from "./firebase";
import { AppUser, ChatMessage, JournalInteraction, ReflectionMode, SummaryResult, SecuritySettings, ProjectIdea } from "./types";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { HistorySidebar } from "./components/HistorySidebar";
import { JournalEditor } from "./components/JournalEditor";
import { ChatStream } from "./components/ChatStream";
import { SummaryCard, AgentLoadingState } from "./components/SummaryCard";
import { ErrorBanner } from "./components/ErrorBanner";
import { TelegramSettings } from "./components/TelegramSettings";
import { ProjectStudio } from "./components/ProjectStudio";
import { PinModal } from "./components/PinModal";
import { DashboardView } from "./components/DashboardView";
import {
  saveInteraction,
  updateInteraction,
  subscribeUserInteractions,
  deleteInteraction,
  getSecuritySettings,
  setSecuritySettings,
  setInteractionLocked,
} from "./lib/firestoreService";
import { generateSalt, hashPin, safeEqual, PIN_ITERATIONS } from "./lib/pinLock";
import {
  callGeminiChat,
  callMultiAgentReflect,
  getTelegramSettings,
  notifyProjectSaved,
} from "./lib/geminiApi";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Firestore interactions list
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Active interaction state
  const [activeId, setActiveId] = useState<string>(() => `entry_${Date.now()}`);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [mode, setMode] = useState<ReflectionMode>("reflect");
  const [tags, setTags] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
  const [agentLoadingState, setAgentLoadingState] = useState<AgentLoadingState | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // UI operation states
  const [isSaving, setIsSaving] = useState(false);
  const [isAiReflecting, setIsAiReflecting] = useState(false);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedSavePayload, setFailedSavePayload] = useState<Partial<JournalInteraction> | null>(null);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [view, setView] = useState<"journal" | "studio" | "dashboard">("journal");
  const [studioToast, setStudioToast] = useState<string | null>(null);
  const [studioIdea, setStudioIdea] = useState<ProjectIdea | null>(null);
  const isFirstMountRef = useRef(true);
  const lastSavedSnapshotRef = useRef<string>("");
  const hasAutoLandedRef = useRef(false);

  // Auto-collapse reflections HistorySidebar when user is not in journal view, and restore when returning
  useEffect(() => {
    if (view !== "journal") {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [view]);

  // Auto-dismiss studio toast
  useEffect(() => {
    if (!studioToast) return;
    const t = setTimeout(() => setStudioToast(null), 3000);
    return () => clearTimeout(t);
  }, [studioToast]);

  // PIN & Security lock states
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [unlockedEntryId, setUnlockedEntryId] = useState<string | null>(null);
  const [pinModal, setPinModal] = useState<"set" | "enter" | null>(null);
  const [pendingLockedEntry, setPendingLockedEntry] = useState<JournalInteraction | null>(null);
  const hasPin = !!security;
  const activeEntry = interactions.find((e) => e.id === activeId);
  const activeLocked = !!activeEntry?.locked;
  const isRevealed = !activeLocked || activeId === unlockedEntryId;

  // Listen to Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
        getSecuritySettings(user.uid).then(setSecurity).catch(() => {});
      } else {
        setCurrentUser(null);
        setInteractions([]);
        setSecurity(null);
        setUnlockedEntryId(null);
        hasAutoLandedRef.current = false;
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Reset auto-landing flag if currentUser uid changes
  useEffect(() => {
    hasAutoLandedRef.current = false;
  }, [currentUser?.uid]);

  // Listen to User's Isolated Firestore Interactions Subcollection
  useEffect(() => {
    if (!currentUser?.uid) return;

    setListLoading(true);
    const unsubscribe = subscribeUserInteractions(
      currentUser.uid,
      (entries) => {
        const validEntries = entries.filter((e) => (e as any).type !== "ideation");
        setInteractions(validEntries);
        setListLoading(false);

        // Auto-landing ONCE per sign-in:
        // If at least one saved entry exists, land on Trends ("dashboard").
        // If zero entries, keep view "journal" (the composer) so new users land on "start writing".
        if (!hasAutoLandedRef.current) {
          hasAutoLandedRef.current = true;
          if (validEntries.length > 0) {
            setView("dashboard");
          } else {
            setView("journal");
          }
        }
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setErrorMessage("Failed to synchronize reflections with Firestore. Check your connection.");
        setListLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // One-time Telegram status fetch on mount (after auth) to preserve connected indicator
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsTelegramConnected(false);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await getTelegramSettings();
        if (isMounted && res && typeof res.connected === "boolean") {
          setIsTelegramConnected(res.connected);
        }
      } catch {
        // Silently ignore errors on mount
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // Handler to start a brand new reflection
  const handleNewEntry = useCallback(() => {
    setUnlockedEntryId(null);
    const newId = `entry_${Date.now()}`;
    setActiveId(newId);
    setTitle("");
    setContent("");
    setTags([]);
    setMode("reflect");
    setMessages([]);
    setSummaryData(null);
    setAgentLoadingState(null);
    setLastSavedAt(null);
    setErrorMessage(null);
    setFailedSavePayload(null);
    setStudioIdea(null);
    setView("journal");
    lastSavedSnapshotRef.current = `${newId}:::[]`;
  }, []);

  // Extracted entry loader
  const openEntry = useCallback(
    (entry: JournalInteraction) => {
      setView("journal");
      setActiveId(entry.id);
      setTitle(entry.title || "");
      const loadedContent = entry.content || (entry as any).idea || (entry as any).oneLiner || "";
      setContent(loadedContent);
      const loadedTags = Array.isArray(entry.tags) ? entry.tags : [];
      setTags(loadedTags);
      setMode(entry.mode === "summarize" ? "reflect" : entry.mode || "reflect");
      setMessages(Array.isArray(entry.messages) ? entry.messages : []);
      setAgentLoadingState(null);
      if (
        entry.summary ||
        entry.insights?.length ||
        entry.reflection ||
        entry.sentiment ||
        entry.themes?.length ||
        entry.coachPrompt ||
        entry.mood
      ) {
        setSummaryData({
          suggestedTitle: entry.title,
          summary: entry.summary,
          insights: entry.insights,
          tags: entry.tags,
          mood: entry.sentiment?.tag || entry.mood,
          reflection: entry.reflection,
          sentiment: entry.sentiment,
          themes: entry.themes,
          coachPrompt: entry.coachPrompt,
          modelUsed: entry.modelUsed,
        });
      } else {
        setSummaryData(null);
      }
      const parsedTime = entry.updatedAt ? new Date(entry.updatedAt).getTime() : null;
      setLastSavedAt(!isNaN(parsedTime as number) ? parsedTime : null);
      setErrorMessage(null);
      setFailedSavePayload(null);
      lastSavedSnapshotRef.current = `${entry.id}:${entry.title || ""}:${loadedContent}:${JSON.stringify(loadedTags)}`;
    },
    []
  );

  // Handler to select an existing reflection or saved project idea from history:
  // Gate FIRST with PIN if locked and not revealed, then route to studio or openEntry
  const handleSelectEntry = useCallback(
    (entry: JournalInteraction) => {
      if (entry.locked && entry.id !== unlockedEntryId) {
        setPendingLockedEntry(entry);
        setPinModal("enter");
        return; // never populate unrevealed locked content
      }

      // Re-lock whenever a different entry is opened
      if (unlockedEntryId && unlockedEntryId !== entry.id) {
        setUnlockedEntryId(null);
      }

      if (entry.projectIdea) {
        setStudioIdea({
          ...entry.projectIdea,
          id: entry.id,
        });
        setView("studio");
        return;
      }
      setStudioIdea(null);
      openEntry(entry);
    },
    [openEntry, unlockedEntryId]
  );

  // PIN security handlers
  const handleSetPin = async (pin: string) => {
    if (!currentUser) return "Not signed in";
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);
    const s = { salt, hash, iterations: PIN_ITERATIONS, updatedAt: Date.now() };
    await setSecuritySettings(currentUser.uid, s);
    setSecurity(s);
    setPinModal(null);
    const target = pendingLockedEntry || (activeLocked ? activeEntry : null);
    if (target) {
      setUnlockedEntryId(target.id);
      if (target.projectIdea) {
        setStudioIdea({
          ...target.projectIdea,
          id: target.id,
        });
        setView("studio");
      } else {
        setStudioIdea(null);
        openEntry(target);
      }
      setPendingLockedEntry(null);
    }
    return null;
  };

  const handleEnterPin = async (pin: string) => {
    if (!security) return "No PIN set";
    const hash = await hashPin(pin, security.salt, security.iterations);
    if (!safeEqual(hash, security.hash)) return "Incorrect PIN";
    setPinModal(null);
    const target = pendingLockedEntry || (activeLocked ? activeEntry : null);
    if (target) {
      setUnlockedEntryId(target.id);
      if (target.projectIdea) {
        setStudioIdea({
          ...target.projectIdea,
          id: target.id,
        });
        setView("studio");
      } else {
        setStudioIdea(null);
        openEntry(target);
      }
      setPendingLockedEntry(null);
    }
    return null;
  };

  const handleToggleLock = async (entry: JournalInteraction) => {
    if (!currentUser) return;
    if (!entry.locked && !hasPin) {
      setPinModal("set");
      return;
    }
    await setInteractionLocked(currentUser.uid, entry.id, !entry.locked);
  };

  // Handler to delete a reflection
  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
      await deleteInteraction(currentUser.uid, id);
      if (activeId === id) {
        handleNewEntry();
      }
    } catch (err: any) {
      console.error("Failed to delete entry:", err);
      setErrorMessage("Could not delete the reflection from Firestore.");
    }
  };

  // Save a Project Idea to History
  const handleSaveIdea = useCallback(
    async (idea: ProjectIdea) => {
      if (!currentUser) {
        setStudioToast("Sign in to save ideas.");
        return;
      }
      const id = idea.id || `idea_${Date.now()}`;
      const savedIdea: ProjectIdea = { ...idea, id };
      const body = [
        savedIdea.oneLiner ? `_${savedIdea.oneLiner}_` : "",
        savedIdea.idea || "",
        savedIdea.firstStep ? `**First step:** ${savedIdea.firstStep}` : "",
        savedIdea.notes ? `**Notes:** ${savedIdea.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      try {
        await saveInteraction(currentUser.uid, {
          id,
          title: savedIdea.title || "Project idea",
          content: body,
          mode: "brainstorm",
          modelUsed: savedIdea.modelUsed || "gemini-3.6-flash",
          projectIdea: savedIdea,
        });
        setStudioIdea(savedIdea);
        setStudioToast("Idea saved to your history.");
        // Fire-and-forget outbound Telegram notification (best-effort, non-blocking)
        notifyProjectSaved({
          title: savedIdea.title,
          oneLiner: savedIdea.oneLiner,
          firstStep: savedIdea.firstStep,
        });
      } catch {
        setStudioToast("Could not save idea. Please try again.");
      }
    },
    [currentUser]
  );

  // Update an existing saved idea in Firestore without creating a new entry
  const handleUpdateIdea = useCallback(
    async (id: string, patch: Partial<ProjectIdea>) => {
      if (!currentUser) throw new Error("Not signed in");
      if (!id) throw new Error("Missing idea document ID");

      const existingEntry = interactions.find((e) => e.id === id || e.projectIdea?.id === id);
      const baseIdea = existingEntry?.projectIdea || studioIdea || {};
      const mergedIdea: ProjectIdea = {
        ...baseIdea,
        ...patch,
        id,
      };

      const updatedBody = [
        mergedIdea.oneLiner ? `_${mergedIdea.oneLiner}_` : "",
        mergedIdea.idea || "",
        mergedIdea.firstStep ? `**First step:** ${mergedIdea.firstStep}` : "",
        mergedIdea.notes ? `**Notes:** ${mergedIdea.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      await updateInteraction(currentUser.uid, id, {
        title: mergedIdea.title || existingEntry?.title || "Project idea",
        content: updatedBody,
        projectIdea: mergedIdea,
      });

      setStudioIdea(mergedIdea);
      setStudioToast("Changes saved to your history.");
    },
    [currentUser, interactions, studioIdea]
  );

  // Guaranteed Transactional Save to Firestore
  const persistToFirestore = async (override?: Partial<JournalInteraction>) => {
    if (!currentUser) return null;

    // 6) Autosave guard: skip when activeLocked && activeId !== unlockedEntryId
    if (activeLocked && activeId !== unlockedEntryId) {
      return null;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payloadToSave: Partial<JournalInteraction> & { id: string } = {
      id: activeId,
      title: title.trim() || summaryData?.suggestedTitle || "Untitled Reflection",
      content,
      mode,
      messages,
      summary: summaryData?.summary || "",
      insights: summaryData?.insights || [],
      tags: override?.tags !== undefined ? override.tags : tags,
      mood: summaryData?.sentiment?.tag || summaryData?.mood || "",
      reflection: summaryData?.reflection || "",
      sentiment: summaryData?.sentiment,
      themes: summaryData?.themes || [],
      coachPrompt: summaryData?.coachPrompt || "",
      modelUsed: summaryData?.modelUsed || "gemini-3.6-flash",
      ...override,
    };

    try {
      const saved = await saveInteraction(currentUser.uid, payloadToSave);
      setLastSavedAt(Date.now());
      setFailedSavePayload(null);
      lastSavedSnapshotRef.current = `${activeId}:${payloadToSave.title}:${payloadToSave.content}:${JSON.stringify(payloadToSave.tags || [])}`;
      return saved;
    } catch (err: any) {
      console.error("Firestore save error:", err);
      setErrorMessage("Could not save to Firestore. Your unsaved text has been kept intact.");
      setFailedSavePayload(payloadToSave);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced autosave (~30000ms) for the active journal entry
  // Security & Resilience:
  // - Debounce ~30000ms (30s) after user stops changing title, content, or tags
  // - Only autosaves when content.trim() is non-empty and user is signed in
  // - SECURITY: never autosaves when active entry is locked and not currently revealed
  // - Skips autosave while manual save (isSaving) is in flight to prevent write races
  // - Reuses existing persistToFirestore(); never invokes Gemini
  // - Does not autosave in Studio or Trends views
  useEffect(() => {
    // Guard the very first mount so it does not save an empty new entry
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (view !== "journal") return;
    if (!currentUser) return;
    if (!content.trim()) return;
    if (isSaving) return;

    // SECURITY: never autosave when activeLocked && activeId !== unlockedEntryId
    if (activeLocked && activeId !== unlockedEntryId) return;

    const currentSnapshot = `${activeId}:${title}:${content}:${JSON.stringify(tags)}`;
    if (lastSavedSnapshotRef.current === currentSnapshot) {
      return;
    }

    const timer = setTimeout(() => {
      // Re-verify guards when debounced timer fires
      if (view !== "journal") return;
      if (!currentUser || !content.trim()) return;
      if (isSaving) return;
      if (activeLocked && activeId !== unlockedEntryId) return;

      persistToFirestore();
      lastSavedSnapshotRef.current = currentSnapshot;
    }, 30000);

    return () => clearTimeout(timer);
  }, [title, content, tags, activeLocked, activeId, unlockedEntryId, view, currentUser, isSaving]);

  // Tag management handlers with immediate Firestore persistence for active entries
  const handleAddTag = async (tagText: string) => {
    if (activeLocked && activeId !== unlockedEntryId) return;
    const cleanTag = tagText.trim().replace(/^#+/, "").replace(/[<>{}[\]\\\/]/g, "").trim();
    if (!cleanTag) return;
    if (tags.some((t) => t.toLowerCase() === cleanTag.toLowerCase())) return;

    const nextTags = [...tags, cleanTag];
    setTags(nextTags);

    // If entry has content/title or has already been saved, persist to Firestore immediately
    if (currentUser && (content.trim() || title.trim() || lastSavedAt)) {
      await persistToFirestore({ tags: nextTags });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (activeLocked && activeId !== unlockedEntryId) return;
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);

    if (currentUser && (content.trim() || title.trim() || lastSavedAt)) {
      await persistToFirestore({ tags: nextTags });
    }
  };

  // Multi-Agent Analysis Runner (Section 10 Orchestration)
  // Shows per-agent loading state, updates UI state, and updates Firestore
  const runMultiAgentAnalysis = async (targetId: string, entryContent: string) => {
    if (!entryContent.trim() || !currentUser) return;
    setAgentLoadingState({ reflection: true, sentiment: true, pattern: true, coach: true });

    try {
      const result = await callMultiAgentReflect(entryContent);

      let combinedTags = tags;
      if (Array.isArray(result.tags) && result.tags.length > 0) {
        const existingLower = new Set(tags.map((t) => t.toLowerCase()));
        const toAdd = result.tags.filter((t) => !existingLower.has(t.toLowerCase()));
        combinedTags = [...tags, ...toAdd];
        setTags(combinedTags);
      }

      const updatedSummary: SummaryResult = {
        ...(summaryData || {}),
        suggestedTitle: result.suggestedTitle,
        reflection: result.reflection,
        sentiment: result.sentiment,
        themes: result.themes,
        coachPrompt: result.coachPrompt,
        tags: combinedTags,
        summary: result.reflection,
        insights: result.themes,
        mood: result.sentiment?.tag || summaryData?.mood,
        modelUsed: result.modelUsed || summaryData?.modelUsed,
      };

      setSummaryData(updatedSummary);

      if (result.suggestedTitle && !title.trim()) {
        setTitle(result.suggestedTitle);
      }

      // Persist reflection, sentiment, themes, and coach prompt onto the same users/{uid}/interactions document
      await persistToFirestore({
        id: targetId,
        title: title.trim() || result.suggestedTitle || "Untitled Reflection",
        reflection: result.reflection || "",
        sentiment: result.sentiment,
        themes: result.themes || [],
        coachPrompt: result.coachPrompt || "",
        tags: combinedTags,
        summary: result.reflection || "",
        insights: result.themes || [],
        mood: result.sentiment?.tag || "",
        modelUsed: result.modelUsed,
      });
    } catch (err: any) {
      console.warn("Multi-agent reflection analysis warning:", err);
      // Soft-fail: Do not overwrite the saved entry or crash UI
    } finally {
      setAgentLoadingState(null);
    }
  };

  // Explicit Save button click: saves entry and then triggers multi-agent reflection
  const handleManualSave = async () => {
    if (!isRevealed) {
      if (activeEntry) setPendingLockedEntry(activeEntry);
      setPinModal("enter");
      return;
    }
    if (!content.trim()) return;
    const currentId = activeId;
    const currentContent = content;

    const saved = await persistToFirestore();
    if (saved && currentContent.trim()) {
      await runMultiAgentAnalysis(currentId, currentContent);
    }
  };

  // Reflect with Gemini based on user's current written reflection
  const handleReflectWithAI = async () => {
    if (!isRevealed) {
      if (activeEntry) setPendingLockedEntry(activeEntry);
      setPinModal("enter");
      return;
    }
    if (!content.trim() || !currentUser) return;
    setIsAiReflecting(true);
    setErrorMessage(null);

    const userEntryPrompt: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: `I've written this reflection:\n"${content.trim()}"\n\nPlease share your insights, reflections, and any constructive questions to help me process this deeper.`,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userEntryPrompt];
    setMessages(nextMessages);

    try {
      const response = await callGeminiChat(nextMessages, content, mode);

      const aiReply: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: "model",
        content: response.text,
        timestamp: response.timestamp || Date.now(),
      };

      const finalMessages = [...nextMessages, aiReply];
      setMessages(finalMessages);

      // Input-to-Save Completeness: Persist both user thought and Gemini reply
      await persistToFirestore({
        messages: finalMessages,
        modelUsed: response.modelUsed,
      });
    } catch (err: any) {
      console.error("Gemini reflection failed:", err);
      setErrorMessage(err.message || "Failed to generate AI reflection with Gemini.");
    } finally {
      setIsAiReflecting(false);
    }
  };

  // Send a message inside the multi-turn chat stream
  const handleSendChatMessage = async (text: string) => {
    if (!isRevealed) {
      if (activeEntry) setPendingLockedEntry(activeEntry);
      setPinModal("enter");
      return;
    }
    if (!currentUser || !text.trim()) return;
    setIsAiReflecting(true);
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const response = await callGeminiChat(nextMessages, content, mode);

      const aiReply: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: "model",
        content: response.text,
        timestamp: response.timestamp || Date.now(),
      };

      const finalMessages = [...nextMessages, aiReply];
      setMessages(finalMessages);

      // Persist conversation update to Firestore immediately
      await persistToFirestore({
        messages: finalMessages,
        modelUsed: response.modelUsed,
      });
    } catch (err: any) {
      console.error("Chat message error:", err);
      setErrorMessage(err.message || "Gemini conversation failed.");
      throw err;
    } finally {
      setIsAiReflecting(false);
    }
  };

  // Unified Synthesize action: triggers the 4-agent reflection pipeline
  const handleSummarizeWithAI = async () => {
    if (!isRevealed) {
      if (activeEntry) setPendingLockedEntry(activeEntry);
      setPinModal("enter");
      return;
    }
    if (!content.trim() || !currentUser) return;
    setIsAiSummarizing(true);
    setErrorMessage(null);

    try {
      await runMultiAgentAnalysis(activeId, content);
    } catch (err: any) {
      console.error("Synthesize error:", err);
      setErrorMessage(err.message || "Failed to generate reflection synthesis.");
    } finally {
      setIsAiSummarizing(false);
    }
  };

  // Loading Splash
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-stone-600">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Connecting to Journal Atelier...</p>
      </div>
    );
  }

  // Unauthenticated: Show Landing Page
  if (!currentUser) {
    return <LandingPage onAuthSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-stone-100/50 flex flex-col text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        onNewEntry={handleNewEntry}
        isSaving={isSaving}
        isTelegramConnected={isTelegramConnected}
        onOpenTelegramSettings={() => setIsTelegramModalOpen(true)}
        view={view}
        onNavigate={(newView) => {
          if (newView !== "studio") {
            setStudioIdea(null);
          }
          setUnlockedEntryId(null);
          setView(newView);
        }}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-6">
        {/* Left Sidebar: Isolated User Reflections History */}
        <HistorySidebar
          entries={interactions}
          activeEntryId={activeId}
          onSelectEntry={handleSelectEntry}
          onDeleteEntry={handleDeleteEntry}
          isLoading={listLoading}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onToggleLock={handleToggleLock}
        />

        {/* Main Stage: Active Journal Atelier, Project Studio, or Dashboard Trends */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col">
          {view === "studio" ? (
            <ProjectStudio
              onSaveIdea={handleSaveIdea}
              onUpdateIdea={handleUpdateIdea}
              initialIdea={studioIdea}
              onClearInitialIdea={() => setStudioIdea(null)}
            />
          ) : view === "dashboard" ? (
            <DashboardView
              entries={interactions}
              onSelectEntry={handleSelectEntry}
              onNewEntry={handleNewEntry}
            />
          ) : (
            <>
              {/* Top Lock Bar (view === "journal", only when activeLocked) */}
              {activeLocked && (
                <div
                  id="active-entry-lock-bar"
                  className="mb-4 px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 bg-white border-amber-200/80 shadow-xs"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-700">
                    {isRevealed ? (
                      <>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                          <LockOpen className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-semibold text-stone-900">Unlocked</span>
                        <span className="text-stone-400 hidden sm:inline">• Protected entry revealed for this session</span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-semibold text-stone-900">This entry is locked</span>
                        <span className="text-stone-400 hidden sm:inline">• PIN required to view reflections and chat</span>
                      </>
                    )}
                  </div>

                  {isRevealed ? (
                    <button
                      id="lock-revealed-entry-btn"
                      type="button"
                      onClick={() => setUnlockedEntryId(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 transition cursor-pointer border border-stone-200"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Lock</span>
                    </button>
                  ) : (
                    <button
                      id="unlock-entry-btn"
                      type="button"
                      onClick={() => {
                        if (activeEntry) {
                          setPendingLockedEntry(activeEntry);
                        }
                        setPinModal("enter");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-stone-900 hover:bg-stone-800 active:scale-95 transition cursor-pointer shadow-xs"
                    >
                      <LockOpen className="w-3.5 h-3.5" />
                      <span>Unlock to view</span>
                    </button>
                  )}
                </div>
              )}

              {/* Error Banner with guaranteed retry */}
              {errorMessage && (
                <div className="mb-4">
                  <ErrorBanner
                    message={errorMessage}
                    onRetry={
                      failedSavePayload
                        ? () => persistToFirestore(failedSavePayload)
                        : undefined
                    }
                    onDismiss={() => {
                      setErrorMessage(null);
                      setFailedSavePayload(null);
                    }}
                  />
                </div>
              )}

              {/* Section Gating: when activeLocked && !isRevealed, render ONLY the lock bar + placeholder */}
              {activeLocked && !isRevealed ? (
                <div
                  id="locked-entry-placeholder"
                  className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-stone-200/80 bg-white/70"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-3 shadow-xs">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900 mb-1">
                    {activeEntry?.title || "Protected Reflection"}
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mb-4">
                    Enter your PIN to view this reflection
                  </p>
                  <button
                    id="placeholder-unlock-btn"
                    type="button"
                    onClick={() => {
                      if (activeEntry) {
                        setPendingLockedEntry(activeEntry);
                      }
                      setPinModal("enter");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl text-white bg-stone-900 hover:bg-stone-800 active:scale-95 transition cursor-pointer shadow-xs"
                  >
                    <LockOpen className="w-3.5 h-3.5" />
                    <span>Enter PIN to Unlock</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* AI Summary & Multi-Agent Reflection Card if present or analyzing */}
                  {(summaryData || agentLoadingState) && (
                    <SummaryCard
                      summary={summaryData}
                      agentLoadingState={agentLoadingState}
                      onApplyTitle={(suggested) => setTitle(suggested)}
                      onClose={() => {
                        setSummaryData(null);
                        setAgentLoadingState(null);
                      }}
                    />
                  )}

                  {/* Core Journal / Reflection Composer */}
                  <JournalEditor
                    title={title}
                    setTitle={setTitle}
                    content={content}
                    setContent={setContent}
                    mode={mode}
                    setMode={setMode}
                    tags={tags}
                    setTags={setTags}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    onReflectWithAI={handleReflectWithAI}
                    onSummarizeWithAI={handleSummarizeWithAI}
                    onSave={handleManualSave}
                    isSaving={isSaving}
                    isAiReflecting={isAiReflecting}
                    isAiSummarizing={isAiSummarizing}
                    lastSavedAt={lastSavedAt}
                  />

                  {/* Multi-turn Dialogue Stream with Gemini */}
                  <div className="flex-1 min-h-[360px]">
                    <ChatStream
                      messages={messages}
                      onSendMessage={handleSendChatMessage}
                      isLoading={isAiReflecting}
                      disabled={!content.trim() && messages.length === 0}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Telegram Notifications Settings Modal */}
      {isTelegramModalOpen && (
        <TelegramSettings
          isOpenModal={true}
          onCloseModal={() => setIsTelegramModalOpen(false)}
          onStatusChange={(connected) => setIsTelegramConnected(connected)}
        />
      )}

      {/* PIN Security Modal */}
      {pinModal && (
        <PinModal
          mode={pinModal}
          onSubmit={pinModal === "set" ? handleSetPin : handleEnterPin}
          onCancel={() => {
            setPinModal(null);
            setPendingLockedEntry(null);
          }}
        />
      )}

      {/* Studio Toast Notification */}
      {studioToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs sm:text-sm font-medium shadow-lg border border-stone-700 animate-fadeIn">
          {studioToast}
        </div>
      )}
    </div>
  );
}
