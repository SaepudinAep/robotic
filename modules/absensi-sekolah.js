/**
 * Project: Absensi Sekolah Module (SPA) - FIXED
 * Features: 2-Column Mobile Layout, Global Dispatcher Fix, Breadcrumb Cleanup.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. GLOBAL DISPATCHER (Fix Bug Klik)
// ==========================================
// Wajib ditempel ke window agar atribut onclick="" di HTML bisa memanggilnya
window.dispatchAbsensi = (classId, className) => {
    localStorage.setItem("activeClassId", classId);
    localStorage.setItem("activeClassName", className);
    if (window.dispatchModuleLoad) {
        window.dispatchModuleLoad('absensi-harian', 'Input Absensi', className);
    }
};

export async function init(canvas) {
    const activeAcademicYear = localStorage.getItem("activeAcademicYear") || "Belum Diset";
    const activeSemester = localStorage.getItem("activeSemester") || "Belum Diset";

    injectStyles();

    canvas.innerHTML = `
        <div class="as-container">
            <nav class="breadcrumb-nav">
                <span class="br-link" onclick="window.dispatchModuleLoad('overview')">Home</span>
                <i class="fas fa-chevron-right separator"></i>
                <span class="current">Absensi Sekolah</span>
            </nav>

            <div class="as-header">
                <div class="header-titles">
                    <h2>Absensi Siswa</h2>
                    <p>Periode: <span class="badge-periode">${activeSemester} ${activeAcademicYear}</span></p>
                </div>
                <div class="header-btns">
                    <button id="btn-show-all" class="btn-outline">
                        <i class="fas fa-list"></i> Semua
                    </button>
                    <button id="btn-rekap" class="btn-primary">
                        <i class="fas fa-chart-line"></i> Rekap
                    </button>
                </div>
            </div>

            <div id="class-grid" class="card-grid">
                <div class="loading-state">
                    <i class="fas fa-circle-notch fa-spin"></i> Mencari kelas...
                </div>
            </div>
        </div>
    `;

    await loadClasses(true);

    document.getElementById('btn-show-all').onclick = () => loadClasses(false);
    document.getElementById('btn-rekap').onclick = () => {
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('rekap-absensi', 'Rekapitulasi', 'Laporan');
    };
}

function injectStyles() {
    const styleId = 'absensi-sekolah-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .as-container { max-width: 1200px; margin: 0 auto; padding: 15px; padding-bottom: 80px; }
        
        .breadcrumb-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 0.8rem; color: #888; }
        .br-link { color: #4d97ff; cursor: pointer; font-weight: 500; }
        .br-link:hover { text-decoration: underline; }
        .breadcrumb-nav .separator { font-size: 0.6rem; color: #ccc; }
        .breadcrumb-nav .current { color: #333; font-weight: bold; }

        .as-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
        .as-header h2 { margin: 0; font-family: 'Fredoka One', cursive; color: #333; font-size: 1.5rem; }
        .badge-periode { font-weight: bold; color: #4d97ff; }

        .card-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); 
            gap: 20px; 
        }

        .color-card {
            border-radius: 18px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
            border: 1px solid #f0f0f0;
        }
        .color-card:hover { transform: translateY(-5px); box-shadow: 0 12px 25px rgba(0,0,0,0.1); }

        .card-image-area {
            height: 100px;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .img-placeholder { font-size: 2.5rem; color: rgba(255,255,255,0.4); }

        .card-content { padding: 15px; flex-grow: 1; }
        .card-school { font-size: 0.65rem; text-transform: uppercase; font-weight: 800; color: #999; margin-bottom: 4px; }
        .card-title { font-family: 'Fredoka One', cursive; font-size: 1.1rem; margin: 0; color: #333; line-height: 1.2; }
        
        .card-footer { margin-top: 12px; padding-top: 12px; border-top: 1px solid #f9f9f9; display: flex; flex-direction: column; gap: 5px; font-size: 0.75rem; color: #777; }

        /* MOBILE FIXES: TWO CARDS PER ROW */
        @media (max-width: 600px) {
            .as-header h2 { font-size: 1.2rem; }
            .header-btns { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            
            .card-grid { 
                grid-template-columns: 1fr 1fr; /* PAKSA 2 KOLOM */
                gap: 12px; 
            }
            .color-card { border-radius: 14px; }
            .card-image-area { height: 70px; }
            .img-placeholder { font-size: 1.8rem; }
            .card-content { padding: 10px; }
            .card-title { font-size: 0.95rem; }
            .card-footer { font-size: 0.65rem; }
        }

        .card-blue { border-bottom: 5px solid #4d97ff; }
        .card-orange { border-bottom: 5px solid #ffab19; }
        .card-green { border-bottom: 5px solid #00b894; }
        .card-purple { border-bottom: 5px solid #a55eea; }

        .loading-state { grid-column: 1/-1; text-align: center; padding: 50px; color: #999; }
        .btn-primary { background: #4d97ff; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; }
        .btn-outline { background: white; border: 1px solid #ddd; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; }
    `;
    document.head.appendChild(style);
}

async function loadClasses(useFilter) {
    const grid = document.getElementById('class-grid');
    try {
        let query = supabase.from('classes').select('id, name, jadwal, level, schools(name), semesters(name), academic_years(year)');
        if (useFilter) {
            const activeYear = localStorage.getItem("activeAcademicYear"); 
            const activeSem = localStorage.getItem("activeSemester")?.split(' (')[0].trim(); 
            if (activeYear && activeSem) {
                // Gunakan nama relasi tabel untuk filter
                query = query.eq('academic_years.year', activeYear).eq('semesters.name', activeSem); 
            }
        }
        const { data, error } = await query.order('name');
        if (error) throw error;
        renderCards(data || [], grid);
    } catch (err) {
        grid.innerHTML = `<div class="loading-state">Error: ${err.message}</div>`;
    }
}

function renderCards(classes, container) {
    const accents = ['card-blue', 'card-orange', 'card-green', 'card-purple'];
    const gradients = [
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
        'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', 
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', 
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
    ];

    if (classes.length === 0) {
        container.innerHTML = `<div class="loading-state">Tidak ada kelas aktif di periode ini.</div>`;
        return;
    }

    container.innerHTML = classes.map((c, index) => {
        const accent = accents[index % accents.length];
        const gradient = gradients[index % gradients.length];
        return `
        <div class="color-card ${accent}" onclick="window.dispatchAbsensi('${c.id}', '${c.name}')">
            <div class="card-image-area" style="background: ${gradient}">
                <i class="fas fa-robot img-placeholder"></i>
            </div>
            <div class="card-content">
                <div class="card-school">${c.schools?.name || 'Sekolah Umum'}</div>
                <div class="card-title">${c.name}</div>
                <div class="card-footer">
                    <span><i class="fas fa-layer-group"></i> ${c.level || '-'}</span>
                    <span><i class="far fa-clock"></i> ${c.jadwal || 'Belum diset'}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
}