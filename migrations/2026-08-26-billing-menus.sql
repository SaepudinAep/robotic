-- ============================================================
-- MIGRATION: Daftarkan Menu "Summary Billing Private"
-- Tanggal   : 2026-08-26
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste > Run
--
-- Modul  : modules/billing.js (sudah ada)
-- Tabel  : menu_categories + app_menus (di-render oleh assets/js/main.js)
--
-- Catatan:
--   * Menu sidebar di-generate dari tabel app_menus/menu_categories.
--   * main.js hanya menampilkan kategori target_app IN ('admin_v2','all').
--   * allowed_roles/allowed_level_ids bertipe text[].
--   * Idempotent: aman dijalankan berulang.
-- ============================================================

-- 1. Kategori "Billing" (dibuat jika belum ada; category_key UNIQUE)
INSERT INTO public.menu_categories (title, category_key, order_index, target_app, is_active)
VALUES ('Billing', 'billing', 60, 'admin_v2', true)
ON CONFLICT (category_key) DO NOTHING;

-- 2. Menu "Summary Billing Private" -> route = nama file modul (tanpa .js)
INSERT INTO public.app_menus
    (title, route, category, allowed_roles, allowed_level_ids,
     icon_class, order_index, is_active)
SELECT
    'Summary Billing Private',
    'billing',
    id,
    ARRAY['super_admin','teacher']::text[],
    ARRAY[]::text[],
    'fa-solid fa-receipt',
    10,
    true
FROM public.menu_categories
WHERE category_key = 'billing'
  AND NOT EXISTS (SELECT 1 FROM public.app_menus WHERE route = 'billing');
