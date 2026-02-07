/**
 * Project: Galeri Private Module (Gate Module - LOGIC FIXED)
 * Fix: Auto-sets 'PRIVATE' context on init & cleans up School IDs.
 * UI: Forced 2-Column Grid for Tablets (Aggressive Fix).
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let currentUserProfile = null;

// ==========================================
// 1. INITIALIZATION (LOGIC FIXED)
// ==========================================
export async function init(canvas) {
    // [LOGIC FIX] Langsung set konteks saat modul dibuka
    // Sistem langsung tahu ini wilayah Private.
    localStorage.setItem("galleryContextMode", "PRIVATE");
    
    // [SAFETY] Hapus sisa ID Sekolah agar Galeri Master tidak bingung (State Hygiene)
    localStorage.removeItem("activeClassId");
    localStorage.removeItem("activeClassName");

    injectStyles();

    canvas.innerHTML = `
        <div class="gp-container fade-in">
            <div class="gp-header">
                <div class="gp-title-block">
                    <h2>Galeri Private</h2>
                    <p>Kelas & Kelompok Belajar Privat (Pilih Kartu)</p>
                </div>
            </div>

            <div id="gp-grid-container" class="gp-grid">
                <div class="gp-loading">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data private...
                </div>
            </div>
        </div>
    `;

    await loadUserProfile();
    await loadPrivateClasses();
}

// ==========================================
// 2. GLOBAL DISPATCHER (KE GALERI MASTER)
// ==========================================
window.openPrivateGroup = (id, name) => {
    // Simpan ID Private yang dipilih
    localStorage.setItem("activePrivateClassId", id);
    localStorage.setItem("activePrivateClassName", name);
    
    // Dispatch ke Master (Mode sudah aman karena diset di init)
    if (window.dispatchModuleLoad) {
        window.dispatchModuleLoad('galeri-master', 'Dokumentasi Private', name); 
    } else {
        alert("Error: Fungsi navigasi tidak ditemukan.");
    }
};

// ==========================================
// 3. DATA LOGIC (Security Filter)
// ==========================================

async function loadUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('user_profiles')
        .select('id, role, group_id, class_private_id')
        .eq('id', user.id)
        .single();
    
    currentUserProfile = data;
}

async function loadPrivateClasses() {
    const grid = document.getElementById('gp-grid-container');

    try {
        let query = supabase.from('class_private')
            .select(`
                id, 
                name, 
                level, 
                group_id,
                group_private (owner)
            `);

        // Filter Data Sesuai Hak Akses
        if (currentUserProfile && currentUserProfile.role !== 'super_admin') {
            if (currentUserProfile.group_id) {
                // Admin Group: Lihat semua kelas dalam grupnya
                query = query.eq('group_id', currentUserProfile.group_id);
            }
            else if (currentUserProfile.class_private_id) {
                // Guru/Admin Kelas Spesifik: Hanya lihat kelas yang ditugaskan
                query = query.eq('id', currentUserProfile.class_private_id);
            }
        }

        const { data: classes, error } = await query.order('name', { ascending: true });

        if (error) throw error;
        renderCards(classes || [], grid);

    } catch (e) {
        grid.innerHTML = `<div class="gp-error">Gagal memuat data: ${e.message}</div>`;
    }
}

// ==========================================
// 4. RENDER UI (Touch-Optimized)
// ==========================================
function renderCards(classes, container) {
    if (classes.length === 0) {
        container.innerHTML = `<div class="gp-empty"><p>Tidak ada data kelas private yang terikat dengan akun Anda.</p></div>`;
        return;
    }

    const themes = ['theme-gold', 'theme-dark', 'theme-royal', 'theme-ocean'];

    container.innerHTML = classes.map((c, index) => {
        const theme = themes[index % themes.length];
        const ownerName = c.group_private?.owner || 'Private Group';
        
        let levelIcon = 'fa-user-graduate';
        if (c.level?.toLowerCase().includes('kiddy')) levelIcon = 'fa-child';
        if (c.level?.toLowerCase().includes('robot')) levelIcon = 'fa-microchip';
        if (c.level?.toLowerCase().includes('terapi')) levelIcon = 'fa-brain';

        return `
            <div class="gp-card ${theme}">
                <div class="gp-card-content">
                    <span class="gp-owner-label"><i class="fa-solid fa-crown"></i> ${ownerName}</span>
                    <h3 class="gp-class-name">${c.name}</h3>
                    
                    <div class="gp-card-meta">
                        <span class="tag-level"><i class="fa-solid ${levelIcon}"></i> ${c.level || 'General'}</span>
                    </div>
                </div>
                
                <button class="gp-card-action touch-48" onclick="window.openPrivateGroup('${c.id}', '${c.name}')">
                    <span>LIHAT SESI</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
                <div class="gp-card-icon-bg"><i class="fa-solid ${levelIcon}"></i></div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 5. STYLING (GRID FIX V4)
// ==========================================
function injectStyles() {
    if (document.getElementById('gp-css')) return;
    const s = document.createElement('style');
    s.id = 'gp-css';
    s.textContent = `
        /* BASE & GRID */
        .gp-container { padding: 25px; font-family: 'Poppins', sans-serif; max-width: 1200px; margin: 0 auto; width: 100%; }
        .gp-header { margin-bottom: 30px; }
        .gp-title-block h2 { margin: 0; font-size: 1.6rem; color: #1e293b; font-weight: 800; }
        .gp-title-block p { margin: 5px 0 0; color: #64748b; font-size: 0.9rem; }
        
        /* GRID FIX V4: AGGRESSIVE CSS FOR TABLET 2-COLUMNS */
        .gp-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
            gap: 20px; 
            width: 100%; 
        }
        
        /* TABLET FIX (Layar 768px - 1200px): Wajib 2 Kolom */
        @media (min-width: 768px) and (max-width: 1200px) { 
            .gp-grid { 
                grid-template-columns: 1fr 1fr !important; /* FORCED 2 COLUMNS */
                padding: 0; 
            }
        }
        
        /* MOBILE FIX (Layar < 768px): Wajib 1 Kolom */
        @media (max-width: 767px) { 
            .gp-grid { 
                grid-template-columns: 1fr !important; 
            }
        }

        /* CARD DESIGN & TOUCH TARGETS */
        .gp-card {
            background: #fff;
            border-radius: 18px;
            overflow: hidden;
            position: relative;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 2px solid transparent;
            display: flex; flex-direction: column; justify-content: space-between;
            min-height: 180px;
        }
        .gp-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); border-color: #3b82f6; }

        .gp-card-content { padding: 20px; z-index: 2; position: relative; flex-grow: 1; }
        .gp-owner-label { font-size: 0.7rem; font-weight: 700; opacity: 0.8; display: block; margin-bottom: 8px; letter-spacing: 0.5px; text-transform: uppercase; }
        .gp-class-name { margin: 0 0 15px 0; font-size: 1.25rem; font-weight: 800; line-height: 1.2; }
        
        .tag-level { 
            font-size: 0.75rem; padding: 4px 10px; border-radius: 8px; 
            font-weight: 600; display: flex; align-items: center; gap: 5px;
        }
        
        .touch-48 { min-height: 48px; min-width: 48px; border: none; cursor: pointer; border-radius: 12px; transition: 0.2s; }
        
        .gp-card-action {
            background: rgba(0,0,0,0.05);
            width: 100%;
            border-radius: 0 0 16px 16px;
            padding: 12px 25px;
            font-size: 0.9rem; font-weight: 800;
            display: flex; justify-content: space-between; align-items: center;
            z-index: 2;
        }
        .gp-card-action:hover { opacity: 0.9; }

        .gp-card-icon-bg {
            position: absolute; top: -10px; right: -20px;
            font-size: 8rem; opacity: 0.1; transform: rotate(15deg); z-index: 1;
        }

        /* THEMES */
        .theme-gold { background: linear-gradient(135deg, #fffbeb, #fef3c7); }
        .theme-gold .gp-card-icon-bg { color: #d97706; }
        .theme-gold .gp-class-name { color: #78350f; }
        .theme-gold .gp-card-action { background: #fde68a; color: #92400e; }
        .theme-gold .tag-level { background: #fef9c3; color: #b45309; }

        .theme-dark { background: linear-gradient(135deg, #f8fafc, #e2e8f0); }
        .theme-dark .gp-card-icon-bg { color: #334155; }
        .theme-dark .gp-class-name { color: #0f172a; }
        .theme-dark .gp-card-action { background: #cbd5e1; color: #1e293b; }
        .theme-dark .tag-level { background: #f1f5f9; color: #475569; }

        .theme-royal { background: linear-gradient(135deg, #f5f3ff, #ddd6fe); }
        .theme-royal .gp-card-icon-bg { color: #7c3aed; }
        .theme-royal .gp-class-name { color: #4c1d95; }
        .theme-royal .gp-card-action { background: #c4b5fd; color: #5b21b6; }
        .theme-royal .tag-level { background: #eef2ff; color: #6d28d9; }

        .gp-empty { grid-column: 1 / -1; text-align: center; padding: 60px; background: #fff; border-radius: 12px; border: 2px dashed #e2e8f0; color: #94a3b8; font-weight: 600; font-size: 1.1rem; }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(s);
}