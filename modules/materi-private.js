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
let selectedLevelId = "all";
let levelsList = [];

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
        const { data, error } = await supabase
            .from('levels')
            .select('id, kode, detail')
            .order('kode', { ascending: true });
        if (!error && data) {
            levelsList = data;
        }
    } catch (e) {
        console.error("Gagal memuat levels:", e);
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
            const { data } = await supabase.from('levels').select('*').order('kode');
            loading.style.display = 'none';
            const filtered = data ? data.filter(l => l.kode.toLowerCase().includes(search) || l.detail?.toLowerCase().includes(search)) : [];

            if (!filtered.length) {
                container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Tidak ada data level.</div>`;
                return;
            }

            container.innerHTML = filtered.map(l => `
                <div class="compact-item border-levels btn-edit-trigger" data-id="${l.id}" data-type="levels">
                    <div class="item-info">
                        <div class="item-icon" style="color:#8b5cf6;"><i class="fas fa-layer-group"></i></div>
                        <div class="item-text">
                            <b>${l.kode}</b>
                            <span>${l.detail || 'Tidak ada keterangan'}</span>
                        </div>
                    </div>
                    <button class="btn-action-icon btn-delete" data-id="${l.id}" data-type="levels" title="Hapus Level">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>`).join("");

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

async function injectFormFields(mode = "add", data = {}) {
    const formFields = document.getElementById("form-fields");
    const tabNames = { materi: "Materi Privat", achievement: "Achievement Privat", levels: "Level Kurikulum", guru: "Guru / Mentor" };
    document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} ${tabNames[currentTab] || "Data"}`;

    if (currentTab === "levels") {
        formFields.innerHTML = `
            <label>Kode Level *</label>
            <input type="text" id="kode" value="${data.kode || ""}" placeholder="Contoh: LV-1 atau KIDDY" required>
            <label>Deskripsi & Keterangan Level</label>
            <textarea id="detail" rows="3" placeholder="Uraian rentang usia, kompetensi, atau target level...">${data.detail || ""}</textarea>
        `;
    } 
    else if (currentTab === "materi" || currentTab === "achievement") {
        const { data: lvData } = await supabase.from('levels').select('id, kode, detail').order('kode');
        const levelOptions = (lvData || []).map(l => `
            <option value="${l.id}" ${data.level_id === l.id ? "selected" : ""}>
                ${l.kode} ${l.detail ? `(${l.detail})` : ''}
            </option>
        `).join("");

        if (currentTab === "materi") {
            const currentImg = data.image_url || "https://via.placeholder.com/200?text=Pilih+Foto+Project";
            const hasImg = Boolean(data.image_url);

            formFields.innerHTML = `
                <label>Pilih Level Kurikulum *</label>
                <select id="level_id" required>
                    <option value="">-- Pilih Level Kurikulum --</option>
                    ${levelOptions}
                </select>

                <label>Judul Materi Privat *</label>
                <input type="text" id="judul" value="${data.judul || ""}" placeholder="Contoh: Robot Smart Car Sensor" required>
                
                <label>Foto Cover Project (Support Crop 3:4)</label>
                <div style="margin-bottom: 20px;">
                    <button type="button" id="btn-upload-p" style="background:#f59e0b; color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; font-family:inherit;">
                        <i class="fas fa-camera"></i> ${hasImg ? "Ganti Foto Project" : "Ambil & Potong Foto"}
                    </button>
                    <input type="hidden" id="image_url" value="${data.image_url || ""}">
                    <div style="text-align:center;">
                        <img id="img-preview-p" src="${currentImg}" style="width:100%; max-height:220px; object-fit:cover; border-radius:12px; border:2px solid #e2e8f0; background:#f8fafc;">
                    </div>
                </div>

                <label>Deskripsi Singkat</label>
                <textarea id="deskripsi" rows="2" placeholder="Ringkasan konsep project...">${data.deskripsi || ""}</textarea>
                
                <label>Detail Lengkap & Langkah Kerja</label>
                <textarea id="detail" style="height:120px;" placeholder="Langkah perakitan, coding, dan evaluasi...">${data.detail || ""}</textarea>
            `;
            
            // Bind Upload Button via Universal 3:4 Cropper
            setTimeout(() => {
                const btn = document.getElementById("btn-upload-p");
                if (btn) {
                    btn.onclick = () => openImageCropper('robotic_private', url => {
                        document.getElementById("image_url").value = url;
                        document.getElementById("img-preview-p").src = url;
                    });
                }
            }, 100);

        } else {
            // ACHIEVEMENT FORM
            formFields.innerHTML = `
                <label>Pilih Level Target *</label>
                <select id="level_id" required>
                    <option value="">-- Pilih Level Target --</option>
                    ${levelOptions}
                </select>

                <label>Kategori / Topik Utama *</label>
                <input type="text" id="main_achievement" value="${data.main_achievement || ""}" placeholder="Contoh: Pemahaman Mekanisme Gear" required>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; margin-bottom:10px;">
                    <label style="margin:0;">Detail Target (Sub Items)</label>
                    <button type="button" id="btn-add-sub" style="background:#10b981; color:white; border:none; padding:6px 14px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700;">
                        <i class="fas fa-plus"></i> Tambah Baris
                    </button>
                </div>
                <div id="sub-ach-container"></div>
            `;

            setTimeout(() => {
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
    else if (currentTab === "guru") {
        formFields.innerHTML = `
            <label>Nama Guru / Mentor *</label>
            <input type="text" id="name" value="${data.name || ""}" placeholder="Nama Lengkap Mentor" required>
            
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
    document.getElementById("list-container").addEventListener('click', (e) => {
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
    const tableMap = { levels: 'levels', materi: 'materi_private', achievement: 'achievement_private', guru: 'teachers' };
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

    // Achievement Sub-Inputs
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
        alert("Gagal: " + err.message);
    }
}

async function openEdit(type, id) {
    const tableMap = { levels: 'levels', materi: 'materi_private', achievement: 'achievement_private', guru: 'teachers' };
    let tableName = tableMap[type] || 'materi_private';
    
    const { data } = await supabase.from(tableName).select('*').eq('id', id).single();
    if (data) {
        editingId = id;
        await injectFormFields("edit", data);
        document.getElementById("modal-overlay").classList.add("active");
    }
}

async function deleteData(tableType, id) {
    if (!confirm("Hapus data ini?")) return;
    const { error } = await supabase.from(tableType).delete().eq('id', id);
    if (!error) loadData();
    else alert("Gagal hapus: " + error.message);
}