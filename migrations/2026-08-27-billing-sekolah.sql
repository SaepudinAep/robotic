-- ============================================================
-- MIGRATION: Billing Invoice Sekolah (siklus berbasis tanggal)
-- Tanggal   : 2026-08-27
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste > Run
--
-- Konsep (hasil diskusi):
--   * Unit tagihan PER KELAS (jumlah anak & pertemuan per kelas).
--   * Siklus = RENTANG TANGGAL (start_date s/d end_date),
--     tidak dibatasi kuota pertemuan.
--   * Harga kontrak disimpan sesuai bahasa kontrak:
--     contract_price per contract_sessions (mis. 80.000 per 4 sesi)
--     => harga per sesi = contract_price / contract_sessions (20.000)
--   * INVOICE  = harga_per_sesi x jumlah_pertemuan x jumlah_anak
--   * invoices_sekolah = SNAPSHOT resmi; period_id UNIQUE
--     sehingga 1 siklus hanya bisa punya 1 invoice.
--
-- Bonus: samakan judul menu Billing di sidebar.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.billing_periods_sekolah (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id          uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    periode_label     text,
    start_date        date NOT NULL,
    end_date          date NOT NULL,
    contract_price    numeric(12,0) NOT NULL,
    contract_sessions integer NOT NULL DEFAULT 4,
    status            text NOT NULL DEFAULT 'aktif'
                      CHECK (status IN ('aktif', 'selesai')),
    note              text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_bs_tanggal CHECK (end_date >= start_date),
    CONSTRAINT chk_bs_harga CHECK (contract_price >= 0),
    CONSTRAINT chk_bs_sesi_kontrak CHECK (contract_sessions >= 1)
);

CREATE INDEX IF NOT EXISTS idx_bp_sekolah_class
    ON public.billing_periods_sekolah (class_id, status);

CREATE TABLE IF NOT EXISTS public.invoices_sekolah (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id          uuid NOT NULL UNIQUE
                       REFERENCES public.billing_periods_sekolah(id) ON DELETE CASCADE,
    school_id          uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id           uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    periode_label      text,
    jumlah_anak        integer NOT NULL,
    jumlah_pertemuan   integer NOT NULL,
    price_per_session  numeric(12,2) NOT NULL,
    total              numeric(14,2) NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_sekolah_class
    ON public.invoices_sekolah (class_id, created_at DESC);

-- Rapikan judul menu yang sudah ada (idempotent)
UPDATE public.app_menus
SET title = 'Billing'
WHERE route = 'billing';
