/**
 * Project: Monitoring Private Module (SPA) - WIDE & COLORFUL EDITION
 * Features: Full Width Student Cards, Colorful UI, Physical Accordion Buttons.
 * Filename: modules/monitoring-private.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE MODULE ---
let classId = null;
let levelId = null;
let currentSessionId = null;
let sessionTargets = []; 
let studentList = [];
let attendanceMap = {}; 
let achievementScoreMap = {}; 

// --- SMART INPUT STATE ---
let selectedMainAch = null;
let debounceTimer = null;

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    classId = localStorage.getItem("activePrivateClassId");
    levelId = localStorage.getItem("activeLevelId");
    const levelKode = localStorage.getItem("activeLevelKode") || "-";
    const className = localStorage.getItem("activeClassName") || "Kelas Private";

    if (!classId) {
        alert("Pilih kelas terlebih dahulu!");
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('absensi-private', 'Absensi Private', 'List');
        return;
    }

    injectStyles();

    canvas.innerHTML = `
        <div class="mp-container">
            
            <div class="mp-header shadow-soft">
                <button id="btn-back" class="btn-icon-text">
                    <i class="fas fa-arrow-left"></i> Kembali
                </button>
                <div style="text-align:center; flex:1;">
                    <h3 class="page-title">${className}</h3>
                    <span class="level-badge">${levelKode}</span>
                </div>
                <div id="session-status" class="status-badge">BARU</div>
            </div>

            <div class="card-section shadow-soft">
                <div class="section-header accordion-trigger" id="head-setup" title="Klik untuk Buka/Tutup">
                    <h4><i class="fas fa-calendar-day" style="color:#4d97ff;"></i> Setup Sesi</h4>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button id="btn-reset-mode" class="btn-action-small" style="display:none;">
                            <i class="fas fa-plus"></i> Baru
                        </button>
                        <i id="icon-setup" class="fas fa-chevron-down accordion-icon rotate-icon"></i>
                    </div>
                </div>

                <div id="setup-form" style="display:block;" class="fade-in">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>📅 Tanggal</label>
                            <input type="date" id="tglPertemuan" class="input-modern">
                        </div>
                        <div class="form-group">
                            <label>👨‍🏫 Guru</label>
                            <select id="pilihGuru" class="input-modern"><option>Loading...</option></select>
                        </div>
                        <div class="form-group full">
                            <label>📚 Materi (Topik)</label>
                            <input type="text" id="materiUtama" class="input-modern" placeholder="Contoh: Logika Algoritma">
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top:15px;">
                        <button id="btnSimpanSesi" class="btn-primary full">
                            <i class="fas fa-play"></i> MULAI SESI
                        </button>
                    </div>
                </div>
            </div>

            <div class="card-section shadow-soft" id="section-target">
                <div class="section-header accordion-trigger" id="head-target" title="Klik untuk Buka/Tutup">
                    <h4><i class="fas fa-bullseye" style="color:#ffab19;"></i> Target Capaian</h4>
                    <i id="icon-target" class="fas fa-chevron-down accordion-icon"></i>
                </div>

                <div id="target-container" style="display:none;" class="fade-in">
                    <div id="input-target-area">
                        <div class="form-group full" style="position:relative;">
                            <label>🔍 Cari / Input Topik</label>
                            <input type="text" id="mainAchSearch" class="input-modern" placeholder="Ketik minimal 2 huruf..." autocomplete="off">
                            <div id="achSuggestionBox" class="suggestion-box shadow-soft"></div>
                        </div>
                        
                        <div id="subAchContainer" style="display:none; background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:10px;">
                            <label style="font-size:0.8rem; color:#666;">Detail Target:</label>
                            <select id="subAchSelect" class="input-modern" style="margin-bottom:5px;"></select>
                            <input type="text" id="subAchManual" class="input-modern" placeholder="Ketik detail manual..." style="display:none;">
                            <div style="text-align:right;">
                                <small id="btnToggleManual" style="color:#4d97ff; cursor:pointer; font-weight:bold;">
                                    <i class="fas fa-pen"></i> Input Manual?
                                </small>
                            </div>
                        </div>

                        <button id="btnAddAch" class="btn-secondary full">
                            <i class="fas fa-plus-circle"></i> Tambahkan ke List
                        </button>
                    </div>

                    <div id="targetList" class="preview-box shadow-soft">
                        <div style="text-align:center; color:#999; font-style:italic;">Belum ada target.</div>
                    </div>

                    <button id="btnSimpanTarget" class="btn-primary full margin-top" style="display:none; background:linear-gradient(135deg, #ffab19, #f59e0b);">
                        <i class="fas fa-save"></i> SIMPAN TARGET
                    </button>
                    
                    <button id="btnTambahLagi" class="btn-secondary full margin-top" style="display:none;">
                        <i class="fas fa-plus"></i> Tambah Target Lain
                    </button>
                </div>
            </div>

            <div id="monitoringSection" style="margin-top:20px; display:none;">
                <h4 style="margin-bottom:15px; color:#555; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-users-viewfinder" style="color:#2ecc71;"></i> Penilaian Siswa
                </h4>
                <div id="studentContainer" class="student-grid-wide"></div>
            </div>

            <div style="margin-top:40px;">
                <h4 style="margin-bottom:15px; color:#555; border-left:4px solid #4d97ff; padding-left:10px;">
                    Riwayat Kelas Ini
                </h4>
                <div id="historyGrid" class="history-grid-wide">
                    <div style="text-align:center; color:#ccc; grid-column:1/-1;">Memuat riwayat...</div>
                </div>
            </div>

        </div>
    `;

    // 4. Setup Logic
    await setupLogic();
}

// ==========================================
// 2. CSS STYLING (FULL WIDTH & COLORFUL)
// ==========================================
function injectStyles() {
    const styleId = 'monitoring-private-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Main Container */
        .mp-container { 
            max-width: 900px; 
            margin: 0 auto; 
            padding-bottom: 120px; 
            font-family: 'Roboto', sans-serif; 
        }
        
        /* Header */
        .mp-header { display: flex; align-items: center; margin-bottom: 20px; background: white; padding: 12px 15px; border-radius: 12px; }
        .page-title { margin: 0; color: #333; font-family: 'Fredoka One', cursive; font-size: 1.3rem; }
        .level-badge { background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; }
        .status-badge { font-weight:bold; font-size:0.8rem; color:#aaa; border:1px solid #ddd; padding:4px 8px; border-radius:6px; }
        
        .btn-icon-text { background:none; border:none; color:#555; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px; padding:5px 10px; border-radius:8px; transition:0.2s; }
        .btn-icon-text:hover { background:#f0f7ff; color:#4d97ff; }

        /* Accordion Header (Tombol Fisik) */
        .card-section { background: white; padding: 20px; border-radius: 16px; margin-bottom: 20px; border: 1px solid #f0f0f0; transition:0.2s; }
        .shadow-soft { box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
        
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; user-select: none; padding: 10px; border-radius: 8px; transition: 0.2s; background: #fafafa; border: 1px solid #eee; }
        .section-header:hover { background-color: #f0f7ff; border-color: #4d97ff; }
        .section-header h4 { margin: 0; font-size: 1rem; color: #333; font-weight: 700; display:flex; align-items:center; gap:10px; }
        
        .accordion-icon { transition: transform 0.3s ease; color: #999; }
        .rotate-icon { transform: rotate(180deg); color: #4d97ff; }

        /* Forms */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group { margin-bottom: 5px; }
        .form-group.full { grid-column: span 2; }
        .form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .input-modern { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; background: #fdfdfd; transition: 0.2s; }
        .input-modern:focus { border-color: #4d97ff; background: white; outline: none; box-shadow: 0 0 0 3px rgba(77,151,255,0.1); }

        /* Buttons */
        .btn-primary { background: linear-gradient(135deg, #4d97ff, #2563eb); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(77,151,255,0.3); }
        .btn-secondary { background: white; border: 2px solid #eee; color: #555; padding: 10px; border-radius: 10px; font-weight: bold; cursor: pointer; transition:0.2s; }
        .btn-secondary:hover { border-color:#4d97ff; color:#4d97ff; }
        .btn-action-small { background: #e0f2fe; color: #0284c7; border: none; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; cursor: pointer; }

        /* --- STUDENT CARDS (WIDE & COLORFUL) --- */
        /* Menggunakan 1 kolom agar lebar maksimal */
        .student-grid-wide { display: grid; gap: 20px; grid-template-columns: 1fr; }
        
        .std-card {
            border-radius: 16px; padding: 25px; color: white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            position: relative; overflow: hidden; transition: transform 0.2s;
        }
        .std-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        
        /* Variasi Warna Card */
        .variant-0 { background: linear-gradient(135deg, #4d97ff, #2563eb); } /* Blue */
        .variant-1 { background: linear-gradient(135deg, #ffab19, #f59e0b); } /* Orange */
        .variant-2 { background: linear-gradient(135deg, #00b894, #00a884); } /* Green */
        .variant-3 { background: linear-gradient(135deg, #a55eea, #8854d0); } /* Purple */

        .std-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 15px; }
        .std-name { font-family: 'Fredoka One', cursive; font-size: 1.4rem; letter-spacing: 0.5px; }
        
        /* Input dalam Card Putih Transparan */
        .std-body select { 
            width: 100%; padding: 12px; border-radius: 10px; border: none; 
            background: rgba(255,255,255,0.95); color: #333; font-weight: bold; font-size: 0.9rem;
            margin-bottom: 5px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .trophy-row { 
            background: rgba(0,0,0,0.2); padding: 10px 15px; border-radius: 10px; 
            margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;
        }
        .trophy-label { font-size: 0.9rem; font-weight: 600; color:white; }
        .trophy-icon { font-size: 1.6rem; cursor: pointer; transition: 0.2s; color: rgba(255,255,255,0.4); }
        .trophy-icon.bronze { color: #cd7f32; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5)); opacity:1; }
        .trophy-icon.silver { color: #e0e0e0; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5)); opacity:1; }
        .trophy-icon.gold   { color: #ffd700; filter: drop-shadow(0 0 5px orange); transform: scale(1.2); opacity:1; }

        .std-note { width: 100%; padding: 12px; border-radius: 10px; border: none; background: rgba(255,255,255,0.95); margin-top: 15px; font-family: inherit; resize: vertical; }
        .btn-save-std { width: 100%; margin-top: 15px; padding: 12px; border-radius: 10px; border: none; background: rgba(0,0,0,0.25); color: white; font-weight: bold; cursor: pointer; font-size: 1rem; border: 1px solid rgba(255,255,255,0.3); }
        .btn-save-std:hover { background: rgba(0,0,0,0.4); }

        /* History Cards (Juga Warna-Warni) */
        .history-grid-wide { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
        .history-card-color {
            padding: 20px; border-radius: 16px; color: white; cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: transform 0.2s;
            position: relative; overflow: hidden;
        }
        .history-card-color:hover { transform: translateY(-5px); }
        
        .full { width: 100%; }
        .margin-top { margin-top: 15px; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        
        .suggestion-box { position: absolute; width: 100%; background: white; border: 1px solid #eee; border-radius: 0 0 8px 8px; max-height: 200px; overflow-y: auto; z-index: 50; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .suggestion-item { padding: 12px; cursor: pointer; font-size: 0.95rem; border-bottom: 1px solid #f9f9f9; }
        .suggestion-item:hover { background: #f0f7ff; color: #4d97ff; }
        
        .preview-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 10px; margin-top: 15px; min-height: 40px; }
        .target-item-row { display: flex; justify-content: space-between; align-items: center; background: white; padding: 10px; margin-bottom: 8px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.95rem; }

        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .form-group.full { grid-column: span 1; } }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC CORE
// ==========================================

async function setupLogic() {
    document.getElementById('tglPertemuan').valueAsDate = new Date();
    
    await Promise.all([ fetchTeachers(), fetchStudents() ]);
    await loadHistory();
    await loadLastSession();

    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('btn-back').onclick = () => window.dispatchModuleLoad?.('absensi-private', 'Absensi Private', 'List');
    
    // Accordion dengan Tombol Fisik
    document.getElementById("head-setup").onclick = (e) => {
        if(e.target.closest('#btn-reset-mode')) return; // Jangan trigger kalau klik tombol reset
        toggleAccordion("setup-form", "icon-setup");
    };
    document.getElementById("head-target").onclick = () => toggleAccordion("target-container", "icon-target");

    // Reset Mode
    document.getElementById("btn-reset-mode").onclick = resetToNewMode;

    // Save Logic
    document.getElementById("btnSimpanSesi").onclick = savePertemuan;
    
    // Target Logic
    setupMainAchSearch();
    document.getElementById("btnAddAch").onclick = addAchievementToTarget;
    document.getElementById("btnSimpanTarget").onclick = saveTargetAch;
    
    document.getElementById("btnTambahLagi").onclick = () => {
        document.getElementById("input-target-area").style.display = 'block';
        document.getElementById("btnSimpanTarget").style.display = 'block';
        document.getElementById("btnTambahLagi").style.display = 'none';
        resetSmartInput();
    };
    
    document.getElementById("btnToggleManual").onclick = toggleManualSub;
}

// ==========================================
// 4. DATABASE FUNCTIONS (SUPABASE)
// ==========================================

async function fetchTeachers() {
    const { data } = await supabase.from('teachers').select('id, name').order('name');
    const sel = document.getElementById('pilihGuru');
    sel.innerHTML = '<option value="">-- Pilih Guru --</option>' + 
        (data || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

async function fetchStudents() {
    const { data } = await supabase.from('students_private').select('id, name').eq('class_id', classId).order('name');
    studentList = data || [];
}

async function loadLastSession() {
    const { data } = await supabase.from('pertemuan_private')
        .select(`id, tanggal, teacher_id, materi_private (id, judul)`)
        .eq('class_id', classId)
        .order('tanggal', { ascending: false }).limit(1).maybeSingle();
}

async function loadHistory() {
    const grid = document.getElementById('historyGrid');
    const { data } = await supabase.from('pertemuan_private')
        .select(`id, tanggal, teacher_id, materi_private(judul)`)
        .eq('class_id', classId)
        .order('tanggal', {ascending:false}).limit(6);
    
    if(!data || !data.length) {
        grid.innerHTML = '<div style="color:#ccc; text-align:center; grid-column:1/-1;">Belum ada riwayat.</div>';
        return;
    }

    grid.innerHTML = data.map((item, index) => `
        <div class="history-card-color variant-${index % 4}" onclick="window.loadSessionForEdit('${item.id}')">
            <div style="font-weight:bold; font-size:1.1rem; opacity:0.9;">
                <i class="fas fa-calendar-alt"></i> ${new Date(item.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}
            </div>
            <div style="font-size:1.1rem; font-weight:700; margin-top:8px;">
                ${item.materi_private?.judul || 'Tanpa Judul'}
            </div>
            <div style="font-size:0.8rem; margin-top:15px; text-align:right; opacity:0.8;">
                Klik untuk detail <i class="fas fa-arrow-right"></i>
            </div>
        </div>
    `).join('');
}

// --- SAVE SESSION ---
async function savePertemuan() {
    const tgl = document.getElementById('tglPertemuan').value;
    const guru = document.getElementById('pilihGuru').value; 
    const materiText = document.getElementById('materiUtama').value.trim();

    if (!tgl || !materiText) return alert("⚠️ Isi Tanggal & Materi!");

    const btn = document.getElementById('btnSimpanSesi');
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Menyimpan..."; 
    btn.disabled = true;

    try {
        let materiId = null;
        const { data: existM } = await supabase.from('materi_private')
            .select('id').eq('judul', materiText).eq('level_id', levelId).maybeSingle();
        
        if (existM) {
            materiId = existM.id;
        } else {
            const { data: newM } = await supabase.from('materi_private')
                .insert({ judul: materiText, level_id: levelId }).select('id').single();
            materiId = newM.id;
        }

        const payload = { 
            class_id: classId, 
            tanggal: tgl, 
            teacher_id: guru || null, 
            materi_id: materiId 
        };
        
        if (currentSessionId) {
            await supabase.from('pertemuan_private').update(payload).eq('id', currentSessionId);
        } else {
            const { data: newS } = await supabase.from('pertemuan_private').insert(payload).select('id').single();
            currentSessionId = newS.id;
        }

        updateSessionStatus("AKTIF", true);
        document.getElementById("btn-reset-mode").style.display = 'block';
        
        forceCloseAccordion("setup-form", "icon-setup");
        forceOpenAccordion("target-container", "icon-target");
        
        loadHistory();

    } catch (e) { alert("Error: " + e.message); } 
    finally { 
        btn.innerHTML = '<i class="fas fa-check"></i> SESI AKTIF'; 
        btn.disabled = false; 
    }
}

// --- SAVE TARGETS ---
async function saveTargetAch() {
    if (!currentSessionId) return alert("⚠️ Simpan Sesi dulu!");
    if (sessionTargets.length === 0) return alert("⚠️ List Target kosong!");

    const btn = document.getElementById('btnSimpanTarget');
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Menyimpan..."; 
    btn.disabled = true;

    try {
        for (let i = 0; i < sessionTargets.length; i++) {
            let t = sessionTargets[i];
            if (t.id) continue; 

            let achId = null;
            const { data: existParent } = await supabase.from('achievement_private')
                .select('id').eq('main_achievement', t.main).eq('level_id', levelId).maybeSingle();
            
            if (existParent) {
                achId = existParent.id;
            } else {
                const { data: newAch } = await supabase.from('achievement_private')
                    .insert({ main_achievement: t.main, sub_achievement: t.sub, level_id: levelId }).select('id').single();
                achId = newAch.id;
            }

            const { data: existLink } = await supabase.from('achievement_target')
                .select('id').eq('pertemuan_id', currentSessionId).eq('achievement_id', achId).eq('catatan', t.sub).maybeSingle();

            if (!existLink) {
                await supabase.from('achievement_target').insert({ pertemuan_id: currentSessionId, achievement_id: achId, catatan: t.sub });
            }
            sessionTargets[i].id = achId;
        }

        forceCloseAccordion("target-container", "icon-target");
        document.getElementById('input-target-area').style.display = 'none';
        document.getElementById('btnSimpanTarget').style.display = 'none';
        document.getElementById('btnTambahLagi').style.display = 'block';
        
        renderTargetListUI();
        renderStudentCards();
        document.getElementById('monitoringSection').style.display = 'block';

    } catch (e) { alert("Error Target: " + e.message); } 
    finally { 
        btn.innerHTML = '<i class="fas fa-save"></i> SIMPAN TARGET KE DATABASE'; 
        btn.disabled = false; 
    }
}

// --- SAVE INDIVIDUAL ---
window.saveMonitoringIndividual = async (studentId) => {
    if (!currentSessionId) return alert("⚠️ Sesi belum aktif!");
    const unsaved = sessionTargets.some(t => !t.id);
    if(unsaved) await saveTargetAch();

    const btn = document.getElementById(`btn-save-${studentId}`);
    const oriText = btn.innerHTML;
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i>";
    
    try {
        const sikap = document.getElementById(`sikap_${studentId}`).value;
        const fokus = document.getElementById(`fokus_${studentId}`).value;
        const cat = document.getElementById(`cat_${studentId}`).value;

        const { data: exist } = await supabase.from('attendance_private').select('id')
            .eq('pertemuan_id', currentSessionId).eq('student_id', studentId).maybeSingle();
        
        const payload = { pertemuan_id: currentSessionId, student_id: studentId, sikap: parseInt(sikap), fokus: parseInt(fokus), catatan: cat };
        
        if (exist) await supabase.from('attendance_private').update(payload).eq('id', exist.id);
        else await supabase.from('attendance_private').insert(payload);

        const container = document.getElementById(`starsContainer-${studentId}`);
        const rows = container.querySelectorAll('.trophy-row');
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const score = parseInt(row.getAttribute('data-score') || "0");
            const targetObj = sessionTargets[i];
            
            if (targetObj && targetObj.id) {
                const { data: existScore } = await supabase.from('achievement_pertemuan')
                    .select('id').eq('pertemuan_id', currentSessionId).eq('student_id', studentId).eq('achievement_id', targetObj.id).maybeSingle();
                
                if (existScore) await supabase.from('achievement_pertemuan').update({ indikator: score }).eq('id', existScore.id);
                else await supabase.from('achievement_pertemuan').insert({ pertemuan_id: currentSessionId, student_id: studentId, achievement_id: targetObj.id, indikator: score });
            }
        }
        
        alert("✅ Data Tersimpan!");

    } catch (e) { alert("Error: " + e.message); }
    finally { btn.innerHTML = oriText; }
};

// ==========================================
// 5. UI RENDERERS (FULL WIDTH CARDS)
// ==========================================

function renderStudentCards() {
    const container = document.getElementById('studentContainer');
    container.innerHTML = "";
    if (studentList.length === 0) return container.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>Belum ada siswa di kelas ini.</div>";

    studentList.forEach((s, index) => {
        const savedData = attendanceMap[s.id] || {}; 
        const sikapVal = savedData.sikap ? String(savedData.sikap) : "3";
        const fokusVal = savedData.fokus ? String(savedData.fokus) : "2";
        const variantClass = `variant-${index % 4}`;

        const trophyHTML = sessionTargets.length === 0 ? 
            `<div style="text-align:center; color:rgba(255,255,255,0.7); font-size:0.85rem;">Belum ada target</div>` :
            sessionTargets.map((target, idx) => `
                <div class="trophy-row" data-score="0" data-ach-id="${target.id || ''}">
                    <span style="flex:1; padding-right:10px; font-size:0.9rem;">${target.sub}</span>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span class="score-label" style="font-size:0.75rem; opacity:0.8;">Belum</span>
                        <i class="fas fa-trophy trophy-icon" onclick="window.toggleTrophy(this)"></i>
                    </div>
                </div>
            `).join('');

        container.innerHTML += `
            <div class="std-card ${variantClass}">
                <div class="std-header">
                    <i class="fas fa-user-astronaut" style="font-size:1.8rem;"></i>
                    <div class="std-name">${s.name}</div>
                </div>
                
                <div class="std-body">
                    <div style="display:flex; gap:15px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="font-size:0.75rem; opacity:0.9; color:white; display:block; margin-bottom:3px;">SIKAP</label>
                            <select id="sikap_${s.id}">
                                <option value="5" ${sikapVal==="5"?"selected":""}>🤩 (5) Sangat Baik</option>
                                <option value="4" ${sikapVal==="4"?"selected":""}>👍 (4) Baik</option>
                                <option value="3" ${sikapVal==="3"?"selected":""}>🙂 (3) Cukup</option>
                                <option value="2" ${sikapVal==="2"?"selected":""}>🤐 (2) Kurang</option>
                                <option value="1" ${sikapVal==="1"?"selected":""}>❌ (1) Buruk</option>
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.75rem; opacity:0.9; color:white; display:block; margin-bottom:3px;">FOKUS</label>
                            <select id="fokus_${s.id}">
                                <option value="3" ${fokusVal==="3"?"selected":""}>🔥 (3) Penuh</option>
                                <option value="2" ${fokusVal==="2"?"selected":""}>🙂 (2) Biasa</option>
                                <option value="1" ${fokusVal==="1"?"selected":""}>😵 (1) Tidak Fokus</option>
                            </select>
                        </div>
                    </div>

                    <div id="starsContainer-${s.id}" style="margin-top:10px;">${trophyHTML}</div>
                    
                    <textarea id="cat_${s.id}" class="std-note" rows="2" placeholder="Catatan khusus...">${savedData.catatan || ""}</textarea>
                    
                    <button id="btn-save-${s.id}" onclick="saveMonitoringIndividual('${s.id}')" class="btn-save-std">
                        <i class="fas fa-save"></i> SIMPAN NILAI
                    </button>
                </div>
            </div>
        `;
        
        setTimeout(() => rehydrateIconValues(s.id), 100);
    });
}

// --- TROPHY LOGIC ---
window.toggleTrophy = (el) => {
    const row = el.closest('.trophy-row');
    let score = parseInt(row.getAttribute('data-score') || "0");
    score = (score + 1) % 4; // Cycle 0-3
    row.setAttribute('data-score', score);
    updateIconVisual(el, score);
};

function updateIconVisual(el, score) {
    const row = el.closest('.trophy-row');
    const label = row.querySelector('.score-label');
    el.classList.remove('bronze', 'silver', 'gold');
    let text = "Belum";
    if (score === 1) { el.classList.add('bronze'); text = "Cukup"; }
    else if (score === 2) { el.classList.add('silver'); text = "Baik"; }
    else if (score === 3) { el.classList.add('gold'); text = "Mahir"; }
    if(label) label.innerText = text;
}

function rehydrateIconValues(studentId) {
    const container = document.getElementById(`starsContainer-${studentId}`);
    if (!container) return;
    const rows = container.querySelectorAll('.trophy-row');
    rows.forEach((row, index) => {
        const targetObj = sessionTargets[index];
        if (!targetObj || !targetObj.id) return;
        const key = `${studentId}_${targetObj.id}`;
        const savedScore = achievementScoreMap[key]; 
        if (savedScore) {
            row.setAttribute('data-score', savedScore);
            const icon = row.querySelector('.trophy-icon');
            updateIconVisual(icon, parseInt(savedScore));
        }
    });
}

// ==========================================
// 6. HELPER & UTILS
// ==========================================

window.loadSessionForEdit = async (sessionId) => {
    if(currentSessionId && !confirm("Pindah ke sesi ini?")) return;
    
    currentSessionId = sessionId;
    sessionTargets = [];
    attendanceMap = {};
    achievementScoreMap = {};

    try {
        const { data } = await supabase.from('pertemuan_private').select('*, materi_private(judul)').eq('id', sessionId).single();
        if(data) {
            document.getElementById('tglPertemuan').value = data.tanggal;
            if(data.teacher_id) document.getElementById('pilihGuru').value = String(data.teacher_id);
            document.getElementById('materiUtama').value = data.materi_private?.judul || "";
            updateSessionStatus("EDIT MODE", true);
            document.getElementById("btn-reset-mode").style.display = 'block';
            forceOpenAccordion("setup-form", "icon-setup");
        }

        const { data: targets } = await supabase.from('achievement_target').select(`achievement_id, catatan, achievement_private(main_achievement)`).eq('pertemuan_id', sessionId);
        if(targets) {
            sessionTargets = targets.map(t => ({
                id: t.achievement_id, main: t.achievement_private?.main_achievement, sub: t.catatan
            }));
        }

        const { data: att } = await supabase.from('attendance_private').select('*').eq('pertemuan_id', sessionId);
        if(att) att.forEach(r => attendanceMap[r.student_id] = r);

        const { data: sc } = await supabase.from('achievement_pertemuan').select('*').eq('pertemuan_id', sessionId);
        if(sc) sc.forEach(r => achievementScoreMap[`${r.student_id}_${r.achievement_id}`] = r.indikator);

        document.getElementById('input-target-area').style.display = 'none';
        document.getElementById('btnSimpanTarget').style.display = 'none';
        document.getElementById('btnTambahLagi').style.display = 'block';
        
        renderTargetListUI();
        renderStudentCards();
        document.getElementById('monitoringSection').style.display = 'block';
        
        window.scrollTo({top:0, behavior:'smooth'});

    } catch(e) { console.error(e); }
};

function resetToNewMode() {
    currentSessionId = null;
    sessionTargets = [];
    attendanceMap = {};
    achievementScoreMap = {};
    
    document.getElementById('tglPertemuan').valueAsDate = new Date();
    document.getElementById('materiUtama').value = "";
    updateSessionStatus("BARU", false);
    
    document.getElementById("btn-reset-mode").style.display = 'none';
    document.getElementById("monitoringSection").style.display = 'none';
    
    document.getElementById('input-target-area').style.display = 'block';
    document.getElementById('btnSimpanTarget').style.display = 'none';
    document.getElementById('btnTambahLagi').style.display = 'none';
    
    forceOpenAccordion("setup-form", "icon-setup");
    renderTargetListUI();
}

function setupMainAchSearch() {
    const input = document.getElementById('mainAchSearch');
    const box = document.getElementById('achSuggestionBox');
    
    input.addEventListener('input', async (e) => {
        const key = e.target.value.trim();
        if(key.length < 2) { box.style.display = 'none'; return; }
        
        const { data } = await supabase.from('achievement_private')
            .select('main_achievement, sub_achievement')
            .eq('level_id', levelId).ilike('main_achievement', `%${key}%`).limit(10);
        
        if(!data || !data.length) {
            box.innerHTML = `<div class="suggestion-item" onclick="selectNewMain('${key}')">➕ Buat Baru: "${key}"</div>`;
        } else {
            const unique = {};
            data.forEach(d => {
                if(!unique[d.main_achievement]) unique[d.main_achievement] = [];
                if(d.sub_achievement) unique[d.main_achievement].push(...d.sub_achievement.split('\n'));
            });
            
            box.innerHTML = Object.entries(unique).map(([main, subs]) => `
                <div class="suggestion-item" onclick='selectMainAch("${main}", ${JSON.stringify(subs)})'>
                    <strong>${main}</strong> <small>(${subs.length} detail)</small>
                </div>
            `).join('');
        }
        box.style.display = 'block';
    });
}

window.selectMainAch = (main, subs) => {
    document.getElementById('mainAchSearch').value = main;
    document.getElementById('achSuggestionBox').style.display = 'none';
    
    const sel = document.getElementById('subAchSelect');
    document.getElementById('subAchContainer').style.display = 'block';
    
    if(subs.length) {
        sel.innerHTML = '<option value="">-- Pilih Detail --</option>' + subs.map(s=>`<option>${s}</option>`).join('');
        sel.style.display = 'block';
        document.getElementById('subAchManual').style.display = 'none';
    } else {
        toggleManualSub();
    }
};

window.selectNewMain = (main) => {
    document.getElementById('mainAchSearch').value = main;
    document.getElementById('achSuggestionBox').style.display = 'none';
    document.getElementById('subAchContainer').style.display = 'block';
    toggleManualSub();
};

function toggleManualSub() {
    document.getElementById('subAchSelect').style.display = 'none';
    document.getElementById('subAchManual').style.display = 'block';
    document.getElementById('subAchManual').focus();
}

function addAchievementToTarget() {
    const main = document.getElementById('mainAchSearch').value.trim();
    let sub = document.getElementById('subAchSelect').value;
    if(document.getElementById('subAchManual').style.display !== 'none') {
        sub = document.getElementById('subAchManual').value.trim();
    }
    
    if(!main || !sub) return alert("Lengkapi Target!");
    
    sessionTargets.push({ main, sub, id: null });
    renderTargetListUI();
    document.getElementById('btnSimpanTarget').style.display = 'block';
    
    document.getElementById('subAchManual').value = "";
    document.getElementById('subAchSelect').value = "";
    document.getElementById('subAchContainer').style.display = 'none';
    document.getElementById('mainAchSearch').value = "";
    document.getElementById('mainAchSearch').focus();
}

function renderTargetListUI() {
    const list = document.getElementById('targetList');
    if(!sessionTargets.length) return list.innerHTML = '<div style="text-align:center; color:#999;">Belum ada target.</div>';
    
    list.innerHTML = sessionTargets.map((t, i) => `
        <div class="target-item-row">
            <span><b>${t.main}</b> - ${t.sub}</span>
            <button onclick="window.removeTarget(${i})" style="border:none; color:#ef4444; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

window.removeTarget = (i) => {
    if(confirm("Hapus target?")) {
        sessionTargets.splice(i, 1);
        renderTargetListUI();
    }
};

function toggleAccordion(id, iconId) {
    const el = document.getElementById(id);
    const icon = document.getElementById(iconId);
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
    if(isHidden) icon.classList.add('rotate-icon');
    else icon.classList.remove('rotate-icon');
}

function forceOpenAccordion(id, iconId) {
    document.getElementById(id).style.display = 'block';
    document.getElementById(iconId).classList.add('rotate-icon');
}

function forceCloseAccordion(id, iconId) {
    document.getElementById(id).style.display = 'none';
    document.getElementById(iconId).classList.remove('rotate-icon');
}

function updateSessionStatus(text, isActive) {
    const badge = document.getElementById('session-status');
    badge.textContent = text;
    badge.style.color = isActive ? '#2ecc71' : '#aaa';
    badge.style.borderColor = isActive ? '#2ecc71' : '#ddd';
}