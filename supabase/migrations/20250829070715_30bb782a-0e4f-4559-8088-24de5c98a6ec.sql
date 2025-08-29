-- Create chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT false
);

-- Create chat turns table
CREATE TABLE public.chat_turns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_turns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" 
ON public.chat_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for chat_turns
CREATE POLICY "Users can view their own chat turns" 
ON public.chat_turns 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions 
  WHERE chat_sessions.id = chat_turns.session_id 
  AND chat_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can create their own chat turns" 
ON public.chat_turns 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_sessions 
  WHERE chat_sessions.id = chat_turns.session_id 
  AND chat_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can update their own chat turns" 
ON public.chat_turns 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions 
  WHERE chat_sessions.id = chat_turns.session_id 
  AND chat_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own chat turns" 
ON public.chat_turns 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions 
  WHERE chat_sessions.id = chat_turns.session_id 
  AND chat_sessions.user_id = auth.uid()
));

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);
CREATE INDEX idx_chat_turns_session_id ON public.chat_turns(session_id);
CREATE INDEX idx_chat_turns_created_at ON public.chat_turns(created_at DESC);