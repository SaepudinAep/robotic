/**
 * Project: Robopanda Admin V2 (SPA Module)
 * Module: Overview / Dashboard
 * Description: Menampilkan Statistik, Info Semester, dan Navigasi Grid (UUID Support)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function init(canvas) {
    // 1. RENDER KERANGKA UI (Skeleton)
    canvas.innerHTML = `
        <div style="max-width: 1100px; margin: 0 auto; padding-bottom: 50px;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                <div>
                    <h2 style="margin:0; color:#333; font-family:'Fredoka One';">Dashboard</h2>
                    <p style="margin:5px 0 0 0; color:#666; font-size:0.9rem;">Ringkasan aktivitas sistem</p>
                </div>
                <div id="semester-badge" style="background:#e0f2fe; color:#0284c7; padding:8px 15px; border-radius:20px; font-weight:bold; font-size:0.85rem; border:1px solid #bae6fd; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <i class="fa-solid fa-calendar-day"></i> Memuat Periode...
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display:flex; align-items:center; gap:15px; border-left:4px solid #4d97ff;">
                    <div style="width:50px; height:50px; background:#eff6ff; color:#4d97ff; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                        <i class="fa-solid fa-school"></i>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Total Sekolah</div>
                        <div id="count-sekolah" style="font-size: 1.5rem; font-weight: bold; color: #1e293b;">-</div>
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display:flex; align-items:center; gap:15px; border-left:4px solid #10b981;">
                    <div style="width:50px; height:50px; background:#ecfdf5; color:#10b981; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                        <i class="fa-solid fa-chalkboard-user"></i>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Total Kelas</div>
                        <div id="count-kelas" style="font-size: 1.5rem; font-weight: bold; color: #1e293b;">-</div>
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display:flex; align-items:center; gap:15px; border-left:4px solid #f59e0b;">
                    <div style="width:50px; height:50px; background:#fffbeb; color:#f59e0b; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Total Siswa</div>
                        <div id="count-siswa" style="font-size: 1.5rem; font-weight: bold; color: #1e293b;">-</div>
                    </div>
                </div>
            </div>

            <div id="grid-menu-container">
                <div style="text-align:center; padding:40px; color:#999;">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Memuat Menu...
                </div>
            </div>
        </div>
    `;

    // 2. JALANKAN LOGIKA
    calculateSemester();
    await loadDashboardData();
}

// --- LOGIKA 1: SEMESTER OTOMATIS ---
function calculateSemester() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();
    let semesterName, academicYear;

    if (month >= 7 && month <= 12) {
        semesterName = "Semester 1 (Ganjil)";
        academicYear = `${year}/${year + 1}`;
    } else {
        semesterName = "Semester 2 (Genap)";
        academicYear = `${year - 1}/${year}`;
    }

    // Update UI
    const badge = document.getElementById('semester-badge');
    if (badge) badge.innerHTML = `<i class="fa-solid fa-calendar-check"></i> ${semesterName} ${academicYear}`;
    
    // Simpan ke LocalStorage (Untuk modul lain)
    localStorage.setItem("activeAcademicYear", academicYear);
    localStorage.setItem("activeSemester", semesterName);
}

// --- LOGIKA 2: LOAD DATA (STATS & MENU) ---
async function loadDashboardData() {
    try {
        // A. Cek User
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return; 

        // B. Ambil Profile (Role & Level)
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, level_id')
            .eq('id', session.user.id)
            .single();

        const userRole = profile ? profile.role : 'guest';
        const userLevelId = profile ? profile.level_id : null;

        // C. Fetch Data Paralel (Efisien)
        const [resSekolah, resKelas, resSiswa, resCat, resMenu] = await Promise.all([
            // Stats
            supabase.from('schools').select('*', { count: 'exact', head: true }),
            supabase.from('classes').select('*', { count: 'exact', head: true }),
            supabase.from('students').select('*', { count: 'exact', head: true }),
            // Menu
            supabase.from('menu_categories').select('*').in('target_app', ['admin_v2', 'all']).order('order_index'),
            supabase.from('app_menus').select('*').eq('is_active', true).order('order_index')
        ]);

        // D. Update Statistik UI
        if (document.getElementById('count-sekolah')) document.getElementById('count-sekolah').textContent = resSekolah.count || 0;
        if (document.getElementById('count-kelas')) document.getElementById('count-kelas').textContent = resKelas.count || 0;
        if (document.getElementById('count-siswa')) document.getElementById('count-siswa').textContent = resSiswa.count || 0;

        // E. Render Menu Grid
        renderGridMenu(resCat.data || [], resMenu.data || [], userRole, userLevelId);

    } catch (err) {
        console.error("Dashboard Error:", err);
        document.getElementById('grid-menu-container').innerHTML = `<div style="color:red; text-align:center;">Gagal memuat dashboard.</div>`;
    }
}

// --- LOGIKA 3: RENDER GRID (UUID + PERMISSION CHECK) ---
function renderGridMenu(categories, menus, userRole, userLevelId) {
    const container = document.getElementById('grid-menu-container');
    container.innerHTML = '';
    
    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align:center;">Tidak ada kategori menu.</p>';
        return;
    }

    categories.forEach(cat => {
        // --- [FIX] FILTER MENGGUNAKAN UUID (m.category == cat.id) ---
        let categoryMenus = menus.filter(m => m.category == cat.id);

        // --- FILTER PERMISSION (Role & Level) ---
        const allowedMenus = categoryMenus.filter(menu => {
            // 1. Cek Role (Parse JSON dulu)
            let allowedRoles = [];
            try { 
                allowedRoles = typeof menu.allowed_roles === 'string' 
                    ? JSON.parse(menu.allowed_roles) 
                    : menu.allowed_roles; 
            } catch (e) { allowedRoles = []; }
            
            if (!Array.isArray(allowedRoles) || !allowedRoles.includes(userRole)) {
                // Kecuali Super Admin (Dewa)
                if (userRole !== 'super_admin') return false;
            }

            // 2. Cek Level (Khusus Guru)
            if (userRole === 'teacher') {
                let allowedLevels = [];
                try {
                    allowedLevels = typeof menu.allowed_level_ids === 'string'
                        ? JSON.parse(menu.allowed_level_ids)
                        : menu.allowed_level_ids;
                } catch(e) { allowedLevels = []; }

                // Jika level dibatasi, cek level user
                if (Array.isArray(allowedLevels) && allowedLevels.length > 0) {
                    if (!allowedLevels.includes(userLevelId)) return false;
                }
            }
            
            return true;
        });

        // Jika tidak ada menu yang lolos filter, skip kategori ini
        if (allowedMenus.length === 0) return;

        // --- STYLING WARNA (Logic Bapak) ---
        // Kita gunakan style visual berbeda berdasarkan Key Kategori
        let accentColor = '#64748b'; // Default (Admin)
        let iconColor = '#cbd5e1';
        
        if (cat.category_key.includes('sekolah')) {
            accentColor = '#4d97ff'; // Biru
        } else if (cat.category_key.includes('private')) {
            accentColor = '#f59e0b'; // Orange
        } else if (cat.category_key.includes('finance')) {
            accentColor = '#10b981'; // Hijau
        }

        // --- RENDER HTML ---
        container.innerHTML += `
            <div style="margin-bottom: 35px; animation: fadeIn 0.5s;">
                <h3 style="font-family:'Fredoka One'; color:#333; margin-bottom:15px; border-left:5px solid ${accentColor}; padding-left:15px; font-size:1.1rem;">
                    ${cat.title}
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px;">
                    ${allowedMenus.map(m => `
                        <div class="dashboard-card" 
                             onclick="window.dispatchModuleLoad('${m.route}', '${m.title}', '${cat.title}')"
                             style="cursor:pointer; background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px; text-align:center; transition:0.2s; position:relative; overflow:hidden;">
                            
                            <div style="position:absolute; top:0; left:0; width:100%; height:4px; background:${accentColor};"></div>
                            
                            <div style="margin-bottom:15px; color:${accentColor}; font-size:2rem;">
                                <i class="${m.icon_class || 'fa-solid fa-cube'}"></i>
                            </div>
                            <div style="font-weight:bold; color:#334155; font-size:0.95rem;">${m.title}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    // Inject Hover Effect CSS (Biar cantik)
    const style = document.createElement('style');
    style.textContent = `
        .dashboard-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); border-color:${'#4d97ff'}; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    `;
    container.appendChild(style);
}

// Global Dispatcher (Sama seperti sebelumnya, wajib ada agar main.js merespon)
window.dispatchModuleLoad = (route, title, category) => {
    if (window.loadAdminModule) {
        window.loadAdminModule(route, title, category);
        
        // Update Sidebar Active State
        const sidebarItems = document.querySelectorAll('.nav-item');
        sidebarItems.forEach(el => el.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-item[data-module="${route}"]`);
        if(activeBtn) activeBtn.classList.add('active');
    } else {
        console.error("Fungsi loadAdminModule tidak ditemukan.");
    }
};