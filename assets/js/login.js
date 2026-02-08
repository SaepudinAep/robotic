import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from './config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

const form = document.getElementById('form-login');
const btn = document.getElementById('btn-submit');
const errorMsg = document.getElementById('msg-error');

// KUNCI CACHE (Sesuai dengan index.js yang tadi kita buat)
const CACHE_KEY_ROLE = 'user_role';        // Role asli (super_admin/teacher)
const CACHE_KEY_GUEST = 'robopanda_role';  // Role guest (untuk fallback)

form.onsubmit = async (e) => {
    e.preventDefault();
    
    // UI Feedback: Langsung respon agar user tahu tombol sudah ditekan
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Memeriksa...`;
    errorMsg.style.display = 'none';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // 1. AUTHENTICATION (Network Request #1)
        const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) throw new Error("Email atau password salah.");

        // UI Update: Memberi tahu user langkah selanjutnya
        btn.innerHTML = `<i class="fa-solid fa-user-check"></i> Memuat Profil...`;

        // 2. FETCH PROFILE (Network Request #2)
        // Kita pilih field seminimal mungkin agar paket data kecil & cepat
        const { data: profile, error: profErr } = await supabase
            .from('user_profiles')
            .select('role, name') // Ambil nama juga buat sapaan nanti
            .eq('id', auth.user.id)
            .single();

        // Validasi Role
        if (profErr || !['super_admin', 'teacher'].includes(profile.role)) {
            await supabase.auth.signOut();
            throw new Error("Akses Ditolak: Khusus Admin & Guru.");
        }

        // --- 3. OPTIMISASI UTAMA (CRITICAL STEP) ---
        // Simpan data ke localStorage SEKARANG.
        // Agar saat pindah ke 'main.html', halaman itu TIDAK PERLU loading lagi.
        localStorage.setItem(CACHE_KEY_ROLE, profile.role); // Simpan 'super_admin'
        
        // Opsional: Reset role guest agar logika index.js tadi memprioritaskan user_role
        // Tapi biarkan robopanda_role tetap ada sebagai dasar.
        console.log("Login Sukses. Data tersimpan di Cache.");

        // 4. SUKSES & REDIRECT
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Berhasil!`;
        btn.style.backgroundColor = "#10b981"; // Hijau Sukses
        
        // Beri jeda 500ms agar user sempat lihat pesan sukses (UX Psychology)
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 500);

    } catch (err) {
        console.error("Login Gagal:", err);
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        
        // Reset Tombol
        btn.disabled = false;
        btn.textContent = "Sign In";
        btn.style.backgroundColor = ""; // Reset warna
    }
};