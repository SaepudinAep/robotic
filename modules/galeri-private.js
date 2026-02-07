/**
 * Project: Galeri Group Module
 * Target Table: class_private
 * Redirect: galeri-group
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let currentUserProfile = null;

// ==========================================
// 1. GLOBAL DISPATCHER
// ==========================================
window.openPrivateGroup = (id, name) => {
    // Simpan context private class ke LocalStorage
    localStorage.setItem("activePrivateClassId", id);
    localStorage.setItem("activePrivateClassName", name);
    
    // Redirect ke modul galeri-group
    // Menggunakan dispatchModuleLoad agar konsisten dengan galeri-sekolah
    if (window.dispatchModuleLoad) {
        window.dispatchModuleLoad('galeri-group', 'Dokumentasi Private', name);
    } else if (window.loadModule) {
        // Fallback jika dispatch tidak ada (untuk index.js versi public)
        window.loadModule('galeri-group');
    } else {
        alert("Error: Fungsi navigasi tidak ditemukan.");
    }
};

// ==========================================
// 2. INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="gp-container fade-in">
            <div class="gp-header">
                <div class="gp-title-block">
                    <h2>Galeri Private</h2>
                    <p>Kelas & Kelompok Belajar Privat</p>
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
// 3. DATA LOGIC
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
        // Query ke tabel class_private & relasi ke group_private
        let query = supabase.from('class_private')
            .select(`
                id, 
                name, 
                level, 
                group_id,
                group_private (
                    id,
                    owner,
                    address
                )
            `);

        // Filter Logic Berdasarkan Profile
        if (currentUserProfile && currentUserProfile.role !== 'super_admin') {
            
            // Jika user terikat pada Group tertentu (Misal: Guru/Owner Private)
            if (currentUserProfile.group_id) {
                query = query.eq('group_id', currentUserProfile.group_id);
            }
            // Jika user terikat pada Kelas Private tertentu (Misal: Siswa)
            else if (currentUserProfile.class_private_id) {
                query = query.eq('id', currentUserProfile.class_private_id);
            }
        }

        const { data: classes, error } = await query.order('name', { ascending: true });

        if (error) throw error;
        renderCards(classes || [], grid);

    } catch (e) {
        console.error("GP Error:", e);
        grid.innerHTML = `<div class="gp-error">Gagal memuat data: ${e.message}</div>`;
    }
}

// ==========================================
// 4. RENDER UI
// ==========================================
function renderCards(classes, container) {
    if (classes.length === 0) {
        container.innerHTML = `
            <div class="gp-empty">
                <img src="https://img.icons8.com/fluency/96/null/conference-call.png"/>
                <p>Tidak ada data kelas private.</p>
            </div>`;
        return;
    }

    // Tema warna khusus Private (Nuansa Gold/Dark/Purple)
    const themes = ['theme-gold', 'theme-dark', 'theme-royal', 'theme-ocean'];

    container.innerHTML = classes.map((c, index) => {
        const theme = themes[index % themes.length];
        const ownerName = c.group_private?.owner || 'Private Group';
        
        // Ikon Level
        let levelIcon = 'fa-user-graduate';
        if (c.level === 'Kiddy') levelIcon = 'fa-child';
        if (c.level === 'Robotic') levelIcon = 'fa-microchip';

        return `
            <div class="gp-card ${theme}" onclick="window.openPrivateGroup('${c.id}', '${c.name}')">
                <div class="gp-card-icon-bg">
                    <i class="fa-solid ${levelIcon}"></i>
                </div>
                
                <div class="gp-card-content">
                    <span class="gp-owner-label"><i class="fa-solid fa-crown"></i> ${ownerName}</span>
                    <h3 class="gp-class-name">${c.name}</h3>
                    
                    <div class="gp-card-meta">
                        <span class="tag-level"><i class="fa-solid fa-layer-group"></i> ${c.level || 'General'}</span>
                    </div>
                </div>

                <div class="gp-card-action">
                    <span>Lihat Sesi</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 5. STYLING
// ==========================================
function injectStyles() {
    if (document.getElementById('gp-css')) return;
    const s = document.createElement('style');
    s.id = 'gp-css';
    s.textContent = `
        /* CONTAINER */
        .gp-container { padding: 20px; font-family: 'Poppins', sans-serif; max-width: 1200px; margin: 0 auto; }
        
        /* HEADER */
        .gp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .gp-title-block h2 { margin: 0; font-size: 1.8rem; color: #1e293b; font-weight: 700; }
        .gp-title-block p { margin: 5px 0 0; color: #64748b; font-size: 0.95rem; }

        /* GRID SYSTEM */
        .gp-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
            gap: 20px; 
        }
        @media (max-width: 992px) { .gp-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px) { 
            .gp-grid { grid-template-columns: 1fr; }
            .gp-header { flex-direction: column; align-items: flex-start; } 
        }

        /* CARD DESIGN */
        .gp-card {
            background: #fff;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid rgba(0,0,0,0.05);
            display: flex; flex-direction: column; justify-content: space-between;
            min-height: 160px;
        }
        .gp-card:active { transform: scale(0.98); }
        .gp-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }

        .gp-card-content { padding: 20px; z-index: 2; position: relative; flex-grow: 1; }
        .gp-owner-label { font-size: 0.75rem; font-weight: 700; opacity: 0.8; display: block; margin-bottom: 8px; letter-spacing: 0.5px; text-transform: uppercase; }
        .gp-class-name { margin: 0 0 15px 0; font-size: 1.3rem; font-weight: 800; line-height: 1.2; }
        
        .gp-card-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .gp-card-meta span { 
            font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; 
            background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);
            font-weight: 600; display: flex; align-items: center; gap: 5px;
            border: 1px solid rgba(255,255,255,0.3);
        }

        .gp-card-icon-bg {
            position: absolute; top: -10px; right: -20px;
            font-size: 7rem; opacity: 0.1; transform: rotate(15deg); z-index: 1;
        }

        .gp-card-action {
            padding: 12px 20px; font-size: 0.8rem; font-weight: 700;
            display: flex; justify-content: space-between; align-items: center; z-index: 2;
        }

        /* THEMES (Private Look) */
        /* Gold */
        .theme-gold { box-shadow: 0 4px 15px rgba(217, 119, 6, 0.15); background: linear-gradient(135deg, #fffbeb, #fef3c7); }
        .theme-gold .gp-card-icon-bg { color: #d97706; }
        .theme-gold .gp-owner-label { color: #b45309; }
        .theme-gold .gp-class-name { color: #78350f; }
        .theme-gold .gp-card-action { background: rgba(255,255,255,0.5); color: #92400e; }

        /* Dark */
        .theme-dark { box-shadow: 0 4px 15px rgba(30, 41, 59, 0.15); background: linear-gradient(135deg, #f8fafc, #e2e8f0); }
        .theme-dark .gp-card-icon-bg { color: #334155; }
        .theme-dark .gp-owner-label { color: #475569; }
        .theme-dark .gp-class-name { color: #0f172a; }
        .theme-dark .gp-card-action { background: rgba(255,255,255,0.5); color: #1e293b; }

        /* Royal Purple */
        .theme-royal { box-shadow: 0 4px 15px rgba(124, 58, 237, 0.15); background: linear-gradient(135deg, #f5f3ff, #ddd6fe); }
        .theme-royal .gp-card-icon-bg { color: #7c3aed; }
        .theme-royal .gp-owner-label { color: #6d28d9; }
        .theme-royal .gp-class-name { color: #4c1d95; }
        .theme-royal .gp-card-action { background: rgba(255,255,255,0.5); color: #5b21b6; }

        /* Ocean */
        .theme-ocean { box-shadow: 0 4px 15px rgba(6, 182, 212, 0.15); background: linear-gradient(135deg, #ecfeff, #cffafe); }
        .theme-ocean .gp-card-icon-bg { color: #06b6d4; }
        .theme-ocean .gp-owner-label { color: #0891b2; }
        .theme-ocean .gp-class-name { color: #155e75; }
        .theme-ocean .gp-card-action { background: rgba(255,255,255,0.5); color: #0e7490; }

        /* UTILS */
        .gp-loading, .gp-empty, .gp-error { 
            grid-column: 1 / -1; text-align: center; padding: 40px; 
            background: #f8fafc; border-radius: 12px; border: 2px dashed #e2e8f0; 
            color: #94a3b8; font-weight: 500;
        }
        .gp-empty img { width: 80px; margin-bottom: 10px; opacity: 0.6; }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(s);
}