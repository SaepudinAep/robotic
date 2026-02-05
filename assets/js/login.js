import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from './config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

const form = document.getElementById('form-login');
const btn = document.getElementById('btn-submit');
const errorMsg = document.getElementById('msg-error');

form.onsubmit = async (e) => {
    e.preventDefault();
    
    btn.disabled = true;
    btn.textContent = "⌛ Authenticating...";
    errorMsg.style.display = 'none';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // 1. Auth Supabase
        const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) throw new Error("Email atau password salah.");

        // 2. Cek Role (Hanya Admin & Teacher yang boleh masuk)
        const { data: profile, error: profErr } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', auth.user.id)
            .single();

        if (profErr || !['super_admin', 'teacher'].includes(profile.role)) {
            await supabase.auth.signOut();
            throw new Error("Akses Ditolak: Anda bukan Admin/Guru.");
        }

        // 3. Sukses -> Pindah ke Dashboard
        window.location.href = 'main.html';

    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = "Sign In";
    }
};