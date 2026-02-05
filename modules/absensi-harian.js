/**
 * Project: Absensi Harian Module (SPA) - WIDE & COLORFUL EDITION
 * Features: Full Width Layout, Colorful History Cards, Physical Accordion.
 * Filename: modules/absensi-harian.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE MODULE ---
let selectedPertemuanId = null;
let currentTargets = []; 
let isEditMode = false;

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    const classId = localStorage.getItem("activeClassId");
    if (!classId) {
        alert("Pilih kelas terlebih dahulu!");
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('absensi-sekolah', 'Absensi', 'Kelas');
        return;
    }

    injectStyles();

    canvas.innerHTML = `
        <div class="harian-container">
            
            <div class="harian-header-nav shadow-soft">
                <button id="btn-back" class="btn-icon-text">
                    <i class="fas fa-arrow-left"></i> Kembali
                </button>
                <div style="text-align:center; flex:1;">
                    <h3 class="page-title">Input Harian</h3>
                </div>
                <button id="btn-rekap-nav" class="btn-icon-text">
                    <i class="fas fa-chart-pie"></i> Rekap
                </button>
            </div>

            <div class="class-info-card shadow-soft fade-in">
                <div class="info-main">
                    <div class="info-icon"><i class="fas fa-school"></i></div>
                    <div>
                        <h2 id="header-kelas" class="info-class-name">Loading...</h2>
                        <p id="header-sekolah" class="info-school-name">...</p>
                    </div>
                </div>
                <div class="info-meta">
                    <span class="meta-badge"><i class="far fa-calendar"></i> <span id="header-tahun">-</span></span>
                    <span class="meta-badge"><i class="fas fa-clock"></i> <span id="header-jadwal">-</span></span>
                    <span id="header-semester" style="display:none;">-</span>
                </div>
            </div>

            <div class="main-layout-grid">
                
                <div class="left-column">
                    
                    <div class="card-section shadow-soft">
                        <div class="section-header accordion-trigger" id="head-materi" title="Klik untuk Buka/Tutup">
                            <h4><i class="fas fa-calendar-day" style="color:#4d97ff;"></i> Data Pertemuan</h4>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <button id="btn-new-form" class="btn-action-small" title="Reset Form">
                                    <i class="fas fa-plus"></i> Baru
                                </button>
                                <i id="icon-materi" class="fas fa-chevron-down accordion-icon rotate-icon"></i>
                            </div>
                        </div>
                        
                        <div id="materi-form" style="display:block;" class="fade-in">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>🎯 Level / Kit</label>
                                    <select id="materi-level-filter" class="input-modern" required><option>Loading...</option></select>
                                </div>
                                <div class="form-group">
                                    <label>📅 Tanggal</label>
                                    <input type="date" id="materi-date" class="input-modern" required>
                                </div>
                                <div class="form-group full">
                                    <label>📚 Judul Materi (Mission)</label>
                                    <div style="position:relative;">
                                        <input type="text" id="materi-title" class="input-modern" placeholder="Ketik judul materi..." autocomplete="off" required>
                                        <div id="materi-suggestion-box" class="suggestion-box shadow-soft"></div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>👨‍🏫 Guru Utama</label>
                                    <select id="materi-guru" class="input-modern" required></select>
                                </div>
                                <div class="form-group">
                                    <label>👥 Asisten</label>
                                    <select id="materi-asisten" class="input-modern"></select>
                                </div>
                            </div>
                            <div class="form-actions" style="margin-top:15px;">
                                <button id="btn-submit-materi" class="btn-primary full">
                                    <i class="fas fa-save"></i> Simpan Pertemuan
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="card-section shadow-soft" id="section-target">
                        <div class="section-header accordion-trigger" id="head-target">
                            <h4><i class="fas fa-trophy" style="color:#ffab19;"></i> Target Achievement</h4>
                            <i id="icon-target" class="fas fa-chevron-down accordion-icon"></i>
                        </div>
                        
                        <div id="target-container" class="fade-in" style="display:none;">
                            <div class="form-grid">
                                <div class="form-group full">
                                    <label>Topik Utama</label>
                                    <input type="text" id="input-ach-main" list="list-ach-saran" class="input-modern" placeholder="Cth: Mechanics">
                                    <datalist id="list-ach-saran"></datalist>
                                </div>
                                <div class="form-group full">
                                    <label>Detail Target</label>
                                    <div id="sub-achievement-injector-area"></div>
                                    <input type="text" id="input-ach-sub" class="input-modern" placeholder="Cth: Merakit Gearbox">
                                    <button type="button" id="btn-add-target-ui" class="btn-secondary full margin-top">
                                        <i class="fas fa-plus-circle"></i> Tambah
                                    </button>
                                </div>
                            </div>
                            
                            <div id="target-list-preview" class="preview-box shadow-soft">
                                <small style="color:#999;">Belum ada target.</small>
                            </div>
                            
                            <button type="button" id="btn-save-targets-db" class="btn-primary full margin-top" style="background: linear-gradient(135deg, #ffab19, #f59e0b);">
                                <i class="fas fa-cloud-upload-alt"></i> Simpan Target
                            </button>
                        </div>
                    </div>

                </div> <div class="right-column">
                    <div class="card-section shadow-soft" style="height: 100%;">
                        <div class="section-header">
                            <h4><i class="fas fa-user-check" style="color:#2ecc71;"></i> Absensi & Penilaian</h4>
                            <select id="pertemuan-selector" class="select-header input-modern" style="width:200px;">
                                <option value="">-- Pilih Pertemuan --</option>
                            </select>
                        </div>
                        
                        <div class="table-wrapper shadow-soft">
                            <table id="absensi-table" class="absensi-table">
                                <thead><tr><th>No</th><th>Nama</th><th>Status</th><th>Sikap</th><th>Fokus</th></tr></thead>
                                <tbody><tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Pilih pertemuan di atas 👆</td></tr></tbody>
                            </table>
                        </div>
                        
                        <div class="action-bar-sticky">
                            <div class="total-hadir-box">
                                Hadir: <span id="total-hadir" style="color:#4d97ff; font-weight:bold;">0</span>
                            </div>
                            <button id="simpan-absensi" class="btn-primary full">
                                <i class="fas fa-save"></i> Simpan Semua
                            </button>
                        </div>
                    </div>
                </div>

            </div> <div style="margin-top:40px;">
                <h4 style="margin-bottom:15px; color:#555; border-left:4px solid #4d97ff; padding-left:10px;">
                    Riwayat Pertemuan
                </h4>
                <div id="materi-history-list" class="history-grid">
                    <div style="grid-column:1/-1; text-align:center; padding:30px; color:#999;">
                        <i class="fas fa-circle-notch fa-spin"></i> Memuat data...
                    </div>
                </div>
            </div>

        </div>
    `;

    // 4. Setup Logic
    await setupLogic();
}

// ==========================================
// 2. CSS STYLING (WIDE & COLORFUL)
// ==========================================
function injectStyles() {
    const styleId = 'absensi-harian-css';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Layout Full Width */
        .harian-container { 
            width: 96%; 
            max-width: 1400px; 
            margin: 0 auto; 
            padding-bottom: 120px; 
            font-family: 'Roboto', sans-serif; 
        }
        
        /* Grid Layout (Desktop Split) */
        .main-layout-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
        }
        @media (min-width: 900px) {
            .main-layout-grid {
                grid-template-columns: 350px 1fr; /* Kiri 350px, Kanan sisa */
                align-items: start;
            }
        }
        
        /* Header */
        .harian-header-nav { display: flex; align-items: center; margin-bottom: 20px; background: white; padding: 12px 15px; border-radius: 12px; }
        .page-title { margin: 0; color: #333; font-family: 'Fredoka One', cursive; font-size: 1.3rem; }
        .btn-icon-text { background: none; border: none; font-size: 1.1rem; color: #555; cursor: pointer; padding: 5px 10px; transition: 0.2s; }
        .btn-icon-text:hover { color: #4d97ff; background: #f0f7ff; border-radius: 8px; }

        /* Class Info */
        .class-info-card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 15px; position: relative; overflow: hidden; }
        .class-info-card::before { content: ''; position: absolute; top: 0; left: 0; width: 6px; height: 100%; background: #4d97ff; }
        .info-main { display: flex; align-items: center; gap: 15px; }
        .info-icon { width: 50px; height: 50px; background: #eef6ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #4d97ff; }
        .info-class-name { margin: 0; font-size: 1.4rem; color: #333; font-weight: 800; }
        .info-school-name { margin: 0; color: #666; font-size: 0.95rem; }
        .info-meta { display: flex; gap: 10px; flex-wrap: wrap; }
        .meta-badge { background: #f8f9fa; padding: 5px 10px; border-radius: 8px; font-size: 0.8rem; color: #555; font-weight: 600; border: 1px solid #eee; display: flex; align-items: center; gap: 5px; }

        /* Accordion Cards */
        .card-section { background: white; padding: 20px; border-radius: 16px; margin-bottom: 20px; border: 1px solid #f0f0f0; transition: 0.2s; }
        .shadow-soft { box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
        
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; user-select: none; padding: 10px; border-radius: 8px; transition: 0.2s; background: #fafafa; border: 1px solid #eee; }
        .section-header:hover { background-color: #f0f7ff; border-color: #4d97ff; }
        .section-header h4 { margin: 0; font-size: 1rem; color: #333; font-weight: 700; display:flex; align-items:center; gap:10px; }
        
        .accordion-icon { transition: transform 0.3s ease; color: #999; font-size: 1.2rem; }
        .rotate-icon { transform: rotate(180deg); color: #4d97ff; }

        /* Forms */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group.full { grid-column: span 2; }
        .form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .input-modern { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; background: #fdfdfd; transition: 0.2s; }
        .input-modern:focus { border-color: #4d97ff; background: white; outline: none; box-shadow: 0 0 0 3px rgba(77,151,255,0.1); }

        /* Buttons */
        .btn-primary { background: linear-gradient(135deg, #4d97ff, #2563eb); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.95rem; transition: 0.2s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(77,151,255,0.3); }
        .btn-secondary { background: white; border: 1px solid #ddd; color: #555; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-action-small { background: #e0f2fe; color: #0284c7; border: none; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .btn-action-small:hover { background: #bae6fd; }

        /* Table */
        .table-wrapper { overflow-x: auto; border-radius: 10px; border: 1px solid #eee; margin-bottom: 15px; }
        .absensi-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .absensi-table th { background: #f8fafc; padding: 12px; text-align: center; font-size: 0.8rem; color: #64748b; font-weight: 700; border-bottom: 2px solid #eee; }
        .absensi-table td { padding: 10px; text-align: center; border-bottom: 1px solid #f1f5f9; background:white; }
        .absensi-table select { padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; font-size: 0.9rem; cursor: pointer; }

        /* Colorful History Cards */
        .history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; }
        .history-card-color {
            padding: 20px; border-radius: 16px; color: white; cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: transform 0.2s;
            position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;
        }
        .history-card-color:hover { transform: translateY(-5px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        
        .history-card-color::after {
            content: ''; position: absolute; top: -30px; right: -30px;
            width: 100px; height: 100px; background: rgba(255,255,255,0.15);
            border-radius: 50%; pointer-events: none;
        }

        /* Variasi Warna */
        .variant-0 { background: linear-gradient(135deg, #4d97ff, #2563eb); } /* Blue */
        .variant-1 { background: linear-gradient(135deg, #ffab19, #f59e0b); } /* Orange */
        .variant-2 { background: linear-gradient(135deg, #00b894, #00a884); } /* Green */
        .variant-3 { background: linear-gradient(135deg, #a55eea, #8854d0); } /* Purple */

        /* Utils */
        .full { width: 100%; }
        .margin-top { margin-top: 15px; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        
        .suggestion-box { position: absolute; width: 100%; background: white; border: 1px solid #eee; border-radius: 0 0 8px 8px; max-height: 150px; overflow-y: auto; z-index: 50; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .suggestion-item { padding: 12px; cursor: pointer; font-size: 0.9rem; border-bottom: 1px solid #f9f9f9; }
        .suggestion-item:hover { background: #f0f7ff; color: #4d97ff; }
        
        .preview-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 8px; margin-top: 10px; min-height: 40px; }
        .target-item-row { display: flex; justify-content: space-between; align-items: center; background: white; padding: 8px; margin-bottom: 5px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-size: 0.9rem; }

        @media (max-width: 600px) {
            .form-grid { grid-template-columns: 1fr; }
            .form-group.full { grid-column: span 1; }
        }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC CORE
// ==========================================

async function setupLogic() {
    await renderHeader();
    await loadLevelOptions();
    await loadGuruDropdowns();
    await loadAchievementSuggestions();
    
    // Load history dan pertemuan
    await tampilkanDaftarMateri(); 
    await loadPertemuanOptions();

    setupEvents();
}

function setupEvents() {
    // Navigasi
    document.getElementById('btn-back').onclick = () => window.dispatchModuleLoad?.('absensi-sekolah', 'Absensi', 'Kelas');
    document.getElementById('btn-rekap-nav').onclick = () => window.dispatchModuleLoad?.('rekap-absensi', 'Rekapitulasi', 'Laporan');
    
    // Accordion Logic
    document.getElementById("head-materi").onclick = (e) => {
        if(e.target.closest('#btn-new-form')) return;
        toggleAccordion("materi-form", "icon-materi");
    };
    
    document.getElementById("head-target").onclick = () => toggleAccordion("target-container", "icon-target");

    // Tombol Form Baru
    document.getElementById("btn-new-form").onclick = () => {
        resetFormMateri();
        forceOpenAccordion("materi-form", "icon-materi");
        document.getElementById("materi-form").scrollIntoView({behavior:'smooth', block:'center'});
    };

    // Tombol Simpan
    document.getElementById("btn-submit-materi").onclick = handleMateriSubmit;
    document.getElementById("simpan-absensi").onclick = handleAbsensiSubmit;
    document.getElementById("btn-save-targets-db").onclick = saveTargetsToDB;
    document.getElementById("btn-add-target-ui").onclick = addTargetToUI;

    // Auto-Search & Inputs
    const titleInput = document.getElementById("materi-title");
    titleInput.oninput = (e) => loadMateriSuggestions(e.target.value.trim(), document.getElementById("materi-level-filter").value);
    
    document.getElementById("pertemuan-selector").onchange = (e) => {
        selectedPertemuanId = e.target.value;
        if(selectedPertemuanId) initTable(selectedPertemuanId);
    };

    // Smart Achievement
    const mainAchInput = document.getElementById("input-ach-main");
    mainAchInput.onchange = async (e) => {
        const val = e.target.value;
        if(!val) return;
        const { data } = await supabase.from("achievement_sekolah").select("sub_achievement").eq("main_achievement", val);
        if (data && data.length > 0) {
            const allSubs = data.map(d => d.sub_achievement).join('\n').split('\n').filter(Boolean);
            const uniqueSubs = [...new Set(allSubs)];
            if(uniqueSubs.length > 0) renderSubSelector(val, uniqueSubs);
        }
    };
}

// --- ACCORDION FUNCTIONS ---
function toggleAccordion(contentId, iconId) {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);
    
    const isHidden = content.style.display === "none";
    content.style.display = isHidden ? "block" : "none";
    
    if(isHidden) {
        icon.classList.add("rotate-icon");
    } else {
        icon.classList.remove("rotate-icon");
    }
}

function forceOpenAccordion(contentId, iconId) {
    document.getElementById(contentId).style.display = "block";
    document.getElementById(iconId).classList.add("rotate-icon");
}

function forceCloseAccordion(contentId, iconId) {
    document.getElementById(contentId).style.display = "none";
    document.getElementById(iconId).classList.remove("rotate-icon");
}

async function renderHeader() {
    const classId = localStorage.getItem("activeClassId");
    const { data: kelas } = await supabase.from("classes")
        .select(`name, jadwal, schools (id, name), semesters (name), academic_years (year)`)
        .eq("id", classId).single();

    if (kelas) {
        document.getElementById("header-sekolah").textContent = kelas.schools?.name || "Sekolah Tidak Diketahui";
        document.getElementById("header-kelas").textContent = kelas.name || "Nama Kelas";
        document.getElementById("header-tahun").textContent = kelas.academic_years?.year || "-";
        document.getElementById("header-jadwal").textContent = kelas.jadwal || "-";
        localStorage.setItem("activeSchoolId", kelas.schools?.id || "");
    }
}

async function loadLevelOptions() {
    const { data } = await supabase.from("levels").select("id, kode").order("kode");
    const select = document.getElementById("materi-level-filter");
    select.innerHTML = '<option value="">-- Pilih Level --</option>';
    (data || []).forEach(l => select.add(new Option(l.kode, l.id)));
}

async function loadGuruDropdowns() {
    const { data } = await supabase.from("teachers").select("id, name").order("name");
    const gSelect = document.getElementById("materi-guru");
    const aSelect = document.getElementById("materi-asisten");
    gSelect.innerHTML = '<option value="">-- Pilih Guru --</option>';
    aSelect.innerHTML = '<option value="">-- Pilih Asisten (Opsional) --</option>';
    (data || []).forEach(t => {
        gSelect.add(new Option(t.name, t.id));
        aSelect.add(new Option(t.name, t.id));
    });
}

// --- HISTORY MATERI (COLORFUL) ---
async function tampilkanDaftarMateri() {
    const classId = localStorage.getItem("activeClassId");
    const grid = document.getElementById("materi-history-list");
    
    // Gunakan relasi teachers!guru_id
    const { data, error } = await supabase.from("pertemuan_kelas")
        .select("id, tanggal, materi(title), teachers!guru_id(name)") 
        .eq("class_id", classId)
        .order("tanggal", {ascending:false});
    
    if (error) {
        grid.innerHTML = `<div style="color:red; grid-column:1/-1;">Error memuat data: ${error.message}</div>`;
        return;
    }

    if (!data.length) {
        grid.innerHTML = `<div style="color:#999; grid-column:1/-1; text-align:center;">Belum ada riwayat pertemuan.</div>`;
        return;
    }

    // Render Colorful Cards
    grid.innerHTML = data.map((p, index) => `
        <div class="history-card-color variant-${index % 4}" onclick="window.editPertemuan('${p.id}')">
            <div style="font-weight:bold; font-size:1.1rem; opacity:0.9;">
                <i class="fas fa-calendar-alt"></i> ${formatDate(p.tanggal)}
            </div>
            <div style="font-size:1rem; font-weight:700; margin-top:8px;">
                ${p.materi?.title || 'Tanpa Judul'}
            </div>
            <div style="font-size:0.8rem; margin-top:15px; opacity:0.8; display:flex; justify-content:space-between;">
                <span><i class="fas fa-user-tie"></i> ${p.teachers?.name || '-'}</span>
                <span>Edit <i class="fas fa-arrow-right"></i></span>
            </div>
        </div>
    `).join("");
}

// --- FORM HANDLING ---
async function handleMateriSubmit(e) {
    e.preventDefault();
    const levelId = document.getElementById("materi-level-filter").value;
    const title = document.getElementById("materi-title").value.trim();
    if(!levelId) return alert("Pilih Level dulu!");

    try {
        let { data: materi } = await supabase.from("materi").select("id").eq("title", title).eq("level_id", levelId).maybeSingle();
        if (!materi) {
            const res = await supabase.from("materi").insert({ title, level_id: levelId }).select().single();
            materi = res.data;
        }

        let asistenId = document.getElementById("materi-asisten").value;
        if(asistenId === "") asistenId = null;

        let schoolId = localStorage.getItem("activeSchoolId");
        if(schoolId === "") schoolId = null;

        const payload = {
            school_id: schoolId,
            class_id: localStorage.getItem("activeClassId"),
            tanggal: document.getElementById("materi-date").value,
            materi_id: materi.id,
            guru_id: document.getElementById("materi-guru").value,
            asisten_id: asistenId
        };

        if (isEditMode && selectedPertemuanId) {
            await supabase.from("pertemuan_kelas").update(payload).eq("id", selectedPertemuanId);
            alert("Pertemuan Diperbarui!");
        } else {
            const res = await supabase.from("pertemuan_kelas").insert([payload]).select("id").single();
            selectedPertemuanId = res.data.id;
            alert("Pertemuan Baru Dibuat!");
            await generateAbsensiDefault(selectedPertemuanId);
        }

        // Logic UI: Tutup Form Materi, Buka Target
        forceCloseAccordion("materi-form", "icon-materi");
        forceOpenAccordion("target-container", "icon-target");
        
        await tampilkanDaftarMateri();
        await loadPertemuanOptions();
        
        document.getElementById("pertemuan-selector").value = selectedPertemuanId;
        initTable(selectedPertemuanId);

    } catch (err) { alert("Gagal: " + err.message); }
}

async function generateAbsensiDefault(pid) {
    const cid = localStorage.getItem("activeClassId");
    const { data: students } = await supabase.from("students").select("id").eq("class_id", cid);
    if(students) {
        const records = students.map(s => ({
            pertemuan_id: pid, student_id: s.id, status: "0", sikap: "0", fokus: "0", 
            tanggal: document.getElementById("materi-date").value
        }));
        await supabase.from("attendance").insert(records);
    }
}

// --- TARGET ACHIEVEMENT ---
async function saveTargetsToDB() {
    if (!selectedPertemuanId) {
        alert("⚠️ Simpan DATA PERTEMUAN terlebih dahulu!");
        forceOpenAccordion("materi-form", "icon-materi"); // Buka form materi otomatis
        document.getElementById("materi-form").scrollIntoView({behavior:'smooth'});
        return;
    }

    const classId = localStorage.getItem("activeClassId");
    const btn = document.getElementById("btn-save-targets-db");
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menyimpan...`;
    btn.disabled = true;

    try {
        for (let i = 0; i < currentTargets.length; i++) {
            let t = currentTargets[i];
            if (t.id) continue;

            let masterId;
            const { data: exist } = await supabase.from("achievement_sekolah").select("id").eq("main_achievement", t.main).eq("sub_achievement", t.sub).maybeSingle();
            
            if(exist) masterId = exist.id;
            else {
                const { data: neu } = await supabase.from("achievement_sekolah").insert({ main_achievement: t.main, sub_achievement: t.sub }).select("id").single();
                masterId = neu.id;
            }

            const { data: link } = await supabase.from("achievement_kelas").insert({
                pertemuan_id: selectedPertemuanId, 
                class_id: classId, 
                achievement_sekolah_id: masterId 
            }).select("id").single();
            
            currentTargets[i].id = link.id;
        }
        
        initTable(selectedPertemuanId); 
        alert("Target Berhasil Disimpan!");
        forceCloseAccordion("target-container", "icon-target"); // Tutup setelah simpan

    } catch (e) {
        alert("Gagal simpan target: " + e.message);
    } finally {
        btn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> Simpan Target ke Database`;
        btn.disabled = false;
    }
}

// --- TABLE & UI HELPERS ---
function renderTargetListUI() {
    const container = document.getElementById("target-list-preview");
    if (!currentTargets.length) { container.innerHTML = '<small style="color:#999; font-style:italic;">Belum ada target.</small>'; return; }
    
    container.innerHTML = currentTargets.map((t, i) => `
        <div class="target-item-row fade-in">
            <span><strong>T${i+1}</strong> <span style="color:#4d97ff;">${t.main}</span> - ${t.sub}</span>
            <button onclick="window.hapusTarget(${i})" style="border:none; background:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>
    `).join("");
}

window.hapusTarget = async (index) => {
    const t = currentTargets[index];
    if(t.id) {
        if(!confirm("Hapus target permanen? Nilai siswa akan hilang.")) return;
        await supabase.from("achievement_kelas").delete().eq("id", t.id);
    }
    currentTargets.splice(index, 1);
    renderTargetListUI();
    if(selectedPertemuanId) initTable(selectedPertemuanId);
};

function addTargetToUI() {
    const main = document.getElementById("input-ach-main").value;
    const sub = document.getElementById("input-ach-sub").value;
    if(!main || !sub) return alert("Isi lengkap!");
    currentTargets.push({ main, sub, id: null });
    renderTargetListUI();
    document.getElementById("input-ach-sub").value = "";
}

async function initTable(pertemuanId) {
    const classId = localStorage.getItem("activeClassId");
    const [resS, resA, resT, resScores] = await Promise.all([
        supabase.from("students").select("id, name").eq("class_id", classId).order("name"),
        supabase.from("attendance").select("*").eq("pertemuan_id", pertemuanId),
        supabase.from("achievement_kelas").select(`id, achievement_sekolah (main_achievement, sub_achievement)`).eq("pertemuan_id", pertemuanId).order("id"),
        supabase.from("achievement_siswa").select("*").eq("pertemuan_id", pertemuanId)
    ]);

    const students = resS.data || [];
    const absensi = resA.data || [];
    const targets = resT.data || [];
    const scores = resScores.data || [];

    if(targets.length > 0) {
        currentTargets = targets.map(t => ({
            id: t.id, main: t.achievement_sekolah?.main_achievement || "Unknown", sub: t.achievement_sekolah?.sub_achievement || "Unknown"
        }));
    } else {
        if(!isEditMode) currentTargets = [];
    }
    renderTargetListUI();

    const scoreMap = {};
    scores.forEach(s => scoreMap[`${s.student_id}_${s.achievement_kelas_id}`] = s.score);

    const thead = document.querySelector("#absensi-table thead");
    let hHtml = `<tr><th width="40">No</th><th>Nama</th><th width="80">Status</th><th width="60">Sikap</th><th width="60">Fokus</th>`;
    currentTargets.forEach((t, i) => hHtml += `<th width="60" title="${t.main}">T${i+1}</th>`);
    thead.innerHTML = hHtml + "</tr>";

    const tbody = document.querySelector("#absensi-table tbody");
    tbody.innerHTML = students.map((s, i) => {
        const att = absensi.find(a => a.student_id === s.id) || { status:0, sikap:3, fokus:2 };
        let row = `<tr data-sid="${s.id}">
            <td>${i+1}</td>
            <td style="text-align:left; font-weight:500;">${s.name}</td>
            <td><select class="status-sel">${getOptions([['0','⬜'],['1','✅'],['2','❌']], att.status)}</select></td>
            <td><select class="sikap-sel">${getOptions([['1','🤐'],['3','🙂'],['5','🌀']], att.sikap)}</select></td>
            <td><select class="fokus-sel">${getOptions([['1','😶'],['2','🙂'],['3','🔥']], att.fokus)}</select></td>`;
        currentTargets.forEach(t => {
            const tid = t.id || 'new';
            const sc = scoreMap[`${s.id}_${tid}`] || 0;
            row += `<td><select class="score-sel" data-tid="${tid}">${getOptions([['0','❌'],['1','😶'],['2','🙂'],['3','🔥']], sc)}</select></td>`;
        });
        return row + "</tr>";
    }).join("");

    updateTotalHadir();
    document.querySelectorAll(".status-sel").forEach(el => el.addEventListener("change", updateTotalHadir));
}

// --- UTILS ---
async function handleAbsensiSubmit() {
    if(!selectedPertemuanId) return alert("Pilih pertemuan dulu!");
    const btn = document.getElementById("simpan-absensi");
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menyimpan...`;
    
    await supabase.from("attendance").delete().eq("pertemuan_id", selectedPertemuanId);
    await supabase.from("achievement_siswa").delete().eq("pertemuan_id", selectedPertemuanId);

    const attBatch = [];
    const scoreBatch = [];
    const { data: pert } = await supabase.from("pertemuan_kelas").select("tanggal").eq("id", selectedPertemuanId).single();
    const tgl = pert?.tanggal || new Date().toISOString();
    const classId = localStorage.getItem("activeClassId");

    document.querySelectorAll("#absensi-table tbody tr").forEach(tr => {
        const sid = tr.dataset.sid;
        attBatch.push({
            pertemuan_id: selectedPertemuanId, student_id: sid, tanggal: tgl,
            status: tr.querySelector(".status-sel").value,
            sikap: tr.querySelector(".sikap-sel").value,
            fokus: tr.querySelector(".fokus-sel").value
        });
        tr.querySelectorAll(".score-sel").forEach(sel => {
            const tid = sel.dataset.tid;
            if(tid && tid !== 'new') {
                scoreBatch.push({
                    pertemuan_id: selectedPertemuanId, student_id: sid, class_id: classId,
                    achievement_kelas_id: tid, score: sel.value
                });
            }
        });
    });

    if(attBatch.length) await supabase.from("attendance").insert(attBatch);
    if(scoreBatch.length) await supabase.from("achievement_siswa").insert(scoreBatch);

    alert("Data Berhasil Disimpan!");
    btn.innerHTML = `<i class="fas fa-save"></i> Simpan Semua`;
}

function getOptions(arr, selected) {
    return arr.map(([v, l]) => `<option value="${v}" ${v == selected ? 'selected' : ''}>${l}</option>`).join('');
}

function updateTotalHadir() {
    const count = document.querySelectorAll(".status-sel option[value='1']:checked").length;
    document.getElementById("total-hadir").textContent = count;
}

window.editPertemuan = async (id) => {
    const { data } = await supabase.from("pertemuan_kelas").select("*, materi(title, level_id)").eq("id", id).single();
    if(data) {
        isEditMode = true;
        selectedPertemuanId = id;
        document.getElementById("materi-date").value = data.tanggal;
        document.getElementById("materi-title").value = data.materi?.title;
        document.getElementById("materi-level-filter").value = data.materi?.level_id;
        document.getElementById("materi-guru").value = data.guru_id;
        document.getElementById("materi-asisten").value = data.asisten_id || "";
        
        // Buka Form Materi & Tutup Target agar fokus
        forceOpenAccordion("materi-form", "icon-materi");
        forceCloseAccordion("target-container", "icon-target");
        
        initTable(id);
        document.querySelector('.card-section').scrollIntoView({behavior:'smooth'});
    }
};

async function loadPertemuanOptions() {
    const classId = localStorage.getItem("activeClassId");
    const { data } = await supabase.from("pertemuan_kelas").select("id, tanggal, materi(title)").eq("class_id", classId).order("tanggal", {ascending:false});
    
    const sel = document.getElementById("pertemuan-selector");
    sel.innerHTML = '<option value="">-- Pilih Pertemuan --</option>';
    (data || []).forEach(p => {
        sel.add(new Option(`${formatDate(p.tanggal)} - ${p.materi?.title}`, p.id));
    });
}

function formatDate(d) {
    return new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short' });
}

function renderSubSelector(mainTitle, options) {
    const area = document.getElementById("sub-achievement-injector-area");
    area.innerHTML = `
        <div style="background:#e3f2fd; padding:10px; border-radius:6px; margin-bottom:10px;">
            <strong>Pilih Sub Target:</strong>
            <select id="smart-sub-select" style="width:100%; margin:5px 0;">
                ${options.map(o => `<option>${o}</option>`).join('')}
            </select>
            <button type="button" onclick="window.confirmSmartSub()" class="btn-primary full" style="padding:5px;">Pilih</button>
        </div>
    `;
    document.getElementById("input-ach-sub").style.display = "none";
}

window.confirmSmartSub = () => {
    const sub = document.getElementById("smart-sub-select").value;
    document.getElementById("input-ach-sub").value = sub;
    document.getElementById("input-ach-sub").style.display = "block";
    document.getElementById("sub-achievement-injector-area").innerHTML = "";
};

async function loadAchievementSuggestions() {
    const { data } = await supabase.from("achievement_sekolah").select("main_achievement");
    const list = document.getElementById("list-ach-saran");
    if(data && list) {
        const unique = [...new Set(data.map(i=>i.main_achievement))];
        list.innerHTML = unique.map(v => `<option value="${v}">`).join("");
    }
}

async function loadMateriSuggestions(keyword, levelId) {
    const box = document.getElementById("materi-suggestion-box");
    if (!levelId || keyword.length < 2) { box.style.display = "none"; return; }

    const { data } = await supabase.from("materi").select("id, title").eq("level_id", levelId).ilike("title", `%${keyword}%`).limit(5);
    
    box.innerHTML = "";
    if (!data || data.length === 0) {
        box.innerHTML = `<div class="suggestion-item" style="color:orange; font-style:italic;">✨ Materi Baru: "${keyword}"</div>`;
    } else {
        data.forEach(m => {
            const div = document.createElement("div");
            div.className = "suggestion-item";
            div.textContent = m.title;
            div.onclick = () => {
                document.getElementById("materi-title").value = m.title;
                box.style.display = "none";
            };
            box.appendChild(div);
        });
    }
    box.style.display = "block";
}

function resetFormMateri() {
    isEditMode = false;
    selectedPertemuanId = null;
    document.getElementById("materi-form").reset();
    currentTargets = [];
    renderTargetListUI();
}