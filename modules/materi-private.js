/**
 * Project: Private Master Data (Matrix) Module
 * Description: Manajemen Materi, Achievement, Level, dan Guru untuk Private Class.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey, cloudinaryConfig } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let currentTab = "materi";
let editingId = null;

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Load Cloudinary Library (Async)
    await loadCloudinaryScript();

    // 2. Inject CSS
    injectStyles();

    // 3. Render Skeleton
    canvas.innerHTML = `
        <div class="mp-container">
            
            <div class="mp-header">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="https://res.cloudinary.com/dmm6avtxd/image/upload/Robopanda-Education_zwx0bm.png" 
                         style="height: 50px; width: auto; filter: brightness(0) invert(0.2);">
                    <div>
                        <h2>Master Matrix Private</h2>
                        <p>Curriculum Control Center</p>
                    </div>
                </div>
            </div>

            <div class="mp-tabs">
                <button class="tab-btn active" data-tab="materi"><i class="fas fa-book"></i> MATERI</button>
                <button class="tab-btn" data-tab="achievement"><i class="fas fa-trophy"></i> BANK ACH</button>
                <button class="tab-btn" data-tab="levels"><i class="fas fa-layer-group"></i> LEVELS</button>
                <button class="tab-btn" data-tab="guru"><i class="fas fa-chalkboard-user"></i> GURU</button>
            </div>

            <div class="mp-search-wrapper">
                <i class="fas fa-search"></i>
                <input type="text" id="globalSearch" placeholder="Cari kode level, materi, atau guru...">
            </div>

            <div id="main-content-area" class="mp-content">
                <div id="loading-state" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-circle-notch fa-spin"></i> Memuat data...
                </div>
                <div id="list-container" class="content-grid"></div>
            </div>

        </div>

        <button id="fab-add" class="fab-btn" title="Tambah Data">
            <i class="fas fa-plus"></i>
        </button>

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

    // 4. Setup Logic
    setupEventListeners();
    loadData();
}

// ==========================================
// 2. CSS INJECTION
// ==========================================
function injectStyles() {
    const styleId = 'materi-private-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Container */
        .mp-container { max-width: 1000px; margin: 0 auto; padding-bottom: 80px; font-family: 'Roboto', sans-serif; }
        
        /* Header */
        .mp-header { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
        .mp-header h2 { margin: 0; font-family: 'Fredoka One', cursive; color: #333; font-size: 1.6rem; }
        .mp-header p { margin: 2px 0 0; color: #666; font-size: 0.9rem; }

        /* Tabs */
        .mp-tabs { display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px; }
        .tab-btn { flex: 1; min-width: 100px; border: none; background: #fff; padding: 12px; font-weight: bold; color: #888; cursor: pointer; border-radius: 8px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem; }
        .tab-btn.active { background: #4d97ff; color: white; box-shadow: 0 4px 10px rgba(77, 151, 255, 0.3); transform: translateY(-2px); }
        .tab-btn:hover:not(.active) { background: #f8f9fa; color: #333; }

        /* Search */
        .mp-search-wrapper { position: relative; margin-bottom: 20px; }
        .mp-search-wrapper i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #aaa; }
        .mp-search-wrapper input { width: 100%; padding: 12px 12px 12px 40px; border: 1px solid #ddd; border-radius: 10px; font-size: 1rem; outline: none; transition: 0.3s; }
        .mp-search-wrapper input:focus { border-color: #4d97ff; box-shadow: 0 0 0 3px rgba(77,151,255,0.1); }

        /* Content Lists */
        .content-grid { display: flex; flex-direction: column; gap: 12px; }

        /* Card Item (General) */
        .compact-item { background: white; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; border-left: 5px solid #ccc; }
        .compact-item:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .item-info { display: flex; align-items: center; gap: 15px; }
        .item-icon { font-size: 1.2rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #f0f4f8; border-radius: 8px; color: #555; }
        .item-text b { display: block; font-size: 1rem; color: #333; margin-bottom: 2px; }
        .item-text span { font-size: 0.85rem; color: #666; }

        /* Color Borders based on Tab */
        .border-materi { border-left-color: #2ecc71; }
        .border-guru { border-left-color: #3498db; }
        .border-levels { border-left-color: #9b59b6; }

        /* Achievement Folder Style */
        .achievement-folder { background: white; border-radius: 12px; margin-bottom: 10px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #eee; }
        .folder-header { background: #fffcf0; padding: 12px 15px; border-bottom: 1px solid #f0e6d2; display: flex; align-items: center; gap: 10px; font-weight: bold; color: #d35400; }
        .folder-content { padding: 10px 15px; }
        .target-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f9f9f9; cursor: pointer; }
        .target-item:last-child { border-bottom: none; }
        .target-item:hover .ach-title { color: #4d97ff; }
        .ach-title { font-weight: 600; color: #2c3e50; font-size: 0.95rem; margin-bottom: 5px; display: block; transition: 0.2s; }
        .ach-list { margin: 0; padding-left: 20px; color: #7f8c8d; font-size: 0.85rem; list-style-type: disc; }

        /* FAB & Modal (Shared) */
        .fab-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: #4d97ff; color: white; border: none; font-size: 24px; box-shadow: 0 4px 15px rgba(77, 151, 255, 0.4); cursor: pointer; z-index: 100; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
        .fab-btn:hover { transform: scale(1.1); background: #2563eb; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: none; align-items: flex-end; backdrop-filter: blur(2px); }
        .modal-overlay.active { display: flex; animation: fadeIn 0.3s; }
        .modal-drawer { background: white; width: 100%; max-width: 600px; margin: 0 auto; border-radius: 20px 20px 0 0; padding: 25px; max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s; position: relative; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .close-btn { background: none; border: none; font-size: 2rem; cursor: pointer; color: #999; }
        
        /* Form */
        #form-fields label { display: block; font-weight: bold; margin-bottom: 6px; color: #444; font-size: 0.9rem; margin-top: 15px; }
        #form-fields input, #form-fields textarea, #form-fields select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; background: #fff; }
        .btn-primary { width: 100%; padding: 12px; background: #4d97ff; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 20px; }
        
        .btn-minimal { background: none; border: none; color: #ccc; cursor: pointer; padding: 5px; transition: 0.2s; }
        .btn-minimal:hover { color: #ef4444; transform: scale(1.1); }

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
    const container = document.getElementById("list-container");
    const loading = document.getElementById("loading-state");

    loading.style.display = 'block';
    container.innerHTML = '';

    try {
        if (currentTab === "materi") {
            const { data } = await supabase.from('materi_private').select('*, levels(kode)').order('created_at', { ascending: false });
            loading.style.display = 'none';
            const filtered = data ? data.filter(m => m.judul.toLowerCase().includes(search)) : [];
            
            if(!filtered.length) return container.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Tidak ada materi.</div>';

            container.innerHTML = filtered.map(m => {
                // Score kelengkapan data (Visual hint)
                const score = [m.judul, m.level_id, m.deskripsi, m.image_url].filter(Boolean).length;
                let statusColor = score === 4 ? "#2ecc71" : "#f1c40f"; // Hijau jika lengkap, kuning jika belum

                return `
                <div class="compact-item border-materi btn-edit-trigger" data-id="${m.id}" data-type="materi">
                    <div class="item-info">
                        <div class="item-icon" style="color:${statusColor}; background:#fff;">
                            <i class="fas fa-circle" style="font-size:0.8rem;"></i>
                        </div>
                        <div class="item-text">
                            <b>${m.judul}</b>
                            <span>[${m.levels?.kode || '?'}]</span>
                        </div>
                    </div>
                    <button class="btn-minimal btn-delete" data-id="${m.id}" data-type="materi">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>`;
            }).join("");
        
        } else if (currentTab === "achievement") {
            const { data } = await supabase.from('achievement_private').select('*, levels(kode)').order('created_at', {ascending: false});
            loading.style.display = 'none';
            const filtered = data ? data.filter(a => a.main_achievement.toLowerCase().includes(search)) : [];

            if(!filtered.length) return container.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Tidak ada data achievement.</div>';

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
                        <i class="fas fa-folder-open"></i> LEVEL ${level}
                    </div>
                    <div class="folder-content">
                        ${grouped[level].map(a => {
                            const subList = (a.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
                            return `
                            <div class="target-item btn-edit-trigger" data-id="${a.id}" data-type="achievement">
                                <div style="flex:1;">
                                    <span class="ach-title">${a.main_achievement}</span>
                                    <ul class="ach-list">
                                        ${subList.length > 0 ? subList.map(s => `<li>${s}</li>`).join("") : "<li>-</li>"}
                                    </ul>
                                </div>
                                <button class="btn-minimal btn-delete" data-id="${a.id}" data-type="achievement_private">
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
            const filtered = data ? data.filter(l => l.kode.toLowerCase().includes(search)) : [];

            container.innerHTML = filtered.map(l => `
                <div class="compact-item border-levels btn-edit-trigger" data-id="${l.id}" data-type="levels">
                    <div class="item-info">
                        <div class="item-icon"><i class="fas fa-layer-group"></i></div>
                        <div class="item-text">
                            <b>${l.kode}</b>
                            <span>${l.detail || '-'}</span>
                        </div>
                    </div>
                    <button class="btn-minimal btn-delete" data-id="${l.id}" data-type="levels">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>`).join("");

        } else if (currentTab === "guru") {
            const { data } = await supabase.from('teachers').select('*').order('name');
            loading.style.display = 'none';
            const filtered = data ? data.filter(g => g.name.toLowerCase().includes(search)) : [];

            container.innerHTML = filtered.map(g => `
                <div class="compact-item border-guru btn-edit-trigger" data-id="${g.id}" data-type="guru">
                    <div class="item-info">
                        <div class="item-icon"><i class="fas fa-user-tie"></i></div>
                        <div class="item-text">
                            <b>${g.name}</b>
                            <span>${g.role.toUpperCase()}</span>
                        </div>
                    </div>
                    <button class="btn-minimal btn-delete" data-id="${g.id}" data-type="teachers">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>`).join("");
        }

    } catch (err) {
        console.error("Load Error:", err);
        loading.innerHTML = `<span style="color:red;">Gagal memuat: ${err.message}</span>`;
    }
}

// ==========================================
// 4. FORM HANDLING
// ==========================================

async function injectFormFields(mode = "add", data = {}) {
    const formFields = document.getElementById("form-fields");
    document.getElementById("modal-title").innerText = `${mode === "edit" ? "Edit" : "Tambah"} ${currentTab.toUpperCase()}`;

    if (currentTab === "levels") {
        formFields.innerHTML = `
            <label>Kode Level</label>
            <input type="text" id="kode" value="${data.kode || ""}" placeholder="Contoh: LV-1" required>
            <label>Deskripsi Level</label>
            <textarea id="detail">${data.detail || ""}</textarea>
        `;
    } 
    else if (currentTab === "materi" || currentTab === "achievement") {
        const { data: lvData } = await supabase.from('levels').select('id, kode').order('kode');
        const options = lvData.map(l => `<option value="${l.id}" ${data.level_id === l.id ? "selected" : ""}>${l.kode}</option>`).join("");

        if (currentTab === "materi") {
            const currentImg = data.image_url || "https://via.placeholder.com/150?text=No+Image";
            formFields.innerHTML = `
                <label>Pilih Level</label><select id="level_id">${options}</select>
                <label>Judul Materi</label><input type="text" id="judul" value="${data.judul || ""}" required>
                
                <label>Foto Project (Cloudinary)</label>
                <div style="margin-bottom: 20px;">
                    <button type="button" id="btn-upload-p" style="background:#2ecc71; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i class="fas fa-camera"></i> Upload Foto
                    </button>
                    <input type="hidden" id="image_url" value="${data.image_url || ""}">
                    <div style="text-align:center;">
                        <img id="img-preview-p" src="${currentImg}" style="width:100%; max-height:180px; object-fit:cover; border-radius:12px; border:2px solid #eee;">
                    </div>
                </div>
                <label>Deskripsi</label><textarea id="deskripsi">${data.deskripsi || ""}</textarea>
            `;
            
            // Bind Cloudinary Button
            setTimeout(() => {
                const btn = document.getElementById("btn-upload-p");
                if(btn) btn.onclick = () => openUploadWidget(url => {
                    document.getElementById("image_url").value = url;
                    document.getElementById("img-preview-p").src = url;
                });
            }, 100);

        } else {
            // ACHIEVEMENT FORM
            formFields.innerHTML = `
                <label>Pilih Level</label><select id="level_id">${options}</select>
                <label>Kategori (Main Achievement)</label>
                <input type="text" id="main_achievement" value="${data.main_achievement || ""}" placeholder="Contoh: Merakit Sensor">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; margin-bottom:10px;">
                    <label style="margin:0;">Detail Target (Sub Items)</label>
                    <button type="button" id="btn-add-sub" style="background:#55efc4; color:#006266; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:bold;">
                        <i class="fas fa-plus"></i> Tambah
                    </button>
                </div>
                <div id="sub-ach-container"></div>
            `;

            setTimeout(() => {
                const existingSubs = (data.sub_achievement || "").split('\n').filter(s => s.trim() !== "");
                if (existingSubs.length > 0) existingSubs.forEach(val => addSubRow(val));
                else addSubRow();
                document.getElementById("btn-add-sub").onclick = () => addSubRow();
            }, 50);
        }
    }
    else if (currentTab === "guru") {
        formFields.innerHTML = `
            <label>Nama Guru/Asisten</label><input type="text" id="name" value="${data.name || ""}" required>
            <label>Role</label>
            <select id="role">
                <option value="guru" ${data.role === "guru" ? "selected" : ""}>Guru</option>
                <option value="asisten" ${data.role === "asisten" ? "selected" : ""}>Asisten</option>
            </select>
        `;
    }
}

function addSubRow(value = "") {
    const container = document.getElementById("sub-ach-container");
    const row = document.createElement("div");
    row.style = "display:flex; gap:8px; margin-bottom:8px;";
    row.innerHTML = `
        <input type="text" class="sub-input" value="${value}" placeholder="Detail target..." style="flex:1;">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()" style="background:#ff7675; color:white; border:none; border-radius:8px; width:40px; cursor:pointer;">&times;</button>
    `;
    container.appendChild(row);
}

// ==========================================
// 5. CLOUDINARY LOGIC
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
    if (!window.cloudinary) return alert("Widget belum siap. Refresh halaman.");
    if (!cloudinaryConfig || !cloudinaryConfig.cloudName) return alert("Config Error");

    window.cloudinary.openUploadWidget({
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset,
        folder: "robotic", // Custom folder untuk private
        sources: ["local", "camera"],
        multiple: false,
        cropping: true,
        croppingAspectRatio: 0.75,
        showSkipCropButton: false
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            const url = result.info.secure_url;
            callback(url);
        }
    });
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
        // Cek tombol delete dulu (karena dia di dalam card)
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            e.stopPropagation();
            deleteData(btnDelete.dataset.type, btnDelete.dataset.id);
            return;
        }

        // Cek klik card/item (Edit)
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

    // Standard inputs
    e.target.querySelectorAll("input:not(.sub-input), select, textarea").forEach(el => {
        if (el.id) payload[el.id] = el.value;
    });

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
    
    // Perbaikan mapping tipe tabel jika nama tab != nama tabel
    let tableName = tableMap[type];
    // Fallback logic
    if(!tableName && type === 'achievement') tableName = 'achievement_private';
    
    const { data } = await supabase.from(tableName).select('*').eq('id', id).single();
    if (data) {
        editingId = id;
        await injectFormFields("edit", data);
        document.getElementById("modal-overlay").classList.add("active");
    }
}

async function deleteData(tableType, id) {
    if(!confirm("Hapus data ini?")) return;
    const { error } = await supabase.from(tableType).delete().eq('id', id);
    if (!error) loadData();
    else alert("Gagal hapus: " + error.message);
}