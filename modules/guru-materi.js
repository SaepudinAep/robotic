/**
 * Project: Guru & Materi Module (School)
 * Version: 3.0 - Level Filtering, Complete Indicators, Cloudinary Crop
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

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Fetch Levels List for Filters & Forms
    await fetchLevels();

    // 2. Inject CSS
    injectStyles();

    // 4. Render HTML Structure
    canvas.innerHTML = `
        <div class="gm-container fade-in">
            <div class="gm-header">
                <div>
                    <h2>Kurikulum & Achievement Sekolah</h2>
                    <p>Kelola materi pembelajaran, indikator kelengkapan, dan target achievement.</p>
                </div>
            </div>

            <!-- MAIN TABS -->
            <div class="gm-tabs">
                <button id="btnMateri" class="tab-btn active" data-tab="materi">
                    <i class="fas fa-book"></i> MATERI SEKOLAH
                </button>
                <button id="btnAchievement" class="tab-btn" data-tab="achievement">
                    <i class="fas fa-trophy"></i> ACHIEVEMENT SEKOLAH
                </button>
            </div>

            <!-- SEARCH & LEVEL FILTER BAR -->
            <div class="gm-filter-section">
                <div class="gm-search-wrapper">
                    <i class="fas fa-search"></i>
                    <input type="text" id="globalSearch" placeholder="Cari judul materi, deskripsi, atau achievement...">
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
                                <i class="fas fa-save" style="margin-right:8px;"></i> Simpan Data
                            </button>
                        </div>
                    </form>
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

// ==========================================
// 3. STYLING (CSS INJECTION)
// ==========================================
function injectStyles() {
    const styleId = 'guru-materi-css-v3';
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

        /* MATERI CARD WITH RICH INDICATORS */
        .materi-card {
            background: white; border-radius: 16px; padding: 16px 20px;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.03); border: 1px solid #edf2f7;
            cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
            position: relative; overflow: hidden;
        }
        .materi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-color: #bfdbfe; }
        
        .materi-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
        
        /* Mini Thumbnail / Placeholder */
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

        /* Modal Drawer */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); z-index: 1000; display: none; align-items: flex-end; backdrop-filter: blur(3px); }
        .modal-overlay.active { display: flex; animation: fadeIn 0.2s ease-out; }
        .modal-drawer { background: white; width: 100%; max-width: 600px; margin: 0 auto; border-radius: 24px 24px 0 0; padding: 25px; max-height: 88vh; overflow-y: auto; position: relative; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .modal-header h2 { margin: 0; font-size: 1.3rem; font-weight: 800; color: #1e293b; }
        .close-btn { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #94a3b8; }
        
        #form-fields label { display: block; font-weight: 700; margin-bottom: 6px; color: #334155; font-size: 0.85rem; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        #form-fields input, #form-fields textarea, #form-fields select { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; font-family: inherit; box-sizing: border-box; outline: none; transition: 0.2s; }
        #form-fields input:focus, #form-fields textarea:focus, #form-fields select:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.15); }
        
        .btn-primary { width: 100%; padding: 14px; background: #4d97ff; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; margin-top: 20px; transition: 0.2s; box-shadow: 0 4px 12px rgba(77, 151, 255, 0.3); }
        .btn-primary:hover { background: #2563eb; }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        @media (max-width: 600px) {
            .materi-card { flex-direction: column; align-items: flex-start; gap: 12px; }
            .materi-left { width: 100%; }
            .materi-actions { width: 100%; justify-content: flex-end; margin-left: 0; }
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

            // Filter Level jika dipilih
            if (selectedLevelId !== "all") {
                query = query.eq('level_id', selectedLevelId);
            }

            const { data, error } = await query;
            loading.style.display = 'none';
            if (error) throw error;

            const filtered = data ? data.filter(m => {
                const titleMatch = m.title?.toLowerCase().includes(search);
                const descMatch = m.description?.toLowerCase().includes(search);
                const levelMatch = m.levels?.kode?.toLowerCase().includes(search) || m.level?.toLowerCase().includes(search);
                return titleMatch || descMatch || levelMatch;
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
                const hasTitle = Boolean(m.title && m.title.trim());
                const hasImg = Boolean(m.image_url && m.image_url.trim());
                const hasDesc = Boolean((m.description && m.description.trim()) || (m.detail && m.detail.trim()));
                const isComplete = hasTitle && hasImg && hasDesc;
                const levelName = m.levels?.kode || m.level || 'Umum';
                // Tag sub-level (bila materi terpaut ke sub_levels)
                const subLevelName = m.sub_level_id ? (m.sub_levels?.name || m.sub_levels?.kode || '') : '';

                return `
                    <div class="materi-card item-card" data-id="${m.id}" data-type="materi">
                        <div class="materi-left">
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
                                    <span class="ind-pill ${hasDesc ? 'ind-ok' : 'ind-no'}" title="Status Uraian">
                                        <i class="fas ${hasDesc ? 'fa-check' : 'fa-xmark'}"></i> Uraian
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="materi-actions">
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
// 5. FORM HANDLING (LEVEL SELECTOR & CROP)
// ==========================================

async function injectFormFields(mode = "add", data = {}) {
    const formFields = document.getElementById("form-fields");
    document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} ${currentTab === "materi" ? "Materi Sekolah" : "Achievement Sekolah"}`;

    const levelOptions = levelsList.map(l => `
        <option value="${l.id}" ${data.level_id === l.id ? 'selected' : ''}>
            ${l.kode} ${l.detail ? `(${l.detail})` : ''}
        </option>
    `).join('');

    const renderSubOptions = (lvlId, currentSubId) => {
        const subs = subLevelsList.filter(s => s.level_id === lvlId);
        if (!subs.length) return '<option value="">-- Tidak ada Sub-Level untuk Level ini --</option>';
        return '<option value="">-- Pilih Sub-Level / Kit (Opsional) --</option>' + 
            subs.map(s => `
                <option value="${s.id}" ${currentSubId === s.id ? "selected" : ""}>
                    ${s.name} ${s.kit_alat ? `[${s.kit_alat}]` : ''}
                </option>
            `).join('');
    };

    if (currentTab === "materi") {
        const currentImg = data.image_url || "https://via.placeholder.com/200?text=Pilih+Foto+Project";
        const hasImg = Boolean(data.image_url);

        formFields.innerHTML = `
            <label>Level Materi *</label>
            <select id="level_id" required>
                <option value="">-- Pilih Level Kurikulum --</option>
                ${levelOptions}
            </select>

            <label>Sub-Level / Kit (Opsional)</label>
            <select id="sub_level_id">
                ${renderSubOptions(data.level_id, data.sub_level_id)}
            </select>

            <label>Judul Materi *</label>
            <input type="text" id="title" value="${data.title || ""}" placeholder="Contoh: Line Follower Robot" required>
            
            <label>Foto Cover Project (Support Crop 3:4)</label>
            <div style="margin-bottom: 20px;">
                <button type="button" id="btn-upload-p" style="background:#4d97ff; color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; font-family:inherit;">
                    <i class="fas fa-camera"></i> ${hasImg ? "Ganti Foto Project" : "Ambil & Potong Foto"}
                </button>
                <input type="hidden" id="image_url" value="${data.image_url || ""}">
                <div style="text-align:center;">
                    <img id="img-preview-p" src="${currentImg}" style="width:100%; max-height:220px; object-fit:cover; border-radius:12px; border:2px solid #e2e8f0; background:#f8fafc;">
                </div>
            </div>
            
            <label>Deskripsi Singkat</label>
            <textarea id="description" rows="2" placeholder="Ringkasan konsep atau mekanisme project...">${data.description || ""}</textarea>
            
            <label>Detail Lengkap & Langkah Kerja</label>
            <textarea id="detail" style="height:120px;" placeholder="Uraian langkah perakitan, komponen, coding, atau capaian pembelajaran...">${data.detail || ""}</textarea>
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

            <label>Sub-Level / Kit (Opsional)</label>
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

    document.getElementById("dynamic-form").onsubmit = handleFormSubmit;

    document.getElementById("main-content-area").onclick = (e) => {
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            e.stopPropagation();
            deleteData(btnDelete.dataset.type, btnDelete.dataset.id);
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
        if (el.id) payload[el.id] = el.value;
    });

    // Sinkronkan teks level dari level_id yang dipilih
    if (payload.level_id) {
        const matchedLevel = levelsList.find(l => l.id === payload.level_id);
        if (matchedLevel) {
            payload.level = matchedLevel.kode;
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
            
        if (error) throw error;
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