-- ============================================================
-- MIGRATION: Fitur Silabus - kolom urutan (level, sub-level, materi)
-- Tanggal   : 2026-08-24
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste > Run
--
-- Menambahkan kolom `order_index` pada tabel levels, sub_levels,
-- materi, dan materi_private, lalu mengisi nilai awal berurutan
-- sehingga fitur naik/turun urutan di modul Silabus langsung
-- deterministik sejak tampilan pertama.
-- ============================================================

-- 1. Tambah kolom (NULL = belum diatur -> tampil paling bawah)
ALTER TABLE public.levels         ADD COLUMN IF NOT EXISTS order_index integer;
ALTER TABLE public.sub_levels     ADD COLUMN IF NOT EXISTS order_index integer;
ALTER TABLE public.materi         ADD COLUMN IF NOT EXISTS order_index integer;
ALTER TABLE public.materi_private ADD COLUMN IF NOT EXISTS order_index integer;

-- 2a. LEVEL: nilai awal mengikuti abjad kode
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY kode ASC) - 1 AS rn
    FROM public.levels
)
UPDATE public.levels lv
SET order_index = r.rn
FROM ranked r
WHERE lv.id = r.id;

-- 2b. SUB-LEVEL: nilai awal mengikuti abjad level induk lalu nama sub-level
WITH ranked AS (
    SELECT s.id,
           ROW_NUMBER() OVER (ORDER BY lv.kode ASC NULLS LAST, s.name ASC NULLS LAST) - 1 AS rn
    FROM public.sub_levels s
    LEFT JOIN public.levels lv ON lv.id = s.level_id
)
UPDATE public.sub_levels sv
SET order_index = r.rn
FROM ranked r
WHERE sv.id = r.id;

-- 2c. MATERI (sekolah): nomori 0..n-1 per sub_level (urut created_at)
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY sub_level_id ORDER BY created_at ASC NULLS LAST) - 1 AS rn
    FROM public.materi
    WHERE sub_level_id IS NOT NULL
)
UPDATE public.materi m
SET order_index = r.rn
FROM ranked r
WHERE m.id = r.id;

-- 2d. MATERI PRIVATE: sama seperti di atas
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY sub_level_id ORDER BY created_at ASC NULLS LAST) - 1 AS rn
    FROM public.materi_private
    WHERE sub_level_id IS NOT NULL
)
UPDATE public.materi_private m
SET order_index = r.rn
FROM ranked r
WHERE m.id = r.id;

-- 3. Index bantu agar sorting cepat
CREATE INDEX IF NOT EXISTS idx_materi_sublevel_order
    ON public.materi (sub_level_id, order_index);
CREATE INDEX IF NOT EXISTS idx_materi_priv_sublevel_order
    ON public.materi_private (sub_level_id, order_index);
