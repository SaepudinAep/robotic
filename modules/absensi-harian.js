/**
 * Project: Absensi Harian Module (SPA) - LOGIC ONLY
 * Dependensi: absensi-harian.css (UI)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE MODULE ---
let selectedPertemuanId = null;
let currentTargets = []; 
let isEditMode = false;

// ==========================================
// 1. INITIALIZATION & UI LOADING
// ==========================================

export async function init(canvas) {
    const classId = localStorage.getItem("activeClassId");
    if (!classId) {
        alert("Pilih kelas terlebih dahulu!");
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('absensi-sekolah');
        return;
    }

    // PANGGIL CSS SECARA MANUAL DI SINI
    // Pastikan path ini sesuai dengan lokasi file css bapak
    loadExternalCSS('./assets/css/absensi-harian.css'); 

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
                            <div id="materi-suggestion-box" style="display:none;"></div>
                        </div>
                    </div>
                    <div class="form-group"><label>👨‍🏫 Guru</label><select id="materi-guru" class="input-modern" required></select></div>
                    <div class="form-group"><label>👥 Asisten</label><select id="materi-asisten" class="input-modern"></select></div>
                    <div class="form-group full margin-top">
                        <button type="submit" class="btn-primary blue-grad">💾 Simpan Pertemuan</button>
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

            <div class="card-section card-green-tint">
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
                        <tbody><tr><td colspan="6" style="padding:20px; color:#ccc;">Pilih Pertemuan 👆</td></tr></tbody>
                    </table>
                </div>
                <div class="action-bar-sticky">
                    <div style="font-size:0.8rem;">Hadir: <strong id="total-hadir" style="color:#166534">0</strong></div>
                    <button id="simpan-absensi" class="btn-primary green-grad">💾 Simpan Nilai</button>
                </div>
            </div>

            <div style="margin-top:20px;">
                <h4 class="history-title">Riwayat Pertemuan</h4>
                <div id="materi-history-list" class="history-grid"></div>
            </div>
        </div>
    `;

    await setupLogic();
}

// ==========================================
// 2. LOGIC CORE
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

    // Auto Suggestion
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
        const { data } = await supabase.from("achievement_sekolah").select("sub_achievement").eq("main_achievement", val);
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
    try {
        for (let i = 0; i < currentTargets.length; i++) {
            let t = currentTargets[i];
            if (t.id) continue; // Skip jika sudah ada ID (sudah tersimpan)
            
            let masterId;
            // Cek di Master
            const { data: exist } = await supabase.from("achievement_sekolah").select("id").eq("main_achievement", t.main).eq("sub_achievement", t.sub).maybeSingle();
            
            if(exist) masterId = exist.id;
            else {
                // Auto create master jika belum ada (Opsional, sesuai request 'satuan')
                const { data: neu } = await supabase.from("achievement_sekolah").insert({ main_achievement: t.main, sub_achievement: t.sub }).select("id").single();
                masterId = neu.id;
            }
            
            // Link ke Kelas
            const { data: link } = await supabase.from("achievement_kelas").insert({
                pertemuan_id: selectedPertemuanId, class_id: localStorage.getItem("activeClassId"), achievement_sekolah_id: masterId 
            }).select("id").single();
            
            currentTargets[i].id = link.id; // Update ID lokal
        }
        initTable(selectedPertemuanId); 
        alert("Target Berhasil!");
    } catch (e) { alert("Error: " + e.message); }
}

async function handleAbsensiSubmit() {
    if(!selectedPertemuanId) return alert("Pilih pertemuan dulu!");
    const btn = document.getElementById("simpan-absensi");
    btn.innerHTML = `⏳ Menyimpan...`;
    
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

    // Reset & Insert
    await supabase.from("attendance").delete().eq("pertemuan_id", selectedPertemuanId);
    await supabase.from("achievement_siswa").delete().eq("pertemuan_id", selectedPertemuanId);
    
    if(attBatch.length) await supabase.from("attendance").insert(attBatch);
    if(scoreBatch.length) await supabase.from("achievement_siswa").insert(scoreBatch);
    
    alert("Data Tersimpan!");
    btn.innerHTML = `💾 Simpan Nilai`;
}

// --- HELPERS ---

// FUNGSI PENTING: Memuat CSS Eksternal
function loadExternalCSS(url) {
    if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }
}

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
        <div style="padding:5px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
            <span><strong style="color:#f97316">T${i+1}</strong> ${t.main} - ${t.sub}</span>
            <button onclick="window.hapusTarget(${i})" style="border:none; background:none; color:#ef4444; cursor:pointer;">✖</button>
        </div>
    `).join("");
}

window.hapusTarget = async (index) => {
    const t = currentTargets[index];
    if(t.id) {
        if(!confirm("Hapus target?")) return;
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
    sel.innerHTML = '<option value="">-- Pilih --</option>';
    (data || []).forEach(p => sel.add(new Option(`${p.tanggal} - ${p.materi?.title}`, p.id)));
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
        // Cycle 0-4 untuk warna background berbeda
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
    const { data } = await supabase.from("materi").select("title").eq("level_id", lid).ilike("title", `%${kw}%`).limit(5);
    if(data && data.length) {
        box.innerHTML = data.map(m => `<div style="padding:5px; cursor:pointer; border-bottom:1px solid #eee;" onclick="document.getElementById('materi-title').value='${m.title}'; this.parentElement.style.display='none';">${m.title}</div>`).join("");
        box.style.display = "block"; box.style.background="white"; box.style.border="1px solid #ddd"; box.style.position="absolute"; box.style.width="100%"; box.style.zIndex="10";
    } else box.style.display = "none";
}
function renderSubSelector(main, subs) {
    const area = document.getElementById("sub-achievement-injector-area");
    area.innerHTML = `<select id="smart-sub-select" class="input-modern" onchange="document.getElementById('input-ach-sub').value=this.value; document.getElementById('input-ach-sub').style.display='block';">${subs.map(s=>`<option>${s}</option>`).join('')}</select>`;
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
        initTable(id);
        document.querySelector('.class-info-card').scrollIntoView({behavior:'smooth'});
    }
};
async function handleMateriSubmit(e) {
    e.preventDefault();
    const title = document.getElementById("materi-title").value.trim();
    const levelId = document.getElementById("materi-level-filter").value;
    try {
        let { data: materi } = await supabase.from("materi").select("id").eq("title", title).eq("level_id", levelId).maybeSingle();
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
        alert("Berhasil!"); await loadPertemuanOptions(); document.getElementById("pertemuan-selector").value = selectedPertemuanId; initTable(selectedPertemuanId);
    } catch (err) { alert(err.message); }
}