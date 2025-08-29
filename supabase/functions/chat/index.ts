import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 금칙어 필터
const bannedWords = ['죽', '때리', '죽이', '폭력', '나쁜말', '바보', '멍청'];

function containsBannedWords(text: string): boolean {
  return bannedWords.some(word => text.includes(word));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, storyContext, conversationHistory } = await req.json();
    
    const naverApiKey = Deno.env.get('NAVER_CLOUD_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('=== API 키 체크 v2 ===');
    console.log('NAVER_CLOUD_API_KEY 존재:', !!naverApiKey);
    console.log('키 길이:', naverApiKey ? naverApiKey.length : 0);
    console.log('==================');
    
    // API 키 체크
    if (!naverApiKey) {
      throw new Error('NAVER_CLOUD_API_KEY is not configured');
    }

    // 금칙어 체크
    if (containsBannedWords(message)) {
      return new Response(JSON.stringify({
        reply: "더 좋은 말로 다시 생각해 볼까요? 어떤 다른 아이디어가 있나요?"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase 연결이 있을 때만 스토리 정보 조회 시도
    let storyInfo = null;
    if (supabaseUrl && supabaseServiceKey && storyContext) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // storyContext가 UUID인 경우 데이터베이스에서 조회
        if (typeof storyContext === 'string' && storyContext.length === 36) {
          const { data: story } = await supabase
            .from('stories')
            .select('*')
            .eq('id', storyContext)
            .single();
          
          if (story) {
            storyInfo = story;
            console.log('Story info from DB:', story.title);
          }
        }
      } catch (dbError) {
        console.log('DB 조회 실패, 기존 컨텍스트 사용:', dbError.message);
      }
    }

    // 대화 기록 구성
    const contextInfo = storyInfo || storyContext || '전래동화';
    const storyTitle = storyInfo?.title || (storyContext && typeof storyContext === 'object' ? storyContext.title : '전래동화');
    const storySummary = storyInfo?.summary || (storyContext && typeof storyContext === 'object' ? storyContext.summary : '');

    const messages = [
      {
        role: 'system',
        content: `너는 전래동화를 아이들과 함께 새롭게 상상해보도록 돕는 화자 역할을 맡고 있어.

대화 규칙은 아래와 같아:
1. 먼저 전래동화를 랜덤으로 제안하거나, 사용자에게 어떤 전래동화를 이야기하고 싶은지 물어본다.
2. 사용자가 전래동화를 정하면, 그 내용을 2~3문장으로 아주 간단히 소개한다.
3. 그 후 '만약에 {전래동화 이름}에서 ~ 했으면 어땠을까?' 형식으로 첫 질문을 던진다.
4. 사용자가 답하면, 반드시 그 답을 반영해서 다시 새로운 만약에 질문을 던진다.
5. 질문은 항상 한 문장으로만 한다. (예: '그렇다면 ~는 어떻게 됐을까?')
6. 말투는 어린아이에게 말하듯이 친근하고 반말로 한다.
7. 같은 표현을 반복하지 않고, 직전 대화를 기억해서 자연스럽게 이어간다.
8. 사용자가 '끝', '그만', '이제 됐어' 같은 종료 의사를 보이면, 대화를 멈추고 지금까지의 이야기를 3~4문장으로 요약한다.
9. 마지막에는 이 새로운 이야기에서 얻을 수 있는 교훈이나 깨달음을 한 문장으로 알려준다.
10. 사용자가 전래동화와 전혀 상관없는 말을 하면, 잠깐 반응해 준 뒤 원래 전래동화 이야기로 다시 질문을 이어간다.
11. 직전 대화의 내용을 포함해서 한 문장으로 대답하고, 한문장으로 질문해줘. 반드시 두 문장을 넘어가면 안돼


📌 예시 대화

시스템: 어떤 전래동화에 대해 이야기하고 싶어?
사용자: 흥부와 놀부 이야기!
시스템: 그래, 흥부와 놀부 이야기를 해보자. 흥부는 다친 제비를 고쳐주고 보물을 얻었고, 놀부는 욕심을 부리다 벌을 받았어. 만약에, 놀부가 착했으면 어땠을까?
사용자: 흥부가 가난하지 않았을 거 같아.
시스템: 그렇구나! 흥부가 가난하지 않았다면, 제비가 박씨를 가져다줬을까?

현재 동화: ${storyTitle}
${storySummary ? `동화 요약: ${storySummary}` : ''}`
      }
    ];

    // 대화 기록 추가
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((turn: any) => {
        messages.push({
          role: turn.role === 'user' ? 'user' : 'assistant',
          content: turn.content
        });
      });
    }

    // 현재 사용자 메시지 추가
    messages.push({
      role: 'user',
      content: message
    });

    // UUID 생성 (X-NCP-CLOVASTUDIO-REQUEST-ID용)
    const requestId = crypto.randomUUID();
    
    // 메시지 형식을 네이버 API 규격에 맞게 변환
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: [
        {
          type: "text",
          text: msg.content
        }
      ]
    }));

    // 네이버 클라우드 HyperCLOVA X API 호출
    const response = await fetch('https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-005', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${naverApiKey}`,
        'X-NCP-CLOVASTUDIO-REQUEST-ID': requestId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        messages: formattedMessages,
        topP: 0.8,
        topK: 0,
        maxTokens: 256,
        temperature: 0,
        repetitionPenalty: 1.1,
        stop: [],
        includeAiFilters: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== 네이버 API 호출 실패 ===');
      console.error('상태 코드:', response.status);
      console.error('응답 텍스트:', errorText);
      console.error('요청 헤더:', {
        'Authorization': naverApiKey ? `Bearer ${naverApiKey.substring(0, 10)}...` : '없음',
        'X-NCP-CLOVASTUDIO-REQUEST-ID': requestId
      });
      console.error('요청 메시지:', messages);
      console.error('========================');
      
      // 백업 응답
      const backupReplies = [
        "정말 재미있는 생각이네요! 그러면 또 어떤 일이 일어났을까요?",
        "와, 창의적인 아이디어예요! 그 다음에는 어떻게 되었을까요?",
        "좋은 상상이에요! 다른 등장인물들은 어떻게 느꼈을까요?"
      ];
      
      return new Response(JSON.stringify({
        reply: backupReplies[Math.floor(Math.random() * backupReplies.length)]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const reply = data.result?.message?.content || "정말 흥미로운 생각이네요! 더 자세히 말해줄 수 있나요?";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== 채팅 함수 에러 ===');
    console.error('에러 타입:', error.constructor.name);
    console.error('에러 메시지:', error.message);
    console.error('에러 스택:', error.stack);
    
    if (error.name === 'TypeError') {
      console.error('네트워크 또는 타입 에러 발생');
    } else if (error.message.includes('NAVER_CLOUD_API_KEY')) {
      console.error('네이버 API 키 설정 문제');
    } else if (error.message.includes('JSON')) {
      console.error('JSON 파싱 에러');
    }
    
    console.error('전체 에러 객체:', error);
    console.error('====================');
    
    return new Response(JSON.stringify({
      error: error.message,
      reply: `오류가 발생했습니다: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});