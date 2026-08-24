/**
 * Project: Robopanda Admin V2 (SPA Module)
 * Module : Silabus Kurikulum
 * Desc   : Peta kurikulum baca-saja (Level -> Sub-Level -> Materi & Achievement)
 *          dengan mode edit urutan untuk level, sub-level, dan materi.
 * Data   : levels, sub_levels, materi, materi_private,
 *          achievement_sekolah, achievement_private
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// STATE GLOBAL
// ==========================================
let levelsList = [];      // { id, kode, detail }
let subLevelsList = [];   // { id, level_id, kode, name, kit_alat, description, is_active }
let materiSekolah = [];   // tabel "materi"
let materiPrivate = [];   // tabel "materi_private"
let achSekolah = [];      // { id, main_achievement, sub_achievement, sub_level_id }
let achPrivate = [];
let editMode = false;
let activeLevelId = null;    // level yang sedang tampil pada tab pertama
let activeSubLevelId = null; // sub-level yang sedang tampil pada tab kedua

// ==========================================
// 1. INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="slb-container">
            <div class="slb-header">
                <div>
                    <h2>Silabus Kurikulum</h2>
                    <p>Roadmap pembelajaran per level: urutan materi &amp; target achievement.</p>
                </div>
                <button id="slb-edit-toggle" class="slb-edit-btn ${editMode ? 'active' : ''}">
                    <i class="fa-solid ${editMode ? 'fa-check' : 'fa-pen'}"></i>
                    ${editMode ? 'Selesai Urutkan' : 'Ubah Urutan'}
                </button>
            </div>
            ${editMode ? `<div class="slb-edit-hint"><i class="fa-solid fa-circle-info"></i> Klik <b>&#9664;</b> / <b>&#9654;</b> untuk menggeser posisi <b>tab level</b> &amp; <b>tab sub-level</b>, dan <b>&#8593;</b> / <b>&#8595;</b> untuk <b>materi</b>. Perubahan tersimpan otomatis.</div>` : ''}
            <div id="slb-root">
                <div class="slb-loading"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i><span>Memuat silabus...</span></div>
            </div>
        </div>
    `;

    try {
        await fetchData();
        renderContent();
    } catch (err) {
        console.error('Silabus load error:', err);
        const root = document.getElementById('slb-root');
        if (root) root.innerHTML = `
            <div class="slb-empty" style="color:#ef4444;">
                <i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat data silabus.
            </div>`;
    }

    bindEvents(canvas);
}

// ==========================================
// 2. FETCH DATA
// ==========================================
async function fetchData() {
    const [lv, sv, ms, mp, asx, ap] = await Promise.all([
        supabase.from('levels').select('id, kode, detail, order_index'),
        supabase.from('sub_levels').select('id, level_id, kode, name, kit_alat, description, is_active, order_index'),
        supabase.from('materi').select('id, title, description, detail, sub_level_id, order_index, created_at'),
        supabase.from('materi_private').select('id, judul, deskripsi, detail, sub_level_id, order_index, created_at'),
        supabase.from('achievement_sekolah').select('id, main_achievement, sub_achievement, sub_level_id'),
        supabase.from('achievement_private').select('id, main_achievement, sub_achievement, sub_level_id')
    ]);

    if (lv.error || sv.error || ms.error || mp.error || asx.error || ap.error) {
        throw lv.error || sv.error || ms.error || mp.error || asx.error || ap.error;
    }

    levelsList = lv.data || [];
    subLevelsList = sv.data || [];
    materiSekolah = ms.data || [];
    materiPrivate = mp.data || [];
    achSekolah = asx.data || [];
    achPrivate = ap.data || [];
}

// ==========================================
// 3. RENDER
// ==========================================
function renderContent() {
    const root = document.getElementById('slb-root');
    if (!root) return;

    const lvlItems = getSortedLevels();

    if (lvlItems.length === 0) {
        root.innerHTML = `<div class="slb-empty"><i class="fa-solid fa-folder-open"></i> Belum ada level kurikulum.</div>`;
        return;
    }

    // Pastikan tab level aktif valid (default: level pertama)
    if (!lvlItems.some(l => l.id === activeLevelId)) activeLevelId = lvlItems[0].id;
    const activeLvl = lvlItems.find(l => l.id === activeLevelId);
    const subs = getSortedSubs(activeLevelId);

    // Validasi tab sub-level aktif
    if (!subs.some(s => s.id === activeSubLevelId)) activeSubLevelId = subs.length ? subs[0].id : null;
    const activeSub = subs.find(s => s.id === activeSubLevelId) || null;

    root.innerHTML = `
        <div class="slb-tabs">
            ${lvlItems.map(l => `
            <button class="slb-tab ${l.id === activeLevelId ? 'active' : ''}"
                    data-action="switch-tab" data-lid="${l.id}">
                ${l.title}
                <small>${getSortedSubs(l.id).length}</small>
            </button>`).join('')}
        </div>

        ${editMode && lvlItems.length > 1 ? `
        <div class="slb-tab-shift">
            <span><i class="fa-solid fa-shuffle"></i> Posisi tab level aktif:</span>
            <button class="slb-move-btn" data-action="shift-level" data-dir="-1"
                title="Geser ke kiri" ${lvlItems[0].id === activeLevelId ? 'disabled' : ''}><i class="fa-solid fa-arrow-left"></i></button>
            <button class="slb-move-btn" data-action="shift-level" data-dir="1"
                title="Geser ke kanan" ${lvlItems[lvlItems.length - 1].id === activeLevelId ? 'disabled' : ''}><i class="fa-solid fa-arrow-right"></i></button>
        </div>` : ''}

        ${subs.length === 0 ? `
        <section class="slb-panel">
            <div class="slb-panel-head"><h3>${activeLvl.title}</h3><span>${activeLvl._ref.detail || ''}</span></div>
            <div class="slb-subbody"><div class="slb-empty small">Belum ada sub-level untuk level ini.</div></div>
        </section>` : `
        <div class="slb-tabs sub">
            ${subs.map(s => `
            <button class="slb-tab sub ${s.id === activeSubLevelId ? 'active' : ''}"
                    data-action="switch-sub" data-sid="${s.id}">
                ${s.title}
                <small>${getSortedItems(s.id).length}</small>
            </button>`).join('')}
        </div>

        ${editMode && subs.length > 1 ? `
        <div class="slb-tab-shift sub">
            <span><i class="fa-solid fa-shuffle"></i> Posisi tab sub-level aktif:</span>
            <button class="slb-move-btn" data-action="shift-sub" data-dir="-1"
                title="Geser ke kiri" ${subs[0].id === activeSubLevelId ? 'disabled' : ''}><i class="fa-solid fa-arrow-left"></i></button>
            <button class="slb-move-btn" data-action="shift-sub" data-dir="1"
                title="Geser ke kanan" ${subs[subs.length - 1].id === activeSubLevelId ? 'disabled' : ''}><i class="fa-solid fa-arrow-right"></i></button>
        </div>` : ''}

        ${activeSub ? renderSubPanel(activeSub._ref) : ''}`}
    `;

    syncEditButtonState();
}

function renderSubPanel(sub) {
    const items = getSortedItems(sub.id);
    const asek = achSekolah.filter(a => a.sub_level_id === sub.id);
    const aprv = achPrivate.filter(a => a.sub_level_id === sub.id);

    return `
    <section class="slb-panel">
        <div class="slb-panel-head">
            <h3>${sub.name}</h3>
            <code>${sub.kode}</code>
            ${sub.kit_alat ? `<span class="slb-kit"><i class="fa-solid fa-toolbox"></i> ${sub.kit_alat}</span>` : ''}
            ${sub.is_active === false ? `<span class="slb-badge off">Nonaktif</span>` : ''}
        </div>

        <div class="slb-subbody">
            ${items.length === 0
                ? `<div class="slb-empty small">Belum ada materi pada sub-level ini.</div>`
                : `<ol class="slb-materi-list">${items.map((it, i) => renderItemRow(it, i, items.length)).join('')}</ol>`}

            <div class="slb-ach-block">
                <div class="slb-ach-title"><i class="fa-solid fa-trophy"></i> Target Achievement</div>
                ${(asek.length + aprv.length) === 0
                    ? `<div class="slb-empty small">Belum ada achievement terdaftar untuk sub-level ini.</div>`
                    : [
                        ...asek.map(a => achRow(a, '#4d97ff', 'Sekolah')),
                        ...aprv.map(a => achRow(a, '#f59e0b', 'Private'))
                      ].join('')}
            </div>
        </div>
    </section>`;
}

function renderItemRow(item, index, total) {
    const srcBadge = item.src === 'skl'
        ? `<span class="slb-badge skl">Sekolah</span>`
        : `<span class="slb-badge prv">Private</span>`;

    return `
    <li class="slb-materi-row">
        <span class="slb-num">${index + 1}.</span>
        <div class="slb-materi-info">
            <div class="slb-materi-title">${item.title} ${srcBadge}</div>
            ${item.desc ? `<div class="slb-materi-desc">${item.desc}</div>` : ''}
        </div>
        ${editMode ? `
        <div class="slb-move-group">
            <button class="slb-move-btn" data-action="move" data-dir="-1" data-index="${index}" data-sid="${item.sub_level_id}"
                title="Naikkan" ${index === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
            <button class="slb-move-btn" data-action="move" data-dir="1" data-index="${index}" data-sid="${item.sub_level_id}"
                title="Turunkan" ${index === total - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
        </div>` : ''}
    </li>`;
}

function achRow(a, color, tag) {
    return `
    <div class="slb-ach-row">
        <span class="slb-ach-dot" style="background:${color};"></span>
        <div>
            <b>${a.main_achievement || '-'}</b>
            ${a.sub_achievement ? `<small> &rsaquo; ${a.sub_achievement}</small>` : ''}
            <span class="slb-badge ${tag === 'Sekolah' ? 'skl' : 'prv'}">${tag}</span>
        </div>
    </div>`;
}

// ==========================================
// 4. LOGIKA URUTAN (SORT / SWAP)
// ==========================================
function getSortedItems(subLevelId) {
    const merged = [
        ...materiSekolah.filter(m => m.sub_level_id === subLevelId).map(m => toItem(m, 'skl')),
        ...materiPrivate.filter(m => m.sub_level_id === subLevelId).map(m => toItem(m, 'prv'))
    ];
    return merged.sort(compareItems);
}

function toItem(row, src) {
    return {
        src,                                   // 'skl' | 'prv'
        table: src === 'skl' ? 'materi' : 'materi_private',
        id: row.id,
        sub_level_id: row.sub_level_id,
        title: row.title || row.judul || '(tanpa judul)',
        desc: row.description || row.deskripsi || row.detail || '',
        order_index: row.order_index,
        created_at: row.created_at,
        _ref: row                              // referensi objek asli agar update lokal mudah
    };
}

function compareItems(a, b) {
    const ai = a.order_index, bi = b.order_index;
    if (ai == null && bi == null) return tieBreaker(a, b);
    if (ai == null) return 1;              // NULL selalu paling bawah
    if (bi == null) return -1;
    return (ai - bi) || tieBreaker(a, b);
}
const tieBreaker = (a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
    a.title.localeCompare(b.title);

// Pastikan nomor urut rapat 0..n-1 (sekali saja saat masuk mode edit)
async function normalizeGroup(items) {
    const changes = [];
    items.forEach((it, i) => {
        if (it._ref.order_index !== i) {
            it._ref.order_index = i;
            it.order_index = i;
            changes.push(it);
        }
    });
    if (changes.length > 0) await persistItems(changes);
}

// Gerak generik: tukar posisi item pada daftar terurut & simpan ke DB-nya
async function applyMove(items, index, dir) {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;

    // Rapikan dulu bila masih ada NULL / nomor ganda
    if (items.some((it, i) => it.order_index !== i)) await normalizeGroup(items);

    const sorted = [...items].sort(compareItems);   // susun ulang setelah normalisasi
    if (index >= sorted.length || j >= sorted.length) return;

    const tmp = sorted[index];
    sorted[index] = sorted[j];
    sorted[j] = tmp;

    const changed = sorted.filter((it, i) => it._ref.order_index !== i);
    if (changed.length === 0) return;

    sorted.forEach((it, i) => { it._ref.order_index = i; it.order_index = i; });

    try {
        await persistItems(changed);
        showToast('Urutan diperbarui.', 'success');
        renderContent();
    } catch (err) {
        console.error('Gagal simpan urutan:', err);
        showToast('Gagal menyimpan urutan: ' + (err.message || 'unknown'), 'error');
        await fetchData();                          // rollback tampilan ke kondisi server
        renderContent();
    }
}

async function moveItem(sid, index, dir) { await applyMove(getSortedItems(sid), index, dir); }

// Wrapper untuk LEVEL dan SUB-LEVEL
function makeItem(ref, table, label) {
    return { table, id: ref.id, title: label, desc: '',
             order_index: ref.order_index ?? null,
             created_at: ref.created_at || '', _ref: ref };
}
const getSortedLevels = () => levelsList.map(l => makeItem(l, 'levels', l.kode)).sort(compareItems);
const getSortedSubs   = (lid) => subLevelsList.filter(s => s.level_id === lid)
                            .map(s => makeItem(s, 'sub_levels', s.name)).sort(compareItems);
async function moveSub(lid, index, dir)   { await applyMove(getSortedSubs(lid), index, dir); }

async function persistItems(items) {
    const results = await Promise.all(items.map(it =>
        supabase.from(it.table)
            .update({ order_index: it._ref.order_index })
            .eq('id', it.id)
    ));
    const firstErr = results.find(r => r.error);
    if (firstErr) throw firstErr.error;
}

// ==========================================
// 5. EVENT BINDING (delegasi klik)
// ==========================================
function bindEvents(canvas) {
    canvas.addEventListener('click', async (e) => {
        const toggleBtn = e.target.closest('#slb-edit-toggle');
        if (toggleBtn) {
            editMode = !editMode;
            toggleBtn.classList.toggle('active', editMode);
            toggleBtn.innerHTML = editMode
                ? '<i class="fa-solid fa-check"></i> Selesai Urutkan'
                : '<i class="fa-solid fa-pen"></i> Ubah Urutan';

            if (editMode) {
                // Rapikan penomoran level, sub-level, dan materi sekali di awal
                const groups = [
                    getSortedLevels(),
                    ...levelsList.map(lv => getSortedSubs(lv.id)),
                    ...subLevelsList.map(sb => getSortedItems(sb.id))
                ];
                for (const items of groups) {
                    if (items.some((it, i) => it.order_index !== i)) {
                        try { await normalizeGroup(items); } catch (err) { console.warn(err); }
                    }
                }
            }
            renderContent();
            return;
        }

        const tabBtn = e.target.closest('[data-action="switch-tab"]');
        if (tabBtn) {
            activeLevelId = tabBtn.dataset.lid;
            renderContent();
            return;
        }

        const shiftBtn = e.target.closest('[data-action="shift-level"]');
        if (shiftBtn && !shiftBtn.disabled) {
            shiftBtn.disabled = true;
            const idx = getSortedLevels().findIndex(l => l.id === activeLevelId);
            await applyMove(getSortedLevels(), idx, parseInt(shiftBtn.dataset.dir, 10));
            return;
        }

        const subTabBtn = e.target.closest('[data-action="switch-sub"]');
        if (subTabBtn) {
            activeSubLevelId = subTabBtn.dataset.sid;
            renderContent();
            return;
        }

        const shiftSubBtn = e.target.closest('[data-action="shift-sub"]');
        if (shiftSubBtn && !shiftSubBtn.disabled) {
            shiftSubBtn.disabled = true;
            const idx = getSortedSubs(activeLevelId).findIndex(s => s.id === activeSubLevelId);
            await applyMove(getSortedSubs(activeLevelId), idx, parseInt(shiftSubBtn.dataset.dir, 10));
            return;
        }

        const subBtn = e.target.closest('[data-action="move-sub"]');
        if (subBtn && !subBtn.disabled) {
            subBtn.disabled = true;
            await moveSub(subBtn.dataset.lid, parseInt(subBtn.dataset.index, 10), parseInt(subBtn.dataset.dir, 10));
            return;
        }

        const moveBtn = e.target.closest('[data-action="move"]');
        if (moveBtn && !moveBtn.disabled) {
            moveBtn.disabled = true;
            await moveItem(moveBtn.dataset.sid, parseInt(moveBtn.dataset.index, 10), parseInt(moveBtn.dataset.dir, 10));
            return;
        }

    });
}
function syncEditButtonState() {
    const btn = document.getElementById('slb-edit-toggle');
    if (btn) {
        btn.classList.toggle('active', editMode);
        btn.innerHTML = editMode
            ? '<i class="fa-solid fa-check"></i> Selesai Urutkan'
            : '<i class="fa-solid fa-pen"></i> Ubah Urutan';
    }
}

// ==========================================
// 6. TOAST NOTIFICATION
// ==========================================
function showToast(message, type = 'success') {
    let el = document.querySelector('.slb-toast');
    if (!el) {
        el = document.createElement('div');
        el.className = 'slb-toast';
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = `slb-toast show ${type}`;
    setTimeout(() => el.classList.remove('show'), 2600);
}

// ==========================================
// 7. STYLES
// ==========================================
function injectStyles() {
    if (document.getElementById('slb-style')) return;
    const style = document.createElement('style');
    style.id = 'slb-style';
    style.textContent = `
        .slb-container { max-width:1100px; margin:0 auto; padding-bottom:60px; animation:slbFade .4s ease; }
        @keyframes slbFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

        .slb-header { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
        .slb-header h2 { margin:0; font-family:'Fredoka One'; color:#333; font-size:1.35rem; }
        .slb-header p { margin:4px 0 0; color:#64748b; font-size:.88rem; }

        .slb-edit-btn { border:none; background:#4d97ff; color:#fff; padding:10px 18px; border-radius:10px;
            font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:8px;
            box-shadow:0 3px 8px rgba(77,151,255,.35); transition:.2s; }
        .slb-edit-btn:hover { transform:translateY(-1px); }
        .slb-edit-btn.active { background:#10b981; box-shadow:0 3px 8px rgba(16,185,129,.35); }

        .slb-edit-hint { background:#eff6ff; border:1px dashed #93c5fd; color:#1d4ed8; padding:10px 14px;
            border-radius:10px; font-size:.85rem; margin-bottom:16px; }

        .slb-loading { display:flex; flex-direction:column; gap:12px; align-items:center; padding:60px 0; color:#94a3b8; }

        .slb-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .slb-tab { border:1px solid #e2e8f0; background:#fff; color:#475569; padding:10px 18px; border-radius:12px;
            font-weight:bold; font-size:.88rem; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:.18s; }
        .slb-tab:hover { border-color:#93c5fd; color:#2563eb; transform:translateY(-1px); }
        .slb-tab.active { background:#4d97ff; border-color:#4d97ff; color:#fff; box-shadow:0 4px 10px rgba(77,151,255,.35); }
        .slb-tab small { background:rgba(255,255,255,.35); padding:1px 8px; border-radius:10px; font-size:.72rem; }
        .slb-tab:not(.active) small { background:#f1f5f9; color:#64748b; }

        .slb-tab-shift { display:flex; align-items:center; gap:8px; background:#fffbeb; border:1px dashed #fcd34d;
            color:#92400e; padding:8px 12px; border-radius:10px; font-size:.8rem; margin-bottom:14px; flex-wrap:wrap; }

        .slb-panel { background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; margin-bottom:30px; }
        .slb-panel-head { padding:16px 20px; background:linear-gradient(90deg,#f8fafc,#fff); border-bottom:2px solid #4d97ff;
            display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }
        .slb-panel-head h3 { margin:0; font-family:'Fredoka One'; color:#1e293b; font-size:1.15rem; }
        .slb-panel-head span { color:#64748b; font-size:.85rem; }

        .slb-tabs.sub { margin-bottom:10px; }
        .slb-tab.sub { padding:8px 14px; font-size:.82rem; border-radius:10px; }
        .slb-tab.sub.active { background:#f59e0b; border-color:#f59e0b; box-shadow:0 4px 10px rgba(245,158,11,.35); }
        .slb-tab.sub:hover:not(.active) { border-color:#fcd34d; color:#b45309; }

        .slb-tab-shift.sub { background:#fff7ed; border-color:#fed7aa; color:#9a3412; }
        .slb-panel-head code { background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:6px; font-size:.75rem; }
        .slb-kit { background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:3px 10px; border-radius:20px; font-size:.75rem; font-weight:600; }

        .slb-subbody { padding:4px 20px 18px; }

        .slb-materi-list { list-style:none; margin:0; padding:0; }
        .slb-materi-row { display:flex; align-items:center; gap:12px; padding:11px 12px; border:1px solid #f1f5f9;
            border-radius:10px; margin-bottom:8px; background:#fff; transition:.15s; }
        .slb-materi-row:hover { border-color:#bfdbfe; background:#fafcff; }
        .slb-num { min-width:26px; height:26px; background:#eff6ff; color:#2563eb; border-radius:50%;
            display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:.8rem; flex-shrink:0; }
        .slb-materi-info { flex:1; min-width:0; }
        .slb-materi-title { font-weight:600; color:#1e293b; font-size:.92rem; }
        .slb-materi-desc { color:#64748b; font-size:.8rem; margin-top:2px; overflow:hidden; text-overflow:ellipsis;
            display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
        .slb-move-group { display:flex; gap:6px; flex-shrink:0; }
        .slb-move-btn { width:34px; height:34px; border-radius:8px; border:1px solid #e2e8f0; background:#fff;
            color:#4d97ff; cursor:pointer; transition:.15s; display:flex; align-items:center; justify-content:center; }
        .slb-move-btn:hover:not(:disabled) { background:#eff6ff; border-color:#93c5fd; }
        .slb-move-btn:disabled { opacity:.25; cursor:not-allowed; }

        .slb-ach-block { margin-top:14px; padding:12px 14px; background:#fbfdff; border:1px dashed #dbeafe; border-radius:10px; }
        .slb-ach-title { font-size:.8rem; font-weight:bold; color:#475569; text-transform:uppercase; letter-spacing:.4px; margin-bottom:8px; }
        .slb-ach-row { display:flex; align-items:flex-start; gap:9px; padding:5px 0; font-size:.86rem; color:#334155; }
        .slb-ach-dot { width:9px; height:9px; border-radius:50%; margin-top:6px; flex-shrink:0; }
        .slb-ach-row small { color:#64748b; }
        .slb-ach-row .slb-badge { margin-left:6px; }

        .slb-badge { padding:2px 8px; border-radius:10px; font-size:.68rem; font-weight:bold; text-transform:uppercase; vertical-align:middle; }
        .slb-badge.skl { background:#dbeafe; color:#1e40af; }
        .slb-badge.prv { background:#fef3c7; color:#92400e; }
        .slb-badge.off { background:#fee2e2; color:#991b1b; }

        .slb-empty { text-align:center; color:#94a3b8; padding:26px 10px; display:flex; flex-direction:column; gap:8px; align-items:center; font-size:.95rem; }
        .slb-empty.small { padding:12px; font-size:.83rem; font-style:italic; }

        .slb-toast { position:fixed; bottom:24px; right:24px; background:#334155; color:#fff; padding:12px 20px;
            border-radius:10px; font-size:.88rem; opacity:0; transform:translateY(80px);
            transition:.3s cubic-bezier(.175,.885,.32,1.275); z-index:2000; pointer-events:none;
            box-shadow:0 10px 22px rgba(0,0,0,.18); max-width:320px; }
        .slb-toast.show { opacity:1; transform:translateY(0); }
        .slb-toast.success { background:#10b981; }
        .slb-toast.error { background:#ef4444; }

        @media (max-width:640px){
            .slb-header h2 { font-size:1.15rem; }
            .slb-subbody { padding:4px 12px 16px; }
            .slb-tab { padding:8px 12px; }
            .slb-materi-desc { -webkit-line-clamp:1; }
        }
    `;
    document.head.appendChild(style);
}




