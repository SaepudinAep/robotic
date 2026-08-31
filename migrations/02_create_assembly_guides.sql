-- Migration: Create tables and register menu for Assembly Guide module (Petunjuk Perakitan Robot)

CREATE TABLE IF NOT EXISTS public.assembly_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level_id uuid REFERENCES public.levels(id),
  sub_level_id uuid REFERENCES public.sub_levels(id),
  materi_id uuid REFERENCES public.materi(id),
  cover_image_url text,
  description text,
  kit_alat text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assembly_guide_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid REFERENCES public.assembly_guides(id) ON DELETE CASCADE,
  step_number integer NOT NULL DEFAULT 1,
  title text,
  image_url text,
  instruction_text text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_assembly_guides_level ON public.assembly_guides(level_id);
CREATE INDEX IF NOT EXISTS idx_assembly_guides_sub_level ON public.assembly_guides(sub_level_id);
CREATE INDEX IF NOT EXISTS idx_assembly_guide_steps_guide ON public.assembly_guide_steps(guide_id);

-- Register Assembly Guide in app_menus (Kurikulum category)
INSERT INTO public.app_menus (title, route, category, allowed_roles, icon_class, order_index, is_active)
SELECT 'Assembly Guide', 'assembly-guide', id, ARRAY['super_admin', 'teacher'], 'fa-solid fa-robot', 3, true
FROM public.menu_categories
WHERE category_key = 'kurikulum' OR title ILIKE '%kurikulum%'
LIMIT 1
ON CONFLICT DO NOTHING;

