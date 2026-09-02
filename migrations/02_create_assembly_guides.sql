-- ============================================================
-- Migration 02: Assembly Guide Tables
-- 
-- KONDISI DATABASE (terverifikasi via REST API 2026-08-31 & 2026-09-02):
--   - Tabel 'assembly_guides' SUDAH ADA dengan kolom:
--     id, materi_id, title, description, created_at, updated_at
--     (FK materi_id -> materi(id) SUDAH ADA sehingga embed PostgREST bekerja)
--   - Kolom materi_private_id, is_deleted, step_number, image_url, instruction_text BELUM ADA
--   - Tabel 'assembly_guide_steps' SUDAH ADA (kosong)
--   - RLS assembly_guides AKTIF namun TANPA policy -> INSERT ditolak (42501)
--
-- Migrasi ini:
--   1. Upgrade tabel assembly_guides (tambah kolom baru + index)
--   2. Pastikan tabel assembly_guide_steps (detail langkah per guide)
--   3. Register menu Assembly Guide
--   4. RLS policies (WAJIB: tanpa ini anon/publishable key tidak bisa INSERT baris guide)
-- ============================================================

-- Step 1: Upgrade tabel assembly_guides yang sudah ada
ALTER TABLE public.assembly_guides
  ADD COLUMN IF NOT EXISTS materi_private_id uuid REFERENCES public.materi_private(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS step_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS instruction_text text;

CREATE INDEX IF NOT EXISTS idx_assembly_guides_materi_private ON public.assembly_guides(materi_private_id);

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

-- ============================================================
-- Step 4: RLS POLICIES (WAJIB)
-- Aplikasi berjalan dengan publishable/anon key, sehingga tanpa policy
-- Row Level Security akan menolak SELECT (data disembunyikan) dan
-- INSERT (error 42501) pada assembly_guides / assembly_guide_steps.
-- ============================================================
ALTER TABLE public.assembly_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assembly_guides_select" ON public.assembly_guides;
DROP POLICY IF EXISTS "assembly_guides_insert" ON public.assembly_guides;
DROP POLICY IF EXISTS "assembly_guides_update" ON public.assembly_guides;
DROP POLICY IF EXISTS "assembly_guides_delete" ON public.assembly_guides;

CREATE POLICY "assembly_guides_select" ON public.assembly_guides
  FOR SELECT USING (true);
CREATE POLICY "assembly_guides_insert" ON public.assembly_guides
  FOR INSERT WITH CHECK (true);
CREATE POLICY "assembly_guides_update" ON public.assembly_guides
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "assembly_guides_delete" ON public.assembly_guides
  FOR DELETE USING (true);

ALTER TABLE public.assembly_guide_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assembly_guide_steps_select" ON public.assembly_guide_steps;
DROP POLICY IF EXISTS "assembly_guide_steps_insert" ON public.assembly_guide_steps;
DROP POLICY IF EXISTS "assembly_guide_steps_update" ON public.assembly_guide_steps;
DROP POLICY IF EXISTS "assembly_guide_steps_delete" ON public.assembly_guide_steps;

CREATE POLICY "assembly_guide_steps_select" ON public.assembly_guide_steps
  FOR SELECT USING (true);
CREATE POLICY "assembly_guide_steps_insert" ON public.assembly_guide_steps
  FOR INSERT WITH CHECK (true);
CREATE POLICY "assembly_guide_steps_update" ON public.assembly_guide_steps
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "assembly_guide_steps_delete" ON public.assembly_guide_steps
  FOR DELETE USING (true);
