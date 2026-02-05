/**
 * Project: Guru & Materi Module (SPA)
 * Description: Manajemen Materi & Achievement Sekolah dengan Cloudinary Support.
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
    // 1. Load Cloudinary Script jika belum ada
    await loadCloudinaryScript();

    // 2. Inject CSS (Ke Head agar permanen)
    injectStyles();

    // 3. Render HTML Structure
    canvas.innerHTML = `
        <div class="gm-container">
            <div class="gm-header">
                <div>
                    <h2>Kurikulum & Achievement</h2>
                    <p>Kelola materi pembelajaran dan target pencapaian siswa.</p>
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

    // 4. Setup Logic
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
        /* Container */
        .gm-container { max-width: 1000px; margin: 0 auto; padding-bottom: 80px; font-family: 'Roboto', sans-serif; }
        
        /* Header */
        .gm-header { margin-bottom: 20px; }
        .gm-header h2 { font-family: 'Fredoka One', cursive; color: #333; margin: 0; font-size: 1.8rem; }
        .gm-header p { color: #666; margin: 5px 0 0; font-size: 0.9rem; }

        /* Tabs */
        .gm-tabs { display: flex; gap: 10px; margin-bottom: 20px; background: #fff; padding: 5px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .tab-btn { flex: 1; border: none; background: transparent; padding: 12px; font-weight: bold; color: #888; cursor: pointer; border-radius: 8px; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .tab-btn.active { background: #4d97ff; color: white; box-shadow: 0 4px 10px rgba(77, 151, 255, 0.3); }

        /* Search */
        .gm-search-wrapper { position: relative; margin-bottom: 20px; }
        .gm-search-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #aaa; }
        .gm-search-wrapper input { width: 100%; padding: 12px 12px 12px 40px; border: 1px solid #ddd; border-radius: 10px; font-size: 1rem; outline: none; transition: 0.3s; }
        .gm-search-wrapper input:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77,151,255,0.1); }

        /* Content List */
        .content-list { display: flex; flex-direction: column; gap: 12px; }
        
        /* Card Item (Materi) */
        .compact-item { background: white; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; border-left: 5px solid #4d97ff; }
        .compact-item:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .item-info { display: flex; align-items: center; gap: 15px; }
        .item-info i { font-size: 1.5rem; color: #4d97ff; background: #eff6ff; padding: 10px; border-radius: 8px; }
        .item-title b { font-size: 1rem; color: #333; }

        /* Folder Item (Achievement) */
        .achievement-folder { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); cursor: pointer; border-left: 5px solid #ffab19; transition: 0.2s; }
        .achievement-folder:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .folder-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .ach-title { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: #2c3e50; font-size: 1.1rem; }
        .ach-list { margin: 0; padding-left: 25px; color: #666; font-size: 0.9rem; line-height: 1.6; }

        /* FAB Button */
        .fab-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: #ffab19; color: white; border: none; font-size: 24px; box-shadow: 0 4px 15px rgba(255, 171, 25, 0.4); cursor: pointer; z-index: 100; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
        .fab-btn:hover { transform: scale(1.1); background: #ffa000; }

        /* Buttons */
        .btn-minimal { background: none; border: none; cursor: pointer; font-size: 1.1rem; color: #cbd5e1; padding: 5px; transition: 0.2s; }
        .btn-minimal:hover { color: #ef4444; }
        .btn-primary { width: 100%; padding: 12px; background: #4d97ff; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; }
        .btn-primary:hover { background: #2563eb; }

        /* Modal Drawer */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: none; align-items: flex-end; backdrop-filter: blur(2px); }
        .modal-overlay.active { display: flex; animation: fadeIn 0.3s; }
        .modal-drawer { background: white; width: 100%; max-width: 600px; margin: 0 auto; border-radius: 20px 20px 0 0; padding: 25px; max-height: 85vh; overflow-y: auto; animation: slideUp 0.3s; position: relative; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .close-btn { background: none; border: none; font-size: 2rem; cursor: pointer; color: #999; }
        
        /* Form Elements */
        #form-fields label { display: block; font-weight: bold; margin-bottom: 8px; color: #444; font-size: 0.9rem; margin-top: 15px; }
        #form-fields input, #form-fields textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; }
        #form-fields textarea { height: 100px; resize: vertical; }
        
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
            const { data, error } = await supabase.from('materi').select('*').order('created_at', { ascending: false });
            loading.style.display = 'none';
            if (error) throw error;

            const filtered = data ? data.filter(m => m.title?.toLowerCase().includes(search)) : [];
            
            if(filtered.length === 0) {
                containerMateri.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Tidak ada materi.</div>';
                return;
            }

            containerMateri.innerHTML = filtered.map(m => `
                <div class="compact-item item-card" data-id="${m.id}" data-type="materi">
                    <div class="item-info">
                        <i class="fas fa-book"></i>
                        <span class="item-title"><b>${m.title}</b></span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-minimal btn-delete" data-id="${m.id}" data-type="materi">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                </div>`).join("");

        } else {
            const { data, error } = await supabase.from('achievement_sekolah').select('*').order('created_at', { ascending: false });
            loading.style.display = 'none';
            if (error) throw error;

            const filtered = data ? data.filter(a => a.main_achievement?.toLowerCase().includes(search)) : [];
            
            if(filtered.length === 0) {
                containerAchieve.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Tidak ada achievement.</div>';
                return;
            }

            containerAchieve.innerHTML = filtered.map(a => {
                const subList = (a.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
                return `
                <div class="achievement-folder item-card" data-id="${a.id}" data-type="achievement">
                    <div class="folder-header">
                        <div style="flex:1;">
                            <div class="ach-title">
                                <i class="fas fa-trophy" style="color: #f1c40f; font-size:1.2rem;"></i> 
                                <b>${a.main_achievement}</b>
                            </div>
                            <ul class="ach-list">
                                ${subList.map(s => `<li>${s}</li>`).join("") || "<li>-</li>"}
                            </ul>
                        </div>
                        <div class="folder-actions">
                            <button class="btn-minimal btn-delete" data-id="${a.id}" data-type="achievement_sekolah">
                                <i class="fas fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join("");
        }
    } catch (err) {
        console.error("Load Error:", err);
        loading.innerHTML = `<span style="color:red;">Gagal memuat data: ${err.message}</span>`;
    }
}

// ==========================================
// 4. FORM HANDLING
// ==========================================

async function injectFormFields(mode = "add", data = {}) {
    const formFields = document.getElementById("form-fields");
    document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} Data`;

    if (currentTab === "materi") {
        const currentImg = data.image_url || "https://via.placeholder.com/150?text=No+Image";
        formFields.innerHTML = `
            <label>Judul Materi</label>
            <input type="text" id="title" value="${data.title || ""}" required>
            
            <label>Foto Project</label>
            <div style="margin-bottom: 20px;">
                <button type="button" id="btn-upload-p" style="background:#3498db; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fas fa-camera"></i> Upload Foto
                </button>
                <input type="hidden" id="image_url" value="${data.image_url || ""}">
                <div style="text-align:center;">
                    <img id="img-preview-p" src="${currentImg}" style="width:100%; max-height:180px; object-fit:cover; border-radius:12px; border:2px solid #eee;">
                </div>
            </div>
            
            <label>Deskripsi Singkat</label>
            <textarea id="description">${data.description || ""}</textarea>
            
            <label>Detail Lengkap (Kurikulum)</label>
            <textarea id="detail" style="height:150px;">${data.detail || ""}</textarea>
        `;

        // Bind Upload Button
        setTimeout(() => {
            const btn = document.getElementById("btn-upload-p");
            if (btn) btn.onclick = () => openUploadWidget(url => {
                document.getElementById("image_url").value = url;
                document.getElementById("img-preview-p").src = url;
            });
        }, 100);

    } else {
        // Form Achievement
        formFields.innerHTML = `
            <label>Topik Utama (Main Achievement)</label>
            <input type="text" id="main_achievement" value="${data.main_achievement || ""}" placeholder="Contoh: Robotika Dasar" required>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; margin-bottom:10px;">
                <label style="margin:0;">Detail Target (Sub Achievements)</label>
                <button type="button" id="btn-add-sub" style="background:#55efc4; color:#006266; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:bold;">
                    <i class="fas fa-plus"></i> Tambah Baris
                </button>
            </div>
            
            <div id="sub-ach-container"></div>
        `;

        // Populate Sub Rows
        const existingSubs = (data.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
        if (existingSubs.length > 0) existingSubs.forEach(val => addSubRow(val));
        else addSubRow();

        document.getElementById("btn-add-sub").onclick = () => addSubRow();
    }
}

function addSubRow(value = "") {
    const container = document.getElementById("sub-ach-container");
    const row = document.createElement("div");
    row.style = "display:flex; gap:8px; margin-bottom:8px;";
    row.innerHTML = `
        <input type="text" class="sub-input" value="${value}" placeholder="Masukkan detail target..." style="flex:1;">
        <button type="button" class="btn-remove" style="background:#ff7675; color:white; border:none; border-radius:8px; width:40px; cursor:pointer;">&times;</button>
    `;
    row.querySelector('.btn-remove').onclick = () => row.remove();
    container.appendChild(row);
}

// ==========================================
// 5. CLOUDINARY WIDGET
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
    if (!window.cloudinary) return alert("Widget Cloudinary belum siap. Coba refresh.");
    if (!cloudinaryConfig || !cloudinaryConfig.cloudName) return alert("Config Cloudinary Kosong!");

    window.cloudinary.openUploadWidget({
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset,
        folder: "robotic_school",
        sources: ["local", "camera"],
        multiple: false,
        cropping: true,
        croppingAspectRatio: 0.75,
        showSkipCropButton: false
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            const url = result.info.secure_url; // Gunakan URL aman
            callback(url);
        }
    });
}

// ==========================================
// 6. EVENT HANDLERS
// ==========================================

function setupEventListeners() {
    // Tab Switch
    const btnMateri = document.getElementById("btnMateri");
    const btnAchieve = document.getElementById("btnAchievement");
    
    btnMateri.onclick = () => switchTab('materi');
    btnAchieve.onclick = () => switchTab('achievement');

    // Search
    document.getElementById("globalSearch").oninput = loadData;

    // FAB Add
    document.getElementById("fab-add").onclick = async () => {
        editingId = null;
        await injectFormFields("add");
        document.getElementById("modal-overlay").classList.add("active");
    };

    // Close Modal
    document.getElementById("modal-close").onclick = () => {
        document.getElementById("modal-overlay").classList.remove("active");
    };

    // Form Submit
    document.getElementById("dynamic-form").onsubmit = handleFormSubmit;

    // Event Delegation untuk Edit/Delete (Karena item dynamic)
    const contentArea = document.getElementById("main-content-area");
    contentArea.onclick = (e) => {
        // Cek Tombol Delete
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            e.stopPropagation();
            deleteData(btnDelete.dataset.type, btnDelete.dataset.id);
            return;
        }

        // Cek Klik Card (Edit)
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

    // Ambil semua input biasa
    e.target.querySelectorAll("input:not(.sub-input), select, textarea").forEach(el => {
        if (el.id) payload[el.id] = el.value;
    });

    // Khusus Achievement (Gabung Sub Input)
    if (currentTab === "achievement") {
        const subInputs = Array.from(document.querySelectorAll(".sub-input"));
        payload.sub_achievement = subInputs
            .map(input => input.value.trim())
            .filter(val => val !== "")
            .join('\n');
    }

    try {
        const { error } = editingId 
            ? await supabase.from(tableMap[currentTab]).update(payload).eq('id', editingId)
            : await supabase.from(tableMap[currentTab]).insert([payload]);

        if (error) throw error;

        document.getElementById("modal-overlay").classList.remove("active");
        loadData();
    } catch (err) {
        alert("Gagal simpan: " + err.message);
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
    // Mapping nama tabel jika diperlukan (achievement vs achievement_sekolah)
    const realTable = tableType === 'achievement' ? 'achievement_sekolah' : tableType;
    
    if(!confirm("Yakin ingin menghapus data ini?")) return;
    
    const { error } = await supabase.from(realTable).delete().eq('id', id);
    if (!error) loadData();
    else alert("Gagal hapus: " + error.message);
}