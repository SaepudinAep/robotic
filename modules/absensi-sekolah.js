/**
 * Project: Absensi Sekolah Module (SPA) - SINCRONIZED ARCHITECTURE
 * Features: 2-Column Mobile Layout, Direct Active-ID Database Filtering, 
 * Real-time Header Synchronization, and Global Dispatcher Fix.
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

// ==========================================
// 2. INITIALIZATION MODULE
// ==========================================
export async function init(canvas) {
    injectStyles();

    // Template HTML utama tetap mempertahankan kelas & id versi lama
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
                    <p>Periode: <span class="badge-periode" id="absensi-period-label">Memuat periode aktif...</span></p>
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

    // Event handler tombol kendali
    document.getElementById('btn-show-all').onclick = () => loadClasses(false);
    document.getElementById('btn-rekap').onclick = () => {
        if (window.dispatchModuleLoad) window.dispatchModuleLoad('rekap-absensi', 'Rekapitulasi', 'Laporan');
    };

    // Event Delegation untuk klik kartu kelas (aman dari XSS & fleksibel selector)
    document.getElementById('class-grid').addEventListener('click', (e) => {
        const card = e.target.closest('[data-cid]');
        if (card && card.dataset.cid) {
            window.dispatchAbsensi(card.dataset.cid, card.dataset.cname);
        }
    });

    // Muat kelas otomatis dengan menyalakan filter periode aktif (true)
    await loadClasses(true);
}

// ==========================================
// 3. DATABASE FETCH & FILTER LOGIC (REFACTORED)
// ==========================================
async function loadClasses(useFilter) {
    const grid = document.getElementById('class-grid');
    const periodLabel = document.getElementById('absensi-period-label');
    
    grid.innerHTML = `<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i> Mencari kelas...</div>`;
    
    try {
        // Ambil data dasar kelas beserta nama sekolah melalui relasi
        let query = supabase.from('classes').select('id, name, jadwal, level, academic_year_id, semester_id, schools(name)');
        
        // 1. Ambil status periode yang sedang aktif secara real-time dari DB
        const { data: activeTA } = await supabase.from('academic_years').select('id, year').eq('is_active', true).limit(1).maybeSingle();
        const { data: activeSem } = await supabase.from('semesters').select('id, name').eq('is_active', true).limit(1).maybeSingle();
        
        // 2. Perbarui label sub-header periode di layar aplikasi
        if (periodLabel) {
            if (activeTA && activeSem) {
                periodLabel.textContent = `${activeSem.name} ${activeTA.year}`;
            } else {
                periodLabel.textContent = "Belum Diset";
            }
        }

        // 3. Jalankan filter cerdas menggunakan Foreign Key ID jika useFilter bernilai true
        if (useFilter) {
            if (activeTA && activeSem) {
                query = query.eq('academic_year_id', activeTA.id).eq('semester_id', activeSem.id);
            } else {
                // Jika di pengaturan belum ada yang aktif, paksa return kosong agar tidak desinkronisasi
                grid.innerHTML = `<div class="loading-state">Tidak ada periode aktif yang diset di Pengaturan.</div>`;
                return;
            }
        } else {
            // Jika klik tombol "Semua", ubah header indikator menjadi seluruh periode
            if (periodLabel) periodLabel.textContent = "Semua Periode";
        }

        const { data, error } = await query.order('name');
        if (error) throw error;
        
        if (!data || data.length === 0) {
            renderCards([], grid);
            return;
        }

        renderCards(data, grid);

        // Fetch student counts secara paralel untuk semua kelas aktif
        const classIds = data.map(c => c.id);
        const { data: counts } = await supabase
            .from('students')
            .select('class_id')
            .eq('is_active', true)
            .in('class_id', classIds);

        const countMap = {};
        (counts || []).forEach(s => {
            countMap[s.class_id] = (countMap[s.class_id] || 0) + 1;
        });

        data.forEach(c => {
            const badge = grid.querySelector(`.card-student-count[data-cid="${c.id}"]`);
            if (badge) badge.innerHTML = `<i class="fas fa-users"></i> ${countMap[c.id] || 0} siswa`;
        });

    } catch (err) {
        grid.innerHTML = `<div class="loading-state" style="color:#ef4444;">Error: ${escapeHtml(err.message)}</div>`;
    }
}

// ==========================================
// 4. DYNAMIC UI RENDERING (XSS SAFE & SOLID COLOR PALETTE)
// ==========================================
function renderCards(classes, container) {
    const solidThemes = [
        { bg: '#2563eb', icon: 'fa-school' },          // Royal Blue
        { bg: '#059669', icon: 'fa-robot' },           // Emerald Green
        { bg: '#d97706', icon: 'fa-graduation-cap' },  // Amber Orange
        { bg: '#7c3aed', icon: 'fa-laptop-code' },     // Deep Violet
        { bg: '#e11d48', icon: 'fa-microchip' },       // Rose Crimson
        { bg: '#0891b2', icon: 'fa-gears' }            // Vivid Teal
    ];

    if (classes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Tidak ada kelas aktif di periode ini.</p>
                <small>Silakan ganti filter ke "Semua" atau atur periode aktif di Pengaturan.</small>
            </div>`;
        return;
    }

    container.innerHTML = classes.map((c, index) => {
        const theme = solidThemes[index % solidThemes.length];
        const cid = escapeHtmlAttr(c.id);
        const cname = escapeHtmlAttr(c.name || '');
        const schoolName = escapeHtml(c.schools?.name || 'Sekolah Umum');
        const classNameDisplay = escapeHtml(c.name || '');
        const level = escapeHtml(c.level || '-');
        const jadwal = escapeHtml(c.jadwal || 'Belum diset');

        return `
        <div class="color-card-solid" data-cid="${cid}" data-cname="${cname}" style="background-color: ${theme.bg};">
            <i class="fas ${theme.icon} card-bg-icon"></i>
            
            <div class="card-header-top">
                <span class="school-pill-badge">
                    <i class="fas fa-building-columns"></i> ${schoolName}
                </span>
            </div>

            <div class="card-body-main">
                <h3 class="card-title-text">${classNameDisplay}</h3>
                
                <div class="card-meta-row">
                    <span class="meta-badge">
                        <i class="fas fa-layer-group"></i> ${level}
                    </span>
                    <span class="meta-badge">
                        <i class="far fa-clock"></i> ${jadwal}
                    </span>
                    <span class="meta-badge count-badge card-student-count" data-cid="${cid}">
                        <i class="fas fa-spinner fa-spin fa-xs"></i> Memuat...
                    </span>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Escape HTML untuk sanitasi XSS
function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, ch => {
        const NAMES = { 38: 'amp', 60: 'lt', 62: 'gt', 34: 'quot', 39: '39' };
        return '&' + (NAMES[ch.charCodeAt(0)] || 'amp') + ';';
    });
}

function escapeHtmlAttr(text) {
    return escapeHtml(text);
}

// ==========================================
// 5. STYLE SYSTEM INJECTION (AUDITED UI/UX)
// ==========================================
function injectStyles() {
    const styleId = 'absensi-sekolah-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .as-container { max-width: 1200px; margin: 0 auto; padding: 15px; padding-bottom: 90px; font-family: 'Poppins', sans-serif; }
        
        .breadcrumb-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 0.82rem; color: #64748b; }
        .br-link { color: #2563eb; cursor: pointer; font-weight: 600; }
        .br-link:hover { text-decoration: underline; }
        .breadcrumb-nav .separator { font-size: 0.65rem; color: #cbd5e1; }
        .breadcrumb-nav .current { color: #1e293b; font-weight: 700; }

        .as-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; }
        .as-header h2 { margin: 0; font-size: 1.6rem; color: #1e293b; font-weight: 800; }
        .as-header p { margin: 4px 0 0; color: #64748b; font-size: 0.9rem; }
        .badge-periode { font-weight: 700; color: #2563eb; background: #eff6ff; padding: 4px 12px; border-radius: 20px; border: 1px solid #bfdbfe; }

        .header-btns { display: flex; gap: 10px; }

        /* GRID LAYOUT */
        .card-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); 
            gap: 20px; 
        }

        /* SOLID COLOR CARD SYSTEM (CENTER-ALIGNED) */
        .color-card-solid {
            border-radius: 20px;
            padding: 20px;
            color: #ffffff;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            min-height: 160px;
            box-shadow: 0 6px 18px rgba(0,0,0,0.08);
            transition: transform 0.22s ease, box-shadow 0.22s ease;
            box-sizing: border-box;
        }

        .color-card-solid:hover {
            transform: translateY(-6px);
            box-shadow: 0 14px 28px rgba(0,0,0,0.16);
        }

        .color-card-solid:active {
            transform: scale(0.97);
        }

        /* Decorative background icon */
        .card-bg-icon {
            position: absolute;
            right: -10px;
            bottom: -10px;
            font-size: 5.5rem;
            color: rgba(255, 255, 255, 0.16);
            transform: rotate(-12deg);
            pointer-events: none;
        }

        /* Header Row on Card */
        .card-header-top {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
            width: 100%;
            z-index: 2;
        }

        .school-pill-badge {
            background: rgba(0, 0, 0, 0.22);
            backdrop-filter: blur(4px);
            color: #ffffff;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.73rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            border: 1px solid rgba(255, 255, 255, 0.25);
            max-width: 90%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
        }

        /* Body & Title */
        .card-body-main { 
            z-index: 2; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            width: 100%; 
        }
        
        .card-title-text {
            font-size: 1.25rem;
            font-weight: 800;
            margin: 0 0 10px 0;
            color: #ffffff;
            line-height: 1.25;
            text-align: center;
            text-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        /* Meta Badges Row */
        .card-meta-row {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
            justify-content: center;
            width: 100%;
        }

        .meta-badge {
            background: rgba(255, 255, 255, 0.22);
            backdrop-filter: blur(2px);
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 0.76rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .count-badge {
            background: #ffffff;
            color: #1e293b;
            font-weight: 800;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            border: none;
        }

        /* EMPTY STATE */
        .empty-state { grid-column: 1/-1; text-align: center; padding: 50px 20px; background: white; border-radius: 16px; border: 2px dashed #cbd5e1; }
        .empty-state i { font-size: 2.8rem; color: #cbd5e1; margin-bottom: 12px; }
        .empty-state p { margin: 0; font-size: 1rem; font-weight: 700; color: #475569; }
        .empty-state small { color: #94a3b8; display: block; margin-top: 4px; }

        /* MOBILE FIXES: 2 CARDS PER ROW */
        @media (max-width: 600px) {
            .as-header h2 { font-size: 1.3rem; }
            .header-btns { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            
            .card-grid { 
                grid-template-columns: 1fr 1fr; 
                gap: 12px; 
            }
            .color-card-solid { border-radius: 16px; padding: 14px; min-height: 135px; }
            .card-bg-icon { font-size: 4rem; right: -8px; bottom: -8px; }
            .school-pill-badge { font-size: 0.65rem; padding: 3px 8px; }
            .card-title-text { font-size: 1.05rem; margin-bottom: 8px; }
            .meta-badge { font-size: 0.68rem; padding: 3px 7px; }
        }

        .loading-state { grid-column: 1/-1; text-align: center; padding: 50px; color: #94a3b8; font-size: 0.95rem; font-weight: 600; }
        .btn-primary { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-outline { background: white; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; color: #475569; transition: 0.2s; }
        .btn-outline:hover { background: #f8fafc; color: #1e293b; border-color: #94a3b8; }
    `;
    document.head.appendChild(style);
}