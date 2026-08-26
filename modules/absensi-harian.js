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
let isDirty = false;      // Flag: ada perubahan nilai yang belum disimpan
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
                <button id="btn-silabus-modal" class="btn-grid-action">
                    <i class="fas fa-book-open"></i> Silabus Ringkas
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
                    <div class="form-group"><label>📦 Sub-Level / Kit</label><select id="materi-sub-level-filter" class="input-modern"><option value="">-- Sub-Level --</option></select></div>
                    <div class="form-group"><label>📅 Tanggal</label><input type="date" id="materi-date" class="input-modern" required></div>
                    <div class="form-group full">
                        <label>📚 Judul Materi</label>
                        <div style="position:relative;">
                            <input type="text" id="materi-title" class="input-modern" placeholder="Cari/Ketik materi..." autocomplete="off" required>
                            <div id="materi-suggestion-box" class="suggestion-box" style="display:none;"></div>
                        </div>
                        <!-- Badge status judul: BARU / TERDAFTAR -->
                        <div id="materi-status-badge" class="materi-status hidden"></div>
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

        <!-- MODAL SILABUS RINGKAS (rangkuman materi sub-level) -->
        <div id="silabus-overlay" class="silabus-overlay" style="display:none;">
            <div class="silabus-modal">
                <div class="silabus-head">
                    <div>
                        <h4 style="margin:0; display:flex; align-items:center; gap:8px; color:#1e293b;">
                            <i class="fas fa-book-open" style="color:#4d97ff;"></i> Silabus Pertemuan
                        </h4>
                        <div id="silabus-subtitle" style="font-size:0.75rem; color:#64748b; margin-top:3px;">...</div>
                    </div>
                    <button id="silabus-modal-close" class="silabus-close" title="Tutup">&times;</button>
                </div>
                <div id="silabus-progress" style="padding:0 16px;"></div>
                <div id="silabus-list" class="silabus-list"></div>
                <div class="silabus-foot" style="padding:8px 16px; border-top:1px solid #eef2f7; font-size:0.72rem; color:#94a3b8;">
                    Murni alat bantu lihat — urutan mengikuti Silabus Kurikulum.
                </div>
            </div>
        </div>

        <!-- Bottom Sheet Detail Siswa -->
        <div id="student-sheet">
            <div class="sheet-overlay" id="sheet-overlay"></div>
            <div class="sheet-panel" id="sheet-panel"></div>
        </div>
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

        /* SUGGESTION BOX (DB-DRIVEN + LEVEL BADGE) */
        .suggestion-box {
            position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
            background: white; border: 1px solid #e2e8f0; border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.12); overflow: hidden; margin-top: 4px;
        }
        .suggestion-header { padding: 7px 12px; font-size: 0.68rem; color:#64748b; background:#f8fafc; border-bottom:1px solid #eef2f7; text-transform:uppercase; letter-spacing:0.4px; }
        .suggestion-item { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:11px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.15s; }
        .suggestion-item:last-child { border-bottom:none; }
        .suggestion-item:hover, .suggestion-item:active { background:#eff6ff; }
        .sugg-title { font-size:0.85rem; color:#1e293b; font-weight:500; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sugg-badge { font-size:0.62rem; font-weight:700; color:#2563eb; background:#dbeafe; padding:3px 8px; border-radius:20px; white-space:nowrap; flex-shrink:0; }
        .suggestion-hint { padding:10px 12px; font-size:0.75rem; color:#94a3b8; }

        /* STATUS BADGE JUDUL MATERI */
        .materi-status { display:inline-flex; align-items:center; gap:6px; margin-top:7px; padding:5px 12px; border-radius:20px; font-size:0.68rem; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; animation:fadeInQuick 0.25s ease-out; }
        .materi-status.is-new { background:#fef3c7; color:#b45309; border:1px solid #fde68a; }
        .materi-status.is-existing { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
        .materi-status.hidden { display:none; }

        /* GRADE MINI BADGE (di kolom nama) */
        .grade-mini { display:block; font-size:0.6rem; color:#94a3b8; font-weight:700; letter-spacing:0.3px; margin-top:1px; }
        .student-name-cell { cursor:pointer; }

        /* SAVE BUTTON PULSE (indikator ada perubahan belum disimpan) */
        @keyframes pulseSave { 0%,100% { transform:scale(1); box-shadow:0 4px 10px rgba(0,0,0,0.15); } 50% { transform:scale(1.02); box-shadow:0 6px 22px rgba(16,185,129,0.55); } }
        .btn-save-static.dirty { animation: pulseSave 1.4s ease-in-out infinite; }

        /* BOTTOM SHEET DETAIL SISWA */
        #student-sheet .sheet-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.5); z-index:9000; opacity:0; pointer-events:none; transition:opacity 0.25s; }
        #student-sheet.open .sheet-overlay { opacity:1; pointer-events:auto; }
        #student-sheet .sheet-panel { position:fixed; left:50%; bottom:0; transform:translate(-50%,110%); width:100%; max-width:600px; background:white; border-radius:24px 24px 0 0; z-index:9100; transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); padding:14px 20px 28px; max-height:82vh; overflow-y:auto; box-shadow:0 -10px 40px rgba(0,0,0,0.2); }
        #student-sheet.open .sheet-panel { transform:translate(-50%,0); }
        .sheet-handle { width:44px; height:5px; border-radius:99px; background:#e2e8f0; margin:0 auto 14px; }
        .sheet-head { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
        .sheet-avatar { width:48px; height:48px; border-radius:50%; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; flex-shrink:0; }
        .sheet-name { font-weight:700; color:#1e293b; font-size:1.05rem; }
        .sheet-sub { font-size:0.75rem; color:#64748b; margin-top:2px; }
        .stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:10px; }
        .stat-box { background:#f8fafc; border:1px solid #eef2f7; border-radius:12px; padding:12px 6px; text-align:center; }
        .stat-val { font-size:1.15rem; font-weight:800; color:#1e293b; }
        .stat-lbl { font-size:0.62rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.4px; margin-top:3px; font-weight:600; }

        /* MODAL KONFIRMASI KUSTOM (pengganti confirm() native) */
        .confirm-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:9500; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeInQuick 0.18s ease-out; }
        .confirm-card { background:white; border-radius:16px; max-width:340px; width:100%; padding:22px; text-align:center; box-shadow:0 25px 50px rgba(0,0,0,0.25); animation:popIn 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .confirm-icon { width:54px; height:54px; border-radius:50%; background:#fef3c7; color:#d97706; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin:0 auto 12px; }
        .confirm-msg { font-size:0.92rem; color:#334155; line-height:1.45; margin-bottom:18px; }
        .confirm-actions { display:flex; gap:10px; }
        .btn-confirm-no { flex:1; padding:11px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; color:#475569; font-weight:600; cursor:pointer; }
        .btn-confirm-yes { flex:1; padding:11px; border-radius:10px; border:none; background:linear-gradient(135deg,#f87171,#dc2626); color:white; font-weight:700; cursor:pointer; }
        @keyframes fadeInQuick { from { opacity:0; } to { opacity:1; } }
        @keyframes popIn { from { transform:scale(0.85); opacity:0; } to { transform:scale(1); opacity:1; } }

        /* MODAL SILABUS RINGKAS (Rangkuman Materi per Sub-Level) */
        .silabus-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:9600; align-items:center; justify-content:center; padding:20px; animation:fadeInQuick 0.18s ease-out; }
        .silabus-modal { background:white; border-radius:16px; max-width:430px; width:100%; box-shadow:0 25px 50px rgba(0,0,0,0.25); overflow:hidden; animation:popIn 0.2s cubic-bezier(0.34,1.56,0.64,1); display:flex; flex-direction:column; }
        .silabus-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; padding:14px 16px; border-bottom:1px solid #eef2f7; }
        .silabus-close { border:none; background:#f1f5f9; width:34px; height:34px; border-radius:10px; font-size:1.3rem; line-height:1; color:#64748b; cursor:pointer; flex-shrink:0; }
        .silabus-close:hover { background:#fee2e2; color:#dc2626; }
        .silabus-list { padding:8px 16px 12px; max-height:55vh; overflow-y:auto; }
        .silabus-item { display:flex; align-items:center; gap:10px; padding:9px 8px; border-radius:10px; font-size:0.9rem; color:#334155; }
        .silabus-item + .silabus-item { border-top:1px solid #f8fafc; }
        .silabus-item.done { background:#f0fdf4; }
        .silabus-check { width:22px; flex-shrink:0; font-size:1.05rem; display:flex; justify-content:center; }
        .silabus-item.done .silabus-check { color:#16a34a; }
        .silabus-item:not(.done) .silabus-check { color:#cbd5e1; }
        .silabus-name { flex:1; min-width:0; word-break:break-word; }
        .silabus-progressbar { height:7px; background:#eef2f7; border-radius:99px; overflow:hidden; margin-top:6px; }
        .silabus-progressbar > div { height:100%; background:linear-gradient(90deg,#4d97ff,#22c55e); border-radius:99px; transition:width .3s ease; }
        .silabus-extra-head { margin-top:12px; padding:10px 8px 4px; font-size:0.68rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; border-top:1px dashed #e2e8f0; }
        .silabus-item.extra { background:#f8fafc; opacity:0.75; }

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
    // 0. Bottom Sheet: tutup saat overlay diklik
    document.getElementById("sheet-overlay").onclick = closeStudentSheet;

    // 1. Grid Action Buttons (Micro Toggles)
    document.getElementById("toggle-form-btn").onclick = () => toggleFormPanel('materi-form-container', 'toggle-form-btn');
    document.getElementById("toggle-target-btn").onclick = () => toggleFormPanel('target-container', 'toggle-target-btn');

    // 1b. Modal Silabus Ringkas (rangkuman materi per sub-level)
    const btnSilabus = document.getElementById("btn-silabus-modal");
    if (btnSilabus) {
        btnSilabus.onclick = openSilabusModal;
        document.getElementById("silabus-modal-close").onclick = closeSilabusModal;
        document.getElementById("silabus-overlay").addEventListener("click", (e) => {
            if (e.target.id === "silabus-overlay") closeSilabusModal();
        });
    }
    
    // 2. Button "Buat Baru" (guard: perubahan belum disimpan)
    document.getElementById("btn-new-session").onclick = async () => {
        if (isDirty) {
            const ok = await uiConfirm("Mulai sesi baru? Perubahan yang belum disimpan akan hilang.", "Ya, Mulai Baru");
            if (!ok) return;
        }
        resetFormMateri();
        showToast("Mode Input Pertemuan Baru");
    };

    // 3. Debounce Search Materi + Cek Status (Baru/Terdaftar)
    document.getElementById("materi-title").addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const kw = e.target.value.trim();
            const lid = document.getElementById("materi-level-filter").value;
            loadMateriSuggestions(kw, lid);
            checkMateriStatus(kw, lid);
        }, 300); // Tunggu 300ms
    });

    // 3b. FIX STALE SUGGESTION: Refresh saran & badge segera saat Level diganti
    document.getElementById("materi-level-filter").addEventListener("change", () => {
        const kw = document.getElementById("materi-title").value.trim();
        const lid = document.getElementById("materi-level-filter").value;
        loadMateriSuggestions(kw, lid);
        checkMateriStatus(kw, lid);
    });

    // 3c. Delegasi klik item saran (aman untuk judul dengan tanda kutip/apostrof)
    document.getElementById("materi-suggestion-box").addEventListener("click", (e) => {
        const item = e.target.closest(".suggestion-item");
        if (!item) return;
        document.getElementById("materi-title").value = item.dataset.title || "";
        document.getElementById("materi-suggestion-box").style.display = "none";
        checkMateriStatus(item.dataset.title || "", document.getElementById("materi-level-filter").value);
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

    // 6. Dropdown Sync (guard: perubahan belum disimpan)
    document.getElementById("pertemuan-selector").onchange = async (e) => {
        const targetId = e.target.value;
        if (!targetId) return;
        if (isDirty) {
            const ok = await uiConfirm("Ada perubahan nilai yang <b>belum disimpan</b>. Pindah sesi dan buang perubahan?", "Ya, Buang");
            if (!ok) { e.target.value = selectedPertemuanId || ""; return; }
        }
        loadSesiPenuh(targetId);
    };

    // 7. TAP-TO-CYCLE DELEGATION (Inti Interaksi Tabel)
    document.querySelector("#absensi-table tbody").addEventListener("click", (e) => {
        // Klik nama siswa -> Bottom Sheet detail (pengganti alert)
        const nameCell = e.target.closest(".student-name-cell");
        if (nameCell) { openStudentSheet(nameCell.dataset.sid); return; }

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
        markDirty(); // Tandai ada perubahan belum disimpan
        
        // Update Total Hadir Realtime
        if(type === 'status') updateTotalHadir();
    });
}

// --- MODAL SILABUS RINGKAS (Rangkuman Materi per Sub-Level) ---
function openSilabusModal() {
    const overlay = document.getElementById("silabus-overlay");
    if (!overlay) return;
    overlay.style.display = "flex";
    refreshSilabusModal();
}

function closeSilabusModal() {
    const overlay = document.getElementById("silabus-overlay");
    if (overlay) overlay.style.display = "none";
}

function isSilabusOpen() {
    const ov = document.getElementById("silabus-overlay");
    return ov && ov.style.display !== "none";
}

async function refreshSilabusModal() {
    const listEl = document.getElementById("silabus-list");
    const progEl = document.getElementById("silabus-progress");
    const subEl = document.getElementById("silabus-subtitle");
    if (!listEl || !progEl || !subEl || !isSilabusOpen()) return; // hanya saat modal terbuka

    const subLid = document.getElementById("materi-sub-level-filter")?.value || "";
    const classId = localStorage.getItem("activeClassId");

    if (!subLid) {
        subEl.textContent = "Sub-Level: belum dipilih";
        progEl.innerHTML = "";
        listEl.innerHTML = `<div style="padding:18px; text-align:center; color:#94a3b8; font-size:0.85rem; line-height:1.5;">
            <i class="fas fa-circle-info" style="margin-bottom:6px; display:block;"></i>
            Pilih <b>Sub-Level</b> terlebih dahulu di form <b>Data Pertemuan</b> untuk melihat silabus ringkas.
        </div>`;
        return;
    }

    subEl.textContent = "Sub-Level: memuat...";
    listEl.innerHTML = `<div style="padding:18px; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-spin fa-lg"></i></div>`;
    progEl.innerHTML = "";

    try {
        // Query paralel: info sub-level, materi silabus (urut order_index), materi yang pernah diajar
        const [subRes, materiRes, pertemuanRes] = await Promise.all([
            supabase.from("sub_levels").select("name, levels(kode)").eq("id", subLid).single(),
            supabase.from("materi").select("id, title")
                .eq("sub_level_id", subLid)
                .order("order_index", { ascending: true, nullsFirst: false })
                .order("created_at", { ascending: true }),
            supabase.from("pertemuan_kelas").select("materi_id").eq("class_id", classId)
        ]);
        if (subRes.error) throw subRes.error;
        if (materiRes.error) throw materiRes.error;
        if (pertemuanRes.error) throw pertemuanRes.error;

        const sub = subRes.data;
        const materiList = materiRes.data || [];
        const taught = new Set((pertemuanRes.data || []).map(p => p.materi_id).filter(Boolean));

        subEl.textContent = (sub?.levels?.kode ? sub.levels.kode + " · " : "") + (sub?.name || "Sub-Level");

        const done = materiList.filter(m => taught.has(m.id)).length;
        const pct = materiList.length ? Math.min(100, Math.round(done / materiList.length * 100)) : 0;
        progEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#475569;">
                <span><b>${done}</b> dari <b>${materiList.length}</b> materi telah diajarkan</span>
                <span style="font-weight:700; color:${pct === 100 ? '#16a34a' : '#4d97ff'};">${pct}%</span>
            </div>
            <div class="silabus-progressbar"><div style="width:${pct}%"></div></div>`;

        if (!materiList.length) {
            listEl.innerHTML = `<div style="padding:18px; text-align:center; color:#94a3b8; font-size:0.85rem;">Belum ada materi terdaftar untuk sub-level ini di silabus.</div>`;
        } else {
            listEl.innerHTML = materiList.map(m => `
                <div class="silabus-item ${taught.has(m.id) ? 'done' : ''}">
                    <span class="silabus-check">${taught.has(m.id) ? '<i class="fas fa-check-circle"></i>' : '<i class="far fa-circle"></i>'}</span>
                    <span class="silabus-name">${escapeHtml(m.title)}</span>
                </div>`).join("");
        }

        // Materi lain yang pernah diajar (materi lama / di luar silabus sub-level ini)
        const silabusIds = new Set(materiList.map(m => m.id));
        const otherIds = [...taught].filter(id => !silabusIds.has(id));
        if (otherIds.length) {
            const { data: others } = await supabase.from("materi").select("id, title").in("id", otherIds.slice(0, 100));
            if (others && others.length) {
                listEl.innerHTML += `
                    <div class="silabus-extra-head">Materi lain yang pernah diajar</div>` +
                    others.map(m => `
                    <div class="silabus-item extra">
                        <span class="silabus-check"><i class="fas fa-arrow-right" style="font-size:0.7rem;"></i></span>
                        <span class="silabus-name">${escapeHtml(m.title)}</span>
                    </div>`).join("");
            }
        }
    } catch (err) {
        console.error("Silabus modal error:", err);
        listEl.innerHTML = `<div style="padding:18px; text-align:center; color:#ef4444; font-size:0.85rem;">Gagal memuat silabus: ${escapeHtml(err.message || '?')}</div>`;
    }
}

// --- CORE FUNCTION: LOAD FULL SESSION ---
async function loadSesiPenuh(pertemuanId) {
    selectedPertemuanId = pertemuanId;
    isEditMode = true;
    clearDirty(); // Data segar dimuat, reset flag

    // 1. Tampilkan Loading di Tabel
    const tbody = document.querySelector("#absensi-table tbody");
    tbody.innerHTML = `<tr><td colspan="100%" style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#2563eb; margin-bottom:10px;"></i><br>Mengambil Data...</td></tr>`;

    // 2. Ambil Detail Pertemuan (Untuk Form Tersembunyi)
    // [AUDIT FIX #1] sertakan sub_level_id agar sesi lama memulihkan pilihan sub-level
    const { data: detail } = await supabase.from("pertemuan_kelas").select("*, materi(title, level_id, sub_level_id)").eq("id", pertemuanId).single();
    if (detail) {
        document.getElementById("materi-date").value = detail.tanggal;
        document.getElementById("materi-title").value = detail.materi?.title || "";
        document.getElementById("materi-level-filter").value = detail.materi?.level_id || "";
        // [AUDIT FIX #1] isi ulang opsi sub-level sesuai level, lalu tandai yang tersimpan (silent agar saran tidak me-pop-up)
        populateSubLevelsFilter(detail.materi?.level_id || "", detail.materi?.sub_level_id || "", true);
        document.getElementById("materi-guru").value = detail.guru_id;
        document.getElementById("materi-asisten").value = detail.asisten_id || "";
        // Sinkronkan badge status judul (materi dari DB pasti terdaftar)
        setMateriBadge((detail.materi?.title && detail.materi?.level_id) ? 'existing' : null);
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
        supabase.from("students").select("id, name, grade").eq("class_id", classId).eq("is_active", true).order("grade").order("name"),
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
            <td class="sticky-col student-name-cell" data-sid="${s.id}" title="Lihat detail siswa">${escapeHtml(s.name)}${s.grade ? `<span class="grade-mini">${escapeHtml(s.grade)}</span>` : ''}</td>
            
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
    btn.disabled = true; // Cegah double-tap / double submit
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

        clearDirty();
        showToast("✅ Data Nilai Berhasil Disimpan!");
        loadSesiPenuh(selectedPertemuanId); // Refresh untuk memastikan
    } catch (e) {
        showToast("Gagal menyimpan: " + e.message, "error");
    } finally {
        btn.innerHTML = oriText;
        btn.disabled = false;
    }
}

// --- HELPER FUNCTIONS ---
function getIcon(arr, val) {
    const item = arr.find(x => x[0] == val);
    return item ? item[1] : arr[0][1];
}

// Sanitasi teks dari DB sebelum disuntik ke HTML (cegah XSS & atribut rusak)
// Catatan: entitas dibangun runtime dari peta nama agar aman dari auto-format editor
function escapeHtml(text) {
    const NAMES = { 38: 'amp', 60: 'lt', 62: 'gt', 34: 'quot', 39: '#39' };
    return String(text ?? "").replace(/[&<>"']/g, ch => '&' + NAMES[ch.charCodeAt(0)] + ';');
}

// --- DIRTY STATE TRACKING ---
function markDirty() {
    isDirty = true;
    document.getElementById("simpan-absensi")?.classList.add("dirty");
}
function clearDirty() {
    isDirty = false;
    document.getElementById("simpan-absensi")?.classList.remove("dirty");
}

// --- KONFIRMASI KUSTOM (pengganti confirm() native, tidak memblokir gaya aplikasi) ---
function uiConfirm(message, yesLabel = "Ya, Lanjutkan") {
    return new Promise((resolve) => {
        const ov = document.createElement('div');
        ov.className = 'confirm-overlay';
        ov.innerHTML = `
            <div class="confirm-card">
                <div class="confirm-icon"><i class="fas fa-triangle-exclamation"></i></div>
                <div class="confirm-msg">${message}</div>
                <div class="confirm-actions">
                    <button type="button" class="btn-confirm-no">Batal</button>
                    <button type="button" class="btn-confirm-yes">${yesLabel}</button>
                </div>
            </div>`;
        const done = (val) => { ov.remove(); resolve(val); };
        ov.querySelector('.btn-confirm-no').onclick = () => done(false);
        ov.querySelector('.btn-confirm-yes').onclick = () => done(true);
        ov.addEventListener('click', (e) => { if (e.target === ov) done(false); });
        document.body.appendChild(ov);
    });
}

// --- BOTTOM SHEET DETAIL SISWA (pengganti alert nama) ---
async function openStudentSheet(studentId) {
    const wrap = document.getElementById("student-sheet");
    const panel = document.getElementById("sheet-panel");
    if (!wrap || !panel) return;
    panel.innerHTML = `<div class="sheet-handle"></div><div style="padding:30px; text-align:center; color:#94a3b8;"><i class="fas fa-circle-notch fa-spin fa-lg"></i></div>`;
    wrap.classList.add("open");

    try {
        const classId = localStorage.getItem("activeClassId");
        const [resStu, resPid] = await Promise.all([
            supabase.from("students").select("name, grade").eq("id", studentId).maybeSingle(),
            supabase.from("pertemuan_kelas").select("id").eq("class_id", classId)
        ]);
        const stu = resStu.data || {};
        const pids = (resPid.data || []).map(p => p.id);

        // Statistik kehadiran siswa pada kelas ini
        let hadir = 0, total = 0, sumSikap = 0, nSikap = 0, sumFokus = 0, nFokus = 0;
        if (pids.length) {
            const { data: atts } = await supabase.from("attendance")
                .select("status, sikap, fokus")
                .eq("student_id", studentId)
                .in("pertemuan_id", pids);
            (atts || []).forEach(a => {
                total++;
                if (String(a.status) === '1') hadir++;
                if (Number(a.sikap) > 0) { sumSikap += Number(a.sikap); nSikap++; }
                if (Number(a.fokus) > 0) { sumFokus += Number(a.fokus); nFokus++; }
            });
        }

        const pct = total ? Math.round((hadir / total) * 100) : 0;
        const avg = (s, n) => n ? (s / n).toFixed(1) : '-';
        const initial = (stu.name || '?').charAt(0).toUpperCase();
        const className = document.getElementById('header-kelas')?.textContent || '-';

        panel.innerHTML = `
            <div class="sheet-handle"></div>
            <div class="sheet-head">
                <div class="sheet-avatar">${initial}</div>
                <div style="min-width:0;">
                    <div class="sheet-name">${escapeHtml(stu.name || '-')}</div>
                    <div class="sheet-sub">${escapeHtml(className)}${stu.grade ? ' • Grade ' + escapeHtml(stu.grade) : ''}</div>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-box"><div class="stat-val">${hadir}/${total}</div><div class="stat-lbl">Hadir</div></div>
                <div class="stat-box"><div class="stat-val">${pct}%</div><div class="stat-lbl">Persentase</div></div>
                <div class="stat-box"><div class="stat-val">${total}</div><div class="stat-lbl">Pertemuan</div></div>
            </div>
            <div class="stat-grid" style="grid-template-columns:1fr 1fr;">
                <div class="stat-box"><div class="stat-val">${avg(sumSikap, nSikap)}</div><div class="stat-lbl">Rata Sikap</div></div>
                <div class="stat-box"><div class="stat-val">${avg(sumFokus, nFokus)}</div><div class="stat-lbl">Rata Fokus</div></div>
            </div>
            <button type="button" id="sheet-close-btn" class="btn-confirm-no" style="width:100%;">Tutup</button>
        `;
        document.getElementById("sheet-close-btn").onclick = closeStudentSheet;
    } catch (err) {
        console.error("Student Sheet Error:", err);
        panel.innerHTML = `<div class="sheet-handle"></div><div style="padding:20px; text-align:center; color:#ef4444;">Gagal memuat data siswa.</div>`;
    }
}
function closeStudentSheet() {
    document.getElementById("student-sheet")?.classList.remove("open");
}

// --- STATUS BADGE JUDUL MATERI (BARU vs TERDAFTAR) ---
function setMateriBadge(state) {
    const badge = document.getElementById("materi-status-badge");
    if (!badge) return;
    if (!state) { badge.className = "materi-status hidden"; badge.innerHTML = ""; return; }
    if (state === 'new') {
        badge.className = "materi-status is-new";
        badge.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> Materi Baru — akan dibuat saat disimpan`;
    } else {
        badge.className = "materi-status is-existing";
        badge.innerHTML = `<i class="fas fa-circle-check"></i> Materi terdaftar di level ini`;
    }
}
async function checkMateriStatus(kw, lid) {
    if (!kw || kw.length < 2 || !lid) { setMateriBadge(null); return; }
    // Exact match case-insensitive — konsisten dengan logika find-or-create di handleMateriSubmit
    const { data } = await supabase.from("materi")
        .select("id").eq("level_id", lid).ilike("title", kw).limit(1);
    setMateriBadge(data?.length ? 'existing' : 'new');
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
    clearDirty();
    setMateriBadge(null);
    document.getElementById("materi-form").reset();
    document.getElementById("materi-date").valueAsDate = new Date();
    currentTargets = [];
    renderTargetListUI();
    // Reset header tabel ke kolom dasar (hapus kolom target basi dari sesi sebelumnya)
    document.querySelector("#absensi-table thead").innerHTML = `<tr><th style="width:30px">No</th><th class="sticky-col">Nama Siswa</th><th style="text-align:center">H</th><th style="text-align:center">S</th><th style="text-align:center">F</th></tr>`;
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
let allSubLevelsCache = [];

async function loadLevelOptions() {
    // [AUDIT FIX #4] urutan konsisten dengan Silabus (order_index) + hanya sub-level aktif
    const { data: lvData } = await supabase.from("levels")
        .select("id, kode, order_index")
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("kode", { ascending: true });
    const { data: subData } = await supabase.from("sub_levels")
        .select("id, level_id, name, kit_alat, is_active, order_index")
        .eq("is_active", true)
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
    allSubLevelsCache = subData || [];

    const s = document.getElementById("materi-level-filter"); 
    if (s) {
        s.innerHTML = '<option value="">Level</option>';
        (lvData || []).forEach(l => s.add(new Option(l.kode, l.id)));

        s.onchange = () => {
            populateSubLevelsFilter(s.value);
        };
    }
}

function populateSubLevelsFilter(levelId, currentSubId = "", silent = false) {
    const subSel = document.getElementById("materi-sub-level-filter");
    if (!subSel) return;
    const filtered = allSubLevelsCache.filter(sub => sub.level_id === levelId);
    if (!filtered.length) {
        subSel.innerHTML = '<option value="">-- Tanpa Sub-Level --</option>';
        return;
    }
    subSel.innerHTML = '<option value="">-- Pilih Sub-Level --</option>' + 
        filtered.map(sub => `<option value="${sub.id}" ${currentSubId === sub.id ? 'selected' : ''}>${escapeHtml(sub.name)} ${sub.kit_alat ? `[${escapeHtml(sub.kit_alat)}]` : ''}</option>`).join('');

    // [AUDIT FIX #3] ganti sub-level => segarkan saran materi sesuai pilihan baru
    subSel.onchange = () => {
        if (silent) return;
        const titleEl = document.getElementById("materi-title");
        if (titleEl && titleEl.value.trim().length >= 2 && levelId) {
            loadMateriSuggestions(titleEl.value.trim(), levelId);
        }
        refreshSilabusModal(); // [Silabus Ringkas] ikut update bila modal terbuka
    };
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
window.historyClick = async (id) => {
    if (isDirty) {
        const ok = await uiConfirm("Ada perubahan nilai yang <b>belum disimpan</b>. Buka sesi lain dan buang perubahan?", "Ya, Buang");
        if (!ok) return;
    }
    loadSesiPenuh(id);
    document.getElementById("table-section").scrollIntoView({behavior:"smooth"});
};

// --- SEARCH & TARGET LOGIC ---
async function loadMateriSuggestions(kw, lid) {
    const box = document.getElementById("materi-suggestion-box");
    const subLid = document.getElementById("materi-sub-level-filter")?.value || "";

    // Level belum dipilih -> jelaskan kenapa saran tidak muncul (hilangkan rancu)
    if(!lid) {
        if(kw.length >= 2) {
            box.innerHTML = `<div class="suggestion-hint"><i class="fas fa-circle-info"></i> Pilih <b>Level</b> dulu untuk menampilkan saran materi.</div>`;
            box.style.display = "block";
        } else box.style.display = "none";
        return;
    }
    if(kw.length < 2) { box.style.display = "none"; return; }

    // [AUDIT FIX #3] saran mengikuti level + sub-level yang dipilih, badge tampilkan sub-level
    let query = supabase.from("materi")
        .select("title, levels(kode), sub_levels(name)")
        .eq("level_id", lid)
        .ilike("title", `%${kw}%`)
        .limit(5);
    if (subLid) query = query.eq("sub_level_id", subLid);

    const { data } = await query;

    if(data?.length) {
        const lvlKode = data[0]?.levels?.kode || "-";
        box.innerHTML = `
            <div class="suggestion-header"><i class="fas fa-layer-group"></i> Saran Materi: <b>${escapeHtml(lvlKode)}</b>${subLid ? ` · Sub-Level terpilih` : ''}</div>
            ${data.map(m => `
                <div class="suggestion-item" data-title="${escapeHtml(m.title)}">
                    <span class="sugg-title">${escapeHtml(m.title)}</span>
                    <span class="sugg-badge">${escapeHtml(m.sub_levels?.name || m.levels?.kode || '-')}</span>
                </div>
            `).join("")}
        `;
        box.style.display = "block";
    } else {
        // Feedback eksplisit: ketikan ini akan jadi materi BARU pada level aktif
        box.innerHTML = `<div class="suggestion-hint"><i class="fas fa-plus"></i> Tidak ada yang cocok — akan disimpan sebagai materi <b>BARU</b>.</div>`;
        box.style.display = "block";
    }
}
async function handleMateriSubmit(e) {
    e.preventDefault();
    const btn=document.getElementById("btn-submit-materi"); btn.disabled=true; btn.innerText="Saving...";
    // (Logic simpan materi sama seperti sebelumnya, disederhanakan)
    const title = document.getElementById("materi-title").value.trim();
    const lid = document.getElementById("materi-level-filter").value;
    const subLid = document.getElementById("materi-sub-level-filter")?.value || null;

    // [AUDIT FIX #2] validasi sebelum menyentuh database
    const resetBtn = () => { btn.disabled = false; btn.innerText = "Simpan Data Pertemuan"; };
    if (!title || !lid) { showToast("Judul materi & Level wajib diisi!", "error"); resetBtn(); return; }
    const levelHasSubs = allSubLevelsCache.some(s => s.level_id === lid);
    if (levelHasSubs && !subLid) {
        showToast("Level ini memiliki Sub-Level — pilih salah satu!", "error");
        resetBtn(); return;
    }

    try {
        // [AUDIT FIX #2] dedup anti-error: limit(1), bukan maybeSingle()
        let dupQuery = supabase.from("materi").select("id").eq("level_id", lid).ilike("title", title);
        if (subLid) dupQuery = dupQuery.eq("sub_level_id", subLid);
        const { data: dupRows, error: dupErr } = await dupQuery.limit(1);
        if (dupErr) throw dupErr;

        let m = (dupRows && dupRows.length > 0) ? dupRows[0] : null;
        if (!m) { 
            const insertObj = { title, level_id: lid };
            if (subLid) insertObj.sub_level_id = subLid;
            const res = await supabase.from("materi").insert(insertObj).select().single(); 
            m = res.data; 
        }
        
        const payload = {
            class_id: localStorage.getItem("activeClassId"), school_id: localStorage.getItem("activeSchoolId"),
            tanggal: document.getElementById("materi-date").value, materi_id: m.id,
            guru_id: document.getElementById("materi-guru").value, asisten_id: document.getElementById("materi-asisten").value || null
        };

        if(isEditMode && selectedPertemuanId) await supabase.from("pertemuan_kelas").update(payload).eq("id", selectedPertemuanId);
        else { const res = await supabase.from("pertemuan_kelas").insert(payload).select().single(); selectedPertemuanId = res.data.id; }
        
        showToast("Data Pertemuan Tersimpan!");
        refreshSilabusModal(); // [Silabus Ringkas] ceklis materi baru langsung muncul
        toggleFormPanel('materi-form-container', 'toggle-form-btn'); // Tutup form
        toggleFormPanel('target-container', 'toggle-target-btn'); // Buka target (Workflow)
        loadSesiPenuh(selectedPertemuanId);
    } catch(err) { showToast(err.message, 'error'); } 
    finally { btn.innerText = "Simpan Data Pertemuan"; btn.disabled = false; }
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
    const t = currentTargets[i];
    if (!t) return;
    if (t.id) {
        const ok = await uiConfirm(`Hapus target "<b>${escapeHtml(t.main)}</b>" dari sesi ini?`, "Ya, Hapus");
        if (!ok) return;
        await supabase.from("achievement_kelas").delete().eq("id", t.id);
    }
    currentTargets.splice(i, 1);
    renderTargetListUI();
    if (selectedPertemuanId) loadSesiPenuh(selectedPertemuanId); // Guard: jangan reload di mode sesi baru
};
async function saveTargetsToDB() {
    if(!selectedPertemuanId) return showToast("Simpan pertemuan dulu!", "error");
    const btn = document.getElementById("btn-save-targets-db");
    const oriHtml = btn.innerHTML;
    btn.disabled = true; // Cegah double submit
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menyimpan...`;
    try {
        for(let t of currentTargets) {
            if(t.id) continue;
            let mid;
            // [AUDIT FIX #2 lanjutan] dedup anti-error: limit(1) agar tak crash bila ada duplikat
            let {data:ex} = await supabase.from("achievement_sekolah").select("id").ilike("main_achievement", t.main).ilike("sub_achievement", t.sub).limit(1);
            if(ex) mid=ex.id; else { const {data:n} = await supabase.from("achievement_sekolah").insert({main_achievement:t.main, sub_achievement:t.sub}).select().single(); mid=n.id; }
            await supabase.from("achievement_kelas").insert({pertemuan_id:selectedPertemuanId, class_id:localStorage.getItem("activeClassId"), achievement_sekolah_id:mid});
        }
        showToast("Target Disimpan!");
        toggleFormPanel('target-container', 'toggle-target-btn'); // Tutup form target
        loadSesiPenuh(selectedPertemuanId); // Refresh table
    } catch (e) {
        showToast("Gagal simpan target: " + e.message, "error");
    } finally {
        btn.innerHTML = oriHtml;
        btn.disabled = false;
    }
}
function renderSubSelector(m,subs){ document.getElementById("sub-achievement-injector-area").innerHTML=`<select onchange="document.getElementById('input-ach-sub').value=this.value" class="input-modern" style="margin-bottom:5px;"><option value="">Pilih Sub...</option>${subs.map(s=>`<option>${s}</option>`).join('')}</select>`; }