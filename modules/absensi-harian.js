/**
 * Project: Absensi Harian Module (SPA) - VIBRANT & MOBILE OPTIMIZED
 * Features: Internalized CSS, Case-Insensitive Logic, Sticky Table Columns
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
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('absensi-sekolah');
        return;
    }

    // [INTEGRATION] Inject CSS langsung dari JS agar mandiri
    injectStyles(); 

    canvas.innerHTML = `
        <div class="harian-container fade-in">
            <nav class="breadcrumb-nav">
                <span onclick="window.dispatchModuleLoad('overview')">Home</span>
                <i class="fas fa-chevron-right separator"></i>
                <span onclick="window.dispatchModuleLoad('absensi-sekolah')">Daftar Kelas</span>
                <i class="fas fa-chevron-right separator"></i>
                <span class="current">Input Harian</span>
            </nav>

            <div class="class-info-card">
                <div class="info-main">
                    <div class="info-icon"><i class="fas fa-robot"></i></div>
                    <div>
                        <h2 id="header-kelas" class="info-class-name">Loading...</h2>
                        <p id="header-sekolah" class="info-school-name">...</p>
                    </div>
                </div>
                <div class="info-meta">
                    <span class="meta-badge"><i class="far fa-calendar"></i> <span id="header-tahun">-</span></span>
                    <span class="meta-badge"><i class="fas fa-clock"></i> <span id="header-jadwal">-</span></span>
                </div>
                <button id="btn-rekap-shortcut" class="btn-rekap-mini">
                    <i class="fas fa-file-alt"></i> Rekap
                </button>
            </div>

            <div class="card-section card-blue-tint">
                <div class="section-header" id="head-materi">
                    <div class="header-label">
                        <div class="icon-circle bg-blue"><i class="fas fa-book"></i></div>
                        <h4>Data Pertemuan</h4>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button id="btn-new-form" class="btn-pill-blue"><i class="fas fa-plus"></i> Baru</button>
                        <i id="icon-materi" class="fas fa-chevron-down accordion-icon rotate-icon"></i>
                    </div>
                </div>
                <form id="materi-form" style="display:block;" class="form-grid fade-in">
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
                        <button type="submit" id="btn-submit-materi" class="btn-primary blue-grad">💾 Simpan Pertemuan</button>
                    </div>
                </form>
            </div>

            <div class="card-section card-orange-tint">
                <div class="section-header" id="head-target">
                    <div class="header-label">
                        <div class="icon-circle bg-orange"><i class="fas fa-bullseye"></i></div>
                        <h4>Target Achievement</h4>
                    </div>
                    <i id="icon-target" class="fas fa-chevron-down accordion-icon"></i>
                </div>
                <div id="target-container" style="display:none;" class="form-grid fade-in">
                    <div class="form-group full">
                        <label>Topik Utama</label>
                        <input type="text" id="input-ach-main" list="list-ach-saran" class="input-modern" placeholder="Pilih/Ketik Topik...">
                        <datalist id="list-ach-saran"></datalist>
                    </div>
                    <div class="form-group full">
                        <div id="sub-achievement-injector-area"></div>
                        <input type="text" id="input-ach-sub" class="input-modern" placeholder="Detail Target (Sub)...">
                    </div>
                    <div class="form-group full" style="display:flex; gap:8px;">
                        <button type="button" id="btn-add-target-ui" class="btn-secondary">➕ List</button>
                        <button type="button" id="btn-save-targets-db" class="btn-primary orange-grad">Simpan Target</button>
                    </div>
                    <div id="target-list-preview" class="form-group full"></div>
                </div>
            </div>

            <div class="card-section card-green-tint" style="margin-bottom:80px;">
                <div class="section-header">
                    <div class="header-label">
                        <div class="icon-circle bg-green"><i class="fas fa-user-check"></i></div>
                        <h4>Penilaian Siswa</h4>
                    </div>
                    <select id="pertemuan-selector" class="compact-select input-modern"></select>
                </div>
                
                <div class="table-wrapper">
                    <table id="absensi-table" class="absensi-table">
                        <thead></thead>
                        <tbody><tr><td colspan="6" style="padding:20px; color:#ccc; text-align:center;">Pilih Pertemuan di atas 👆</td></tr></tbody>
                    </table>
                </div>
                
                <div class="action-bar-sticky">
                    <div style="font-size:0.8rem;">Hadir: <strong id="total-hadir" style="color:#166534">0</strong></div>
                    <button id="simpan-absensi" class="btn-primary green-grad" style="margin-top:0; width:auto; padding:10px 25px; border-radius:30px;">
                        💾 Simpan Nilai
                    </button>
                </div>
            </div>

            <div style="margin-top:20px; padding-bottom:40px;">
                <h4 class="history-title">Riwayat Pertemuan</h4>
                <div id="materi-history-list" class="history-grid"></div>
            </div>
        </div>
    `;

    await setupLogic();
}

// ==========================================
// 2. CSS INJECTION (FULL VIBRANT THEME)
// ==========================================
function injectStyles() {
    if (document.getElementById('absensi-harian-css')) return;
    const s = document.createElement('style');
    s.id = 'absensi-harian-css';
    s.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Fredoka:wght@500;600&display=swap');

        :root {
            --font-main: 'Poppins', sans-serif;
            --font-header: 'Fredoka', sans-serif;
            --text-dark: #1e293b;
            --text-white: #ffffff;
            
            /* VIBRANT PALETTE */
            --grad-blue: linear-gradient(135deg, #60a5fa, #2563eb);
            --bg-blue-soft: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            --text-blue: #1e3a8a;

            --grad-orange: linear-gradient(135deg, #fb923c, #ea580c);
            --bg-orange-soft: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
            --text-orange: #9a3412;

            --grad-green: linear-gradient(135deg, #34d399, #059669);
            --bg-green-soft: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
            --text-green: #14532d;
            
            --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .harian-container {
            max-width: 900px; margin: 0 auto; padding: 20px;
            font-family: var(--font-main); background: #f8fafc; color: var(--text-dark);
        }

        /* HERO CARD */
        .class-info-card {
            background: white; padding: 25px; border-radius: 24px;
            margin-bottom: 30px; position: relative; overflow: hidden;
            box-shadow: 0 20px 40px -10px rgba(59, 130, 246, 0.15); border: 1px solid #eef2ff;
        }
        .class-info-card::after {
            content: ''; position: absolute; right: -30px; bottom: -30px;
            width: 120px; height: 120px; border-radius: 50%;
            background: var(--grad-blue); opacity: 0.1;
        }
        .info-main { display: flex; align-items: center; gap: 15px; position: relative; z-index: 2; }
        .info-icon {
            width: 55px; height: 55px; background: var(--grad-blue); color: white;
            border-radius: 18px; display: flex; align-items: center; justify-content: center;
            font-size: 1.6rem; box-shadow: 0 8px 15px rgba(37, 99, 235, 0.2);
        }
        .info-class-name { font-family: var(--font-header); font-size: 1.5rem; margin: 0; line-height: 1.2; }
        .info-school-name { font-size: 0.9rem; font-weight: 500; color: #64748b; }
        .info-meta { display: flex; gap: 10px; margin-top: 15px; position: relative; z-index: 2; }
        .meta-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .btn-rekap-mini {
            position: absolute; top: 25px; right: 25px; background: white; color: #2563eb;
            padding: 8px 18px; border-radius: 50px; border: 2px solid #eff6ff; font-weight: 700;
            font-size: 0.8rem; cursor: pointer; transition: 0.3s; z-index: 10;
        }
        .btn-rekap-mini:hover { background: #2563eb; color: white; }

        /* SECTOR CARDS */
        .card-section { padding: 25px; border-radius: 28px; margin-bottom: 25px; border: none; box-shadow: var(--shadow-card); transition: transform 0.2s; }
        .card-blue-tint { background: var(--bg-blue-soft); color: var(--text-blue); }
        .card-orange-tint { background: var(--bg-orange-soft); color: var(--text-orange); }
        .card-green-tint { background: var(--bg-green-soft); color: var(--text-green); }
        
        .bg-blue { background: var(--grad-blue); box-shadow: 0 5px 15px rgba(37, 99, 235, 0.3); }
        .bg-orange { background: var(--grad-orange); box-shadow: 0 5px 15px rgba(234, 88, 12, 0.3); }
        .bg-green { background: var(--grad-green); box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3); }

        .section-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 20px; }
        .header-label { display: flex; align-items: center; gap: 12px; }
        .icon-circle { width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: white; }
        .section-header h4 { font-family: var(--font-header); font-size: 1.1rem; margin: 0; font-weight: 600; }

        /* FORMS & INPUTS */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group.full { grid-column: span 2; }
        .form-group label { display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 6px; opacity: 0.8; text-transform: uppercase; }
        .input-modern {
            width: 100%; padding: 12px 16px; border: none; border-radius: 14px;
            background: rgba(255, 255, 255, 0.9); font-size: 0.9rem; font-weight: 600;
            color: var(--text-dark); outline: none; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.03);
        }
        .input-modern:focus { background: white; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }

        /* BUTTONS */
        .btn-primary {
            border: none; padding: 14px; border-radius: 16px; color: white; font-weight: 700;
            font-size: 0.95rem; cursor: pointer; width: 100%; margin-top: 15px;
            transition: 0.2s; box-shadow: 0 5px 15px rgba(0,0,0,0.15); text-transform: uppercase;
        }
        .btn-primary:hover { transform: translateY(-3px); filter: brightness(1.1); }
        .blue-grad { background: var(--grad-blue); }
        .orange-grad { background: var(--grad-orange); }
        .green-grad { background: var(--grad-green); }
        
        .btn-secondary { background: white; color: var(--text-dark); padding: 0 15px; border-radius: 12px; font-weight: 700; border: 2px solid rgba(0,0,0,0.05); cursor: pointer; }
        .btn-pill-blue { background: white; color: #2563eb; padding: 6px 14px; border-radius: 20px; border: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; }

        /* TABLE (Clean & Sharp) */
        .table-wrapper { overflow-x: auto; background: white; border-radius: 16px; margin-top: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
        .absensi-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
        .absensi-table th { background: #f8fafc; padding: 14px 10px; font-size: 0.75rem; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
        .absensi-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center; }
        
        /* Sticky Name Column */
        .absensi-table th:nth-child(2), .absensi-table td:nth-child(2) {
            position: sticky; left: 0; background: white; z-index: 10; border-right: 2px solid #f1f5f9;
        }
        .absensi-table td:nth-child(2) { text-align: left; font-weight: 400; min-width: 130px; }

        /* EMOJI SELECT */
        .absensi-table select {
            appearance: none; -webkit-appearance: none; background-image: none;
            padding: 6px 0; border-radius: 10px; border: 1px solid #e2e8f0; background-color: #fff;
            width: 100%; min-width: 55px; text-align: center; text-align-last: center;
            font-size: 1.2rem; cursor: pointer; transition: 0.2s;
        }
        .absensi-table select:hover { background-color: #f1f5f9; transform: scale(1.05); }
        .absensi-table select:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
        .grade-badge { background: #eff6ff; color: #2563eb; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }

        /* FLOATING ACTION BAR */
        .action-bar-sticky {
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            width: 90%; max-width: 500px;
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
            padding: 12px 12px 12px 25px; border-radius: 50px;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 15px 40px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.5); z-index: 99;
        }

        /* HISTORY & UTILS */
        .history-title { font-size: 0.85rem; font-weight: 800; color: #94a3b8; margin: 40px 0 15px 5px; text-transform: uppercase; }
        .history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
        .history-card { padding: 18px; border-radius: 20px; cursor: pointer; transition: 0.3s; border: none; color: white; box-shadow: 0 8px 15px rgba(0,0,0,0.05); }
        .history-card:hover { transform: translateY(-5px); }
        
        .card-color-0 { background: linear-gradient(135deg, #60a5fa, #2563eb); }
        .card-color-1 { background: linear-gradient(135deg, #fb923c, #ea580c); }
        .card-color-2 { background: linear-gradient(135deg, #34d399, #059669); }
        .card-color-3 { background: linear-gradient(135deg, #a78bfa, #7c3aed); }
        .card-color-4 { background: linear-gradient(135deg, #f472b6, #db2777); }

        .h-date { font-size: 0.75rem; font-weight: 700; opacity: 0.9; margin-bottom: 6px; }
        .h-materi { font-size: 0.95rem; font-weight: 700; line-height: 1.3; margin-bottom: 12px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .h-teacher { font-size: 0.7rem; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; width: fit-content; font-weight: 600; }

        .suggestion-box {
            position: absolute; width: 100%; background: white; border: 1px solid #eee; border-radius: 0 0 12px 12px;
            max-height: 200px; overflow-y: auto; z-index: 100; box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .rotate-icon { transform: rotate(180deg); transition: 0.3s; }
        .compact-select { padding: 8px 12px; border-radius: 12px; border: none; background: white; color: var(--text-dark); font-weight: 600; cursor: pointer; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } }
        
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .action-bar-sticky { width: 95%; bottom: 20px; } }
    `;
    document.head.appendChild(s);
}

// ==========================================
// 3. LOGIC CORE
// ==========================================

async function setupLogic() {
    await renderHeader();
    await loadLevelOptions();
    await loadGuruDropdowns();
    await loadAchievementSuggestions();
    await tampilkanDaftarMateri(); 
    await loadPertemuanOptions();
    setupEvents();
}

function setupEvents() {
    // Navigasi & UI
    document.getElementById("btn-rekap-shortcut").onclick = () => {
        const classId = localStorage.getItem("activeClassId");
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('rekap-absensi', { classId });
    };

    document.getElementById("head-materi").onclick = (e) => {
        if(e.target.closest('#btn-new-form')) return;
        toggleAccordion("materi-form", "icon-materi");
    };
    document.getElementById("head-target").onclick = () => toggleAccordion("target-container", "icon-target");
    
    document.getElementById("btn-new-form").onclick = () => {
        resetFormMateri();
        document.getElementById("materi-form").style.display = "grid";
        document.getElementById("icon-materi").classList.add("rotate-icon");
    };

    // Auto Suggestion (Materi)
    const titleInput = document.getElementById("materi-title");
    titleInput.oninput = (e) => loadMateriSuggestions(e.target.value.trim(), document.getElementById("materi-level-filter").value);
    
    // Target Logic
    document.getElementById("btn-add-target-ui").onclick = addTargetToUI;
    document.getElementById("btn-save-targets-db").onclick = saveTargetsToDB;
    
    // Pertemuan Dropdown
    document.getElementById("pertemuan-selector").onchange = (e) => {
        selectedPertemuanId = e.target.value;
        if(selectedPertemuanId) initTable(selectedPertemuanId);
    };

    // Submit Forms
    document.getElementById("materi-form").onsubmit = handleMateriSubmit;
    document.getElementById("simpan-absensi").onclick = handleAbsensiSubmit;

    // Sub Achievement Selector
    const mainAchInput = document.getElementById("input-ach-main");
    mainAchInput.onchange = async (e) => {
        const val = e.target.value;
        if(!val) return;
        // Fix: Case Insensitive search
        const { data } = await supabase.from("achievement_sekolah")
            .select("sub_achievement")
            .ilike("main_achievement", val); // Gunakan ilike
            
        if (data && data.length > 0) {
            const allSubs = data.map(d => d.sub_achievement).join('\n').split('\n').filter(Boolean);
            const uniqueSubs = [...new Set(allSubs)];
            renderSubSelector(val, uniqueSubs);
        }
    };
}

// --- TABLE LOGIC (STRICT FILTER) ---
async function initTable(pertemuanId) {
    const classId = localStorage.getItem("activeClassId");
    
    const [resS, resA, resT, resScores] = await Promise.all([
        supabase.from("students").select("id, name, grade").eq("class_id", classId).eq("is_active", true),
        supabase.from("attendance").select("*").eq("pertemuan_id", pertemuanId),
        supabase.from("achievement_kelas").select(`id, achievement_sekolah (main_achievement, sub_achievement)`).eq("pertemuan_id", pertemuanId).order("id"),
        supabase.from("achievement_siswa").select("*").eq("pertemuan_id", pertemuanId)
    ]);

    // Sorting Grade -> Name
    const students = (resS.data || []).sort((a, b) => {
        const gA = a.grade || "", gB = b.grade || "";
        return gA.localeCompare(gB) || a.name.localeCompare(b.name);
    });

    const absensi = resA.data || [];
    const targets = resT.data || [];
    const scores = resScores.data || [];

    if(targets.length > 0) {
        currentTargets = targets.map(t => ({
            id: t.id, main: t.achievement_sekolah?.main_achievement || "?", sub: t.achievement_sekolah?.sub_achievement || "?"
        }));
    }
    renderTargetListUI();

    const scoreMap = {};
    scores.forEach(s => scoreMap[`${s.student_id}_${s.achievement_kelas_id}`] = s.score);

    // Render Table Header
    const thead = document.querySelector("#absensi-table thead");
    let hHtml = `<tr><th>No</th><th>Nama Siswa</th><th>Grade</th><th>H</th><th>S</th><th>F</th>`;
    currentTargets.forEach((t, i) => hHtml += `<th title="${t.main}">T${i+1}</th>`);
    thead.innerHTML = hHtml + "</tr>";

    // Render Table Body
    const tbody = document.querySelector("#absensi-table tbody");
    tbody.innerHTML = students.map((s, i) => {
        const att = absensi.find(a => a.student_id === s.id) || { status:0, sikap:3, fokus:2 };
        
        let row = `<tr data-sid="${s.id}">
            <td>${i+1}</td>
            <td>${s.name}</td> 
            <td><span class="grade-badge">${s.grade || '-'}</span></td>
            <td><select class="status-sel">${getOptions([['0','⬜'],['1','✅'],['2','❌']], att.status)}</select></td>
            <td><select class="sikap-sel">${getOptions([['0','❌'],['1','🤐'],['2','🙈'],['3','🙂'],['4','👀'],['5','🌀']], att.sikap)}</select></td>
            <td><select class="fokus-sel">${getOptions([['0','❌'],['1','😶'],['2','🙂'],['3','🔥']], att.fokus)}</select></td>`;
        
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

// --- SAVE & SUBMIT FUNCTIONS ---

async function saveTargetsToDB() {
    if (!selectedPertemuanId) return alert("Simpan pertemuan dulu!");
    
    const btn = document.getElementById("btn-save-targets-db");
    const oriText = btn.innerText;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        for (let i = 0; i < currentTargets.length; i++) {
            let t = currentTargets[i];
            if (t.id) continue; // Skip jika sudah ada ID (sudah tersimpan)
            
            let masterId;
            // FIX: Gunakan ilike untuk anti-duplicate case-insensitive
            const { data: exist } = await supabase.from("achievement_sekolah")
                .select("id")
                .ilike("main_achievement", t.main)
                .ilike("sub_achievement", t.sub)
                .maybeSingle();
            
            if(exist) masterId = exist.id;
            else {
                const { data: neu } = await supabase.from("achievement_sekolah").insert({ main_achievement: t.main, sub_achievement: t.sub }).select("id").single();
                masterId = neu.id;
            }
            
            // Link ke Kelas
            const { data: link } = await supabase.from("achievement_kelas").insert({
                pertemuan_id: selectedPertemuanId, class_id: localStorage.getItem("activeClassId"), achievement_sekolah_id: masterId 
            }).select("id").single();
            
            currentTargets[i].id = link.id; 
        }
        initTable(selectedPertemuanId); 
        alert("Target Berhasil Disimpan!");
    } catch (e) { 
        alert("Error: " + e.message); 
    } finally {
        btn.innerText = oriText;
    }
}

async function handleAbsensiSubmit() {
    if(!selectedPertemuanId) return alert("Pilih pertemuan dulu!");
    const btn = document.getElementById("simpan-absensi");
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menyimpan...`;
    
    const attBatch = [];
    const scoreBatch = [];
    const tgl = document.getElementById("materi-date").value;
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
            if(tid !== 'new') {
                scoreBatch.push({
                    pertemuan_id: selectedPertemuanId, student_id: sid, class_id: classId,
                    achievement_kelas_id: tid, score: sel.value
                });
            }
        });
    });

    // Reset & Insert (Safe Transition)
    await supabase.from("attendance").delete().eq("pertemuan_id", selectedPertemuanId);
    await supabase.from("achievement_siswa").delete().eq("pertemuan_id", selectedPertemuanId);
    
    if(attBatch.length) await supabase.from("attendance").insert(attBatch);
    if(scoreBatch.length) await supabase.from("achievement_siswa").insert(scoreBatch);
    
    alert("✅ Data Nilai Tersimpan!");
    btn.innerHTML = `💾 Simpan Nilai`;
}

// --- HELPERS ---

function getOptions(arr, selected) {
    return arr.map(([v, l]) => `<option value="${v}" ${v == selected ? 'selected' : ''}>${l}</option>`).join('');
}

function updateTotalHadir() {
    const count = document.querySelectorAll(".status-sel option[value='1']:checked").length;
    document.getElementById("total-hadir").textContent = count;
}

function renderTargetListUI() {
    const container = document.getElementById("target-list-preview");
    if (!container) return;
    container.innerHTML = currentTargets.map((t, i) => `
        <div style="padding:8px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
            <span><strong style="color:#f97316">Target ${i+1}:</strong> ${t.main} (${t.sub})</span>
            <button onclick="window.hapusTarget(${i})" style="border:none; background:none; color:#ef4444; cursor:pointer; font-size:1.1rem;">&times;</button>
        </div>
    `).join("");
}

window.hapusTarget = async (index) => {
    const t = currentTargets[index];
    if(t.id) {
        if(!confirm("Hapus target dari database?")) return;
        await supabase.from("achievement_kelas").delete().eq("id", t.id);
    }
    currentTargets.splice(index, 1);
    renderTargetListUI();
    if(selectedPertemuanId) initTable(selectedPertemuanId);
};

function addTargetToUI() {
    const main = document.getElementById("input-ach-main").value;
    const sub = document.getElementById("input-ach-sub").value;
    if(!main || !sub) return alert("Isi Topik dan Detail Target!");
    currentTargets.push({ main, sub, id: null });
    renderTargetListUI();
    document.getElementById("input-ach-sub").value = "";
}

// Data Loaders (Header, Guru, History, dll)
async function renderHeader() {
    const classId = localStorage.getItem("activeClassId");
    const { data: kelas } = await supabase.from("classes").select(`name, jadwal, schools (id, name), academic_years (year)`).eq("id", classId).single();
    if (kelas) {
        document.getElementById("header-kelas").textContent = kelas.name;
        document.getElementById("header-sekolah").textContent = kelas.schools?.name;
        document.getElementById("header-tahun").textContent = kelas.academic_years?.year;
        document.getElementById("header-jadwal").textContent = kelas.jadwal;
        localStorage.setItem("activeSchoolId", kelas.schools?.id || "");
    }
}
async function loadLevelOptions() {
    const { data } = await supabase.from("levels").select("id, kode").order("kode");
    const select = document.getElementById("materi-level-filter");
    select.innerHTML = '<option value="">-- Level --</option>';
    (data || []).forEach(l => select.add(new Option(l.kode, l.id)));
}
async function loadGuruDropdowns() {
    const { data } = await supabase.from("teachers").select("id, name").order("name");
    const g = document.getElementById("materi-guru"), a = document.getElementById("materi-asisten");
    g.innerHTML = '<option value="">-- Guru --</option>'; a.innerHTML = '<option value="">-- Asisten --</option>';
    (data || []).forEach(t => { g.add(new Option(t.name, t.id)); a.add(new Option(t.name, t.id)); });
}
async function loadAchievementSuggestions() {
    const { data } = await supabase.from("achievement_sekolah").select("main_achievement");
    const list = document.getElementById("list-ach-saran");
    if(data && list) {
        const unique = [...new Set(data.map(i=>i.main_achievement))];
        list.innerHTML = unique.map(v => `<option value="${v}">`).join("");
    }
}
async function loadPertemuanOptions() {
    const { data } = await supabase.from("pertemuan_kelas").select("id, tanggal, materi(title)").eq("class_id", localStorage.getItem("activeClassId")).order("tanggal", {ascending:false});
    const sel = document.getElementById("pertemuan-selector");
    sel.innerHTML = '<option value="">-- Pilih Sesi --</option>';
    (data || []).forEach(p => sel.add(new Option(`${new Date(p.tanggal).toLocaleDateString('id-ID')} - ${p.materi?.title}`, p.id)));
}
async function tampilkanDaftarMateri() {
    const classId = localStorage.getItem("activeClassId");
    const grid = document.getElementById("materi-history-list");
    
    // Ambil data
    const { data } = await supabase.from("pertemuan_kelas")
        .select("id, tanggal, materi(title), teachers!guru_id(name)")
        .eq("class_id", classId)
        .order("tanggal", {ascending:false});
    
    if (!data || !data.length) {
        grid.innerHTML = `<div style="color:#94a3b8; grid-column:1/-1; text-align:center; padding:30px; font-weight:500;">Belum ada riwayat pertemuan.</div>`;
        return;
    }

    // Render dengan Cycle Color VIBRANT
    grid.innerHTML = data.map((p, index) => {
        const colorClass = `card-color-${index % 5}`; 
        const tgl = new Date(p.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'short'});
        
        return `
        <div class="history-card ${colorClass}" onclick="window.editPertemuan('${p.id}')">
            <div>
                <div class="h-date">${tgl}</div>
                <div class="h-materi">${p.materi?.title || 'Tanpa Judul Materi'}</div>
            </div>
            <div class="h-teacher"><i class="fas fa-user-circle"></i> ${p.teachers?.name || '-'}</div>
        </div>`;
    }).join("");
}
async function loadMateriSuggestions(kw, lid) {
    const box = document.getElementById("materi-suggestion-box");
    if (!lid || kw.length < 2) { box.style.display = "none"; return; }
    // FIX: ilike for materi search
    const { data } = await supabase.from("materi").select("title").eq("level_id", lid).ilike("title", `%${kw}%`).limit(5);
    if(data && data.length) {
        box.innerHTML = data.map(m => `<div class="suggestion-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;" onclick="document.getElementById('materi-title').value='${m.title}'; this.parentElement.style.display='none';">${m.title}</div>`).join("");
        box.style.display = "block"; 
    } else box.style.display = "none";
}
function renderSubSelector(main, subs) {
    const area = document.getElementById("sub-achievement-injector-area");
    area.innerHTML = `<select id="smart-sub-select" class="input-modern" onchange="document.getElementById('input-ach-sub').value=this.value; document.getElementById('input-ach-sub').focus();"><option value="">-- Pilih Detail Tersimpan --</option>${subs.map(s=>`<option>${s}</option>`).join('')}</select>`;
}
function toggleAccordion(cid, iid) {
    const c = document.getElementById(cid), i = document.getElementById(iid);
    c.style.display = c.style.display === "none" ? "grid" : "none";
    i.classList.toggle("rotate-icon");
}
function resetFormMateri() { isEditMode = false; selectedPertemuanId = null; document.getElementById("materi-form").reset(); currentTargets = []; renderTargetListUI(); }

window.editPertemuan = async (id) => {
    const { data } = await supabase.from("pertemuan_kelas").select("*, materi(title, level_id)").eq("id", id).single();
    if(data) {
        isEditMode = true; selectedPertemuanId = id;
        document.getElementById("materi-date").value = data.tanggal;
        document.getElementById("materi-title").value = data.materi?.title;
        document.getElementById("materi-level-filter").value = data.materi?.level_id;
        document.getElementById("materi-guru").value = data.guru_id;
        document.getElementById("materi-asisten").value = data.asisten_id || "";
        document.getElementById("materi-form").style.display = "grid";
        
        // Auto open accordion
        document.getElementById("icon-materi").classList.add("rotate-icon");
        
        initTable(id);
        document.querySelector('.class-info-card').scrollIntoView({behavior:'smooth'});
    }
};

async function handleMateriSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-submit-materi");
    const oriText = btn.innerText;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const title = document.getElementById("materi-title").value.trim();
    const levelId = document.getElementById("materi-level-filter").value;
    try {
        // FIX: ilike for duplicate check
        let { data: materi } = await supabase.from("materi").select("id").ilike("title", title).eq("level_id", levelId).maybeSingle();
        if (!materi) {
            const res = await supabase.from("materi").insert({ title, level_id: levelId }).select().single();
            materi = res.data;
        }
        const payload = {
            school_id: localStorage.getItem("activeSchoolId"), class_id: localStorage.getItem("activeClassId"),
            tanggal: document.getElementById("materi-date").value, materi_id: materi.id,
            guru_id: document.getElementById("materi-guru").value, asisten_id: document.getElementById("materi-asisten").value || null
        };
        if (isEditMode && selectedPertemuanId) await supabase.from("pertemuan_kelas").update(payload).eq("id", selectedPertemuanId);
        else {
            const res = await supabase.from("pertemuan_kelas").insert(payload).select("id").single();
            selectedPertemuanId = res.data.id;
        }
        
        await loadPertemuanOptions(); 
        document.getElementById("pertemuan-selector").value = selectedPertemuanId; 
        initTable(selectedPertemuanId);
        
        // Close accordion after save to focus on targets
        toggleAccordion("materi-form", "icon-materi");
        document.getElementById("target-container").style.display = "grid"; // Open Target
        document.getElementById("icon-target").classList.add("rotate-icon");
        
    } catch (err) { alert(err.message); }
    finally { btn.innerText = oriText; }
}