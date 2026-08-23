/**
 * Project: Absensi Private Module (SPA)
 * Description: Daftar kelas private dengan tampilan kartu warna-warni.
 * Filename: modules/absensi-private.js
 *
 * Improvements:
 *   - XSS-safe rendering (escapeHtml) for all DB values injected into HTML/attributes.
 *   - Event delegation (no inline onclick with user data) to prevent JS injection.
 *   - Toast notification replaces native alert() for better UX.
 *   - Student count badge on each card (fetched in same parallel query).
 *   - Empty state now includes a "Buat Kelas" shortcut button.
 *   - localStorage key fixed: activePrivateClassName (consistent with monitoring-private.js).
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE ---
let privateClassesCache = [];

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Inject CSS Khusus (Colorful Cards)
    injectStyles();

    // 2. Render HTML Structure
    canvas.innerHTML = `
        <div class="ap-container">
            <div class="ap-header">
                <div>
                    <h2>Absensi Private</h2>
                    <p>Pilih kelas untuk mulai monitoring</p>
                </div>
                <button id="btn-dashboard" class="btn-outline">
                    <i class="fas fa-home"></i> Dashboard
                </button>
            </div>

            <div id="private-grid" class="card-grid">
                <div class="loading-state">
                    <i class="fas fa-circle-notch fa-spin"></i> Memuat kelas private...
                </div>
            </div>

            <!-- Toast Container -->
            <div id="ap-toast-container"></div>
        </div>
    `;

    // 3. Event Listener
    document.getElementById('btn-dashboard').onclick = () => {
        if (window.dispatchModuleLoad) window.dispatchModuleLoad('overview', 'Dashboard', 'Home');
    };

        // 4. Delegation: klik kartu kelas (aman — tidak pakai inline onclick)
    document.getElementById('private-grid').addEventListener('click', async (e) => {
        const chevron = e.target.closest('.card-chevron');
        const card = e.target.closest('.color-card[data-cid]');

        // Klik chevron → toggle student preview (jangan navigasi)
        if (chevron) {
            e.stopPropagation();
            const cid = chevron.closest('.color-card').dataset.cid;
            toggleStudentPreview(cid, chevron);
            return;
        }

        // Klik card body (bukan chevron) → navigate ke monitoring
        if (card && !e.target.closest('.card-chevron') && !e.target.closest('.student-preview')) {
            window.dispatchPrivateMonitoring(
                card.dataset.cid,
                card.dataset.cname,
                card.dataset.lid,
                card.dataset.lkode
            );
        }
    });

    // 5. Load Data
    await loadPrivateClasses();
}

// ==========================================
// 2. CSS STYLING (COLORFUL THEME)
// ==========================================
function injectStyles() {
    const styleId = 'absensi-private-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .ap-container { max-width: 1100px; margin: 0 auto; padding-bottom: 80px; font-family: 'Roboto', sans-serif; }
        
        /* Header Style */
        .ap-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .ap-header h2 { margin: 0; font-family: 'Fredoka One', cursive; color: #333; font-size: 1.8rem; }
        .ap-header p { margin: 5px 0 0; color: #666; font-size: 0.95rem; }

        .btn-outline { background: white; color: #555; border: 1px solid #ddd; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition:0.2s; }
        .btn-outline:hover { background: #f0f0f0; color: #333; border-color:#bbb; }

        /* Grid System */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }

        /* Colorful Card Style */
        .color-card {
            border-radius: 16px;
            padding: 25px;
            color: white;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            aspect-ratio: 4/3; /* Kotak sedikit persegi panjang */
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }

        .color-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
        
        /* Hiasan background transparan */
        .color-card::after {
            content: ''; position: absolute; top: -20px; right: -20px;
            width: 80px; height: 80px; background: rgba(255,255,255,0.2);
            border-radius: 50%;
        }

        .card-title { font-family: 'Fredoka One', cursive; font-size: 1.4rem; margin-bottom: 10px; z-index:1; }
        .card-level { background: rgba(0,0,0,0.2); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; z-index:1; }
        .card-icon { font-size: 2rem; margin-bottom: 10px; opacity: 0.9; z-index:1; }

        /* Variasi Warna (Modulus 4) */
        .bg-blue   { background: linear-gradient(135deg, #4d97ff, #2563eb); }
        .bg-orange { background: linear-gradient(135deg, #ffab19, #f59e0b); }
        .bg-green  { background: linear-gradient(135deg, #00b894, #00a884); }
        .bg-purple { background: linear-gradient(135deg, #a55eea, #8854d0); }

                .loading-state { grid-column: 1/-1; text-align: center; padding: 50px; color: #999; font-size: 1.1rem; }
        .empty-state { grid-column: 1/-1; text-align: center; padding: 40px; background: #f9f9f9; border-radius: 12px; border: 2px dashed #ddd; }
        .empty-state i { font-size: 3rem; color: #ccc; margin-bottom: 15px; }
        .empty-state p { margin: 10px 0 5px; color: #666; font-weight: 600; }
        .empty-state small { color: #999; display: block; margin-bottom: 20px; }
        .empty-state .btn-create { background: #4d97ff; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .empty-state .btn-create:hover { background: #2563eb; transform: translateY(-1px); }

                /* Student count badge */
        .card-student-count {
            background: rgba(255, 255, 255, 0.22); backdrop-filter: blur(2px);
            padding: 3px 10px; border-radius: 20px; font-size: 0.75rem;
            display: flex; align-items: center; gap: 5px; z-index: 1; margin-top: 8px;
        }

        /* Card header row (ikon + count + chevron) */
        .card-header-row {
            display: flex; align-items: center; gap: 8px;
            justify-content: center; flex-wrap: wrap;
        }
        .card-chevron {
            margin-top: 6px; transition: transform 0.2s ease;
        }
        .card-chevron.rotated { transform: rotate(180deg); }

        /* Expandable Student Preview */
        .student-preview {
            margin-top: 12px; padding: 8px 10px;
            background: rgba(0, 0, 0, 0.06); border-radius: 8px;
            max-height: 180px; overflow-y: auto; -webkit-overflow-scrolling: touch;
            width: 100%; box-sizing: border-box; z-index: 1;
        }
        .student-preview .std-row {
            display: flex; align-items: center; gap: 8px;
            padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.06);
            font-size: 0.82rem; color: rgba(255,255,255,0.9);
        }
        .student-preview .std-row:last-child { border-bottom: none; }
        .std-row .std-initial {
            width: 26px; height: 26px; border-radius: 50%;
            background: rgba(255,255,255,0.25); display: flex;
            align-items: center; justify-content: center; font-size: 0.75rem;
            font-weight: 700; flex-shrink: 0;
        }
        .std-row .std-name {
            white-space: nowrap; overflow: hidden;
            text-overflow: ellipsis; min-width: 0; flex: 1;
        }
        .std-row .std-grade {
            font-weight: 600; opacity: 0.85; flex-shrink: 0;
        }

        /* Toast (custom, mengganti alert native) */
        #ap-toast-container { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 10px; width: 90%; max-width: 380px; }
        .ap-toast { background: #1e293b; color: white; padding: 12px 20px; border-radius: 30px; font-size: 0.9rem; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: apFadeIn 0.3s ease-out; text-align: center; }
        .ap-toast.error { background: #ef4444; }
        @keyframes apFadeIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC & DATA
// ==========================================

async function loadPrivateClasses() {
    const grid = document.getElementById('private-grid');

    try {
        // Ambil data kelas private + relasi levels
        const { data, error } = await supabase
            .from('class_private')
            .select(`
                id,
                name,
                level_id,
                is_active,
                levels (id, kode)
            `)
            // [FIX] Jangan tampil card kelas non-aktif (schema: is_active NOT NULL DEFAULT true)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        if (!data || data.length === 0) {
            privateClassesCache = [];
            renderEmptyState();
            return;
        }

        // Cache dan render (student count di-fetch async per-card)
        privateClassesCache = data;
        renderCards(data, grid);

        // Fetch student counts secara paralel untuk semua kelas
        const classIds = data.map(c => c.id);
        const { data: counts } = await supabase
            .from('students_private')
            .select('class_id', { count: 'exact', head: false })
            .in('class_id', classIds);

        // Hitung jumlah siswa per kelas
        const countMap = {};
        (counts || []).forEach(s => {
            countMap[s.class_id] = (countMap[s.class_id] || 0) + 1;
        });

        // Update badge jumlah siswa di setiap kartu
        data.forEach(c => {
            const badge = grid.querySelector(`.card-student-count[data-cid="${c.id}"]`);
            if (badge) badge.textContent = `${countMap[c.id] || 0} siswa`;
        });

    } catch (err) {
        console.error("Error:", err);
        showToast("Gagal memuat kelas: " + err.message, 'error');
        grid.innerHTML = `<div class="loading-state" style="color:red;">${escapeHtml(err.message)}</div>`;
    }
}

function renderEmptyState() {
    const grid = document.getElementById('private-grid');
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <p>Belum ada kelas private.</p>
            <small>Silakan buat kelas terlebih dahulu di menu Registrasi Private.</small>
            <button class="btn-create" onclick="window.dispatchModuleLoad('registrasi-private', 'Registrasi Private', 'Master Data')">
                <i class="fas fa-plus"></i> Buat Kelas Sekarang
            </button>
        </div>
    `;
}

function renderCards(classes, container) {
    // Array kelas warna untuk rotasi
    const colors = ['bg-blue', 'bg-orange', 'bg-green', 'bg-purple'];
    // Array ikon untuk variasi
    const icons = ['fa-robot', 'fa-microchip', 'fa-cogs', 'fa-gamepad'];

    container.innerHTML = classes.map((c, index) => {
        // Tentukan warna berdasarkan urutan (Modulus 4)
        const colorClass = colors[index % colors.length];
        const iconClass = icons[index % icons.length];
        const levelKode = c.levels?.kode || 'No Level';
        // Escape semua nilai dari DB untuk cegah XSS
        const cid = escapeHtmlAttr(c.id);
        const cname = escapeHtmlAttr(c.name || '');
        const lid = escapeHtmlAttr(c.level_id || '');
        const lkode = escapeHtmlAttr(levelKode);
        const cnameDisplay = escapeHtml(c.name || '');

        return `
            <div class="color-card ${colorClass}" data-cid="${cid}" data-cname="${cname}" data-lid="${lid}" data-lkode="${lkode}">
                <div class="card-header-row">
                    <i class="fas ${iconClass} card-icon"></i>
                    <div class="card-student-count" data-cid="${cid}"><i class="fas fa-spinner fa-spin fa-xs"></i></div>
                    <i class="fas fa-chevron-down card-chevron" style="color:rgba(255,255,255,0.7); font-size:0.9rem;"></i>
                </div>
                <div class="card-title">${cnameDisplay}</div>
                <span class="card-level">${escapeHtml(levelKode)}</span>
                <!-- Expandable Student Preview -->
                <div class="student-preview" data-cid="${cid}" style="display:none;"></div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 4. ACTION DISPATCHER
// ==========================================

window.dispatchPrivateMonitoring = (classId, className, levelId, levelKode) => {
    // 1. Bersihkan storage lama agar data fresh
    localStorage.removeItem("activePrivateClassId");
    localStorage.removeItem("activeLevelId");
    localStorage.removeItem("activeLevelKode");
    localStorage.removeItem("activePrivateClassName");
    localStorage.removeItem("activeClassName"); // legacy key, bersihkan juga

    // 2. Simpan Context Baru (kunci sudah konsisten dengan monitoring-private.js)
    localStorage.setItem("activePrivateClassId", classId);
    localStorage.setItem("activeLevelId", levelId);
    localStorage.setItem("activeLevelKode", levelKode);
    localStorage.setItem("activePrivateClassName", className);

    // 3. Navigasi ke Modul Monitoring
    if (window.dispatchModuleLoad) {
        window.dispatchModuleLoad('monitoring-private', 'Monitoring', className);
    } else {
        showToast("Modul 'monitoring-private' belum siap atau fungsi navigasi error.", 'error');
    }
};

// --- UTILITIES ---

// Escape HTML untuk injection konten teks (cegah XSS)
function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, ch => {
                const NAMES = { 38: 'amp', 60: 'lt', 62: 'gt', 34: 'quot', 39: '39' };
        return '&' + (NAMES[ch.charCodeAt(0)] || 'amp') + ';';
    });
}

// Escape untuk nilai atribut (sama dengan text, tapi juga aman untuk single/double quotes)
function escapeHtmlAttr(text) {
    return escapeHtml(text);
}

// Toast notification (mengganti alert native)
function showToast(msg, type = 'success') {
    const container = document.getElementById('ap-toast-container');
    if (!container) return console.warn(msg);
    const el = document.createElement('div');
    el.className = 'ap-toast' + (type === 'error' ? ' error' : '');
    el.innerHTML = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}