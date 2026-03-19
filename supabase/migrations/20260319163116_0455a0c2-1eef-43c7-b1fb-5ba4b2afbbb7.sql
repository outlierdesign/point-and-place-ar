ALTER TABLE public.annotations ADD COLUMN tooltip_type text NOT NULL DEFAULT 'info';
ALTER TABLE public.annotations ADD COLUMN linked_model_id uuid REFERENCES public.models(id) ON DELETE SET NULL;