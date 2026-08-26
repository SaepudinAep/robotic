-- ============================================================
-- MIGRATION: Fitur Summary/Prepaid Billing Sistem PRIVATE
-- Tanggal   : 2026-08-26
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste > Run
--
-- Konsep (sesuai keputusan pengguna):
--   * Billing private ditagihkan ke GROUP (orang tua pengelola group).
--   * Model prepaid: bayar di muka untuk kuota sesi (default 4),
--     periode dihitung MULAI DARI tanggal dideklarasikan, dan AKHIR periode
--     ditentukan OTOMATIS setelah kuota sesi terpakai (4 sesi).
--   * Jumlah sesi dihitung dinamis dari pertemuan_private
--     (satu-satunya sumber kebenaran), di level GROUP =
--     gabungan semua class_private milik group.
--   * Unit sesi = pertemuan_private.id UNIK, BUKAN per baris
--     attendance_private (agar group multi-siswa tidak ketagihan dobel).
--
-- TABEL BARU: billing_periods
--   Deklarasi awal periode & kuota per group (ringan, bukan invoice penuh).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.billing_periods (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id       uuid NOT NULL REFERENCES public.group_private(id) ON DELETE CASCADE,
    mode           text NOT NULL DEFAULT 'prepaid'
                   CHECK (mode IN ('prepaid', 'postpaid')),
    periode_label  text,                -- mis. "Agustus" / "Siklus 1"
    start_date     date NOT NULL,       -- awal periode (deklarasi prepaid); akhir = otomatis setelah kuota sesi
    quota_sessions integer NOT NULL DEFAULT 4,  -- kuota sesi yang dibayar (akhir periode otomatis = sesi ke-kuota)
    status         text NOT NULL DEFAULT 'aktif'
                   CHECK (status IN ('aktif', 'selesai')),
    note           text,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Index agar query summary per group cepat
CREATE INDEX IF NOT EXISTS idx_billing_periods_group
    ON public.billing_periods (group_id, status);
