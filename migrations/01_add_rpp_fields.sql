-- Migration: Add RPP (Lesson Plan) fields, Versioning, and Soft Delete flags

ALTER TABLE public.materi
  ADD COLUMN IF NOT EXISTS alokasi_waktu text,
  ADD COLUMN IF NOT EXISTS tujuan_pembelajaran text,
  ADD COLUMN IF NOT EXISTS alat_bahan text,
  ADD COLUMN IF NOT EXISTS kegiatan_apersepsi text,
  ADD COLUMN IF NOT EXISTS kegiatan_inti text,
  ADD COLUMN IF NOT EXISTS kegiatan_penutup text,
  ADD COLUMN IF NOT EXISTS indikator_penilaian text,
  ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS version_notes text,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.materi_private
  ADD COLUMN IF NOT EXISTS alokasi_waktu text,
  ADD COLUMN IF NOT EXISTS tujuan_pembelajaran text,
  ADD COLUMN IF NOT EXISTS alat_bahan text,
  ADD COLUMN IF NOT EXISTS kegiatan_apersepsi text,
  ADD COLUMN IF NOT EXISTS kegiatan_inti text,
  ADD COLUMN IF NOT EXISTS kegiatan_penutup text,
  ADD COLUMN IF NOT EXISTS indikator_penilaian text,
  ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS version_notes text,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE TABLE IF NOT EXISTS public.materi_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  materi_id uuid REFERENCES public.materi(id) ON DELETE CASCADE,
  version text NOT NULL,
  title text,
  snapshot jsonb NOT NULL,
  version_notes text,
  created_at timestamp with time zone DEFAULT now()
);
