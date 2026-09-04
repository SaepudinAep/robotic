-- ============================================================
-- PERUBAHAN: Tambah kolom jumlah_pertemuan di billing_periods_sekolah
-- Jalankan file INI SAJA di Supabase SQL Editor > New query > Run.
-- ============================================================

ALTER TABLE public.billing_periods_sekolah
    ADD COLUMN IF NOT EXISTS jumlah_pertemuan integer;

-- Isi otomatis untuk kontrak lama (dari pertemuan yang tercatat)
UPDATE public.billing_periods_sekolah bp
SET jumlah_pertemuan = sub.c
FROM (
    SELECT bp2.id, COUNT(pk.id)::int AS c
    FROM public.billing_periods_sekolah bp2
    LEFT JOIN public.pertemuan_kelas pk
      ON pk.class_id = bp2.class_id
     AND pk.tanggal >= bp2.start_date AND pk.tanggal <= bp2.end_date
    GROUP BY bp2.id
) sub
WHERE bp.id = sub.id
  AND bp.jumlah_pertemuan IS NULL;