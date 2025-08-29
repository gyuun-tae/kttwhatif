import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("빈 세션 생성 요청 받음");

    // 단순히 새로운 세션 ID만 생성하여 반환
    const sessionId = crypto.randomUUID();
    
    return new Response(
      JSON.stringify({
        sessionId,
        title: '새로운 대화'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('빈 세션 생성 실패:', error);
    return new Response(JSON.stringify({ error: '세션 생성 실패' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});