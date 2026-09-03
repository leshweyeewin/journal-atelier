import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { JournalInteraction } from "../types";

/**
 * Strict Undefined-Stripping utility to prevent Firestore SDK crash.
 * Recursively removes any undefined fields or converts them to null/omitted.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Save or update an interaction/journal entry in the user's isolated subcollection:
 * /users/{userId}/interactions/{interactionId}
 */
export async function saveInteraction(
  userId: string,
  entry: Partial<JournalInteraction> & { id: string }
): Promise<JournalInteraction> {
  if (!userId) {
    throw new Error("Cannot save entry: User ID is required.");
  }
  if (!entry.id) {
    throw new Error("Cannot save entry: Entry ID is required.");
  }

  const now = Date.now();
  const interactionData: JournalInteraction = {
    id: entry.id,
    userId,
    title: (entry.title && entry.title.trim()) || "Untitled Reflection",
    content: entry.content || "",
    mode: entry.mode || "reflect",
    messages: entry.messages || [],
    summary: entry.summary || "",
    insights: entry.insights || [],
    tags: entry.tags || [],
    mood: entry.mood || "",
    modelUsed: entry.modelUsed || "gemini-3.6-flash",
    reflection: entry.reflection !== undefined ? entry.reflection : undefined,
    sentiment: entry.sentiment !== undefined ? entry.sentiment : undefined,
    themes: Array.isArray(entry.themes) ? entry.themes : undefined,
    coachPrompt: entry.coachPrompt !== undefined ? entry.coachPrompt : undefined,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  const cleanPayload = sanitizeForFirestore(interactionData);
  const docRef = doc(db, "users", userId, "interactions", entry.id);

  await setDoc(docRef, cleanPayload, { merge: true });
  return interactionData;
}

/**
 * Real-time listener for user's reflection entries, strictly scoped to userId
 */
export function subscribeUserInteractions(
  userId: string,
  onUpdate: (entries: JournalInteraction[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const interactionsRef = collection(db, "users", userId, "interactions");
  const q = query(interactionsRef, orderBy("updatedAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as JournalInteraction;
        entries.push({
          ...data,
          id: docSnap.id,
        });
      });
      onUpdate(entries);
    },
    (error) => {
      console.error("Error listening to user interactions:", error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * One-time fetch for user's reflection entries
 */
export async function fetchUserInteractions(userId: string): Promise<JournalInteraction[]> {
  if (!userId) return [];
  const interactionsRef = collection(db, "users", userId, "interactions");
  const q = query(interactionsRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  const entries: JournalInteraction[] = [];
  snapshot.forEach((docSnap) => {
    entries.push({
      ...(docSnap.data() as JournalInteraction),
      id: docSnap.id,
    });
  });
  return entries;
}

/**
 * Delete an interaction
 */
export async function deleteInteraction(userId: string, interactionId: string): Promise<void> {
  if (!userId || !interactionId) return;
  const docRef = doc(db, "users", userId, "interactions", interactionId);
  await deleteDoc(docRef);
}
