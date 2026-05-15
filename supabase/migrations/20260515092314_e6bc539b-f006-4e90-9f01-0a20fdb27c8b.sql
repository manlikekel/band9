
-- Profile per user with onboarding data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  target_band NUMERIC(2,1),
  exam_date DATE,
  current_band NUMERIC(2,1),
  weakest_skill TEXT,
  daily_minutes INTEGER DEFAULT 30,
  plan_length INTEGER DEFAULT 15,
  preferred_accent TEXT DEFAULT 'British',
  theme TEXT DEFAULT 'light',
  onboarded BOOLEAN DEFAULT false,
  streak_days INTEGER DEFAULT 0,
  last_practice_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generic practice attempts (listening, reading, vocab, grammar)
CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL, -- listening | reading | writing_t1 | writing_t2 | speaking | vocabulary | grammar
  question_type TEXT,
  difficulty TEXT,
  topic TEXT,
  payload JSONB, -- generated questions/passage
  user_answers JSONB,
  marking JSONB, -- AI marking JSON
  raw_score NUMERIC,
  estimated_band NUMERIC(2,1),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Writing submissions (kept separate for richer fields)
CREATE TABLE public.writing_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- task1 | task2
  prompt TEXT NOT NULL,
  bullet_points JSONB,
  essay_type TEXT,
  user_answer TEXT NOT NULL,
  word_count INTEGER,
  marking JSONB,
  estimated_band NUMERIC(2,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speaking submissions
CREATE TABLE public.speaking_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part INTEGER NOT NULL, -- 1, 2, 3
  question TEXT NOT NULL,
  cue_card JSONB,
  transcript TEXT NOT NULL,
  duration_seconds INTEGER,
  filler_count INTEGER,
  marking JSONB,
  estimated_band NUMERIC(2,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full mock exams
CREATE TABLE public.mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'practice', -- strict | practice
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | completed
  listening_band NUMERIC(2,1),
  reading_band NUMERIC(2,1),
  writing_band NUMERIC(2,1),
  speaking_band NUMERIC(2,1),
  overall_band NUMERIC(2,1),
  report JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Saved/bookmarked questions
CREATE TABLE public.saved_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  question_type TEXT,
  difficulty TEXT,
  topic TEXT,
  payload JSONB NOT NULL,
  is_wrong BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Study plans
CREATE TABLE public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  length_days INTEGER NOT NULL,
  plan JSONB NOT NULL, -- array of { day, listening, reading, writing, speaking, focus, mini_goal, completed }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- Owner-only policies
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "own ps all" ON public.practice_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ws all" ON public.writing_submissions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ss all" ON public.speaking_submissions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own me all" ON public.mock_exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sq all" ON public.saved_questions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sp all" ON public.study_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
