export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  storyId: string;
  title: string; // "만약에: {동화명}" 형식
  createdAt: number;
  updatedAt: number;
  turns: ChatTurn[];
  isActive?: boolean;
}

export interface SessionState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
}