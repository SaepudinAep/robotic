/**
 * Project: Absensi Harian Module (SPA) - FINAL MOBILE OPTIMIZED
 * Features: Table-First Flow, Tap-to-Cycle, Upsert Logic, Vibrant UI
 * Filename: modules/absensi-harian.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE MODULE ---
let selectedPertemuanId = null;
let currentTargets = []; 
let isEditMode = false;
let debounceTimer = null; // Untuk search materi

// --- KONFIGURASI DATA & IKON (TIDAK DIUBAH) ---
const CONF = {
    status: [['0','⬜'],['1','✅'],['2','❌']],
    sikap:  [['0','❌'],['1','🤐'],['2','🙈'],['3','🙂'],['4','👀'],['5','🌀']],
    fokus:  [['0','❌'],['1','😶'],['2','🙂'],['3','🔥']],
    target: [['0','❌'],['1','😶'],['2','🙂'],['3','🔥']]
};

// ==========================================
// 1. INITIALIZATION & UI STRUCTURE
// ==========================================

export async function init(canvas) {
    const classId = localStorage.getItem("activeClassId");
    if (!classId) {
        showToast("Pilih kelas terlebih dahulu!", "error");
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('absensi-sekolah');
        return;
    }

    injectStyles(); 

    canvas.innerHTML = `
        <div class="harian-container fade-in">
            <!-- Breadcrumb -->
            <nav class="breadcrumb-nav">
                <span onclick="window.dispatchModuleLoad('overview')">Home</span>
                <i class="fas fa-chevron-right separator"></i>
                <span onclick="window.dispatchModuleLoad('absensi-sekolah')">Kelas</span>
                <i class="fas fa-chevron-right separator"></i>
                <span class="current">Input Harian</span>
            </nav>

            <!-- Info Kelas -->
            <div class="class-info-card">
                <div class="info-main">
                    <div>
                        <h2 id="header-kelas" class="info-class-name">Loading...</h2>
                        <p id="header-sekolah" class="info-school-name">...</p>
                    </div>
                    <button id="btn-rekap-shortcut" class="btn-rekap-mini">
                        <i class="fas fa-chart-bar"></i> Rekap
                    </button>
                </div>
            </div>

            <!-- COMPACT ACTION GRID (Micro-Toggles) -->
            <div class="action-grid">
                <button id="toggle-form-btn" class="btn-grid-action">
                    <i class="far fa-calendar-alt"></i> Data Pertemuan
                </button>
                <button id="toggle-target-btn" class="btn-grid-action">
                    <i class="fas fa-bullseye"></i> Target Capaian
                </button>
            </div>

            <!-- Form Data Pertemuan (Hidden by Default) -->
            <div id="materi-form-container" class="hidden-panel card-blue-tint">
                <form id="materi-form" class="form-grid">
                    <div style="grid-column: span 2; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="margin:0;">📝 Edit Sesi</h4>
                        <button type="button" id="btn-new-session" class="btn-pill-blue"><i class="fas fa-plus"></i> Buat Baru</button>
                    </div>
                    <div class="form-group"><label>🎯 Level</label><select id="materi-level-filter" class="input-modern" required></select></div>
                    <div class="form-group"><label>📅 Tanggal</label><input type="date" id="materi-date" class="input-modern" required></div>
                    <div class="form-group full">
                        <label>📚 Judul Materi</label>
                        <div style="position:relative;">
                            <input type="text" id="materi-title" class="input-modern" placeholder="Cari/Ketik materi..." autocomplete="off" required>
                            <div id="materi-suggestion-box" class="suggestion-box" style="display:none;"></div>
                        </div>
                    </div>
                    <div class="form-group"><label>👨‍🏫 Guru</label><select id="materi-guru" class="input-modern" required></select></div>
                    <div class="form-group"><label>👥 Asisten</label><select id="materi-asisten" class="input-modern"></select></div>
                    <div class="form-group full margin-top">
                        <button type="submit" id="btn-submit-materi" class="btn-primary blue-grad">Simpan Data Pertemuan</button>
                    </div>
                </form>
            </div>

            <!-- Form Target (Hidden by Default) -->
            <div id="target-container" class="hidden-panel card-orange-tint">
                <h4 style="margin-bottom:10px;">🎯 Target Achievement</h4>
                <div class="form-grid">
                    <div class="form-group full">
                        <input type="text" id="input-ach-main" list="list-ach-saran" class="input-modern" placeholder="Topik Utama...">
                        <datalist id="list-ach-saran"></datalist>
                    </div>
                    <div class="form-group full">
                        <div id="sub-achievement-injector-area"></div>
                        <input type="text" id="input-ach-sub" class="input-modern" placeholder="Detail Target (Sub)...">
                    </div>
                    <div class="form-group full" style="display:flex; gap:8px;">
                        <button type="button" id="btn-add-target-ui" class="btn-secondary" style="flex:1;">➕ Tambah List</button>
                        <button type="button" id="btn-save-targets-db" class="btn-primary orange-grad" style="flex:1; margin-top:0;">Simpan Target</button>
                    </div>
                    <div id="target-list-preview" class="form-group full"></div>
                </div>
            </div>

            <!-- TABLE SECTION (MAIN FOCUS) -->
            <div class="card-section card-green-tint" id="table-section">
                
                <!-- Controls: Dropdown & Summary -->
                <div class="table-controls">
                    <select id="pertemuan-selector" class="compact-select input-modern"></select>
                    <div class="attendance-summary">
                        Hadir: <strong id="total-hadir" style="color:#166534">0</strong>
                    </div>
                </div>
                
                <!-- Table Wrapper -->
                <div class="table-wrapper">
                    <table id="absensi-table" class="absensi-table">
                        <thead>
                            <tr>
                                <th style="width:30px">No</th>
                                <th class="sticky-col">Nama Siswa</th>
                                <th style="text-align:center">H</th> <!-- Hadir -->
                                <th style="text-align:center">S</th> <!-- Sikap -->
                                <th style="text-align:center">F</th> <!-- Fokus -->
                                <!-- Target cols will be injected here -->
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="5" style="padding:30px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Memuat Data...</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Static Save Button (Bottom) -->
                <button id="simpan-absensi" class="btn-primary green-grad btn-save-static">
                    💾 Simpan Nilai
                </button>
            </div>

            <!-- History Section -->
            <div style="margin-top:30px; padding-bottom:40px;">
                <h4 class="history-title">Riwayat Pertemuan</h4>
                <div id="materi-history-list" class="history-grid"></div>
            </div>
        </div>

        <!-- Toast Notification Container -->
        <div id="toast-container"></div>
    `;

    await setupLogic();
}

// ==========================================
// 2. CSS STYLES (MOBILE OPTIMIZED)
// ==========================================
function injectStyles() {
    if (document.getElementById('absensi-mobile-css')) return;
    const s = document.createElement('style');
    s.id = 'absensi-mobile-css';
    s.textContent = `
        :root {
            --font-main: 'Poppins', sans-serif;
            --grad-blue: linear-gradient(135deg, #60a5fa, #2563eb);
            --grad-orange: linear-gradient(135deg, #fb923c, #ea580c);
            --grad-green: linear-gradient(135deg, #34d399, #059669);
            --bg-dim: #f1f5f9;
        }

        .harian-container { max-width: 600px; margin: 0 auto; padding: 15px; font-family: var(--font-main); padding-bottom: 80px; }
        
        /* HEADER INFO */
        .class-info-card { background: white; padding: 15px 20px; border-radius: 16px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .info-main { display: flex; justify-content: space-between; align-items: center; }
        .info-class-name { font-size: 1.2rem; margin: 0; font-weight: 700; color: #1e293b; }
        .info-school-name { font-size: 0.8rem; color: #64748b; margin: 0; }
        .btn-rekap-mini { background: #eff6ff; color: #2563eb; border: none; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }

        /* ACTION GRID (MICRO TOGGLES) */
        .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .btn-grid-action {
            background: white; border: 1px solid #e2e8f0; padding: 12px 5px; border-radius: 12px;
            font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; transition: 0.2s;
            display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }
        .btn-grid-action.active { background: #eff6ff; border-color: #2563eb; color: #2563eb; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
        
        /* HIDDEN PANELS */
        .hidden-panel { display: none; padding: 15px; border-radius: 16px; margin-bottom: 15px; animation: slideDown 0.3s ease-out; }
        .card-blue-tint { background: #f0f9ff; border: 1px solid #bae6fd; }
        .card-orange-tint { background: #fff7ed; border: 1px solid #fed7aa; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* TABLE SECTION */
        .card-green-tint { background: white; padding: 15px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        .table-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .attendance-summary { font-size: 0.85rem; background: #f0fdf4; padding: 6px 12px; border-radius: 8px; color: #166534; border: 1px solid #bbf7d0; }

        /* TABLE STYLING (MOBILE OPTIMIZED) */
        .table-wrapper { overflow-x: auto; margin-bottom: 20px; -webkit-overflow-scrolling: touch; }
        .absensi-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; /* Ukuran font pas untuk 20 baris */ }
        
        .absensi-table th { 
            background: #f8fafc; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 0.7rem; 
            padding: 10px 4px; border-bottom: 2px solid #e2e8f0; white-space: nowrap;
        }
        
        .absensi-table td { 
            padding: 8px 2px; border-bottom: 1px solid #f1f5f9; text-align: center; vertical-align: middle; height: 36px;
        }

        /* STICKY NAME COLUMN */
        .sticky-col {
            position: sticky; left: 0; background: white; z-index: 5; text-align: left !important;
            padding-left: 5px !important; border-right: 1px solid #f1f5f9;
            max-width: 110px; /* Batasi lebar */
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; /* Potong nama panjang */
        }
        .absensi-table th.sticky-col { z-index: 6; background: #f8fafc; }

        /* TAP CELLS (TAP-TO-CYCLE) */
        .tap-cell { 
            cursor: pointer; user-select: none; border-radius: 6px; font-size: 1.1rem; transition: background 0.2s; 
            min-width: 35px;
        }
        /* Dynamic Colors */
        .tap-cell[data-val="0"] { background: transparent; filter: grayscale(100%); opacity: 0.6; } /* Belum dinilai */
        /* Status */
        .tap-cell[data-type="status"][data-val="1"] { background: #dcfce7; } /* Hadir */
        .tap-cell[data-type="status"][data-val="2"] { background: #fee2e2; } /* Absen */
        /* Scores */
        .tap-cell[data-type="score"][data-val="1"], .tap-cell[data-type="score"][data-val="2"] { background: #ffedd5; } /* Rendah */
        .tap-cell[data-type="score"][data-val="3"], .tap-cell[data-type="score"][data-val="4"], .tap-cell[data-type="score"][data-val="5"] { background: #dbeafe; } /* Tinggi */

        /* BUTTONS & INPUTS */
        .btn-primary { width: 100%; border: none; padding: 14px; border-radius: 12px; color: white; font-weight: 700; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
        .green-grad { background: var(--grad-green); } .blue-grad { background: var(--grad-blue); } .orange-grad { background: var(--grad-orange); }
        .input-modern { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .form-group.full { grid-column: span 2; }
        
        /* HISTORY CARDS */
        .history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .history-card { padding: 12px; border-radius: 12px; color: white; cursor: pointer; transition: 0.2s; min-height: 80px; display: flex; flex-direction: column; justify-content: space-between; }
        .history-card:active { transform: scale(0.96); }
        .card-c0 { background: var(--grad-blue); } .card-c1 { background: var(--grad-orange); } .card-c2 { background: var(--grad-green); }
        
        /* TOAST */
        #toast-container { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 10px; width: 90%; max-width: 400px; }
        .toast { background: #1e293b; color: white; padding: 12px 20px; border-radius: 30px; font-size: 0.9rem; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: fadeInUp 0.3s ease-out; text-align: center; }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

        /* UTILS */
        .compact-select { max-width: 160px; padding: 6px 10px; }
    `;
    document.head.appendChild(s);
}

// ==========================================
// 3. LOGIC & DATA HANDLING
// ==========================================

async function setupLogic() {
    await renderHeader();
    await loadLevelOptions();
    await loadGuruDropdowns();
    await loadAchievementSuggestions();
    
    // SETUP EVENTS (Toggle, Input, dll)
    setupEvents();

    // TABLE-FIRST STRATEGY: Cari pertemuan terakhir
    const { data: latest } = await supabase.from("pertemuan_kelas")
        .select("id")
        .eq("class_id", localStorage.getItem("activeClassId"))
        .order("tanggal", {ascending:false})
        .limit(1)
        .maybeSingle();

    if (latest) {
        // Jika ada, muat sesi penuh (Table, Form tersembunyi, History)
        await loadSesiPenuh(latest.id);
    } else {
        // Jika belum ada sama sekali, buka form baru
        resetFormMateri();
        toggleFormPanel('materi-form-container', 'toggle-form-btn'); // Buka form
    }
}

function setupEvents() {
    // 1. Grid Action Buttons (Micro Toggles)
    document.getElementById("toggle-form-btn").onclick = () => toggleFormPanel('materi-form-container', 'toggle-form-btn');
    document.getElementById("toggle-target-btn").onclick = () => toggleFormPanel('target-container', 'toggle-target-btn');
    
    // 2. Button "Buat Baru"
    document.getElementById("btn-new-session").onclick = () => {
        resetFormMateri();
        showToast("Mode Input Pertemuan Baru");
    };

    // 3. Debounce Search Materi
    document.getElementById("materi-title").addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            loadMateriSuggestions(e.target.value.trim(), document.getElementById("materi-level-filter").value);
        }, 300); // Tunggu 300ms
    });

    // 4. Achievement Logic
    document.getElementById("btn-add-target-ui").onclick = addTargetToUI;
    document.getElementById("btn-save-targets-db").onclick = saveTargetsToDB;
    document.getElementById("input-ach-main").onchange = async (e) => {
        const val = e.target.value;
        if(!val) return;
        const { data } = await supabase.from("achievement_sekolah").select("sub_achievement").ilike("main_achievement", val);
        if (data && data.length) {
            const subs = [...new Set(data.map(d => d.sub_achievement).filter(Boolean))];
            renderSubSelector(val, subs);
        }
    };

    // 5. Submit Handling
    document.getElementById("materi-form").onsubmit = handleMateriSubmit;
    document.getElementById("simpan-absensi").onclick = handleAbsensiSubmit;

    // 6. Dropdown Sync
    document.getElementById("pertemuan-selector").onchange = (e) => {
        if(e.target.value) loadSesiPenuh(e.target.value);
    };

    // 7. TAP-TO-CYCLE DELEGATION (Inti Interaksi Tabel)
    document.querySelector("#absensi-table tbody").addEventListener("click", (e) => {
        const cell = e.target.closest(".tap-cell");
        if (!cell) return;
        
        const type = cell.dataset.type; // status, score
        const currentVal = parseInt(cell.dataset.val);
        let nextVal = 0;
        let iconChar = '';
        let options = [];

        // Tentukan Cycle
        if (type === 'status') options = CONF.status;
        else if (type === 'sikap') options = CONF.sikap;
        else options = CONF.fokus; // Fokus & Target sama siklusnya

        // Cari index sekarang dan next
        const idx = options.findIndex(o => o[0] == currentVal);
        const nextIdx = (idx + 1) % options.length;
        [nextVal, iconChar] = options[nextIdx];

        // Update DOM (Visual)
        cell.dataset.val = nextVal;
        cell.innerHTML = iconChar;
        
        // Update Total Hadir Realtime
        if(type === 'status') updateTotalHadir();
    });
}

// --- CORE FUNCTION: LOAD FULL SESSION ---
async function loadSesiPenuh(pertemuanId) {
    selectedPertemuanId = pertemuanId;
    isEditMode = true;

    // 1. Tampilkan Loading di Tabel
    const tbody = document.querySelector("#absensi-table tbody");
    tbody.innerHTML = `<tr><td colspan="100%" style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#2563eb; margin-bottom:10px;"></i><br>Mengambil Data...</td></tr>`;

    // 2. Ambil Detail Pertemuan (Untuk Form Tersembunyi)
    const { data: detail } = await supabase.from("pertemuan_kelas").select("*, materi(title, level_id)").eq("id", pertemuanId).single();
    if (detail) {
        document.getElementById("materi-date").value = detail.tanggal;
        document.getElementById("materi-title").value = detail.materi?.title || "";
        document.getElementById("materi-level-filter").value = detail.materi?.level_id || "";
        document.getElementById("materi-guru").value = detail.guru_id;
        document.getElementById("materi-asisten").value = detail.asisten_id || "";
    }

    // 3. Load Dropdown & History (Sync)
    await loadPertemuanOptions();
    await tampilkanDaftarMateri();
    document.getElementById("pertemuan-selector").value = pertemuanId; // Sync Dropdown

    // 4. Render Tabel Absensi
    await initTable(pertemuanId);
}

// --- TABLE RENDER LOGIC ---
async function initTable(pertemuanId) {
    const classId = localStorage.getItem("activeClassId");

    // Fetch Paralel (Students, Attendance, Targets, Scores)
    const [resS, resA, resT, resScores] = await Promise.all([
        supabase.from("students").select("id, name").eq("class_id", classId).eq("is_active", true).order("name"),
        supabase.from("attendance").select("*").eq("pertemuan_id", pertemuanId),
        supabase.from("achievement_kelas").select(`id, achievement_sekolah (main_achievement)`).eq("pertemuan_id", pertemuanId).order("id"),
        supabase.from("achievement_siswa").select("*").eq("pertemuan_id", pertemuanId)
    ]);

    const students = resS.data || [];
    const absensi = resA.data || [];
    const targets = resT.data || [];
    const scores = resScores.data || [];

    // Map Scores
    const scoreMap = {};
    scores.forEach(s => scoreMap[`${s.student_id}_${s.achievement_kelas_id}`] = s.score);

    // Update Global Targets
    currentTargets = targets.map(t => ({ id: t.id, main: t.achievement_sekolah?.main_achievement || "?" }));
    renderTargetListUI();

    // Build Header
    let hHtml = `<tr><th style="width:30px">No</th><th class="sticky-col">Nama Siswa</th><th style="text-align:center">H</th><th style="text-align:center">S</th><th style="text-align:center">F</th>`;
    currentTargets.forEach((t, i) => hHtml += `<th style="text-align:center" title="${t.main}">T${i+1}</th>`);
    document.querySelector("#absensi-table thead").innerHTML = hHtml + "</tr>";

    // Build Body (Tap Cells)
    const tbody = document.querySelector("#absensi-table tbody");
    tbody.innerHTML = students.map((s, i) => {
        const att = absensi.find(a => a.student_id === s.id) || { status:0, sikap:0, fokus:0 }; // Default 0
        
        let row = `<tr data-sid="${s.id}">
            <td>${i+1}</td>
            <td class="sticky-col" onclick="alert('${s.name}')">${s.name}</td> <!-- Click name to see full -->
            
            <!-- Status -->
            <td class="tap-cell" data-type="status" data-val="${att.status}">
                ${getIcon(CONF.status, att.status)}
            </td>
            <!-- Sikap -->
            <td class="tap-cell" data-type="sikap" data-val="${att.sikap}">
                ${getIcon(CONF.sikap, att.sikap)}
            </td>
            <!-- Fokus -->
            <td class="tap-cell" data-type="fokus" data-val="${att.fokus}">
                ${getIcon(CONF.fokus, att.fokus)}
            </td>`;
        
        // Targets
        currentTargets.forEach(t => {
            const sc = scoreMap[`${s.id}_${t.id}`] || 0;
            row += `<td class="tap-cell" data-type="score" data-target-id="${t.id}" data-val="${sc}">
                ${getIcon(CONF.target, sc)}
            </td>`;
        });
        
        return row + "</tr>";
    }).join("");

    updateTotalHadir();
}

// --- DATA SAVING (UPSERT) ---
async function handleAbsensiSubmit() {
    if(!selectedPertemuanId) return showToast("Pilih pertemuan dulu!", "error");
    
    const btn = document.getElementById("simpan-absensi");
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menyimpan...`;
    
    const attBatch = [];
    const scoreBatch = [];
    const tgl = document.getElementById("materi-date").value;
    const classId = localStorage.getItem("activeClassId");

    document.querySelectorAll("#absensi-table tbody tr").forEach(tr => {
        const sid = tr.dataset.sid;
        
        // Collect Status/Sikap/Fokus
        attBatch.push({
            pertemuan_id: selectedPertemuanId, student_id: sid, tanggal: tgl,
            status: tr.children[2].dataset.val,
            sikap: tr.children[3].dataset.val,
            fokus: tr.children[4].dataset.val
        });

        // Collect Targets
        for(let i=5; i<tr.children.length; i++) {
            const td = tr.children[i];
            const tid = td.dataset.targetId;
            if(tid) {
                scoreBatch.push({
                    pertemuan_id: selectedPertemuanId, student_id: sid, class_id: classId,
                    achievement_kelas_id: tid, score: td.dataset.val
                });
            }
        }
    });

    try {
        // UPSERT ATTENDANCE (Aman untuk koneksi putus nyambung)
        const { error: errA } = await supabase.from("attendance").upsert(attBatch, { onConflict: 'pertemuan_id, student_id' });
        if(errA) throw errA;

        // UPSERT SCORES
        if(scoreBatch.length > 0) {
            const { error: errS } = await supabase.from("achievement_siswa").upsert(scoreBatch, { onConflict: 'pertemuan_id, student_id, achievement_kelas_id' });
            if(errS) throw errS;
        }

        showToast("✅ Data Nilai Berhasil Disimpan!");
        loadSesiPenuh(selectedPertemuanId); // Refresh untuk memastikan
    } catch (e) {
        showToast("Gagal menyimpan: " + e.message, "error");
    } finally {
        btn.innerHTML = oriText;
    }
}

// --- HELPER FUNCTIONS ---
function getIcon(arr, val) {
    const item = arr.find(x => x[0] == val);
    return item ? item[1] : arr[0][1];
}

function showToast(msg, type='success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.border = type === 'error' ? '1px solid #ef4444' : 'none';
    el.innerHTML = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function toggleFormPanel(panelId, btnId) {
    const p = document.getElementById(panelId);
    const b = document.getElementById(btnId);
    const isHidden = p.style.display === 'none' || p.style.display === '';
    
    // Reset others
    document.querySelectorAll('.hidden-panel').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.btn-grid-action').forEach(el => el.classList.remove('active'));

    if (isHidden) {
        p.style.display = 'block';
        b.classList.add('active');
    }
}

function updateTotalHadir() {
    const count = document.querySelectorAll('.tap-cell[data-type="status"][data-val="1"]').length;
    document.getElementById("total-hadir").textContent = count;
}

function resetFormMateri() {
    isEditMode = false; selectedPertemuanId = null;
    document.getElementById("materi-form").reset();
    document.getElementById("materi-date").valueAsDate = new Date();
    currentTargets = [];
    renderTargetListUI();
    // Tabel kosong
    document.querySelector("#absensi-table tbody").innerHTML = `<tr><td colspan="100%" style="padding:20px; text-align:center;">Form Pertemuan Baru Siap Diisi. Simpan dulu untuk input nilai.</td></tr>`;
}

// --- LOADERS & DROPDOWNS ---
async function renderHeader() {
    const classId = localStorage.getItem("activeClassId");
    const { data } = await supabase.from("classes").select(`name, schools(name, id)`).eq("id", classId).single();
    if (data) {
        document.getElementById("header-kelas").textContent = data.name;
        document.getElementById("header-sekolah").textContent = data.schools?.name;
        localStorage.setItem("activeSchoolId", data.schools?.id || "");
    }
}
async function loadLevelOptions() {
    const { data } = await supabase.from("levels").select("id, kode").order("kode");
    const s = document.getElementById("materi-level-filter"); s.innerHTML='<option value="">Level</option>';
    (data||[]).forEach(l=>s.add(new Option(l.kode, l.id)));
}
async function loadGuruDropdowns() {
    const { data } = await supabase.from("teachers").select("id, name").order("name");
    const g = document.getElementById("materi-guru"), a = document.getElementById("materi-asisten");
    g.innerHTML='<option value="">Guru</option>'; a.innerHTML='<option value="">Asisten</option>';
    (data||[]).forEach(t=>{ g.add(new Option(t.name, t.id)); a.add(new Option(t.name, t.id)); });
}
async function loadAchievementSuggestions() {
    const { data } = await supabase.from("achievement_sekolah").select("main_achievement");
    if(data) document.getElementById("list-ach-saran").innerHTML = [...new Set(data.map(i=>i.main_achievement))].map(v=>`<option value="${v}">`).join("");
}
async function loadPertemuanOptions() {
    const { data } = await supabase.from("pertemuan_kelas").select("id, tanggal, materi(title)").eq("class_id", localStorage.getItem("activeClassId")).order("tanggal", {ascending:false});
    const s = document.getElementById("pertemuan-selector"); s.innerHTML='<option value="">-- Pilih Sesi --</option>';
    (data||[]).forEach(p=>s.add(new Option(`${new Date(p.tanggal).toLocaleDateString('id-ID')} - ${p.materi?.title?.substring(0,15)}...`, p.id)));
}
async function tampilkanDaftarMateri() {
    const { data } = await supabase.from("pertemuan_kelas").select("id, tanggal, materi(title)").eq("class_id", localStorage.getItem("activeClassId")).order("tanggal", {ascending:false});
    const div = document.getElementById("materi-history-list");
    if(!data.length) { div.innerHTML='<div style="font-size:0.8rem; color:#ccc;">Belum ada riwayat.</div>'; return; }
    
    div.innerHTML = data.map((p,i) => `
        <div class="history-card card-c${i%3}" onclick="window.historyClick('${p.id}')">
            <div style="font-weight:700; font-size:0.9rem;">${new Date(p.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</div>
            <div style="font-size:0.8rem; opacity:0.9; line-height:1.2;">${p.materi?.title || 'No Title'}</div>
        </div>
    `).join("");
}
window.historyClick = (id) => {
    loadSesiPenuh(id);
    document.getElementById("table-section").scrollIntoView({behavior:"smooth"});
};

// --- SEARCH & TARGET LOGIC ---
async function loadMateriSuggestions(kw, lid) {
    const box = document.getElementById("materi-suggestion-box");
    if(!lid || kw.length<2) { box.style.display="none"; return; }
    const { data } = await supabase.from("materi").select("title").eq("level_id", lid).ilike("title", `%${kw}%`).limit(5);
    if(data?.length) {
        box.innerHTML = data.map(m => `<div onclick="document.getElementById('materi-title').value='${m.title}'; this.parentElement.style.display='none';" style="padding:10px; border-bottom:1px solid #eee;">${m.title}</div>`).join("");
        box.style.display="block";
    } else box.style.display="none";
}
async function handleMateriSubmit(e) {
    e.preventDefault();
    const btn=document.getElementById("btn-submit-materi"); btn.innerText="Saving...";
    // (Logic simpan materi sama seperti sebelumnya, disederhanakan)
    const title = document.getElementById("materi-title").value.trim();
    const lid = document.getElementById("materi-level-filter").value;
    try {
        let {data:m} = await supabase.from("materi").select("id").eq("level_id",lid).ilike("title",title).maybeSingle();
        if(!m) { const res = await supabase.from("materi").insert({title, level_id:lid}).select().single(); m=res.data; }
        
        const payload = {
            class_id: localStorage.getItem("activeClassId"), school_id: localStorage.getItem("activeSchoolId"),
            tanggal: document.getElementById("materi-date").value, materi_id: m.id,
            guru_id: document.getElementById("materi-guru").value, asisten_id: document.getElementById("materi-asisten").value || null
        };

        if(isEditMode && selectedPertemuanId) await supabase.from("pertemuan_kelas").update(payload).eq("id", selectedPertemuanId);
        else { const res = await supabase.from("pertemuan_kelas").insert(payload).select().single(); selectedPertemuanId = res.data.id; }
        
        showToast("Data Pertemuan Tersimpan!");
        toggleFormPanel('materi-form-container', 'toggle-form-btn'); // Tutup form
        toggleFormPanel('target-container', 'toggle-target-btn'); // Buka target (Workflow)
        loadSesiPenuh(selectedPertemuanId);
    } catch(err) { showToast(err.message, 'error'); } 
    finally { btn.innerText = "Simpan Data Pertemuan"; }
}
function addTargetToUI() {
    const m=document.getElementById("input-ach-main").value, s=document.getElementById("input-ach-sub").value;
    if(m && s) { currentTargets.push({main:m, sub:s, id:null}); renderTargetListUI(); document.getElementById("input-ach-sub").value=""; }
}
function renderTargetListUI() {
    document.getElementById("target-list-preview").innerHTML = currentTargets.map((t,i)=>
        `<div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee; font-size:0.8rem;"><span><b>T${i+1}:</b> ${t.main}</span> <span onclick="window.delTarget(${i})" style="color:red; cursor:pointer;">&times;</span></div>`
    ).join("");
}
window.delTarget = async (i) => {
    if(currentTargets[i].id) await supabase.from("achievement_kelas").delete().eq("id", currentTargets[i].id);
    currentTargets.splice(i,1); renderTargetListUI(); loadSesiPenuh(selectedPertemuanId);
};
async function saveTargetsToDB() {
    if(!selectedPertemuanId) return showToast("Simpan pertemuan dulu!", "error");
    for(let t of currentTargets) {
        if(t.id) continue;
        let mid;
        let {data:ex} = await supabase.from("achievement_sekolah").select("id").ilike("main_achievement", t.main).ilike("sub_achievement", t.sub).maybeSingle();
        if(ex) mid=ex.id; else { const {data:n} = await supabase.from("achievement_sekolah").insert({main_achievement:t.main, sub_achievement:t.sub}).select().single(); mid=n.id; }
        await supabase.from("achievement_kelas").insert({pertemuan_id:selectedPertemuanId, class_id:localStorage.getItem("activeClassId"), achievement_sekolah_id:mid});
    }
    showToast("Target Disimpan!");
    toggleFormPanel('target-container', 'toggle-target-btn'); // Tutup form target
    loadSesiPenuh(selectedPertemuanId); // Refresh table
}
function renderSubSelector(m,subs){ document.getElementById("sub-achievement-injector-area").innerHTML=`<select onchange="document.getElementById('input-ach-sub').value=this.value" class="input-modern" style="margin-bottom:5px;"><option value="">Pilih Sub...</option>${subs.map(s=>`<option>${s}</option>`).join('')}</select>`; }