export type ReflectionMode = 'reflect' | 'brainstorm' | 'summarize';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface SentimentResult {
  tag: string;
  confidence: number;
}

export interface SummaryResult {
  suggestedTitle?: string;
  summary?: string;
  insights?: string[];
  tags?: string[];
  mood?: string;
  reflection?: string;
  sentiment?: SentimentResult;
  themes?: string[];
  coachPrompt?: string;
  modelUsed?: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  content: string;
  mode: ReflectionMode;
  messages: ChatMessage[];
  summary?: string;
  insights?: string[];
  tags?: string[];
  mood?: string;
  reflection?: string;
  sentiment?: SentimentResult;
  themes?: string[];
  coachPrompt?: string;
  modelUsed?: string;
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SecuritySettings {
  salt: string;
  hash: string;
  iterations: number;
  updatedAt: number;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
