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
                <section id="tabelSiswaSection" class="rekap-section">
                    <table id="tabelDataSiswa" class="rigid-table"></table>
                </section>
                <section id="rekapAbsensiSection" class="rekap-section" style="display: none;">
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

function getActiveSemesterLabel() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    let semesterName, academicYear;

    if (month >= 7 && month <= 12) {
        semesterName = "Semester 1";
        academicYear = `${year}/${year + 1}`;
    } else {
        semesterName = "Semester 2";
        academicYear = `${year - 1}/${year}`;
    }
    return { semesterName, academicYear };
}

// --- DROPDOWNS ---
async function isiDropdownTahunAjaran() {
    const select = document.getElementById("academicYearSelect");
    const { data, error } = await supabase.from("academic_years").select("id, year").order("year", { ascending: false });
    
    if (error) return console.error(error);
    
    select.innerHTML = "";
    const { academicYear } = getActiveSemesterLabel();
    data.forEach(item => {
        const option = new Option(item.year, item.id);
        if (item.year === academicYear) option.selected = true;
        select.add(option);
    });
    await isiDropdownSemester();
}

async function isiDropdownSemester() {
    const ayId = document.getElementById("academicYearSelect").value;
    const select = document.getElementById("semesterSelect");
    
    const { data } = await supabase.from("semesters").select("id, name").eq("academic_year_id", ayId);
    
    select.innerHTML = "";
    const { semesterName } = getActiveSemesterLabel();
    data.forEach(item => {
        // Pembersihan nama semester agar cocok (misal: "Semester 2" match dengan "Semester 2 (Genap)")
        const cleanName = semesterName.split(' (')[0].trim();
        const option = new Option(item.name, item.id);
        if (item.name === cleanName) option.selected = true;
        select.add(option);
    });
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

function ikonAbsensi(status) {
    const map = { 0: "❌", 1: "✅", 2: "⚠️" }; // 0: Alfa, 1: Hadir, 2: Izin/Sakit
    return map[status] ?? "-";
}

function ikonSikap(val) {
    const map = { 0: "❌", 1: "🤐", 2: "🙂", 3: "🔥" }; 
    return map[val] ?? "-";
}

async function loadRekapAbsensi() {
    showSection("rekapAbsensiSection");
    updateActiveBtn("btnRekapAbsensi");

    const classId = document.getElementById("classSelect").value;
    const startId = document.getElementById("pertemuanStartSelect").value;
    const endId = document.getElementById("pertemuanEndSelect").value;
    if(!startId || !endId) return;

    // 1. Get List Pertemuan dalam Range
    const { data: allP } = await supabase.from("pertemuan_kelas").select("id, tanggal").eq("class_id", classId).order("tanggal");
    const sIdx = allP.findIndex(p => p.id === startId);
    const eIdx = allP.findIndex(p => p.id === endId);
    const pSlice = allP.slice(sIdx, eIdx + 1);

    // 2. Get Students
    const { data: students } = await supabase.from("students").select("id, name, grade").eq("class_id", classId).order("name");

    // 3. Get Attendance Data
    const { data: att } = await supabase.from("attendance").select("student_id, pertemuan_id, status").in("pertemuan_id", pSlice.map(p => p.id));

    // 4. Map Data
    const map = {};
    att.forEach(a => {
        if(!map[a.student_id]) map[a.student_id] = {};
        map[a.student_id][a.pertemuan_id] = a.status;
    });

    // 5. Render
    const table = document.getElementById("rekapAbsensiTable");
    let html = `<thead><tr><th width="40">No</th><th style="text-align:left;">Nama Siswa</th><th width="80">Kelas</th>`;
    pSlice.forEach(p => html += `<th width="50">${formatTanggal(p.tanggal)}</th>`);
    html += `</tr></thead><tbody>`;

    students.forEach((s, i) => {
        html += `<tr><td>${i+1}</td><td style="text-align:left; padding-left:10px;">${s.name}</td><td>${s.grade || '-'}</td>`;
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

    const { data: allP } = await supabase.from("pertemuan_kelas").select("id, tanggal").eq("class_id", classId).order("tanggal");
    const sIdx = allP.findIndex(p => p.id === startId);
    const eIdx = allP.findIndex(p => p.id === endId);
    const pSlice = allP.slice(sIdx, eIdx + 1);

    const { data: students } = await supabase.from("students").select("id, name, grade").eq("class_id", classId).order("name");
    const { data: att } = await supabase.from("attendance").select("student_id, pertemuan_id, sikap, fokus").in("pertemuan_id", pSlice.map(p => p.id));

    const map = {};
    att.forEach(a => {
        if(!map[a.student_id]) map[a.student_id] = {};
        map[a.student_id][a.pertemuan_id] = {s: a.sikap, f: a.fokus};
    });

    const table = document.getElementById("rekapPembelajaranTable");
    let html = `<thead><tr><th>No</th><th style="text-align:left;">Nama</th>`;
    pSlice.forEach(p => html += `<th>${formatTanggal(p.tanggal)}</th>`);
    html += `</tr></thead><tbody>`;

    students.forEach((s, i) => {
        html += `<tr><td>${i+1}</td><td style="text-align:left;">${s.name}</td>`;
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
    ["tabelSiswaSection", "rekapAbsensiSection", "rekapPembelajaranSection"].forEach(sid => {
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