/**
 * Project: Guru & Materi Module (School)
 * Version: 2.0 - Fixed Cloudinary Cropping Logic
 * Format: Plain Text (Huawei T10s Optimization)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey, cloudinaryConfig } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State
let currentTab = "materi"; 
let editingId = null;

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Load Cloudinary Script (Async Parity)
    await loadCloudinaryScript();

    // 2. Inject CSS
    injectStyles();

    // 3. Render HTML Structure
    canvas.innerHTML = `
        <div class="gm-container">
            <div class="gm-header">
                <div>
                    <h2>Kurikulum & Achievement</h2>
                    <p>Kelola materi sekolah dengan dukungan Crop Foto.</p>
                </div>
            </div>

            <div class="gm-tabs">
                <button id="btnMateri" class="tab-btn active" data-tab="materi">
                    <i class="fas fa-book"></i> MATERI
                </button>
                <button id="btnAchievement" class="tab-btn" data-tab="achievement">
                    <i class="fas fa-trophy"></i> ACHIEVEMENT
                </button>
            </div>

            <div class="gm-search-wrapper">
                <i class="fas fa-search"></i>
                <input type="text" id="globalSearch" placeholder="Cari materi atau achievement...">
            </div>

            <div id="main-content-area" class="gm-content">
                <div id="loading-state" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-circle-notch fa-spin"></i> Memuat data...
                </div>
                <div id="materi-list" class="content-list active"></div>
                <div id="achievement-list" class="content-list" style="display:none;"></div>
            </div>
        </div>

        <button id="fab-add" class="fab-btn" title="Tambah Data Baru">
            <i class="fas fa-plus"></i>
        </button>

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
    loadData();
}

// ==========================================
// 2. STYLING (CSS INJECTION)
// ==========================================
function injectStyles() {
    const styleId = 'guru-materi-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .gm-container { max-width: 1000px; margin: 0 auto; padding-bottom: 80px; font-family: sans-serif; }
        .gm-header { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .gm-header h2 { color: #333; margin: 0; font-size: 1.6rem; }
        .gm-header p { color: #666; margin: 5px 0 0; font-size: 0.9rem; }
        .gm-tabs { display: flex; gap: 10px; margin-bottom: 20px; background: #fff; padding: 5px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .tab-btn { flex: 1; border: none; background: transparent; padding: 12px; font-weight: bold; color: #888; cursor: pointer; border-radius: 8px; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .tab-btn.active { background: #4d97ff; color: white; box-shadow: 0 4px 10px rgba(77, 151, 255, 0.3); }
        .gm-search-wrapper { position: relative; margin-bottom: 20px; }
        .gm-search-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #aaa; }
        .gm-search-wrapper input { width: 100%; padding: 12px 12px 12px 40px; border: 1px solid #ddd; border-radius: 10px; font-size: 1rem; outline: none; }
        .content-list { display: flex; flex-direction: column; gap: 12px; }
        .compact-item { background: white; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); cursor: pointer; border-left: 5px solid #4d97ff; }
        .achievement-folder { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 5px solid #ffab19; cursor: pointer; }
        .ach-title { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: #2c3e50; font-size: 1.1rem; }
        .ach-list { margin: 0; padding-left: 25px; color: #666; font-size: 0.9rem; line-height: 1.6; }
        .fab-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: #ffab19; color: white; border: none; font-size: 24px; box-shadow: 0 4px 15px rgba(255, 171, 25, 0.4); cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center; }
        .btn-minimal { background: none; border: none; cursor: pointer; font-size: 1.1rem; color: #cbd5e1; padding: 5px; }
        .btn-minimal:hover { color: #ef4444; }
        .btn-primary { width: 100%; padding: 12px; background: #4d97ff; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: none; align-items: flex-end; }
        .modal-overlay.active { display: flex; }
        .modal-drawer { background: white; width: 100%; max-width: 600px; margin: 0 auto; border-radius: 20px 20px 0 0; padding: 25px; max-height: 85vh; overflow-y: auto; position: relative; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .close-btn { background: none; border: none; font-size: 2rem; cursor: pointer; color: #999; }
        #form-fields label { display: block; font-weight: bold; margin-bottom: 8px; color: #444; font-size: 0.9rem; margin-top: 15px; }
        #form-fields input, #form-fields textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC & DATA
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
            const { data } = await supabase.from('materi').select('*').order('created_at', { ascending: false });
            loading.style.display = 'none';
            const filtered = data ? data.filter(m => m.title?.toLowerCase().includes(search)) : [];
            
            containerMateri.innerHTML = filtered.length ? filtered.map(m => `
                <div class="compact-item item-card" data-id="${m.id}" data-type="materi">
                    <div class="item-info"><i class="fas fa-book"></i> <span class="item-title"><b>${m.title}</b></span></div>
                    <button class="btn-minimal btn-delete" data-id="${m.id}" data-type="materi"><i class="fas fa-trash-can"></i></button>
                </div>`).join("") : '<div style="text-align:center; padding:20px; color:#aaa;">Kosong.</div>';

        } else {
            const { data } = await supabase.from('achievement_sekolah').select('*').order('created_at', { ascending: false });
            loading.style.display = 'none';
            const filtered = data ? data.filter(a => a.main_achievement?.toLowerCase().includes(search)) : [];
            
            containerAchieve.innerHTML = filtered.length ? filtered.map(a => {
                const subList = (a.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
                return `
                <div class="achievement-folder item-card" data-id="${a.id}" data-type="achievement">
                    <div class="folder-header" style="display:flex; justify-content:space-between;">
                        <div style="flex:1;">
                            <div class="ach-title"><i class="fas fa-trophy" style="color: #f1c40f;"></i> <b>${a.main_achievement}</b></div>
                            <ul class="ach-list">${subList.map(s => `<li>${s}</li>`).join("") || "<li>-</li>"}</ul>
                        </div>
                        <button class="btn-minimal btn-delete" data-id="${a.id}" data-type="achievement_sekolah"><i class="fas fa-trash-can"></i></button>
                    </div>
                </div>`;
            }).join("") : '<div style="text-align:center; padding:20px; color:#aaa;">Kosong.</div>';
        }
    } catch (err) { loading.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`; }
}

// ==========================================
// 4. FORM HANDLING (FIXED CROP LOGIC)
// ==========================================

async function injectFormFields(mode = "add", data = {}) {
    const formFields = document.getElementById("form-fields");
    document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} Data`;

    if (currentTab === "materi") {
        const currentImg = data.image_url || "https://via.placeholder.com/150?text=No+Image";
        formFields.innerHTML = `
            <label>Judul Materi</label>
            <input type="text" id="title" value="${data.title || ""}" required>
            
            <label>Foto Project (Support Crop)</label>
            <div style="margin-bottom: 20px;">
                <button type="button" id="btn-upload-p" style="background:#4d97ff; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fas fa-camera"></i> Ambil & Potong Foto
                </button>
                <input type="hidden" id="image_url" value="${data.image_url || ""}">
                <div style="text-align:center;">
                    <img id="img-preview-p" src="${currentImg}" style="width:100%; max-height:200px; object-fit:cover; border-radius:12px; border:2px solid #eee;">
                </div>
            </div>
            
            <label>Deskripsi Singkat</label><textarea id="description">${data.description || ""}</textarea>
            <label>Detail Lengkap</label><textarea id="detail" style="height:120px;">${data.detail || ""}</textarea>
        `;

        // Bind Upload Button (Parity with Private Module)
        setTimeout(() => {
            const btn = document.getElementById("btn-upload-p");
            if (btn) btn.onclick = () => openUploadWidget(url => {
                document.getElementById("image_url").value = url;
                document.getElementById("img-preview-p").src = url;
            });
        }, 100);

    } else {
        formFields.innerHTML = `
            <label>Topik Utama</label><input type="text" id="main_achievement" value="${data.main_achievement || ""}" required>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
                <label>Detail Target</label>
                <button type="button" id="btn-add-sub" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.75rem;">+ Baris</button>
            </div>
            <div id="sub-ach-container"></div>
        `;

        const existingSubs = (data.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
        if (existingSubs.length > 0) existingSubs.forEach(val => addSubRow(val));
        else addSubRow();
        document.getElementById("btn-add-sub").onclick = () => addSubRow();
    }
}

function addSubRow(value = "") {
    const container = document.getElementById("sub-ach-container");
    const row = document.createElement("div");
    row.style = "display:flex; gap:8px; margin-top:8px;";
    row.innerHTML = `<input type="text" class="sub-input" value="${value}" style="flex:1;"><button type="button" class="btn-remove" style="background:#ef4444; color:white; border:none; border-radius:8px; width:35px; cursor:pointer;">&times;</button>`;
    row.querySelector('.btn-remove').onclick = () => row.remove();
    container.appendChild(row);
}

// ==========================================
// 5. CLOUDINARY WIDGET (SINKRON MATERI-PRIVATE)
// ==========================================

function loadCloudinaryScript() {
    return new Promise((resolve) => {
        if (window.cloudinary) return resolve();
        const script = document.createElement('script');
        script.src = 'https://upload-widget.cloudinary.com/global/all.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

function openUploadWidget(callback) {
    if (!window.cloudinary) return alert("Widget Belum Siap.");
    
    // Konfigurasi Crop Aktif (Sesuai Materi-Private)
    window.cloudinary.openUploadWidget({
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset,
        folder: "robotic_school",
        sources: ["local", "camera"],
        multiple: false,
        cropping: true,
        croppingAspectRatio: 0.75, // 3:4 ratio
        showSkipCropButton: false
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            callback(result.info.secure_url);
        }
    });
}

// ==========================================
// 6. EVENT HANDLERS
// ==========================================

function setupEventListeners() {
    document.getElementById("btnMateri").onclick = () => switchTab('materi');
    document.getElementById("btnAchievement").onclick = () => switchTab('achievement');
    document.getElementById("globalSearch").oninput = loadData;
    document.getElementById("fab-add").onclick = async () => {
        editingId = null;
        await injectFormFields("add");
        document.getElementById("modal-overlay").classList.add("active");
    };
    document.getElementById("modal-close").onclick = () => document.getElementById("modal-overlay").classList.remove("active");
    document.getElementById("dynamic-form").onsubmit = handleFormSubmit;

    document.getElementById("main-content-area").onclick = (e) => {
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) { e.stopPropagation(); deleteData(btnDelete.dataset.type, btnDelete.dataset.id); return; }
        const card = e.target.closest('.item-card');
        if (card) openEdit(card.dataset.type, card.dataset.id);
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
    e.target.querySelectorAll("input:not(.sub-input), select, textarea").forEach(el => { if (el.id) payload[el.id] = el.value; });

    if (currentTab === "achievement") {
        const subInputs = Array.from(document.querySelectorAll(".sub-input"));
        payload.sub_achievement = subInputs.map(i => i.value.trim()).filter(v => v !== "").join('\n');
    }

    try {
        const { error } = editingId ? await supabase.from(tableMap[currentTab]).update(payload).eq('id', editingId) : await supabase.from(tableMap[currentTab]).insert([payload]);
        if (error) throw error;
        document.getElementById("modal-overlay").classList.remove("active");
        loadData();
    } catch (err) { alert("Error: " + err.message); }
}

async function openEdit(type, id) {
    const table = type === 'materi' ? 'materi' : 'achievement_sekolah';
    const { data } = await supabase.from(table).select('*').eq('id', id).single();
    if (data) { editingId = id; await injectFormFields("edit", data); document.getElementById("modal-overlay").classList.add("active"); }
}

async function deleteData(tableType, id) {
    if(!confirm("Hapus?")) return;
    const { error } = await supabase.from(tableType).delete().eq('id', id);
    if (!error) loadData();
}