/**
 * Project: Billing/Summary Private Module (SPA)
 * Description: Rekap jumlah sesi (pertemuan_private) per GROUP per periode,
 *              mendukung model prepaid (mode default) & postpaid.
 *              Unit sesi = pertemuan_private.id UNIK (bukan per baris absensi).
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE MODULE ---
let editingPeriodId = null;
let activeGroupId = null;
let groupsCache = [];

// ==========================================
// 1. INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="bp-container">
            <div class="bp-header">
                <div>
                    <h2>Summary Pertemuan (Billing Private)</h2>
                    <p>Rekap jumlah sesi per group per periode (prepaid/postpaid)</p>
                </div>
                <button id="bp-add-period" class="bp-btn-primary">
                    <i class="fas fa-plus"></i> Deklarasi Periode
                </button>
            </div>

            <div class="bp-tabs card" id="bp-group-tabs">
                <div class="bp-tabs-label">GROUP</div>
                <div class="bp-tabs-list"></div>
            </div>

            <div id="bp-modal" class="bp-modal" style="display:none;">
                <div class="bp-modal-box card">
                    <h3 id="bp-modal-title">Deklarasi Periode</h3>
                    <div class="bp-form-grid">
                        <label>Group
                            <select id="bp-f-group" class="bp-input"></select>
                        </label>
                        <label>Mode
                            <select id="bp-f-mode" class="bp-input">
                                <option value="prepaid">Prepaid</option>
                                <option value="postpaid">Postpaid</option>
                            </select>
                        </label>
                        <label>Label periode
                            <input id="bp-f-label" class="bp-input" placeholder="mis. Agustus / Siklus 1">
                        </label>
                        <label>Awal periode (dideklarasikan)
                            <input id="bp-f-start" type="date" class="bp-input" required>
                        </label>
                        <label>Kuota sesi (otomatis 4)
                            <input id="bp-f-quota" type="number" class="bp-input" value="4" min="1" required>
                        </label>
                    </div>
                    <div class="bp-form-actions">
                        <button id="bp-f-save" class="bp-btn-primary">Simpan</button>
                        <button id="bp-f-cancel" class="bp-btn-secondary">Batal</button>
                    </div>
                </div>
            </div>

            <div id="bp-result"></div>
        </div>
    `;

    await Promise.all([loadGroups(), loadModalGroups()]);
    document.getElementById('bp-add-period').onclick = openAddPeriod;
    document.getElementById('bp-f-cancel').onclick = closePeriodModal;
    document.getElementById('bp-f-save').onclick = savePeriod;
}

// --- MODAL CONTROLLERS ---
function openAddPeriod() {
    editingPeriodId = null;
    document.getElementById('bp-modal-title').textContent = 'Deklarasi Periode';
    const groupSel = document.getElementById('bp-f-group');
    groupSel.disabled = false;
    groupSel.value = activeGroupId || '';   // pre-select group yg sedang aktif
    document.getElementById('bp-f-mode').value = 'prepaid';
    document.getElementById('bp-f-label').value = '';
    document.getElementById('bp-f-start').value = '';
    document.getElementById('bp-f-quota').value = 4;
    document.getElementById('bp-modal').style.display = 'block';
}

async function openEditPeriod(id) {
    const { data: bp } = await supabase.from('billing_periods').select('*').eq('id', id).single();
    if (!bp) return alert('Periode tidak ditemukan.');
    editingPeriodId = bp.id;
    document.getElementById('bp-modal-title').textContent = `Edit Siklus · ${bp.periode_label || bp.start_date}`;
    const sel = document.getElementById('bp-f-group');
    sel.value = bp.group_id;
    sel.disabled = true; // group tidak diubah saat edit
    document.getElementById('bp-f-mode').value = bp.mode || 'prepaid';
    document.getElementById('bp-f-label').value = bp.periode_label || '';
    document.getElementById('bp-f-start').value = bp.start_date || '';
    document.getElementById('bp-f-quota').value = bp.quota_sessions ?? 4;
    document.getElementById('bp-modal').style.display = 'block';
}

function closePeriodModal() {
    document.getElementById('bp-modal').style.display = 'none';
    editingPeriodId = null;
}

window.bpEditPeriod = openEditPeriod;

// ==========================================
// 2. CSS
// ==========================================
function injectStyles() {
    const css = `
        .bp-container { max-width: 1100px; margin: 0 auto; padding: 20px; font-family: 'Roboto', sans-serif; }
        .bp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .bp-header h2 { margin: 0; font-family: 'Fredoka One', cursive; color: #333; }
        .bp-header p { margin: 4px 0 0; color: #64748b; font-size: 0.85rem; }
        .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,.05); }
        .bp-btn-primary { background:linear-gradient(90deg,#4d97ff,#2563eb); color:#fff; border:none; padding:10px 16px; border-radius:8px; cursor:pointer; font-weight:600; }
        .bp-btn-secondary { background:#e2e8f0; color:#334155; border:none; padding:10px 16px; border-radius:8px; cursor:pointer; }
        .bp-input { width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; box-sizing:border-box; }
        .bp-tabs { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:16px; padding:10px 14px; }
        .bp-tabs-label { font-weight:700; font-size:.78rem; color:#64748b; letter-spacing:.04em; }
        .bp-tabs-list { display:flex; flex-wrap:wrap; gap:6px; }
        .bp-tab { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:7px 14px; border-radius:20px; cursor:pointer; font-weight:600; font-size:.83rem; transition:0.15s; }
        .bp-tab:hover { background:#e2e8f0; }
        .bp-tab.active { background:#2563eb; border-color:#2563eb; color:#fff; box-shadow:0 2px 8px rgba(37,99,235,.35); }
        .bp-tab-empty { color:#94a3b8; font-size:.83rem; padding:6px 2px; }
        .bp-modal { position:fixed; inset:0; background:rgba(15,23,42,.5); display:flex; align-items:center; justify-content:center; z-index:999; }
        .bp-modal-box { width:min(480px,92vw); }
        .bp-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:16px 0; }
        .bp-form-grid label { font-size:.8rem; font-weight:600; color:#334155; display:flex; flex-direction:column; gap:4px; }
        .bp-form-actions { display:flex; gap:10px; justify-content:flex-end; }
        .bp-table { width:100%; border-collapse:collapse; margin-top:12px; }
        .bp-table th, .bp-table td { border:1px solid #e2e8f0; padding:8px; text-align:left; font-size:.85rem; }
        .bp-table th { background:#f1f5f9; font-weight:600; }
        .bp-badge { padding:3px 8px; border-radius:10px; font-size:.72rem; font-weight:700; }
        .bp-badge.ok { background:#dcfce7; color:#15803d; }
        .bp-badge.habis { background:#fee2e2; color:#b91c1c; }
        .bp-badge.over { background:#fef3c7; color:#92400e; }
        .bp-period-card { margin:14px 0; padding:14px 16px; }
        .bp-period-head { display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; margin-bottom:10px; font-size:.85rem; color:#334155; }
        .bp-class-name { font-size:1rem; font-weight:700; color:#1e293b; }
        .bp-level { background:#eff6ff; color:#1e40af; border:1px solid #dbeafe; padding:2px 8px; border-radius:10px; font-size:.72rem; font-weight:600; }
        .bp-meta { color:#475569; }
        .bp-meta b { color:#0f172a; }
        .bp-date-table { width:100%; border-collapse:collapse; }
        .bp-date-table th, .bp-date-table td { border:1px solid #e2e8f0; padding:7px 10px; text-align:left; font-size:.82rem; }
        .bp-date-table th { background:#f8fafc; font-weight:600; color:#475569; }
        .bp-date-table tr.bp-over td { background:#fffbeb; }
        .bp-period-block { padding:0; overflow:hidden; }
        .bp-toolbar { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; padding:14px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; }
        .bp-toolbar-info { display:flex; flex-wrap:wrap; gap:6px 16px; align-items:center; font-size:.85rem; color:#334155; }
        .bp-toolbar-info strong { color:#1e293b; font-size:.95rem; }
        .bp-toolbar-actions { display:flex; gap:8px; }
        .bp-btn-edit { background:#fff; color:#2563eb; border:1px solid #bfdbfe; padding:7px 12px; border-radius:8px; cursor:pointer; font-weight:600; font-size:.82rem; display:inline-flex; align-items:center; gap:6px; }
        .bp-btn-edit:hover { background:#eff6ff; }
        .bp-btn-delete { background:#fff; color:#dc2626; border:1px solid #fecaca; padding:7px 12px; border-radius:8px; cursor:pointer; font-weight:600; font-size:.82rem; display:inline-flex; align-items:center; gap:6px; }
        .bp-btn-delete:hover { background:#fef2f2; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}

// ==========================================
// 3. DATA HELPERS
// ==========================================
async function loadGroups() {
    const { data } = await supabase.from('group_private').select('id, code, owner').order('owner');
    groupsCache = data || [];

    // render tab group di container
    const list = document.querySelector('#bp-group-tabs .bp-tabs-list');
    if (!list) return;

    if (groupsCache.length === 0) {
        list.innerHTML = '<span class="bp-tab-empty">Belum ada group.</span>';
        return;
    }

    list.innerHTML = groupsCache.map(g => `
        <button class="bp-tab ${g.id === activeGroupId ? 'active' : ''}"
                data-id="${g.id}"
                onclick="window.bpActivateGroup('${g.id}')">
            ${escapeHtml(g.code || g.owner || 'Group')}
        </button>
    `).join('');

    // auto-aktifkan group pertama bila belum ada yang aktif
    if (!activeGroupId || !groupsCache.some(g => g.id === activeGroupId)) {
        await activateGroup(groupsCache[0].id);
    }
}

async function activateGroup(id) {
    activeGroupId = id;
    // update class aktif di semua tab berdasarkan data-id
    document.querySelectorAll('#bp-group-tabs .bp-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.id === id);
    });
    await loadSummary();
}

window.bpActivateGroup = activateGroup;

async function deletePeriod(id) {
    const { data: bp } = await supabase.from('billing_periods').select('*').eq('id', id).single();
    if (!bp) return alert('Periode tidak ditemukan.');
    const ok = confirm(`Hapus siklus "${(bp.periode_label || bp.start_date)}" permanen?\nData ini tidak bisa dikembalikan.`);
    if (!ok) return;
    const { error } = await supabase.from('billing_periods').delete().eq('id', id);
    if (error) return alert('Gagal hapus: ' + error.message);
    await loadSummary();
}

window.bpDeletePeriod = deletePeriod;

async function loadModalGroups() {
    const { data } = await supabase.from('group_private').select('id, code, owner').order('owner');
    const sel = document.getElementById('bp-f-group');
    (data || []).forEach(g => sel.add(new Option(`${g.code || ''} — ${g.owner}`, g.id)));
}

async function savePeriod() {
    const payload = {
        group_id: document.getElementById('bp-f-group').value,
        mode: document.getElementById('bp-f-mode').value,
        periode_label: document.getElementById('bp-f-label').value || null,
        start_date: document.getElementById('bp-f-start').value,
        quota_sessions: Number(document.getElementById('bp-f-quota').value) || 4,
    };
    if (!payload.group_id || !payload.start_date) return alert('Pilih group dan awal periode!');

    let error = null;
    if (editingPeriodId) {
        const { error: err } = await supabase.from('billing_periods').update(payload).eq('id', editingPeriodId);
        error = err;
    } else {
        const { error: err } = await supabase.from('billing_periods').insert(payload);
        error = err;
    }

    if (error) return alert('Gagal simpan: ' + error.message);
    document.getElementById('bp-modal').style.display = 'none';
    editingPeriodId = null;
    // Otomatis aktifkan tab group tsb agar summary langsung tampil
    if (payload.group_id) {
        await activateGroup(payload.group_id);
    } else {
        await loadSummary();
    }
}

// ==========================================
// 4. SUMMARY (jumlah sesi per group per periode)
// Unit sesi = pertemuan_private.id (satu baris = satu sesi pada class_private),
// dihitung dari tabel pertemuan (sumber kebenaran), di level GROUP
// (gabungan semua class_private milik group). Tidak memakai students_private.
// ==========================================
function fmtTanggal(t) {
    if (!t) return '—';
    const d = new Date(t + 'T00:00:00'); // hindari pergeseran zona waktu
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtHari(t) {
    if (!t) return '—';
    const d = new Date(t + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { weekday: 'long' });
}

// Tabel rapi daftar tanggal pertemuan per kelas
// Hanya menampilkan sesi SEBATAS kuota periode; baris info overflow hanya di siklus terakhir
function renderDateTable(sessions, quota, isLastSiklus) {
    if (!sessions || sessions.length === 0) {
        return '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:12px;">Belum ada pertemuan pada periode ini.</td></tr>';
    }
    const shown = sessions.slice(0, quota);          // hanya kuota sesi (mis. 4)
    const overflow = sessions.length - shown.length; // sisanya milik siklus berikutnya

    let html = shown.map((s, i) => `<tr>
        <td>${i + 1}</td>
        <td>${fmtTanggal(s.tanggal)}</td>
        <td>${fmtHari(s.tanggal)}</td>
        <td>${s.pertemuan_ke || (i + 1)}</td>
        <td><span class="bp-badge ok">Dalam kuota</span></td>
    </tr>`).join('');

    if (isLastSiklus && overflow > 0) {
        const nextStart = `${fmtTanggal(sessions[quota].tanggal)}`;
        html += `<tr class="bp-over">
            <td colspan="5" style="color:#92400e; padding:8px 10px;">
                + ${overflow} sesi berikutnya (mulai ${nextStart}) otomatis masuk <b>siklus berikutnya</b>.
            </td>
        </tr>`;
    }
    return html;
}

async function loadSummary() {
    const groupId = activeGroupId;
    const box = document.getElementById('bp-result');
    if (!groupId) { box.innerHTML = '<p class="card" style="color:#94a3b8;text-align:center;">Pilih group untuk melihat rekap.</p>'; return; }

    const { data: periods } = await supabase.from('billing_periods')
        .select('*').eq('group_id', groupId).order('start_date', { ascending: false });

    if (!periods || periods.length === 0) {
        box.innerHTML = '<p class="card" style="color:#94a3b8;text-align:center;">Belum ada periode dideklarasikan untuk group ini.</p>';
        return;
    }

    // Kelas milik group + level/kit (levels.kode, sub_levels.name)
    const { data: classes } = await supabase.from('class_private')
        .select('id, name, levels(kode), sub_levels(name)')
        .eq('group_id', groupId);
    const classIds = (classes || []).map(c => c.id);

    // Semua sesi group dalam satu query (satu baris = satu sesi), urut tanggal
    const { data: allP } = classIds.length
        ? await supabase.from('pertemuan_private')
            .select('id, class_id, tanggal, pertemuan_ke')
            .in('class_id', classIds)
            .order('tanggal', { ascending: true })
        : { data: [] };

    let blocks = '';
    periods.forEach((bp, bpIdx) => {
        // Sesi sejak awal periode; akhir periode = otomatis setelah kuota sesi terpakai
        const isLastSiklus = bpIdx === 0;   // sort desc => index 0 = siklus terbaru/terakhir
        const inPeriod = (allP || []).filter(p =>
            p.tanggal && p.tanggal >= bp.start_date
        );

        // Kelas yang ikut dihitung (semua, termasuk non-aktif agar sesi lampau tetap tertagih)
        const activeInGroup = (classes || []).filter(c => inPeriod.some(p => p.class_id === c.id));
        const classesToShow = activeInGroup.length ? activeInGroup : (classes || []);

        let classCards = '';
        let blockPakai = 0;  // total sesi terpakai dalam kuota siklus ini
        let blockAll = 0;    // total sesi terdaftar sejak awal periode
        classesToShow.forEach(c => {
            const quota = bp.quota_sessions;
            const sessAll = inPeriod.filter(p => p.class_id === c.id);
            blockAll += sessAll.length;
            const sess = sessAll.slice(0, quota);  // hanya ambil sebatas kuota
            blockPakai += sess.length;
            const pakai = sess.length;
            const sisa = quota - pakai;
            const habis = sisa <= 0;
            const levelTxt = (c.levels?.kode || '') + (c.sub_levels?.name ? ' · ' + c.sub_levels.name : '');
            const akhir = habis && sess[quota - 1]
                ? fmtTanggal(sess[quota - 1].tanggal)   // otomatis = tanggal sesi ke-kuota
                : `Sesi ke-${quota} belum tercapai`;
            const statusTxt = habis
                ? 'Kuota habis — siap siklus berikutnya'
                : `Sisa kuota ${sisa}`;

            classCards += `
            <div class="bp-period-card card">
                <div class="bp-period-head">
                    <span class="bp-class-name">${escapeHtml(c.name)}</span>
                    <span class="bp-level">${escapeHtml(levelTxt) || '—'}</span>
                    <span class="bp-meta">Awal: <b>${bp.start_date}</b></span>
                    <span class="bp-meta">Akhir (otomatis): <b>${akhir}</b></span>
                    <span class="bp-meta">Kuota: <b>${quota}</b></span>
                    <span class="bp-meta">Terpakai: <b>${pakai}</b></span>
                    <span class="bp-badge ${habis ? 'habis' : 'ok'}">${statusTxt}</span>
                </div>
                <table class="bp-date-table">
                    <thead><tr>
                        <th style="width:50px;">No</th><th>Tanggal</th><th>Hari</th>
                        <th style="width:90px;">Sesi Ke-</th><th>Status Kuota</th>
                    </tr></thead>
                    <tbody>
                        ${renderDateTable(sess, quota, isLastSiklus)}
                    </tbody>
                </table>
            </div>`;
        });

        // Kelas sudah habis kuota = ada kelas yang terpakai >= kuota
        const adaHabis = classesToShow.some(c =>
            inPeriod.filter(p => p.class_id === c.id).length >= bp.quota_sessions
        );
        const sisaTotal = (bp.quota_sessions * classesToShow.length) - blockPakai;
        const overflowTotal = blockAll - blockPakai;

        blocks += `
        <div class="bp-period-block card">
            <div class="bp-toolbar">
                <div class="bp-toolbar-info">
                    <strong>${escapeHtml(bp.periode_label) || 'Periode tanpa label'}</strong>
                    <span class="bp-meta">Mode: <b>${bp.mode}</b></span>
                    <span class="bp-meta">Awal: <b>${bp.start_date}</b></span>
                    <span class="bp-meta">Kuota: <b>${bp.quota_sessions}</b></span>
                    <span class="bp-meta">Total terpakai: <b>${blockPakai}</b></span>
                    ${isLastSiklus && overflowTotal > 0
                        ? `<span class="bp-meta" style="color:#92400e;">+ ${overflowTotal} sesi menunggu siklus berikutnya</span>`
                        : ''}
                    <span class="bp-badge ${adaHabis ? 'habis' : 'ok'}">
                        ${adaHabis ? 'Kuota habis — siap siklus berikutnya' : `Sisa kuota ${sisaTotal}`}
                    </span>
                </div>
                <div class="bp-toolbar-actions">
                    <button class="bp-btn-edit" onclick="window.bpEditPeriod('${bp.id}')">
                        <i class="fas fa-pen"></i> Edit
                    </button>
                    <button class="bp-btn-delete" onclick="window.bpDeletePeriod('${bp.id}')">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </div>
            ${classCards}
        </div>`;
    });

    box.innerHTML = `<div class="card">
        <h3>Rekap Sesi per Kelas per Periode</h3>
        ${blocks}
        <p style="font-size:.78rem;color:#64748b;margin-top:14px;">
            Akhir periode ditentukan <b>otomatis setelah kuota sesi terpakai</b> (default 4).
            Sesi dihitung dari <b>pertemuan_private</b> milik group sejak tanggal mulai
            (sumber kebenaran: tabel pertemuan). Satu pertemuan = satu sesi, terlepas dari jumlah siswa.
        </p>
    </div>`;
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
