-- ============================================================
-- MIGRATION: Level Kelas Mengikuti Master `levels`
-- Tanggal   : 2026-08-31
--
-- Alasan    : Form Level di tab Kelas (modules/registrasi-sekolah.js)
--             awalnya hardcoded (Kiddy/Beginner) dan kolom
--             classes.level dibatasi CHECK constraint. Ini membuat
--             kelas dengan level lain (mis. Robotic) tidak bisa
--             didaftarkan, padahal tabel master `levels` sudah
--             memiliki lebih banyak level (Kiddy, Robotic, Beginner).
--
-- Solusi    : Hapus CHECK constraint lama; source of truth level
--             sekarang tabel `levels` (nilai = levels.kode).
--
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste > Run
--
-- CATATAN: Jalankan SETELAH men-deploy perubahan di
--          modules/registrasi-sekolah.js agar dropdown level tab Kelas
--          mengambil opsi dari tabel `levels`.
-- ============================================================

ALTER TABLE public.classes
    DROP CONSTRAINT IF EXISTS classes_level_check;

-- Jika constraint justru punya nama lain di environment (mis. dibuat manual),
-- jalankan query alternatif ini satu per satu:
--   DO $$ BEGIN
--     EXECUTE 'ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS '
--             || (SELECT conname FROM pg_constraint
--                 WHERE conrelid = 'public.classes'::regclass
--                   AND contype = 'c'
--                   AND pg_get_constraintdef(oid) ILIKE '%check (level %'
--                 LIMIT 1);
--   END $$;

-- Verifikasi: cek daftar CHECK constraint classes yang tersisa.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.classes'::regclass
  AND contype = 'c';