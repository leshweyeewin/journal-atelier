import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { JournalInteraction, SecuritySettings } from "../types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
    locked: entry.locked === true ? true : undefined,
    projectIdea: entry.projectIdea !== undefined ? entry.projectIdea : undefined,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  const cleanPayload = sanitizeForFirestore(interactionData);
  const path = `users/${userId}/interactions/${entry.id}`;
  const docRef = doc(db, "users", userId, "interactions", entry.id);

  try {
    await setDoc(docRef, cleanPayload, { merge: true });
    return interactionData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update specific fields in an existing interaction document without overwriting or duplicating.
 * Strips undefined and merges into the existing Firestore document at users/{userId}/interactions/{id}.
 */
export async function updateInteraction(
  userId: string,
  id: string,
  patch: Partial<JournalInteraction>
): Promise<void> {
  if (!userId || !id) return;
  const cleanPayload = sanitizeForFirestore({
    ...patch,
    updatedAt: Date.now(),
  });
  const path = `users/${userId}/interactions/${id}`;
  const docRef = doc(db, "users", userId, "interactions", id);
  try {
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
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
  const path = `users/${userId}/interactions`;

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as JournalInteraction;
        entries.push({
          ...data,
          id: docSnap.id,
          messages: Array.isArray(data.messages) ? data.messages : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
          themes: Array.isArray(data.themes) ? data.themes : [],
          insights: Array.isArray(data.insights) ? data.insights : [],
        });
      });
      onUpdate(entries);
    },
    (error) => {
      console.error("Error listening to user interactions:", error);
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Logged via handleFirestoreError
      }
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
  const path = `users/${userId}/interactions`;
  try {
    const snapshot = await getDocs(q);
    const entries: JournalInteraction[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as JournalInteraction;
      entries.push({
        ...data,
        id: docSnap.id,
        messages: Array.isArray(data.messages) ? data.messages : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        themes: Array.isArray(data.themes) ? data.themes : [],
        insights: Array.isArray(data.insights) ? data.insights : [],
      });
    });
    return entries;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Delete an interaction
 */
export async function deleteInteraction(userId: string, interactionId: string): Promise<void> {
  if (!userId || !interactionId) return;
  const path = `users/${userId}/interactions/${interactionId}`;
  const docRef = doc(db, "users", userId, "interactions", interactionId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getSecuritySettings(userId: string): Promise<SecuritySettings | null> {
  if (!userId) return null;
  const path = `users/${userId}/settings/security`;
  const ref = doc(db, "users", userId, "settings", "security");
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as SecuritySettings) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function setSecuritySettings(userId: string, s: SecuritySettings): Promise<void> {
  if (!userId) throw new Error("User ID required");
  const path = `users/${userId}/settings/security`;
  const ref = doc(db, "users", userId, "settings", "security");
  try {
    await setDoc(ref, sanitizeForFirestore(s), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function setInteractionLocked(userId: string, id: string, locked: boolean): Promise<void> {
  if (!userId || !id) return;
  const path = `users/${userId}/interactions/${id}`;
  const ref = doc(db, "users", userId, "interactions", id);
  try {
    await setDoc(ref, { locked }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

