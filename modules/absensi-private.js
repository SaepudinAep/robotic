/**
 * Project: Absensi Private Module (SPA)
 * Description: Daftar kelas private dengan tampilan kartu warna-warni.
 * Filename: modules/absensi-private.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Inject CSS Khusus (Colorful Cards)
    injectStyles();

    // 2. Render HTML Structure
    canvas.innerHTML = `
        <div class="ap-container">
            <div class="ap-header">
                <div>
                    <h2>Absensi Private</h2>
                    <p>Pilih kelas untuk mulai monitoring</p>
                </div>
                <button id="btn-dashboard" class="btn-outline">
                    <i class="fas fa-home"></i> Dashboard
                </button>
            </div>

            <div id="private-grid" class="card-grid">
                <div class="loading-state">
                    <i class="fas fa-circle-notch fa-spin"></i> Memuat kelas private...
                </div>
            </div>
        </div>
    `;

    // 3. Load Data
    await loadPrivateClasses();

    // 4. Event Listener
    document.getElementById('btn-dashboard').onclick = () => {
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('overview', 'Dashboard', 'Home');
    };
}

// ==========================================
// 2. CSS STYLING (COLORFUL THEME)
// ==========================================
function injectStyles() {
    const styleId = 'absensi-private-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .ap-container { max-width: 1100px; margin: 0 auto; padding-bottom: 80px; font-family: 'Roboto', sans-serif; }
        
        /* Header Style */
        .ap-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .ap-header h2 { margin: 0; font-family: 'Fredoka One', cursive; color: #333; font-size: 1.8rem; }
        .ap-header p { margin: 5px 0 0; color: #666; font-size: 0.95rem; }

        .btn-outline { background: white; color: #555; border: 1px solid #ddd; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition:0.2s; }
        .btn-outline:hover { background: #f0f0f0; color: #333; border-color:#bbb; }

        /* Grid System */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }

        /* Colorful Card Style */
        .color-card {
            border-radius: 16px;
            padding: 25px;
            color: white;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            aspect-ratio: 4/3; /* Kotak sedikit persegi panjang */
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }

        .color-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
        
        /* Hiasan background transparan */
        .color-card::after {
            content: ''; position: absolute; top: -20px; right: -20px;
            width: 80px; height: 80px; background: rgba(255,255,255,0.2);
            border-radius: 50%;
        }

        .card-title { font-family: 'Fredoka One', cursive; font-size: 1.4rem; margin-bottom: 10px; z-index:1; }
        .card-level { background: rgba(0,0,0,0.2); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; z-index:1; }
        .card-icon { font-size: 2rem; margin-bottom: 10px; opacity: 0.9; z-index:1; }

        /* Variasi Warna (Modulus 4) */
        .bg-blue   { background: linear-gradient(135deg, #4d97ff, #2563eb); }
        .bg-orange { background: linear-gradient(135deg, #ffab19, #f59e0b); }
        .bg-green  { background: linear-gradient(135deg, #00b894, #00a884); }
        .bg-purple { background: linear-gradient(135deg, #a55eea, #8854d0); }

        .loading-state { grid-column: 1/-1; text-align: center; padding: 50px; color: #999; font-size: 1.1rem; }
        .empty-state { grid-column: 1/-1; text-align: center; padding: 40px; background: #f9f9f9; border-radius: 12px; border: 2px dashed #ddd; }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC & DATA
// ==========================================

async function loadPrivateClasses() {
    const grid = document.getElementById('private-grid');

    try {
        // Ambil data kelas private + relasi levels
        const { data, error } = await supabase
            .from('class_private')
            .select(`
                id, 
                name, 
                level_id,
                levels (id, kode)
            `)
            .order('name');

        if (error) throw error;

        if (!data || data.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open" style="font-size:3rem; color:#ccc; margin-bottom:15px;"></i>
                    <p>Belum ada kelas private.</p>
                    <small>Silakan buat kelas baru di menu Registrasi Private.</small>
                </div>
            `;
            return;
        }

        renderCards(data, grid);

    } catch (err) {
        console.error("Error:", err);
        grid.innerHTML = `<div class="empty-state" style="color:red;">Error: ${err.message}</div>`;
    }
}

function renderCards(classes, container) {
    // Array kelas warna untuk rotasi
    const colors = ['bg-blue', 'bg-orange', 'bg-green', 'bg-purple'];
    // Array ikon untuk variasi
    const icons = ['fa-robot', 'fa-microchip', 'fa-cogs', 'fa-gamepad'];

    container.innerHTML = classes.map((c, index) => {
        // Tentukan warna berdasarkan urutan (Modulus 4)
        const colorClass = colors[index % colors.length];
        const iconClass = icons[index % icons.length];
        const levelKode = c.levels?.kode || 'No Level';

        return `
        <div class="color-card ${colorClass}" onclick="window.dispatchPrivateMonitoring('${c.id}', '${c.name}', '${c.level_id}', '${levelKode}')">
            <i class="fas ${iconClass} card-icon"></i>
            <div class="card-title">${c.name}</div>
            <span class="card-level">${levelKode}</span>
        </div>
        `;
    }).join('');
}

// ==========================================
// 4. ACTION DISPATCHER
// ==========================================

window.dispatchPrivateMonitoring = (classId, className, levelId, levelKode) => {
    // 1. Bersihkan storage lama agar data fresh
    localStorage.removeItem("activePrivateClassId");
    localStorage.removeItem("activeLevelId");
    localStorage.removeItem("activeLevelKode");
    localStorage.removeItem("activeClassName");

    // 2. Simpan Context Baru
    localStorage.setItem("activePrivateClassId", classId);
    localStorage.setItem("activeLevelId", levelId);
    localStorage.setItem("activeLevelKode", levelKode);
    localStorage.setItem("activeClassName", className);

    // 3. Navigasi ke Modul Monitoring (Next Step)
    // Asumsi nama modul berikutnya adalah 'monitoring-private'
    if (window.dispatchModuleLoad) {
        window.dispatchModuleLoad('monitoring-private', 'Monitoring', className);
    } else {
        alert("Modul 'monitoring-private' belum siap atau fungsi navigasi error.");
    }
};