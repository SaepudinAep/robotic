-- Migration: RPP Advanced Fields v9
-- Menambahkan kolom untuk Timeline, Troubleshooting, dan Rubric Penilaian
-- (bagian E, F, G dari format lesson plan 8 section terstandar A-H)

ALTER TABLE public.materi
  ADD COLUMN IF NOT EXISTS timeline_pembelajaran text,
  ADD COLUMN IF NOT EXISTS troubleshooting text,
  ADD COLUMN IF NOT EXISTS rubric_penilaian text;

-- Catatan: kolom detail (JSON backup via payload.detail) & materi_versions otomatis
-- menyimpan field baru tersebut tanpa perlu penyesuaian schema tambahan karena
-- disimpan sebagai snapshot JSONB.

-- Jalankan perintah ini di Supabase SQL Editor.