/**
 * Project: Absensi Sekolah Module (SPA)
 * Description: Daftar kelas untuk absensi with Colorful Cards.
 * Filename: modules/absensi-sekolah.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Ambil Context Semester Aktif
    const activeAcademicYear = localStorage.getItem("activeAcademicYear") || "Belum Diset";
    const activeSemester = localStorage.getItem("activeSemester") || "Belum Diset";

    // 2. Inject CSS
    injectStyles();

    // 3. Render HTML Structure
    canvas.innerHTML = `
        <div class="as-container">
            <div class="as-header">
                <div>
                    <h2>Absensi Siswa</h2>
                    <p>Periode Aktif: <span class="badge-periode">${activeSemester} ${activeAcademicYear}</span></p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="btn-show-all" class="btn-outline" title="Tampilkan semua tanpa filter periode">
                        <i class="fas fa-list"></i> Semua Kelas
                    </button>
                    <button id="btn-rekap" class="btn-primary">
                        <i class="fas fa-chart-line"></i> Rekap
                    </button>
                </div>
            </div>

            <div id="class-grid" class="card-grid">
                <div class="loading-state">
                    <i class="fas fa-circle-notch fa-spin"></i> Mencari kelas aktif...
                </div>
            </div>
        </div>
    `;

    // 4. Load Data (Default: Filter by Active Semester)
    await loadClasses(true);

    // 5. Events
    document.getElementById('btn-show-all').onclick = () => loadClasses(false);
    
    document.getElementById('btn-rekap').onclick = () => {
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('rekap-absensi', 'Rekapitulasi', 'Laporan');
        else alert("Modul Rekap belum siap.");
    };
}

// ==========================================
// 2. CSS STYLING (COLORFUL THEME)
// ==========================================
function injectStyles() {
    const styleId = 'absensi-sekolah-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .as-container { max-width: 1200px; margin: 0 auto; padding-bottom: 80px; font-family: 'Roboto', sans-serif; }
        
        .as-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; flex-wrap: wrap; gap: 15px; }
        .as-header h2 { margin: 0; font-family: 'Fredoka One', cursive; color: #333; font-size: 1.8rem; }
        .as-header p { margin: 5px 0 0; color: #666; font-size: 0.95rem; }
        
        .badge-periode { background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 0.9rem; }

        .btn-primary { background: linear-gradient(135deg, #4d97ff, #2563eb); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(77,151,255,0.3); }
        
        .btn-outline { background: white; color: #555; border: 1px solid #ddd; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .btn-outline:hover { background: #f9f9f9; color: #333; border-color: #bbb; }

        /* Grid System */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        
        /* Colorful Card Style */
        .color-card {
            border-radius: 16px;
            padding: 25px;
            color: white;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 160px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }

        .color-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
        
        /* Hiasan background transparan */
        .color-card::after {
            content: ''; position: absolute; top: -20px; right: -20px;
            width: 100px; height: 100px; background: rgba(255,255,255,0.15);
            border-radius: 50%;
        }

        .card-header { z-index: 1; }
        .card-school { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin-bottom: 5px; }
        .card-title { font-family: 'Fredoka One', cursive; font-size: 1.5rem; margin: 0 0 5px 0; line-height: 1.2; }
        
        .card-body { z-index: 1; margin-top: 15px; }
        .card-info { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; background: rgba(0,0,0,0.1); padding: 8px 12px; border-radius: 10px; }
        .card-info i { margin-right: 5px; opacity: 0.8; }

        /* Variasi Warna (Modulus 4) */
        .bg-blue   { background: linear-gradient(135deg, #4d97ff, #2563eb); }
        .bg-orange { background: linear-gradient(135deg, #ffab19, #f59e0b); }
        .bg-green  { background: linear-gradient(135deg, #00b894, #00a884); }
        .bg-purple { background: linear-gradient(135deg, #a55eea, #8854d0); }

        .loading-state { grid-column: 1/-1; text-align: center; padding: 50px; color: #999; font-size: 1.1rem; }
        .empty-state { grid-column: 1/-1; text-align: center; padding: 40px; background: white; border-radius: 12px; border: 2px dashed #ccc; }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC & DATA
// ==========================================

async function loadClasses(useFilter) {
    const grid = document.getElementById('class-grid');
    grid.innerHTML = '<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i> Memuat data...</div>';

    try {
        let query = supabase
            .from('classes')
            .select(`
                id, name, jadwal, level,
                schools (name),
                semesters (name),
                academic_years (year)
            `)
            .order('name');

        // Filter Ketat (Default)
        if (useFilter) {
            const activeYear = localStorage.getItem("activeAcademicYear"); 
            let activeSem = localStorage.getItem("activeSemester"); 
            
            if (activeYear && activeSem) {
                // FIX LOGIC: Bersihkan nama semester (Hapus suffix 'Genap/Ganjil')
                const cleanSemester = activeSem.split(' (')[0].trim(); 
                
                query = query.eq('academic_years.year', activeYear);
                query = query.eq('semesters.name', cleanSemester); 
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
            if (useFilter) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-filter" style="font-size:3rem; color:#ddd; margin-bottom:15px;"></i>
                        <p>Tidak ada kelas untuk periode ini.</p>
                        <small style="display:block; margin-bottom:10px; color:#999;">
                            Filter: ${localStorage.getItem("activeSemester")} ${localStorage.getItem("activeAcademicYear")}
                        </small>
                        <button onclick="document.getElementById('btn-show-all').click()" style="cursor:pointer; color:#4d97ff; background:none; border:none; text-decoration:underline;">
                            Tampilkan Semua Kelas (Abaikan Periode)
                        </button>
                    </div>
                `;
            } else {
                grid.innerHTML = `<div class="empty-state">Belum ada data kelas sama sekali. Silakan input di menu Registrasi Sekolah.</div>`;
            }
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

    container.innerHTML = classes.map((c, index) => {
        // Fallback data jika join null
        const schoolName = c.schools?.name || 'Sekolah Umum';
        const schedule = c.jadwal || 'Belum diatur';
        
        // Tentukan warna berdasarkan urutan
        const colorClass = colors[index % colors.length];

        return `
        <div class="color-card ${colorClass}" onclick="window.dispatchAbsensi('${c.id}', '${c.name}')">
            <div class="card-header">
                <div class="card-school"><i class="fas fa-school"></i> ${schoolName}</div>
                <div class="card-title">${c.name}</div>
            </div>
            <div class="card-body">
                <div class="card-info">
                    <span><i class="fas fa-layer-group"></i> ${c.level || '-'}</span>
                    <span><i class="far fa-clock"></i> ${schedule}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// ==========================================
// 4. DISPATCHER
// ==========================================
window.dispatchAbsensi = (classId, className) => {
    // 1. Simpan State
    localStorage.setItem("activeClassId", classId);
    localStorage.setItem("activeClassName", className);

    // 2. Load Module Harian
    if(window.dispatchModuleLoad) {
        window.dispatchModuleLoad('absensi-harian', 'Input Absensi', className);
    } else {
        alert("Sistem navigasi error. Harap refresh.");
    }
};