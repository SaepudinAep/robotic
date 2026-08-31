-- ============================================================
-- Migration 02: Assembly Guide Tables
-- 
-- KONDISI DATABASE (terverifikasi via REST API 2026-08-31):
--   - Tabel 'assembly_guides' SUDAH ADA dengan kolom:
--     id, materi_id, title, description, created_at, updated_at
--   - Tabel 'assembly_guide_steps' BELUM ADA
--
-- Migrasi ini:
--   1. Upgrade tabel assembly_guides (tambah kolom baru)
--   2. Buat tabel assembly_guide_steps (detail langkah per guide)
-- ============================================================

-- Step 1: Upgrade tabel assembly_guides yang sudah ada
ALTER TABLE public.assembly_guides
  ADD COLUMN IF NOT EXISTS materi_private_id uuid REFERENCES public.materi_private(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Step 2: Buat tabel assembly_guide_steps (langkah detail perakitan)
CREATE TABLE IF NOT EXISTS public.assembly_guide_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid REFERENCES public.assembly_guides(id) ON DELETE CASCADE,
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

-- Index untuk retrieval cepat
CREATE INDEX IF NOT EXISTS idx_assembly_guide_steps_guide ON public.assembly_guide_steps(guide_id);
CREATE INDEX IF NOT EXISTS idx_assembly_guide_steps_materi ON public.assembly_guide_steps(materi_id);
CREATE INDEX IF NOT EXISTS idx_assembly_guide_steps_materi_private ON public.assembly_guide_steps(materi_private_id);
CREATE INDEX IF NOT EXISTS idx_assembly_guides_materi ON public.assembly_guides(materi_id);

-- Step 3: Register Assembly Guide di app_menus (jika belum ada)
INSERT INTO public.app_menus (title, route, category, allowed_roles, icon_class, order_index, is_active)
SELECT 'Assembly Guide', 'assembly-guide', id, ARRAY['super_admin', 'teacher'], 'fa-solid fa-puzzle-piece', 4, true
FROM public.menu_categories
WHERE category_key = 'kurikulum' OR title ILIKE '%kurikulum%'
LIMIT 1
ON CONFLICT DO NOTHING;
