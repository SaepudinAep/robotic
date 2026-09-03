/**
 * Project: Guru & Materi Module (School)
 * Version: 8.1 - Single-Scroll RPP Form (tanpa multi-tab berlapis) + Panel "Isi Otomatis dari AI" (paste auto-fill & prompt kontekstual dari form; kolom kosong ditanyakan AI dulu), Versi RPP (v1.0/v2.0), RPP Reader & Interactive Assembly Slider Viewer, RBAC Soft vs Hard Delete
 * Format: Touch & Tablet Optimized UI
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';
import { openImageCropper } from '../assets/js/image-cropper.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let currentUserProfile = null;
let userRole = 'teacher'; // 'super_admin' | 'teacher'
let currentTab = "materi"; 
let editingId = null;
let selectedLevelId = "all";
let levelsList = [];
let subLevelsList = [];
let currentMateriCache = [];

// Viewer State untuk Assembly Slider
let currentViewingMateri = null;
let currentViewingSteps = [];
let currentStepIndex = 0;

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas, userProfile = null) {
    currentUserProfile = userProfile;
    userRole = userProfile?.role || 'teacher';

    await fetchLevels();
    injectStyles();

    canvas.innerHTML = `
        <div class="gm-container fade-in">
            <div class="gm-header">
                <div>
                    <h2>Kurikulum &amp; RPP Sekolah</h2>
                    <p>Kelola materi pembelajaran, RPP terstruktur, versi kurikulum (v1.0/v2.0), dan target achievement.</p>
                </div>
            </div>

            <!-- MAIN TABS -->
            <div class="gm-tabs">
                <button id="btnMateri" class="tab-btn active" data-tab="materi">
                    <i class="fas fa-book-bookmark"></i> MATERI &amp; RPP SEKOLAH
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
                <div id="loading-state" style="text-align:center; padding:40px; color:#94a3b8;">
                    <i class="fas fa-circle-notch fa-spin fa-2x"></i>
                    <p style="margin-top:10px; font-weight:600;">Memuat data materi...</p>
                </div>
                <div id="materi-list" class="content-list active"></div>
                <div id="achievement-list" class="content-list" style="display:none;"></div>
            </div>
        </div>

        <!-- FLOATING ACTION BUTTON (ADD) -->
        <button id="fab-add" class="fab-btn" title="Tambah Data Baru">
            <i class="fas fa-plus"></i>
        </button>

        <!-- MODAL FORM DRAWER (4 RPP TABS) -->
        <div id="modal-overlay" class="modal-overlay">
            <div class="modal-drawer">
                <div class="modal-header">
                    <h2 id="modal-title">Input Data</h2>
                    <button id="modal-close" class="close-btn" aria-label="Tutup">&times;</button>
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
                        <button id="btn-open-assembly-from-rpp" type="button" class="btn-action-icon" title="Buka Petunjuk Perakitan Robot" style="background:#f0fdf4; color:#16a34a; border-color:#bbf7d0; width:auto; padding:0 12px; font-weight:700; font-size:0.82rem; gap:6px;">
                            <i class="fas fa-puzzle-piece"></i> Petunjuk Perakitan
                        </button>
                        <button id="btn-print-rpp" type="button" class="btn-action-icon" title="Cetak RPP" style="background:#eff6ff; color:#2563eb; border-color:#bfdbfe;">
                            <i class="fas fa-print"></i>
                        </button>
                        <button id="modal-rpp-close" class="close-btn" aria-label="Tutup">&times;</button>
                    </div>
                </div>
                <div class="modal-body" id="rpp-preview-container">
                    <!-- Dynamic RPP Content -->
                </div>
            </div>
        </div>

        <!-- MODAL INTERACTIVE ASSEMBLY SLIDER VIEWER -->
        <div id="modal-ag-viewer" class="modal-overlay">
            <div class="modal-drawer ag-viewer-drawer">
                <div class="modal-header">
                    <div>
                        <h2 id="viewer-robot-title" style="font-size:1.15rem; margin:0; color:#0f172a;">Nama Robot</h2>
                        <span id="viewer-step-badge" class="badge-sublevel-tag" style="margin-top:4px;">Step 1 dari 1</span>
                    </div>
                    <button id="modal-ag-viewer-close" class="close-btn" aria-label="Tutup">&times;</button>
                </div>
                <div class="modal-body" id="viewer-slider-body">
                    <!-- Dynamic Step Slide Content -->
                </div>
                <div class="ag-viewer-footer">
                    <button id="btn-prev-step" class="btn-ag-nav" disabled>
                        <i class="fas fa-arrow-left"></i> Sebelumnya
                    </button>
                    <div id="viewer-dots-container" class="ag-dots-bar"></div>
                    <button id="btn-next-step" class="btn-ag-nav primary">
                        Selanjutnya <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    setupEventListeners();
    await loadData();
}

// ==========================================
// 2. FETCH LEVELS & DATA PARSING
// ==========================================
async function fetchLevels() {
    try {
        const { data: lvData } = await supabase.from('levels').select('id, kode, detail').order('kode');
        if (lvData) levelsList = lvData;

        const { data: subData } = await supabase.from('sub_levels').select('id, level_id, kode, name, kit_alat, description, is_active').order('name');
        if (subData) subLevelsList = subData;
    } catch (e) {
        console.error("Gagal memuat levels:", e);
    }
}

function parseMateriDetail(m) {
    let result = {
        version: m.version || '1.0',
        version_notes: m.version_notes || '',
        alokasi_waktu: m.alokasi_waktu || '',
        tujuan_pembelajaran: m.tujuan_pembelajaran || '',
        alat_bahan: m.alat_bahan || '',
        kegiatan_apersepsi: m.kegiatan_apersepsi || '',
        kegiatan_inti: m.kegiatan_inti || '',
        kegiatan_penutup: m.kegiatan_penutup || '',
        indikator_penilaian: m.indikator_penilaian || '',
        assembly_steps: [],
        history: []
    };

    // Normalisasi field step agar viewer robust terhadap sumber data (baru vs legacy)
    const normalizeStep = (s) => ({
        step_number: s.step_number || s.order_index || 0,
        title: s.title || s.step_title || '',
        instruction_text: s.instruction_text || s.description || '',
        image_url: s.image_url || null
    });
    const sortSteps = (a, b) => (a.step_number || 0) - (b.step_number || 0);

    // Kumpulkan step dari join assembly_guides (tabel aktual) & detail JSON (legacy/backup)
    const guideRows = Array.isArray(m.assembly_guides) ? m.assembly_guides : (Array.isArray(m.assembly_guide_steps) ? m.assembly_guide_steps : []);
    const joinSteps = guideRows
        .filter(st => !st.is_deleted)
        .map(normalizeStep)
        .sort(sortSteps);

    let jsonSteps = [];
    if (m.detail && typeof m.detail === 'string' && m.detail.startsWith('{') && m.detail.endsWith('}')) {
        try {
            const jsonDetail = JSON.parse(m.detail);
            if (jsonDetail && jsonDetail.is_rpp) {
                result = { ...result, ...jsonDetail };
            }
            if (Array.isArray(jsonDetail.assembly_steps)) {
                jsonSteps = jsonDetail.assembly_steps
                    .filter(st => !st.is_deleted)
                    .map(normalizeStep)
                    .sort(sortSteps);
            }
        } catch (e) {}
    }

    // Pilih sumber PALING LENGKAP (memiliki foto), agar foto lama di detail JSON tetap tampil
    const hasImages = arr => arr.some(s => Boolean(s.image_url));
    if (jsonSteps.length > 0 && hasImages(jsonSteps)) {
        result.assembly_steps = jsonSteps;
    } else if (joinSteps.length > 0) {
        result.assembly_steps = joinSteps;
    } else if (jsonSteps.length > 0) {
        result.assembly_steps = jsonSteps;
    }
    return result;
}

// ==========================================
// 3. STYLING (CSS INJECTION)
// ==========================================
function injectStyles() {
    const styleId = 'guru-materi-css-v9';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .gm-container { max-width: 1040px; margin: 0 auto; padding-bottom: 90px; font-family: 'Poppins', sans-serif; }
        .gm-header { margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; }
        .gm-header h2 { color: #1e293b; margin: 0; font-size: 1.5rem; font-weight: 800; }
        .gm-header p { color: #64748b; margin: 5px 0 0; font-size: 0.9rem; }

        .gm-tabs { display: flex; gap: 10px; margin-bottom: 15px; background: #fff; padding: 6px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .tab-btn { flex: 1; border: none; background: transparent; padding: 12px 15px; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 10px; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.9rem; }
        .tab-btn.active { background: #4d97ff; color: white; box-shadow: 0 4px 12px rgba(77, 151, 255, 0.3); }

        .gm-filter-section { margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
        .gm-search-wrapper { position: relative; width: 100%; }
        .gm-search-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .gm-search-wrapper input { width: 100%; padding: 12px 15px 12px 42px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 0.95rem; outline: none; background: white; box-sizing: border-box; }
        .gm-search-wrapper input:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.15); }

        .level-filter-bar { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .level-filter-bar::-webkit-scrollbar { display: none; }
        .level-chip { border: 1px solid #e2e8f0; background: white; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; white-space: nowrap; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
        .level-chip.active { background: #1e293b; color: white; border-color: #1e293b; }

        .content-list { display: flex; flex-direction: column; gap: 14px; }

        .materi-card {
            background: white; border-radius: 16px; padding: 16px 20px;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.03); border: 1px solid #edf2f7;
            transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden;
        }
        .materi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-color: #bfdbfe; }
        
        .materi-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; cursor: pointer; }
        
        .materi-thumb {
            width: 75px; height: 75px; border-radius: 12px; flex-shrink: 0;
            background: #f1f5f9; display: flex; align-items: center; justify-content: center;
            overflow: hidden; border: 1px solid #e2e8f0; position: relative;
        }
        .materi-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .materi-thumb i { font-size: 1.8rem; color: #94a3b8; }
        
        .materi-info { flex: 1; min-width: 0; }
        
        .materi-badges-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
        .badge-level-tag { background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .badge-sublevel-tag { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .badge-version-tag { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .badge-rpp-pill { background: #f0f5ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 3px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .badge-assembly-pill { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 3px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }

        .materi-title { margin: 0 0 8px 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .materi-indicators { display: flex; gap: 6px; flex-wrap: wrap; }
        .ind-pill { font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }
        .ind-ok { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
        .ind-no { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }

        .materi-actions { display: flex; align-items: center; gap: 8px; margin-left: 15px; }
        .btn-action-icon {
            background: #f8fafc; border: 1px solid #e2e8f0; width: 40px; height: 40px;
            border-radius: 10px; cursor: pointer; color: #64748b; display: flex;
            align-items: center; justify-content: center; font-size: 0.95rem; transition: 0.2s;
        }
        .btn-action-icon.btn-delete:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
        
        .btn-rpp-view {
            background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 8px 12px;
            border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px; transition: 0.2s;
        }
        .btn-rpp-view:hover { background: #dbeafe; }

        .btn-assembly-view {
            background: #10b981; color: white; border: none; padding: 8px 14px;
            border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px; transition: 0.2s;
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);
        }
        .btn-assembly-view:hover { background: #059669; }

        .fab-btn {
            position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px;
            border-radius: 50%; background: #4d97ff; color: white; border: none;
            font-size: 24px; box-shadow: 0 6px 20px rgba(77, 151, 255, 0.4);
            cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s, background 0.2s;
        }
        .fab-btn:hover { transform: scale(1.08); background: #2563eb; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); z-index: 1000; display: none; align-items: flex-end; backdrop-filter: blur(3px); }
        .modal-overlay.active { display: flex; animation: fadeIn 0.2s ease-out; }
        .modal-drawer { background: white; width: 100%; max-width: 650px; margin: 0 auto; border-radius: 24px 24px 0 0; padding: 25px; max-height: 92vh; overflow-y: auto; position: relative; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .rpp-view-drawer { max-width: 800px; }
        .ag-viewer-drawer { max-width: 840px; height: 92vh; }
        
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1e293b; }
        .close-btn { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #94a3b8; }
        
        /* === FORM SATU HALAMAN (SECTION A-D) === */
        .gm-form-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 16px 18px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
        .gm-section-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px; padding-bottom: 10px; border-bottom: 1px dashed #e2e8f0; }
        .gm-section-letter { width: 28px; height: 28px; border-radius: 9px; background: #4d97ff; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; flex-shrink: 0; }

        /* === PANEL ISI OTOMATIS DARI AI === */
        .gm-ai-box { border: 1px solid #c7d2fe; background: linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%); border-radius: 16px; margin-bottom: 14px; overflow: hidden; }
        .gm-ai-head { display: flex; gap: 10px; align-items: center; padding: 13px 14px; cursor: pointer; user-select: none; }
        .gm-ai-head > i.fa-wand-magic-sparkles { color: #6366f1; font-size: 1.15rem; flex-shrink: 0; }
        .gm-ai-title { flex: 1; min-width: 0; }
        .gm-ai-title strong { display: block; color: #1e293b; font-size: 0.9rem; }
        .gm-ai-title span { font-size: 0.76rem; color: #64748b; line-height: 1.4; display: block; margin-top: 2px; }
        .gm-ai-caret { color: #6366f1; transition: transform 0.25s; flex-shrink: 0; }
        .gm-ai-box.open .gm-ai-caret { transform: rotate(180deg); }
        .gm-ai-body { display: none; padding: 0 14px 14px; }
        .gm-ai-box.open .gm-ai-body { display: block; animation: fadeIn 0.2s ease-out; }
        .gm-ai-field { min-height: 130px; resize: vertical; }
        .gm-ai-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .gm-ai-btn-primary { flex: 2 1 180px; background: #6366f1; color: #fff; border: none; padding: 12px; border-radius: 11px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
        .gm-ai-btn-primary:hover { background: #4f46e5; }
        .gm-ai-btn-ghost { flex: 1 1 150px; background: #fff; color: #4f46e5; border: 1px solid #c7d2fe; padding: 12px; border-radius: 11px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
        .gm-ai-btn-ghost:hover { background: #eef2ff; }
        .gm-ai-hint { font-size: 0.75rem; color: #64748b; margin: 10px 0 0; line-height: 1.5; display: flex; gap: 6px; align-items: flex-start; }
        .gm-ai-hint i { margin-top: 2px; flex-shrink: 0; }

        #form-fields label { display: block; font-weight: 700; margin-bottom: 6px; color: #334155; font-size: 0.85rem; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        #form-fields input, #form-fields textarea, #form-fields select { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.93rem; font-family: inherit; box-sizing: border-box; outline: none; transition: 0.2s; }
        #form-fields input:focus, #form-fields textarea:focus, #form-fields select:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.15); }
        
        .btn-primary { width: 100%; padding: 14px; background: #4d97ff; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; margin-top: 20px; transition: 0.2s; box-shadow: 0 4px 12px rgba(77, 151, 255, 0.3); }
        .btn-primary:hover { background: #2563eb; }

        .ag-viewer-body-content { display: flex; flex-direction: column; align-items: center; text-align: center; height: 100%; }
        .ag-step-image-box { width: 100%; max-height: 48vh; background: #0f172a; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .ag-step-image-box img { max-width: 100%; max-height: 48vh; object-fit: contain; }
        .ag-step-text-box { width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; text-align: left; }
        .ag-step-text-box h4 { margin: 0 0 6px 0; font-size: 1.05rem; color: #0f172a; font-weight: 800; }
        .ag-step-text-box p { margin: 0; color: #334155; font-size: 0.93rem; line-height: 1.6; }

        .ag-viewer-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 14px; }
        .btn-ag-nav { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-ag-nav.primary { background: #10b981; color: white; border-color: #10b981; }
        .btn-ag-nav:disabled { opacity: 0.4; cursor: not-allowed; }

        .ag-dots-bar { display: flex; gap: 6px; overflow-x: auto; max-width: 280px; scrollbar-width: none; }
        .ag-dot { width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; cursor: pointer; flex-shrink: 0; transition: 0.2s; }
        .ag-dot.active { background: #10b981; transform: scale(1.3); }

        .rpp-preview-card { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; font-family: 'Poppins', sans-serif; color: #1e293b; }
        .rpp-header-box { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 16px; margin-bottom: 20px; }
        .rpp-header-box h3 { margin: 0 0 6px 0; font-size: 1.3rem; color: #0f172a; font-weight: 800; }
        .rpp-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 12px; text-align: left; }
        .rpp-meta-item label { font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; }
        .rpp-meta-item span { font-size: 0.88rem; font-weight: 700; color: #1e293b; }

        .rpp-block { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
        .rpp-block h4 { margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 800; color: #2563eb; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; }
        .rpp-block-content { font-size: 0.9rem; color: #334155; line-height: 1.6; white-space: pre-line; }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        @media print {
            body * { visibility: hidden; }
            #rpp-printable-area, #rpp-printable-area * { visibility: visible; }
            #rpp-printable-area {
                position: absolute; left: 0; top: 0; width: 100%; max-width: 100%;
                box-shadow: none; border: none; margin: 0;
            }
        }

        @media (max-width: 600px) {
            .materi-card { flex-direction: column; align-items: flex-start; gap: 12px; }
            .materi-left { width: 100%; }
            .materi-actions { width: 100%; justify-content: space-between; margin-left: 0; border-top: 1px solid #f1f5f9; padding-top: 10px; }
            .materi-thumb { width: 65px; height: 65px; }
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
            // === Query dengan kolom baru (setelah migrasi) ===
            let query = supabase
                .from('materi')
                .select('*, levels(id, kode, detail), sub_levels(name, kode), assembly_guides(id, title, description, image_url, step_number, instruction_text, created_at)')
                .or('is_deleted.is.null,is_deleted.eq.false')
                .order('created_at', { ascending: false });

            if (selectedLevelId !== "all") {
                query = query.eq('level_id', selectedLevelId);
            }

            let { data, error } = await query;

            // === Fallback: Jika tabel/kolom baru belum ada (migrasi belum dijalankan) ===
            if (error) {
                console.warn('[guru-materi] Query utama gagal, mencoba fallback:', error.message);
                let fallbackQuery = supabase
                    .from('materi')
                    .select('*, levels(id, kode, detail), sub_levels(name, kode)')
                    .order('created_at', { ascending: false });

                if (selectedLevelId !== "all") {
                    fallbackQuery = fallbackQuery.eq('level_id', selectedLevelId);
                }

                const fallback = await fallbackQuery;
                data = fallback.data;
                error = fallback.error;
            }

            loading.style.display = 'none';
            if (error) throw error;

            currentMateriCache = data || [];

            const filtered = data ? data.filter(m => {
                const titleMatch = m.title?.toLowerCase().includes(search);
                const descMatch = m.description?.toLowerCase().includes(search);
                const levelMatch = m.levels?.kode?.toLowerCase().includes(search) || m.level?.toLowerCase().includes(search);
                const rpp = parseMateriDetail(m);
                const versionMatch = ('v' + rpp.version).toLowerCase().includes(search);
                const rppMatch = (rpp.tujuan_pembelajaran + rpp.alat_bahan).toLowerCase().includes(search);
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
                const rpp = parseMateriDetail(m);
                const hasTitle = Boolean(m.title && m.title.trim());
                const hasImg = Boolean(m.image_url && m.image_url.trim());
                const hasDesc = Boolean((m.description && m.description.trim()) || (m.detail && m.detail.trim()));
                const hasRpp = Boolean(rpp.tujuan_pembelajaran || rpp.kegiatan_inti);
                const hasAssembly = Boolean(rpp.assembly_steps && rpp.assembly_steps.length > 0);
                const isComplete = hasTitle && hasImg && hasDesc && hasRpp && hasAssembly;
                const levelName = m.levels?.kode || m.level || 'Umum';
                const subLevelName = m.sub_level_id ? (m.sub_levels?.name || m.sub_levels?.kode || '') : '';

                return `
                    <div class="materi-card item-card" data-id="${m.id}" data-type="materi">
                        <div class="materi-left" data-action="edit">
                            <div class="materi-thumb">
                                ${hasImg 
                                    ? `<img src="${m.image_url}" alt="${m.title}" loading="lazy">` 
                                    : `<i class="fas fa-robot"></i>`
                                }
                            </div>
                            <div class="materi-info">
                                <div class="materi-badges-top">
                                    <span class="badge-level-tag">
                                        <i class="fas fa-layer-group"></i> ${levelName}
                                    </span>
                                    ${subLevelName ? `<span class="badge-sublevel-tag"><i class="fas fa-tag"></i> ${subLevelName}</span>` : ''}
                                    <span class="badge-version-tag"><i class="fas fa-code-branch"></i> v${rpp.version}</span>
                                    ${hasRpp ? `<span class="badge-rpp-pill"><i class="fas fa-file-circle-check"></i> RPP</span>` : ''}
                                    ${hasAssembly ? `<span class="badge-assembly-pill"><i class="fas fa-puzzle-piece"></i> ${rpp.assembly_steps.length} Steps</span>` : ''}
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
                                    <span class="ind-pill ${hasAssembly ? 'ind-ok' : 'ind-no'}" title="Status Perakitan">
                                        <i class="fas ${hasAssembly ? 'fa-check' : 'fa-xmark'}"></i> Perakitan
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="materi-actions">
                            <button class="btn-rpp-view" data-action="view-rpp" data-id="${m.id}" title="Lihat RPP" aria-label="Lihat RPP">
                                <i class="fas fa-file-signature"></i> RPP
                            </button>
                            <button class="btn-assembly-view" data-action="view-assembly" data-id="${m.id}" title="Buka Petunjuk Perakitan Slider" aria-label="Buka petunjuk perakitan slider">
                                <i class="fas fa-puzzle-piece"></i> Perakitan
                            </button>
                            <button class="btn-action-icon btn-delete" data-id="${m.id}" data-type="materi" title="Hapus Materi" aria-label="Hapus Materi">
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
                            <button class="btn-action-icon btn-delete" data-id="${a.id}" data-type="achievement_sekolah" title="Hapus Achievement" aria-label="Hapus Achievement">
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
// 5. FORM HANDLING (Single-Scroll Form + AI Auto-Fill)
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
        const rpp = parseMateriDetail(data);
        const currentImg = data.image_url || "https://via.placeholder.com/200?text=Pilih+Foto+Project";
        const hasImg = Boolean(data.image_url);

        formFields.innerHTML = `
            <!-- PANEL ISI OTOMATIS DARI AI (Single Paste) -->
            <div class="gm-ai-box${mode === "add" ? " open" : ""}" id="gm-ai-box">
                <div class="gm-ai-head" id="gm-ai-head" role="button" tabindex="0" aria-expanded="false">
                    <i class="fas fa-wand-magic-sparkles"></i>
                    <div class="gm-ai-title">
                        <strong>Isi Otomatis dari AI</strong>
                        <span>Tempel satu kali hasil RPP dari AI Anda &mdash; semua kolom di bawah terisi otomatis. Tidak perlu pindah-pindah tab.</span>
                    </div>
                    <i class="fas fa-chevron-down gm-ai-caret"></i>
                </div>
                <div class="gm-ai-body">
                    <textarea class="gm-ai-field" rows="7" placeholder="Tempel di sini hasil lengkap RPP dari AI (teks biasa, markdown, atau JSON), lalu klik &quot;Isi Kolom Otomatis&quot;..."></textarea>
                    <div class="gm-ai-actions">
                        <button type="button" id="btn-ai-fill" class="gm-ai-btn-primary">
                            <i class="fas fa-fill-drip"></i> Isi Kolom Otomatis
                        </button>
                        <button type="button" id="btn-ai-copy-prompt" class="gm-ai-btn-ghost">
                            <i class="fas fa-copy"></i> Salin Prompt untuk AI
                        </button>
                    </div>
                    <p class="gm-ai-hint">
                        <i class="fas fa-circle-info"></i>
                        <span>Tips alur kerja: klik <strong>Salin Prompt untuk AI</strong> &mdash; prompt menyertakan <strong>pilihan Level, Sub-Level &amp; Kit</strong> yang aktif di form, dan <strong>kolom yang masih kosong akan ditanyakan AI dulu</strong> (bukan dikarang sendiri) &rarr; jawab pertanyaannya &rarr; salin hasil RPP-nya &rarr; tempel balik ke kotak di atas &rarr; klik <strong>Isi Kolom Otomatis</strong>.</span>
                    </p>
                </div>
            </div>

            <!-- SECTION A: IDENTITAS, VERSI & PROJECT -->
            <div class="gm-form-section">
                <div class="gm-section-title"><span class="gm-section-letter">A</span> Identitas, Versi &amp; Project</div>
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

                <label>Judul Materi / Topik Robot *</label>
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

            <!-- SECTION B: TUJUAN PEMBELAJARAN & ALAT/KIT -->
            <div class="gm-form-section">
                <div class="gm-section-title"><span class="gm-section-letter">B</span> Tujuan Pembelajaran &amp; Alat/Kit</div>
                <label>Tujuan Pembelajaran (RPP)</label>
                <textarea id="tujuan_pembelajaran" rows="4" placeholder="Contoh:&#10;1. Siswa memahami fungsi sensor garis.&#10;2. Siswa mampu merakit bodi robot.">${rpp.tujuan_pembelajaran || ""}</textarea>

                <label>Alat & Bahan / Robot Kit Yang Digunakan</label>
                <textarea id="alat_bahan" rows="4" placeholder="Contoh: LEGO WeDo 2.0 Kit, Kabel USB, Laptop/Tablet...">${rpp.alat_bahan || ""}</textarea>
            </div>

            <!-- SECTION C: LANGKAH KEGIATAN PEMBELAJARAN -->
            <div class="gm-form-section">
                <div class="gm-section-title"><span class="gm-section-letter">C</span> Langkah Kegiatan Pembelajaran</div>
                <label>Apersepsi / Pendahuluan (15 Menit)</label>
                <textarea id="kegiatan_apersepsi" rows="3" placeholder="Sapa siswa, apersepsi materi minggu lalu, jelaskan tantangan robot hari ini...">${rpp.kegiatan_apersepsi || ""}</textarea>

                <label>Kegiatan Inti / Perakitan & Coding (60 Menit)</label>
                <textarea id="kegiatan_inti" rows="5" placeholder="Langkah 1: Merakit sasis robot.&#10;Langkah 2: Menghubungkan sensor.&#10;Langkah 3: Pemrograman logika pergerakan...">${rpp.kegiatan_inti || ""}</textarea>

                <label>Kegiatan Penutup / Evaluasi (15 Menit)</label>
                <textarea id="kegiatan_penutup" rows="3" placeholder="Uji coba robot di arena, pengemasan kit, apresiasi karya siswa...">${rpp.kegiatan_penutup || ""}</textarea>
            </div>

            <!-- SECTION D: PENILAIAN & CATATAN GURU -->
            <div class="gm-form-section">
                <div class="gm-section-title"><span class="gm-section-letter">D</span> Penilaian &amp; Catatan Guru</div>
                <label>Indikator Penilaian / Achievement Target</label>
                <textarea id="indikator_penilaian" rows="4" placeholder="Kriteria Penilaian:&#10;- Ketepatan perakitan fisik&#10;- Logika coding berhasil berjalan&#10;- Kerjasama tim">${rpp.indikator_penilaian || ""}</textarea>

                <label>Catatan Tambahan Guru (Detail Opsional)</label>
                <textarea id="detail" rows="3" placeholder="Catatan khusus untuk pengajar...">${data.detail && !data.detail.startsWith('{') ? data.detail : ""}</textarea>
            </div>
        `;

        setTimeout(() => {
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

            // === Panel "Isi Otomatis dari AI" ===
            const aiBox = document.getElementById("gm-ai-box");
            const aiHead = document.getElementById("gm-ai-head");
            if (aiBox && aiHead) {
                const toggleAiBox = () => {
                    aiBox.classList.toggle('open');
                    aiHead.setAttribute('aria-expanded', aiBox.classList.contains('open') ? 'true' : 'false');
                };
                aiHead.onclick = toggleAiBox;
                aiHead.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleAiBox(); } };
            }

            const btnFill = document.getElementById("btn-ai-fill");
            if (btnFill) {
                btnFill.onclick = () => {
                    const raw = (document.querySelector('.gm-ai-field')?.value || '').trim();
                    if (!raw) {
                        showToast('Kotak tempel masih kosong. Tempel dulu hasil RPP dari AI Anda.', 'error');
                        return;
                    }
                    const parsed = parseAiRppText(raw);
                    if (!parsed) {
                        showToast('Tidak ada bagian yang dikenali. Klik "Salin Prompt untuk AI" agar format keluaran AI sesuai.', 'error');
                        return;
                    }
                    applyParsedToForm(parsed);
                    showToast(`${Object.keys(parsed).length} bagian berhasil diisi otomatis. Periksa kembali sebelum menyimpan.`, 'success');
                };
            }

            const btnPrompt = document.getElementById("btn-ai-copy-prompt");
            if (btnPrompt) {
                btnPrompt.onclick = async () => {
                    btnPrompt.disabled = true;
                    try {
                        const promptText = await buildAiPromptTemplate();
                        const ok = await copyToClipboard(promptText);
                        showToast(ok
                            ? 'Prompt disalin. AI akan menanyakan dulu data yang masih kosong sebelum membuat RPP.'
                            : 'Gagal menyalin prompt ke clipboard.', ok ? 'success' : 'error');
                    } finally {
                        btnPrompt.disabled = false;
                    }
                };
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
// 5B. AI PASTE AUTO-FILL (Isi Otomatis dari AI)
// ==========================================

// Escape karakter HTML agar nilai aman disuntikkan ke template form
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Prompt siap-tempel: konteks HANYA dari pilihan aktif di form (dropdown Level &
// Sub-Level + Kit-nya, judul, durasi). Kolom yang masih kosong TIDAK dikarang —
// AI diwajibkan menanyakannya dulu kepada user sebelum membuat RPP.
function buildAiPromptTemplate() {
    const selLevelId = document.getElementById('level_id')?.value || '';
    const selSubId = document.getElementById('sub_level_id')?.value || '';
    const currentTitle = (document.getElementById('title')?.value || '').trim();
    const currentDurasi = (document.getElementById('alokasi_waktu')?.value || '').trim();

    const selLevel = levelsList.find(l => l.id === selLevelId) || null;
    const selSub = subLevelsList.find(s => s.id === selSubId) || null;

    // --- Data yang SUDAH terisi di form ---
    const knownLines = [];
    if (selLevel) knownLines.push(`- Level: ${selLevel.kode}${selLevel.detail ? ` (${selLevel.detail})` : ''}`);
    if (selSub) knownLines.push(`- Sub-Level: ${selSub.name}`);
    if (selSub && selSub.kit_alat) knownLines.push(`- Kit/alat yang WAJIB dipakai: ${selSub.kit_alat}`);
    if (selSub && selSub.description) knownLines.push(`- Fokus kit/sub-level: ${selSub.description}`);
    if (currentTitle) knownLines.push(`- Nama materi (judul) yang sedang dibuat/direvisi: ${currentTitle}`);
    if (currentDurasi) knownLines.push(`- Durasi sesi: ${currentDurasi}`);
    const knownSection = knownLines.length
        ? knownLines.join('\n')
        : '- (belum ada data yang terisi di form — tanyakan semuanya)';

    // --- Data yang MASIH kosong -> wajib ditanyakan dulu, bukan dikarang ---
    const missingLines = [];
    if (!selLevel) missingLines.push('- Level siswa (nama level yang ada di sekolah ini)');
    if (!selSub) missingLines.push('- Sub-Level siswa (sub-level/kit kelas yang ditarget)');
    if (selSub && !selSub.kit_alat) missingLines.push('- Kit/alat yang dipakai untuk sub-level ini');
    if (!currentTitle) missingLines.push('- Topik / Robot / nama materi yang ingin dibuat');
    if (!currentDurasi) missingLines.push('- Durasi sesi pembelajaran (contoh jawaban: 2 Sesi @ 90 Menit)');
    missingLines.push('- Permintaan tambahan khusus (opsional; boleh dijawab "tidak ada")');

    // Ada data utama yang kosong? -> AI wajib bertanya dulu. Jika hanya opsional -> langsung buat.
    const hasRequiredMissing = missingLines.length > 1;

    const workRules = hasRequiredMissing ? [
        '=== ATURAN KERJA (WAJIB SEBELUM MEMBUAT RPP) ===',
        '1. JANGAN langsung membuat RPP sekarang.',
        '2. Tanyakan dulu SEMUA poin di "DATA YANG MASIH KOSONG" dalam SATU pesan yang singkat dan rapi, lalu BERHENTI dan tunggu jawaban user.',
        '3. DILARANG mengarang atau mengisi sendiri data yang masih kosong.',
        '4. Setelah user menjawab (atau menjawab "bebas"/"terserah" untuk sebagian), langsung buatkan RPP memakai FORMAT OUTPUT di bawah tanpa basa-basi lagi.'
    ] : [
        '=== ATURAN KERJA ===',
        '1. Semua data utama sudah lengkap — langsung buatkan RPP memakai FORMAT OUTPUT di bawah.',
        '2. Tidak perlu bertanya apa pun; abaikan bagian permintaan tambahan yang kosong.'
    ];

    return [
        'Anda adalah perancang RPP (Rencana Pelaksanaan Pembelajaran) untuk sekolah coding & robotik.',
        '',
        '=== DATA YANG SUDAH DIKETAHUI (dari form, gunakan istilahnya PERSIS) ===',
        knownSection,
        '',
        '=== DATA YANG MASIH KOSONG ===',
        missingLines.join('\n'),
        '',
        ...workRules,
        '',
        '=== FORMAT OUTPUT RPP ===',
        'ATURAN OUTPUT (WAJIB saat membuat RPP):',
        '1. Gunakan PERSIS nama bagian berikut, jangan menerjemahkan ulang atau mengubah nama bagian.',
        '2. Tanpa kalimat pembuka/penutup percakapan, langsung keluarkan format di bawah.',
        '3. Isi setiap bagian dalam bentuk poin dengan tanda "-" di awal baris.',
        '4. Nama Level, Sub-Level, dan Kit di dalam RPP harus sama persis dengan DATA YANG SUDAH DIKETAHUI di atas.',
        '',
        'JUDUL: (judul materi yang menarik)',
        'DESKRIPSI: (ringkasan 1-2 kalimat tentang project robot)',
        'ALOKASI WAKTU: (contoh: 2 Sesi @ 90 Menit)',
        'TUJUAN PEMBELAJARAN:',
        '- (poin tujuan)',
        'ALAT DAN BAHAN:',
        '- (alat / kit / bahan sesuai kit sub-level di atas)',
        'KEGIATAN APERSEPSI:',
        '- (langkah pendahuluan)',
        'KEGIATAN INTI:',
        '- (langkah perakitan & coding secara urut)',
        'KEGIATAN PENUTUP:',
        '- (langkah penutup, refleksi, evaluasi singkat)',
        'INDIKATOR PENILAIAN:',
        '- (kriteria penilaian siswa)'
    ].join('\n');
}

// Salin teks ke clipboard (dengan fallback untuk browser lama / non-secure context)
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch (e2) {
            return false;
        }
    }
}

// Pemetaan field RPP -> kata kunci label (urutan array = urutan prioritas pencocokan)
const AI_FIELD_PATTERNS = [
    { id: 'title', re: /judul|nama\s*(materi|robot|project|proyek)|^topik|materi\s*pembelajaran/i },
    { id: 'description', re: /deskripsi|ringkasan|abstrak|overview|summary/i },
    { id: 'indikator_penilaian', re: /penilaian|indikator|assessment|asessment|kriteria|rubrik|achievement/i },
    { id: 'tujuan_pembelajaran', re: /tujuan|objektif|objective|capaian/i },
    { id: 'alat_bahan', re: /\balat\b|\bbahan\b|\bkit\b|peralatan|perangkat|media/i },
    { id: 'kegiatan_apersepsi', re: /apersepsi|pendahuluan|pembuka|opening|introduction/i },
    { id: 'kegiatan_inti', re: /inti|perakitan|coding|praktik|aktivitas|langkah|prosedur|step/i },
    { id: 'kegiatan_penutup', re: /penutup|evaluasi|closing|refleksi|kesimpulan/i },
    { id: 'alokasi_waktu', re: /alokasi|durasi|waktu|jam\s*pelajaran|\bjp\b|menit/i }
];

function matchAiField(label) {
    for (const fp of AI_FIELD_PATTERNS) {
        if (fp.re.test(label)) return fp.id;
    }
    return null;
}

// Parser utama: menerima output AI (JSON, markdown, atau teks per-bagian) -> objek field form
function parseAiRppText(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;

    // 1) Mode JSON
    if (text.startsWith('{') || text.startsWith('[')) {
        try {
            const jsonResult = mapJsonToRppFields(JSON.parse(text));
            if (jsonResult) return jsonResult;
        } catch (e) { /* bukan JSON valid, lanjut ke mode teks */ }
    }

    // 2) Mode teks per-bagian (label ALL-CAPS, markdown, penomoran, atau label berakhir ':')
    const cleanLabel = (s) => s
        .replace(/^#{1,6}\s*/, '')                                      // markdown heading
        .replace(/^\*\*(.+?)\*\*:?\s*$/, '$1')                          // **bold**
        .replace(/\*\*/g, '')
        .replace(/^\s*(?:\d{1,2}[.)]|[A-Za-z][.)]|[IVX]+[.)])\s*/, '')  // 1. / A. / I.
        .replace(/\s*:\s*$/, '')                                        // label:
        .replace(/\s*\(.*?\)\s*$/, '')                                  // buang anotasi "(15 Menit)"
        .trim();

    const lines = text.split(/\r?\n/);
    const blocks = [];
    let current = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (current) current.content.push('');
            continue;
        }

        // Probe: salinan tanpa penanda **bold** untuk deteksi heading
        const probe = trimmed.replace(/\*\*/g, '').trim();

        // Baris bullet selalu konten (jangan dianggap heading)
        if (/^[-*•]\s+\S/.test(probe)) {
            if (current) current.content.push(line);
            continue;
        }

        // Deteksi kandidat heading
        const colonIdx = probe.indexOf(':');
        const headPart = colonIdx > -1 ? probe.slice(0, colonIdx).trim() : '';
        const restPart = colonIdx > -1 ? probe.slice(colonIdx + 1).trim() : '';
        const isMarkdownHead = /^#{1,6}\s+/.test(probe);
        const isBoldLine = /^\*\*.+\*\*:?\s*$/.test(trimmed);
        const isBoldInline = /^\*\*[^*]+\*\*\s*:/.test(trimmed);
        const isNumbered = /^\s*(?:\d{1,2}[.)]|[A-Za-z][.)]|[IVX]+[.)])\s+\S/.test(probe);
        const isAllCapsInline = colonIdx > -1 && headPart.length >= 3 && headPart.length <= 60
            && headPart === headPart.toUpperCase() && /[A-Z]/.test(headPart);
        const endsWithColon = /:$/.test(probe) && probe.length <= 90;
        const isInlineLabel = colonIdx > -1 && !isNumbered && headPart.length >= 3 && headPart.length <= 40
            && probe.length <= 100 && matchAiField(headPart) !== null;
        const isHeadingLike = isMarkdownHead || isBoldLine || isBoldInline || isAllCapsInline || endsWithColon || isInlineLabel || isNumbered;

        if (isHeadingLike && probe.length <= 120) {
            const label = cleanLabel(probe);
            const fieldId = label ? matchAiField(label) : null;
            const labelWords = label ? label.split(/\s+/).length : 99;
            // Baris bernomor hanya dianggap heading bila labelnya pendek (bukan poin list panjang)
            const okNumbered = !isNumbered || labelWords <= 5;
            if (fieldId && okNumbered) {
                current = { fieldId, inline: restPart, content: [] };
                blocks.push(current);
                continue;
            }
            if (isMarkdownHead || isBoldLine || isBoldInline || isAllCapsInline || endsWithColon) {
                // Heading tak dikenali: putus blok agar tidak mencemari field sebelumnya
                current = null;
                continue;
            }
            // Penomoran yang bukan judul bagian (mis. poin list) -> perlakukan sebagai konten
        }

        if (current) current.content.push(line);
        // Baris sebelum heading pertama yang dikenali diabaikan
    }

    const result = {};
    for (const b of blocks) {
        if (result[b.fieldId]) continue; // blok pertama yang menang
        const body = b.content.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        const value = [b.inline, body].filter(v => v && v.trim()).join('\n').trim();
        if (value) result[b.fieldId] = value;
    }
    return Object.keys(result).length ? result : null;
}

// Petakan output JSON dari AI ke field form (kunci fleksibel, sinonim Indonesia/Inggris)
function mapJsonToRppFields(parsedJson) {
    const root = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;
    if (!root || typeof root !== 'object') return null;

    const flat = {};
    const walk = (obj, prefix) => {
        for (const [key, val] of Object.entries(obj)) {
            const normKey = (prefix ? prefix + '_' : '') + String(key).toLowerCase().replace(/[\s-]+/g, '_');
            if (val && typeof val === 'object' && !Array.isArray(val)) walk(val, normKey);
            else flat[normKey] = val;
        }
    };
    walk(root, '');

    const SYNONYMS = {
        title: ['judul', 'title', 'materi', 'topik', 'nama_materi', 'nama_robot', 'nama_project', 'nama_proyek', 'nama'],
        description: ['deskripsi', 'description', 'ringkasan', 'summary', 'overview', 'abstrak'],
        version: ['versi', 'version', 'versi_rpp'],
        version_notes: ['version_notes', 'catatan_revisi', 'catatan_versi', 'changelog'],
        alokasi_waktu: ['alokasi_waktu', 'alokasi', 'durasi', 'waktu', 'durasi_sesi', 'jam_pelajaran'],
        tujuan_pembelajaran: ['tujuan_pembelajaran', 'tujuan', 'objectives', 'objective', 'capaian_pembelajaran'],
        alat_bahan: ['alat_bahan', 'alat_dan_bahan', 'alat', 'bahan', 'kit', 'robot_kit', 'peralatan', 'media'],
        kegiatan_apersepsi: ['kegiatan_apersepsi', 'apersepsi', 'pendahuluan', 'kegiatan_pendahuluan'],
        kegiatan_inti: ['kegiatan_inti', 'inti', 'kegiatan_utama', 'langkah_kegiatan', 'aktivitas_utama'],
        kegiatan_penutup: ['kegiatan_penutup', 'penutup', 'evaluasi', 'closing', 'refleksi'],
        indikator_penilaian: ['indikator_penilaian', 'penilaian', 'indikator', 'kriteria_penilaian', 'assessment', 'rubrik']
    };

    const toText = (val) => {
        if (Array.isArray(val)) {
            return val.map(v => `- ${String(typeof v === 'object' && v !== null ? JSON.stringify(v) : v).trim()}`).join('\n');
        }
        if (val === null || val === undefined || typeof val === 'object') return '';
        return String(val).trim();
    };

    const result = {};
    for (const [field, keys] of Object.entries(SYNONYMS)) {
        // Coba kecocokan kunci persis dulu, lalu kecocokan berakhiran '_sinonim' (JSON nested)
        for (const mode of ['exact', 'suffix']) {
            for (const k of keys) {
                const hit = mode === 'exact'
                    ? (Object.prototype.hasOwnProperty.call(flat, k) ? k : null)
                    : Object.keys(flat).find(fk => fk.endsWith('_' + k));
                if (!hit) continue;
                const val = toText(flat[hit]);
                if (val) { result[field] = val; break; }
            }
            if (result[field]) break;
        }
    }
    return Object.keys(result).length ? result : null;
}

// Terapkan hasil parse ke kolom form yang ada
function applyParsedToForm(parsed) {
    Object.entries(parsed).forEach(([field, value]) => {
        const el = document.getElementById(field);
        if (el) el.value = value;
    });
    const drawer = document.querySelector('#modal-overlay .modal-drawer');
    if (drawer) drawer.scrollTop = 0;
}

// ==========================================
// 6. RPP READER & INTERACTIVE SLIDER VIEWER
// ==========================================
async function openRppReader(id) {
    const m = currentMateriCache.find(item => item.id === id);
    if (!m) return;

    currentViewingMateri = m;
    const mainRpp = parseMateriDetail(m);
    
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
    } catch (e) {}

    const container = document.getElementById('rpp-preview-container');
    const levelName = m.levels?.kode || m.level || 'Umum';
    const subLevelName = m.sub_levels?.name || m.sub_levels?.kode || '-';

    function renderRppCard(rppData, selectedVer) {
        const isCurrent = selectedVer === mainRpp.version;
        const steps = rppData.assembly_steps || mainRpp.assembly_steps || [];

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
                            <label>Perakitan</label>
                            <span>${steps.length} Langkah</span>
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
                        container.innerHTML = renderRppCard(foundHist.rpp || foundHist, targetVer);
                    }
                }
            };
        }
    }, 50);

    document.getElementById('modal-rpp-overlay').classList.add('active');
}

// Buka Interactive Assembly Slider
function openAssemblySlider(materiId) {
    const m = currentMateriCache.find(item => item.id === materiId);
    if (!m) return;

    currentViewingMateri = m;
    const rpp = parseMateriDetail(m);
    currentViewingSteps = rpp.assembly_steps || [];
    currentStepIndex = 0;

    document.getElementById("viewer-robot-title").innerText = m.title || 'Petunjuk Perakitan Robot';
    renderSliderStep();

    document.getElementById("modal-ag-viewer").classList.add("active");
}

function renderSliderStep() {
    const steps = currentViewingSteps;
    const container = document.getElementById("viewer-slider-body");

    if (!steps || !steps.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:50px; color:#94a3b8;">
                <i class="fas fa-puzzle-piece fa-3x" style="margin-bottom:12px; color:#cbd5e1;"></i>
                <h3 style="margin:0 0 6px 0; color:#1e293b;">Belum ada Langkah Perakitan</h3>
                <p style="margin:0; font-size:0.9rem;">Buka modul <strong>Assembly Guide</strong> untuk menambahkan foto langkah perakitan robot ini.</p>
            </div>`;
        document.getElementById("btn-prev-step").disabled = true;
        document.getElementById("btn-next-step").disabled = true;
        document.getElementById("viewer-step-badge").innerText = `0 Step`;
        document.getElementById("viewer-dots-container").innerHTML = '';
        return;
    }

    const total = steps.length;
    if (currentStepIndex < 0) currentStepIndex = 0;
    if (currentStepIndex >= total) currentStepIndex = total - 1;

    const st = steps[currentStepIndex];
    document.getElementById("viewer-step-badge").innerText = `Step ${currentStepIndex + 1} dari ${total}`;

    container.innerHTML = `
        <div class="ag-viewer-body-content fade-in">
            <div class="ag-step-image-box">
                ${st.image_url 
                    ? `<img src="${st.image_url}" alt="Step ${currentStepIndex + 1}">` 
                    : `<i class="fas fa-camera" style="font-size:3rem; color:#475569;"></i>`
                }
            </div>
            <div class="ag-step-text-box">
                <h4>${st.title || `Langkah ${currentStepIndex + 1}`}</h4>
                <p>${st.instruction_text || 'Tidak ada instruksi khusus.'}</p>
            </div>
        </div>
    `;

    const btnPrev = document.getElementById("btn-prev-step");
    const btnNext = document.getElementById("btn-next-step");
    if (btnPrev) btnPrev.disabled = currentStepIndex === 0;
    if (btnNext) {
        btnNext.disabled = currentStepIndex === total - 1;
        btnNext.innerHTML = currentStepIndex === total - 1 
            ? `Selesai <i class="fas fa-check-circle"></i>` 
            : `Selanjutnya <i class="fas fa-arrow-right"></i>`;
    }

    const dotsContainer = document.getElementById("viewer-dots-container");
    if (dotsContainer) {
        dotsContainer.innerHTML = steps.map((_, i) => `
            <div class="ag-dot ${i === currentStepIndex ? 'active' : ''}" data-idx="${i}"></div>
        `).join("");
    }
}

// ==========================================
// 7. EVENT HANDLERS & RBAC DELETION
// ==========================================

function setupEventListeners() {
    document.getElementById("btnMateri").onclick = () => switchTab('materi');
    document.getElementById("btnAchievement").onclick = () => switchTab('achievement');
    let searchDebounce;
    document.getElementById("globalSearch").oninput = () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(loadData, 300);
    };

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

    document.getElementById("modal-ag-viewer-close").onclick = () => {
        document.getElementById("modal-ag-viewer").classList.remove("active");
    };

    document.getElementById("btn-print-rpp").onclick = () => window.print();

    document.getElementById("btn-open-assembly-from-rpp").onclick = () => {
        if (currentViewingMateri) {
            document.getElementById("modal-rpp-overlay").classList.remove("active");
            openAssemblySlider(currentViewingMateri.id);
        }
    };

    document.getElementById("btn-prev-step").onclick = () => {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            renderSliderStep();
        }
    };

    document.getElementById("btn-next-step").onclick = () => {
        if (currentStepIndex < currentViewingSteps.length - 1) {
            currentStepIndex++;
            renderSliderStep();
        } else {
            document.getElementById("modal-ag-viewer").classList.remove("active");
        }
    };

    document.getElementById("viewer-dots-container").onclick = (e) => {
        const dot = e.target.closest('.ag-dot');
        if (dot) {
            currentStepIndex = parseInt(dot.dataset.idx);
            renderSliderStep();
        }
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

        const btnAssembly = e.target.closest('.btn-assembly-view');
        if (btnAssembly) {
            e.stopPropagation();
            openAssemblySlider(btnAssembly.dataset.id);
            return;
        }

        const card = e.target.closest('.item-card');
        if (card) {
            openEdit(card.dataset.type, card.dataset.id);
        }
    };

    // Tutup modal saat klik backdrop atau tekan Escape
    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.onmousedown = (ev) => { if (ev.target === ov) ov.classList.remove('active'); };
    });
    document.onkeydown = (ev) => {
        if (ev.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(ov => ov.classList.remove('active'));
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
    
    e.target.querySelectorAll("input:not(.sub-input):not(.gm-ai-field), select, textarea:not(.gm-ai-field)").forEach(el => {
        if (el.id && el.id !== 'save_history_snapshot') payload[el.id] = el.value;
    });

    const shouldSaveHistory = Boolean(document.getElementById('save_history_snapshot')?.checked);

    if (payload.level_id) {
        const matchedLevel = levelsList.find(l => l.id === payload.level_id);
        if (matchedLevel) payload.level = matchedLevel.kode;
    }

    if (currentTab === "materi") {
        if (editingId && shouldSaveHistory) {
            const oldMateri = currentMateriCache.find(m => m.id === editingId);
            if (oldMateri) {
                const oldDetail = parseMateriDetail(oldMateri);
                try {
                    await supabase.from('materi_versions').insert([{
                        materi_id: editingId,
                        version: oldDetail.version || '1.0',
                        title: oldMateri.title,
                        version_notes: oldDetail.version_notes || 'Versi sebelum diperbarui',
                        snapshot: oldDetail
                    }]);
                } catch (vErr) {}
            }
        }

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
        payload.detail = JSON.stringify(rppBackup);

        try {
            const { error: saveErr } = editingId 
                ? await supabase.from('materi').update(payload).eq('id', editingId)
                : await supabase.from('materi').insert([payload]);

            if (saveErr) {
                delete payload.version; delete payload.version_notes; delete payload.alokasi_waktu;
                delete payload.tujuan_pembelajaran; delete payload.alat_bahan; delete payload.kegiatan_apersepsi;
                delete payload.kegiatan_inti; delete payload.kegiatan_penutup; delete payload.indikator_penilaian;

                const { error: retryErr } = editingId 
                    ? await supabase.from('materi').update(payload).eq('id', editingId)
                    : await supabase.from('materi').insert([payload]);
                if (retryErr) throw retryErr;
            }

            document.getElementById("modal-overlay").classList.remove("active");
            loadData();
            showToast(editingId ? "Materi & RPP berhasil diperbarui." : "Materi & RPP berhasil disimpan.", 'success');
            return;
        } catch (err) {
            showToast("Error: " + err.message, 'error');
            return;
        }
    }

    if (currentTab === "achievement") {
        const subInputs = Array.from(document.querySelectorAll(".sub-input"));
        payload.sub_achievement = subInputs.map(i => i.value.trim()).filter(v => v !== "").join('\n');
        const { error } = editingId 
            ? await supabase.from('achievement_sekolah').update(payload).eq('id', editingId)
            : await supabase.from('achievement_sekolah').insert([payload]);
        if (error) showToast("Error: " + error.message, 'error');
        else {
            document.getElementById("modal-overlay").classList.remove("active");
            loadData();
            showToast(editingId ? "Achievement berhasil diperbarui." : "Achievement berhasil disimpan.", 'success');
        }
    }
}

async function openEdit(type, id) {
    const table = type === 'materi' ? 'materi' : 'achievement_sekolah';
    let { data, error } = await supabase.from(table).select('*, assembly_guides(id, title, description, image_url, step_number, instruction_text, created_at)').eq('id', id).single();
    if (error) {
        // Fallback: jika kolom embed belum ada (migrasi 02 belum diterapkan), muat tanpa embed
        console.warn('[guru-materi] Embed assembly_guides gagal, fallback select dasar:', error.message);
        const fb = await supabase.from(table).select('*').eq('id', id).single();
        data = fb.data;
    }
    if (data) {
        editingId = id;
        await injectFormFields("edit", data);
        document.getElementById("modal-overlay").classList.add("active");
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'gm-toast';
    toast.style.cssText = `
        position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(20px);
        background:#1e293b;color:#fff;padding:12px 20px;border-radius:12px;font-size:.88rem;
        font-weight:700;z-index:2500;opacity:0;transition:.25s;box-shadow:0 10px 30px rgba(0,0,0,.25);
        display:flex;align-items:center;gap:8px;max-width:90vw;font-family:'Roboto',sans-serif;
    `;
    if (type === 'success') toast.style.background = '#059669';
    if (type === 'error') toast.style.background = '#dc2626';
    if (type === 'info') toast.style.background = '#2563eb';
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openDeleteDialog({ title, message, softLabel = 'Sembunyikan (Soft Delete)', onSoft, onHard }) {
    const overlay = document.createElement('div');
    overlay.className = 'gm-del-overlay';
    overlay.innerHTML = `
        <div class="gm-del-box">
            <div class="gm-del-head">
                <h3 style="margin:0;font-size:1.05rem;color:#1e293b;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-trash-can" style="color:#ef4444;"></i>${title}
                </h3>
                <button type="button" class="gm-del-x" aria-label="Tutup">&times;</button>
            </div>
            <p class="gm-del-msg">${message}</p>
            <div class="gm-del-actions">
                <button type="button" class="gm-del-btn gm-del-cancel">Batal</button>
                <button type="button" class="gm-del-btn gm-del-soft">${softLabel}</button>
                <button type="button" class="gm-del-btn gm-del-hard" style="${onHard ? '' : 'display:none;'}">Hapus Permanen</button>
            </div>
            <div class="gm-del-hardzone" style="display:none;margin-top:14px;border-top:1px dashed #fecaca;padding-top:12px;">
                <label style="font-size:.82rem;font-weight:700;color:#dc2626;display:block;margin-bottom:6px;">
                    <i class="fas fa-key"></i> Ketik <strong>HAPUS</strong> untuk konfirmasi permanen:
                </label>
                <input type="text" class="gm-del-input" placeholder="HAPUS" autocomplete="off"
                    style="width:100%;padding:10px 12px;border:1px solid #fecaca;border-radius:10px;font-family:inherit;outline:none;">
                <button type="button" class="gm-del-btn gm-del-hard-confirm" disabled
                    style="margin-top:10px;width:100%;background:#dc2626;color:#fff;border:none;padding:11px 14px;border-radius:10px;font-weight:800;cursor:pointer;">
                    <i class="fas fa-radiation"></i> Ya, Hapus Permanen Sekarang
                </button>
            </div>
        </div>
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .gm-del-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease-out;}
        .gm-del-box{background:#fff;border-radius:18px;max-width:430px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.25);}
        .gm-del-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
        .gm-del-x{background:none;border:none;font-size:1.6rem;color:#94a3b8;cursor:pointer;line-height:1;}
        .gm-del-msg{color:#475569;font-size:.92rem;line-height:1.65;margin:0 0 18px;}
        .gm-del-actions{display:flex;gap:8px;flex-wrap:wrap;}
        .gm-del-btn{padding:11px 12px;border-radius:11px;font-weight:800;font-size:.85rem;cursor:pointer;border:1px solid;flex:1;min-width:0;transition:.2s;font-family:inherit;}
        .gm-del-cancel{background:#f1f5f9;color:#475569;border-color:#e2e8f0;}
        .gm-del-cancel:hover{background:#e2e8f0;}
        .gm-del-soft{background:#fffbeb;color:#b45309;border-color:#fde68a;}
        .gm-del-soft:hover{background:#fef3c7;}
        .gm-del-hard{background:#fff1f2;color:#dc2626;border-color:#fecaca;}
        .gm-del-hard:hover{background:#fee2e2;}
        .gm-del-hard:disabled,.gm-del-hard-confirm:disabled{opacity:.45;cursor:not-allowed;}
    `;
    document.head.appendChild(styleEl);
    document.body.appendChild(overlay);

    const box = overlay.querySelector('.gm-del-box');
    const hardZone = overlay.querySelector('.gm-del-hardzone');
    const input = overlay.querySelector('.gm-del-input');
    const hardBtn = overlay.querySelector('.gm-del-hard-confirm');
    let busy = false;

    const destroy = () => { overlay.remove(); styleEl.remove(); };

    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) destroy(); });
    box.querySelector('.gm-del-x').onclick = destroy;
    box.querySelector('.gm-del-cancel').onclick = destroy;
    box.querySelector('.gm-del-soft').onclick = async () => {
        if (busy) return;
        busy = true;
        try { await onSoft(); } finally { destroy(); }
    };
    box.querySelector('.gm-del-hard').onclick = () => { hardZone.style.display = 'block'; input.focus(); };
    input.oninput = () => { hardBtn.disabled = input.value.trim().toUpperCase() !== 'HAPUS'; };
    hardBtn.onclick = async () => {
        if (busy) return;
        busy = true;
        try { await onHard(); } finally { destroy(); }
    };
}

// RBAC DELETION LOGIC: Soft Delete for Teacher, Hard/Soft Delete for Super Admin
async function deleteData(tableType, id) {
    const softPayload = {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUserProfile?.id || null
    };

    openDeleteDialog({
        title: userRole === 'super_admin' ? 'Hapus Data' : 'Sembunyikan Data',
        message: userRole === 'super_admin'
            ? '"Sembunyikan" menyembunyikan data dari aplikasi, sedangkan "Hapus Permanen" menghapus data dari database (tidak bisa dikembalikan).'
            : 'Sebagai Guru, Anda hanya dapat menyembunyikan data (Soft Delete). Data tidak akan tampil lagi di aplikasi.',
        softLabel: 'Sembunyikan',
        onSoft: async () => {
            try {
                await supabase.from(tableType).update(softPayload).eq('id', id);
                showToast('Data berhasil disembunyikan (Soft Delete).', 'success');
            } catch (err) {
                showToast('Gagal menyembunyikan data: ' + err.message, 'error');
            }
            loadData();
        },
        onHard: userRole === 'super_admin' ? async () => {
            const { error } = await supabase.from(tableType).delete().eq('id', id);
            if (error) showToast('Gagal menghapus permanen: ' + error.message, 'error');
            else showToast('Data berhasil dihapus permanen.', 'success');
            loadData();
        } : null
    });
}