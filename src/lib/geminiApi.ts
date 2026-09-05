import { getIdToken } from "../firebase";
import { ChatMessage, ReflectionMode, SummaryResult, SentimentResult, ProjectIdea } from "../types";

export interface ChatApiResponse {
  text: string;
  modelUsed: string;
  timestamp: number;
}

export interface ReflectApiResponse {
  suggestedTitle?: string;
  reflection?: string;
  sentiment?: SentimentResult;
  themes?: string[];
  coachPrompt?: string;
  tags?: string[];
  summary?: string;
  insights?: string[];
  mood?: string;
  modelUsed?: string;
  timestamp?: number;
}

export async function callGeminiChat(
  messages: ChatMessage[],
  currentEntry: string,
  mode: ReflectionMode
): Promise<ChatApiResponse> {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Authentication session expired. Please sign in again.");
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      currentEntry,
      mode,
    }),
  });

  if (!response.ok) {
    let errorMsg = "Failed to communicate with Gemini API.";
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMsg = errorJson.error;
    } catch {
      errorMsg = `Server returned error status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}

export async function callGeminiSummarize(
  content: string,
  title?: string
): Promise<SummaryResult> {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Authentication session expired. Please sign in again.");
  }

  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
      title,
    }),
  });

  if (!response.ok) {
    let errorMsg = "Failed to summarize reflection with Gemini.";
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMsg = errorJson.error;
    } catch {
      errorMsg = `Server returned error status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}

export async function callMultiAgentReflect(
  content: string
): Promise<ReflectApiResponse> {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Authentication session expired. Please sign in again.");
  }

  const response = await fetch("/api/reflect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
    }),
  });

  if (!response.ok) {
    let errorMsg = "Failed to process multi-agent reflection.";
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMsg = errorJson.error;
    } catch {
      errorMsg = `Server returned error status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}

export interface IdeateResponse extends ProjectIdea {
  id: string;
}

export async function ideate(seed: string): Promise<IdeateResponse> {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Authentication session expired. Please sign in again.");
  }
  const response = await fetch("/api/ideate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ seed }),
  });
  if (!response.ok) {
    let errorMsg = "Failed to generate project idea.";
    try {
      const j = await response.json();
      if (j.error) errorMsg = j.error;
    } catch {
      errorMsg = `Server returned error status ${response.status}`;
    }
    throw new Error(errorMsg);
  }
  return await response.json();
}

export async function refineIdea(
  existing: ProjectIdea,
  instruction: string
): Promise<ProjectIdea> {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Authentication session expired. Please sign in again.");
  }
  const response = await fetch("/api/ideate/refine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      existingIdea: existing,
      instruction,
    }),
  });
  if (!response.ok) {
    let errorMsg = "Failed to refine project idea.";
    try {
      const j = await response.json();
      if (j.error) errorMsg = j.error;
    } catch {
      errorMsg = `Server returned error status ${response.status}`;
    }
    throw new Error(errorMsg);
  }
  return await response.json();
}

export interface TelegramSettingsResponse {
  telegramChatId: string | null;
  connected: boolean;
  success?: boolean;
}

export async function getTelegramSettings(): Promise<TelegramSettingsResponse> {
  const token = await getIdToken();
  if (!token) {
    return { telegramChatId: null, connected: false };
  }

  const response = await fetch("/api/settings/telegram", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load Telegram settings (status ${response.status})`);
  }

  return await response.json();
}

export async function disconnectTelegramSettings(): Promise<TelegramSettingsResponse> {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Authentication session expired. Please sign in again.");
  }

  const response = await fetch("/api/settings/telegram", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMsg = "Failed to disconnect Telegram.";
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMsg = errorJson.error;
    } catch {
      errorMsg = `Server returned status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}

export async function saveTelegramSettings(chatId: string | null): Promise<TelegramSettingsResponse> {
  if (chatId === null || chatId === "") {
    return await disconnectTelegramSettings();
  }

  const token = await getIdToken();
  if (!token) {
    throw new Error("Authentication session expired. Please sign in again.");
  }

  const response = await fetch("/api/settings/telegram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      telegramChatId: chatId,
    }),
  });

  if (!response.ok) {
    let errorMsg = "Failed to save Telegram settings.";
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMsg = errorJson.error;
    } catch {
      errorMsg = `Server returned status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}

/**
 * Send an outbound Telegram notification when a project idea is saved.
 * Fire-and-forget: swallows errors and never throws so it won't block UI state.
 */
export async function notifyProjectSaved(payload: {
  title?: string;
  oneLiner?: string;
  firstStep?: string;
}): Promise<void> {
  try {
    const token = await getIdToken();
    if (!token) return;

    await fetch("/api/notify/project-saved", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[Telegram] Failed to dispatch project-saved notification:", err);
  }
}

/**
 * Send an outbound Telegram notification when a new reflection entry is saved.
 * Fire-and-forget: swallows errors and never throws so it won't block UI state.
 */
export async function notifyEntrySaved(payload: { title?: string }): Promise<void> {
  try {
    const token = await getIdToken();
    if (!token) return;
    await fetch("/api/notify/entry-saved", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[Telegram] Failed to dispatch entry-saved notification:", err);
  }
}

/**
 * Send an outbound Telegram notification with this week's digest.
 * Fire-and-forget: swallows errors and never throws so it won't block UI state.
 */
export async function sendWeeklyDigest(): Promise<void> {
  try {
    const token = await getIdToken();
    if (!token) return;

    await fetch("/api/notify/weekly-digest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.warn("[Telegram] Failed to dispatch weekly digest notification:", err);
  }
}

