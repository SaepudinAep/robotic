import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from './config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- KONSTANTA KEAMANAN ---
const ALLOWED_ROLES = ['super_admin', 'teacher']; // Hanya mereka yang boleh masuk
const CACHE_KEY_ROLE = 'user_role';

// DOM Elements
const sidebarMenuContainer = document.getElementById('sidebar-menu-container');
const contentCanvas = document.getElementById('content-canvas');
const breadcrumbContainer = document.getElementById('breadcrumb-container');

// State Global
let userProfile = null;

// --- 1. SECURITY CHECK (THE GATEKEEPER) ---
// Jalankan ini SEBELUM DOMContentLoaded agar penyusup tidak sempat lihat apa-apa.
(function securityCheck() {
    const cachedRole = localStorage.getItem(CACHE_KEY_ROLE);
    
    // Cek 1: Apakah ada cache role? Dan apakah role-nya diizinkan?
    if (!cachedRole || !ALLOWED_ROLES.includes(cachedRole)) {
        // Jika null atau siswa ('student'), tendang keluar!
        console.warn("Unauthorized Access Detected (Local Check).");
        window.location.replace('index.html'); // Pakai replace agar tidak bisa di-back
    }
})();

// --- 2. INISIALISASI ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // Validasi Sesi Server (Double Check)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('index.html');
        return;
    }

    // Ambil Profil Terbaru (Untuk memastikan role tidak berubah/dipecat)
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile || !ALLOWED_ROLES.includes(profile.role)) {
            console.error("Unauthorized Access (Server Check):", profile?.role);
            await supabase.auth.signOut();
            localStorage.clear(); // Hapus jejak
            window.location.replace('index.html');
            return;
        }

        userProfile = profile;
        // Update Cache agar login berikutnya makin cepat
        localStorage.setItem(CACHE_KEY_ROLE, profile.role);

    } catch (err) {
        console.error("Profile Load Error:", err);
        window.location.replace('index.html'); // Safety first
        return;
    }

    // --- JIKA LOLOS, BARU RENDER UI ---
    renderHeaderInfo();
    await initSidebar();
    loadModule('overview', 'Dashboard', 'Home'); // Load default
    setupGlobalEvents();
});

// --- 3. UI RENDERING ---
function renderHeaderInfo() {
    const roleMap = { 'super_admin': 'Administrator', 'teacher': 'Guru' };
    const displayRole = roleMap[userProfile.role] || userProfile.role;

    // Header Atas
    const headerName = document.getElementById('header-user-name');
    const headerRole = document.getElementById('header-user-role');
    if(headerName) headerName.textContent = userProfile.name || "User";
    if(headerRole) headerRole.textContent = displayRole;

    // Sidebar Bawah
    const dispName = document.getElementById('display-name');
    const dispRole = document.getElementById('display-role');
    if(dispName) dispName.textContent = userProfile.name;
    if(dispRole) dispRole.textContent = displayRole;
}

// --- 4. SIDEBAR LOGIC (FILTER) ---
async function initSidebar() {
    if(!sidebarMenuContainer) return;
    sidebarMenuContainer.innerHTML = '<div style="padding:20px; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i></div>';

    try {
        // Ambil Menu Khusus Admin/Guru
        // Kita filter di query database sekalian biar hemat bandwidth (Optional optimization)
        const { data: categories } = await supabase.from('menu_categories')
            .select('*')
            .order('order_index');
            
        const { data: menus } = await supabase.from('app_menus')
            .select('*')
            .eq('is_active', true)
            .order('order_index');

        sidebarMenuContainer.innerHTML = '';

        if (categories && menus) {
            categories.forEach(cat => {
                // Filter Menu milik Kategori ini
                const catMenus = menus.filter(m => m.category == cat.id);
                
                // Filter Menu berdasarkan Role User (Strict)
                const allowedMenus = catMenus.filter(m => {
                    // Admin lihat semua
                    if (userProfile.role === 'super_admin') return true;
                    
                    // Cek izin JSON
                    let allowedRoles = [];
                    try { 
                        allowedRoles = typeof m.allowed_roles === 'string' 
                            ? JSON.parse(m.allowed_roles) 
                            : m.allowed_roles; 
                    } catch(e){}
                    
                    return Array.isArray(allowedRoles) && allowedRoles.includes(userProfile.role);
                });

                if (allowedMenus.length === 0) return;

                // Render Judul Group
                const groupTitle = document.createElement('div');
                groupTitle.className = 'nav-group-title';
                groupTitle.textContent = cat.title; // e.g., "AKADEMIK"
                sidebarMenuContainer.appendChild(groupTitle);

                // Render Item
                allowedMenus.forEach(m => {
                    const item = document.createElement('div');
                    item.className = 'nav-item';
                    item.innerHTML = `<i class="${m.icon_class}"></i> <span>${m.title}</span>`;
                    item.onclick = () => {
                        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                        item.classList.add('active');
                        loadModule(m.route, m.title, cat.title);
                        
                        // Tutup sidebar di mobile
                        const sb = document.getElementById('sidebar');
                        const ov = document.getElementById('sidebar-overlay');
                        if(sb) sb.classList.remove('open');
                        if(ov) ov.classList.remove('active');
                    };
                    sidebarMenuContainer.appendChild(item);
                });
            });
        }
    } catch (err) {
        console.error("Sidebar Error:", err);
    }
}

// --- 5. MODUL LOADER (Sama seperti sebelumnya) ---
async function loadModule(route, title, category) {
    // Render Breadcrumb
    if(breadcrumbContainer) {
        breadcrumbContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; font-size:0.9rem;">
                <span style="color:#64748b;">${category}</span>
                <i class="fa-solid fa-chevron-right" style="font-size:0.7rem; color:#cbd5e1;"></i>
                <span style="color:#1e293b; font-weight:600;">${title}</span>
            </div>`;
    }

    // Loading State
    contentCanvas.innerHTML = `
        <div style="height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#94a3b8;">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x"></i>
        </div>`;

    try {
        // Import Dinamis
        const module = await import(`../../modules/${route}.js?v=${Date.now()}`); 
        contentCanvas.innerHTML = '';
        
        if (module.init) {
            await module.init(contentCanvas, userProfile);
        } else {
            contentCanvas.innerHTML = `<div style="padding:20px;">Modul <b>${title}</b> siap (No Init).</div>`;
        }
    } catch (err) {
        console.error("Module Error:", err);
        contentCanvas.innerHTML = `
            <div style="padding:40px; text-align:center; color:#ef4444;">
                <h3>Gagal Memuat Modul</h3>
                <p>File <code>modules/${route}.js</code> tidak ditemukan atau error.</p>
            </div>`;
    }
}

// --- 6. GLOBAL EVENTS ---
function setupGlobalEvents() {
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btnLogout = document.getElementById('btn-logout');

    if (btnToggle) {
        btnToggle.onclick = () => {
            document.getElementById('sidebar').classList.add('open');
            if(overlay) overlay.classList.add('active');
        };
    }
    
    if (overlay) {
        overlay.onclick = () => {
            document.getElementById('sidebar').classList.remove('open');
            overlay.classList.remove('active');
        };
    }
    
    if (btnLogout) {
        btnLogout.onclick = async () => {
            if (confirm("Logout dari Admin Panel?")) {
                await supabase.auth.signOut();
                localStorage.clear(); // Bersihkan semua data rahasia
                window.location.replace('index.html');
            }
        };
    }
}

// Expose fungsi ke window agar bisa dipanggil dari HTML (misal breadcrumb)
window.loadAdminModule = loadModule;