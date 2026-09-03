import React, { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { AppUser, ChatMessage, JournalInteraction, ReflectionMode, SummaryResult } from "./types";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { HistorySidebar } from "./components/HistorySidebar";
import { JournalEditor } from "./components/JournalEditor";
import { ChatStream } from "./components/ChatStream";
import { SummaryCard } from "./components/SummaryCard";
import { ErrorBanner } from "./components/ErrorBanner";
import {
  saveInteraction,
  subscribeUserInteractions,
  deleteInteraction,
} from "./lib/firestoreService";
import { callGeminiChat, callGeminiSummarize } from "./lib/geminiApi";

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
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // UI operation states
  const [isSaving, setIsSaving] = useState(false);
  const [isAiReflecting, setIsAiReflecting] = useState(false);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedSavePayload, setFailedSavePayload] = useState<Partial<JournalInteraction> | null>(null);

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
    if (entry.summary || entry.insights?.length) {
      setSummaryData({
        suggestedTitle: entry.title,
        summary: entry.summary,
        insights: entry.insights,
        tags: entry.tags,
        mood: entry.mood,
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
    if (!currentUser) return;
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
      mood: summaryData?.mood || "",
      modelUsed: summaryData?.modelUsed || "gemini-3.6-flash",
      ...override,
    };

    try {
      await saveInteraction(currentUser.uid, payloadToSave);
      setLastSavedAt(Date.now());
      setFailedSavePayload(null);
    } catch (err: any) {
      console.error("Firestore save error:", err);
      setErrorMessage("Could not save to Firestore. Your unsaved text has been kept intact.");
      setFailedSavePayload(payloadToSave);
    } finally {
      setIsSaving(false);
    }
  };

  // Explicit Save button click
  const handleManualSave = () => {
    persistToFirestore();
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

  // AI Summarize & Synthesize action
  const handleSummarizeWithAI = async () => {
    if (!content.trim() || !currentUser) return;
    setIsAiSummarizing(true);
    setErrorMessage(null);

    try {
      const summaryResult = await callGeminiSummarize(content, title);
      setSummaryData(summaryResult);

      if (summaryResult.suggestedTitle && !title.trim()) {
        setTitle(summaryResult.suggestedTitle);
      }

      // Persist summary data to Firestore
      await persistToFirestore({
        title: title.trim() || summaryResult.suggestedTitle || "Untitled Reflection",
        summary: summaryResult.summary || "",
        insights: summaryResult.insights || [],
        tags: summaryResult.tags || [],
        mood: summaryResult.mood || "",
        modelUsed: summaryResult.modelUsed || "gemini-3.6-flash",
      });
    } catch (err: any) {
      console.error("Summarization error:", err);
      setErrorMessage(err.message || "Failed to generate AI summary with Gemini.");
    } finally {
      setIsAiSummarizing(false);
    }
  };

  // Loading Splash
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-stone-600">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Connecting to Reflection Studio...</p>
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
        />

        {/* Main Stage: Active Reflection Studio */}
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

          {/* AI Summary Card if present */}
          {summaryData && (
            <SummaryCard
              summary={summaryData}
              onApplyTitle={(suggested) => setTitle(suggested)}
              onClose={() => setSummaryData(null)}
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
    </div>
  );
}
