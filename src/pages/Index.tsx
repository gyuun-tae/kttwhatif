import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, BookOpen, Menu, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatInterface } from "@/components/ChatInterface";
import { Sidebar } from "@/components/Sidebar";

// Supabase 연동 버전 v4.0
const APP_VERSION = "4.0";

const Index = () => {
  const [isStarting, setIsStarting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { sessions, currentSession, currentSessionId, createSession, isLoading } = useSession();
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  console.log(`앱 시작됨 - 버전 ${APP_VERSION}`);

  // 로그인되지 않은 사용자는 인증 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "로그아웃 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });
      navigate('/auth');
    }
  };

  const handleStartSession = async () => {
    console.log("세션 시작 요청 - v4.0");
    setIsStarting(true);
    
    try {
      // Supabase Edge Function 호출
      console.log("Edge Function 호출 중...");
      const { data, error } = await supabase.functions.invoke('start-session');
      
      if (error) {
        console.error("Edge Function 에러:", error);
        throw error;
      }

      console.log("Edge Function 응답:", data);

      // 빈 세션 생성
      const { sessionId } = data;
      
      console.log("빈 세션 생성 시작:", { sessionId });
      const createdSessionId = await createSession(
        null, // story는 null로 시작
        ''    // 첫 번째 질문도 빈 문자열
      );
      
      // 세션이 실제로 생성되었는지 확인하고 약간 기다림
      console.log("세션 생성 완료, 상태 동기화 대기:", createdSessionId);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("세션 생성 및 동기화 완료:", createdSessionId);

      toast({
        title: "새로운 이야기 시작!",
        description: "재미있는 '만약에' 여행을 떠나볼까요?",
      });
      
    } catch (error) {
      console.error('세션 시작 실패:', error);
      toast({
        title: "앗, 문제가 생겼어요",
        description: "다시 한번 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleNewChat = async () => {
    console.log("새 대화 요청 - v4.0");
    
    console.log("현재 세션 상태:", { 
      currentSession: !!currentSession, 
      turns: currentSession?.turns.length || 0,
      sessionId: currentSessionId 
    });
    
    // 현재 대화가 있다면 저장되었음을 알림
    if (currentSession && currentSession.turns.length > 1) {
      console.log("기존 대화가 있어 알림 표시");
      toast({
        title: "이전 대화를 저장했어요",
        description: "새로운 이야기를 시작할게요!",
      });
    }
    
    console.log("사이드바 닫기 실행");
    setIsSidebarOpen(false);
    
    console.log("새 세션 생성 시도");
    try {
      await handleStartSession();
      console.log("새 대화 생성 완료 - v4.0");
    } catch (error) {
      console.error("새 대화 생성 실패:", error);
      toast({
        title: "새 대화 시작 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const toggleSidebar = () => {
    console.log("사이드바 토글:", !isSidebarOpen);
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    console.log("사이드바 닫기");
    setIsSidebarOpen(false);
  };

  // 인증 로딩 중이거나 로그인되지 않은 경우
  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-story">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-gradient-story flex">
      {/* 사이드바 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onNewChat={handleNewChat}
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          // 로딩 상태
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">대화 내역을 불러오고 있어요...</p>
            </div>
          </div>
        ) : currentSession ? (
          // 대화 화면
          <>
            {/* 헤더 - 항상 표시 */}
            <header className="bg-card/80 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="flex items-center gap-2"
              >
                <Menu className="w-5 h-5" />
                <span className="hidden sm:inline">메뉴</span>
              </Button>
              <h1 className="text-lg font-semibold text-foreground truncate flex-1 text-center mx-4">
                {currentSession.title}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">로그아웃</span>
              </Button>
            </header>

            {/* 대화 인터페이스 */}
            <div className="flex-1 flex flex-col">
              <ChatInterface />
            </div>
          </>
        ) : (
          // 랜딩 페이지
          <div className="flex-1 flex items-center justify-center p-6 relative">
            {/* 헤더 버튼들 */}
            <div className="absolute top-4 left-4 right-4 z-30 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
              >
                <Menu className="w-5 h-5" />
                <span className="hidden sm:inline">메뉴</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
              >
                <User className="w-4 h-4" />
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">로그아웃</span>
              </Button>
            </div>

            <div className="max-w-xl mx-auto text-center">
              {/* 로고/아이콘 */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                  만약에...? v{APP_VERSION}
                </h1>
                
                <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed">
                  전래동화 속 상상의 세계로 들어가
                  <br />
                  "만약에" 질문으로 함께 생각해봐요!
                </p>
              </div>

              {/* 시작 버튼 */}
              <Button
                onClick={handleStartSession}
                disabled={isStarting}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                aria-describedby="start-button-desc"
              >
                {isStarting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" aria-hidden="true"></div>
                    이야기를 준비하고 있어요...
                    <span className="sr-only">로딩 중입니다</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-3" aria-hidden="true" />
                    상상 여행 시작하기
                  </>
                )}
              </Button>

              <div id="start-button-desc" className="sr-only">
                버튼을 누르면 전래동화 기반의 상상 여행이 시작됩니다
              </div>

              {/* 설명 */}
              <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                  흥부와 놀부, 콩쥐팥쥐, 선녀와 나무꾼 등<br />
                  친숙한 전래동화로 상상력을 키워보세요!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;