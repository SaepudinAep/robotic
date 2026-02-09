/**
 * Project: Galeri Sekolah Module (Gate Module - UNLOCKED)
 * Features: Auto-Context Switching on Load
 * Update: REMOVED Hardcoded Role/Level Filtering.
 * Note: Now purely dynamic based on Academic Year & Semester.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let currentUserProfile = null;

// ==========================================
// 1. INITIALIZATION
// ==========================================
export async function init(canvas) {
    // Set konteks Sekolah
    localStorage.setItem("galleryContextMode", "SCHOOL");
    
    // Bersihkan sisa state Private
    localStorage.removeItem("activePrivateClassId");
    localStorage.removeItem("activePrivateClassName");

    injectStyles();

    // UI Render
    const activeAcademicYear = localStorage.getItem("activeAcademicYear") || "Semua Tahun";
    const activeSemester = localStorage.getItem("activeSemester")?.split(' (')[0].trim() || "Semua Semester";

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
    await loadClasses();
}

// ==========================================
// 2. GLOBAL DISPATCHER (KE GALERI MASTER)
// ==========================================
window.openClassGallery = (classId, className) => {
    // Simpan ID Kelas yang dipilih
    localStorage.setItem("activeClassId", classId);
    localStorage.setItem("activeClassName", className);
    
    // Dispatch ke Master
    if (window.dispatchModuleLoad) {
        window.dispatchModuleLoad('galeri-master', 'Dokumentasi Harian', className);
    } else {
        alert("Error: Fungsi navigasi tidak ditemukan.");
    }
};

// ==========================================
// 3. DATA LOGIC (UNLOCKED)
// ==========================================

async function loadUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('user_profiles')
        .select('id, role')
        .eq('id', user.id)
        .single();
    
    currentUserProfile = data;
}

async function loadClasses() {
    const grid = document.getElementById('gs-grid-container');
    const activeYear = localStorage.getItem("activeAcademicYear");
    const activeSem = localStorage.getItem("activeSemester")?.split(' (')[0].trim();

    try {
        let query = supabase.from('classes')
            .select(`
                id, 
                name, 
                level, 
                jadwal,
                schools!inner(name),
                academic_years!inner(year),
                semesters!inner(name)
            `);

        // Filter: Hanya berdasarkan Tahun & Semester Aktif
        if (activeYear) query = query.eq('academic_years.year', activeYear);
        if (activeSem) query = query.eq('semesters.name', activeSem);

        /* [REMOVED] FILTER LEVEL GURU DIHAPUS.
           Sekarang semua kelas yang aktif akan muncul.
           Akses kontrol diserahkan sepenuhnya ke kebijakan Database/Admin.
        */

        const { data: classes, error } = await query.order('name', { ascending: true });

        if (error) throw error;
        renderCards(classes || [], grid);

    } catch (e) {
        console.error("GS Error:", e);
        grid.innerHTML = `<div class="gs-error">Gagal memuat kelas: ${e.message}</div>`;
    }
}

// ==========================================
// 4. RENDER UI
// ==========================================
function renderCards(classes, container) {
    if (classes.length === 0) {
        container.innerHTML = `<div class="gs-empty"><p>Tidak ada kelas aktif pada periode ini.</p></div>`;
        return;
    }

    const themes = ['theme-blue', 'theme-orange', 'theme-green', 'theme-purple'];

    container.innerHTML = classes.map((c, index) => {
        const theme = themes[index % themes.length];
        
        let levelIcon = 'fa-shapes';
        if (c.level?.toLowerCase().includes('kiddy')) levelIcon = 'fa-child-reaching';
        if (c.level?.toLowerCase().includes('robot')) levelIcon = 'fa-robot';

        return `
            <div class="gs-card ${theme}">
                <div class="gs-card-content">
                    <span class="gs-school-label">${c.schools?.name}</span>
                    <h3 class="gs-class-name">${c.name}</h3>
                    
                    <div class="gs-card-meta">
                        <span class="tag-level"><i class="fa-solid ${levelIcon}"></i> ${c.level || 'Umum'}</span>
                        <span class="tag-time"><i class="fa-solid fa-clock"></i> ${c.jadwal || '-'}</span>
                    </div>
                </div>

                <button class="gs-card-action touch-48" onclick="window.openClassGallery('${c.id}', '${c.name}')">
                    <span>BUKA GALERI</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
                <div class="gs-card-icon-bg"><i class="fa-solid ${levelIcon}"></i></div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 5. STYLING
// ==========================================
function injectStyles() {
    if (document.getElementById('gs-css')) return;
    const s = document.createElement('style');
    s.id = 'gs-css';
    s.textContent = `
        /* BASE & HEADER */
        .gs-container { padding: 25px; font-family: 'Poppins', sans-serif; max-width: 1200px; margin: 0 auto; }
        .gs-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .gs-title-block h2 { margin: 0; font-size: 1.6rem; color: #1e293b; font-weight: 800; }
        .gs-title-block p { margin: 5px 0 0; color: #64748b; font-size: 0.9rem; }
        .gs-badge { background: #e0f2fe; color: #0284c7; padding: 8px 16px; border-radius: 50px; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

        /* GRID SYSTEM (Responsive) */
        .gs-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
            gap: 20px; 
        }
        
        @media (min-width: 768px) and (max-width: 1200px) { 
            .gs-grid { grid-template-columns: 1fr 1fr !important; padding: 0; }
        }
        
        @media (max-width: 767px) { 
            .gs-grid { grid-template-columns: 1fr !important; }
            .gs-container { padding: 15px; }
            .gs-header { flex-direction: column; align-items: flex-start; gap: 15px; }
        }

        /* CARD DESIGN */
        .touch-48 { min-height: 48px; min-width: 48px; border: none; cursor: pointer; border-radius: 12px; transition: 0.2s; }

        .gs-card {
            background: #fff; border-radius: 16px; overflow: hidden; position: relative; cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s; border: 2px solid transparent;
            display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;
        }
        .gs-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); border-color: #3b82f6; }

        .gs-card-content { padding: 20px; z-index: 2; position: relative; flex-grow: 1; }
        .gs-school-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; font-weight: 700; display: block; margin-bottom: 5px; }
        .gs-class-name { margin: 0 0 15px 0; font-size: 1.25rem; font-weight: 800; line-height: 1.3; }
        
        .gs-card-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .tag-level, .tag-time { 
            font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; 
            background: rgba(255,255,255,0.6); backdrop-filter: blur(4px);
            font-weight: 600; display: flex; align-items: center; gap: 5px;
        }
        
        .gs-card-action {
            width: 100%; border-radius: 0 0 16px 16px; padding: 12px 20px; font-size: 0.9rem; font-weight: 800;
            display: flex; justify-content: space-between; align-items: center; z-index: 2;
        }

        .gs-card-icon-bg { position: absolute; top: -10px; right: -20px; font-size: 8rem; opacity: 0.15; transform: rotate(15deg); z-index: 1; }

        /* THEMES */
        .theme-blue { box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15); }
        .theme-blue .gs-card-icon-bg { color: #3b82f6; }
        .theme-blue .gs-class-name { color: #1e3a8a; }
        .theme-blue .gs-card-action { background: linear-gradient(90deg, #eff6ff, #dbeafe); color: #2563eb; }

        .theme-orange { box-shadow: 0 4px 15px rgba(249, 115, 22, 0.15); }
        .theme-orange .gs-card-icon-bg { color: #f97316; }
        .theme-orange .gs-class-name { color: #7c2d12; }
        .theme-orange .gs-card-action { background: linear-gradient(90deg, #fff7ed, #ffedd5); color: #ea580c; }
        
        .theme-green { box-shadow: 0 4px 15px rgba(16, 185, 129, 0.15); }
        .theme-green .gs-card-icon-bg { color: #10b981; }
        .theme-green .gs-class-name { color: #064e3b; }
        .theme-green .gs-card-action { background: linear-gradient(90deg, #f0fdf4, #dcfce7); color: #059669; }

        .theme-purple { box-shadow: 0 4px 15px rgba(139, 92, 246, 0.15); }
        .theme-purple .gs-card-icon-bg { color: #8b5cf6; }
        .theme-purple .gs-class-name { color: #4c1d95; }
        .theme-purple .gs-card-action { background: linear-gradient(90deg, #f5f3ff, #ede9fe); color: #7c3aed; }

        .gs-empty { grid-column: 1 / -1; text-align: center; padding: 60px; background: #fff; border-radius: 12px; border: 2px dashed #e2e8f0; color: #94a3b8; font-weight: 600; font-size: 1.1rem; }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(s);
}