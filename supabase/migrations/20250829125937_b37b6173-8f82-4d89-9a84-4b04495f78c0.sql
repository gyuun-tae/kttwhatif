-- Create stories table for Korean folktales
CREATE TABLE public.stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL,
  key_scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_if_prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
  genre text DEFAULT 'folktale',
  target_age_min integer DEFAULT 6,
  target_age_max integer DEFAULT 12,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on stories table
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to stories (since they're content for all users)
CREATE POLICY "Stories are publicly readable" 
ON public.stories 
FOR SELECT 
USING (is_active = true);

-- Add story reference to chat_sessions table
ALTER TABLE public.chat_sessions 
DROP COLUMN story_id,
ADD COLUMN story_id uuid REFERENCES public.stories(id),
ADD COLUMN story_context jsonb DEFAULT '{}'::jsonb,
ADD COLUMN conversation_metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for better performance
CREATE INDEX idx_stories_active ON public.stories (is_active);
CREATE INDEX idx_chat_sessions_story_id ON public.chat_sessions (story_id);

-- Create trigger for automatic timestamp updates on stories
CREATE TRIGGER update_stories_updated_at
BEFORE UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the Korean folktales data
INSERT INTO public.stories (title, summary, key_scenes, what_if_prompts) VALUES 
('흥부와 놀부', '착한 흥부와 욕심쟁이 놀부 형제의 이야기입니다.', 
 '["흥부가 제비 다리를 고쳐줌", "제비가 박씨를 물어다줌", "박에서 보물이 나옴", "놀부가 제비 다리를 부러뜨림", "놀부 박에서 도깨비가 나옴"]'::jsonb,
 '["만약에 흥부가 제비 다리를 고쳐주지 않았다면?", "만약에 놀부가 착한 마음을 가졌다면?", "만약에 제비가 다른 선물을 가져왔다면?"]'::jsonb),

('콩쥐팥쥐', '계모와 언니들에게 구박받던 콩쥐가 행복해지는 이야기입니다.',
 '["콩쥐가 집안일을 함", "동물들이 콩쥐를 도와줌", "콩쥐가 잔치에 감", "원님이 콩쥐와 결혼함"]'::jsonb,
 '["만약에 동물들이 콩쥐를 돕지 않았다면?", "만약에 콩쥐가 잔치에 가지 않았다면?", "만약에 계모가 콩쥐에게 친절했다면?"]'::jsonb),

('금도끼 은도끼', '나무꾼이 연못에 도끼를 빠뜨렸을 때 일어난 일입니다.',
 '["나무꾼이 도끼를 연못에 빠뜨림", "산신령이 금도끼, 은도끼를 보여줌", "정직한 나무꾼이 상을 받음", "욕심쟁이가 거짓말하다 벌받음"]'::jsonb,
 '["만약에 나무꾼이 금도끼를 가졌다고 거짓말했다면?", "만약에 산신령이 다른 선물을 줬다면?", "만약에 욕심쟁이가 정직했다면?"]'::jsonb),

('토끼와 거북이', '느려도 꾸준한 거북이와 빠르지만 방심한 토끼의 경주 이야기입니다.',
 '["토끼와 거북이가 경주를 시작함", "토끼가 빠르게 앞서감", "토끼가 낮잠을 잠", "거북이가 꾸준히 달려서 승리함"]'::jsonb,
 '["만약에 토끼가 낮잠을 자지 않았다면?", "만약에 거북이가 포기했다면?", "만약에 다른 동물들도 경주에 참여했다면?"]'::jsonb),

('혹부리 영감', '혹이 있는 착한 영감과 욕심쟁이 영감의 이야기입니다.',
 '["착한 영감이 도깨비들과 춤을 춤", "도깨비들이 영감의 혹을 떼어줌", "욕심쟁이 영감이 따라함", "욕심쟁이 영감이 혹이 더 생김"]'::jsonb,
 '["만약에 착한 영감이 도깨비들을 무서워했다면?", "만약에 욕심쟁이 영감이 욕심내지 않았다면?", "만약에 도깨비들이 다른 선물을 줬다면?"]'::jsonb);