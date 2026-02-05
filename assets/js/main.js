import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from './config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const contentCanvas = document.getElementById('content-canvas');
const breadcrumbContainer = document.getElementById('breadcrumb-container');
const sidebarMenuContainer = document.getElementById('sidebar-menu-container');

// State
let userProfile = null;

// --- 1. INISIALISASI ---
document.addEventListener('DOMContentLoaded', async () => {
    // Cek Login
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Ambil Profil User
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
    userProfile = profile || { name: 'User', role: 'guest' };
    
    // Tampilkan Nama di Header
    const headerName = document.getElementById('header-user-name');
    const headerRole = document.getElementById('header-user-role');
    
    const roleFormatted = userProfile.role === 'super_admin' ? 'Administrator' : 
                          userProfile.role === 'teacher' ? 'Guru' : userProfile.role;

    if(headerName) headerName.textContent = userProfile.name || session.user.email;
    if(headerRole) headerRole.textContent = roleFormatted;

    // Tampilkan di Sidebar Bawah (jika ada)
    const dispName = document.getElementById('display-name');
    const dispRole = document.getElementById('display-role');
    if(dispName) dispName.textContent = userProfile.name;
    if(dispRole) dispRole.textContent = roleFormatted;

    // Load Menu Sidebar
    await initSidebar();

    // Load Default Modul (Overview)
    loadModule('overview', 'Dashboard', 'Home');

    // Event Listeners
    setupGlobalEvents();
});

// --- 2. SIDEBAR & NAVIGASI ---
async function initSidebar() {
    sidebarMenuContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#999;"><i class="fa-solid fa-spinner fa-spin"></i></div>';

    try {
        // Ambil Kategori & Menu
        const { data: categories } = await supabase.from('menu_categories').select('*').in('target_app', ['admin_v2', 'all']).order('order_index');
        const { data: menus } = await supabase.from('app_menus').select('*').eq('is_active', true).order('order_index');

        sidebarMenuContainer.innerHTML = '';

        if (categories && menus) {
            categories.forEach(cat => {
                // --- PERBAIKAN UTAMA DI SINI ---
                // Filter menu berdasarkan ID Kategori (UUID), bukan lagi category_key
                const catMenus = menus.filter(m => m.category == cat.id);
                // -------------------------------
                
                // Filter menu berdasarkan ROLE user
                const allowedMenus = catMenus.filter(m => {
                    if (userProfile.role === 'super_admin') return true;
                    let allowedRoles = [];
                    try { allowedRoles = typeof m.allowed_roles === 'string' ? JSON.parse(m.allowed_roles) : m.allowed_roles; } catch(e){}
                    return Array.isArray(allowedRoles) && allowedRoles.includes(userProfile.role);
                });

                if (allowedMenus.length === 0) return;

                // Render Judul Kategori
                const groupTitle = document.createElement('div');
                groupTitle.className = 'nav-group-title';
                groupTitle.textContent = cat.title;
                sidebarMenuContainer.appendChild(groupTitle);

                // Render Item Menu
                allowedMenus.forEach(m => {
                    const item = document.createElement('div');
                    item.className = 'nav-item';
                    item.setAttribute('data-module', m.route); // Penting untuk shortcut dashboard

                    item.innerHTML = `<i class="${m.icon_class}"></i> <span>${m.title}</span>`;
                    
                    item.onclick = () => {
                        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                        item.classList.add('active');
                        loadModule(m.route, m.title, cat.title);
                        closeSidebar();
                    };

                    sidebarMenuContainer.appendChild(item);
                });
            });
        }
    } catch (err) {
        console.error("Gagal load sidebar:", err);
    }
}

// --- 3. MODUL LOADER ---
async function loadModule(route, title, category) {
    // Breadcrumb Interaktif
    breadcrumbContainer.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; font-size:0.9rem;">
            <span onclick="window.loadAdminModule('overview', 'Dashboard', 'Home')" 
                  style="cursor:pointer; color:#4d97ff; display:flex; align-items:center; gap:5px; font-weight:500;">
                <i class="fa-solid fa-house"></i> Home
            </span>
            ${route !== 'overview' ? `
                <i class="fa-solid fa-chevron-right" style="font-size:0.7rem; color:#cbd5e1;"></i>
                <span style="color:#64748b;">${category}</span>
                <i class="fa-solid fa-chevron-right" style="font-size:0.7rem; color:#cbd5e1;"></i>
                <span style="color:#1e293b; font-weight:600;">${title}</span>
            ` : ''}
        </div>
    `;

    contentCanvas.innerHTML = `
        <div style="height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#94a3b8;">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x"></i>
            <p style="margin-top:10px;">Memuat modul...</p>
        </div>
    `;

    try {
        const module = await import(`../../modules/${route}.js`); 
        contentCanvas.innerHTML = '';
        if (typeof module.init === 'function') {
            await module.init(contentCanvas);
        } else {
            contentCanvas.innerHTML = `<div style="padding:20px; color:orange;">Modul <b>${route}</b> tidak memiliki fungsi init().</div>`;
        }
    } catch (err) {
        console.error("Gagal import:", err);
        contentCanvas.innerHTML = `
            <div style="padding:40px; text-align:center; color:#ef4444;">
                <i class="fa-solid fa-triangle-exclamation fa-3x" style="margin-bottom:15px;"></i>
                <h3>Gagal Memuat File Modul</h3>
                <p>Browser tidak bisa menemukan file: <code>modules/${route}.js</code></p>
            </div>
        `;
    }
}

// --- 4. UTILS & EVENTS ---
function setupGlobalEvents() {
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const btnLogout = document.getElementById('btn-logout');

    if (btnToggle) {
        btnToggle.onclick = () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        };
    }
    if (sidebarOverlay) sidebarOverlay.onclick = closeSidebar;
    
    if (btnLogout) {
        btnLogout.onclick = async () => {
            if (confirm("Yakin ingin keluar?")) {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            }
        };
    }
}

function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}

window.loadAdminModule = loadModule;