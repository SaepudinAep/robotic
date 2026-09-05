/**
 * Project: Billing Sekolah (sub-modul dari billing.js)
 * Description: Kontrak per KELAS berbasis RENTANG TANGGAL.
 *              Invoice = harga_per_sesi x jumlah_pertemuan x jumlah_anak
 *              harga_per_sesi = contract_price / contract_sessions (mis. 80rb/4)
 * Dipanggil oleh billing.js saat mode "Sekolah" aktif.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE ---
let activeSchoolId = null;
let activeClassId = null;
let classesCache = [];
let schoolsCache = [];
let editingId = null;
let editingContract = null;   // snapshot kontrak yg sedang diedit
let styleInjected = false;
let teachersCache = [];       // [{id, name, role}] utk dropdown penanda tangan (Hormat Kami)
let signerId = '';            // guru terpilih utk "Hormat Kami" / "Yang menerima"
let signerName = '';

/* ==================================================
   KONFIGURASI PENERBIT (KOP INVOICE) & PEMBAYARAN
   Sesuaikan data resmi Robopanda di sini.
   Logo diambil dari index.html (brand kanonik Robopanda).
   ================================================== */
const ISSUER = {
    name: 'Robopanda',
    tagline: 'Robotic Education & Workshop',
    logo: 'https://res.cloudinary.com/dmm6avtxd/image/upload/v1787501406/Robopanda-Robotic_wwr2jb.png',
    address: '',                        // <-- isi alamat kantor (opsional)
    tel: '',                            // <-- isi nomor telepon
    email: 'admin@robopanda.id',
    website: 'portal.robopanda.my.id'
};
const PAYMENT = {
    due_in_days: 30,                    // jatuh tempo = tanggal terbit + N hari
    method: 'Transfer / QRIS',
    bank: '(nama bank)',                // <-- isi nama bank
    account_name: '(nama pemilik rekening)', // <-- isi nama rekening
    account_no: '(nomor rekening)'      // <-- isi nomor rekening
};

// ==========================================
// 1. INIT (dipanggil billing.js)
// ==========================================
export async function initSekolah(container) {
    injectStyles();

    container.innerHTML = `
        <div style="display:flex; justify-content:flex-end; margin-bottom:14px;">
            <button id="bs-add" class="bp-btn-primary">
                <i class="fas fa-plus"></i> Deklarasi Kontrak
            </button>
        </div>

        <div class="bp-tabs card" id="bs-school-tabs">
            <div class="bp-tabs-label">SEKOLAH</div>
            <div class="bp-tabs-list"></div>
        </div>

        <div class="bp-tabs card" id="bs-class-tabs">
            <div class="bp-tabs-label">KELAS</div>
            <div class="bp-tabs-list"></div>
        </div>

        <div id="bs-result">
            <p class="card" style="color:#94a3b8;text-align:center;">Memuat data...</p>
        </div>

        <div id="bs-modal" class="bp-modal" style="display:none;">
            <div class="bp-modal-box card">
                <h3 id="bs-modal-title">Deklarasi Kontrak</h3>
                <p id="bs-migrate-warn" class="bs-migrate-warn"></p>
                <div class="bp-form-grid">
                    <label>Kelas
                        <select id="bs-f-class" class="bp-input"></select>
                    </label>
                    <label>Label periode
                        <input id="bs-f-label" class="bp-input" placeholder="mis. Agustus / Semester 1">
                    </label>
                    <div style="grid-column:1/-1;">
                        <span style="font-size:.8rem;font-weight:700;color:#475569;display:block;margin-bottom:6px;">Cara menentukan periode tagihan</span>
                        <div class="bs-mode-seg" id="bs-mode-seg">
                            <button type="button" class="bs-mode-btn active" data-bs-mode="range">
                                <i class="fas fa-calendar-alt"></i> Rentang Tanggal</button>
                            <button type="button" class="bs-mode-btn" data-bs-mode="count">
                                <i class="fas fa-list-ol"></i> Jumlah Pertemuan</button>
                        </div>
                    </div>
                    <label id="bs-f-mulai-wrap">Pertemuan Mulai
                        <select id="bs-f-mulai" class="bp-input"></select>
                    </label>
                    <label id="bs-f-akhir-wrap">Pertemuan Akhir
                        <select id="bs-f-akhir" class="bp-input"></select>
                    </label>
                    <label id="bs-f-jumlah-wrap" style="display:none;">Jumlah Pertemuan
                        <input id="bs-f-jumlah" type="number" class="bp-input" value="4" min="1" required>
                    </label>
                    <label>Harga kontrak (Rp)
                        <input id="bs-f-price" type="number" class="bp-input" value="80000" min="0" required>
                    </label>
                    <label>Per berapa sesi
                        <input id="bs-f-sessions" type="number" class="bp-input" value="4" min="1" required>
                    </label>
                </div>
                <p id="bs-price-hint" style="font-size:.78rem;color:#64748b;margin:0 0 12px;"></p>
                <p id="bs-meet-hint" style="font-size:.78rem;color:#0e7490;margin:-4px 0 12px;"></p>
                <div class="bp-form-actions">
                    <button id="bs-f-save" class="bp-btn-primary">Simpan</button>
                    <button id="bs-f-cancel" class="bp-btn-secondary">Batal</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('bs-add').onclick = openDeclare;
    document.getElementById('bs-f-cancel').onclick = closeModal;
    document.getElementById('bs-f-save').onclick = saveContract;
    ['bs-f-price', 'bs-f-sessions'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', updatePriceHint);
    });
    ['bs-f-mulai', 'bs-f-akhir'].forEach(id => {
        document.getElementById(id).addEventListener('change', refreshMeetHint);
    });
    // Mode pemilih periode: Rentang Tanggal | Jumlah Pertemuan
    document.querySelectorAll('#bs-mode-seg .bs-mode-btn').forEach(b => {
        b.onclick = async () => {
            if (b.dataset.bsMode === 'count') {
                const has = await ensureJumlahKolom();
                if (!has) {
                    alert('Database belum punya kolom "jumlah_pertemuan".\n\n' +
                        'Jalankan file berikut di Supabase SQL Editor:\n' +
                        'migrations/2026-09-05-billing-sekolah-jumlah-pertemuan.sql\n\n' +
                        'Lalu muat ulang halaman (Ctrl+F5) untuk menggunakan mode "Jumlah Pertemuan".');
                    return;
                }
            }
            setDateMode(b.dataset.bsMode);
        };
    });
    document.getElementById('bs-f-jumlah').addEventListener('input', () => {
        syncEndFromJumlah();
        refreshMeetHint();
    });
    // Ganti kelas saat deklarasi baru -> muat ulang daftar pertemuan
    document.getElementById('bs-f-class').addEventListener('change', (e) => {
        if (editingId || !e.target.value) return;
        modalMeetings = [];
        selMulaiTgl = selAkhirTgl = null;
        (async () => {
            modalMeetings = await fetchMeetings(e.target.value);
            populateMeetingSelects();
            applyDateModeUI();
        })();
    });

    classesCache = await fetchActiveClasses();
    deriveSchools();
    renderSchoolTabs();
}

// ==========================================
// 2. CSS TAMBAHAN (sekali saja)
// ==========================================
function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    const css = `
        .bs-total td:first-child { font-weight:700; color:#1e293b; }
        .bs-total td:last-child  { color:#15803d; font-weight:800; font-size:.95rem; }
        .bs-label-cell { width:38%; color:#475569; }

        /* === MODE PEMILIH PERIODE (rentang tanggal / jumlah pertemuan) === */
        .bs-mode-seg { display:inline-flex; flex-wrap:wrap; gap:6px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:10px; padding:4px; }
        .bs-mode-btn { border:none; background:transparent; color:#64748b; font-weight:700; font-size:.82rem; padding:7px 14px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:7px; transition:.12s; }
        .bs-mode-btn:hover { color:#1e40af; }
        .bs-mode-btn.active { background:#2563eb; color:#fff; box-shadow:0 1px 3px rgba(37,99,235,.4); }
        .bs-mode-btn i { font-size:.85rem; }
        .bs-migrate-warn { display:none; background:#fffbeb; border:1px solid #fcd34d; color:#92400e; font-size:.78rem;
                           padding:8px 12px; border-radius:8px; margin:0 0 12px; line-height:1.5; }
        .bs-migrate-warn code { background:#fef3c7; padding:1px 4px; border-radius:4px; font-size:.72rem; }

        /* === INVOICE PAPER === */
        .bs-inv-paper { background:#fff; width:min(820px,94vw); max-height:88vh; overflow:auto;
                        padding:32px 36px; border-radius:10px; font-family:'Roboto',sans-serif; color:#1f2937; }
        .bs-inv-top { display:flex; justify-content:space-between; gap:20px; align-items:flex-start;
                      padding-bottom:14px; border-bottom:3px double #cbd5e1; }
        .bs-inv-issuer { display:flex; gap:12px; align-items:center; }
        .bs-inv-issuer-logo { width:64px; height:64px; object-fit:contain; border-radius:8px;
                              background:#fff; display:flex; align-items:center; justify-content:center; }
        .bs-inv-logo { width:40px; height:40px; object-fit:contain; border-radius:6px; background:#f1f5f9;
                       display:flex; align-items:center; justify-content:center; font-size:20px; color:#94a3b8; }
        .bs-inv-sch-name { font-size:19px; font-weight:800; color:#111827; line-height:1.2; }
        .bs-inv-sch-sub { font-size:.72rem; color:#6b7280; margin-top:2px; line-height:1.45; }
        .bs-inv-pay { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:10px;
                      border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; background:#f8fafc; font-size:.8rem; }
        .bs-inv-pay .bs-inv-cap { display:block; margin-bottom:2px; }
        .bs-inv-pay .pay-status { color:#b45309; font-weight:800; }
        .bs-inv-pay .pay-status.paid { color:#15803d; }
        .bs-inv-title { text-align:right; }
        .bs-inv-title h1 { margin:0; font-size:30px; letter-spacing:5px; color:#2563eb; font-weight:900; }
        .bs-inv-title .no { font-size:.8rem; color:#374151; margin-top:4px; font-weight:600; }
        .bs-inv-title .tgl { font-size:.75rem; color:#6b7280; }
        .bs-inv-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; margin:16px 0 6px; font-size:.85rem; }
        .bs-inv-grid b { color:#111827; }
        .bs-inv-cap { font-size:.68rem; text-transform:uppercase; letter-spacing:.8px; color:#9ca3af; font-weight:700; }
        .bs-inv-table { width:100%; border-collapse:collapse; margin-top:14px; font-size:.85rem; }
        .bs-inv-table th { background:#1e293b; color:#fff; padding:9px 10px; text-align:left; font-size:.72rem;
                           text-transform:uppercase; letter-spacing:.6px; }
        .bs-inv-table td { border-bottom:1px solid #e5e7eb; padding:10px; vertical-align:top; }
        .bs-inv-table .num { text-align:right; white-space:nowrap; }
        .bs-inv-table .ctr { text-align:center; }
        .bs-inv-dates { display:block; font-size:.72rem; color:#6b7280; margin-top:5px; line-height:1.5; }
        .bs-inv-total-row td { background:#eff6ff; font-weight:900; font-size:1rem; color:#1e3a8a;
                               border-bottom:none !important; }
        .bs-inv-terbilang { font-size:.82rem; font-style:italic; color:#374151; margin-top:10px;
                            border:1px dashed #d1d5db; border-radius:6px; padding:8px 12px; background:#f9fafb; }
        .bs-inv-note { font-size:.78rem; color:#4b5563; margin-top:14px; }
        .bs-inv-sign { display:flex; justify-content:space-between; margin-top:34px; font-size:.85rem; text-align:center; }
        .bs-sign-tools { display:flex; align-items:center; gap:10px; margin:26px 0 -6px; padding:8px 12px;
                         background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; }
        .bs-sign-tools label { font-size:.76rem; font-weight:700; color:#475569; }
        .bs-inv-sign div { width:220px; }
        .bs-inv-sign .space { height:64px; }
        .bs-inv-sign .nm { border-top:1px solid #9ca3af; padding-top:4px; font-weight:700; }
        .bs-inv-foot { margin-top:22px; font-size:.66rem; color:#9ca3af; text-align:center;
                       border-top:1px solid #f1f5f9; padding-top:8px; }

        /* === KWITANSI (bukti lunas) === */
        .bs-kw-title { text-align:right; }
        .bs-kw-title h1 { margin:0; font-size:30px; letter-spacing:5px; color:#15803d; font-weight:900; }
        .bs-kw-title .no { font-size:.8rem; color:#374151; margin-top:4px; font-weight:600; }
        .bs-kw-title .tgl { font-size:.75rem; color:#6b7280; }
        .bs-kw-paper { width:min(720px,94vw); }
        .bs-kw-body { margin-top:18px; font-size:.86rem; }
        .bs-kw-body .lbl { width:176px; flex-shrink:0; color:#475569; font-weight:700; }
        .bs-kw-body .val { flex:1; color:#111827; font-weight:600; }
        .bs-kw-amount { font-size:1.08rem; font-weight:800; color:#15803d; }
        .bs-kw-terbilang { font-style:italic; color:#374151; font-weight:600; }

        /* === PRINT === */
        @media print {
            @page { size:A4; margin:14mm; }
            body * { visibility:hidden !important; }
            #bs-inv-paper, #bs-inv-paper *, #bs-kw-paper, #bs-kw-paper * { visibility:visible !important; }
            #bs-inv-paper, #bs-kw-paper { position:fixed; inset:0; width:100%; max-height:none; overflow:visible;
                            box-shadow:none !important; border-radius:0 !important; padding:0; }
            .bs-no-print { display:none !important; }
        }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}

// ==========================================
// 3. HELPERS
// ==========================================
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtDate(t) {
    if (!t) return '—';
    return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtDateTime(t) {
    if (!t) return '—';
    return new Date(t).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

// Hierarki: SEKOLAH dulu, baru KELAS.
// PENTING: tabel `classes` TIDAK punya kolom is_active.
// Kelas "aktif" = kelas pada Tahun Ajaran + Semester yang sedang AKTIF
// (mengikuti pola absensi-sekolah.js).
async function fetchActiveClasses() {
    const [{ data: ta }, { data: sem }] = await Promise.all([
        supabase.from('academic_years').select('id, year').eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('semesters').select('id, name').eq('is_active', true).limit(1).maybeSingle()
    ]);

    let query = supabase.from('classes')
        .select('id, name, school_id, schools(name)')
        .order('name');

    if (ta && sem) {
        query = query.eq('academic_year_id', ta.id).eq('semester_id', sem.id);
    }
    // Fallback: bila periode aktif belum diset di Pengaturan,
    // tampilkan semua kelas agar modul tetap bisa digunakan.

    const { data, error } = await query;
    if (error) {
        console.error('Gagal memuat kelas sekolah:', error.message);
        return [];
    }
    return data || [];
}

// Turunkan daftar sekolah unik dari kelas-kelas aktif tersebut
function deriveSchools() {
    const seen = new Set();
    schoolsCache = [];
    classesCache.forEach(c => {
        if (!c.school_id || seen.has(c.school_id)) return;
        seen.add(c.school_id);
        schoolsCache.push({ id: c.school_id, name: c.schools?.name || 'Sekolah' });
    });
}

function renderSchoolTabs() {
    const list = document.querySelector('#bs-school-tabs .bp-tabs-list');
    if (!list) return;

    if (schoolsCache.length === 0) {
        list.innerHTML = '<span class="bp-tab-empty">Tidak ada sekolah dengan kelas aktif.</span>';
        document.querySelector('#bs-class-tabs .bp-tabs-list').innerHTML =
            '<span class="bp-tab-empty">—</span>';
        return;
    }

    list.innerHTML = schoolsCache.map(s => `
        <button class="bp-tab ${s.id === activeSchoolId ? 'active' : ''}"
                data-id="${s.id}"
                onclick="window.bsActivateSchool('${s.id}')">
            ${esc(s.name)}
        </button>
    `).join('');

    // auto-aktifkan sekolah pertama bila belum valid
    if (!activeSchoolId || !schoolsCache.some(s => s.id === activeSchoolId)) {
        activateSchool(schoolsCache[0].id);
    } else {
        renderClassTabs();
    }
}

function renderClassTabs() {
    const list = document.querySelector('#bs-class-tabs .bp-tabs-list');
    if (!list) return;

    // kelas milik SEKOLAH yang sedang dipilih saja
    const schoolClasses = classesCache.filter(c => c.school_id === activeSchoolId);

    if (schoolClasses.length === 0) {
        list.innerHTML = '<span class="bp-tab-empty">Tidak ada kelas aktif di sekolah ini.</span>';
        return;
    }

    list.innerHTML = schoolClasses.map(c => `
        <button class="bp-tab ${c.id === activeClassId ? 'active' : ''}"
                data-id="${c.id}"
                onclick="window.bsActivateClass('${c.id}')">
            ${esc(c.name)}
        </button>
    `).join('');
}

async function activateSchool(id) {
    activeSchoolId = id;
    activeClassId = null;   // reset kelas saat ganti sekolah

    document.querySelectorAll('#bs-school-tabs .bp-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.id === id);
    });

    renderClassTabs();

    // auto-aktifkan kelas pertama dari sekolah tsb
    const first = classesCache.find(c => c.school_id === id);
    if (first) await activateClass(first.id);
    else await loadClassData();
}
window.bsActivateSchool = activateSchool;

async function activateClass(id) {
    activeClassId = id;
    document.querySelectorAll('#bs-class-tabs .bp-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.id === id);
    });
    await loadClassData();
}
window.bsActivateClass = activateClass;

// ==========================================
// 4. REKAP + PERHITUNGAN INVOICE
// invoice = (contract_price / contract_sessions) x pertemuan x anak
// ==========================================
async function loadClassData() {
    const box = document.getElementById('bs-result');
    if (!box) return;
    if (!activeClassId) {
        box.innerHTML = '<p class="card" style="color:#94a3b8;text-align:center;">Pilih kelas untuk melihat kontrak.</p>';
        return;
    }

    const cls = classesCache.find(c => c.id === activeClassId);
    const [{ count: anak }, { data: periods }, { data: allMeetings }, { data: invoices }] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true })
            .eq('class_id', activeClassId).eq('is_active', true),
        supabase.from('billing_periods_sekolah').select('*')
            .eq('class_id', activeClassId)
            .order('start_date', { ascending: false }),
        supabase.from('pertemuan_kelas').select('id, tanggal')
            .eq('class_id', activeClassId).order('tanggal'),
        supabase.from('invoices_sekolah').select('*')
            .eq('class_id', activeClassId)
            .order('created_at', { ascending: false })
    ]);

    const invByPeriod = {};
    (invoices || []).forEach(iv => invByPeriod[iv.period_id] = iv);

    let blocks = '';
    (periods || []).forEach(bp => {
        const pps = Math.round((Number(bp.contract_price) / Math.max(1, bp.contract_sessions)) * 100) / 100;
        const meetings = (allMeetings || []).filter(m => m.tanggal &&
            m.tanggal >= bp.start_date && m.tanggal <= bp.end_date);
        // nomor urut pertemuan (P#) sesuai posisi di daftar pertemuan kelas
        const idxS = (allMeetings || []).findIndex(m => m.tanggal === bp.start_date);
        const idxE = (allMeetings || []).findIndex(m => m.tanggal === bp.end_date);
        const rangeTxt = (idxS > -1 && idxE > -1) ? `P${idxS + 1}–P${idxE + 1} · ` : '';
        // Jumlah pertemuan yang DIKONTAK (bisa > realisasi utk kasus bayar di muka)
        const kontrakJumlah = (bp.jumlah_pertemuan != null && Number(bp.jumlah_pertemuan) > 0)
            ? Number(bp.jumlah_pertemuan) : meetings.length;
        const liveTotal = Math.round(pps * kontrakJumlah * (anak || 0) * 100) / 100;
        const iv = invByPeriod[bp.id];
        // Bila invoice sudah terbit, total resmi = snapshot invoice (agar rekap
        // selalu konsisten dengan dokumen yang dicetak)
        const total = (iv && Number(iv.total) != null) ? Number(iv.total) : liveTotal;

        blocks += `
        <div class="bp-period-block card">
            <div class="bp-toolbar">
                <div class="bp-toolbar-info">
                    <strong>${esc(bp.periode_label) || 'Periode tanpa label'}</strong>
                    <span class="bp-meta">${rangeTxt}${fmtDate(bp.start_date)} s/d <b>${fmtDate(bp.end_date)}</b></span>
                    <span class="bp-meta">Kontrak: <b>${rupiah(bp.contract_price)}</b> / ${bp.contract_sessions} sesi · <b>${kontrakJumlah}</b> pertemuan</span>
                    <span class="bp-meta">Harga/sesi: <b>${rupiah(pps)}</b></span>
                    <span class="bp-badge ${iv ? 'ok' : 'over'}">${iv ? 'Invoice terbit ✓' : 'Belum ada invoice'}</span>
                </div>
                <div class="bp-toolbar-actions">
                    ${iv ? `<button class="bp-btn-edit" onclick="window.bsOpenInvoice ? window.bsOpenInvoice('${bp.id}') : alert('Modul invoice belum termuat. Muat ulang halaman (Ctrl+F5).')">
                        <i class="fas fa-eye"></i> Lihat Invoice</button>` :
                    `<button class="bp-btn-edit" onclick="window.bsGenerateInvoice('${bp.id}')">
                        <i class="fas fa-file-invoice-dollar"></i> Generate Invoice</button>`}
                    <button class="bp-btn-edit" onclick="window.bsEditContract('${bp.id}')">
                        <i class="fas fa-pen"></i> Edit</button>
                    <button class="bp-btn-delete" onclick="window.bsDeleteContract('${bp.id}')">
                        <i class="fas fa-trash"></i> Hapus</button>
                </div>
            </div>
            <table class="bp-date-table">
                <tbody>
                    <tr><td class="bs-label-cell">👨‍🎓 Jumlah Anak (aktif)</td><td><b>${anak || 0}</b></td></tr>
                    <tr><td class="bs-label-cell">📅 Pertemuan dikontrak</td><td><b>${kontrakJumlah}</b></td></tr>
                    <tr><td class="bs-label-cell">📅 Realisasi tercatat</td><td>${meetings.length}</td></tr>
                    <tr><td class="bs-label-cell">💰 Harga per sesi</td><td>${rupiah(pps)}</td></tr>
                    <tr class="bs-total"><td class="bs-label-cell">🧾 TOTAL INVOICE</td>
                        <td>${rupiah(total)}${iv ? ` <span class="bp-badge ok">terbit ${fmtDateTime(iv.created_at)}</span>` : ''}</td></tr>
                </tbody>
            </table>
        </div>`;
    });

    if (!blocks) {
        blocks = '<p class="card" style="color:#94a3b8;text-align:center;">Belum ada kontrak untuk kelas ini.</p>';
    }

    let invoiceList = '';
    if ((invoices || []).length) {
        invoiceList = `
        <div class="card" style="margin-top:16px;">
            <h3 style="margin:0 0 10px;">🧾 Daftar Invoice Kelas Ini</h3>
            <table class="bp-date-table">
                <thead><tr><th style="width:40px;">No</th><th>Periode</th><th>Anak</th><th>Pertemuan</th>
                    <th>Harga/Sesi</th><th>Total</th><th>Diterbitkan</th><th>Status</th><th>Dibayar</th></tr></thead>
                <tbody>${invoices.map((iv, i) => `<tr>
                    <td>${i + 1}</td>
                    <td>${esc(iv.periode_label) || '—'}</td>
                    <td>${iv.jumlah_anak}</td>
                    <td>${iv.jumlah_pertemuan}</td>
                    <td>${rupiah(iv.price_per_session)}</td>
                    <td><b>${rupiah(iv.total)}</b></td>
                    <td>${fmtDateTime(iv.created_at)}</td>
                    <td>${iv.status_lunas === 'lunas'
                        ? '<span class="bp-badge ok">Lunas</span>'
                        : '<span class="bp-badge over">Belum Lunas</span>'}</td>
                    <td>${iv.paid_at ? fmtDateTime(iv.paid_at) : '—'}</td>
                </tr>`).join('')}</tbody>
            </table>
        </div>`;
    }

    box.innerHTML = `${blocks}${invoiceList}
        <p style="font-size:.78rem;color:#64748b;margin-top:14px;">
            Invoice = harga per sesi x jumlah pertemuan dalam rentang tanggal x jumlah anak aktif.
            Harga per sesi diturunkan dari kontrak (mis. 80rb / 4 sesi = 20rb).
        </p>`;
}

// ==========================================
// 5. MODAL CONTROLLERS (CRUD)
// ==========================================
// --- Pertemuan utk modal (sumber pilihan Mulai/Akhir) ---
let modalMeetings = [];      // [{id, tanggal}] urut tanggal
let contractDateMode = 'range'; // cara memilih periode di modal: 'range' | 'count'
let selMulaiTgl = null;      // snapshot tanggal (fallback bila pertemuan dihapus)
let selAkhirTgl = null;

async function fetchMeetings(classId) {
    const { data } = await supabase.from('pertemuan_kelas')
        .select('id, tanggal')
        .eq('class_id', classId)
        .order('tanggal');
    return data || [];
}

// Deteksi apakah tabel kontrak sudah punya kolom jumlah_pertemuan (hasil migrasi).
let schemaHasJumlah = null;   // null = belum diperiksa
async function ensureJumlahKolom() {
    if (schemaHasJumlah !== null) return schemaHasJumlah;
    try {
        const { error } = await supabase.from('billing_periods_sekolah')
            .select('jumlah_pertemuan').limit(1);
        schemaHasJumlah = !error;
    } catch (e) {
        schemaHasJumlah = false;
    }
    return schemaHasJumlah;
}

// Deteksi apakah tabel invoice sudah punya kolom status pembayaran (hasil migrasi).
let schemaHasPayment = null;   // null = belum diperiksa
async function ensurePaymentKolom() {
    if (schemaHasPayment !== null) return schemaHasPayment;
    try {
        const { error } = await supabase.from('invoices_sekolah')
            .select('status_lunas').limit(1);
        schemaHasPayment = !error;
    } catch (e) {
        schemaHasPayment = false;
    }
    return schemaHasPayment;
}

function fillClassSelect() {
    const sel = document.getElementById('bs-f-class');
    const schoolClasses = classesCache.filter(c => c.school_id === activeSchoolId);
    sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' +
        schoolClasses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    return sel;
}

function populateMeetingSelects(mulaiId, akhirId) {
    const opts = modalMeetings.map((m, i) =>
        `<option value="${m.id}">P${i + 1} · ${fmtDate(m.tanggal)}</option>`).join('');
    const s = document.getElementById('bs-f-mulai');
    const e = document.getElementById('bs-f-akhir');
    s.innerHTML = opts;
    e.innerHTML = opts;
    // preselect: pakai id tersimpan bila masih ada, fallback posisi default
    if (mulaiId && modalMeetings.some(m => m.id === mulaiId)) s.value = mulaiId;
    else s.selectedIndex = 0;
    if (akhirId && modalMeetings.some(m => m.id === akhirId)) e.value = akhirId;
    else e.selectedIndex = Math.min(modalMeetings.length - 1, s.selectedIndex + 3); // kebiasaan per-4-sesi
    syncTanggalFromSelects();
    refreshMeetHint();
}

function syncTanggalFromSelects() {
    const s = document.getElementById('bs-f-mulai').value;
    const e = document.getElementById('bs-f-akhir').value;
    selMulaiTgl = modalMeetings.find(m => m.id === s)?.tanggal || null;
    selAkhirTgl = modalMeetings.find(m => m.id === e)?.tanggal || null;
}

// --- Proyeksi tanggal akhir saat jumlah pertemuan > yg tercatat (bayar di muka) ---
function meetingGapDays() {
    const gaps = [];
    for (let i = 1; i < modalMeetings.length; i++) {
        gaps.push((new Date(modalMeetings[i].tanggal + 'T00:00:00') - new Date(modalMeetings[i - 1].tanggal + 'T00:00:00')) / 86400000);
    }
    if (!gaps.length) return 7;                       // default mingguuan
    gaps.sort((a, b) => a - b);
    const mid = Math.floor(gaps.length / 2);
    const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
    return Math.max(1, Math.round(median));
}

function projectedEndDate(jumlah, mulaiIdx) {
    const avail = Math.min(jumlah, modalMeetings.length - mulaiIdx); // pertemuan yg sudah tercatat
    const last = modalMeetings[mulaiIdx + avail - 1].tanggal;
    const extra = jumlah - avail;                     // sisa yg belum tercatat
    if (extra <= 0) return last;
    const d = new Date(last + 'T00:00:00');
    d.setDate(d.getDate() + meetingGapDays() * extra);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Helper mode "Jumlah Pertemuan" ---
function applyDateModeUI() {
    const akhirWrap = document.getElementById('bs-f-akhir-wrap');
    const jumlahWrap = document.getElementById('bs-f-jumlah-wrap');
    if (akhirWrap) akhirWrap.style.display = contractDateMode === 'range' ? '' : 'none';
    if (jumlahWrap) jumlahWrap.style.display = contractDateMode === 'count' ? '' : 'none';
    document.querySelectorAll('#bs-mode-seg .bs-mode-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.bsMode === contractDateMode));
}

function syncJumlahFromRange() {
    const i1 = modalMeetings.findIndex(m => m.id === document.getElementById('bs-f-mulai').value);
    const i2 = modalMeetings.findIndex(m => m.id === document.getElementById('bs-f-akhir').value);
    const el = document.getElementById('bs-f-jumlah');
    if (i1 > -1 && i2 > -1 && el) el.value = Math.abs(i2 - i1) + 1;
}

function syncEndFromJumlah() {
    const mulaiId = document.getElementById('bs-f-mulai').value;
    const jumlahEl = document.getElementById('bs-f-jumlah');
    const endSel = document.getElementById('bs-f-akhir');
    if (!jumlahEl || !endSel || !endSel.options.length) return;
    const i1 = modalMeetings.findIndex(m => m.id === mulaiId);
    if (i1 === -1) return;
    const jumlah = Math.max(1, Number(jumlahEl.value) || 1);
    const sisa = modalMeetings.length - i1;
    if (jumlah <= sisa) {
        endSel.value = modalMeetings[i1 + jumlah - 1].id; // auto-set Pertemuan Akhir
    } else {
        // Pertemuan ke-N belum tercatat (kasus bayar di muka):
        // pertahankan pilihan pertemuan terakhir; tanggal akhir diproyeksikan saat simpan.
        endSel.value = modalMeetings[modalMeetings.length - 1].id;
    }
}

function setDateMode(mode) {
    contractDateMode = mode;
    applyDateModeUI();
    if (mode === 'count') syncEndFromJumlah();
    else syncJumlahFromRange();
    refreshMeetHint();
}

// Tampilkan peringatan bila DB belum punya kolom jumlah_pertemuan (hasil migrasi)
async function refreshMigrateWarn() {
    const el = document.getElementById('bs-migrate-warn');
    if (!el) return;
    const has = await ensureJumlahKolom();
    if (has) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = 'block';
    el.innerHTML = '⚠️ Database belum punya kolom <b>jumlah_pertemuan</b>. ' +
        'Jalankan <code>migrations/2026-09-05-billing-sekolah-jumlah-pertemuan.sql</code> ' +
        'di Supabase SQL Editor, lalu muat ulang (Ctrl+F5). ' +
        'Tanpa ini, jumlah pertemuan yang dikontrak (mis. 4 padahal baru 3 tercatat) <b>tidak bisa disimpan</b>.';
}

function refreshMeetHint() {
    // Mode Jumlah Pertemuan: tampilkan rentang tanggal hasil hitung otomatis
    if (contractDateMode === 'count') {
        const hintEl = document.getElementById('bs-meet-hint');
        if (!hintEl) return;
        const mulaiId = document.getElementById('bs-f-mulai').value;
        const jumlah = Math.max(1, Number(document.getElementById('bs-f-jumlah')?.value) || 1);
        const i1 = modalMeetings.findIndex(m => m.id === mulaiId);
        if (i1 === -1) { hintEl.textContent = ''; return; }
        const iEnd = i1 + jumlah - 1;
        if (iEnd < modalMeetings.length) {
            hintEl.textContent = `✓ ${jumlah} pertemuan akan ditagihkan — ${fmtDate(modalMeetings[i1].tanggal)} s/d ${fmtDate(modalMeetings[iEnd].tanggal)}.`;
        } else {
            const sisa = modalMeetings.length - i1;
            const projEnd = projectedEndDate(jumlah, i1);
            hintEl.textContent = `✓ ${jumlah} pertemuan direncanakan (baru ${sisa} tercatat) — periode s/d perkiraan ${fmtDate(projEnd)}.`;
        }
        return;
    }
    const i1 = modalMeetings.findIndex(m => m.id === document.getElementById('bs-f-mulai').value);
    const i2 = modalMeetings.findIndex(m => m.id === document.getElementById('bs-f-akhir').value);
    const hint = document.getElementById('bs-meet-hint');
    if (!hint) return;
    if (i1 === -1 || i2 === -1) { hint.textContent = ''; return; }
    let a = i1, b = i2;
    if (a > b) [a, b] = [b, a];
    hint.textContent = `✓ ${b - a + 1} pertemuan akan ditagihkan`;
}

function openDeclare() {
    editingId = null;
    editingContract = null;
    document.getElementById('bs-modal-title').textContent = 'Deklarasi Kontrak';
    const sel = fillClassSelect();
    sel.disabled = false;
    sel.value = activeClassId || '';
    document.getElementById('bs-f-label').value = '';
    document.getElementById('bs-f-price').value = 80000;
    document.getElementById('bs-f-sessions').value = 4;
    document.getElementById('bs-f-jumlah').value = 4;
    updatePriceHint();
    contractDateMode = 'range';   // deklarasi baru default: mode rentang tanggal

    // Ambil daftar pertemuan aktual kelas aktif → jadi pilihan Mulai/Akhir
    modalMeetings = [];
    selMulaiTgl = selAkhirTgl = null;
    document.getElementById('bs-modal').style.display = 'block';

    (async () => {
        modalMeetings = await fetchMeetings(sel.value);
        populateMeetingSelects();
        applyDateModeUI();
        await refreshMigrateWarn();
    })();
}

async function openEditContract(id) {
    const { data: bp } = await supabase.from('billing_periods_sekolah').select('*').eq('id', id).single();
    if (!bp) return alert('Kontrak tidak ditemukan.');
    editingId = bp.id;
    editingContract = bp;   // simpan snapshot (termasuk school_id) utk fallback save
    document.getElementById('bs-modal-title').textContent = `Edit Kontrak · ${bp.periode_label || bp.start_date}`;
    const sel = fillClassSelect();
    // pastikan option kelas kontrak ini tersedia walau kelasnya sudah non-aktif
    if (!sel.querySelector(`option[value="${bp.class_id}"]`)) {
        sel.insertAdjacentHTML('beforeend', `<option value="${bp.class_id}">(kelas non-aktif)</option>`);
    }
    sel.value = bp.class_id;
    sel.disabled = true; // kelas tidak diubah saat edit
    document.getElementById('bs-f-label').value = bp.periode_label || '';
    document.getElementById('bs-f-price').value = bp.contract_price;
    document.getElementById('bs-f-sessions').value = bp.contract_sessions;
    updatePriceHint();
    document.getElementById('bs-modal').style.display = 'block';

    // Snapshot tanggal tersimpan sebagai fallback (jika pertemuan batas sudah dihapus)
    selMulaiTgl = bp.start_date;
    selAkhirTgl = bp.end_date;
    modalMeetings = [];
    document.getElementById('bs-f-mulai').innerHTML = '<option value="">memuat...</option>';
    document.getElementById('bs-f-akhir').innerHTML = '<option value="">memuat...</option>';

    modalMeetings = await fetchMeetings(bp.class_id);
    const startId = modalMeetings.find(m => m.tanggal === bp.start_date)?.id || '';
    const endId   = modalMeetings.find(m => m.tanggal === bp.end_date)?.id || '';
    populateMeetingSelects(startId, endId);

    // Jika kontrak menyimpan jumlah_pertemuan (kolom hasil migrasi), buka di mode
    // "Jumlah Pertemuan" agar nilainya terlihat dan mudah diubah (mis. 3 -> 4).
    const hasJumlah = bp.jumlah_pertemuan != null && Number(bp.jumlah_pertemuan) > 0;
    contractDateMode = hasJumlah ? 'count' : 'range';
    applyDateModeUI();
    if (hasJumlah) {
        document.getElementById('bs-f-jumlah').value = Number(bp.jumlah_pertemuan);
        syncEndFromJumlah();
    } else {
        syncJumlahFromRange();   // prefill jumlah bila user pindah ke mode count
    }
    await refreshMigrateWarn();
}

function closeModal() {
    document.getElementById('bs-modal').style.display = 'none';
    editingId = null;
    editingContract = null;
}

window.bsEditContract = openEditContract;

function updatePriceHint() {
    const price = Number(document.getElementById('bs-f-price')?.value) || 0;
    const sessions = Math.max(1, Number(document.getElementById('bs-f-sessions')?.value) || 4);
    const hint = document.getElementById('bs-price-hint');
    if (hint) hint.textContent = `= ${rupiah(Math.round(price / sessions * 100) / 100)} per sesi`;
}

async function saveContract() {
    const mulaiId = document.getElementById('bs-f-mulai').value;
    let akhirId = document.getElementById('bs-f-akhir').value;

    // Mode "Jumlah Pertemuan": akhir dihitung otomatis = mulai + (jumlah-1) pertemuan.
    // Bila jumlah melebihi pertemuan yang sudah tercatat (kasus bayar di muka),
    // tanggal akhir periode diproyeksikan mengikuti jeda jadwal agar pertemuan
    // yang belum tercatat tetap masuk dalam rentang periode.
    let endDateOverride = null;
    if (contractDateMode === 'count') {
        const jumlah = Math.max(1, Number(document.getElementById('bs-f-jumlah').value) || 1);
        const mulaiIdx = modalMeetings.findIndex(m => m.id === mulaiId);
        if (mulaiIdx === -1) return alert('Pilih pertemuan Mulai terlebih dahulu!');
        const endIdx = mulaiIdx + jumlah - 1;
        if (endIdx < modalMeetings.length) {
            akhirId = modalMeetings[endIdx].id;
            document.getElementById('bs-f-akhir').value = akhirId; // sinkronkan UI
        } else {
            const sisa = modalMeetings.length - mulaiIdx;
            endDateOverride = projectedEndDate(jumlah, mulaiIdx);
            document.getElementById('bs-f-akhir').value = modalMeetings[modalMeetings.length - 1].id;
            if (!confirm(`Anda mendeklarasikan ${jumlah} pertemuan, tapi baru ${sisa} yang tercatat.\nTanggal akhir periode diproyeksikan ke ${fmtDate(endDateOverride)} mengikuti jadwal kelas.\n\nLanjutkan?`)) return;
        }
    }

    // school_id WAJIB (NOT NULL di DB) — ambil dari kelas terpilih,
    // fallback ke kontrak yang sedang diedit (kasus kelas non-aktif)
    const classId = document.getElementById('bs-f-class').value;
    const cls = classesCache.find(c => c.id === classId);
    const schoolId = cls?.school_id || editingContract?.school_id || null;

    // Jumlah pertemuan yang DIKONTAK — bisa melebihi realisasi utk kasus
    // sekolah bayar di muka (mis. kontrak 4, baru 3 pertemuan tercatat).
    let jumlahKontrak = null;
    if (contractDateMode === 'count') {
        jumlahKontrak = Math.max(1, Number(document.getElementById('bs-f-jumlah').value) || 1);
    } else {
        const m1 = modalMeetings.findIndex(m => m.id === mulaiId);
        const m2 = modalMeetings.findIndex(m => m.id === akhirId);
        // Jangan timpa jumlah tersimpan bila user hanya mengedit hal lain
        // (mis. harga) tanpa mengubah rentang tanggal.
        const tglAwalSel  = m1 > -1 ? modalMeetings[m1].tanggal : null;
        const tglAkhirSel = m2 > -1 ? modalMeetings[m2].tanggal : null;
        const rangeChanged = (editingContract &&
            (tglAwalSel !== (editingContract.start_date || null) ||
             tglAkhirSel !== (editingContract.end_date || null)));
        if (m1 > -1 && m2 > -1 && rangeChanged) {
            jumlahKontrak = Math.abs(m2 - m1) + 1;   // rentang diubah -> hitung ulang
        } else if (editingContract && Number(editingContract.jumlah_pertemuan) > 0) {
            jumlahKontrak = Number(editingContract.jumlah_pertemuan); // pertahankan tersimpan
        } else if (m1 > -1 && m2 > -1) {
            jumlahKontrak = Math.abs(m2 - m1) + 1;   // deklarasi baru (non-edit)
        }
    }

    const payload = {
        class_id: classId,
        school_id: schoolId,
        periode_label: document.getElementById('bs-f-label').value || null,
        // Tanggal diturunkan dari PERTEMUAN yang dipilih (bukan date picker).
        // Fallback ke snapshot tersimpan bila pertemuan batas sudah dihapus.
        start_date: modalMeetings.find(m => m.id === mulaiId)?.tanggal || selMulaiTgl,
        end_date: endDateOverride || modalMeetings.find(m => m.id === akhirId)?.tanggal || selAkhirTgl,
        contract_price: Number(document.getElementById('bs-f-price').value) || 0,
        contract_sessions: Math.max(1, Number(document.getElementById('bs-f-sessions').value) || 4),
    };
    // Hanya kirim kolom jumlah_pertemuan bila schema sudah punya (hasil migrasi).
    // Di mode "Jumlah Pertemuan", jika kolom belum ada, blokir simpan agar tidak
    // diam-diam menyimpan sebagai 3 (fallback realisasi).
    const hasKolom = await ensureJumlahKolom();
    if (contractDateMode === 'count') {
        if (!hasKolom) {
            return alert('Database belum punya kolom "jumlah_pertemuan".\n\n' +
                'Jalankan file migrations/2026-09-05-billing-sekolah-jumlah-pertemuan.sql ' +
                'di Supabase SQL Editor lalu muat ulang halaman (Ctrl+F5).');
        }
        payload.jumlah_pertemuan = jumlahKontrak;
    } else if (hasKolom && jumlahKontrak != null) {
        payload.jumlah_pertemuan = jumlahKontrak;
    }

    if (!payload.class_id) return alert('Pilih kelas!');
    if (!payload.school_id) return alert('Sekolah untuk kelas ini tidak ditemukan.');
    if (!payload.start_date || !payload.end_date) return alert('Pilih pertemuan Mulai & Akhir terlebih dahulu!');
    if (payload.end_date < payload.start_date) return alert('Tanggal akhir tidak boleh sebelum tanggal mulai!');
    if (payload.contract_price <= 0) return alert('Harga kontrak harus lebih dari 0!');

    // VALIDASI TUMPANG TINDIH dengan siklus lain di kelas yang sama
    let q = supabase.from('billing_periods_sekolah')
        .select('id, periode_label, start_date, end_date')
        .eq('class_id', payload.class_id);
    if (editingId) q = q.neq('id', editingId);
    const { data: conflicts } = await q
        .lt('start_date', payload.end_date)
        .gt('end_date', payload.start_date);

    if (conflicts && conflicts.length) {
        const c = conflicts[0];
        return alert(`⚠️ Rentang bertabrakan dengan siklus "${c.periode_label || c.start_date}" (${c.start_date} s/d ${c.end_date}).\nPakai rentang tanggal yang tidak tumpang tindih agar pertemuan tidak terhitung ganda.`);
    }

    let error = null;
    if (editingId) {
        const { error: err } = await supabase.from('billing_periods_sekolah').update(payload).eq('id', editingId);
        error = err;
    } else {
        const { error: err } = await supabase.from('billing_periods_sekolah').insert(payload);
        error = err;
    }

    if (error) return alert('Gagal simpan: ' + error.message);

    // EDIT BERPENGARUH KE DOKUMEN TERKAIT:
    // jika kontrak sudah punya invoice, snapshot invoice ikut diperbarui
    // (jumlah pertemuan, anak, harga/sesi, total, periode) dari kontrak terbaru,
    // sehingga invoice & kwitansi yang dicetak selalu memakai nilai baru.
    if (editingId) {
        const { data: existingInv } = await supabase.from('invoices_sekolah')
            .select('id').eq('period_id', editingId).maybeSingle();
        if (existingInv) {
            const upd = await computeInvoiceValues(editingId);
            if (upd) {
                const { error: errUpd } = await supabase.from('invoices_sekolah')
                    .update(upd).eq('period_id', editingId);
                if (!errUpd) {
                    alert('Kontrak diperbarui.\nInvoice yang sudah terbit ikut diperbarui:\n' +
                        rupiah(upd.total) + ' (' + upd.jumlah_pertemuan + ' pertemuan x ' + upd.jumlah_anak + ' anak).\n' +
                        'Buka kembali invoice/kwitansi untuk melihat nilai terbaru.');
                }
            }
        }
    }

    closeModal();
    if (payload.class_id) await activateClass(payload.class_id);
}

// ==========================================
// 6. GENERATE INVOICE (snapshot) & HAPUS
// ==========================================
// Hitung nilai invoice dari KONTRAK (dipakai saat terbit & saat edit kontrak).
// Jumlah pertemuan = jumlah yang DIKONTAK (bila kolom tersedia), fallback ke
// realisasi pertemuan tercatat dalam rentang tanggal.
async function computeInvoiceValues(periodId) {
    const { data: bp } = await supabase.from('billing_periods_sekolah')
        .select('*').eq('id', periodId).single();
    if (!bp) return null;

    const [{ count: anak }, { data: meetings }] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true })
            .eq('class_id', bp.class_id).eq('is_active', true),
        supabase.from('pertemuan_kelas').select('id, tanggal')
            .eq('class_id', bp.class_id)
            .gte('tanggal', bp.start_date).lte('tanggal', bp.end_date)
    ]);

    const pps = Math.round((Number(bp.contract_price) / Math.max(1, bp.contract_sessions)) * 100) / 100;
    const jumlahPertemuan = (bp.jumlah_pertemuan != null && Number(bp.jumlah_pertemuan) > 0)
        ? Number(bp.jumlah_pertemuan)
        : (meetings || []).length;
    const total = Math.round(pps * jumlahPertemuan * (anak || 0) * 100) / 100;

    return {
        period_id: periodId,
        school_id: bp.school_id,
        class_id: bp.class_id,
        periode_label: bp.periode_label,
        jumlah_anak: anak || 0,
        jumlah_pertemuan: jumlahPertemuan,
        price_per_session: pps,
        total
    };
}

async function generateInvoice(periodId) {
    const { data: bp } = await supabase.from('billing_periods_sekolah')
        .select('*').eq('id', periodId).single();
    if (!bp) return alert('Kontrak tidak ditemukan.');

    const { data: exist } = await supabase.from('invoices_sekolah')
        .select('id').eq('period_id', periodId).maybeSingle();
    if (exist) return alert('Invoice untuk siklus ini sudah pernah diterbitkan.');

    const inv = await computeInvoiceValues(periodId);
    if (!inv) return alert('Gagal menghitung nilai invoice.');

    if (!confirm(`Terbitkan invoice?\n\nAnak        : ${inv.jumlah_anak}\nPertemuan   : ${inv.jumlah_pertemuan}\nHarga/sesi  : ${rupiah(inv.price_per_session)}\nTOTAL       : ${rupiah(inv.total)}\n\nLanjutkan?`)) return;

    const { error } = await supabase.from('invoices_sekolah').insert(inv);

    if (error) return alert('Gagal terbitkan invoice: ' + error.message);
    await loadClassData();
    await openInvoiceView(periodId);   // langsung tampilkan hasilnya
}
window.bsGenerateInvoice = generateInvoice;

async function deleteContract(id) {
    const { data: bp } = await supabase.from('billing_periods_sekolah').select('*').eq('id', id).single();
    if (!bp) return alert('Kontrak tidak ditemukan.');
    const hasInvoice = !!(await supabase.from('invoices_sekolah').select('id').eq('period_id', id).maybeSingle()).data;
    const extra = hasInvoice ? '\n\nPERHATIAN: Invoice yang sudah terbit akan IKUT TERHAPUS.' : '';
    if (!confirm(`Hapus kontrak "${(bp.periode_label || bp.start_date)}" permanen?${extra}`)) return;

    const { error } = await supabase.from('billing_periods_sekolah').delete().eq('id', id);
    if (error) return alert('Gagal hapus: ' + error.message);
    await loadClassData();
}
window.bsDeleteContract = deleteContract;

// ==========================================
// 7. TAMPILAN DOKUMEN INVOICE (+ cetak/PDF)
// ==========================================
function terbilangIDR(n) {
    const s = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    function w(x) {
        x = Math.floor(Math.abs(x));
        if (x === 0) return '';
        if (x < 12) return s[x];
        if (x < 20) return w(x - 10) + ' Belas';
        if (x < 100) return w(Math.floor(x / 10)) + ' Puluh ' + w(x % 10);
        if (x < 200) return 'Seratus ' + w(x - 100);
        if (x < 1000) return w(Math.floor(x / 100)) + ' Ratus ' + w(x % 100);
        if (x < 2000) return 'Seribu ' + w(x - 1000);
        if (x < 1e6) return w(Math.floor(x / 1000)) + ' Ribu ' + w(x % 1000);
        if (x < 1e9) return w(Math.floor(x / 1e6)) + ' Juta ' + w(x % 1e6);
        if (x < 1e12) return w(Math.floor(x / 1e9)) + ' Miliar ' + w(x % 1e9);
        return String(x);
    }
    const words = w(n).trim().replace(/\s+/g, ' ');
    return words ? words + ' Rupiah' : 'Nol Rupiah';
}

function invoiceNo(iv) {
    const d = iv.created_at ? new Date(iv.created_at) : new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `INV/${ymd}/${(iv.id || '').slice(0, 6).toUpperCase()}`;
}

window.bsPrintInvoice = () => window.print();
window.bsCloseInvoice = () => document.getElementById('bs-inv-modal')?.remove();

// ==========================================
// 7b. KWITANSI / BUKTI LUNAS
// Dicetak langsung dari data invoice (tanpa simpan status pembayaran).
// ==========================================
function kwitansiNo(iv) {
    const d = iv.created_at ? new Date(iv.created_at) : new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `KWT/${ymd}/${(iv.id || '').slice(0, 6).toUpperCase()}`;
}

// --- Penandatar tangan (nama guru) utk "Hormat Kami"/"Yang menerima" ---
async function fetchTeachers() {
    if (teachersCache.length) return teachersCache;
    const { data } = await supabase.from('teachers').select('id, name, role').order('name');
    teachersCache = data || [];
    return teachersCache;
}

function setSigner(id) {
    signerId = id;
    const t = teachersCache.find(x => x.id === id);
    signerName = t ? t.name : '';
    if (id) sessionStorage.setItem('bs_signer_id', id);
    document.querySelectorAll('.bs-signer-name').forEach(el => {
        el.textContent = signerName || ' ';
    });
}

async function populateSignerSelect(sel) {
    let list;
    try { list = await fetchTeachers(); } catch (e) { list = []; }
    if (!list.length) {
        sel.innerHTML = '<option value="">— daftar guru kosong —</option>';
        return;
    }
    sel.innerHTML = '<option value="">— pilih penanda tangan —</option>' +
        list.map(t => `<option value="${t.id}">${esc(t.name)}${t.role ? ' (' + esc(t.role) + ')' : ''}</option>`).join('');
    const saved = sessionStorage.getItem('bs_signer_id') || signerId || '';
    if (saved && list.some(t => t.id === saved)) {
        sel.value = saved;
        setSigner(saved);
    }
}

async function openKwitansiView(periodId) {
    const STEP = (s) => { window.__bsStep = s; };
    try {
        STEP('ambil invoice (kwitansi)');
        const { data: iv, error: errIv } = await supabase.from('invoices_sekolah')
            .select('*').eq('period_id', periodId).single();
        if (errIv || !iv) return alert('Data invoice tidak ditemukan.\n' + (errIv?.message || ''));

        // Kwitansi = bukti pembayaran: hanya boleh dicetak bebas bila sudah bertatus LUNAS
        // (atau bila kolom pembayaran belum ada di DB — mode kompatibilitas).
        const hasPayCol = await ensurePaymentKolom();
        if (hasPayCol && iv.status_lunas !== 'lunas' &&
            !confirm('Invoice ini belum ditandai LUNAS.\nKwitansi adalah bukti pembayaran.\nTetap buka/cetak kwitansi?')) return;

        STEP('ambil kontrak');
        const { data: bp, error: errBp } = await supabase.from('billing_periods_sekolah')
            .select('*').eq('id', periodId).single();
        if (errBp || !bp) return alert('Kontrak tidak ditemukan.\n' + (errBp?.message || ''));

        STEP('ambil kelas & sekolah');
        const [{ data: cls }, { data: sch }] = await Promise.all([
            supabase.from('classes').select('name, level').eq('id', iv.class_id).single(),
            supabase.from('schools').select('name, address, phone, email, headmaster')
                .eq('id', iv.school_id).single()
        ]);

        STEP('render dokumen kwitansi');
        // Tutup modal invoice agar cetak hanya menampilkan kwitansi
        document.getElementById('bs-inv-modal')?.remove();
        document.getElementById('bs-kw-modal')?.remove();

        const total = Number(iv.total) || 0;
        const issuerLogoHtml = `<img src="${esc(ISSUER.logo)}" alt="${esc(ISSUER.name)}" class="bs-inv-issuer-logo">`;
        const issuerName = esc(ISSUER.name);
        const issuerContact = [ISSUER.address,
                               ISSUER.tel ? 'Telp. ' + ISSUER.tel : '',
                               ISSUER.email,
                               ISSUER.website].filter(Boolean).join(' · ');

        const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        // Tanggal di kwitansi = tanggal pembayaran tersimpan (jika sudah lunas), bukan tanggal cetak.
        const kwDateStr = iv.paid_at ? fmtDate(iv.paid_at) : todayStr;
        const kwMethod = iv.payment_method || PAYMENT.method;
        const kwRef = iv.payment_ref || '';
        const schoolLine = sch?.address
            ? `${esc(sch.name)}<br><span style="color:#4b5563; font-weight:500;">${esc(sch.address)}</span>`
            : esc(sch?.name || '-');
        const payerLabel = sch?.headmaster ? esc(sch.headmaster) : esc(sch?.name || '-');

        const wrap = document.createElement('div');
        wrap.id = 'bs-kw-modal';
        wrap.className = 'bp-modal';
        wrap.innerHTML = `
        <div style="display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:8px; width:min(720px,94vw); margin-bottom:8px;" class="bs-no-print">
            <button class="bp-btn-primary" onclick="window.bsPrintKwitansi()">
                <i class="fas fa-print"></i> Cetak / Simpan PDF</button>
            <button class="bp-btn-secondary" onclick="window.bsBackToInvoice('${periodId}')">
                <i class="fas fa-file-invoice-dollar"></i> Lihat Invoice</button>
            <button class="bp-btn-secondary" onclick="window.bsCloseKwitansi()">Tutup</button>
        </div>
        <div id="bs-kw-paper" class="bs-inv-paper bs-kw-paper" onclick="event.stopPropagation()">
            <div class="bs-inv-top">
                <div class="bs-inv-issuer">
                    ${issuerLogoHtml}
                    <div>
                        <div class="bs-inv-sch-name">${issuerName}</div>
                        <div class="bs-inv-sch-sub">${esc(issuerContact) || '&nbsp;'}</div>
                    </div>
                </div>
                <div class="bs-kw-title">
                    <h1>KWITANSI</h1>
                    <div class="no">No. ${kwitansiNo(iv)}</div>
                    <div class="tgl">Tanggal: ${kwDateStr}</div>
                </div>
            </div>

            <div class="bs-kw-body">
                <div style="display:flex; gap:12px; margin-bottom:10px;">
                    <span class="lbl">Sudah terima dari</span>
                    <span class="val">${schoolLine}</span>
                </div>
                <div style="display:flex; gap:12px; margin-bottom:10px;">
                    <span class="lbl">Uang sejumlah</span>
                    <span class="val bs-kw-amount">${rupiah(total)}</span>
                </div>
                <div style="display:flex; gap:12px; margin-bottom:10px;">
                    <span class="lbl">Terbilang</span>
                    <span class="val bs-kw-terbilang"># ${terbilangIDR(Math.round(total))} #</span>
                </div>
                <div style="display:flex; gap:12px; margin-bottom:10px;">
                    <span class="lbl">Untuk pembayaran</span>
                    <span class="val">Jasa Les Robotik — ${esc(cls?.name) || '-'}${iv.periode_label ? ' (' + esc(iv.periode_label) + ')' : ''}
                        <span style="display:block; color:#4b5563; font-weight:500; margin-top:3px;">
                            No. Invoice: ${invoiceNo(iv)}${cls?.level ? ' · ' + esc(cls.level) : ''}<br>
                            Periode: ${fmtDate(bp.start_date)} s/d ${fmtDate(bp.end_date)} · ${iv.jumlah_pertemuan} pertemuan · ${iv.jumlah_anak} anak
                        </span>
                    </span>
                </div>
                <div style="display:flex; gap:12px; margin-bottom:10px;">
                    <span class="lbl">Metode</span>
                    <span class="val">${esc(kwMethod)}${PAYMENT.account_no ? ' (' + esc(PAYMENT.account_no) + ')' : ''}</span>
                </div>
                ${kwRef ? `<div style="display:flex; gap:12px; margin-bottom:10px;">
                    <span class="lbl">No. Referensi</span>
                    <span class="val">${esc(kwRef)}</span>
                </div>` : ''}
            </div>

            <div class="bs-sign-tools bs-no-print">
                <label>Yang menerima — penanda tangan:</label>
                <select id="bs-kw-signer" class="bp-input" style="width:230px;"></select>
            </div>

            <div class="bs-inv-sign">
                <div>
                    Yang membayar,<br>
                    ${payerLabel}
                    <div class="space"></div>
                    <div class="nm">(........................................)</div>
                </div>
                <div>
                    Yang menerima,<br>
                    <span class="bs-signer-name">${signerName ? esc(signerName) : '&nbsp;'}</span>
                    <div class="space"></div>
                    <div class="nm">(........................................)</div>
                </div>
            </div>

            <div class="bs-inv-foot">
                Bukti lunas ini dicetak dari data invoice No. ${invoiceNo(iv)} · No. ${kwitansiNo(iv)}
            </div>
        </div>
    `;

        wrap.addEventListener('click', (e) => { if (e.target === wrap) window.bsCloseKwitansi(); });
        document.body.appendChild(wrap);

        // Dropdown penanda tangan (Yang menerima) — nama guru dari tabel teachers
        const kwSignerSel = document.getElementById('bs-kw-signer');
        if (kwSignerSel) populateSignerSelect(kwSignerSel);
        if (kwSignerSel) kwSignerSel.onchange = () => setSigner(kwSignerSel.value);
    } catch (e) {
        console.error('[Billing Sekolah] Gagal membuka kwitansi:', e);
        const detail = (e && e.message) ? e.message : String(e);
        alert('Gagal membuka kwitansi: ' + detail + '\n\nDetail teknis ada di Console (F12).');
    }
}
window.bsOpenKwitansi = openKwitansiView;
window.bsPrintKwitansi = () => window.print();
window.bsCloseKwitansi = () => document.getElementById('bs-kw-modal')?.remove();
window.bsBackToInvoice = (periodId) => {
    document.getElementById('bs-kw-modal')?.remove();
    openInvoiceView(periodId);
};

// ==========================================
// 7c. STATUS PEMBAYARAN (Tandai Lunas / Batalkan)
// Menyimpan tanggal bayar + metode + ref di invoices_sekolah.
// ==========================================
async function markPaid(periodId) {
    const has = await ensurePaymentKolom();
    if (!has) return alert('Database belum punya kolom status pembayaran.\n\n' +
        'Jalankan migrations/2026-09-06-billing-sekolah-pembayaran.sql di Supabase SQL Editor,\nlalu muat ulang halaman (Ctrl+F5).');
    const method = (prompt('Metode pembayaran (kosongkan utk default):', PAYMENT.method || 'Transfer / QRIS') || '').trim() || null;
    const ref = (prompt('No. referensi / bukti bayar (opsional, bisa dikosongkan):') || '').trim() || null;
    if (!confirm('Tandai invoice ini LUNAS?\n' + (ref ? ('Ref: ' + ref + '\n') : '') + 'Tanggal bayar: sekarang.')) return;
    const { error } = await supabase.from('invoices_sekolah')
        .update({
            status_lunas: 'lunas',
            paid_at: new Date().toISOString(),
            payment_method: method,
            payment_ref: ref
        })
        .eq('period_id', periodId);
    if (error) return alert('Gagal tandai lunas: ' + error.message);
    await openInvoiceView(periodId);
}

async function unmarkPaid(periodId) {
    if (!confirm('Batalkan status LUNAS invoice ini?\nData tanggal bayar, metode & referensi akan dihapus.')) return;
    const { error } = await supabase.from('invoices_sekolah')
        .update({ status_lunas: 'belum', paid_at: null, payment_method: null, payment_ref: null })
        .eq('period_id', periodId);
    if (error) return alert('Gagal batalkan lunas: ' + error.message);
    await openInvoiceView(periodId);
}
window.bsMarkPaid = markPaid;
window.bsUnmarkPaid = unmarkPaid;

async function openInvoiceView(periodId) {
    const STEP = (s) => { window.__bsStep = s; };
    try {
        STEP('inisialisasi');
        document.getElementById('bs-inv-modal')?.remove();

        STEP('ambil invoice');
        const { data: iv, error: errIv } = await supabase.from('invoices_sekolah')
            .select('*').eq('period_id', periodId).single();
        if (errIv || !iv) return alert('Data invoice tidak ditemukan.\n' + (errIv?.message || ''));

        // 1) Kontrak dulu (dibutuhkan untuk rentang tanggal pertemuan)
        STEP('ambil kontrak');
        const { data: bp, error: errBp } = await supabase.from('billing_periods_sekolah')
            .select('*').eq('id', periodId).single();
        if (errBp || !bp) return alert('Kontrak tidak ditemukan.\n' + (errBp?.message || ''));

        const startD = bp.start_date || '';
        const endD = bp.end_date || '';

        // 2) Baru kelas, sekolah & daftar pertemuan dalam rentang
        STEP('ambil kelas & sekolah');
        const [{ data: cls }, { data: sch }] = await Promise.all([
            supabase.from('classes').select('name, level').eq('id', iv.class_id).single(),
            supabase.from('schools').select('name, address, phone, email, npsn, headmaster, logo_url')
                .eq('id', iv.school_id).single()
        ]);

        STEP('ambil daftar pertemuan');
        const { data: mtgs } = await supabase.from('pertemuan_kelas').select('tanggal')
            .eq('class_id', iv.class_id)
            .gte('tanggal', startD).lte('tanggal', endD)
            .order('tanggal');

        STEP('render dokumen invoice');
    const pps = Number(iv.price_per_session);
    const total = Number(iv.total);
    const isLunas = iv.status_lunas === 'lunas';
    const paidStr = isLunas && iv.paid_at ? fmtDateTime(iv.paid_at) : '';
    // Logo PENERIMA (sekolah) -> dipindah ke blok "Ditagihkan Kepada"
    const schoolLogoHtml = sch?.logo_url
        ? `<img src="${esc(sch.logo_url)}" alt="logo" class="bs-inv-logo">`
        : `<div class="bs-inv-logo"><i class="fas fa-school"></i></div>`;
    // Kop PENERBIT = Robopanda (logo kanonik dari index.html)
    const issuerLogoHtml = `<img src="${esc(ISSUER.logo)}" alt="${esc(ISSUER.name)}" class="bs-inv-issuer-logo">`;
    const issuerName = esc(ISSUER.name);
    const issuerContact = [ISSUER.address,
                           ISSUER.tel ? 'Telp. ' + ISSUER.tel : '',
                           ISSUER.email,
                           ISSUER.website].filter(Boolean).join(' · ');
    // Jatuh tempo = tanggal terbit + N hari
    const dueDate = iv.created_at ? new Date(iv.created_at) : new Date();
    dueDate.setDate(dueDate.getDate() + (Number(PAYMENT.due_in_days) || 0));
    const dueStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
    const datesHtml = (mtgs || []).length
        ? `<span class="bs-inv-dates">Pertemuan: ${(mtgs || []).map((m, i) => `P${i + 1} (${fmtDate(m.tanggal)})`).join(', ')}</span>`
        : '';
    const lineTotal = Math.round(pps * iv.jumlah_pertemuan * iv.jumlah_anak * 100) / 100;
    const schSub = [sch?.address, sch?.phone ? 'Telp. ' + sch.phone : '', sch?.email,
                    sch?.npsn ? 'NPSN ' + sch.npsn : ''].filter(Boolean).join(' · ');

    const wrap = document.createElement('div');
    wrap.id = 'bs-inv-modal';
    wrap.className = 'bp-modal';
    wrap.innerHTML = `
        <div style="display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:8px; width:min(820px,94vw); margin-bottom:8px;" class="bs-no-print">
            <button class="bp-btn-primary" onclick="window.bsPrintInvoice()">
                <i class="fas fa-print"></i> Cetak / Simpan PDF</button>
            <button class="bp-btn-primary" onclick="window.bsOpenKwitansi && window.bsOpenKwitansi('${periodId}')">
                <i class="fas fa-receipt"></i> Cetak Kwitansi</button>
            ${isLunas
                ? `<button class="bp-btn-delete" onclick="window.bsUnmarkPaid('${periodId}')">
                    <i class="fas fa-undo"></i> Batalkan Lunas</button>`
                : `<button class="bp-btn-primary" onclick="window.bsMarkPaid && window.bsMarkPaid('${periodId}')">
                    <i class="fas fa-check-circle"></i> Tandai Lunas</button>`}
            <button class="bp-btn-secondary" onclick="window.bsCloseInvoice()">Tutup</button>
        </div>
        <div id="bs-inv-paper" class="bs-inv-paper" onclick="event.stopPropagation()">
            <div class="bs-inv-top">
                <div class="bs-inv-issuer">
                    ${issuerLogoHtml}
                    <div>
                        <div class="bs-inv-sch-name">${issuerName}</div>
                        <div class="bs-inv-sch-sub">${esc(issuerContact) || '&nbsp;'}</div>
                    </div>
                </div>
                <div class="bs-inv-title">
                    <h1>INVOICE</h1>
                    <div class="no">No. ${invoiceNo(iv)}</div>
                    <div class="tgl">Diterbitkan: ${fmtDateTime(iv.created_at)}</div>
                    <div class="tgl">Jatuh Tempo: ${fmtDate(dueStr)}</div>
                </div>
            </div>

            <div class="bs-inv-grid">
                <div>
                    <div class="bs-inv-cap">Ditagihkan Kepada</div>
                    <div style="display:flex; gap:8px; align-items:center; margin-top:2px;">
                        ${schoolLogoHtml}
                        <b>${esc(sch?.name) || '-'}</b>
                    </div>
                    <span style="color:#4b5563; display:block; margin-top:4px;">${sch?.address ? esc(sch.address) : '-'}<br>
                    ${sch?.headmaster ? 'u.p. ' + esc(sch.headmaster) + ' (Kepala Sekolah)' : ''}</span>
                </div>
                <div style="text-align:right;">
                    <div class="bs-inv-cap">Kelas</div>
                    <b>${esc(cls?.name) || '-'}${cls?.level ? ' · ' + esc(cls.level) : ''}</b>
                </div>
                <div>
                    <div class="bs-inv-cap">Periode</div>
                    <b>${esc(iv.periode_label) || '—'}</b><br>
                    <span style="color:#4b5563;">${fmtDate(bp.start_date)} s/d ${fmtDate(bp.end_date)}</span>
                </div>
                <div style="text-align:right;">
                    <div class="bs-inv-cap">Basis Kontrak</div>
                    <b>${rupiah(bp.contract_price)}</b> per ${bp.contract_sessions} sesi<br>
                    <span style="color:#4b5563;">= ${rupiah(pps)} / sesi</span>
                </div>
            </div>

            <div class="bs-inv-pay">
                <div>
                    <span class="bs-inv-cap">Status</span>
                    <b class="pay-status ${isLunas ? 'paid' : ''}">${isLunas ? 'Lunas' : 'Belum Lunas'}</b>
                </div>
                <div>
                    <span class="bs-inv-cap">Jatuh Tempo</span>
                    <b>${fmtDate(dueStr)}</b>
                </div>
                ${isLunas && paidStr ? `<div>
                    <span class="bs-inv-cap">Dibayar</span>
                    <b>${paidStr}</b>
                </div>` : ''}
                ${iv.payment_method ? `<div>
                    <span class="bs-inv-cap">Metode Bayar</span>
                    <b>${esc(iv.payment_method)}</b>
                </div>` : ''}
                <div>
                    <span class="bs-inv-cap">Rekening</span>
                    <b>${esc(PAYMENT.account_no)}</b><br>
                    <span style="font-size:.72rem;color:#6b7280;">${esc(PAYMENT.account_name)} · ${esc(PAYMENT.bank)}</span>
                </div>
                ${iv.payment_ref ? `<div>
                    <span class="bs-inv-cap">Ref. Bayar</span>
                    <b>${esc(iv.payment_ref)}</b>
                </div>` : ''}
            </div>

            <table class="bs-inv-table">
                <thead><tr>
                    <th style="width:36px;" class="ctr">No</th>
                    <th>Uraian</th>
                    <th class="ctr" style="width:90px;">Pertemuan</th>
                    <th class="ctr" style="width:70px;">Anak</th>
                    <th class="num" style="width:110px;">Tarif / Sesi</th>
                    <th class="num" style="width:130px;">Jumlah</th>
                </tr></thead>
                <tbody>
                    <tr>
                        <td class="ctr">1</td>
                        <td>Jasa Les Robotik — ${esc(cls?.name) || '-'}${iv.periode_label ? ' (' + esc(iv.periode_label) + ')' : ''}
                            ${datesHtml}</td>
                        <td class="ctr">${iv.jumlah_pertemuan}</td>
                        <td class="ctr">${iv.jumlah_anak}</td>
                        <td class="num">${rupiah(pps)}</td>
                        <td class="num">${rupiah(lineTotal)}</td>
                    </tr>
                    <tr class="bs-inv-total-row">
                        <td colspan="5" style="text-align:right;">TOTAL</td>
                        <td class="num">${rupiah(total)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="bs-inv-terbilang">
                Terbilang: <b># ${terbilangIDR(Math.round(total))} #</b>
            </div>

            ${bp.note ? `<div class="bs-inv-note"><b>Catatan:</b> ${esc(bp.note)}</div>` : ''}

            <div class="bs-sign-tools bs-no-print">
                <label>Hormat Kami — penanda tangan:</label>
                <select id="bs-inv-signer" class="bp-input" style="width:230px;"></select>
            </div>

            <div class="bs-inv-sign">
                <div>
                    Penerima,<br>
                    ${sch?.name ? esc(sch.name) : ''}
                    <div class="space"></div>
                    <div class="nm">(........................................)</div>
                </div>
                <div>
                    Hormat Kami,<br>
                    <span class="bs-signer-name">${signerName ? esc(signerName) : '&nbsp;'}</span>
                    <div class="space"></div>
                    <div class="nm">(........................................)</div>
                </div>
            </div>

            <div class="bs-inv-foot">
                Dokumen ini dihasilkan otomatis oleh sistem · No. ${invoiceNo(iv)}
            </div>
        </div>
    `;

    wrap.addEventListener('click', (e) => { if (e.target === wrap) window.bsCloseInvoice(); });
    document.body.appendChild(wrap);

    // Dropdown penanda tangan (Hormat Kami) — nama guru dari tabel teachers
    const invSignerSel = document.getElementById('bs-inv-signer');
    if (invSignerSel) populateSignerSelect(invSignerSel);
    if (invSignerSel) invSignerSel.onchange = () => setSigner(invSignerSel.value);
    } catch (e) {
        console.error('[Billing Sekolah] Gagal di tahap:', window.__bsStep || '?', e);
        const detail = (e && e.message) ? e.message : String(e);
        alert('Gagal membuka invoice [' + (window.__bsStep || '?') + ']: ' + detail
            + '\n\nDetail teknis ada di Console (F12).');
    }
}
window.bsOpenInvoice = openInvoiceView;
