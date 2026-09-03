import { getIdToken } from "../firebase";
import { ChatMessage, ReflectionMode, SummaryResult } from "../types";

export interface ChatApiResponse {
  text: string;
  modelUsed: string;
  timestamp: number;
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
