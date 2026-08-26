-- ============================================================
-- MIGRATION: Opsi Jumlah Sesi per Pertemuan (Private)
-- Tanggal   : 2026-08-26
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste > Run
--
-- Kebutuhan:
--   Satu pertemuan bisa tercatat sebagai 1 atau 2 SESI
--   (keputusan guru saat input di Monitoring Private).
--
-- Desain:
--   * Kolom baru jumlah_sesi di pertemuan_private, DEFAULT 1
--     sehingga data lama otomatis tetap dihitung 1 sesi.
--   * Billing Summary menghitung SUM(jumlah_sesi), bukan COUNT baris.
-- ============================================================

ALTER TABLE public.pertemuan_private
    ADD COLUMN IF NOT EXISTS jumlah_sesi integer NOT NULL DEFAULT 1;

-- Validasi minimal 1 sesi (idempotent agar aman dijalankan ulang)
DO $$
BEGIN
    ALTER TABLE public.pertemuan_private
        ADD CONSTRAINT chk_pertemuan_jumlah_sesi CHECK (jumlah_sesi >= 1);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
