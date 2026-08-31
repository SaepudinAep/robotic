/**
 * Project: Assembly Guide Module (Petunjuk Perakitan Robot - Khusus Input Perakitan)
 * Version: 3.0 - Cascading Select, Auto Image Compression, Slider Viewer, RBAC Soft vs Hard Delete
 * Storage: Cloudinary (via config.js / dmm6avtxd / robotic_assembly folder) & Supabase
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey, cloudinaryConfig } from '../assets/js/config.js';
import { openImageCropper } from '../assets/js/image-cropper.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let currentUserProfile = null;
let userRole = 'teacher'; // 'super_admin' | 'teacher'
let currentCategory = "sekolah"; // "sekolah" | "private"
let levelsList = [];
let subLevelsList = [];
let materiListSekolah = [];
let materiListPrivate = [];
let selectedLevelId = "all";
let editingMateriId = null;

// Viewer State
let currentViewingItem = null;
let currentViewingSteps = [];
let currentStepIndex = 0;

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas, userProfile = null) {
    currentUserProfile = userProfile;
    userRole = userProfile?.role || 'teacher';

    await fetchData();
    injectStyles();

    canvas.innerHTML = `
        <div class="ag-container fade-in">
            <div class="ag-header">
                <div>
                    <h2>Assembly Guide (Petunjuk Perakitan Robot)</h2>
                    <p>Input &amp; panduan perakitan robot langkah demi langkah interaktif terintegrasi dengan Materi Sekolah &amp; Private.</p>
                </div>
            </div>

            <!-- MAIN CATEGORY TABS -->
            <div class="ag-tabs">
                <button id="btnCatSekolah" class="tab-btn active" data-cat="sekolah">
                    <i class="fas fa-school"></i> MATERI SEKOLAH
                </button>
                <button id="btnCatPrivate" class="tab-btn" data-cat="private">
                    <i class="fas fa-user-shield"></i> MATERI PRIVATE
                </button>
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

        <!-- FLOATING ACTION BUTTON (ADD NEW ASSEMBLY GUIDE) -->
        <button id="fab-add-ag" class="fab-btn" title="Tambah Petunjuk Perakitan Baru">
            <i class="fas fa-plus"></i>
        </button>

        <!-- MODAL STEP BUILDER DRAWER -->
        <div id="modal-ag-builder" class="modal-overlay">
            <div class="modal-drawer ag-builder-drawer">
                <div class="modal-header">
                    <h2 id="ag-modal-title">Input Petunjuk Perakitan Robot</h2>
                    <button id="modal-ag-close" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="ag-form">
                        <!-- CASCADING SELECTION: LEVEL -> SUB-LEVEL -> MATERI -->
                        <div class="ag-section-box">
                            <h3 class="ag-section-title"><i class="fas fa-sitemap"></i> Pilih Materi &amp; Robot Target</h3>
                            
                            <label>Kategori Materi *</label>
                            <select id="ag_form_category" required>
                                <option value="sekolah" ${currentCategory === 'sekolah' ? 'selected' : ''}>Materi Sekolah</option>
                                <option value="private" ${currentCategory === 'private' ? 'selected' : ''}>Materi Private</option>
                            </select>

                            <div style="display:flex; gap:10px;">
                                <div style="flex:1;">
                                    <label>1. Level *</label>
                                    <select id="ag_form_level_id" required>
                                        <option value="">-- Pilih Level --</option>
                                        ${levelsList.map(l => `<option value="${l.id}">${l.kode} ${l.detail ? `(${l.detail})` : ''}</option>`).join('')}
                                    </select>
                                </div>
                                <div style="flex:1;">
                                    <label>2. Sub-Level (Opsional)</label>
                                    <select id="ag_form_sub_level_id">
                                        <option value="">-- Pilih Sub-Level --</option>
                                    </select>
                                </div>
                            </div>

                            <label>3. Pilih Topik Materi / Robot *</label>
                            <select id="ag_form_materi_id" required>
                                <option value="">-- Pilih Level &amp; Sub-Level Dahulu --</option>
                            </select>
                        </div>

                        <!-- STEP BUILDER CONTAINER -->
                        <div class="ag-section-box" style="margin-top:20px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <div>
                                    <h3 class="ag-section-title" style="margin:0;"><i class="fas fa-list-ol"></i> Langkah-Langkah Perakitan</h3>
                                    <span style="font-size:0.75rem; color:#10b981; font-weight:600;"><i class="fas fa-compress"></i> Foto otomatis dikompresi (<100KB)</span>
                                </div>
                                <button type="button" id="btn-add-step-row" class="btn-ag-secondary" style="background:#10b981; color:white; border:none;">
                                    <i class="fas fa-plus"></i> Tambah Step
                                </button>
                            </div>
                            <div id="ag-steps-container"></div>
                        </div>

                        <div class="form-footer">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save" style="margin-right:8px;"></i> Simpan Petunjuk Perakitan
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
    await loadCatalogData();
}

// ==========================================
// 2. FETCH DATA & LEVELS
// ==========================================
async function fetchData() {
    try {
        const [lv, sub, mSek, mPrv] = await Promise.all([
            supabase.from('levels').select('id, kode, detail').order('kode'),
            supabase.from('sub_levels').select('id, level_id, name, kode').order('name'),
            supabase.from('materi').select('id, title, level_id, sub_level_id, image_url, description, detail, is_deleted, assembly_guides(id, title, description, created_at)').or('is_deleted.is.null,is_deleted.eq.false'),
            supabase.from('materi_private').select('id, judul, level_id, sub_level_id, image_url, deskripsi, detail, is_deleted, assembly_guides(id, title, description, created_at)').or('is_deleted.is.null,is_deleted.eq.false')
        ]);

        if (lv.data) levelsList = lv.data;
        if (sub.data) subLevelsList = sub.data;
        if (mSek.data) materiListSekolah = mSek.data;
        if (mPrv.data) materiListPrivate = mPrv.data;
    } catch (e) {
        console.error("Gagal memuat data Assembly Guide:", e);
    }
}

function renderSubOptions(lvlId, currentSubId) {
    const subs = subLevelsList.filter(s => s.level_id === lvlId);
    if (!subs.length) return '<option value="">-- Tanpa Sub-Level --</option>';
    return '<option value="">-- Pilih Sub-Level --</option>' + 
        subs.map(s => `<option value="${s.id}" ${currentSubId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
}

function renderMateriOptions(category, lvlId, subLvlId, currentMateriId) {
    const list = category === 'private' ? materiListPrivate : materiListSekolah;
    let filtered = list;

    if (lvlId) filtered = filtered.filter(m => m.level_id === lvlId);
    if (subLvlId) filtered = filtered.filter(m => m.sub_level_id === subLvlId);

    if (!filtered.length) return '<option value="">-- Tidak ada materi ditemukan --</option>';

    return '<option value="">-- Pilih Topik Materi / Robot --</option>' +
        filtered.map(m => `<option value="${m.id}" ${currentMateriId === m.id ? 'selected' : ''}>${m.title || m.judul || '(Tanpa Judul)'}</option>`).join('');
}

function parseMateriSteps(m) {
    let steps = [];
    // Prioritas 1: dari join assembly_guides (tabel DB aktual)
    const guideRows = m.assembly_guides;
    if (guideRows && Array.isArray(guideRows) && guideRows.length > 0) {
        steps = guideRows
            .filter(st => !st.is_deleted)
            .sort((a, b) => (a.step_number || a.order_index || 0) - (b.step_number || b.order_index || 0));
    } else if (m.assembly_guide_steps && Array.isArray(m.assembly_guide_steps) && m.assembly_guide_steps.length > 0) {
        // Fallback ke nama lama jika ada
        steps = m.assembly_guide_steps
            .filter(st => !st.is_deleted)
            .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));
    } else if (m.detail && m.detail.startsWith('{') && m.detail.endsWith('}')) {
        try {
            const parsed = JSON.parse(m.detail);
            if (parsed.assembly_steps) steps = parsed.assembly_steps;
        } catch (e) {}
    }
    return steps;
}

// ==========================================
// 3. KOMPRESI GAMBAR CLIENT-SIDE
// ==========================================
async function compressImageBlob(blob, maxWidth = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((compressedBlob) => {
                URL.revokeObjectURL(img.src);
                resolve(compressedBlob);
            }, 'image/jpeg', quality);
        };
        img.onerror = (err) => reject(err);
    });
}

async function uploadCompressedToCloudinary(urlOrBlob, folderName = 'robotic_assembly') {
    try {
        let fileBlob = urlOrBlob;
        if (typeof urlOrBlob === 'string' && urlOrBlob.startsWith('blob:')) {
            const fetched = await fetch(urlOrBlob);
            fileBlob = await fetched.blob();
        }

        const compressedBlob = await compressImageBlob(fileBlob, 800, 0.75);

        const formData = new FormData();
        formData.append('file', compressedBlob, `assembly_${Date.now()}.jpg`);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', folderName);

        const res = await fetch(cloudinaryConfig.uploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `Upload gagal (${res.status})`);
        }

        const data = await res.json();
        return data.secure_url;
    } catch (e) {
        console.error("Cloudinary upload error:", e);
        throw e;
    }
}

// ==========================================
// 4. STYLING (CSS INJECTION)
// ==========================================
function injectStyles() {
    const styleId = 'assembly-guide-css-v3';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .ag-container { max-width: 1040px; margin: 0 auto; padding-bottom: 90px; font-family: 'Poppins', sans-serif; }
        .ag-header { margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; }
        .ag-header h2 { color: #1e293b; margin: 0; font-size: 1.5rem; font-weight: 800; }
        .ag-header p { color: #64748b; margin: 5px 0 0; font-size: 0.9rem; }

        .ag-tabs { display: flex; gap: 10px; margin-bottom: 15px; background: #fff; padding: 6px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .tab-btn { flex: 1; border: none; background: transparent; padding: 12px 15px; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 10px; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.9rem; }
        .tab-btn.active { background: #4d97ff; color: white; box-shadow: 0 4px 12px rgba(77, 151, 255, 0.3); }

        .ag-filter-section { margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
        .ag-search-wrapper { position: relative; width: 100%; }
        .ag-search-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .ag-search-wrapper input { width: 100%; padding: 12px 15px 12px 42px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 0.95rem; outline: none; background: white; box-sizing: border-box; }
        .ag-search-wrapper input:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.15); }

        .level-filter-bar { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .level-filter-bar::-webkit-scrollbar { display: none; }
        .level-chip { border: 1px solid #e2e8f0; background: white; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; white-space: nowrap; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
        .level-chip.active { background: #1e293b; color: white; border-color: #1e293b; }

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
        .badge-level-tag { background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .badge-sublevel-tag { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .badge-rpp-pill { background: #f0f5ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 3px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }

        .ag-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .ag-card-title { margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; line-height: 1.3; }
        .ag-card-desc { font-size: 0.84rem; color: #64748b; margin-bottom: 14px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .ag-card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: auto; }
        
        .btn-start-build {
            background: #10b981; color: white; border: none; padding: 10px 16px;
            border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px; transition: 0.2s;
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);
        }
        .btn-start-build:hover { background: #059669; }

        .btn-action-icon {
            background: #f8fafc; border: 1px solid #e2e8f0; width: 36px; height: 36px;
            border-radius: 10px; cursor: pointer; color: #64748b; display: flex;
            align-items: center; justify-content: center; font-size: 0.9rem; transition: 0.2s;
        }
        .btn-action-icon:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }

        /* FAB Button */
        .fab-btn {
            position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px;
            border-radius: 50%; background: #4d97ff; color: white; border: none;
            font-size: 24px; box-shadow: 0 6px 20px rgba(77, 151, 255, 0.4);
            cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s, background 0.2s;
        }
        .fab-btn:hover { transform: scale(1.08); background: #2563eb; }

        /* Modal & Drawer */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); z-index: 1000; display: none; align-items: flex-end; backdrop-filter: blur(3px); }
        .modal-overlay.active { display: flex; animation: fadeIn 0.2s ease-out; }
        .modal-drawer { background: white; width: 100%; max-width: 680px; margin: 0 auto; border-radius: 24px 24px 0 0; padding: 25px; max-height: 92vh; overflow-y: auto; position: relative; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .ag-builder-drawer { max-width: 720px; }
        .ag-viewer-drawer { max-width: 840px; height: 92vh; }
        
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1e293b; }
        .close-btn { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #94a3b8; }
        
        .ag-section-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
        .ag-section-title { margin: 0 0 14px 0; font-size: 0.95rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px; }

        .btn-ag-secondary { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 7px 12px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
        .btn-ag-secondary:hover { background: #dbeafe; }

        #ag-form label { display: block; font-weight: 700; margin-bottom: 6px; color: #334155; font-size: 0.85rem; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        #ag-form input, #ag-form textarea, #ag-form select { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.93rem; font-family: inherit; box-sizing: border-box; outline: none; transition: 0.2s; }
        #ag-form input:focus, #ag-form textarea:focus, #ag-form select:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.15); }

        .btn-primary { width: 100%; padding: 14px; background: #4d97ff; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; margin-top: 20px; transition: 0.2s; box-shadow: 0 4px 12px rgba(77, 151, 255, 0.3); }
        .btn-primary:hover { background: #2563eb; }

        .ag-step-row { background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
        .ag-step-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: 700; color: #1e293b; font-size: 0.9rem; }

        .ag-viewer-body-content { display: flex; flex-direction: column; align-items: center; text-align: center; height: 100%; }
        .ag-step-image-box { width: 100%; max-height: 48vh; background: #0f172a; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .ag-step-image-box img { max-width: 100%; max-height: 48vh; object-fit: contain; }
        .ag-step-text-box { width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; text-align: left; }
        .ag-step-text-box h4 { margin: 0 0 6px 0; font-size: 1rem; color: #0f172a; font-weight: 800; }
        .ag-step-text-box p { margin: 0; color: #334155; font-size: 0.92rem; line-height: 1.6; }

        .ag-viewer-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 14px; }
        .btn-ag-nav { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-ag-nav.primary { background: #10b981; color: white; border-color: #10b981; }
        .btn-ag-nav:disabled { opacity: 0.4; cursor: not-allowed; }

        .ag-dots-bar { display: flex; gap: 6px; overflow-x: auto; max-width: 260px; scrollbar-width: none; }
        .ag-dot { width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; cursor: pointer; flex-shrink: 0; transition: 0.2s; }
        .ag-dot.active { background: #10b981; transform: scale(1.3); }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 5. LOAD CATALOG DATA
// ==========================================
async function loadCatalogData() {
    const search = document.getElementById("globalSearchAssembly").value.toLowerCase();
    const catalogContainer = document.getElementById("assembly-catalog-list");
    const loading = document.getElementById("loading-state-ag");

    loading.style.display = 'block';
    catalogContainer.innerHTML = '';

    await fetchData();

    const list = currentCategory === 'private' ? materiListPrivate : materiListSekolah;

    let filtered = list.filter(m => {
        if (selectedLevelId !== "all" && m.level_id !== selectedLevelId) return false;
        const title = (m.title || m.judul || '').toLowerCase();
        const desc = (m.description || m.deskripsi || '').toLowerCase();
        return title.includes(search) || desc.includes(search);
    });

    loading.style.display = 'none';

    if (!filtered.length) {
        catalogContainer.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8; background:white; border-radius:16px; border:2px dashed #e2e8f0;">
                <i class="fas fa-robot" style="font-size:2.5rem; margin-bottom:10px; color:#cbd5e1;"></i>
                <p style="margin:0; font-weight:700;">Belum ada materi/robot untuk kategori ${currentCategory === 'private' ? 'Private' : 'Sekolah'} pada filter ini.</p>
                <p style="margin:5px 0 0 0; font-size:0.85rem;">Klik tombol <strong>+</strong> di kanan bawah untuk menginput petunjuk perakitan.</p>
            </div>`;
        return;
    }

    catalogContainer.innerHTML = filtered.map(m => {
        const steps = parseMateriSteps(m);
        const title = m.title || m.judul || '(Tanpa Judul)';
        const desc = m.description || m.deskripsi || 'Tidak ada deskripsi singkat.';
        const coverImg = m.image_url || (steps.length && steps[0].image_url) || null;
        const subLevelName = m.sub_level_id ? (subLevelsList.find(s => s.id === m.sub_level_id)?.name || '') : '';
        const levelKode = levelsList.find(l => l.id === m.level_id)?.kode || 'Umum';

        return `
            <div class="ag-card" data-id="${m.id}">
                <div class="ag-card-thumb">
                    ${coverImg 
                        ? `<img src="${coverImg}" alt="${title}" loading="lazy">` 
                        : `<i class="fas fa-robot"></i>`
                    }
                    <div class="ag-card-badge-top">
                        <span class="badge-level-tag"><i class="fas fa-layer-group"></i> ${levelKode}</span>
                        ${subLevelName ? `<span class="badge-sublevel-tag"><i class="fas fa-tag"></i> ${subLevelName}</span>` : ''}
                    </div>
                </div>
                <div class="ag-card-body">
                    <div>
                        <h3 class="ag-card-title">${title}</h3>
                        <p class="ag-card-desc">${desc}</p>
                    </div>
                    <div class="ag-card-footer">
                        <span class="badge-rpp-pill"><i class="fas fa-list-ol"></i> ${steps.length} Step Perakitan</span>
                        <div style="display:flex; gap:6px;">
                            <button class="btn-start-build" data-action="view-slider" data-id="${m.id}">
                                <i class="fas fa-play"></i> Rakit
                            </button>
                            <button class="btn-action-icon btn-edit-trigger" data-action="edit" data-id="${m.id}" title="Edit Petunjuk Perakitan">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn-action-icon btn-delete-assembly" data-action="delete" data-id="${m.id}" title="Hapus Petunjuk Perakitan">
                                <i class="fas fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================
// 6. STEP BUILDER DRAWER FORM
// ==========================================
async function injectFormFields(mode = "add", materiId = null) {
    editingMateriId = materiId;
    document.getElementById("ag-modal-title").innerText = `${mode === "edit" ? "Edit" : "Input"} Petunjuk Perakitan Robot`;

    const formCategory = document.getElementById("ag_form_category");
    const formLevel = document.getElementById("ag_form_level_id");
    const formSub = document.getElementById("ag_form_sub_level_id");
    const formMateri = document.getElementById("ag_form_materi_id");

    let currentMateri = null;
    if (materiId) {
        const list = currentCategory === 'private' ? materiListPrivate : materiListSekolah;
        currentMateri = list.find(m => m.id === materiId);
    }

    const cat = currentCategory;
    const lvlId = currentMateri ? currentMateri.level_id : "";
    const subLvlId = currentMateri ? currentMateri.sub_level_id : "";

    formCategory.value = cat;
    formLevel.value = lvlId;
    formSub.innerHTML = renderSubOptions(lvlId, subLvlId);
    formMateri.innerHTML = renderMateriOptions(cat, lvlId, subLvlId, materiId);

    formCategory.onchange = () => {
        formMateri.innerHTML = renderMateriOptions(formCategory.value, formLevel.value, formSub.value, null);
    };

    formLevel.onchange = (e) => {
        const newLvl = e.target.value;
        formSub.innerHTML = renderSubOptions(newLvl, null);
        formMateri.innerHTML = renderMateriOptions(formCategory.value, newLvl, formSub.value, null);
    };

    formSub.onchange = (e) => {
        formMateri.innerHTML = renderMateriOptions(formCategory.value, formLevel.value, e.target.value, null);
    };

    const stepsContainer = document.getElementById("ag-steps-container");
    stepsContainer.innerHTML = "";

    const steps = currentMateri ? parseMateriSteps(currentMateri) : [];
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
            <div style="width:110px; text-align:center;">
                <img class="img-preview-step" src="${previewImg}" style="width:100%; height:80px; object-fit:cover; border-radius:10px; border:1px solid #cbd5e1;">
                <button type="button" class="btn-ag-secondary btn-upload-step-img" style="width:100%; margin-top:6px; font-size:0.75rem; padding:4px;">
                    <i class="fas fa-camera"></i> Foto Step
                </button>
                <input type="hidden" class="step-image-url" value="${imgUrl}">
            </div>
            <div style="flex:1; min-width:200px;">
                <input type="text" class="step-title-input" value="${st.title || `Langkah ${stepIdx}`}" placeholder="Judul langkah (misal: Pasang Motor DC)" style="margin-bottom:6px;">
                <textarea class="step-instruction-input" rows="2" placeholder="Teks instruksi perakitan singkat...">${st.instruction_text || ""}</textarea>
            </div>
        </div>
    `;

    // Handler Upload Foto Step dengan Kompresi Otomatis
    row.querySelector('.btn-upload-step-img').onclick = () => {
        openImageCropper('robotic_assembly', async (urlOrBlob) => {
            try {
                row.querySelector('.btn-upload-step-img').innerText = "Compressing...";
                const secureUrl = await uploadCompressedToCloudinary(urlOrBlob, 'robotic_assembly');
                row.querySelector('.step-image-url').value = secureUrl;
                row.querySelector('.img-preview-step').src = secureUrl;
                row.querySelector('.btn-upload-step-img').innerHTML = `<i class="fas fa-check"></i> Tersimpan`;
            } catch (err) {
                alert("Gagal mengompres/upload foto: " + err.message);
                row.querySelector('.btn-upload-step-img').innerHTML = `<i class="fas fa-camera"></i> Coba Lagi`;
            }
        });
    };

    row.querySelector('.btn-remove-step').onclick = () => {
        row.remove();
        reindexStepNumbers();
    };

    row.querySelectorAll('.btn-move-step').forEach(b => {
        b.onclick = () => {
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
// 7. INTERACTIVE STEP SLIDER VIEWER
// ==========================================
function openSliderViewer(materiId) {
    const list = currentCategory === 'private' ? materiListPrivate : materiListSekolah;
    const m = list.find(item => item.id === materiId);
    if (!m) return;

    currentViewingItem = m;
    currentViewingSteps = parseMateriSteps(m);
    currentStepIndex = 0;

    const title = m.title || m.judul || 'Assembly Guide';
    document.getElementById("viewer-robot-title").innerText = title;
    renderSliderStep();

    document.getElementById("modal-ag-viewer").classList.add("active");
}

function renderSliderStep() {
    const steps = currentViewingSteps;
    const container = document.getElementById("viewer-slider-body");

    if (!steps || !steps.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#94a3b8;">
                <i class="fas fa-puzzle-piece fa-3x" style="margin-bottom:12px; color:#cbd5e1;"></i>
                <p>Belum ada langkah perakitan untuk robot ini.</p>
            </div>`;
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
// 8. EVENT HANDLERS & RBAC DELETION LOGIC
// ==========================================
function setupEventListeners() {
    document.getElementById("btnCatSekolah").onclick = () => switchCategory('sekolah');
    document.getElementById("btnCatPrivate").onclick = () => switchCategory('private');

    document.getElementById("globalSearchAssembly").oninput = loadCatalogData;

    const chipContainer = document.getElementById("level-filter-bar-ag");
    chipContainer.onclick = (e) => {
        const chip = e.target.closest('.level-chip');
        if (!chip) return;
        chipContainer.querySelectorAll('.level-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedLevelId = chip.dataset.level;
        loadCatalogData();
    };

    document.getElementById("btn-add-step-row").onclick = () => addStepRow();

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

    document.getElementById("ag-form").onsubmit = handleFormSubmit;

    document.getElementById("assembly-catalog-list").onclick = async (e) => {
        const btnSlider = e.target.closest('[data-action="view-slider"]');
        if (btnSlider) {
            openSliderViewer(btnSlider.dataset.id);
            return;
        }

        const btnEdit = e.target.closest('[data-action="edit"]');
        if (btnEdit) {
            await injectFormFields("edit", btnEdit.dataset.id);
            document.getElementById("modal-ag-builder").classList.add("active");
            return;
        }

        const btnDelete = e.target.closest('[data-action="delete"]');
        if (btnDelete) {
            deleteAssemblyGuide(btnDelete.dataset.id);
        }
    };
}

function switchCategory(cat) {
    currentCategory = cat;
    document.getElementById("btnCatSekolah").className = cat === 'sekolah' ? 'tab-btn active' : 'tab-btn';
    document.getElementById("btnCatPrivate").className = cat === 'private' ? 'tab-btn active' : 'tab-btn';
    loadCatalogData();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const cat = document.getElementById("ag_form_category").value;
    const targetMateriId = document.getElementById("ag_form_materi_id").value;

    if (!targetMateriId) {
        alert("Pilih Materi / Topik Robot terlebih dahulu.");
        return;
    }

    const stepRows = Array.from(document.querySelectorAll(".ag-step-row"));
    const stepsPayload = stepRows.map((row, idx) => ({
        step_number: idx + 1,
        title: row.querySelector('.step-title-input').value.trim() || `Langkah ${idx + 1}`,
        image_url: row.querySelector('.step-image-url').value || null,
        instruction_text: row.querySelector('.step-instruction-input').value.trim() || ''
    }));

    const tableName = cat === 'private' ? 'materi_private' : 'materi';
    const fkCol = cat === 'private' ? 'materi_private_id' : 'materi_id';

    try {
        try {
            // Gunakan tabel 'assembly_guides' (nama tabel aktual di DB)
            // Hapus entri lama lalu insert baru
            await supabase.from('assembly_guides').delete().eq(fkCol, targetMateriId);
            const fullSteps = stepsPayload.map(s => ({
                [fkCol]: targetMateriId,
                title: s.title,
                description: s.instruction_text  // kolom 'description' di DB = instruction_text di UI
            }));
            if (fullSteps.length > 0) {
                await supabase.from('assembly_guides').insert(fullSteps);
            }
        } catch (sErr) {
            console.warn("Tabel assembly_guides error, menyimpan via JSON detail:", sErr);
        }

        const list = cat === 'private' ? materiListPrivate : materiListSekolah;
        const targetMateri = list.find(m => m.id === targetMateriId);
        if (targetMateri) {
            let detailObj = {};
            if (targetMateri.detail && targetMateri.detail.startsWith('{') && targetMateri.detail.endsWith('}')) {
                try { detailObj = JSON.parse(targetMateri.detail); } catch (pErr) {}
            }
            detailObj.is_rpp = true;
            detailObj.assembly_steps = stepsPayload;

            await supabase.from(tableName).update({ detail: JSON.stringify(detailObj) }).eq('id', targetMateriId);
        }

        document.getElementById("modal-ag-builder").classList.remove("active");
        await loadCatalogData();
    } catch (err) {
        alert("Gagal menyimpan Petunjuk Perakitan: " + err.message);
    }
}

// RBAC DELETION LOGIC: Soft Delete for Teacher, Hard/Soft Delete for Super Admin
async function deleteAssemblyGuide(materiId) {
    const tableName = currentCategory === 'private' ? 'materi_private' : 'materi';
    const fkCol = currentCategory === 'private' ? 'materi_private_id' : 'materi_id';

    if (userRole === 'super_admin') {
        const action = confirm(
            "Mode Super Admin:\n\nKlik 'OK' untuk Soft Delete (Disembunyikan)\nKlik 'Cancel' jika ingin Hard Delete Permanen dari Database."
        );
        if (action) {
            // Soft Delete
            await supabase.from(tableName).update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: currentUserProfile?.id || null
            }).eq('id', materiId);
            alert("Petunjuk perakitan telah disembunyikan (Soft Delete).");
        } else {
            // Hard Delete
            if (confirm("PERINGATAN: Apakah Anda yakin ingin melakukan HARD DELETE PERMANEN dari database?")) {
                try {
                    await supabase.from('assembly_guides').delete().eq(fkCol, materiId);
                } catch (e) {}
                await supabase.from(tableName).delete().eq('id', materiId);
                alert("Petunjuk perakitan & materi berhasil dihapus permanen.");
            }
        }
    } else {
        // Teacher Role -> Always Soft Delete
        if (!confirm("Apakah Anda yakin ingin menyembunyikan petunjuk perakitan ini? (Soft Delete)")) return;

        try {
            await supabase.from(tableName).update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: currentUserProfile?.id || null
            }).eq('id', materiId);
            alert("Petunjuk perakitan berhasil disembunyikan (Soft Delete).");
        } catch (err) {
            alert("Gagal menyembunyikan: " + err.message);
        }
    }

    await loadCatalogData();
}
