/**
 * Billing - Rekap Guru/Asisten (sub-modul)
 * Sumber: pertemuan_kelas. Dipanggil billing.js tab "Rekap Guru".
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

let styleInjected = false;
let allLevels     = [];
let allLevelRows  = []; // baris level id+kode (dipakai untuk join level materi di client)
let lastResult    = null;
let runToken      = 0;   // guard race-condition saat auto-refresh checkbox
let bgView        = 'total'; // mode tampilan: 'total' | 'rincian'

// ========== 1. ENTRY POINT ==========
export async function initGuru(container) {
    injectStyles();

    const now  = new Date();
    const y    = now.getFullYear();
    const m    = String(now.getMonth() + 1).padStart(2, '0');
    const from = y + '-' + m + '-01';
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    const to   = y + '-' + m + '-' + String(last).padStart(2, '0');

    container.innerHTML = `
        <div class="bg-filter-panel card">
            <div class="bg-filter-row">
                <label class="bg-filter-label"><span>Dari</span>
                    <input type="date" id="bg-from" class="bp-input" value="${from}"></label>
                <label class="bg-filter-label"><span>s/d</span>
                    <input type="date" id="bg-to"   class="bp-input" value="${to}"></label>
                <label class="bg-filter-label"><span>Guru / Asisten</span>
                    <select id="bg-guru-filter" class="bp-input" style="width:180px;">
                        <option value="">Semua</option>
                    </select></label>
                <button id="bg-btn-show"   class="bp-btn-primary">
                    <i class="fas fa-search"></i> Tampilkan</button>
                <button id="bg-btn-export" class="bg-btn-export" style="display:none;">
                    <i class="fas fa-file-csv"></i> Export CSV</button>
                <button id="bg-btn-print" class="bg-btn-print" style="display:none;">
                    <i class="fas fa-print"></i> Print / PDF</button>
            </div>
            <div class="bg-view-switch" id="bg-view-switch">
                <button type="button" class="bg-view-btn active" data-bg-view="total">Total</button>
                <button type="button" class="bg-view-btn" data-bg-view="rincian">Rincian</button>
            </div>
            <div id="bg-level-checks" class="bg-level-checks">
                <span style="color:#94a3b8;font-size:.82rem;">Memuat level...</span>
            </div>
        </div>
        <div id="bg-result">
            <p class="card" style="color:#94a3b8;text-align:center;margin-top:14px;">
                Pilih rentang tanggal lalu klik <b>Tampilkan</b>.
            </p>
        </div>`;

    allLevelRows = await fetchLevels();
    allLevels = allLevelRows.map(r => r.kode).filter(Boolean);
    renderLevelCheckboxes();
    document.getElementById('bg-btn-show').onclick   = run;
    document.getElementById('bg-btn-export').onclick = exportCsv;
    document.getElementById('bg-btn-print').onclick  = printReport;

    // Dropdown filter Guru / Asisten (rincian per pengajar)
    try {
        const teachers = await fetchAllTeachers();
        const selGuru = document.getElementById('bg-guru-filter');
        (teachers || []).forEach(t => selGuru.add(new Option(t.name, t.id)));
        selGuru.onchange = run; // auto-refresh saat guru dipilih
    } catch (e) { console.error('[billing-guru] muat guru:', e.message); }

    // Toggle tampilan Total / Rincian
    document.querySelectorAll('#bg-view-switch .bg-view-btn').forEach(btn => {
        btn.onclick = () => {
            bgView = btn.dataset.bgView;
            document.querySelectorAll('#bg-view-switch .bg-view-btn')
                .forEach(b => b.classList.toggle('active', b === btn));
            run(); // render ulang dengan mode baru (data sudah di-fetch ulang)
        };
    });
}

// ========== 2. FETCH ==========
// Ambil level dari tabel MASTER `levels` (kode = nama level, lengkap termasuk
// Kiddy / Robotic / Beginner) sebagai acuan checkbox Juga dipakai untuk
// menerjemahkan materi.level_id -> kode level.
async function fetchLevels() {
    const { data, error } = await supabase
        .from('levels')
        .select('id,kode,order_index')
        .order('order_index', { ascending: true });
    if (error) { console.error('level fetch:', error.message); return []; }
    return data || [];
}

async function fetchPertemuan(df, dt) {
    const { data, error } = await supabase
        .from('pertemuan_kelas')
        .select('id,tanggal,guru_id,asisten_id,materi_id,class_id')
        .gte('tanggal', df).lte('tanggal', dt);
    if (error) throw new Error('pertemuan: ' + error.message);
    return data || [];
}

// Kelas & sekolah diambil terpisah lalu di-join di client
// (nama kelas + sekolah tampil di mode Rincian).
async function fetchClasses() {
    const { data, error } = await supabase
        .from('classes')
        .select('id,name,school_id');
    if (error) throw new Error('classes: ' + error.message);
    return data || [];
}

async function fetchSchools() {
    const { data, error } = await supabase
        .from('schools')
        .select('id,name');
    if (error) throw new Error('schools: ' + error.message);
    return data || [];
}

// Materi diambil sebagai query terpisah lalu di-join di client.
// (Menghindari nested embed yang rawan ambigu, mis. error
//  "materi_1.name does not exist" — tabel materi kolom judulnya `title`.)
async function fetchMateri() {
    const { data, error } = await supabase
        .from('materi')
        .select('id,title,level_id,level');
    if (error) throw new Error('materi: ' + error.message);
    return data || [];
}

async function fetchAllTeachers() {
    const { data, error } = await supabase
        .from('teachers').select('id,name,role').order('name');
    if (error) throw new Error('teachers: ' + error.message);
    return data || [];
}

// ========== 2b. LEVEL RESOLVER (ROUTING JAUH) ==========
// Level sesungguhnya sebuah pertemuan, diselesaikan di CLIENT:
//   pertemuan_kelas.materi_id -> materi.level_id -> levels.kode
// Fallback 1: kolom teks materi.level (snapshot, isinya sama dengan levels.kode).
// Fallback 2: 'Tanpa Level'.

// Peta materi_id -> kode level, dibangun sekali per run().
function buildLevelMap(materis, levelRows) {
    const kodeByLevelId = new Map((levelRows || []).map(l => [l.id, l.kode]));
    const map = new Map();
    (materis || []).forEach(m => {
        map.set(m.id, kodeByLevelId.get(m.level_id) || m.level || '');
    });
    return map;
}

function resolveLevel(materiId, levelByMateri) {
    return levelByMateri.get(materiId) || 'Tanpa Level';
}

// ========== 3. CHECKBOXES ==========
function renderLevelCheckboxes() {
    const box = document.getElementById('bg-level-checks');
    if (!box) return;
    if (!allLevels.length) {
        box.innerHTML = '<span style="color:#94a3b8;font-size:.82rem;">Tidak ada level di database.</span>';
        return;
    }

    box.innerHTML = `
        <span class="bg-check-label">Filter Level:</span>
        ${allLevels.map(lv => `
            <label class="bg-check-item">
                <input type="checkbox" class="bg-lv-check" value="${esc(lv)}" checked>
                <span>${esc(lv)}</span>
            </label>`).join('')}
        <button type="button" class="bg-check-toggle" data-bg-toggle="all">Semua</button>
        <button type="button" class="bg-check-toggle" data-bg-toggle="none">Hapus</button>`;

    // 1) Checkbox berubah -> refresh hasil otomatis (filter & tabel selalu sinkron).
    // Pakai event delegation agar aman walau checkbox di-render ulang.
    box.addEventListener('change', (e) => {
        if (!e.target.matches('.bg-lv-check')) return;

        // Cegah kondisi "0 level terpilih" lewat klik individu:
        // kembalikan centang agar filter tetap valid & hasil tidak hilang.
        if (!getCheckedLevels().length) {
            e.target.checked = true;
            alert('Minimal satu level harus dipilih.');
            return;
        }
        run();
    });

    // 2) Tombol "Semua" / "Hapus" — set lalu langsung refresh hasil.
    const btnAll  = box.querySelector('[data-bg-toggle="all"]');
    const btnNone = box.querySelector('[data-bg-toggle="none"]');
    if (btnAll)  btnAll.onclick  = () => bgToggleAll(true);
    if (btnNone) btnNone.onclick = () => bgToggleAll(false);
}

// Toggle semua checkbox lalu langsung memperbarui hasil, konsisten
// dengan klik per-checkbox (filter & tabel tidak boleh tidak sinkron).
function bgToggleAll(checked) {
    document.querySelectorAll('.bg-lv-check')
        .forEach(cb => { cb.checked = checked; });
    run(); // run() akan menampilkan pesan validasi bila tidak ada level terpilih
}

// Ekspor ke window agar tetap kompatibel dengan handler lama bila ada.
window.bgToggleAll = bgToggleAll;

function getCheckedLevels() {
    return [...document.querySelectorAll('.bg-lv-check:checked')].map(cb => cb.value);
}

// Tampilkan/sembunyikan tombol Export & Print sekaligus
function setResultButtons(visible) {
    const ex = document.getElementById('bg-btn-export');
    const pr = document.getElementById('bg-btn-print');
    const disp = visible ? 'inline-flex' : 'none';
    if (ex) ex.style.display = disp;
    if (pr) pr.style.display = disp;
}

// ========== 4. RUN ==========
async function run() {
    const df  = document.getElementById('bg-from').value;
    const dt  = document.getElementById('bg-to').value;
    const lvs = getCheckedLevels();
    const guruId = document.getElementById('bg-guru-filter')?.value || '';
    const box = document.getElementById('bg-result');
    const myToken = ++runToken; // token untuk membatalkan respon basi (stale)

    if (!df || !dt) { alert('Pilih rentang tanggal!'); return; }
    if (dt < df)    { alert('Tanggal akhir tidak boleh lebih awal!'); return; }
    if (!lvs.length) {
        box.innerHTML = `<p class="card" style="color:#b45309;text-align:center;margin-top:14px;">
            <i class="fas fa-exclamation-triangle"></i> Pilih minimal satu level.</p>`;
        setResultButtons(false);
        return;
    }

    box.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;">
        <i class="fas fa-circle-notch fa-spin"></i> Memuat...</div>`;
    setResultButtons(false);

    try {
        const [pertemuan, teachers, materis, classes, schools] = await Promise.all([
            fetchPertemuan(df, dt), fetchAllTeachers(), fetchMateri(),
            fetchClasses(), fetchSchools()
        ]);
        const levelByMateri = buildLevelMap(materis, allLevelRows);

        // Lookup maps untuk mode Rincian (sekolah, kelas, materi, guru/asisten)
        const schoolById  = new Map(schools.map(s => [s.id, s.name || '—']));
        const classById   = new Map(classes.map(c => [c.id, {
            name:   c.name || '—',
            school: schoolById.get(c.school_id) || '—',
        }]));
        const materiById  = new Map(materis.map(m => [m.id, m.title || '—']));
        const teacherById = new Map(teachers.map(t => [t.id, t]));
        const guruLabel   = guruId ? (teacherById.get(guruId)?.name || '') : '';

        // Jika user sudah mengubah filter/tanggal saat request berjalan,
        // buang hasil basi ini agar tidak menimpa state yang lebih baru.
        if (myToken !== runToken) return;

        const filtered = pertemuan.filter(p => {
            if (!lvs.includes(resolveLevel(p.materi_id, levelByMateri))) return false;
            // Filter guru: pertemuan harus melibatkan guru tsb (sebagai guru ATAU asisten)
            if (guruId && p.guru_id !== guruId && p.asisten_id !== guruId) return false;
            return true;
        });

        if (!filtered.length) {
            box.innerHTML = `<p class="card" style="color:#94a3b8;text-align:center;margin-top:14px;">
                <i class="fas fa-inbox"></i>&nbsp;
                Tidak ada pertemuan pada periode &amp; level yang dipilih.</p>`;
            lastResult = null; return;
        }

        // Pivot: teacherId -> { level -> count }
        const pivot = {};
        filtered.forEach(p => {
            const lv = resolveLevel(p.materi_id, levelByMateri);
            [p.guru_id, p.asisten_id].forEach(tid => {
                if (!tid) return;
                if (!pivot[tid]) pivot[tid] = {};
                pivot[tid][lv] = (pivot[tid][lv] || 0) + 1;
            });
        });

        // Kolom level = yang dicentang, urut sesuai allLevels
        const levelCols = allLevels.filter(lv => lvs.includes(lv));

        const rows = teachers
            .filter(t => pivot[t.id])
            .map(t => {
                const counts = levelCols.map(lv => pivot[t.id]?.[lv] || 0);
                const total  = counts.reduce((s, n) => s + n, 0);
                return { ...t, counts, total };
            })
            .filter(r => r.total > 0)
            .sort((a, b) => b.total - a.total);

        // Detail rows: 1 baris per pertemuan (mode Rincian) — dibangun sebelum
        // cek rows agar mode Rincian tetap tampil walau tidak ada guru tercatat.
        const detailRows = filtered
            .map(p => {
                const cls = classById.get(p.class_id) || { name: '—', school: '—' };
                return {
                    tanggal:  p.tanggal || '',
                    sekolah:  cls.school,
                    kelas:    cls.name,
                    level:    resolveLevel(p.materi_id, levelByMateri),
                    materi:   materiById.get(p.materi_id) || '—',
                    guru:     teacherById.get(p.guru_id)?.name     || '—',
                    asisten:  teacherById.get(p.asisten_id)?.name  || '—',
                };
            })
            .sort((a, b) =>
                a.tanggal.localeCompare(b.tanggal) ||
                String(a.sekolah).localeCompare(String(b.sekolah)) ||
                String(a.kelas).localeCompare(String(b.kelas)));

        // Mode Total butuh minimal satu guru/asisten tercatat
        if (!rows.length && bgView !== 'rincian') {
            box.innerHTML = `<p class="card" style="color:#94a3b8;text-align:center;margin-top:14px;">
                Tidak ada guru/asisten tercatat pada periode ini.</p>`;
            lastResult = null; return;
        }

        lastResult = { rows, levelCols, df, dt, detailRows, guruLabel };

        // Render sesuai mode tampilan aktif
        box.innerHTML = (bgView === 'rincian')
            ? renderRincianView(detailRows, df, dt, guruLabel)
            : renderTotalView(rows, levelCols, df, dt, filtered.length, guruLabel);

        setResultButtons(true);

    } catch (e) {
        if (myToken !== runToken) return; // respon basi — biarkan render terbaru
        console.error('[billing-guru]', e);
        box.innerHTML = `<p class="card" style="color:#dc2626;text-align:center;margin-top:14px;">
            <i class="fas fa-times-circle"></i> Gagal: ${esc(e.message)}</p>`;
    }
}

// ========== 4b. RENDER VIEWS ==========
const roleHtml = r => r.role === 'asisten'
    ? '<span class="bg-badge-asisten">Asisten</span>'
    : '<span class="bg-badge-guru">Guru</span>';

// Mode "Total": pivot guru/asisten x level (tampilan ringkas)
function renderTotalView(rows, levelCols, df, dt, totalPertemuan, guruLabel = '') {
    return `
    <div class="card bg-result-card">
        <div class="bg-result-header">
            <span>Rekap Total &nbsp;<b>${fmtDate(df)}</b> s/d <b>${fmtDate(dt)}</b>${guruLabel ? ' — Guru: <b>' + esc(guruLabel) + '</b>' : ''}</span>
            <span class="bg-result-count">${rows.length} guru/asisten &middot; ${totalPertemuan} pertemuan</span>
        </div>
        <div class="bg-table-wrap">
            <table class="bg-table">
                <thead><tr>
                    <th style="width:40px;">No</th>
                    <th>Nama Guru / Asisten</th>
                    ${levelCols.map(lv => `<th class="bg-th-num">${esc(lv)}</th>`).join('')}
                    <th class="bg-th-total">Total</th>
                </tr></thead>
                <tbody>
                ${rows.map((r, i) => `
                    <tr>
                        <td class="bg-td-no">${i + 1}</td>
                        <td class="bg-td-name">
                            <span class="bg-name">${esc(r.name)}</span>${roleHtml(r)}
                        </td>
                        ${r.counts.map(c => `<td class="bg-td-num">
                            ${c > 0 ? '<b>' + c + '</b>' : '<span class="bg-zero">&mdash;</span>'}
                        </td>`).join('')}
                        <td class="bg-td-total">${r.total}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        <p class="bg-note">
            Angka = jumlah pertemuan di mana guru/asisten tersebut tercatat sebagai pengajar.
            Satu pertemuan dapat menambah +1 untuk guru <em>dan</em> +1 untuk asisten secara bersamaan.
            Gunakan mode <b>Rincian</b> untuk melihat detail per tanggal &amp; kelas.
        </p>
    </div>`;
}

// Mode "Rincian": 1 baris per pertemuan — sekolah, tanggal & kelas
function renderRincianView(detailRows, df, dt, guruLabel = '') {
    const hari = t => new Date(t + 'T00:00:00')
        .toLocaleDateString('id-ID', { weekday: 'long' });

    return `
    <div class="card bg-result-card">
        <div class="bg-result-header">
            <span>Rincian Pertemuan &nbsp;<b>${fmtDate(df)}</b> s/d <b>${fmtDate(dt)}</b>${guruLabel ? ' — Guru: <b>' + esc(guruLabel) + '</b>' : ''}</span>
            <span class="bg-result-count">${detailRows.length} pertemuan</span>
        </div>
        <div class="bg-table-wrap">
            <table class="bg-table">
                <thead><tr>
                    <th style="width:40px;">No</th>
                    <th>Hari &amp; Tanggal</th>
                    <th>Sekolah</th>
                    <th>Kelas</th>
                    <th>Level</th>
                    <th>Materi</th>
                    <th>Guru</th>
                    <th>Asisten</th>
                </tr></thead>
                <tbody>
                ${detailRows.map((r, i) => `
                    <tr>
                        <td class="bg-td-no">${i + 1}</td>
                        <td class="bg-td-name">
                            <span class="bg-name">${fmtDate(r.tanggal)}</span>
                            <span class="bg-day">${esc(hari(r.tanggal))}</span>
                        </td>
                        <td><span class="bg-badge-sekolah">${esc(r.sekolah)}</span></td>
                        <td><span class="bg-badge-kelas">${esc(r.kelas)}</span></td>
                        <td><span class="bg-badge-level">${esc(r.level)}</span></td>
                        <td>${esc(r.materi)}</td>
                        <td>${esc(r.guru)}</td>
                        <td>${esc(r.asisten)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        <p class="bg-note">
            Rincian diurutkan per tanggal, sekolah, lalu kelas. Gunakan dropdown <b>Guru / Asisten</b>
            di panel filter untuk melihat rincian pengajar tertentu, dan mode <b>Total</b> untuk ringkasan.
        </p>
    </div>`;
}

// ========== 5. EXPORT CSV ==========
function exportCsv() {
    if (!lastResult) return;
    const { rows, levelCols, df, dt, detailRows } = lastResult;

    let csv;
    if (bgView === 'rincian') {
        // Mode Rincian: 1 baris per pertemuan (sekolah, tanggal & kelas)
        const header = ['No', 'Tanggal', 'Hari', 'Sekolah', 'Kelas', 'Level', 'Materi', 'Guru', 'Asisten'];
        const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
        csv = [header, ...detailRows.map((r, i) => {
            const hari = r.tanggal ? new Date(r.tanggal + 'T00:00:00')
                .toLocaleDateString('id-ID', { weekday: 'long' }) : '';
            return [
                i + 1, r.tanggal, hari, r.sekolah, r.kelas, r.level, r.materi, r.guru, r.asisten
            ].map(q).join(',');
        })].map(r => r.join(',')).join('\r\n');
    } else {
        // Mode Total: pivot guru/asisten x level
        const header = ['No', 'Nama', 'Role', ...levelCols, 'Total'];
        csv = [header, ...rows.map((r, i) => [
            i + 1,
            '"' + r.name.replace(/"/g, '""') + '"',
            r.role || '',
            ...r.counts,
            r.total
        ])].map(r => r.join(',')).join('\r\n');
    }

    const prefix = bgView === 'rincian' ? 'rincian-pertemuan' : 'rekap-guru';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),
        { href: url, download: prefix + '_' + df + '_sd_' + dt + '.csv' });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ========== 5b. PRINT / PDF ==========
// Buka dialog print dengan dokumen print-friendly (bisa "Save as PDF").
function printReport() {
    if (!lastResult) return;
    const { rows, levelCols, df, dt, detailRows, guruLabel } = lastResult;

    const periode = `${fmtDate(df)} s/d ${fmtDate(dt)}`;
    const guruTxt = guruLabel ? `Guru: ${guruLabel}` : 'Semua Guru / Asisten';

    let title, countTxt, tableHtml;

    if (bgView === 'rincian') {
        title = 'Rincian Pertemuan';
        countTxt = `${detailRows.length} pertemuan`;
        const hari = t => t ? new Date(t + 'T00:00:00')
            .toLocaleDateString('id-ID', { weekday: 'long' }) : '';
        tableHtml = `
        <table>
          <thead><tr>
            <th class="num">No</th><th>Tanggal</th><th>Hari</th><th>Sekolah</th>
            <th>Kelas</th><th>Level</th><th>Materi</th><th>Guru</th><th>Asisten</th>
          </tr></thead>
          <tbody>
            ${detailRows.map((r, i) => `
              <tr>
                <td class="num">${i + 1}</td>
                <td>${fmtDate(r.tanggal)}</td>
                <td>${esc(hari(r.tanggal))}</td>
                <td>${esc(r.sekolah)}</td>
                <td>${esc(r.kelas)}</td>
                <td>${esc(r.level)}</td>
                <td>${esc(r.materi)}</td>
                <td>${esc(r.guru)}</td>
                <td>${esc(r.asisten)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    } else {
        title = 'Rekap Guru / Asisten — Total';
        countTxt = `${rows.length} guru/asisten · ${levelCols.length} level`;
        // Rekap kolom untuk baris TOTAL
        const colTotals = levelCols.map((_, idx) =>
            rows.reduce((s, r) => s + (r.counts[idx] || 0), 0));
        const grandTotal = rows.reduce((s, r) => s + r.total, 0);

        tableHtml = `
        <table>
          <thead><tr>
            <th class="num">No</th><th>Nama</th><th class="num">Role</th>
            ${levelCols.map(lv => `<th class="num">${esc(lv)}</th>`).join('')}
            <th class="num">Total</th>
          </tr></thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td class="num">${i + 1}</td>
                <td>${esc(r.name)}</td>
                <td class="num">${r.role === 'asisten' ? 'Asisten' : 'Guru'}</td>
                ${r.counts.map(c => `<td class="num">${c > 0 ? c : '-'}</td>`).join('')}
                <td class="num"><b>${r.total}</b></td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align:right;">TOTAL</td>
              <td></td>
              ${colTotals.map(c => `<td class="num">${c}</td>`).join('')}
              <td class="num">${grandTotal}</td>
            </tr>
          </tfoot>
        </table>`;
    }

    const metaHtml = `
      <div class="p-head">
        <div>
          <p class="p-title">${esc(title)}</p>
          <p class="p-sub">Periode: ${periode} &nbsp;·&nbsp; ${esc(guruTxt)}</p>
        </div>
        <div class="p-meta">${esc(countTxt)}</div>
      </div>`;

    printViaIframe(printDocShell(title, metaHtml, tableHtml));
}

// Kerangka dokumen print (kop, tabel, footer, CSS A4 landscape)
function printDocShell(title, metaHtml, tableHtml) {
    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 20px; }
  .p-head { border-bottom: 3px double #333; padding-bottom: 10px; margin-bottom: 14px;
            display: flex; justify-content: space-between; align-items: flex-end; }
  .p-title { font-size: 16px; font-weight: 700; margin: 0; }
  .p-sub   { font-size: 11px; color: #444; margin: 3px 0 0; }
  .p-meta  { font-size: 11px; color: #444; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th, td { border: 1px solid #777; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #e5e7eb; font-weight: 700; }
  th.num, td.num { text-align: center; }
  tfoot td { font-weight: 700; background: #f3f4f6; }
  .p-foot { margin-top: 12px; font-size: 9.5px; color: #555;
            border-top: 1px solid #999; padding-top: 6px;
            display: flex; justify-content: space-between; }
  @page { size: A4 landscape; margin: 12mm; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  ${metaHtml}
  ${tableHtml}
  <div class="p-foot">
    <span>Dicetak: ${new Date().toLocaleString('id-ID')}</span>
    <span>Rekap Sistem Admin — Billing Guru</span>
  </div>
</body>
</html>`;
}

// Render dokumen ke iframe tersembunyi lalu panggil dialog print
function printViaIframe(docHtml) {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
        position: 'fixed', right: '0', bottom: '0',
        width: '0', height: '0', border: '0', visibility: 'hidden'
    });
    document.body.appendChild(iframe);

    const iwin = iframe.contentWindow;
    const idoc = iwin.document;
    idoc.open();
    idoc.write(docHtml);
    idoc.close();

    const cleanup = () => { try { iframe.remove(); } catch (_) {} };
    iwin.addEventListener('afterprint', cleanup);          // Chrome/Edge/Firefox
    setTimeout(() => { iwin.focus(); iwin.print(); }, 150); // beri waktu render
    setTimeout(cleanup, 60000);                             // fallback pengaman
}

// ========== 6. HELPERS ==========
function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g,
        c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function fmtDate(t) {
    if (!t) return '\u2014';
    return new Date(t + 'T00:00:00').toLocaleDateString('id-ID',
        { day: '2-digit', month: 'short', year: 'numeric' });
}

// ========== 7. CSS ==========
function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    const css = `
        .bg-filter-panel{margin-bottom:16px;padding:16px 18px}
        .bg-filter-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-bottom:12px}
        .bg-filter-label{display:flex;flex-direction:column;gap:4px;font-size:.8rem;font-weight:600;color:#334155}
        .bg-filter-label .bp-input{width:150px}
        .bg-view-switch{display:inline-flex;background:#e2e8f0;border-radius:8px;padding:3px;gap:2px;margin-bottom:12px}
        .bg-view-btn{border:none;background:transparent;color:#475569;font-weight:600;font-size:.8rem;padding:6px 16px;border-radius:6px;cursor:pointer;transition:.12s}
        .bg-view-btn:hover{color:#1e293b}
        .bg-view-btn.active{background:#1e293b;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.15)}
        .bg-day{display:block;font-size:.72rem;color:#94a3b8;font-weight:500}
        .bg-badge-sekolah{display:inline-block;padding:2px 8px;background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff;border-radius:10px;font-size:.72rem;font-weight:700}
        .bg-badge-kelas{display:inline-block;padding:2px 8px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:10px;font-size:.72rem;font-weight:700}
        .bg-badge-level{display:inline-block;padding:2px 8px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:10px;font-size:.72rem;font-weight:700}
        .bg-level-checks{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:10px;border-top:1px dashed #e2e8f0}
        .bg-check-label{font-size:.78rem;font-weight:700;color:#64748b;letter-spacing:.04em;margin-right:4px}
        .bg-check-item{display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:20px;padding:4px 10px;font-size:.82rem;font-weight:600;color:#334155;cursor:pointer;user-select:none;transition:.12s}
        .bg-check-item:has(input:checked){background:#dbeafe;border-color:#93c5fd;color:#1e40af}
        .bg-check-item input{width:14px;height:14px;cursor:pointer}
        .bg-check-toggle{font-size:.75rem;color:#64748b;background:none;border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;cursor:pointer}
        .bg-check-toggle:hover{background:#f1f5f9}
        .bg-btn-export{background:#fff;color:#15803d;border:1px solid #86efac;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem;display:inline-flex;align-items:center;gap:7px}
        .bg-btn-export:hover{background:#f0fdf4}
        .bg-btn-print{background:#fff;color:#1d4ed8;border:1px solid #93c5fd;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem;display:inline-flex;align-items:center;gap:7px}
        .bg-btn-print:hover{background:#eff6ff}
        .bg-result-card{padding:0;overflow:hidden;margin-top:14px}
        .bg-result-header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:.85rem;color:#334155}
        .bg-result-count{font-size:.78rem;color:#64748b}
        .bg-table-wrap{overflow-x:auto}
        .bg-table{width:100%;border-collapse:collapse;font-size:.85rem}
        .bg-table th{background:#1e293b;color:#fff;padding:9px 12px;text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
        .bg-th-num{text-align:center!important}
        .bg-th-total{text-align:center!important;background:#2563eb!important}
        .bg-table td{border-bottom:1px solid #e2e8f0;padding:9px 12px;vertical-align:middle}
        .bg-table tr:last-child td{border-bottom:none}
        .bg-table tr:hover td{background:#f8fafc}
        .bg-td-no{text-align:center;color:#94a3b8;width:40px}
        .bg-td-name{min-width:160px}
        .bg-td-num{text-align:center}
        .bg-td-total{text-align:center;font-weight:800;font-size:.95rem;color:#2563eb;background:#eff6ff!important}
        .bg-zero{color:#cbd5e1;font-size:.9rem}
        .bg-name{font-weight:600;color:#1e293b;margin-right:6px}
        .bg-badge-guru{display:inline-block;padding:2px 7px;background:#dbeafe;color:#1d4ed8;border-radius:10px;font-size:.7rem;font-weight:700}
        .bg-badge-asisten{display:inline-block;padding:2px 7px;background:#fef3c7;color:#92400e;border-radius:10px;font-size:.7rem;font-weight:700}
        .bg-note{font-size:.75rem;color:#64748b;padding:10px 16px;margin:0;border-top:1px solid #e2e8f0;background:#fafafa}
    `;
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
}
