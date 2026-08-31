/**
 * Project: Guru & Materi Module (School)
 * Version: 5.0 - RPP Standar Sekolah, Versioning (v1.0, v1.1, History), Sectioned Drawer, RPP Reader Modal
 * Format: Touch & Tablet Optimized UI
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';
import { openImageCropper } from '../assets/js/image-cropper.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let currentTab = "materi"; 
let editingId = null;
let selectedLevelId = "all";
let levelsList = [];
let subLevelsList = [];
let currentMateriCache = [];

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Fetch Levels List for Filters & Forms
    await fetchLevels();

    // 2. Inject CSS
    injectStyles();

    // 3. Render HTML Structure
    canvas.innerHTML = `
        <div class="gm-container fade-in">
            <div class="gm-header">
                <div>
                    <h2>Kurikulum & Lesson Plan (RPP) Sekolah</h2>
                    <p>Kelola materi pembelajaran, RPP terstruktur, versi kurikulum (v1.0/v2.0), dan target achievement.</p>
                </div>
            </div>

            <!-- MAIN TABS -->
            <div class="gm-tabs">
                <button id="btnMateri" class="tab-btn active" data-tab="materi">
                    <i class="fas fa-book-bookmark"></i> MATERI & RPP SEKOLAH
                </button>
                <button id="btnAchievement" class="tab-btn" data-tab="achievement">
                    <i class="fas fa-trophy"></i> ACHIEVEMENT SEKOLAH
                </button>
            </div>

            <!-- SEARCH & LEVEL FILTER BAR -->
            <div class="gm-filter-section">
                <div class="gm-search-wrapper">
                    <i class="fas fa-search"></i>
                    <input type="text" id="globalSearch" placeholder="Cari judul materi, RPP, versi (v1.0), deskripsi, atau achievement...">
                </div>

                <div class="level-filter-bar" id="level-filter-bar">
                    <button class="level-chip active" data-level="all">
                        <i class="fas fa-layer-group"></i> Semua Level
                    </button>
                    ${levelsList.map(l => `
                        <button class="level-chip" data-level="${l.id}">
                            ${l.kode}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- CONTENT LIST AREA -->
            <div id="main-content-area" class="gm-content">
                <div id="loading-state" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-circle-notch fa-spin"></i> Memuat data...
                </div>
                <div id="materi-list" class="content-list active"></div>
                <div id="achievement-list" class="content-list" style="display:none;"></div>
            </div>
        </div>

        <!-- FLOATING ACTION BUTTON (ADD) -->
        <button id="fab-add" class="fab-btn" title="Tambah Data Baru">
            <i class="fas fa-plus"></i>
        </button>

        <!-- MODAL FORM DRAWER -->
        <div id="modal-overlay" class="modal-overlay">
            <div class="modal-drawer">
                <div class="modal-header">
                    <h2 id="modal-title">Input Data</h2>
                    <button id="modal-close" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="dynamic-form">
                        <div id="form-fields"></div>
                        <div class="form-footer">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save" style="margin-right:8px;"></i> Simpan Data RPP / Materi
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- MODAL PREVIEW RPP READER -->
        <div id="modal-rpp-overlay" class="modal-overlay">
            <div class="modal-drawer rpp-view-drawer">
                <div class="modal-header">
                    <h2 style="display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-file-signature" style="color:#4d97ff;"></i> Detail Lesson Plan (RPP)
                    </h2>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button id="btn-print-rpp" type="button" class="btn-action-icon" title="Cetak RPP" style="background:#eff6ff; color:#2563eb; border-color:#bfdbfe;">
                            <i class="fas fa-print"></i>
                        </button>
                        <button id="modal-rpp-close" class="close-btn">&times;</button>
                    </div>
                </div>
                <div class="modal-body" id="rpp-preview-container">
                    <!-- Dynamic RPP Content -->
                </div>
            </div>
        </div>
    `;

    setupEventListeners();
    await loadData();
}

// ==========================================
// 2. FETCH LEVELS LIST
// ==========================================
async function fetchLevels() {
    try {
        const { data: lvData } = await supabase
            .from('levels')
            .select('id, kode, detail')
            .order('kode', { ascending: true });
        if (lvData) levelsList = lvData;

        const { data: subData } = await supabase
            .from('sub_levels')
            .select('id, level_id, kode, name, kit_alat, description, is_active')
            .order('name', { ascending: true });
        if (subData) subLevelsList = subData;
    } catch (e) {
        console.error("Gagal memuat levels/sub_levels:", e);
    }
}

// Helper parsing data RPP terstruktur & versioning dari object database
function parseRppData(m) {
    let rpp = {
        version: m.version || '1.0',
        version_notes: m.version_notes || '',
        alokasi_waktu: m.alokasi_waktu || '',
        tujuan_pembelajaran: m.tujuan_pembelajaran || '',
        alat_bahan: m.alat_bahan || '',
        kegiatan_apersepsi: m.kegiatan_apersepsi || '',
        kegiatan_inti: m.kegiatan_inti || '',
        kegiatan_penutup: m.kegiatan_penutup || '',
        indikator_penilaian: m.indikator_penilaian || '',
        history: []
    };

    // Fallback: Parsing JSON jika data disimpan di dalam kolom detail
    if (m.detail && m.detail.startsWith('{') && m.detail.endsWith('}')) {
        try {
            const jsonDetail = JSON.parse(m.detail);
            if (jsonDetail && jsonDetail.is_rpp) {
                rpp = { ...rpp, ...jsonDetail };
            }
        } catch (e) {
            // Ignore parse error
        }
    }
    return rpp;
}

// ==========================================
// 3. STYLING (CSS INJECTION)
// ==========================================
function injectStyles() {
    const styleId = 'guru-materi-css-v5';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .gm-container { max-width: 1000px; margin: 0 auto; padding-bottom: 90px; font-family: 'Poppins', sans-serif; }
        .gm-header { margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; }
        .gm-header h2 { color: #1e293b; margin: 0; font-size: 1.5rem; font-weight: 800; }
        .gm-header p { color: #64748b; margin: 5px 0 0; font-size: 0.9rem; }

        /* Main Tabs */
        .gm-tabs { display: flex; gap: 10px; margin-bottom: 15px; background: #fff; padding: 6px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .tab-btn { flex: 1; border: none; background: transparent; padding: 12px 15px; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 10px; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.9rem; }
        .tab-btn.active { background: #4d97ff; color: white; box-shadow: 0 4px 12px rgba(77, 151, 255, 0.3); }

        /* Search & Filter Bar */
        .gm-filter-section { margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
        .gm-search-wrapper { position: relative; width: 100%; }
        .gm-search-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .gm-search-wrapper input { width: 100%; padding: 12px 15px 12px 42px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 0.95rem; outline: none; background: white; box-sizing: border-box; transition: 0.2s; }
        .gm-search-wrapper input:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.15); }

        /* Level Filter Chips */
        .level-filter-bar { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .level-filter-bar::-webkit-scrollbar { display: none; }
        .level-chip { border: 1px solid #e2e8f0; background: white; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; white-space: nowrap; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
        .level-chip:hover { background: #f8fafc; border-color: #cbd5e1; }
        .level-chip.active { background: #1e293b; color: white; border-color: #1e293b; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }

        /* Content List & Cards */
        .content-list { display: flex; flex-direction: column; gap: 14px; }

        /* MATERI CARD WITH RICH INDICATORS & RPP BUTTON */
        .materi-card {
            background: white; border-radius: 16px; padding: 16px 20px;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.03); border: 1px solid #edf2f7;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative; overflow: hidden;
        }
        .materi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-color: #bfdbfe; }
        
        .materi-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; cursor: pointer; }
        
        /* Mini Thumbnail */
        .materi-thumb {
            width: 70px; height: 70px; border-radius: 12px; flex-shrink: 0;
            background: #f1f5f9; display: flex; align-items: center; justify-content: center;
            overflow: hidden; border: 1px solid #e2e8f0; position: relative;
        }
        .materi-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .materi-thumb i { font-size: 1.6rem; color: #94a3b8; }
        
        .materi-info { flex: 1; min-width: 0; }
        
        /* Badges Top Row */
        .materi-badges-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
        .badge-level-tag { background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .badge-sublevel-tag { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
        .badge-version-tag { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .badge-rpp-pill { background: #f0f5ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 3px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .badge-status-pill { padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
        .status-complete { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .status-draft { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

        .materi-title { margin: 0 0 8px 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Indicators Pill Row */
        .materi-indicators { display: flex; gap: 6px; flex-wrap: wrap; }
        .ind-pill {
            font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 6px;
            display: inline-flex; align-items: center; gap: 4px;
        }
        .ind-ok { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
        .ind-no { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }

        /* Card Actions */
        .materi-actions { display: flex; align-items: center; gap: 8px; margin-left: 15px; }
        .btn-action-icon {
            background: #f8fafc; border: 1px solid #e2e8f0; width: 38px; height: 38px;
            border-radius: 10px; cursor: pointer; color: #64748b; display: flex;
            align-items: center; justify-content: center; font-size: 0.95rem; transition: 0.2s;
        }
        .btn-action-icon:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
        .btn-rpp-view {
            background: #4d97ff; color: white; border: none; padding: 8px 14px;
            border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px; transition: 0.2s;
        }
        .btn-rpp-view:hover { background: #2563eb; }

        /* ACHIEVEMENT FOLDER CARD */
        .achievement-folder {
            background: white; border-radius: 16px; padding: 18px 20px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.03); border: 1px solid #edf2f7;
            border-left: 5px solid #f59e0b; cursor: pointer; transition: 0.2s;
        }
        .achievement-folder:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .ach-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .ach-title-block { display: flex; flex-direction: column; gap: 4px; }
        .ach-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px; }
        .ach-list { margin: 0; padding-left: 22px; color: #475569; font-size: 0.88rem; line-height: 1.6; }

        /* FAB Button */
        .fab-btn {
            position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px;
            border-radius: 50%; background: #4d97ff; color: white; border: none;
            font-size: 24px; box-shadow: 0 6px 20px rgba(77, 151, 255, 0.4);
            cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s, background 0.2s;
        }
        .fab-btn:hover { transform: scale(1.08); background: #2563eb; }

        /* Modal Drawer & RPP Form Sub-Tabs */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); z-index: 1000; display: none; align-items: flex-end; backdrop-filter: blur(3px); }
        .modal-overlay.active { display: flex; animation: fadeIn 0.2s ease-out; }
        .modal-drawer { background: white; width: 100%; max-width: 680px; margin: 0 auto; border-radius: 24px 24px 0 0; padding: 25px; max-height: 90vh; overflow-y: auto; position: relative; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .rpp-view-drawer { max-width: 780px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1e293b; }
        .close-btn { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #94a3b8; }
        
        /* RPP Drawer Sub-Tabs */
        .rpp-form-tabs { display: flex; gap: 6px; margin-bottom: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; overflow-x: auto; scrollbar-width: none; }
        .rpp-tab-btn { border: none; background: #f8fafc; color: #64748b; padding: 8px 14px; border-radius: 10px; font-size: 0.82rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
        .rpp-tab-btn.active { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
        .rpp-section-pane { display: none; }
        .rpp-section-pane.active { display: block; animation: fadeIn 0.2s ease-out; }

        #form-fields label { display: block; font-weight: 700; margin-bottom: 6px; color: #334155; font-size: 0.85rem; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        #form-fields input, #form-fields textarea, #form-fields select { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.93rem; font-family: inherit; box-sizing: border-box; outline: none; transition: 0.2s; }
        #form-fields input:focus, #form-fields textarea:focus, #form-fields select:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.15); }
        
        .btn-primary { width: 100%; padding: 14px; background: #4d97ff; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; margin-top: 20px; transition: 0.2s; box-shadow: 0 4px 12px rgba(77, 151, 255, 0.3); }
        .btn-primary:hover { background: #2563eb; }

        /* RPP PREVIEW READER STYLES */
        .rpp-preview-card { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; font-family: 'Poppins', sans-serif; color: #1e293b; }
        .rpp-header-box { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 16px; margin-bottom: 20px; }
        .rpp-header-box h3 { margin: 0 0 6px 0; font-size: 1.3rem; color: #0f172a; font-weight: 800; }
        .rpp-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 12px; text-align: left; }
        .rpp-meta-item label { font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; }
        .rpp-meta-item span { font-size: 0.88rem; font-weight: 700; color: #1e293b; }
        
        .rpp-version-bar { display: flex; align-items: center; justify-content: space-between; background: #fffbe6; border: 1px solid #ffe58f; padding: 10px 16px; border-radius: 12px; margin-bottom: 16px; gap: 10px; flex-wrap: wrap; }
        .rpp-version-bar label { font-size: 0.82rem; font-weight: 700; color: #d48806; display: flex; align-items: center; gap: 6px; }
        .rpp-version-bar select { padding: 6px 12px; border-radius: 8px; border: 1px solid #ffd591; font-weight: 700; font-size: 0.85rem; color: #8c8c8c; background: white; outline: none; }

        .rpp-block { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
        .rpp-block h4 { margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 800; color: #2563eb; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; }
        .rpp-block-content { font-size: 0.9rem; color: #334155; line-height: 1.6; whitespace: pre-line; }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        @media (max-width: 600px) {
            .materi-card { flex-direction: column; align-items: flex-start; gap: 12px; }
            .materi-left { width: 100%; }
            .materi-actions { width: 100%; justify-content: space-between; margin-left: 0; border-top: 1px solid #f1f5f9; padding-top: 10px; }
            .materi-thumb { width: 60px; height: 60px; }
        }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 4. LOGIC & DATA LOADERS
// ==========================================

async function loadData() {
    const search = document.getElementById("globalSearch").value.toLowerCase();
    const containerMateri = document.getElementById("materi-list");
    const containerAchieve = document.getElementById("achievement-list");
    const loading = document.getElementById("loading-state");

    loading.style.display = 'block';
    containerMateri.innerHTML = '';
    containerAchieve.innerHTML = '';

    try {
        if (currentTab === "materi") {
            let query = supabase
                .from('materi')
                .select('*, levels(id, kode, detail), sub_levels(name, kode)')
                .order('created_at', { ascending: false });

            if (selectedLevelId !== "all") {
                query = query.eq('level_id', selectedLevelId);
            }

            const { data, error } = await query;
            loading.style.display = 'none';
            if (error) throw error;

            currentMateriCache = data || [];

            const filtered = data ? data.filter(m => {
                const titleMatch = m.title?.toLowerCase().includes(search);
                const descMatch = m.description?.toLowerCase().includes(search);
                const levelMatch = m.levels?.kode?.toLowerCase().includes(search) || m.level?.toLowerCase().includes(search);
                const rppData = parseRppData(m);
                const versionMatch = ('v' + rppData.version).toLowerCase().includes(search);
                const rppMatch = (rppData.tujuan_pembelajaran + rppData.alat_bahan).toLowerCase().includes(search);
                return titleMatch || descMatch || levelMatch || versionMatch || rppMatch;
            }) : [];
            
            if (!filtered.length) {
                containerMateri.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#94a3b8; background:white; border-radius:14px; border:2px dashed #e2e8f0;">
                        <i class="fas fa-book-open" style="font-size:2rem; margin-bottom:10px; color:#cbd5e1;"></i>
                        <p style="margin:0; font-weight:600;">Tidak ada materi ditemukan untuk filter ini.</p>
                    </div>`;
                return;
            }

            containerMateri.innerHTML = filtered.map(m => {
                const rpp = parseRppData(m);
                const hasTitle = Boolean(m.title && m.title.trim());
                const hasImg = Boolean(m.image_url && m.image_url.trim());
                const hasDesc = Boolean((m.description && m.description.trim()) || (m.detail && m.detail.trim()));
                const hasRpp = Boolean(rpp.tujuan_pembelajaran || rpp.kegiatan_inti);
                const isComplete = hasTitle && hasImg && hasDesc;
                const levelName = m.levels?.kode || m.level || 'Umum';
                const subLevelName = m.sub_level_id ? (m.sub_levels?.name || m.sub_levels?.kode || '') : '';

                return `
                    <div class="materi-card item-card" data-id="${m.id}" data-type="materi">
                        <div class="materi-left" data-action="edit">
                            <div class="materi-thumb">
                                ${hasImg 
                                    ? `<img src="${m.image_url}" alt="${m.title}" loading="lazy">` 
                                    : `<i class="fas fa-camera"></i>`
                                }
                            </div>
                            <div class="materi-info">
                                <div class="materi-badges-top">
                                    <span class="badge-level-tag">
                                        <i class="fas fa-layer-group"></i> ${levelName}
                                    </span>
                                    ${subLevelName ? `<span class="badge-sublevel-tag"><i class="fas fa-tag"></i> ${subLevelName}</span>` : ''}
                                    <span class="badge-version-tag"><i class="fas fa-code-branch"></i> v${rpp.version}</span>
                                    ${hasRpp ? `<span class="badge-rpp-pill"><i class="fas fa-file-circle-check"></i> RPP Ada</span>` : ''}
                                    <span class="badge-status-pill ${isComplete ? 'status-complete' : 'status-draft'}">
                                        <i class="fas ${isComplete ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
                                        ${isComplete ? 'Lengkap' : 'Belum Lengkap'}
                                    </span>
                                </div>
                                <h3 class="materi-title">${m.title}</h3>
                                
                                <div class="materi-indicators">
                                    <span class="ind-pill ${hasTitle ? 'ind-ok' : 'ind-no'}" title="Status Judul">
                                        <i class="fas ${hasTitle ? 'fa-check' : 'fa-xmark'}"></i> Judul
                                    </span>
                                    <span class="ind-pill ${hasImg ? 'ind-ok' : 'ind-no'}" title="Status Foto">
                                        <i class="fas ${hasImg ? 'fa-check' : 'fa-xmark'}"></i> Foto
                                    </span>
                                    <span class="ind-pill ${hasRpp ? 'ind-ok' : 'ind-no'}" title="Status RPP">
                                        <i class="fas ${hasRpp ? 'fa-check' : 'fa-xmark'}"></i> RPP
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="materi-actions">
                            <button class="btn-rpp-view" data-action="view-rpp" data-id="${m.id}">
                                <i class="fas fa-file-signature"></i> RPP
                            </button>
                            <button class="btn-action-icon btn-delete" data-id="${m.id}" data-type="materi" title="Hapus Materi">
                                <i class="fas fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join("");

        } else {
            let query = supabase
                .from('achievement_sekolah')
                .select('*, levels(id, kode, detail), sub_levels(name, kode)')
                .order('created_at', { ascending: false });

            if (selectedLevelId !== "all") {
                query = query.eq('level_id', selectedLevelId);
            }

            const { data, error } = await query;
            loading.style.display = 'none';
            if (error) throw error;

            const filtered = data ? data.filter(a => {
                const mainMatch = a.main_achievement?.toLowerCase().includes(search);
                const subMatch = a.sub_achievement?.toLowerCase().includes(search);
                const levelMatch = a.levels?.kode?.toLowerCase().includes(search);
                return mainMatch || subMatch || levelMatch;
            }) : [];
            
            if (!filtered.length) {
                containerAchieve.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#94a3b8; background:white; border-radius:14px; border:2px dashed #e2e8f0;">
                        <i class="fas fa-trophy" style="font-size:2rem; margin-bottom:10px; color:#cbd5e1;"></i>
                        <p style="margin:0; font-weight:600;">Tidak ada achievement ditemukan untuk filter ini.</p>
                    </div>`;
                return;
            }

            containerAchieve.innerHTML = filtered.map(a => {
                const subList = (a.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
                const levelName = a.levels?.kode || 'Umum';
                const subLevelName = a.sub_level_id ? (a.sub_levels?.name || a.sub_levels?.kode || '') : '';

                return `
                    <div class="achievement-folder item-card" data-id="${a.id}" data-type="achievement">
                        <div class="ach-header">
                            <div class="ach-title-block">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                    <span class="badge-level-tag"><i class="fas fa-layer-group"></i> ${levelName}</span>
                                    ${subLevelName ? `<span class="badge-sublevel-tag"><i class="fas fa-tag"></i> ${subLevelName}</span>` : ''}
                                    <span class="badge-status-pill status-complete"><i class="fas fa-list-check"></i> ${subList.length} Indikator</span>
                                </div>
                                <div class="ach-title">
                                    <i class="fas fa-trophy" style="color: #f59e0b;"></i>
                                    <span>${a.main_achievement}</span>
                                </div>
                            </div>
                            <button class="btn-action-icon btn-delete" data-id="${a.id}" data-type="achievement_sekolah" title="Hapus Achievement">
                                <i class="fas fa-trash-can"></i>
                            </button>
                        </div>
                        <ul class="ach-list">
                            ${subList.length > 0 ? subList.map(s => `<li>${s}</li>`).join("") : "<li style='color:#94a3b8;'>Belum ada sub-indikator</li>"}
                        </ul>
                    </div>
                `;
            }).join("");
        }
    } catch (err) {
        loading.innerHTML = `<span style="color:red; font-weight:600;">Error: ${err.message}</span>`;
    }
}

// ==========================================
// 5. FORM HANDLING (SECTIONED DRAWER & VERSIONING)
// ==========================================

async function injectFormFields(mode = "add", data = {}) {
    const formFields = document.getElementById("form-fields");
    document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} ${currentTab === "materi" ? "Materi & RPP Sekolah" : "Achievement Sekolah"}`;

    const levelOptions = levelsList.map(l => `
        <option value="${l.id}" ${data.level_id === l.id ? 'selected' : ''}>
            ${l.kode} ${l.detail ? `(${l.detail})` : ''}
        </option>
    `).join('');

    const renderSubOptions = (lvlId, currentSubId) => {
        const subs = subLevelsList.filter(s => s.level_id === lvlId);
        if (!subs.length) return '<option value="">-- Tidak ada Sub-Level untuk Level ini --</option>';
        return '<option value="">-- Pilih Sub-Level (Opsional) --</option>' + 
            subs.map(s => `
                <option value="${s.id}" ${currentSubId === s.id ? "selected" : ""}>
                    ${s.name}
                </option>
            `).join('');
    };

    if (currentTab === "materi") {
        const rpp = parseRppData(data);
        const currentImg = data.image_url || "https://via.placeholder.com/200?text=Pilih+Foto+Project";
        const hasImg = Boolean(data.image_url);

        formFields.innerHTML = `
            <!-- SUB-TABS UNTUK INPUT RPP TERSTRUKTUR -->
            <div class="rpp-form-tabs">
                <button type="button" class="rpp-tab-btn active" data-pane="pane-umum">
                    <i class="fas fa-info-circle"></i> 1. Umum & Versi
                </button>
                <button type="button" class="rpp-tab-btn" data-pane="pane-tujuan">
                    <i class="fas fa-bullseye"></i> 2. Tujuan & Kit
                </button>
                <button type="button" class="rpp-tab-btn" data-pane="pane-kegiatan">
                    <i class="fas fa-list-ol"></i> 3. Langkah RPP
                </button>
                <button type="button" class="rpp-tab-btn" data-pane="pane-penilaian">
                    <i class="fas fa-clipboard-check"></i> 4. Penilaian
                </button>
            </div>

            <!-- PANE 1: INFORMASI UMUM & VERSIONING -->
            <div id="pane-umum" class="rpp-section-pane active">
                <div style="display:flex; gap:10px;">
                    <div style="flex:2;">
                        <label>Level Kurikulum *</label>
                        <select id="level_id" required>
                            <option value="">-- Pilih Level --</option>
                            ${levelOptions}
                        </select>
                    </div>
                    <div style="flex:1;">
                        <label>Versi RPP *</label>
                        <input type="text" id="version" value="${rpp.version || "1.0"}" placeholder="Contoh: 1.0" required>
                    </div>
                </div>

                <label>Catatan Revisi Versi Ini (Changelog)</label>
                <input type="text" id="version_notes" value="${rpp.version_notes || ""}" placeholder="Contoh: Penyesuaian durasi & sensor ultrasonic">

                ${mode === "edit" ? `
                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:10px; margin-top:10px; display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="save_history_snapshot" checked style="width:auto; margin:0; cursor:pointer;">
                        <label for="save_history_snapshot" style="margin:0; font-size:0.82rem; font-weight:700; color:#1d4ed8; cursor:pointer;">Simpan salinan versi lama ke Riwayat Versi (History)</label>
                    </div>
                ` : ''}

                <label>Sub-Level (Opsional)</label>
                <select id="sub_level_id">
                    ${renderSubOptions(data.level_id, data.sub_level_id)}
                </select>

                <label>Judul Materi / Topik RPP *</label>
                <input type="text" id="title" value="${data.title || ""}" placeholder="Contoh: Line Follower Robot" required>
                
                <label>Alokasi Waktu / Durasi Sesi</label>
                <input type="text" id="alokasi_waktu" value="${rpp.alokasi_waktu || ""}" placeholder="Contoh: 2 Sesi (90 Menit)">

                <label>Foto Cover Project (Support Crop 3:4)</label>
                <div style="margin-bottom: 14px;">
                    <button type="button" id="btn-upload-p" style="background:#4d97ff; color:white; border:none; padding:10px; border-radius:10px; cursor:pointer; width:100%; margin-bottom:8px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; font-family:inherit;">
                        <i class="fas fa-camera"></i> ${hasImg ? "Ganti Foto Project" : "Ambil & Potong Foto"}
                    </button>
                    <input type="hidden" id="image_url" value="${data.image_url || ""}">
                    <div style="text-align:center;">
                        <img id="img-preview-p" src="${currentImg}" style="width:100%; max-height:180px; object-fit:cover; border-radius:12px; border:2px solid #e2e8f0; background:#f8fafc;">
                    </div>
                </div>
                
                <label>Deskripsi Singkat Project</label>
                <textarea id="description" rows="2" placeholder="Ringkasan konsep robotik atau mekanisme utama...">${data.description || ""}</textarea>
            </div>

            <!-- PANE 2: TUJUAN & ALAT -->
            <div id="pane-tujuan" class="rpp-section-pane">
                <label>Tujuan Pembelajaran (RPP)</label>
                <textarea id="tujuan_pembelajaran" rows="4" placeholder="Contoh:&#10;1. Siswa memahami fungsi sensor garis.&#10;2. Siswa mampu merakit bodi robot.">${rpp.tujuan_pembelajaran || ""}</textarea>

                <label>Alat & Bahan / Robot Kit Yang Digunakan</label>
                <textarea id="alat_bahan" rows="4" placeholder="Contoh: LEGO WeDo 2.0 Kit, Kabel USB, Laptop/Tablet...">${rpp.alat_bahan || ""}</textarea>
            </div>

            <!-- PANE 3: LANGKAH KEGIATAN -->
            <div id="pane-kegiatan" class="rpp-section-pane">
                <label>Apersepsi / Pendahuluan (15 Menit)</label>
                <textarea id="kegiatan_apersepsi" rows="3" placeholder="Sapa siswa, apersepsi materi minggu lalu, jelaskan tantangan robot hari ini...">${rpp.kegiatan_apersepsi || ""}</textarea>

                <label>Kegiatan Inti / Perakitan & Coding (60 Menit)</label>
                <textarea id="kegiatan_inti" rows="5" placeholder="Langkah 1: Merakit sasis robot.&#10;Langkah 2: Menghubungkan sensor.&#10;Langkah 3: Pemrograman logika pergerakan...">${rpp.kegiatan_inti || ""}</textarea>

                <label>Kegiatan Penutup / Evaluasi (15 Menit)</label>
                <textarea id="kegiatan_penutup" rows="3" placeholder="Uji coba robot di arena, pengemasan kit, apresiasi karya siswa...">${rpp.kegiatan_penutup || ""}</textarea>
            </div>

            <!-- PANE 4: PENILAIAN -->
            <div id="pane-penilaian" class="rpp-section-pane">
                <label>Indikator Penilaian / Achievement Target</label>
                <textarea id="indikator_penilaian" rows="4" placeholder="Kriteria Penilaian:&#10;- Ketepatan perakitan fisik&#10;- Logika coding berhasil berjalan&#10;- Kerjasama tim">${rpp.indikator_penilaian || ""}</textarea>

                <label>Catatan Tambahan Guru (Detail Opsional)</label>
                <textarea id="detail" rows="3" placeholder="Catatan khusus untuk pengajar...">${data.detail && !data.detail.startsWith('{') ? data.detail : ""}</textarea>
            </div>
        `;

        // Switch Sub-Tab Handler
        setTimeout(() => {
            const paneBtns = formFields.querySelectorAll('.rpp-tab-btn');
            paneBtns.forEach(btn => {
                btn.onclick = () => {
                    paneBtns.forEach(b => b.classList.remove('active'));
                    formFields.querySelectorAll('.rpp-section-pane').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    const paneEl = document.getElementById(btn.dataset.pane);
                    if (paneEl) paneEl.classList.add('active');
                };
            });

            const lvlSel = document.getElementById("level_id");
            const subSel = document.getElementById("sub_level_id");
            if (lvlSel && subSel) {
                lvlSel.onchange = (e) => {
                    subSel.innerHTML = renderSubOptions(e.target.value, null);
                };
            }

            const btn = document.getElementById("btn-upload-p");
            if (btn) {
                btn.onclick = () => openImageCropper('robotic_school', url => {
                    document.getElementById("image_url").value = url;
                    document.getElementById("img-preview-p").src = url;
                });
            }
        }, 50);

    } else {
        formFields.innerHTML = `
            <label>Level Target *</label>
            <select id="level_id" required>
                <option value="">-- Pilih Level Target --</option>
                ${levelOptions}
            </select>

            <label>Sub-Level (Opsional)</label>
            <select id="sub_level_id">
                ${renderSubOptions(data.level_id, data.sub_level_id)}
            </select>

            <label>Topik Utama Achievement *</label>
            <input type="text" id="main_achievement" value="${data.main_achievement || ""}" placeholder="Contoh: Pemahaman Sensor & Motor" required>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
                <label style="margin:0;">Indikator Capaian (Sub-Target)</label>
                <button type="button" id="btn-add-sub" style="background:#10b981; color:white; border:none; padding:6px 14px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700;">
                    <i class="fas fa-plus"></i> Tambah Baris
                </button>
            </div>
            <div id="sub-ach-container" style="margin-top:10px;"></div>
        `;

        setTimeout(() => {
            const lvlSel = document.getElementById("level_id");
            const subSel = document.getElementById("sub_level_id");
            if (lvlSel && subSel) {
                lvlSel.onchange = (e) => {
                    subSel.innerHTML = renderSubOptions(e.target.value, null);
                };
            }

            const existingSubs = (data.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
            if (existingSubs.length > 0) {
                existingSubs.forEach(val => addSubRow(val));
            } else {
                addSubRow();
            }
            document.getElementById("btn-add-sub").onclick = () => addSubRow();
        }, 50);
    }
}

function addSubRow(value = "") {
    const container = document.getElementById("sub-ach-container");
    const row = document.createElement("div");
    row.style = "display:flex; gap:8px; margin-top:8px;";
    row.innerHTML = `
        <input type="text" class="sub-input" value="${value}" placeholder="Tuliskan indikator..." style="flex:1;">
        <button type="button" class="btn-remove" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca; border-radius:10px; width:40px; cursor:pointer; font-weight:bold; font-size:1.1rem;">&times;</button>
    `;
    row.querySelector('.btn-remove').onclick = () => row.remove();
    container.appendChild(row);
}

// ==========================================
// 6. RPP PREVIEW / READER MODAL WITH HISTORY
// ==========================================
async function openRppReader(id) {
    const m = currentMateriCache.find(item => item.id === id);
    if (!m) return;

    const mainRpp = parseRppData(m);
    
    // Ambil riwayat versi dari tabel materi_versions jika ada
    let versionHistory = [];
    try {
        const { data: vData } = await supabase
            .from('materi_versions')
            .select('*')
            .eq('materi_id', id)
            .order('created_at', { ascending: false });
        if (vData && vData.length) {
            versionHistory = vData.map(v => ({
                version: v.version,
                version_notes: v.version_notes || '',
                created_at: v.created_at,
                rpp: v.snapshot || {}
            }));
        }
    } catch (e) {
        // Ignore DB version history table missing
    }

    // Gabungkan dengan history internal dari rpp JSON fallback jika ada
    if (mainRpp.history && mainRpp.history.length) {
        mainRpp.history.forEach(h => {
            if (!versionHistory.some(vh => vh.version === h.version)) {
                versionHistory.push(h);
            }
        });
    }

    const container = document.getElementById('rpp-preview-container');
    const levelName = m.levels?.kode || m.level || 'Umum';
    const subLevelName = m.sub_levels?.name || m.sub_levels?.kode || '-';

    function renderRppCard(rppData, selectedVer) {
        const isCurrent = selectedVer === mainRpp.version;
        return `
            <div class="rpp-preview-card" id="rpp-printable-area">
                <div class="rpp-version-bar">
                    <label><i class="fas fa-code-branch"></i> Pilihan Versi RPP:</label>
                    <select id="rpp-version-select">
                        <option value="${mainRpp.version}" ${selectedVer === mainRpp.version ? 'selected' : ''}>
                            v${mainRpp.version} (Versi Aktif ${mainRpp.version_notes ? `- ${mainRpp.version_notes}` : ''})
                        </option>
                        ${versionHistory.map(vh => `
                            <option value="${vh.version}" ${selectedVer === vh.version ? 'selected' : ''}>
                                v${vh.version} ${vh.version_notes ? `- ${vh.version_notes}` : ''} (${new Date(vh.created_at || Date.now()).toLocaleDateString('id-ID')})
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="rpp-header-box">
                    <span class="badge-rpp-pill" style="margin-bottom:8px;">
                        <i class="fas fa-graduation-cap"></i> LESSON PLAN (RPP) ROBOPANDA - VERSI ${selectedVer} ${isCurrent ? '' : '(RIWAYAT LAMA)'}
                    </span>
                    <h3>${m.title || 'Materi Pembelajaran'}</h3>
                    ${rppData.version_notes ? `<p style="margin:4px 0 0 0; color:#d97706; font-size:0.85rem; font-weight:600;"><i class="fas fa-note-sticky"></i> Catatan Revisi: ${rppData.version_notes}</p>` : ''}
                    
                    <div class="rpp-meta-grid">
                        <div class="rpp-meta-item">
                            <label>Level</label>
                            <span>${levelName}</span>
                        </div>
                        <div class="rpp-meta-item">
                            <label>Sub-Level</label>
                            <span>${subLevelName}</span>
                        </div>
                        <div class="rpp-meta-item">
                            <label>Alokasi Waktu</label>
                            <span>${rppData.alokasi_waktu || '1 Sesi (60-90 Menit)'}</span>
                        </div>
                        <div class="rpp-meta-item">
                            <label>Versi</label>
                            <span>v${selectedVer}</span>
                        </div>
                    </div>
                </div>

                ${m.image_url ? `
                    <div style="text-align:center; margin-bottom:16px;">
                        <img src="${m.image_url}" alt="Project Photo" style="max-height:220px; border-radius:12px; border:1px solid #e2e8f0; object-fit:cover;">
                    </div>
                ` : ''}

                <!-- SECTION A: TUJUAN -->
                <div class="rpp-block">
                    <h4><i class="fas fa-bullseye"></i> A. TUJUAN PEMBELAJARAN</h4>
                    <div class="rpp-block-content">${rppData.tujuan_pembelajaran || 'Belum diisi.'}</div>
                </div>

                <!-- SECTION B: ALAT & BAHAN -->
                <div class="rpp-block">
                    <h4><i class="fas fa-toolbox"></i> B. ALAT & BAHAN / ROBOT KIT</h4>
                    <div class="rpp-block-content">${rppData.alat_bahan || 'Belum diisi.'}</div>
                </div>

                <!-- SECTION C: LANGKAH KEGIATAN -->
                <div class="rpp-block">
                    <h4><i class="fas fa-list-ol"></i> C. LANGKAH-LANGKAH KEGIATAN PEMBELAJARAN</h4>
                    
                    <div style="margin-bottom:12px;">
                        <strong style="color:#1e293b; font-size:0.88rem;">1. Pendahuluan / Apersepsi</strong>
                        <div class="rpp-block-content">${rppData.kegiatan_apersepsi || 'Belum diisi.'}</div>
                    </div>

                    <div style="margin-bottom:12px;">
                        <strong style="color:#1e293b; font-size:0.88rem;">2. Kegiatan Inti (Perakitan & Logika)</strong>
                        <div class="rpp-block-content">${rppData.kegiatan_inti || 'Belum diisi.'}</div>
                    </div>

                    <div>
                        <strong style="color:#1e293b; font-size:0.88rem;">3. Penutup & Evaluasi</strong>
                        <div class="rpp-block-content">${rppData.kegiatan_penutup || 'Belum diisi.'}</div>
                    </div>
                </div>

                <!-- SECTION D: PENILAIAN -->
                <div class="rpp-block">
                    <h4><i class="fas fa-clipboard-check"></i> D. INDIKATOR PENILAIAN / ACHIEVEMENT</h4>
                    <div class="rpp-block-content">${rppData.indikator_penilaian || 'Belum diisi.'}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = renderRppCard(mainRpp, mainRpp.version);

    // Bind event ganti versi RPP di preview
    setTimeout(() => {
        const verSel = document.getElementById('rpp-version-select');
        if (verSel) {
            verSel.onchange = (e) => {
                const targetVer = e.target.value;
                if (targetVer === mainRpp.version) {
                    container.innerHTML = renderRppCard(mainRpp, mainRpp.version);
                } else {
                    const foundHist = versionHistory.find(vh => vh.version === targetVer);
                    if (foundHist) {
                        const histData = foundHist.rpp || foundHist;
                        container.innerHTML = renderRppCard(histData, targetVer);
                    }
                }
                // Re-bind listener setelah re-render
                openRppReader(id);
            };
        }
    }, 50);

    document.getElementById('modal-rpp-overlay').classList.add('active');
}

// ==========================================
// 7. EVENT HANDLERS
// ==========================================

function setupEventListeners() {
    document.getElementById("btnMateri").onclick = () => switchTab('materi');
    document.getElementById("btnAchievement").onclick = () => switchTab('achievement');
    document.getElementById("globalSearch").oninput = loadData;

    // Filter Chips Event
    const chipContainer = document.getElementById("level-filter-bar");
    chipContainer.onclick = (e) => {
        const chip = e.target.closest('.level-chip');
        if (!chip) return;
        chipContainer.querySelectorAll('.level-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedLevelId = chip.dataset.level;
        loadData();
    };

    document.getElementById("fab-add").onclick = async () => {
        editingId = null;
        await injectFormFields("add");
        document.getElementById("modal-overlay").classList.add("active");
    };

    document.getElementById("modal-close").onclick = () => {
        document.getElementById("modal-overlay").classList.remove("active");
    };

    document.getElementById("modal-rpp-close").onclick = () => {
        document.getElementById("modal-rpp-overlay").classList.remove("active");
    };

    document.getElementById("btn-print-rpp").onclick = () => {
        window.print();
    };

    document.getElementById("dynamic-form").onsubmit = handleFormSubmit;

    document.getElementById("main-content-area").onclick = (e) => {
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            e.stopPropagation();
            deleteData(btnDelete.dataset.type, btnDelete.dataset.id);
            return;
        }

        const btnRpp = e.target.closest('.btn-rpp-view');
        if (btnRpp) {
            e.stopPropagation();
            openRppReader(btnRpp.dataset.id);
            return;
        }

        const card = e.target.closest('.item-card');
        if (card) {
            openEdit(card.dataset.type, card.dataset.id);
        }
    };
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById("btnMateri").className = tab === 'materi' ? 'tab-btn active' : 'tab-btn';
    document.getElementById("btnAchievement").className = tab === 'achievement' ? 'tab-btn active' : 'tab-btn';
    document.getElementById("materi-list").style.display = tab === 'materi' ? 'block' : 'none';
    document.getElementById("achievement-list").style.display = tab === 'achievement' ? 'block' : 'none';
    loadData();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const tableMap = { materi: 'materi', achievement: 'achievement_sekolah' };
    const payload = {};
    
    e.target.querySelectorAll("input:not(.sub-input), select, textarea").forEach(el => {
        if (el.id && el.id !== 'save_history_snapshot') payload[el.id] = el.value;
    });

    const shouldSaveHistory = Boolean(document.getElementById('save_history_snapshot')?.checked);

    // Sinkronkan teks level dari level_id yang dipilih
    if (payload.level_id) {
        const matchedLevel = levelsList.find(l => l.id === payload.level_id);
        if (matchedLevel) {
            payload.level = matchedLevel.kode;
        }
    }

    if (currentTab === "materi") {
        // Jika sedang edit materi dan centang save_history_snapshot, simpan snapshot lama dulu
        if (editingId && shouldSaveHistory) {
            const oldMateri = currentMateriCache.find(m => m.id === editingId);
            if (oldMateri) {
                const oldRpp = parseRppData(oldMateri);
                try {
                    await supabase.from('materi_versions').insert([{
                        materi_id: editingId,
                        version: oldRpp.version || '1.0',
                        title: oldMateri.title,
                        version_notes: oldRpp.version_notes || 'Versi sebelum diperbarui',
                        snapshot: oldRpp
                    }]);
                } catch (vErr) {
                    console.warn("Gagal simpan snapshot ke materi_versions table:", vErr);
                }
            }
        }

        // Simpan JSON fallback RPP ke dalam field detail agar fleksibel & kompatibel
        const rppBackup = {
            is_rpp: true,
            version: payload.version || '1.0',
            version_notes: payload.version_notes || '',
            alokasi_waktu: payload.alokasi_waktu || '',
            tujuan_pembelajaran: payload.tujuan_pembelajaran || '',
            alat_bahan: payload.alat_bahan || '',
            kegiatan_apersepsi: payload.kegiatan_apersepsi || '',
            kegiatan_inti: payload.kegiatan_inti || '',
            kegiatan_penutup: payload.kegiatan_penutup || '',
            indikator_penilaian: payload.indikator_penilaian || ''
        };
        // Jika detail kosong, isi dengan JSON RPP
        if (!payload.detail) {
            payload.detail = JSON.stringify(rppBackup);
        }
    }

    if (currentTab === "achievement") {
        const subInputs = Array.from(document.querySelectorAll(".sub-input"));
        payload.sub_achievement = subInputs.map(i => i.value.trim()).filter(v => v !== "").join('\n');
    }

    try {
        const { error } = editingId 
            ? await supabase.from(tableMap[currentTab]).update(payload).eq('id', editingId) 
            : await supabase.from(tableMap[currentTab]).insert([payload]);
            
        if (error) {
            // Jika error karena kolom baru belum di-alter di Supabase DB, hapus field versi/rpp baru & simpan via JSON detail
            delete payload.version;
            delete payload.version_notes;
            delete payload.alokasi_waktu;
            delete payload.tujuan_pembelajaran;
            delete payload.alat_bahan;
            delete payload.kegiatan_apersepsi;
            delete payload.kegiatan_inti;
            delete payload.kegiatan_penutup;
            delete payload.indikator_penilaian;

            const { error: retryError } = editingId 
                ? await supabase.from(tableMap[currentTab]).update(payload).eq('id', editingId) 
                : await supabase.from(tableMap[currentTab]).insert([payload]);
            if (retryError) throw retryError;
        }

        document.getElementById("modal-overlay").classList.remove("active");
        loadData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

async function openEdit(type, id) {
    const table = type === 'materi' ? 'materi' : 'achievement_sekolah';
    const { data } = await supabase.from(table).select('*').eq('id', id).single();
    if (data) {
        editingId = id;
        await injectFormFields("edit", data);
        document.getElementById("modal-overlay").classList.add("active");
    }
}

async function deleteData(tableType, id) {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    const { error } = await supabase.from(tableType).delete().eq('id', id);
    if (!error) loadData();
    else alert("Gagal menghapus: " + error.message);
}