/**
 * Project: Rekap Absensi Sekolah Module (SPA)
 * Description: Laporan Absensi & Pembelajaran dengan filter bertingkat & Export Excel.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Inject CSS Khusus Laporan
    injectStyles();

    // 2. Render HTML Skeleton
    canvas.innerHTML = `
        <div class="rekap-container">
            <div class="rekap-top-header no-print">
                <h2>Rekapitulasi Absensi</h2>
                <button id="btn-back" class="btn-secondary"><i class="fas fa-arrow-left"></i> Kembali</button>
            </div>

            <section class="search-section card shadow-soft no-print">
                <div class="filter-grid">
                    <div class="form-group">
                        <label>Tahun Ajaran</label>
                        <select id="academicYearSelect" class="input-pro"></select>
                    </div>
                    <div class="form-group">
                        <label>Semester</label>
                        <select id="semesterSelect" class="input-pro"></select>
                    </div>
                    <div class="form-group">
                        <label>Pilih Kelas</label>
                        <select id="classSelect" class="input-pro"></select>
                    </div>
                    <div class="form-group" style="display:flex; align-items:flex-end;">
                        <button id="loadRekap" class="btn-primary" style="width: 100%;">
                            <i class="fas fa-search"></i> TAMPILKAN
                        </button>
                    </div>
                </div>
            </section>

            <div class="rekap-header card shadow-soft" style="text-align: center; margin-bottom: 20px; display:none;" id="report-header">
                <h2 id="schoolName" style="font-family: 'Fredoka One', cursive; color: #4d97ff; margin:0;">-</h2>
                <div style="font-size:0.9rem; color:#555; margin-top:5px;">
                    <span id="meta-tahun"></span> &nbsp;|&nbsp; <span id="meta-semester"></span>
                </div>
                <div style="font-size:0.9rem; color:#333; font-weight:bold; margin-top:5px;">
                    <span id="meta-kelas"></span> &nbsp;|&nbsp; <span id="meta-jadwal"></span>
                </div>
            </div>

            <div class="card shadow-soft no-print" id="control-bar" style="padding: 15px; margin-bottom: 20px; display:none;">
                <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 8px;">
                        <button id="btnRekapAbsensi" class="tab-btn-mini active">Absensi</button>
                        <button id="btnRekapPembelajaran" class="tab-btn-mini">Pembelajaran</button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label style="font-size:0.8rem;">Rentang:</label>
                        <select id="pertemuanStartSelect" class="input-mini"></select>
                        <span style="font-size:0.8rem;">s/d</span>
                        <select id="pertemuanEndSelect" class="input-mini"></select>
                        
                        <button id="exportExcel" class="btn-mini green"><i class="fas fa-file-excel"></i> Excel</button>
                        <button id="printRekap" class="btn-mini blue"><i class="fas fa-print"></i> Cetak</button>
                    </div>
                </div>
            </div>

            <div class="table-scroll shadow-soft" id="report-area" style="background: white; border-radius: 12px; overflow-x: auto; padding: 10px; display:none;">
                <section id="rekapAbsensiSection" class="rekap-section">
                    <table id="rekapAbsensiTable" class="rigid-table"></table>
                </section>
                <section id="rekapPembelajaranSection" class="rekap-section" style="display: none;">
                    <table id="rekapPembelajaranTable" class="rigid-table"></table>
                </section>
            </div>
        </div>
    `;

    // 3. Bind Events & Logic
    setupEvents();
    await isiDropdownTahunAjaran();
}

// ==========================================
// 2. CSS STYLING (Laporan Rigid)
// ==========================================
function injectStyles() {
    const styleId = 'rekap-absensi-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .rekap-container { max-width: 1200px; margin: 0 auto; padding-bottom: 80px; font-family: 'Roboto', sans-serif; }
        
        .rekap-top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .rekap-top-header h2 { margin: 0; font-family: 'Fredoka One', cursive; color: #333; }

        .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: end; padding: 20px; background: white; border-radius: 12px; }
        .input-pro { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
        .input-mini { padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; }

        .tab-btn-mini { padding: 8px 15px; border: 1px solid #ddd; background: white; border-radius: 20px; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
        .tab-btn-mini.active { background: #4d97ff; color: white; border-color: #4d97ff; }
        
        .btn-mini { padding: 8px 12px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 0.85rem; font-weight: bold; display: flex; gap: 5px; align-items: center; }
        .btn-mini.green { background: #2ecc71; }
        .btn-mini.blue { background: #3498db; }

        /* Rigid Table (Gaya Laporan Kaku) */
        .rigid-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; color: #000; }
        .rigid-table th, .rigid-table td { border: 1px solid #333; padding: 8px 5px; text-align: center; }
        .rigid-table th { background: #f2f2f2; font-weight: bold; text-transform: uppercase; font-family: 'Fredoka One', cursive; font-size: 0.75rem; }
        .rigid-table tr:nth-child(even) { background: #fafafa; }
        .rekap-legend { caption-side: top; text-align: left; font-size: .75rem; color: #555; padding-bottom: 6px; white-space: normal; }

        @media print {
            .no-print { display: none !important; }
            .rekap-container { width: 100%; padding: 0; margin: 0; }
            .rigid-table { font-size: 10pt; }
            @page { size: landscape; margin: 10mm; }
        }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC (Dropdowns & Data)
// ==========================================

// --- DROPDOWNS ---
async function isiDropdownTahunAjaran() {
    const select = document.getElementById("academicYearSelect");
    const { data, error } = await supabase.from("academic_years").select("id, year, is_active").order("year", { ascending: false });
    
    if (error) return console.error(error);
    
    select.innerHTML = "";
    data.forEach(item => {
        const option = new Option(item.year, item.id);
        if (item.is_active) option.selected = true;
        select.add(option);
    });
    await isiDropdownSemester();
}

async function isiDropdownSemester() {
    const ayId = document.getElementById("academicYearSelect").value;
    const select = document.getElementById("semesterSelect");
    
    const { data } = await supabase.from("semesters").select("id, name, is_active").eq("academic_year_id", ayId).order("name");
    
    select.innerHTML = "";
    if (data && data.length > 0) {
        data.forEach(item => {
            const option = new Option(item.name, item.id);
            if (item.is_active) option.selected = true;
            select.add(option);
        });
    }
    await isiDropdownKelas();
}

async function isiDropdownKelas() {
    const ayId = document.getElementById("academicYearSelect").value;
    const sId = document.getElementById("semesterSelect").value;
    const select = document.getElementById("classSelect");

    const { data } = await supabase.from("classes").select("id, name, schools(name)").eq("academic_year_id", ayId).eq("semester_id", sId);
    
    select.innerHTML = '<option value="">- Pilih Kelas -</option>';
    if(data) {
        data.forEach(k => {
            const school = k.schools?.name || "Umum";
            select.add(new Option(`${k.name} (${school})`, k.id));
        });
    }
}

// --- LOAD REPORT ---
async function handleLoadRekap() {
    const classId = document.getElementById("classSelect").value;
    if (!classId) return alert("Pilih kelas dulu.");

    // Load Class Info
    const { data } = await supabase.from("classes").select("jadwal, name, schools(name)").eq("id", classId).single();
    
    if(data) {
        document.getElementById("schoolName").textContent = data.schools?.name || "Sekolah Umum";
        document.getElementById("meta-tahun").textContent = document.getElementById("academicYearSelect").selectedOptions[0].text;
        document.getElementById("meta-semester").textContent = document.getElementById("semesterSelect").selectedOptions[0].text;
        document.getElementById("meta-kelas").textContent = data.name;
        document.getElementById("meta-jadwal").textContent = data.jadwal || "-";
        
        document.getElementById("report-header").style.display = 'block';
        document.getElementById("control-bar").style.display = 'block';
        document.getElementById("report-area").style.display = 'block';
    }

    await isiDropdownPertemuan(classId);
    await loadRekapAbsensi(); // Default load absensi
}

async function isiDropdownPertemuan(classId) {
    const { data } = await supabase.from("pertemuan_kelas").select("id, tanggal").eq("class_id", classId).order("tanggal", { ascending: true });
    
    const start = document.getElementById("pertemuanStartSelect");
    const end = document.getElementById("pertemuanEndSelect");
    start.innerHTML = ""; end.innerHTML = "";

    if(data && data.length > 0) {
        data.forEach((p, i) => {
            const label = `P${i + 1} - ${new Date(p.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit'})}`;
            start.add(new Option(label, p.id));
            end.add(new Option(label, p.id));
        });
        start.value = data[0].id;
        end.value = data[data.length - 1].id;
    }
}

// --- TABLE RENDERING ---
function formatTanggal(tgl) {
    const d = new Date(tgl);
    return `${d.getDate()}/${d.getMonth()+1}`;
}

// [FIX #3] helper escape (konsisten dengan modul lain)
function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// [FIX #3] ambil daftar pertemuan dalam rentang; auto-swap bila terbalik; tolak ID basi
async function getPertemuanSlice(classId, startId, endId) {
    const { data: allP, error } = await supabase.from("pertemuan_kelas")
        .select("id, tanggal").eq("class_id", classId).order("tanggal");
    if (error) throw error;

    let sIdx = allP.findIndex(p => p.id === startId);
    let eIdx = allP.findIndex(p => p.id === endId);
    if (sIdx === -1 || eIdx === -1) return [];      // dropdown basi / data berubah

    if (sIdx > eIdx) [sIdx, eIdx] = [eIdx, sIdx];   // guru salah urut? otomatis dibalik
    return allP.slice(sIdx, eIdx + 1);
}

// [FIX #1] Semantik disamakan dengan modul Input Harian:
// 0 = ⬜ belum dinilai · 1 = ✅ hadir · 2 = ❌ alpa
function ikonAbsensi(status) {
    if (status === undefined || status === null) return "-"; // tidak ada record pada pertemuan itu
    const map = { 0: "⬜", 1: "✅", 2: "❌" };
    return map[status] ?? "-";
}

// [FIX #2] Skala lengkap mengikuti siklus input: sikap 0-5, fokus 0-3
function ikonSikap(val) {
    if (val === undefined || val === null) return "-";
    const map = { 0: "❌", 1: "🤐", 2: "🙈", 3: "🙂", 4: "👀", 5: "🌀" };
    return map[val] ?? "-";
}

async function loadRekapAbsensi() {
    showSection("rekapAbsensiSection");
    updateActiveBtn("btnRekapAbsensi");

    const classId = document.getElementById("classSelect").value;
    const startId = document.getElementById("pertemuanStartSelect").value;
    const endId = document.getElementById("pertemuanEndSelect").value;
    if(!startId || !endId) return;

    // [FIX #3] rentang aman (auto-swap bila terbalik / tolak ID basi)
    let pSlice;
    try { pSlice = await getPertemuanSlice(classId, startId, endId); }
    catch(e) { return alert("Gagal memuat data pertemuan: " + e.message); }
    if (!pSlice.length) return alert("Rentang pertemuan tidak valid atau belum ada data.");

    // [FIX #4] hanya siswa aktif
    const [{ data: students, error: errS }, { data: att, error: errA }] = await Promise.all([
        supabase.from("students").select("id, name, grade").eq("class_id", classId).eq("is_active", true).order("grade").order("name"),
        supabase.from("attendance").select("student_id, pertemuan_id, status").in("pertemuan_id", pSlice.map(p => p.id))
    ]);
    if (errS || errA) return alert("Gagal memuat laporan: " + ((errS || errA)?.message || "?")); // [FIX #5]

    // Map Data
    const map = {};
    (att || []).forEach(a => {
        if(!map[a.student_id]) map[a.student_id] = {};
        map[a.student_id][a.pertemuan_id] = a.status;
    });

    // Render (+ legenda agar makna ikon jelas)
    const table = document.getElementById("rekapAbsensiTable");
    let html = `<caption class="rekap-legend">Legenda: ⬜ belum dinilai · ✅ hadir · ❌ alpa · - tanpa data</caption>`;
    html += `<thead><tr><th width="40">No</th><th style="text-align:left;">Nama Siswa</th><th width="80">Kelas</th>`;
    pSlice.forEach(p => html += `<th width="50">${formatTanggal(p.tanggal)}</th>`);
    html += `</tr></thead><tbody>`;

    students.forEach((s, i) => {
        html += `<tr><td>${i+1}</td><td style="text-align:left; padding-left:10px;">${escapeHtml(s.name)}</td><td>${escapeHtml(s.grade || '-')}</td>`;
        pSlice.forEach(p => {
            html += `<td>${ikonAbsensi(map[s.id]?.[p.id])}</td>`;
        });
        html += `</tr>`;
    });
    table.innerHTML = html + `</tbody>`;
}

async function loadRekapPembelajaran() {
    showSection("rekapPembelajaranSection");
    updateActiveBtn("btnRekapPembelajaran");

    // Logic mirip absensi tapi ambil kolom sikap/fokus
    const classId = document.getElementById("classSelect").value;
    const startId = document.getElementById("pertemuanStartSelect").value;
    const endId = document.getElementById("pertemuanEndSelect").value;
    if(!startId || !endId) return;

    // [FIX #3] rentang aman (auto-swap bila terbalik / tolak ID basi)
    let pSlice;
    try { pSlice = await getPertemuanSlice(classId, startId, endId); }
    catch(e) { return alert("Gagal memuat data pertemuan: " + e.message); }
    if (!pSlice.length) return alert("Rentang pertemuan tidak valid atau belum ada data.");

    // [FIX #4] hanya siswa aktif
    const [{ data: students, error: errS }, { data: att, error: errA }] = await Promise.all([
        supabase.from("students").select("id, name, grade").eq("class_id", classId).eq("is_active", true).order("grade").order("name"),
        supabase.from("attendance").select("student_id, pertemuan_id, sikap, fokus").in("pertemuan_id", pSlice.map(p => p.id))
    ]);
    if (errS || errA) return alert("Gagal memuat laporan: " + ((errS || errA)?.message || "?")); // [FIX #5]

    const map = {};
    (att || []).forEach(a => {
        if(!map[a.student_id]) map[a.student_id] = {};
        map[a.student_id][a.pertemuan_id] = {s: a.sikap, f: a.fokus};
    });

    const table = document.getElementById("rekapPembelajaranTable");
    let html = `<caption class="rekap-legend">Legenda: ❌ belum dinilai · 🙈🤐🙂👀🌀 tingkat sikap · - tanpa data</caption>`;
    html += `<thead><tr><th>No</th><th style="text-align:left;">Nama</th>`;
    pSlice.forEach(p => html += `<th>${formatTanggal(p.tanggal)}</th>`);
    html += `</tr></thead><tbody>`;

    students.forEach((s, i) => {
        html += `<tr><td>${i+1}</td><td style="text-align:left;">${escapeHtml(s.name)}</td>`;
        pSlice.forEach(p => {
            const val = map[s.id]?.[p.id];
            // Format: Sikap | Fokus
            const content = val ? `${ikonSikap(val.s)} ${ikonSikap(val.f)}` : "-"; 
            html += `<td>${content}</td>`;
        });
        html += `</tr>`;
    });
    table.innerHTML = html + `</tbody>`;
}

// --- UTILS & EVENTS ---
function showSection(id) {
    ["rekapAbsensiSection", "rekapPembelajaranSection"].forEach(sid => {
        const el = document.getElementById(sid);
        if(el) el.style.display = (sid === id) ? "block" : "none";
    });
}

function updateActiveBtn(btnId) {
    document.querySelectorAll(".tab-btn-mini").forEach(b => b.classList.remove("active"));
    document.getElementById(btnId).classList.add("active");
}

function setupEvents() {
    document.getElementById("academicYearSelect").addEventListener("change", isiDropdownSemester);
    document.getElementById("semesterSelect").addEventListener("change", isiDropdownKelas);
    document.getElementById("loadRekap").addEventListener("click", handleLoadRekap);
    
    document.getElementById("btnRekapAbsensi").addEventListener("click", loadRekapAbsensi);
    document.getElementById("btnRekapPembelajaran").addEventListener("click", loadRekapPembelajaran);
    
    document.getElementById("btn-back").addEventListener("click", () => {
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('absensi-sekolah', 'Absensi', 'Kelas');
    });

    document.getElementById("printRekap").addEventListener("click", () => window.print());
    
    document.getElementById("exportExcel").addEventListener("click", () => {
        const activeTable = document.querySelector(".rekap-section[style*='block'] table");
        if (!activeTable) return alert("Tabel kosong.");
        
        if(!window.XLSX) return alert("Library Excel belum dimuat.");

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.table_to_sheet(activeTable);
        XLSX.utils.book_append_sheet(wb, ws, "Rekap");
        XLSX.writeFile(wb, "Rekap_Data.xlsx");
    });
}