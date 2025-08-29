import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // 이미 로그인된 사용자는 메인 페이지로 리다이렉트
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('로그인 실패:', error);
      toast({
        title: "로그인 실패",
        description: error.message === 'Invalid login credentials' 
          ? "이메일 또는 비밀번호를 확인해주세요." 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "로그인 성공!",
        description: "환영합니다! 상상 여행을 시작해보세요.",
      });
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signUp(email, password);
    
    if (error) {
      console.error('회원가입 실패:', error);
      toast({
        title: "회원가입 실패",
        description: error.message === 'User already registered' 
          ? "이미 가입된 이메일입니다. 로그인을 시도해보세요." 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "회원가입 성공!",
        description: "이메일 확인 후 로그인해주세요. (개발 모드에서는 바로 로그인됩니다)",
      });
      // 회원가입 성공 시 로그인 탭으로 전환
      setEmail('');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-story flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">만약에...?</h1>
          <p className="text-muted-foreground mt-2">상상 여행을 시작하려면 로그인하세요</p>
        </div>

        {/* 인증 폼 */}
        <Card className="shadow-magic">
          <CardHeader className="text-center">
            <CardTitle>계정</CardTitle>
            <CardDescription>
              로그인하거나 새 계정을 만들어보세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">이메일</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">비밀번호</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    로그인
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">이메일</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">비밀번호</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      최소 6자 이상 입력해주세요
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    회원가입
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 안내 문구 */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            전래동화와 함께하는 상상 여행이 기다려요!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;