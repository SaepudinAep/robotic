/**
 * Project: Galeri Sekolah Module (Class Selection)
 * Features: Role-based filtering, Colorful Cards, Responsive 2-Column Grid
 * Redirect: galeri-harian
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global untuk modul ini
let currentUserProfile = null;

// ==========================================
// 1. GLOBAL DISPATCHER
// ==========================================
// Fungsi ini dipanggil saat Card diklik untuk pindah ke galeri-harian
window.openClassGallery = (classId, className) => {
    // Simpan context kelas yang dipilih
    localStorage.setItem("activeClassId", classId);
    localStorage.setItem("activeClassName", className);
    
    // Redirect ke modul galeri-harian (sesuai request)
    if (window.dispatchModuleLoad) {
        window.dispatchModuleLoad('galeri-harian', 'Dokumentasi Harian', className);
    } else {
        alert("Error: Fungsi dispatchModuleLoad tidak ditemukan di index.html");
    }
};

// ==========================================
// 2. INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles();

    // Ambil Data Context dari LocalStorage (diset di Dashboard/Login)
    const activeAcademicYear = localStorage.getItem("activeAcademicYear") || "Semua Tahun";
    const activeSemester = localStorage.getItem("activeSemester") || "Semua Semester";

    // Render Skeleton (Kerangka Awal)
    canvas.innerHTML = `
        <div class="gs-container fade-in">
            <div class="gs-header">
                <div class="gs-title-block">
                    <h2>Galeri Sekolah</h2>
                    <p>Pilih kelas untuk kelola dokumentasi</p>
                </div>
                <div class="gs-badge">
                    <i class="fa-solid fa-calendar-check"></i> 
                    <span>${activeSemester} ${activeAcademicYear}</span>
                </div>
            </div>

            <div id="gs-grid-container" class="gs-grid">
                <div class="gs-loading">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data kelas...
                </div>
            </div>
        </div>
    `;

    await loadUserProfile();
    await loadClasses(canvas);
}

// ==========================================
// 3. DATA LOGIC (Role & Filter)
// ==========================================

async function loadUserProfile() {
    // Cek user yang login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Ambil detail profile untuk tahu Role & School ID
    const { data } = await supabase.from('user_profiles')
        .select('id, role, school_id, group_id')
        .eq('id', user.id)
        .single();
    
    currentUserProfile = data;
}

async function loadClasses(canvas) {
    const grid = document.getElementById('gs-grid-container');
    const activeYear = localStorage.getItem("activeAcademicYear");
    const activeSem = localStorage.getItem("activeSemester")?.split(' (')[0].trim(); // Bersihkan format jika ada kurung

    try {
        // Query Dasar: Ambil kelas + Relasi Sekolah, Tahun, Semester
        let query = supabase.from('classes')
            .select(`
                id, 
                name, 
                level, 
                jadwal,
                schools!inner(id, name),
                academic_years!inner(year),
                semesters!inner(name)
            `);

        // Filter 1: Wajib sesuai Tahun & Semester Aktif
        if (activeYear) query = query.eq('academic_years.year', activeYear);
        if (activeSem) query = query.eq('semesters.name', activeSem);

        // Filter 2: Berdasarkan Role (Security)
        if (currentUserProfile) {
            const { role, school_id } = currentUserProfile;
            
            // Jika PIC atau TEACHER, hanya tampilkan kelas di sekolah mereka
            if ((role === 'pic' || role === 'teacher') && school_id) {
                query = query.eq('school_id', school_id);
            }
            // Super Admin melihat semua (tidak ada filter tambahan)
        }

        const { data: classes, error } = await query.order('name', { ascending: true });

        if (error) throw error;
        renderCards(classes || [], grid);

    } catch (e) {
        console.error("GS Error:", e);
        grid.innerHTML = `<div class="gs-error">Gagal memuat kelas: ${e.message}</div>`;
    }
}

// ==========================================
// 4. RENDER UI (Colorful Cards)
// ==========================================
function renderCards(classes, container) {
    if (classes.length === 0) {
        container.innerHTML = `
            <div class="gs-empty">
                <img src="https://img.icons8.com/fluency/96/null/classroom.png"/>
                <p>Tidak ada kelas aktif pada periode ini.</p>
            </div>`;
        return;
    }

    // Pola warna yang akan berulang
    const themes = ['theme-blue', 'theme-orange', 'theme-green', 'theme-purple'];

    container.innerHTML = classes.map((c, index) => {
        // Pilih warna berdasarkan urutan (Modulo)
        const theme = themes[index % themes.length];
        
        // Tentukan Ikon Level
        let levelIcon = 'fa-shapes';
        if (c.level === 'Kiddy') levelIcon = 'fa-child-reaching';
        if (c.level === 'Beginner') levelIcon = 'fa-robot';

        return `
            <div class="gs-card ${theme}" onclick="window.openClassGallery('${c.id}', '${c.name}')">
                <div class="gs-card-icon-bg">
                    <i class="fa-solid ${levelIcon}"></i>
                </div>
                
                <div class="gs-card-content">
                    <span class="gs-school-label">${c.schools?.name}</span>
                    <h3 class="gs-class-name">${c.name}</h3>
                    
                    <div class="gs-card-meta">
                        <span class="tag-level"><i class="fa-solid fa-layer-group"></i> ${c.level || 'Umum'}</span>
                        <span class="tag-time"><i class="fa-solid fa-clock"></i> ${c.jadwal || '-'}</span>
                    </div>
                </div>

                <div class="gs-card-action">
                    <span>Buka Galeri</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 5. STYLING (CSS Injection)
// ==========================================
function injectStyles() {
    if (document.getElementById('gs-css')) return;
    const s = document.createElement('style');
    s.id = 'gs-css';
    s.textContent = `
        /* CONTAINER */
        .gs-container { padding: 20px; font-family: 'Poppins', sans-serif; max-width: 1200px; margin: 0 auto; }
        
        /* HEADER */
        .gs-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .gs-title-block h2 { margin: 0; font-size: 1.8rem; color: #1e293b; font-weight: 700; }
        .gs-title-block p { margin: 5px 0 0; color: #64748b; font-size: 0.95rem; }
        
        .gs-badge { 
            background: #e0f2fe; color: #0284c7; 
            padding: 8px 16px; border-radius: 50px; 
            font-size: 0.85rem; font-weight: 600; 
            display: flex; align-items: center; gap: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        /* GRID SYSTEM (Responsive 2 Kolom Tablet/HP) */
        .gs-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
            gap: 20px; 
        }
        
        /* KUNCI 2 KOLOM DI LAYAR KECIL (Sesuai Request) */
        @media (max-width: 992px) {
            .gs-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
            .gs-header { flex-direction: column; gap: 15px; }
            /* Opsional: Di HP sangat kecil (dibawah 480px) tetap 2 kolom atau jadi 1? 
               Biasanya 1fr 1fr di HP kecil terlalu sempit, tapi jika request wajib 2 kolom, biarkan kode diatas. */
        }

        /* CARD DESIGN */
        .gs-card {
            background: #fff;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 160px;
        }
        .gs-card:active { transform: scale(0.98); }
        .gs-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }

        /* CARD CONTENT */
        .gs-card-content { padding: 20px; z-index: 2; position: relative; flex-grow: 1; }
        .gs-school-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; font-weight: 700; display: block; margin-bottom: 5px; }
        .gs-class-name { margin: 0 0 15px 0; font-size: 1.25rem; font-weight: 800; line-height: 1.3; }
        
        .gs-card-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .gs-card-meta span { 
            font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; 
            background: rgba(255,255,255,0.6); backdrop-filter: blur(4px);
            font-weight: 600; display: flex; align-items: center; gap: 5px;
        }

        /* DECORATIVE ICON BG */
        .gs-card-icon-bg {
            position: absolute;
            top: -10px; right: -20px;
            font-size: 6rem;
            opacity: 0.15;
            transform: rotate(15deg);
            z-index: 1;
        }

        /* CARD FOOTER ACTION */
        .gs-card-action {
            padding: 12px 20px;
            font-size: 0.8rem; font-weight: 700;
            display: flex; justify-content: space-between; align-items: center;
            z-index: 2;
        }

        /* COLOR THEMES */
        /* Blue Theme */
        .theme-blue { box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15); }
        .theme-blue .gs-card-icon-bg { color: #3b82f6; }
        .theme-blue .gs-school-label { color: #2563eb; }
        .theme-blue .gs-class-name { color: #1e3a8a; }
        .theme-blue .gs-card-action { background: linear-gradient(90deg, #eff6ff, #dbeafe); color: #2563eb; }

        /* Orange Theme */
        .theme-orange { box-shadow: 0 4px 15px rgba(249, 115, 22, 0.15); }
        .theme-orange .gs-card-icon-bg { color: #f97316; }
        .theme-orange .gs-school-label { color: #c2410c; }
        .theme-orange .gs-class-name { color: #7c2d12; }
        .theme-orange .gs-card-action { background: linear-gradient(90deg, #fff7ed, #ffedd5); color: #ea580c; }

        /* Green Theme */
        .theme-green { box-shadow: 0 4px 15px rgba(16, 185, 129, 0.15); }
        .theme-green .gs-card-icon-bg { color: #10b981; }
        .theme-green .gs-school-label { color: #059669; }
        .theme-green .gs-class-name { color: #064e3b; }
        .theme-green .gs-card-action { background: linear-gradient(90deg, #f0fdf4, #dcfce7); color: #059669; }

        /* Purple Theme */
        .theme-purple { box-shadow: 0 4px 15px rgba(139, 92, 246, 0.15); }
        .theme-purple .gs-card-icon-bg { color: #8b5cf6; }
        .theme-purple .gs-school-label { color: #7c3aed; }
        .theme-purple .gs-class-name { color: #4c1d95; }
        .theme-purple .gs-card-action { background: linear-gradient(90deg, #f5f3ff, #ede9fe); color: #7c3aed; }

        /* UTILS */
        .gs-loading, .gs-empty, .gs-error { 
            grid-column: 1 / -1; 
            text-align: center; padding: 40px; 
            background: #f8fafc; border-radius: 12px; border: 2px dashed #e2e8f0; 
            color: #94a3b8; font-weight: 500;
        }
        .gs-empty img { width: 80px; margin-bottom: 10px; opacity: 0.6; }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(s);
}