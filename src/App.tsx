import React, { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { AppUser, ChatMessage, JournalInteraction, ReflectionMode, SummaryResult } from "./types";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { HistorySidebar } from "./components/HistorySidebar";
import { JournalEditor } from "./components/JournalEditor";
import { ChatStream } from "./components/ChatStream";
import { SummaryCard, AgentLoadingState } from "./components/SummaryCard";
import { ErrorBanner } from "./components/ErrorBanner";
import { TelegramSettings } from "./components/TelegramSettings";
import {
  saveInteraction,
  subscribeUserInteractions,
  deleteInteraction,
} from "./lib/firestoreService";
import {
  callGeminiChat,
  callMultiAgentReflect,
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
      } else {
        setCurrentUser(null);
        setInteractions([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to User's Isolated Firestore Interactions Subcollection
  useEffect(() => {
    if (!currentUser?.uid) return;

    setListLoading(true);
    const unsubscribe = subscribeUserInteractions(
      currentUser.uid,
      (entries) => {
        setInteractions(entries);
        setListLoading(false);
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setErrorMessage("Failed to synchronize reflections with Firestore. Check your connection.");
        setListLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Handler to start a brand new reflection
  const handleNewEntry = useCallback(() => {
    const newId = `entry_${Date.now()}`;
    setActiveId(newId);
    setTitle("");
    setContent("");
    setMode("reflect");
    setMessages([]);
    setSummaryData(null);
    setAgentLoadingState(null);
    setLastSavedAt(null);
    setErrorMessage(null);
    setFailedSavePayload(null);
  }, []);

  // Handler to select an existing reflection from history
  const handleSelectEntry = useCallback((entry: JournalInteraction) => {
    setActiveId(entry.id);
    setTitle(entry.title || "");
    setContent(entry.content || "");
    setMode(entry.mode || "reflect");
    setMessages(entry.messages || []);
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
    setLastSavedAt(entry.updatedAt);
    setErrorMessage(null);
    setFailedSavePayload(null);
  }, []);

  // Handler to delete a reflection
  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (!window.confirm("Are you sure you want to delete this reflection?")) return;

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

  // Guaranteed Transactional Save to Firestore
  const persistToFirestore = async (override?: Partial<JournalInteraction>) => {
    if (!currentUser) return null;
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
      tags: summaryData?.tags || [],
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

  // Multi-Agent Analysis Runner (Section 10 Orchestration)
  // Shows per-agent loading state, updates UI state, and updates Firestore
  const runMultiAgentAnalysis = async (targetId: string, entryContent: string) => {
    if (!entryContent.trim() || !currentUser) return;
    setAgentLoadingState({ reflection: true, sentiment: true, pattern: true, coach: true });

    try {
      const result = await callMultiAgentReflect(entryContent);

      const updatedSummary: SummaryResult = {
        ...(summaryData || {}),
        suggestedTitle: result.suggestedTitle,
        reflection: result.reflection,
        sentiment: result.sentiment,
        themes: result.themes,
        coachPrompt: result.coachPrompt,
        tags: result.tags,
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
        tags: result.tags || [],
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
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Left Sidebar: Isolated User Reflections History */}
        <HistorySidebar
          entries={interactions}
          activeEntryId={activeId}
          onSelectEntry={handleSelectEntry}
          onDeleteEntry={handleDeleteEntry}
          isLoading={listLoading}
          onTelegramStatusChange={(connected) => setIsTelegramConnected(connected)}
        />

        {/* Main Stage: Active Journal Atelier */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col">
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
    </div>
  );
}
