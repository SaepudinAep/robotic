/**
 * Project: Private Master Data (Matrix) Module
 * Version: 3.0 - Level Filtering, Complete Indicators, Cloudinary Crop
 * Description: Manajemen Materi, Achievement, Level, dan Guru untuk Private Class.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';
import { openImageCropper } from '../assets/js/image-cropper.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let currentTab = "materi";
let editingId = null;
let editingType = null; // Menyimpan tipe spesifik seperti 'sub_levels' saat modal dibuka
let selectedLevelId = "all";
let levelsList = [];
let subLevelsList = [];

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Fetch Levels List
    await fetchLevels();

    // 2. Inject CSS
    injectStyles();

    // 4. Render Skeleton
    canvas.innerHTML = `
        <div class="mp-container fade-in">
            
            <div class="mp-header">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="https://res.cloudinary.com/dmm6avtxd/image/upload/v1787501406/Robopanda-Robotic_wwr2jb.png"
                         style="height: 48px; width: auto; filter: brightness(0) invert(0.2);">
                    <div>
                        <h2>Master Matrix Private</h2>
                        <p>Kelola materi privat, indikator kelengkapan, level, dan guru.</p>
                    </div>
                </div>
            </div>

            <!-- MAIN TABS -->
            <div class="mp-tabs">
                <button class="tab-btn active" data-tab="materi"><i class="fas fa-book"></i> MATERI PRIVAT</button>
                <button class="tab-btn" data-tab="achievement"><i class="fas fa-trophy"></i> BANK ACH</button>
                <button class="tab-btn" data-tab="levels"><i class="fas fa-layer-group"></i> LEVELS</button>
                <button class="tab-btn" data-tab="guru"><i class="fas fa-chalkboard-user"></i> GURU</button>
            </div>

            <!-- FILTER SECTION -->
            <div class="mp-filter-section">
                <div class="mp-search-wrapper">
                    <i class="fas fa-search"></i>
                    <input type="text" id="globalSearch" placeholder="Cari materi, achievement, level, atau guru...">
                </div>

                <!-- LEVEL FILTER CHIPS (Tampil pada tab Materi & Achievement) -->
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

            <!-- MAIN CONTENT AREA -->
            <div id="main-content-area" class="mp-content">
                <div id="loading-state" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-circle-notch fa-spin"></i> Memuat data...
                </div>
                <div id="list-container" class="content-grid"></div>
            </div>

        </div>

        <!-- FAB ADD BUTTON -->
        <button id="fab-add" class="fab-btn" title="Tambah Data Baru">
            <i class="fas fa-plus"></i>
        </button>

        <!-- MODAL DRAWER -->
        <div id="modal-overlay" class="modal-overlay">
            <div class="modal-drawer">
                <div class="modal-header">
                    <h2 id="modal-title">Input Data</h2>
                    <span id="modal-close" class="close-btn">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="dynamic-form">
                        <div id="form-fields"></div>
                        <div class="form-footer">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save" style="margin-right:8px;"></i> Simpan ke Matrix
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // 5. Setup Logic & Listeners
    setupEventListeners();
    await loadData();
}

// ==========================================
// 2. FETCH LEVELS LIST
// ==========================================
async function fetchLevels() {
    try {
        const { data: lvData, error: lvErr } = await supabase
            .from('levels')
            .select('id, kode, detail')
            .order('kode', { ascending: true });
        if (lvData) levelsList = lvData;
        if (lvErr) console.error("Error fetching levels:", lvErr);

        const { data: subData, error: subErr } = await supabase
            .from('sub_levels')
            .select('*')
            .order('name', { ascending: true });

        if (subErr) {
            console.error("Error fetching sub_levels:", subErr);
            alert("Error Supabase sub_levels: " + subErr.message + " (" + subErr.code + ")");
        }
        if (subData) {
            subLevelsList = subData;
            console.log("Sub-levels loaded count:", subData.length, subData);
        }
    } catch (e) {
        console.error("Gagal memuat levels/sub_levels:", e);
    }
}

// ==========================================
// 3. CSS INJECTION
// ==========================================
function injectStyles() {
    const styleId = 'materi-private-css-v3';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .mp-container { max-width: 1000px; margin: 0 auto; padding-bottom: 90px; font-family: 'Poppins', sans-serif; }
        
        .mp-header { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; }
        .mp-header h2 { margin: 0; color: #1e293b; font-size: 1.5rem; font-weight: 800; }
        .mp-header p { margin: 4px 0 0; color: #64748b; font-size: 0.9rem; }

        /* Tabs */
        .mp-tabs { display: flex; gap: 8px; margin-bottom: 15px; overflow-x: auto; padding: 6px; background: white; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); scrollbar-width: none; }
        .mp-tabs::-webkit-scrollbar { display: none; }
        .tab-btn { flex: 1; min-width: 110px; border: none; background: transparent; padding: 12px 14px; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 10px; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem; white-space: nowrap; }
        .tab-btn.active { background: #f59e0b; color: white; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
        .tab-btn:hover:not(.active) { background: #f8fafc; color: #1e293b; }

        /* Search & Filter Bar */
        .mp-filter-section { margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
        .mp-search-wrapper { position: relative; width: 100%; }
        .mp-search-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .mp-search-wrapper input { width: 100%; padding: 12px 15px 12px 42px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 0.95rem; outline: none; background: white; box-sizing: border-box; transition: 0.2s; }
        .mp-search-wrapper input:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }

        /* Level Filter Chips */
        .level-filter-bar { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .level-filter-bar::-webkit-scrollbar { display: none; }
        .level-chip { border: 1px solid #e2e8f0; background: white; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; white-space: nowrap; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
        .level-chip:hover { background: #f8fafc; border-color: #cbd5e1; }
        .level-chip.active { background: #1e293b; color: white; border-color: #1e293b; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }

        /* Content List */
        .content-grid { display: flex; flex-direction: column; gap: 14px; }

        /* MATERI CARD WITH RICH INDICATORS */
        .materi-card {
            background: white; border-radius: 16px; padding: 16px 20px;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.03); border: 1px solid #edf2f7;
            cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
            position: relative; overflow: hidden;
        }
        .materi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-color: #fde68a; }
        
        .materi-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
        
        /* Mini Thumbnail */
        .materi-thumb {
            width: 70px; height: 70px; border-radius: 12px; flex-shrink: 0;
            background: #f8fafc; display: flex; align-items: center; justify-content: center;
            overflow: hidden; border: 1px solid #e2e8f0; position: relative;
        }
        .materi-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .materi-thumb i { font-size: 1.6rem; color: #94a3b8; }
        
        .materi-info { flex: 1; min-width: 0; }
        
        /* Badges Top Row */
        .materi-badges-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
        .badge-level-tag { background: #fef3c7; color: #b45309; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .badge-status-pill { padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
        .status-complete { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .status-draft { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

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
        .card-actions { display: flex; align-items: center; gap: 8px; margin-left: 15px; }
        .btn-action-icon {
            background: #f8fafc; border: 1px solid #e2e8f0; width: 38px; height: 38px;
            border-radius: 10px; cursor: pointer; color: #64748b; display: flex;
            align-items: center; justify-content: center; font-size: 0.95rem; transition: 0.2s;
        }
        .btn-action-icon:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }

        /* GENERAL COMPACT CARD (Level, Guru) */
        .compact-item {
            background: white; padding: 16px 20px; border-radius: 16px;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.03); cursor: pointer; transition: 0.2s;
            border: 1px solid #edf2f7; border-left: 5px solid #ccc;
        }
        .compact-item:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
        .item-info { display: flex; align-items: center; gap: 15px; }
        .item-icon { font-size: 1.3rem; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 12px; color: #475569; border: 1px solid #e2e8f0; }
        .item-text b { display: block; font-size: 1rem; color: #1e293b; margin-bottom: 2px; }
        .item-text span { font-size: 0.85rem; color: #64748b; }
        .border-levels { border-left-color: #8b5cf6; }
        .border-guru { border-left-color: #0ea5e9; }

        /* PARENT LEVEL & SUB-LEVEL HIERARCHY CARDS */
        .level-parent-card {
            background: white; border-radius: 18px; margin-bottom: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.04); border: 1px solid #e2e8f0;
            overflow: hidden; border-left: 6px solid #8b5cf6;
        }
        .level-parent-header {
            padding: 18px 22px; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;
            align-items: center; flex-wrap: wrap; gap: 12px;
        }
        .level-title-group { display: flex; align-items: center; gap: 12px; }
        .level-badge-icon {
            width: 42px; height: 42px; border-radius: 12px; background: #f3e8ff; color: #7c3aed;
            display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold;
        }
        .level-name-text { font-size: 1.15rem; font-weight: 800; color: #1e293b; margin: 0; }
        .level-desc-text { color: #64748b; font-size: 0.85rem; margin: 2px 0 0 0; }
        
        .level-actions { display: flex; align-items: center; gap: 8px; }
        .btn-add-sub {
            background: #10b981; color: white; border: none; padding: 8px 16px;
            border-radius: 10px; font-weight: 700; font-size: 0.8rem; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px; transition: 0.2s;
            box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
        }
        .btn-add-sub:hover { background: #059669; transform: translateY(-1px); }

        .sub-levels-wrapper { padding: 18px 22px; background: #fafafa; border-top: 1px solid #f1f5f9; }
        .sub-header-label { font-size: 0.78rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        
        .sub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
        .sub-card {
            background: white; padding: 14px 16px; border-radius: 14px;
            border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.02);
            transition: 0.2s; display: flex; flex-direction: column; justify-content: space-between;
        }
        .sub-card:hover { border-color: #7c3aed; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1); transform: translateY(-2px); }
        .sub-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .sub-title { font-weight: 700; color: #0f172a; font-size: 0.95rem; margin: 0; }
        .kit-badge { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .sub-desc { font-size: 0.8rem; color: #64748b; margin: 0 0 10px 0; line-height: 1.4; }
        
        .sub-card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: auto; }
        .sub-code-badge { font-size: 0.7rem; font-weight: 700; color: #94a3b8; font-family: monospace; background: #f8fafc; padding: 2px 6px; border-radius: 4px; }
        .sub-action-btns { display: flex; gap: 4px; }
        .btn-icon-sub { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 0.85rem; padding: 4px 6px; border-radius: 6px; transition: 0.2s; }
        .btn-icon-sub.edit:hover { color: #f59e0b; background: #fffbeb; }
        .btn-icon-sub.del:hover { color: #ef4444; background: #fef2f2; }
        .sub-empty { padding: 15px; text-align: center; color: #94a3b8; font-size: 0.85rem; font-style: italic; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; }

        /* ACHIEVEMENT FOLDER STYLE */
        .achievement-folder {
            background: white; border-radius: 16px; margin-bottom: 12px;
            overflow: hidden; box-shadow: 0 3px 10px rgba(0,0,0,0.03);
            border: 1px solid #edf2f7; border-left: 5px solid #f59e0b;
        }
        .folder-header {
            background: #fffbeb; padding: 14px 20px; border-bottom: 1px solid #fef3c7;
            display: flex; align-items: center; justify-content: space-between;
            font-weight: 700; color: #b45309; font-size: 0.95rem;
        }
        .folder-content { padding: 12px 20px; }
        .target-item {
            display: flex; justify-content: space-between; align-items: flex-start;
            padding: 12px 0; border-bottom: 1px solid #f1f5f9; cursor: pointer;
        }
        .target-item:last-child { border-bottom: none; }
        .target-item:hover .ach-title { color: #f59e0b; }
        .ach-title { font-weight: 700; color: #1e293b; font-size: 1rem; margin-bottom: 6px; display: block; transition: 0.2s; }
        .ach-list { margin: 0; padding-left: 20px; color: #64748b; font-size: 0.88rem; line-height: 1.6; }

        /* FAB Button */
        .fab-btn {
            position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px;
            border-radius: 50%; background: #f59e0b; color: white; border: none;
            font-size: 24px; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
            cursor: pointer; z-index: 100; transition: transform 0.2s, background 0.2s;
            display: flex; align-items: center; justify-content: center;
        }
        .fab-btn:hover { transform: scale(1.08); background: #d97706; }

        /* Modal Drawer */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); z-index: 1000; display: none; align-items: flex-end; backdrop-filter: blur(3px); }
        .modal-overlay.active { display: flex; animation: fadeIn 0.2s ease-out; }
        .modal-drawer { background: white; width: 100%; max-width: 600px; margin: 0 auto; border-radius: 24px 24px 0 0; padding: 25px; max-height: 88vh; overflow-y: auto; position: relative; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .modal-header h2 { margin: 0; font-size: 1.3rem; font-weight: 800; color: #1e293b; }
        .close-btn { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #94a3b8; }
        
        #form-fields label { display: block; font-weight: 700; margin-bottom: 6px; color: #334155; font-size: 0.85rem; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        #form-fields input, #form-fields textarea, #form-fields select { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; font-family: inherit; box-sizing: border-box; outline: none; transition: 0.2s; }
        #form-fields input:focus, #form-fields textarea:focus, #form-fields select:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
        
        .btn-primary { width: 100%; padding: 14px; background: #f59e0b; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; margin-top: 20px; transition: 0.2s; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); font-family: inherit; }
        .btn-primary:hover { background: #d97706; }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        @media (max-width: 600px) {
            .materi-card { flex-direction: column; align-items: flex-start; gap: 12px; }
            .materi-left { width: 100%; }
            .card-actions { width: 100%; justify-content: flex-end; margin-left: 0; }
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
    const container = document.getElementById("list-container");
    const loading = document.getElementById("loading-state");
    const levelFilterBar = document.getElementById("level-filter-bar");

    // Tampilkan filter level hanya pada tab materi & achievement
    if (levelFilterBar) {
        levelFilterBar.style.display = (currentTab === "materi" || currentTab === "achievement") ? "flex" : "none";
    }

    loading.style.display = 'block';
    container.innerHTML = '';

    try {
        if (currentTab === "materi") {
            let query = supabase
                .from('materi_private')
                .select('*, levels(id, kode, detail)')
                .order('created_at', { ascending: false });

            // Filter Level jika dipilih
            if (selectedLevelId !== "all") {
                query = query.eq('level_id', selectedLevelId);
            }

            const { data, error } = await query;
            loading.style.display = 'none';
            if (error) throw error;

            const filtered = data ? data.filter(m => {
                const titleMatch = m.judul?.toLowerCase().includes(search);
                const descMatch = m.deskripsi?.toLowerCase().includes(search);
                const levelMatch = m.levels?.kode?.toLowerCase().includes(search) || m.level?.toLowerCase().includes(search);
                return titleMatch || descMatch || levelMatch;
            }) : [];
            
            if (!filtered.length) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#94a3b8; background:white; border-radius:14px; border:2px dashed #e2e8f0;">
                        <i class="fas fa-book-open" style="font-size:2rem; margin-bottom:10px; color:#cbd5e1;"></i>
                        <p style="margin:0; font-weight:600;">Tidak ada materi privat ditemukan.</p>
                    </div>`;
                return;
            }

            container.innerHTML = filtered.map(m => {
                const hasTitle = Boolean(m.judul && m.judul.trim());
                const hasImg = Boolean(m.image_url && m.image_url.trim());
                const hasDesc = Boolean((m.deskripsi && m.deskripsi.trim()) || (m.detail && m.detail.trim()));
                const isComplete = hasTitle && hasImg && hasDesc;
                const levelName = m.levels?.kode || m.level || 'Umum';

                return `
                    <div class="materi-card btn-edit-trigger" data-id="${m.id}" data-type="materi">
                        <div class="materi-left">
                            <div class="materi-thumb">
                                ${hasImg 
                                    ? `<img src="${m.image_url}" alt="${m.judul}" loading="lazy">` 
                                    : `<i class="fas fa-camera"></i>`
                                }
                            </div>
                            <div class="materi-info">
                                <div class="materi-badges-top">
                                    <span class="badge-level-tag">
                                        <i class="fas fa-layer-group"></i> ${levelName}
                                    </span>
                                    <span class="badge-status-pill ${isComplete ? 'status-complete' : 'status-draft'}">
                                        <i class="fas ${isComplete ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
                                        ${isComplete ? 'Lengkap' : 'Belum Lengkap'}
                                    </span>
                                </div>
                                <h3 class="materi-title">${m.judul}</h3>
                                
                                <div class="materi-indicators">
                                    <span class="ind-pill ${hasTitle ? 'ind-ok' : 'ind-no'}" title="Status Judul">
                                        <i class="fas ${hasTitle ? 'fa-check' : 'fa-xmark'}"></i> Judul
                                    </span>
                                    <span class="ind-pill ${hasImg ? 'ind-ok' : 'ind-no'}" title="Status Foto">
                                        <i class="fas ${hasImg ? 'fa-check' : 'fa-xmark'}"></i> Foto
                                    </span>
                                    <span class="ind-pill ${hasDesc ? 'ind-ok' : 'ind-no'}" title="Status Uraian">
                                        <i class="fas ${hasDesc ? 'fa-check' : 'fa-xmark'}"></i> Uraian
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="card-actions">
                            <button class="btn-action-icon btn-delete" data-id="${m.id}" data-type="materi_private" title="Hapus Materi">
                                <i class="fas fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join("");
        
        } else if (currentTab === "achievement") {
            let query = supabase
                .from('achievement_private')
                .select('*, levels(id, kode, detail)')
                .order('created_at', { ascending: false });

            // Filter Level jika dipilih
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
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#94a3b8; background:white; border-radius:14px; border:2px dashed #e2e8f0;">
                        <i class="fas fa-trophy" style="font-size:2rem; margin-bottom:10px; color:#cbd5e1;"></i>
                        <p style="margin:0; font-weight:600;">Tidak ada data achievement privat.</p>
                    </div>`;
                return;
            }

            // Grouping by Level (Folder View)
            const grouped = filtered.reduce((acc, obj) => {
                const key = obj.levels?.kode || 'Uncategorized';
                if (!acc[key]) acc[key] = [];
                acc[key].push(obj);
                return acc;
            }, {});

            container.innerHTML = Object.keys(grouped).map(level => `
                <div class="achievement-folder">
                    <div class="folder-header">
                        <span style="display:flex; align-items:center; gap:8px;">
                            <i class="fas fa-folder-open"></i> LEVEL ${level}
                        </span>
                        <span style="font-size:0.8rem; background:rgba(0,0,0,0.05); padding:2px 8px; border-radius:10px;">
                            ${grouped[level].length} Topik
                        </span>
                    </div>
                    <div class="folder-content">
                        ${grouped[level].map(a => {
                            const subList = (a.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
                            return `
                            <div class="target-item btn-edit-trigger" data-id="${a.id}" data-type="achievement">
                                <div style="flex:1;">
                                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                        <span class="ach-title" style="margin-bottom:0;">${a.main_achievement}</span>
                                        <span class="badge-status-pill status-complete" style="font-size:0.7rem; padding:2px 8px;">
                                            ${subList.length} Indikator
                                        </span>
                                    </div>
                                    <ul class="ach-list">
                                        ${subList.length > 0 ? subList.map(s => `<li>${s}</li>`).join("") : "<li style='color:#94a3b8;'>Belum ada sub-indikator</li>"}
                                    </ul>
                                </div>
                                <button class="btn-action-icon btn-delete" data-id="${a.id}" data-type="achievement_private" title="Hapus Target">
                                    <i class="fas fa-trash-can"></i>
                                </button>
                            </div>`;
                        }).join("")}
                    </div>
                </div>
            `).join("");

        } else if (currentTab === "levels") {
            await fetchLevels();
            loading.style.display = 'none';

            const filteredLevels = levelsList.filter(l => {
                const levelMatch = l.kode.toLowerCase().includes(search) || (l.detail && l.detail.toLowerCase().includes(search));
                const subMatch = subLevelsList.some(s => 
                    String(s.level_id ?? '').trim().toLowerCase() === String(l.id ?? '').trim().toLowerCase() && (
                        (s.name && s.name.toLowerCase().includes(search)) ||
                        (s.kode && s.kode.toLowerCase().includes(search)) ||
                        (s.kit_alat && s.kit_alat.toLowerCase().includes(search)) ||
                        (s.description && s.description.toLowerCase().includes(search))
                    )
                );
                return !search || levelMatch || subMatch;
            });

            // Sub-Level yang tidak terikat pada Parent Level manapun
            const assignedLevelIds = levelsList.map(l => String(l.id ?? '').trim().toLowerCase());
            const orphanSubs = subLevelsList.filter(s => !assignedLevelIds.includes(String(s.level_id ?? '').trim().toLowerCase()));

            if (!filteredLevels.length && !orphanSubs.length) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#94a3b8; background:white; border-radius:14px; border:2px dashed #e2e8f0;">
                        <i class="fas fa-layer-group" style="font-size:2rem; margin-bottom:10px; color:#cbd5e1;"></i>
                        <p style="margin:0; font-weight:600;">Tidak ada data level kurikulum atau sub-level ditemukan.</p>
                    </div>`;
                return;
            }

            let html = `
                <div style="background:#e0f2fe; color:#0369a1; padding:12px 16px; border-radius:10px; border:1px solid #bae6fd; margin-bottom:16px; font-size:0.85rem; font-weight:600; display:flex; align-items:center; justify-content:space-between;">
                    <span><i class="fas fa-bug"></i> Status Sub-Levels DB: Total ${subLevelsList.length} data ditemukan</span>
                    <button type="button" id="btn-show-sub-debug" style="background:#0284c7; color:white; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:0.75rem;">Cek RAW JSON</button>
                </div>
            `;

            html += filteredLevels.map(l => {
                const subs = subLevelsList.filter(s => String(s.level_id ?? '').trim().toLowerCase() === String(l.id ?? '').trim().toLowerCase());
                return `
                    <div class="level-parent-card">
                        <div class="level-parent-header">
                            <div class="level-title-group">
                                <div class="level-badge-icon"><i class="fas fa-layer-group"></i></div>
                                <div>
                                    <h3 class="level-name-text">Level: ${escapeHtml(l.kode)}</h3>
                                    <p class="level-desc-text">${escapeHtml(l.detail || 'Tidak ada deskripsi level')}</p>
                                </div>
                            </div>
                            <div class="level-actions">
                                <button class="btn-add-sub btn-add-sub-trigger" data-levelid="${l.id}">
                                    <i class="fas fa-plus"></i> Sub-Level
                                </button>
                                <button class="btn-action-icon btn-edit-trigger" data-id="${l.id}" data-type="levels" title="Edit Level Utama">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="btn-action-icon btn-delete" data-id="${l.id}" data-type="levels" title="Hapus Level Utama">
                                    <i class="fas fa-trash-can"></i>
                                </button>
                            </div>
                        </div>

                        <div class="sub-levels-wrapper">
                            <div class="sub-header-label">
                                <i class="fas fa-sitemap"></i> Sub-Level & Kit Terkait (${subs.length})
                            </div>
                            ${subs.length === 0 ? `
                                <div class="sub-empty">
                                    Belum ada Sub-Level untuk level ${escapeHtml(l.kode)}. Klik tombol <strong>+ Sub-Level</strong> di atas untuk menambah kit/alat baru.
                                </div>
                            ` : `
                                <div class="sub-grid">
                                    ${subs.map(s => `
                                        <div class="sub-card">
                                            <div>
                                                <div class="sub-title-row">
                                                    <h4 class="sub-title">${escapeHtml(s.name)}</h4>
                                                    ${s.kit_alat ? `<span class="kit-badge"><i class="fas fa-box-open"></i> ${escapeHtml(s.kit_alat)}</span>` : ''}
                                                </div>
                                                <p class="sub-desc">${escapeHtml(s.description || 'Tidak ada deskripsi kit')}</p>
                                            </div>
                                            <div class="sub-card-footer">
                                                <span class="sub-code-badge">${escapeHtml(s.kode)}</span>
                                                <div class="sub-action-btns">
                                                    <button class="btn-icon-sub edit btn-edit-trigger" data-id="${s.id}" data-type="sub_levels" title="Edit Sub-Level">
                                                        <i class="fas fa-pen"></i>
                                                    </button>
                                                    <button class="btn-icon-sub del btn-delete" data-id="${s.id}" data-type="sub_levels" title="Hapus Sub-Level">
                                                        <i class="fas fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                `;
            }).join("");

            // Jika ada Sub-Level tanpa Parent Level yang valid
            if (orphanSubs.length > 0) {
                html += `
                    <div class="level-parent-card" style="border-left-color: #f59e0b;">
                        <div class="level-parent-header" style="background:#fffbeb;">
                            <div class="level-title-group">
                                <div class="level-badge-icon" style="background:#fef3c7; color:#b45309;"><i class="fas fa-exclamation-triangle"></i></div>
                                <div>
                                    <h3 class="level-name-text" style="color:#b45309;">Sub-Level Tanpa Parent Level (${orphanSubs.length})</h3>
                                    <p class="level-desc-text">Sub-level berikut perlu diset parent level-nya melalui tombol edit.</p>
                                </div>
                            </div>
                        </div>
                        <div class="sub-levels-wrapper">
                            <div class="sub-grid">
                                ${orphanSubs.map(s => `
                                    <div class="sub-card">
                                        <div>
                                            <div class="sub-title-row">
                                                <h4 class="sub-title">${escapeHtml(s.name)}</h4>
                                                ${s.kit_alat ? `<span class="kit-badge"><i class="fas fa-box-open"></i> ${escapeHtml(s.kit_alat)}</span>` : ''}
                                            </div>
                                            <p class="sub-desc">${escapeHtml(s.description || 'Tidak ada deskripsi kit')}</p>
                                        </div>
                                        <div class="sub-card-footer">
                                            <span class="sub-code-badge">${escapeHtml(s.kode)}</span>
                                            <div class="sub-action-btns">
                                                <button class="btn-icon-sub edit btn-edit-trigger" data-id="${s.id}" data-type="sub_levels" title="Edit Sub-Level">
                                                    <i class="fas fa-pen"></i>
                                                </button>
                                                <button class="btn-icon-sub del btn-delete" data-id="${s.id}" data-type="sub_levels" title="Hapus Sub-Level">
                                                    <i class="fas fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;
            setTimeout(() => {
                const debugBtn = document.getElementById("btn-show-sub-debug");
                if (debugBtn) debugBtn.onclick = () => alert("RAW subLevelsList (" + subLevelsList.length + " data):\n" + JSON.stringify(subLevelsList, null, 2));
            }, 50);

        } else if (currentTab === "guru") {
            const { data } = await supabase.from('teachers').select('*').order('name');
            loading.style.display = 'none';
            const filtered = data ? data.filter(g => g.name.toLowerCase().includes(search) || g.role?.toLowerCase().includes(search)) : [];

            if (!filtered.length) {
                container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Tidak ada data guru.</div>`;
                return;
            }

            container.innerHTML = filtered.map(g => `
                <div class="compact-item border-guru btn-edit-trigger" data-id="${g.id}" data-type="guru">
                    <div class="item-info">
                        <div class="item-icon" style="color:#0ea5e9;"><i class="fas fa-user-tie"></i></div>
                        <div class="item-text">
                            <b>${g.name}</b>
                            <span style="text-transform:uppercase; font-weight:600; color:#0284c7;">${g.role || 'GURU'}</span>
                        </div>
                    </div>
                    <button class="btn-action-icon btn-delete" data-id="${g.id}" data-type="teachers" title="Hapus Guru">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>`).join("");
        }

    } catch (err) {
        console.error("Load Error:", err);
        loading.innerHTML = `<span style="color:red; font-weight:600;">Gagal memuat: ${err.message}</span>`;
    }
}

// ==========================================
// 5. FORM HANDLING
// ==========================================

async function injectFormFields(mode = "add", data = {}, overrideType = null) {
    const formFields = document.getElementById("form-fields");
    const targetType = overrideType || (currentTab === "levels" ? "levels" : currentTab);
    editingType = targetType;

    if (targetType === "sub_levels") {
        document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} Sub-Level / Kit`;
        const levelOptions = levelsList.map(l => `
            <option value="${l.id}" ${(data.level_id || selectedLevelId) === l.id ? "selected" : ""}>
                ${escapeHtml(l.kode)} ${l.detail ? `(${escapeHtml(l.detail)})` : ''}
            </option>
        `).join("");

        formFields.innerHTML = `
            <label>Pilih Parent Level *</label>
            <select id="level_id" required>
                <option value="">-- Pilih Level Utama --</option>
                ${levelOptions}
            </select>

            <label>Kode Sub-Level *</label>
            <input type="text" id="kode" value="${escapeHtml(data.kode || "")}" placeholder="Contoh: WEDO_PRO, SCRATCH_2D, TECHNIC" required>

            <label>Nama Sub-Level / Modul *</label>
            <input type="text" id="name" value="${escapeHtml(data.name || "")}" placeholder="Contoh: WeDo Pro Kit, Coding Scratch" required>

            <label>Nama Kit / Alat yang Digunakan</label>
            <input type="text" id="kit_alat" value="${escapeHtml(data.kit_alat || "")}" placeholder="Contoh: LEGO WeDo 2.0 + Expansion Set">

            <label>Deskripsi & Keterangan Fokus Kit</label>
            <textarea id="description" rows="3" placeholder="Deskripsi spesifik mengenai kit/alat atau software yang digunakan...">${escapeHtml(data.description || "")}</textarea>
        `;
    }
    else if (targetType === "levels") {
        document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} Level Utama`;
        formFields.innerHTML = `
            <label>Kode Level *</label>
            <input type="text" id="kode" value="${escapeHtml(data.kode || "")}" placeholder="Contoh: ROBOTIC, CODING, KIDDY" required>
            <label>Deskripsi & Keterangan Level</label>
            <textarea id="detail" rows="3" placeholder="Uraian rentang usia, kompetensi, atau target level...">${escapeHtml(data.detail || "")}</textarea>
        `;
    } 
    else if (targetType === "materi" || targetType === "achievement") {
        const tabNames = { materi: "Materi Privat", achievement: "Achievement Privat" };
        document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} ${tabNames[targetType] || "Data"}`;

        const levelOptions = levelsList.map(l => `
            <option value="${l.id}" ${data.level_id === l.id ? "selected" : ""}>
                ${escapeHtml(l.kode)} ${l.detail ? `(${escapeHtml(l.detail)})` : ''}
            </option>
        `).join("");

        const renderSubOptions = (lvlId, currentSubId) => {
            const subs = subLevelsList.filter(s => s.level_id === lvlId);
            if (!subs.length) return '<option value="">-- Tidak ada Sub-Level untuk Level ini --</option>';
            return '<option value="">-- Pilih Sub-Level / Kit (Opsional) --</option>' + 
                subs.map(s => `
                    <option value="${s.id}" ${currentSubId === s.id ? "selected" : ""}>
                        ${escapeHtml(s.name)} ${s.kit_alat ? `[${escapeHtml(s.kit_alat)}]` : ''}
                    </option>
                `).join('');
        };

        if (targetType === "materi") {
            const currentImg = data.image_url || "https://via.placeholder.com/200?text=Pilih+Foto+Project";
            const hasImg = Boolean(data.image_url);

            formFields.innerHTML = `
                <label>Pilih Level Utama *</label>
                <select id="level_id" required>
                    <option value="">-- Pilih Level Utama --</option>
                    ${levelOptions}
                </select>

                <label>Pilih Sub-Level / Kit (Opsional)</label>
                <select id="sub_level_id">
                    ${renderSubOptions(data.level_id, data.sub_level_id)}
                </select>

                <label>Judul Materi Privat *</label>
                <input type="text" id="judul" value="${escapeHtml(data.judul || "")}" placeholder="Contoh: Robot Smart Car Sensor" required>
                
                <label>Foto Cover Project (Support Crop 3:4)</label>
                <div style="margin-bottom: 20px;">
                    <button type="button" id="btn-upload-p" style="background:#f59e0b; color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; font-family:inherit;">
                        <i class="fas fa-camera"></i> ${hasImg ? "Ganti Foto Project" : "Ambil & Potong Foto"}
                    </button>
                    <input type="hidden" id="image_url" value="${escapeHtml(data.image_url || "")}">
                    <div style="text-align:center;">
                        <img id="img-preview-p" src="${escapeHtml(currentImg)}" style="width:100%; max-height:220px; object-fit:cover; border-radius:12px; border:2px solid #e2e8f0; background:#f8fafc;">
                    </div>
                </div>

                <label>Deskripsi Singkat</label>
                <textarea id="deskripsi" rows="2" placeholder="Ringkasan konsep project...">${escapeHtml(data.deskripsi || "")}</textarea>
                
                <label>Detail Lengkap & Langkah Kerja</label>
                <textarea id="detail" style="height:120px;" placeholder="Langkah perakitan, coding, dan evaluasi...">${escapeHtml(data.detail || "")}</textarea>
            `;
            
            // Cascading listener level_id -> sub_level_id
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
                    btn.onclick = () => openImageCropper('robotic_private', url => {
                        document.getElementById("image_url").value = url;
                        document.getElementById("img-preview-p").src = url;
                    });
                }
            }, 50);

        } else {
            // ACHIEVEMENT FORM
            formFields.innerHTML = `
                <label>Pilih Level Utama *</label>
                <select id="level_id" required>
                    <option value="">-- Pilih Level Utama --</option>
                    ${levelOptions}
                </select>

                <label>Pilih Sub-Level / Kit (Opsional)</label>
                <select id="sub_level_id">
                    ${renderSubOptions(data.level_id, data.sub_level_id)}
                </select>

                <label>Kategori / Topik Utama *</label>
                <input type="text" id="main_achievement" value="${escapeHtml(data.main_achievement || "")}" placeholder="Contoh: Pemahaman Mekanisme Gear" required>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; margin-bottom:10px;">
                    <label style="margin:0;">Detail Target (Sub Items)</label>
                    <button type="button" id="btn-add-sub" style="background:#10b981; color:white; border:none; padding:6px 14px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700;">
                        <i class="fas fa-plus"></i> Tambah Baris
                    </button>
                </div>
                <div id="sub-ach-container"></div>
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
    else if (targetType === "guru") {
        document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} Guru / Mentor`;
        formFields.innerHTML = `
            <label>Nama Guru / Mentor *</label>
            <input type="text" id="name" value="${escapeHtml(data.name || "")}" placeholder="Nama Lengkap Mentor" required>
            
            <label>Role Guru *</label>
            <select id="role" required>
                <option value="guru" ${data.role === "guru" ? "selected" : ""}>Guru Utama</option>
                <option value="asisten" ${data.role === "asisten" ? "selected" : ""}>Asisten Guru</option>
            </select>
        `;
    }
}

function addSubRow(value = "") {
    const container = document.getElementById("sub-ach-container");
    const row = document.createElement("div");
    row.style = "display:flex; gap:8px; margin-bottom:8px;";
    row.innerHTML = `
        <input type="text" class="sub-input" value="${value}" placeholder="Tuliskan indikator capaian..." style="flex:1;">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca; border-radius:10px; width:40px; cursor:pointer; font-weight:bold; font-size:1.1rem;">&times;</button>
    `;
    container.appendChild(row);
}

// ==========================================
// 6. EVENT HANDLERS
// ==========================================

function setupEventListeners() {
    // Tab Switching
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(btn => {
        btn.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            loadData();
        };
    });

    // Level Filter Chips Event
    const chipContainer = document.getElementById("level-filter-bar");
    chipContainer.onclick = (e) => {
        const chip = e.target.closest('.level-chip');
        if (!chip) return;
        chipContainer.querySelectorAll('.level-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedLevelId = chip.dataset.level;
        loadData();
    };

    // Search
    document.getElementById("globalSearch").oninput = loadData;

    // FAB Add
    document.getElementById("fab-add").onclick = async () => {
        editingId = null;
        await injectFormFields("add");
        document.getElementById("modal-overlay").classList.add("active");
    };

    // Modal Close
    document.getElementById("modal-close").onclick = () => {
        document.getElementById("modal-overlay").classList.remove("active");
    };

    // Form Submit
    document.getElementById("dynamic-form").onsubmit = handleFormSubmit;

    // Content Actions (Edit/Delete via Delegation)
    // Content Actions (Edit/Delete/Add Sub-Level via Delegation)
    document.getElementById("list-container").addEventListener('click', async (e) => {
        const btnAddSub = e.target.closest('.btn-add-sub-trigger');
        if (btnAddSub) {
            e.stopPropagation();
            editingId = null;
            const lvlId = btnAddSub.dataset.levelid;
            await injectFormFields("add", { level_id: lvlId }, "sub_levels");
            document.getElementById("modal-overlay").classList.add("active");
            return;
        }

        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            e.stopPropagation();
            deleteData(btnDelete.dataset.type, btnDelete.dataset.id);
            return;
        }

        const trigger = e.target.closest('.btn-edit-trigger');
        if (trigger) {
            openEdit(trigger.dataset.type, trigger.dataset.id);
        }
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const tableMap = { levels: 'levels', sub_levels: 'sub_levels', materi: 'materi_private', achievement: 'achievement_private', guru: 'teachers' };
    const targetTable = tableMap[editingType || currentTab] || 'materi_private';
    const payload = {};

    e.target.querySelectorAll("input:not(.sub-input), select, textarea").forEach(el => {
        if (el.id) payload[el.id] = el.value;
    });

    // Sinkronkan teks level dari level_id yang dipilih (hanya untuk materi & achievement yang memiliki kolom 'level')
    if (targetTable !== 'sub_levels' && targetTable !== 'levels' && payload.level_id) {
        const matchedLevel = levelsList.find(l => l.id === payload.level_id);
        if (matchedLevel) {
            payload.level = matchedLevel.kode;
        }
    } else {
        delete payload.level;
    }

    // Achievement Sub-Inputs
    if (currentTab === "achievement") {
        const subInputs = Array.from(document.querySelectorAll(".sub-input"));
        payload.sub_achievement = subInputs.map(i => i.value.trim()).filter(v => v !== "").join('\n');
    }

    try {
        const { error } = editingId 
            ? await supabase.from(targetTable).update(payload).eq('id', editingId)
            : await supabase.from(targetTable).insert([payload]);

        if (error) throw error;
        document.getElementById("modal-overlay").classList.remove("active");
        await fetchLevels();
        loadData();
    } catch (err) {
        alert("Gagal: " + err.message);
    }
}

async function openEdit(type, id) {
    const tableMap = { levels: 'levels', sub_levels: 'sub_levels', materi: 'materi_private', achievement: 'achievement_private', guru: 'teachers' };
    let tableName = tableMap[type] || 'materi_private';
    
    const { data } = await supabase.from(tableName).select('*').eq('id', id).single();
    if (data) {
        editingId = id;
        await injectFormFields("edit", data, type);
        document.getElementById("modal-overlay").classList.add("active");
    }
}

async function deleteData(tableType, id) {
    if (!confirm("Hapus data ini?")) return;
    const { error } = await supabase.from(tableType).delete().eq('id', id);
    if (!error) {
        await fetchLevels();
        loadData();
    } else {
        alert("Gagal hapus: " + error.message);
    }
}

// Sanitasi teks dari DB sebelum disuntik ke HTML (cegah XSS)
function escapeHtml(text) {
    const NAMES = { 38: 'amp', 60: 'lt', 62: 'gt', 34: 'quot', 39: '#39' };
    return String(text ?? "").replace(/[&<>"']/g, ch => '&' + NAMES[ch.charCodeAt(0)] + ';');
}