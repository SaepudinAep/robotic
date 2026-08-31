/**
 * Billing - Rekap Guru/Asisten (sub-modul)
 * Sumber: pertemuan_kelas. Dipanggil billing.js tab "Rekap Guru".
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

let styleInjected = false;
let allLevels     = [];
let lastResult    = null;

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
                <button id="bg-btn-show"   class="bp-btn-primary">
                    <i class="fas fa-search"></i> Tampilkan</button>
                <button id="bg-btn-export" class="bg-btn-export" style="display:none;">
                    <i class="fas fa-file-csv"></i> Export CSV</button>
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

    allLevels = await fetchDistinctLevels();
    renderLevelCheckboxes();
    document.getElementById('bg-btn-show').onclick   = run;
    document.getElementById('bg-btn-export').onclick = exportCsv;
}

// ========== 2. FETCH ==========
// Ambil level dari tabel MASTER `levels` (kode = nama level, urut order_index)
// sehingga urutan konsisten dan semua level tampil walau belum ada kelasnya.
async function fetchDistinctLevels() {
    const { data, error } = await supabase
        .from('levels')
        .select('kode, order_index')
        .order('order_index', { ascending: true });
    if (error) { console.error('level fetch:', error.message); return []; }
    return (data || []).map(r => r.kode).filter(Boolean);
}

async function fetchPertemuan(df, dt) {
    const { data, error } = await supabase
        .from('pertemuan_kelas')
        .select('id,tanggal,guru_id,asisten_id,class_id,classes(id,name,level)')
        .gte('tanggal', df).lte('tanggal', dt);
    if (error) throw new Error('pertemuan: ' + error.message);
    return data || [];
}

async function fetchAllTeachers() {
    const { data, error } = await supabase
        .from('teachers').select('id,name,role').order('name');
    if (error) throw new Error('teachers: ' + error.message);
    return data || [];
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
        <button class="bg-check-toggle" onclick="window.bgToggleAll(true)">Semua</button>
        <button class="bg-check-toggle" onclick="window.bgToggleAll(false)">Hapus</button>`;
}

window.bgToggleAll = (s) =>
    document.querySelectorAll('.bg-lv-check').forEach(cb => cb.checked = s);

function getCheckedLevels() {
    return [...document.querySelectorAll('.bg-lv-check:checked')].map(cb => cb.value);
}

// ========== 4. RUN ==========
async function run() {
    const df  = document.getElementById('bg-from').value;
    const dt  = document.getElementById('bg-to').value;
    const lvs = getCheckedLevels();
    const box = document.getElementById('bg-result');

    if (!df || !dt) { alert('Pilih rentang tanggal!'); return; }
    if (dt < df)    { alert('Tanggal akhir tidak boleh lebih awal!'); return; }
    if (!lvs.length) {
        box.innerHTML = `<p class="card" style="color:#b45309;text-align:center;margin-top:14px;">
            <i class="fas fa-exclamation-triangle"></i> Pilih minimal satu level.</p>`;
        document.getElementById('bg-btn-export').style.display = 'none';
        return;
    }

    box.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;">
        <i class="fas fa-circle-notch fa-spin"></i> Memuat...</div>`;
    document.getElementById('bg-btn-export').style.display = 'none';

    try {
        const [pertemuan, teachers] = await Promise.all([
            fetchPertemuan(df, dt), fetchAllTeachers()
        ]);

        const filtered = pertemuan.filter(p => p.classes && lvs.includes(p.classes.level));

        if (!filtered.length) {
            box.innerHTML = `<p class="card" style="color:#94a3b8;text-align:center;margin-top:14px;">
                <i class="fas fa-inbox"></i>&nbsp;
                Tidak ada pertemuan pada periode &amp; level yang dipilih.</p>`;
            lastResult = null; return;
        }

        // Pivot: teacherId -> { level -> count }
        const pivot = {};
        filtered.forEach(p => {
            const lv = p.classes?.level || 'Tanpa Level';
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

        if (!rows.length) {
            box.innerHTML = `<p class="card" style="color:#94a3b8;text-align:center;margin-top:14px;">
                Tidak ada guru/asisten tercatat pada periode ini.</p>`;
            lastResult = null; return;
        }

        lastResult = { rows, levelCols, df, dt };

        const roleHtml = r => r.role === 'asisten'
            ? '<span class="bg-badge-asisten">Asisten</span>'
            : '<span class="bg-badge-guru">Guru</span>';

        box.innerHTML = `
        <div class="card bg-result-card">
            <div class="bg-result-header">
                <span>Rekap &nbsp;<b>${fmtDate(df)}</b> s/d <b>${fmtDate(dt)}</b></span>
                <span class="bg-result-count">${rows.length} guru/asisten &middot; ${filtered.length} pertemuan</span>
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
            </p>
        </div>`;

        document.getElementById('bg-btn-export').style.display = 'inline-flex';

    } catch (e) {
        console.error('[billing-guru]', e);
        box.innerHTML = `<p class="card" style="color:#dc2626;text-align:center;margin-top:14px;">
            <i class="fas fa-times-circle"></i> Gagal: ${esc(e.message)}</p>`;
    }
}

// ========== 5. EXPORT CSV ==========
function exportCsv() {
    if (!lastResult) return;
    const { rows, levelCols, df, dt } = lastResult;
    const header = ['No', 'Nama', 'Role', ...levelCols, 'Total'];
    const csv = [header, ...rows.map((r, i) => [
        i + 1,
        '"' + r.name.replace(/"/g, '""') + '"',
        r.role || '',
        ...r.counts,
        r.total
    ])].map(r => r.join(',')).join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),
        { href: url, download: 'rekap-guru_' + df + '_sd_' + dt + '.csv' });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        .bg-level-checks{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:10px;border-top:1px dashed #e2e8f0}
        .bg-check-label{font-size:.78rem;font-weight:700;color:#64748b;letter-spacing:.04em;margin-right:4px}
        .bg-check-item{display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:20px;padding:4px 10px;font-size:.82rem;font-weight:600;color:#334155;cursor:pointer;user-select:none;transition:.12s}
        .bg-check-item:has(input:checked){background:#dbeafe;border-color:#93c5fd;color:#1e40af}
        .bg-check-item input{width:14px;height:14px;cursor:pointer}
        .bg-check-toggle{font-size:.75rem;color:#64748b;background:none;border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;cursor:pointer}
        .bg-check-toggle:hover{background:#f1f5f9}
        .bg-btn-export{background:#fff;color:#15803d;border:1px solid #86efac;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem;display:inline-flex;align-items:center;gap:7px}
        .bg-btn-export:hover{background:#f0fdf4}
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
