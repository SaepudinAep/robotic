import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from './config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

const form = document.getElementById('form-login');
const btn = document.getElementById('btn-submit');
const errorMsg = document.getElementById('msg-error');

form.onsubmit = async (e) => {
    e.preventDefault();
    
    // UI Loading State
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...';
    errorMsg.style.display = 'none';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // 1. Auth Supabase
        const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) throw new Error("Email atau password salah.");

        // 2. Cek Role
        const { data: profile, error: profErr } = await supabase
            .from('user_profiles')
            .select('role, name, level_id')
            .eq('id', auth.user.id)
            .single();

        if (profErr || !['super_admin', 'teacher'].includes(profile?.role)) {
            await supabase.auth.signOut();
            throw new Error("Akses Ditolak: Anda bukan Admin/Guru.");
        }

        // --- SIMPAN KE LOCALSTORAGE (Sesuai Permintaan Bapak) ---
        localStorage.setItem('admin_name', profile.name || 'Admin');
        localStorage.setItem('admin_role', profile.role);
        localStorage.setItem('admin_level', profile.level_id || '');

        // 3. Sukses -> Pindah ke Dashboard Utama
        window.location.href = 'main.html';

    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = "Sign In";
    }
};