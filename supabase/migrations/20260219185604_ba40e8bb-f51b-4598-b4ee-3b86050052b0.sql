
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles: users can read their own role, admins can read all
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Models table
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_public BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Models: anyone can read public models, only admins can insert/update/delete
CREATE POLICY "Anyone can view public models" ON public.models
  FOR SELECT USING (is_public = true OR auth.uid() = uploaded_by);

CREATE POLICY "Admins can insert models" ON public.models
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update models" ON public.models
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete models" ON public.models
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Annotations table
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  label TEXT NOT NULL DEFAULT 'Point of Interest',
  description TEXT,
  position_x DOUBLE PRECISION NOT NULL,
  position_y DOUBLE PRECISION NOT NULL,
  position_z DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Annotations: anyone can read (for public embed), anyone can insert, users/anon can update/delete their own
CREATE POLICY "Anyone can view annotations" ON public.annotations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert annotations" ON public.annotations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own annotations" ON public.annotations
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own annotations" ON public.annotations
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_annotations_updated_at
  BEFORE UPDATE ON public.annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for models
INSERT INTO storage.buckets (id, name, public) VALUES ('models', 'models', true);

-- Storage RLS: anyone can read
CREATE POLICY "Anyone can read models" ON storage.objects
  FOR SELECT USING (bucket_id = 'models');

-- Storage RLS: only admins can upload/delete
CREATE POLICY "Admins can upload models" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'models' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete models" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'models' AND public.has_role(auth.uid(), 'admin')
  );
