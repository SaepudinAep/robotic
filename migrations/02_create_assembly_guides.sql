-- Migration: Create assembly_guide_steps table with Soft Delete support

CREATE TABLE IF NOT EXISTS public.assembly_guide_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  materi_id uuid REFERENCES public.materi(id) ON DELETE CASCADE,
  materi_private_id uuid REFERENCES public.materi_private(id) ON DELETE CASCADE,
  step_number integer NOT NULL DEFAULT 1,
  title text,
  image_url text,
  instruction_text text,
  notes text,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexing for fast retrieval per materi / materi_private
CREATE INDEX IF NOT EXISTS idx_assembly_guide_steps_materi ON public.assembly_guide_steps(materi_id);
CREATE INDEX IF NOT EXISTS idx_assembly_guide_steps_materi_private ON public.assembly_guide_steps(materi_private_id);

-- Register Assembly Guide in app_menus (Kurikulum category)
INSERT INTO public.app_menus (title, route, category, allowed_roles, icon_class, order_index, is_active)
SELECT 'Assembly Guide', 'assembly-guide', id, ARRAY['super_admin', 'teacher'], 'fa-solid fa-puzzle-piece', 4, true
FROM public.menu_categories
WHERE category_key = 'kurikulum' OR title ILIKE '%kurikulum%'
LIMIT 1
ON CONFLICT DO NOTHING;
