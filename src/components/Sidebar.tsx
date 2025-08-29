import { X, Plus, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";

// Supabase 연동 버전 v4.0 
const SIDEBAR_VERSION = "4.0";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

export const Sidebar = ({ isOpen, onClose, onNewChat }: SidebarProps) => {
  const { sessions, switchToSession, deleteSession, currentSessionId } = useSession();
  
  console.log(`사이드바 렌더링 - 버전 ${SIDEBAR_VERSION}, 열림상태: ${isOpen}`);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("오버레이 클릭 - 사이드바 닫기");
    onClose();
  };

  const handleSidebarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("사이드바 내부 클릭 - 닫기 방지");
  };

  const handleNewChatClick = () => {
    console.log("새 대화 버튼 클릭 - v3.0");
    onNewChat();
  };

  const handleCloseClick = () => {
    console.log("닫기 버튼 클릭 - v3.0");
    onClose();
  };

  return (
    <>
      {/* 오버레이 - 항상 표시되지만 조건부 이벤트 */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={handleOverlayClick}
      />

      {/* 사이드바 */}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen max-h-screen w-96 max-w-[90vw] bg-card border-r border-border shadow-lg z-50 transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={handleSidebarClick}
      >
        <div className="flex flex-col h-screen max-h-screen">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <h2 className="text-lg font-semibold text-foreground">
              대화 목록 v{SIDEBAR_VERSION}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChatClick}
                className="text-primary hover:text-primary/80 hover:bg-primary/10 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">새 대화</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseClick}
                className="hover:bg-accent/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

           {/* 세션 목록 */}
           <ScrollArea className="flex-1">
             <div className="p-4 space-y-2">
               {sessions.length === 0 ? (
                 <div className="text-center py-8">
                   <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                   <p className="text-sm text-muted-foreground">
                     아직 대화가 없어요
                   </p>
                   <p className="text-xs text-muted-foreground mt-1">
                     "상상 여행 시작하기"를 눌러보세요!
                   </p>
                 </div>
                 ) : (
                   <div className="space-y-2 px-1">
                     {sessions.map((session) => (
                       <div
                         key={session.id}
                         className={cn(
                           "group relative p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 border max-w-[calc(100%-4rem)] mx-auto",
                           currentSessionId === session.id
                             ? "bg-primary/10 border-primary/20 shadow-sm"
                             : "border-transparent hover:border-border"
                         )}
                         onClick={async () => {
                           console.log("세션 클릭:", session.id, session.title);
                           
                           // 이미 현재 세션인 경우 사이드바만 닫기
                           if (currentSessionId === session.id) {
                             console.log("현재 세션과 동일 - 사이드바만 닫기");
                             onClose();
                             return;
                           }
                           
                           // 다른 세션으로 전환
                           await switchToSession(session.id);
                           console.log("세션 전환 완료, 사이드바 닫기");
                           onClose();
                         }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0 pr-1">
                            <h3 className="text-sm font-medium text-foreground truncate">
                              {session.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(session.updatedAt)} • {session.turns.length}개 대화
                            </p>
                            {session.turns.length > 1 && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                "{session.turns[session.turns.length - 1].content.slice(0, 30)}..."
                              </p>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("세션 삭제:", session.id);
                              deleteSession(session.id);
                            }}
                            className="opacity-60 group-hover:opacity-100 transition-opacity h-8 w-8 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            title="대화 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
           </ScrollArea>

          {/* 푸터 정보 */}
          <div className="p-4 border-t border-border bg-card">
            <p className="text-xs text-muted-foreground text-center">
              전래동화와 함께하는 상상 여행 v{SIDEBAR_VERSION}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};