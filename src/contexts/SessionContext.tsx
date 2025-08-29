import React, { createContext, useContext } from 'react';
import { useSessionManager } from '@/hooks/useSessionManager';
import { ChatSession, ChatTurn } from '@/types/session';

interface SessionContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  isLoading: boolean;
  createSession: (story: any, firstQuestion: string) => Promise<string>;
  switchToSession: (sessionId: string) => Promise<void>;
  addTurn: (sessionId: string, turn: Omit<ChatTurn, 'id' | 'timestamp'>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sessionManager = useSessionManager();

  return (
    <SessionContext.Provider value={sessionManager}>
      {children}
    </SessionContext.Provider>
  );
};