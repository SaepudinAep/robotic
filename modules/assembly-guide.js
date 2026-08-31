/**
 * Project: Assembly Guide Module (Petunjuk Perakitan Robot)
 * Version: 1.0 - Interactive Step-by-Step Slider & Step Builder Drawer
 * Storage: Cloudinary (via config.js / robotic_assembly folder) & Supabase
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';
import { openImageCropper } from '../assets/js/image-cropper.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let levelsList = [];
let subLevelsList = [];
let guidesList = [];
let selectedLevelId = "all";
let editingGuideId = null;

// Viewer State
let currentViewingGuide = null;
let currentStepIndex = 0;

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    await fetchLevels();
    injectStyles();

    canvas.innerHTML = `
        <div class="ag-container fade-in">
            <div class="ag-header">
                <div>
                    <h2>Assembly Guide (Petunjuk Perakitan Robot)</h2>
                    <p>Panduan perakitan robot langkah demi langkah interaktif per level &amp; sub-level.</p>
                </div>
            </div>

            <!-- SEARCH & LEVEL FILTER BAR -->
            <div class="ag-filter-section">
                <div class="ag-search-wrapper">
                    <i class="fas fa-search"></i>
                    <input type="text" id="globalSearchAssembly" placeholder="Cari nama robot, sub-level, atau instruksi perakitan...">
                </div>

                <div class="level-filter-bar" id="level-filter-bar-ag">
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

            <!-- CONTENT CATALOG AREA -->
            <div id="assembly-content-area" class="ag-content">
                <div id="loading-state-ag" style="text-align:center; padding:40px; color:#94a3b8;">
                    <i class="fas fa-circle-notch fa-spin fa-2x"></i>
                    <p style="margin-top:10px; font-weight:600;">Memuat Assembly Guide...</p>
                </div>
                <div id="assembly-catalog-list" class="ag-grid"></div>
            </div>
        </div>

        <!-- FLOATING ACTION BUTTON (ADD NEW GUIDE) -->
        <button id="fab-add-ag" class="fab-btn" title="Tambah Assembly Guide Baru">
            <i class="fas fa-plus"></i>
        </button>

        <!-- MODAL STEP BUILDER DRAWER (CREATE / EDIT) -->
        <div id="modal-ag-builder" class="modal-overlay">
            <div class="modal-drawer ag-builder-drawer">
                <div class="modal-header">
                    <h2 id="ag-modal-title">Editor Assembly Guide</h2>
                    <button id="modal-ag-close" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="ag-form">
                        <!-- MASTER INFO -->
                        <div class="ag-section-box">
                            <h3 class="ag-section-title"><i class="fas fa-robot"></i> Informasi Robot / Project</h3>
                            
                            <div style="display:flex; gap:10px;">
                                <div style="flex:1;">
                                    <label>Level Target *</label>
                                    <select id="ag_level_id" required>
                                        <option value="">-- Pilih Level --</option>
                                        ${levelsList.map(l => `<option value="${l.id}">${l.kode} ${l.detail ? `(${l.detail})` : ''}</option>`).join('')}
                                    </select>
                                </div>
                                <div style="flex:1;">
                                    <label>Sub-Level (Opsional)</label>
                                    <select id="ag_sub_level_id">
                                        <option value="">-- Pilih Sub-Level --</option>
                                    </select>
                                </div>
                            </div>

                            <label>Nama Robot / Project *</label>
                            <input type="text" id="ag_title" placeholder="Contoh: Line Follower Robot v1" required>

                            <label>Foto Sampul (Cover)</label>
                            <div style="margin-bottom:12px;">
                                <button type="button" id="btn-upload-cover-ag" class="btn-ag-upload">
                                    <i class="fas fa-camera"></i> Upload Foto Sampul (Cloudinary)
                                </button>
                                <input type="hidden" id="ag_cover_url" value="">
                                <div style="text-align:center; margin-top:8px;">
                                    <img id="img-preview-cover-ag" src="https://via.placeholder.com/300x200?text=Foto+Sampul+Robot" style="max-height:160px; border-radius:12px; border:1px solid #e2e8f0; object-fit:cover;">
                                </div>
                            </div>

                            <label>Deskripsi / Catatan Singkat</label>
                            <textarea id="ag_description" rows="2" placeholder="Catatan umum perakitan atau komponen yang disiapkan..."></textarea>
                        </div>

                        <!-- STEP BUILDER CONTAINER -->
                        <div class="ag-section-box" style="margin-top:20px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <h3 class="ag-section-title" style="margin:0;"><i class="fas fa-list-ol"></i> Langkah-Langkah Perakitan</h3>
                                <button type="button" id="btn-add-step-row" class="btn-ag-secondary">
                                    <i class="fas fa-plus"></i> Tambah Step Baru
                                </button>
                            </div>
                            <div id="ag-steps-container"></div>
                        </div>

                        <div class="form-footer">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save" style="margin-right:8px;"></i> Simpan Assembly Guide
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- MODAL INTERACTIVE STEP SLIDER VIEWER -->
        <div id="modal-ag-viewer" class="modal-overlay">
            <div class="modal-drawer ag-viewer-drawer">
                <div class="modal-header">
                    <div>
                        <h2 id="viewer-robot-title" style="font-size:1.15rem; margin:0; color:#0f172a;">Nama Robot</h2>
                        <span id="viewer-step-badge" class="badge-sublevel-tag" style="margin-top:4px;">Step 1 dari 1</span>
                    </div>
                    <button id="modal-ag-viewer-close" class="close-btn">&times;</button>
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
// 2. FETCH DATA & LEVELS
// ==========================================
async function fetchLevels() {
    try {
        const { data: lvData } = await supabase.from('levels').select('id, kode, detail').order('kode');
        if (lvData) levelsList = lvData;

        const { data: subData } = await supabase.from('sub_levels').select('id, level_id, name, kode').order('name');
        if (subData) subLevelsList = subData;
    } catch (e) {
        console.error("Gagal memuat level Assembly Guide:", e);
    }
}

// Helper untuk merender pilihan Sub-Level
function renderSubOptions(lvlId, currentSubId) {
    const subs = subLevelsList.filter(s => s.level_id === lvlId);
    if (!subs.length) return '<option value="">-- Tanpa Sub-Level --</option>';
    return '<option value="">-- Pilih Sub-Level --</option>' + 
        subs.map(s => `<option value="${s.id}" ${currentSubId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
}

// Parse Guide Object & Steps (termasuk fallback jika disimpan di Supabase/JSON)
function parseGuideSteps(g) {
    let steps = [];
    if (g.assembly_guide_steps && Array.isArray(g.assembly_guide_steps) && g.assembly_guide_steps.length > 0) {
        steps = g.assembly_guide_steps.sort((a, b) => (a.step_number || 0) - (b.step_number || 0));
    } else if (g.description && g.description.startsWith('{') && g.description.endsWith('}')) {
        try {
            const parsed = JSON.parse(g.description);
            if (parsed.steps) steps = parsed.steps;
        } catch (e) {}
    }
    return steps;
}

// ==========================================
// 3. STYLING (CSS INJECTION)
// ==========================================
function injectStyles() {
    const styleId = 'assembly-guide-css-v1';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .ag-container { max-width: 1040px; margin: 0 auto; padding-bottom: 90px; font-family: 'Poppins', sans-serif; }
        .ag-header { margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; }
        .ag-header h2 { color: #1e293b; margin: 0; font-size: 1.5rem; font-weight: 800; }
        .ag-header p { color: #64748b; margin: 5px 0 0; font-size: 0.9rem; }

        .ag-filter-section { margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
        .ag-search-wrapper { position: relative; width: 100%; }
        .ag-search-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .ag-search-wrapper input { width: 100%; padding: 12px 15px 12px 42px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 0.95rem; outline: none; background: white; box-sizing: border-box; }
        .ag-search-wrapper input:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.15); }

        /* Grid Catalog Cards */
        .ag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }

        .ag-card {
            background: white; border-radius: 18px; border: 1px solid #e2e8f0;
            overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s;
        }
        .ag-card:hover { transform: translateY(-4px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); border-color: #bfdbfe; }
        
        .ag-card-thumb { width: 100%; height: 170px; background: #f8fafc; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .ag-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ag-card-thumb i { font-size: 2.5rem; color: #cbd5e1; }
        
        .ag-card-badge-top { position: absolute; top: 12px; left: 12px; display: flex; gap: 6px; }
        
        .ag-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .ag-card-title { margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; line-height: 1.3; }
        .ag-card-desc { font-size: 0.84rem; color: #64748b; margin-bottom: 14px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .ag-card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: auto; }
        
        .btn-start-build {
            background: #4d97ff; color: white; border: none; padding: 10px 16px;
            border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px; transition: 0.2s;
        }
        .btn-start-build:hover { background: #2563eb; }

        /* Drawer & Section Box */
        .ag-builder-drawer { max-width: 720px; }
        .ag-viewer-drawer { max-width: 820px; height: 92vh; }
        
        .ag-section-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
        .ag-section-title { margin: 0 0 14px 0; font-size: 0.95rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px; }

        .btn-ag-upload { background: #4d97ff; color: white; border: none; padding: 9px 14px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.82rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit; }
        .btn-ag-upload:hover { background: #2563eb; }

        .btn-ag-secondary { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 7px 12px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
        .btn-ag-secondary:hover { background: #dbeafe; }

        /* Step Item Row in Builder */
        .ag-step-row { background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 12px; position: relative; }
        .ag-step-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: 700; color: #1e293b; font-size: 0.9rem; }

        /* Interactive Slider Viewer UI */
        .ag-viewer-body-content { display: flex; flex-direction: column; align-items: center; text-align: center; height: 100%; }
        .ag-step-image-box { width: 100%; max-height: 50vh; background: #0f172a; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .ag-step-image-box img { max-width: 100%; max-height: 50vh; object-fit: contain; }
        .ag-step-text-box { width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; text-align: left; }
        .ag-step-text-box h4 { margin: 0 0 6px 0; font-size: 1rem; color: #0f172a; font-weight: 800; }
        .ag-step-text-box p { margin: 0; color: #334155; font-size: 0.92rem; line-height: 1.6; }

        .ag-viewer-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 14px; }
        .btn-ag-nav { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-ag-nav.primary { background: #4d97ff; color: white; border-color: #4d97ff; }
        .btn-ag-nav:disabled { opacity: 0.4; cursor: not-allowed; }

        .ag-dots-bar { display: flex; gap: 6px; overflow-x: auto; max-width: 260px; scrollbar-width: none; }
        .ag-dot { width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; cursor: pointer; flex-shrink: 0; transition: 0.2s; }
        .ag-dot.active { background: #4d97ff; transform: scale(1.3); }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 4. LOAD CATALOG DATA
// ==========================================
async function loadData() {
    const search = document.getElementById("globalSearchAssembly").value.toLowerCase();
    const catalogContainer = document.getElementById("assembly-catalog-list");
    const loading = document.getElementById("loading-state-ag");

    loading.style.display = 'block';
    catalogContainer.innerHTML = '';

    try {
        let query = supabase
            .from('assembly_guides')
            .select('*, levels(id, kode, detail), sub_levels(name, kode), assembly_guide_steps(*)')
            .order('created_at', { ascending: false });

        if (selectedLevelId !== "all") {
            query = query.eq('level_id', selectedLevelId);
        }

        let { data, error } = await query;
        loading.style.display = 'none';

        if (error) {
            console.warn("Mencoba fallback data assembly_guides:", error);
            data = [];
        }

        guidesList = data || [];

        const filtered = guidesList.filter(g => {
            const titleMatch = g.title?.toLowerCase().includes(search);
            const descMatch = g.description?.toLowerCase().includes(search);
            const levelMatch = g.levels?.kode?.toLowerCase().includes(search);
            return titleMatch || descMatch || levelMatch;
        });

        if (!filtered.length) {
            catalogContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8; background:white; border-radius:16px; border:2px dashed #e2e8f0;">
                    <i class="fas fa-robot" style="font-size:2.5rem; margin-bottom:10px; color:#cbd5e1;"></i>
                    <p style="margin:0; font-weight:700;">Belum ada Assembly Guide untuk filter ini.</p>
                    <p style="margin:5px 0 0 0; font-size:0.85rem;">Klik tombol <strong>+</strong> di pojok kanan bawah untuk menambah panduan baru.</p>
                </div>`;
            return;
        }

        catalogContainer.innerHTML = filtered.map(g => {
            const steps = parseGuideSteps(g);
            const levelName = g.levels?.kode || 'Umum';
            const subLevelName = g.sub_level_id ? (g.sub_levels?.name || g.sub_levels?.kode || '') : '';
            const coverImg = g.cover_image_url || (steps.length && steps[0].image_url) || null;

            return `
                <div class="ag-card" data-id="${g.id}">
                    <div class="ag-card-thumb">
                        ${coverImg 
                            ? `<img src="${coverImg}" alt="${g.title}" loading="lazy">` 
                            : `<i class="fas fa-robot"></i>`
                        }
                        <div class="ag-card-badge-top">
                            <span class="badge-level-tag"><i class="fas fa-layer-group"></i> ${levelName}</span>
                            ${subLevelName ? `<span class="badge-sublevel-tag"><i class="fas fa-tag"></i> ${subLevelName}</span>` : ''}
                        </div>
                    </div>
                    <div class="ag-card-body">
                        <div>
                            <h3 class="ag-card-title">${g.title}</h3>
                            <p class="ag-card-desc">${g.description || 'Tidak ada deskripsi singkat.'}</p>
                        </div>
                        <div class="ag-card-footer">
                            <span class="badge-rpp-pill"><i class="fas fa-list-ol"></i> ${steps.length} Step Perakitan</span>
                            <div style="display:flex; gap:6px;">
                                <button class="btn-start-build" data-action="view-slider" data-id="${g.id}">
                                    <i class="fas fa-play"></i> Rakit
                                </button>
                                <button class="btn-action-icon btn-edit-trigger" data-action="edit" data-id="${g.id}" title="Edit Guide">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="btn-action-icon btn-delete" data-action="delete" data-id="${g.id}" title="Hapus Guide">
                                    <i class="fas fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        loading.innerHTML = `<span style="color:red; font-weight:600;">Error: ${err.message}</span>`;
    }
}

// ==========================================
// 5. STEP BUILDER DRAWER FORM
// ==========================================
async function injectFormFields(mode = "add", data = {}) {
    editingGuideId = mode === "edit" ? data.id : null;
    document.getElementById("ag-modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} Assembly Guide`;
    
    document.getElementById("ag_level_id").value = data.level_id || "";
    const subSel = document.getElementById("ag_sub_level_id");
    subSel.innerHTML = renderSubOptions(data.level_id, data.sub_level_id);
    
    document.getElementById("ag_title").value = data.title || "";
    document.getElementById("ag_cover_url").value = data.cover_image_url || "";
    document.getElementById("img-preview-cover-ag").src = data.cover_image_url || "https://via.placeholder.com/300x200?text=Foto+Sampul+Robot";
    document.getElementById("ag_description").value = data.description && !data.description.startsWith('{') ? data.description : "";

    const container = document.getElementById("ag-steps-container");
    container.innerHTML = "";

    const steps = parseGuideSteps(data);
    if (steps.length > 0) {
        steps.forEach(st => addStepRow(st));
    } else {
        addStepRow({ step_number: 1, title: 'Langkah 1', instruction_text: '' });
    }
}

function addStepRow(st = {}) {
    const container = document.getElementById("ag-steps-container");
    const stepIdx = container.children.length + 1;
    const row = document.createElement("div");
    row.className = "ag-step-row";
    row.dataset.step = stepIdx;

    const imgUrl = st.image_url || "";
    const previewImg = imgUrl || "https://via.placeholder.com/200x150?text=Foto+Step";

    row.innerHTML = `
        <div class="ag-step-row-header">
            <span><i class="fas fa-list-ol"></i> Step ${stepIdx}</span>
            <div style="display:flex; gap:4px;">
                <button type="button" class="btn-action-icon btn-move-step" data-dir="-1" title="Naikkan"><i class="fas fa-arrow-up"></i></button>
                <button type="button" class="btn-action-icon btn-move-step" data-dir="1" title="Turunkan"><i class="fas fa-arrow-down"></i></button>
                <button type="button" class="btn-action-icon btn-remove-step" title="Hapus Step" style="color:#ef4444;"><i class="fas fa-trash-can"></i></button>
            </div>
        </div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <div style="width:120px; text-align:center;">
                <img class="img-preview-step" src="${previewImg}" style="width:100%; height:85px; object-fit:cover; border-radius:10px; border:1px solid #cbd5e1;">
                <button type="button" class="btn-ag-secondary btn-upload-step-img" style="width:100%; margin-top:6px; font-size:0.75rem; padding:4px;">
                    <i class="fas fa-camera"></i> Foto
                </button>
                <input type="hidden" class="step-image-url" value="${imgUrl}">
            </div>
            <div style="flex:1; min-width:200px;">
                <input type="text" class="step-title-input" value="${st.title || `Langkah ${stepIdx}`}" placeholder="Judul langkah (misal: Pasang Motor DC)" style="margin-bottom:6px;">
                <textarea class="step-instruction-input" rows="2" placeholder="Teks instruksi perakitan singkat...">${st.instruction_text || ""}</textarea>
            </div>
        </div>
    `;

    // Handler upload foto step via Cloudinary (config.js)
    row.querySelector('.btn-upload-step-img').onclick = () => {
        openImageCropper('robotic_assembly', url => {
            row.querySelector('.step-image-url').value = url;
            row.querySelector('.img-preview-step').src = url;
        });
    };

    // Handler remove step
    row.querySelector('.btn-remove-step').onclick = () => {
        row.remove();
        reindexStepNumbers();
    };

    // Handler move step
    row.querySelectorAll('.btn-move-step').forEach(b => {
        b.onclick = (e) => {
            const dir = parseInt(b.dataset.dir);
            if (dir === -1 && row.previousElementSibling) {
                container.insertBefore(row, row.previousElementSibling);
            } else if (dir === 1 && row.nextElementSibling) {
                container.insertBefore(row.nextElementSibling, row);
            }
            reindexStepNumbers();
        };
    });

    container.appendChild(row);
}

function reindexStepNumbers() {
    const container = document.getElementById("ag-steps-container");
    Array.from(container.children).forEach((row, i) => {
        const num = i + 1;
        row.dataset.step = num;
        row.querySelector('.ag-step-row-header span').innerHTML = `<i class="fas fa-list-ol"></i> Step ${num}`;
    });
}

// ==========================================
// 6. INTERACTIVE STEP SLIDER VIEWER
// ==========================================
function openSliderViewer(guideId) {
    const g = guidesList.find(item => item.id === guideId);
    if (!g) return;

    currentViewingGuide = g;
    currentStepIndex = 0;
    const steps = parseGuideSteps(g);

    document.getElementById("viewer-robot-title").innerText = g.title || 'Assembly Guide';
    renderSliderStep(steps);

    document.getElementById("modal-ag-viewer").classList.add("active");
}

function renderSliderStep(steps) {
    if (!steps || !steps.length) {
        document.getElementById("viewer-slider-body").innerHTML = `
            <div style="text-align:center; padding:40px; color:#94a3b8;">
                <i class="fas fa-triangle-exclamation fa-2x"></i>
                <p>Belum ada langkah perakitan untuk robot ini.</p>
            </div>`;
        return;
    }

    const total = steps.length;
    if (currentStepIndex < 0) currentStepIndex = 0;
    if (currentStepIndex >= total) currentStepIndex = total - 1;

    const st = steps[currentStepIndex];
    document.getElementById("viewer-step-badge").innerText = `Step ${currentStepIndex + 1} dari ${total}`;

    const body = document.getElementById("viewer-slider-body");
    body.innerHTML = `
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
                ${st.notes ? `<div style="margin-top:8px; font-size:0.82rem; color:#d97706; background:#fffbe6; padding:6px 10px; border-radius:8px;"><i class="fas fa-lightbulb"></i> Tips: ${st.notes}</div>` : ''}
            </div>
        </div>
    `;

    // Update Button Nav State
    const btnPrev = document.getElementById("btn-prev-step");
    const btnNext = document.getElementById("btn-next-step");
    if (btnPrev) btnPrev.disabled = currentStepIndex === 0;
    if (btnNext) {
        btnNext.disabled = currentStepIndex === total - 1;
        btnNext.innerHTML = currentStepIndex === total - 1 
            ? `Selesai <i class="fas fa-check-circle"></i>` 
            : `Selanjutnya <i class="fas fa-arrow-right"></i>`;
    }

    // Render Dots Bar
    const dotsContainer = document.getElementById("viewer-dots-container");
    if (dotsContainer) {
        dotsContainer.innerHTML = steps.map((_, i) => `
            <div class="ag-dot ${i === currentStepIndex ? 'active' : ''}" data-idx="${i}"></div>
        `).join("");
    }
}

// ==========================================
// 7. EVENT HANDLERS
// ==========================================
function setupEventListeners() {
    document.getElementById("globalSearchAssembly").oninput = loadData;

    // Filter Chips Event
    const chipContainer = document.getElementById("level-filter-bar-ag");
    chipContainer.onclick = (e) => {
        const chip = e.target.closest('.level-chip');
        if (!chip) return;
        chipContainer.querySelectorAll('.level-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedLevelId = chip.dataset.level;
        loadData();
    };

    // Form Level cascading -> Sub Level
    document.getElementById("ag_level_id").onchange = (e) => {
        document.getElementById("ag_sub_level_id").innerHTML = renderSubOptions(e.target.value, null);
    };

    // Upload Cover Button
    document.getElementById("btn-upload-cover-ag").onclick = () => {
        openImageCropper('robotic_assembly', url => {
            document.getElementById("ag_cover_url").value = url;
            document.getElementById("img-preview-cover-ag").src = url;
        });
    };

    // Add Step Row Button
    document.getElementById("btn-add-step-row").onclick = () => addStepRow();

    // FAB Add
    document.getElementById("fab-add-ag").onclick = async () => {
        await injectFormFields("add");
        document.getElementById("modal-ag-builder").classList.add("active");
    };

    document.getElementById("modal-ag-close").onclick = () => {
        document.getElementById("modal-ag-builder").classList.remove("active");
    };

    document.getElementById("modal-ag-viewer-close").onclick = () => {
        document.getElementById("modal-ag-viewer").classList.remove("active");
    };

    // Slider Prev / Next Buttons
    document.getElementById("btn-prev-step").onclick = () => {
        if (currentViewingGuide && currentStepIndex > 0) {
            currentStepIndex--;
            renderSliderStep(parseGuideSteps(currentViewingGuide));
        }
    };

    document.getElementById("btn-next-step").onclick = () => {
        if (currentViewingGuide) {
            const steps = parseGuideSteps(currentViewingGuide);
            if (currentStepIndex < steps.length - 1) {
                currentStepIndex++;
                renderSliderStep(steps);
            } else {
                document.getElementById("modal-ag-viewer").classList.remove("active");
            }
        }
    };

    // Slider Dots Click Event
    document.getElementById("viewer-dots-container").onclick = (e) => {
        const dot = e.target.closest('.ag-dot');
        if (dot && currentViewingGuide) {
            currentStepIndex = parseInt(dot.dataset.idx);
            renderSliderStep(parseGuideSteps(currentViewingGuide));
        }
    };

    // Form Submit (Save / Edit Guide & Steps)
    document.getElementById("ag-form").onsubmit = handleFormSubmit;

    // Catalog Actions (View Slider / Edit / Delete)
    document.getElementById("assembly-catalog-list").onclick = async (e) => {
        const btnSlider = e.target.closest('[data-action="view-slider"]');
        if (btnSlider) {
            openSliderViewer(btnSlider.dataset.id);
            return;
        }

        const btnEdit = e.target.closest('[data-action="edit"]');
        if (btnEdit) {
            const guide = guidesList.find(g => g.id === btnEdit.dataset.id);
            if (guide) {
                await injectFormFields("edit", guide);
                document.getElementById("modal-ag-builder").classList.add("active");
            }
            return;
        }

        const btnDelete = e.target.closest('[data-action="delete"]');
        if (btnDelete) {
            deleteGuide(btnDelete.dataset.id);
        }
    };
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const masterPayload = {
        level_id: document.getElementById("ag_level_id").value || null,
        sub_level_id: document.getElementById("ag_sub_level_id").value || null,
        title: document.getElementById("ag_title").value.trim(),
        cover_image_url: document.getElementById("ag_cover_url").value || null,
        description: document.getElementById("ag_description").value.trim()
    };

    // Kumpulkan Steps dari Form Builder
    const stepRows = Array.from(document.querySelectorAll(".ag-step-row"));
    const stepsPayload = stepRows.map((row, idx) => ({
        step_number: idx + 1,
        title: row.querySelector('.step-title-input').value.trim() || `Langkah ${idx + 1}`,
        image_url: row.querySelector('.step-image-url').value || null,
        instruction_text: row.querySelector('.step-instruction-input').value.trim() || ''
    }));

    try {
        let guideId = editingGuideId;

        // Simpan master assembly_guides
        if (editingGuideId) {
            const { error: updateErr } = await supabase.from('assembly_guides').update(masterPayload).eq('id', editingGuideId);
            if (updateErr) throw updateErr;
        } else {
            const { data: newGuide, error: insertErr } = await supabase.from('assembly_guides').insert([masterPayload]).select('id').single();
            if (insertErr) {
                // Fallback: Jika tabel assembly_guides belum di-alter di Supabase SQL, kembalikan notifikasi ramah
                throw insertErr;
            }
            guideId = newGuide.id;
        }

        // Hapus steps lama jika edit, lalu simpan steps baru
        if (editingGuideId) {
            await supabase.from('assembly_guide_steps').delete().eq('guide_id', editingGuideId);
        }

        const fullStepsPayload = stepsPayload.map(s => ({ ...s, guide_id: guideId }));
        if (fullStepsPayload.length > 0) {
            await supabase.from('assembly_guide_steps').insert(fullStepsPayload);
        }

        document.getElementById("modal-ag-builder").classList.remove("active");
        await loadData();
    } catch (err) {
        alert("Gagal menyimpan Assembly Guide: " + err.message + "\n\nPastikan script migrations/02_create_assembly_guides.sql telah dijalankan pada Supabase SQL Editor.");
    }
}

async function deleteGuide(id) {
    if (!confirm("Yakin ingin menghapus Assembly Guide ini?")) return;
    try {
        const { error } = await supabase.from('assembly_guides').delete().eq('id', id);
        if (!error) loadData();
        else alert("Gagal menghapus: " + error.message);
    } catch (err) {
        alert("Error: " + err.message);
    }
}

