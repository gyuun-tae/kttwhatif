import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSession, ChatTurn } from '@/types/session';
import { supabase } from '@/integrations/supabase/client';

// Supabase 연동 버전 v4.0
const SESSION_MANAGER_VERSION = "4.0";

export const useSessionManager = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log(`세션 매니저 초기화 - Supabase 연동 버전 ${SESSION_MANAGER_VERSION}`);

  // localStorage에서 로드 (fallback)
  const loadFromLocalStorage = useCallback(() => {
    try {
      const storedSessions = localStorage.getItem('whatif-sessions-v3');
      const storedCurrentId = localStorage.getItem('whatif-current-session-v3');
      
      if (storedSessions) {
        const parsed = JSON.parse(storedSessions);
        setSessions(Array.isArray(parsed) ? parsed : []);
        console.log('localStorage 로드 성공 - v4.0:', parsed.length, '개 세션');
      }
      
      setCurrentSessionId(storedCurrentId);
    } catch (error) {
      console.error('localStorage 로드 실패 - v4.0:', error);
      setSessions([]);
      setCurrentSessionId(null);
    }
  }, []);

  // Supabase에서 세션 목록 로드
  const loadSessionsFromSupabase = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Supabase에서 세션 데이터 로드 시작 - v4.0");

      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("사용자가 로그인되지 않음 - localStorage 사용");
        // 로그인되지 않은 경우 localStorage 사용
        return loadFromLocalStorage();
      }

      // 세션 목록 조회 (턴들과 함께)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          story_id,
          title,
          created_at,
          updated_at,
          is_active,
          chat_turns (
            id,
            role,
            content,
            created_at
          )
        `)
        .order('updated_at', { ascending: false });

      if (sessionsError) {
        console.error('세션 로드 실패:', sessionsError);
        return loadFromLocalStorage();
      }

      // 데이터 변환
      const transformedSessions: ChatSession[] = (sessionsData || []).map(session => ({
        id: session.id,
        storyId: session.story_id,
        title: session.title,
        createdAt: new Date(session.created_at).getTime(),
        updatedAt: new Date(session.updated_at).getTime(),
        isActive: session.is_active || false,
        turns: (session.chat_turns || [])
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(turn => ({
            id: turn.id,
            role: turn.role as 'user' | 'assistant' | 'system',
            content: turn.content,
            timestamp: new Date(turn.created_at).getTime()
          }))
      }));

      setSessions(transformedSessions);
      
      // 활성 세션 찾기
      const activeSession = transformedSessions.find(s => s.isActive);
      setCurrentSessionId(activeSession?.id || null);
      
      console.log('Supabase 세션 로드 성공 - v4.0:', transformedSessions.length, '개 세션');
    } catch (error) {
      console.error('Supabase 세션 로드 실패 - v4.0:', error);
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  }, [loadFromLocalStorage]);

  // 초기 로드
  useEffect(() => {
    loadSessionsFromSupabase();
  }, [loadSessionsFromSupabase]);

  // 현재 세션 조회
  const currentSession = useMemo(() => {
    if (!currentSessionId) return null;
    const session = sessions.find(session => session.id === currentSessionId) || null;
    console.log('현재 세션 조회 - v4.0:', session?.id, session?.title);
    return session;
  }, [sessions, currentSessionId]);

  // 새 세션 생성
  const createSession = useCallback(async (story: any | null, firstQuestion: string) => {
    try {
      console.log('새 세션 생성 시작 - v4.0:', story?.title || '빈 세션');

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 로그인되지 않은 경우 localStorage 사용
        const sessionId = crypto.randomUUID();
        const newSession: ChatSession = {
          id: sessionId,
          storyId: story?.id || null,
          title: story?.title || '새로운 대화',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          turns: firstQuestion && firstQuestion.trim() ? [{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: firstQuestion,
            timestamp: Date.now()
          }] : [],
          isActive: true
        };

        // 상태 업데이트를 Promise로 래핑하여 완료를 보장
        await new Promise<void>((resolve) => {
          setSessions(prevSessions => {
            const updatedSessions = [newSession, ...prevSessions.map(s => ({ ...s, isActive: false }))];
            localStorage.setItem('whatif-sessions-v3', JSON.stringify(updatedSessions));
            // 다음 tick에서 resolve
            setTimeout(resolve, 0);
            return updatedSessions;
          });
        });
        
        setCurrentSessionId(sessionId);
        localStorage.setItem('whatif-current-session-v3', sessionId);
        
        console.log('localStorage 세션 생성 완료 - v4.0:', sessionId);
        return sessionId;
      }

      // 기존 세션들을 비활성화
      await supabase
        .from('chat_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // 새 세션 생성
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          story_id: story?.id || null,
          title: story?.title || '새로운 대화',
          is_active: true
        })
        .select()
        .single();

      if (sessionError) {
        console.error('세션 생성 실패:', sessionError);
        throw sessionError;
      }

      // 첫 번째 턴 생성 (firstQuestion이 있을 때만)
      if (firstQuestion && firstQuestion.trim()) {
        const { error: turnError } = await supabase
          .from('chat_turns')
          .insert({
            session_id: sessionData.id,
            role: 'assistant',
            content: firstQuestion
          });

        if (turnError) {
          console.error('첫 번째 턴 생성 실패:', turnError);
          throw turnError;
        }
      }

      // 로컬 상태 즉시 업데이트
      const newSession: ChatSession = {
        id: sessionData.id,
        storyId: story?.id || null,
        title: story?.title || '새로운 대화',
        createdAt: new Date(sessionData.created_at).getTime(),
        updatedAt: new Date(sessionData.updated_at).getTime(),
        turns: firstQuestion && firstQuestion.trim() ? [{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: firstQuestion,
          timestamp: Date.now()
        }] : [],
        isActive: true
      };

      setSessions(prevSessions => [newSession, ...prevSessions.map(s => ({ ...s, isActive: false }))]);
      setCurrentSessionId(sessionData.id);
      
      console.log('Supabase 세션 생성 완료 - v4.0:', sessionData.id);
      return sessionData.id;
    } catch (error) {
      console.error('세션 생성 실패 - v4.0:', error);
      throw error;
    }
  }, []);

  // 세션 전환
  const switchToSession = useCallback(async (sessionId: string) => {
    try {
      console.log('세션 전환 - v4.0:', sessionId);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 로그인되지 않은 경우 localStorage 사용
        setSessions(prevSessions => {
          const updatedSessions = prevSessions.map(session => ({
            ...session,
            isActive: session.id === sessionId
          }));
          localStorage.setItem('whatif-sessions-v3', JSON.stringify(updatedSessions));
          return updatedSessions;
        });
        setCurrentSessionId(sessionId);
        localStorage.setItem('whatif-current-session-v3', sessionId);
        return;
      }

      // 로컬 상태 즉시 업데이트
      setSessions(prevSessions => 
        prevSessions.map(session => ({
          ...session,
          isActive: session.id === sessionId
        }))
      );
      setCurrentSessionId(sessionId);

      // 백그라운드에서 Supabase 업데이트
      Promise.all([
        // 모든 세션 비활성화
        supabase
          .from('chat_sessions')
          .update({ is_active: false })
          .eq('user_id', user.id),
        
        // 선택된 세션 활성화  
        supabase
          .from('chat_sessions')
          .update({ is_active: true })
          .eq('id', sessionId)
          .eq('user_id', user.id)
      ]).then(() => {
        console.log('세션 전환 완료 - v4.0:', sessionId);
      }).catch(error => {
        console.error('세션 전환 DB 업데이트 실패:', error);
      });
      
    } catch (error) {
      console.error('세션 전환 실패 - v4.0:', error);
    }
  }, []);

  // 턴 추가
  const addTurn = useCallback(async (sessionId: string, turn: Omit<ChatTurn, 'id' | 'timestamp'>) => {
    try {
      console.log('턴 추가 시작 - v4.0:', sessionId, turn.role);

      const newTurn: ChatTurn = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...turn
      };

      // 함수형 업데이트로 로컬 상태 즉시 업데이트 (UI 반응성)
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              turns: [...session.turns, newTurn],
              updatedAt: Date.now(),
              isActive: true
            };
          }
          return { ...session, isActive: false };
        });
        
        // localStorage 즉시 저장
        localStorage.setItem('whatif-sessions-v3', JSON.stringify(updatedSessions));
        return updatedSessions;
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 백그라운드에서 Supabase에 저장 (UI 블로킹 없음)
        console.log('Supabase 턴 저장 시도 - 데이터:', {
          session_id: sessionId,
          role: turn.role,
          content: turn.content,
          content_type: typeof turn.content,
          content_length: turn.content?.length
        });
        
        (async () => {
          try {
            const { data: insertData, error } = await supabase
              .from('chat_turns')
              .insert({
                session_id: sessionId,
                role: turn.role,
                content: turn.content
              });

            if (!error) {
              console.log('Supabase 턴 저장 성공 - 데이터:', insertData);
              // 세션 업데이트 시간 갱신
              await supabase
                .from('chat_sessions')
                .update({ 
                  updated_at: new Date().toISOString(),
                  is_active: true 
                })
                .eq('id', sessionId)
                .eq('user_id', user.id);

              // 다른 세션들 비활성화
              await supabase
                .from('chat_sessions')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .neq('id', sessionId);

              console.log('Supabase 턴 저장 완료 - v4.0');
            } else {
              console.error('Supabase 턴 저장 실패 - 상세 에러:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                sessionId,
                turnRole: turn.role,
                turnContent: typeof turn.content,
                turnContentSample: turn.content?.substring(0, 100)
              });
            }
          } catch (catchError) {
            console.error('Supabase 턴 저장 catch 에러:', catchError);
          }
        })();
      }
      
      console.log('턴 추가 완료 - v4.0');
    } catch (error) {
      console.error('턴 추가 실패 - v4.0:', error);
    }
  }, []);

  // 세션 삭제
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      console.log('세션 삭제 - v4.0:', sessionId);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 로그인되지 않은 경우 localStorage 사용
        setSessions(prevSessions => {
          const updatedSessions = prevSessions.filter(session => session.id !== sessionId);
          localStorage.setItem('whatif-sessions-v3', JSON.stringify(updatedSessions));
          return updatedSessions;
        });
        
        setCurrentSessionId(prevId => {
          if (prevId === sessionId) {
            // 삭제된 세션이 현재 활성 세션이면 다른 세션으로 전환
            return null; // 다른 세션 선택 로직은 UI에서 처리
          }
          return prevId;
        });
        
        console.log('localStorage 세션 삭제 완료 - v4.0');
        return;
      }

      // 로컬 상태 즉시 업데이트
      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
      setCurrentSessionId(prevId => prevId === sessionId ? null : prevId);

      // 백그라운드에서 Supabase 삭제
      supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase 세션 삭제 실패:', error);
          } else {
            console.log('Supabase 세션 삭제 완료 - v4.0');
          }
        });
      
    } catch (error) {
      console.error('세션 삭제 실패 - v4.0:', error);
    }
  }, []);

  return {
    sessions,
    currentSessionId,
    currentSession,
    isLoading,
    createSession,
    switchToSession,
    addTurn,
    deleteSession
  };
};