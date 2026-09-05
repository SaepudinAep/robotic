-- ============================================================
-- PERUBAHAN: Kolom status pembayaran di invoices_sekolah
-- Jalankan file INI SAJA di Supabase SQL Editor > Run.
-- Catatan: biarkan DEFAULT 'belum' agar invoice lama otomatis
-- menjadi status "Belum Lunas" tanpa data pembayaran.
-- ============================================================

ALTER TABLE public.invoices_sekolah
    ADD COLUMN IF NOT EXISTS status_lunas text NOT NULL DEFAULT 'belum'
        CHECK (status_lunas IN ('belum', 'lunas')),
    ADD COLUMN IF NOT EXISTS paid_at timestamptz,
    ADD COLUMN IF NOT EXISTS payment_method text,
    ADD COLUMN IF NOT EXISTS payment_ref text;