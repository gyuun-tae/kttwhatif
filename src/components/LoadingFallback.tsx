import { Sparkles } from "lucide-react";

interface LoadingFallbackProps {
  message?: string;
}

export const LoadingFallback = ({ message = "로딩 중..." }: LoadingFallbackProps) => {
  return (
    <div className="min-h-screen bg-gradient-story flex items-center justify-center p-6" role="status" aria-live="polite">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 animate-pulse">
          <Sparkles className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">{message}</h2>
        <p className="text-sm text-muted-foreground">잠시만 기다려 주세요...</p>
        <div className="flex justify-center items-center gap-1 mt-4">
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};