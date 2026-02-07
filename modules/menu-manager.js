/**
 * Project: Robopanda Navigator (Admin Panel)
 * File: modules/menu-manager.js
 * Version: 2.5 - Deep UI (Role + Level Stack + Anti-Bug Header)
 * Format: Plain Text (Huawei T10s Anti-Crash Optimization)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. GLOBAL STATE ---
let allMenus = [];
let allCategories = [];
let allLevels = [];

const iconLibrary = [
    "fa-solid fa-house", "fa-solid fa-gauge", "fa-solid fa-school", "fa-solid fa-graduation-cap", 
    "fa-solid fa-chalkboard-user", "fa-solid fa-users", "fa-solid fa-calendar-days", 
    "fa-solid fa-images", "fa-solid fa-medal", "fa-solid fa-gear", "fa-solid fa-lock", 
    "fa-solid fa-robot", "fa-solid fa-shield-halved", "fa-solid fa-file-lines", "fa-solid fa-rocket"
];

// ==========================================
// 2. INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="mm-master-wrapper fade-in">
            <div class="mm-main-header">
                <div class="header-content">
                    <div class="brand">
                        <div class="brand-logo"><i class="fa-solid fa-sliders"></i></div>
                        <div class="brand-text">
                            <h1>Navigator Control</h1>
                            <p>Manajemen Izin Akses & Struktur Modul</p>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button class="btn-fun-outline touch-48" id="btn-cat-mgr" title="Kategori">
                            <i class="fa-solid fa-layer-group"></i>
                        </button>
                        <button class="btn-fun-primary touch-48" id="btn-add-menu">
                            <i class="fa-solid fa-plus"></i> <span>Menu Baru</span>
                        </button>
                    </div>
                </div>
                <div id="quick-jump-bar" class="quick-jump-bar hide-scrollbar"></div>
            </div>

            <div id="mm-render-area" class="mm-render-area">
                <div class="loader-box">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                    <p>Sinkronisasi Protokol...</p>
                </div>
            </div>
        </div>

        <div id="modal-menu" class="mm-modal-overlay">
            <div class="mm-modal-card bounce-in">
                <div class="modal-head-fun">
                    <div class="modal-head-info">
                        <i class="fa-solid fa-pen-to-square"></i>
                        <h3 id="menu-modal-title">Konfigurasi Modul</h3>
                    </div>
                    <span class="close-fun touch-48" onclick="window.closeModal('modal-menu')">&times;</span>
                </div>
                <div class="modal-body-fun">
                    <form id="form-menu-master">
                        <input type="hidden" id="menu-id">
                        
                        <div class="form-row-compact">
                            <div class="fun-input-group flex-2">
                                <label>Label Navigasi</label>
                                <input type="text" id="menu-title" class="input-fun" placeholder="Cth: Galeri" required>
                            </div>
                            <div class="fun-input-group flex-1">
                                <label>Urutan</label>
                                <input type="number" id="menu-order" class="input-fun" value="0">
                            </div>
                        </div>

                        <div class="fun-input-group">
                            <label>File Route (JS Module)</label>
                            <input type="text" id="menu-route" class="input-fun" placeholder="Cth: gallery-module" required>
                        </div>

                        <div class="form-row-compact">
                            <div class="fun-input-group flex-1">
                                <label>Kategori</label>
                                <select id="menu-category" class="select-fun"></select>
                            </div>
                            <div class="fun-input-group flex-1">
                                <label>Visual Ikon</label>
                                <div class="icon-picker-trigger" id="btn-icon-gallery">
                                    <div id="icon-preview-box" class="icon-mini-box"><i class="fa-solid fa-circle"></i></div>
                                    <input type="text" id="menu-icon" class="input-readonly" readonly>
                                </div>
                            </div>
                        </div>

                        <div class="security-config-box">
                            <div class="sec-column">
                                <label class="sec-label"><i class="fa-solid fa-user-shield"></i> Izin Peran (Role)</label>
                                <div id="role-checks-fun" class="checks-grid-compact"></div>
                            </div>
                            <div class="sec-column">
                                <label class="sec-label"><i class="fa-solid fa-graduation-cap"></i> Izin Level (Education)</label>
                                <div id="level-checks-fun" class="checks-grid-compact"></div>
                            </div>
                        </div>

                        <div class="footer-row-compact">
                            <div class="status-wrap">
                                <span>Aktif</span>
                                <label class="switch-fun">
                                    <input type="checkbox" id="menu-active" checked>
                                    <span class="slider-fun round"></span>
                                </label>
                            </div>
                            <button type="button" id="btn-save-menu-master" class="btn-fun-submit">💾 Update Navigasi</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div id="modal-cat" class="mm-modal-overlay">
            <div class="modal-card mini bounce-in">
                <div class="modal-head-fun"><h3>Kategori Menu</h3><span class="close-fun" onclick="window.closeModal('modal-cat')">&times;</span></div>
                <div class="modal-body-fun">
                    <div class="cat-form-box">
                        <input type="text" id="cat-title" placeholder="Nama Kategori" class="input-fun">
                        <input type="text" id="cat-key" placeholder="Key (Unik)" class="input-fun">
                        <button id="btn-save-cat" class="btn-fun-submit" style="width:100%">Tambah</button>
                    </div>
                    <div id="cat-list-items" class="cat-list-fun"></div>
                </div>
            </div>
        </div>

        <div id="modal-icons" class="mm-modal-overlay">
            <div class="modal-card bounce-in wider">
                <div class="modal-head-fun"><h3>Galeri Ikon</h3><span class="close-fun" onclick="window.closeModal('modal-icons')">&times;</span></div>
                <div class="modal-body-fun">
                    <input type="text" id="search-icon" placeholder="Cari ikon..." class="input-fun" style="margin-bottom:15px">
                    <div id="icon-grid-render" class="icon-grid-fun-compact"></div>
                </div>
            </div>
        </div>
    `;

    bindEvents();
    await loadInitialData();
}

// ==========================================
// 3. DATA FETCHING
// ==========================================
async function loadInitialData() {
    try {
        const [resMenu, resCat, resLvl] = await Promise.all([
            supabase.from('app_menus').select('*').order('order_index'),
            supabase.from('menu_categories').select('*').order('order_index'),
            supabase.from('levels').select('id, kode').order('kode')
        ]);

        allMenus = resMenu.data || [];
        allCategories = resCat.data || [];
        allLevels = resLvl.data || [];

        renderMainUI();
        renderQuickJump();
        populateCategorySelect();
    } catch (err) { console.error("Data Load Error:", err); }
}

function renderQuickJump() {
    const bar = document.getElementById('quick-jump-bar');
    bar.innerHTML = allCategories.map(c => `<a href="#cat-${c.id}" class="jump-tab">${c.title}</a>`).join('');
}

// ==========================================
// 4. RENDER UI (FIXED HEADER & BADGES)
// ==========================================
function renderMainUI() {
    const area = document.getElementById('mm-render-area');
    area.innerHTML = '';

    allCategories.forEach(cat => {
        const menus = allMenus.filter(m => m.category === cat.id);
        
        const section = document.createElement('section');
        section.id = `cat-${cat.id}`;
        section.className = 'category-section';
        
        // FIX: Selalu render header kategori hitam untuk semua (termasuk Administrator)
        section.innerHTML = `
            <div class="cat-header-black">
                <i class="fa-solid fa-folder-open"></i> ${cat.title} 
                <span class="modul-count">${menus.length} Modul</span>
            </div>
            <div class="menu-tablet-grid">
                ${menus.length ? menus.map(m => renderMenuCard(m)).join('') : '<div class="empty-notif">Kategori ini belum memiliki menu.</div>'}
            </div>
        `;
        area.appendChild(section);
    });
}

function renderMenuCard(menu) {
    // 1. Role Badges (Including GUEST)
    const roles = (menu.allowed_roles || []).map(r => `<span class="pill-role ${r}">${r.slice(0,1).toUpperCase()}</span>`).join('');
    
    // 2. Level Badges (Deep UI Integration)
    const levels = (menu.allowed_level_ids || []).map(id => {
        const l = allLevels.find(lvl => lvl.id === id);
        return l ? `<span class="pill-level">${l.kode}</span>` : '';
    }).join('');

    return `
        <div class="menu-tablet-card ${menu.is_active ? '' : 'is-inactive'}">
            <div class="card-visual"><i class="${menu.icon_class}"></i></div>
            <div class="card-info">
                <h4>${menu.title}</h4>
                <div class="badge-stack">
                    <div class="role-group">${roles}</div>
                    <div class="level-group">${levels}</div>
                </div>
            </div>
            <div class="card-ops">
                <button class="btn-op edit" onclick="window.editMenu('${menu.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-op del" onclick="window.deleteMenu('${menu.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `;
}

// ==========================================
// 5. CORE ACTIONS
// ==========================================
window.editMenu = (id) => {
    const menu = allMenus.find(m => m.id === id);
    const form = document.getElementById('form-menu-master');
    const roleContainer = document.getElementById('role-checks-fun');
    const levelContainer = document.getElementById('level-checks-fun');

    form.reset();
    document.getElementById('menu-id').value = menu?.id || '';

    // ROLE LIST (Super, PIC, Teacher, Student, Guest)
    const roleList = ['super_admin', 'pic', 'teacher', 'student', 'guest'];
    roleContainer.innerHTML = roleList.map(r => `
        <label class="check-box-item">
            <input type="checkbox" name="roles" value="${r}" ${menu?.allowed_roles?.includes(r) ? 'checked' : ''}>
            <span>${r.replace('_', ' ').toUpperCase()}</span>
        </label>
    `).join('');

    // LEVEL LIST (Kiddy, Beginner, etc)
    levelContainer.innerHTML = allLevels.map(lvl => `
        <label class="check-box-item">
            <input type="checkbox" name="levels" value="${lvl.id}" ${menu?.allowed_level_ids?.includes(lvl.id) ? 'checked' : ''}>
            <span>${lvl.kode}</span>
        </label>
    `).join('');

    if (menu) {
        document.getElementById('menu-title').value = menu.title;
        document.getElementById('menu-route').value = menu.route;
        document.getElementById('menu-category').value = menu.category;
        document.getElementById('menu-icon').value = menu.icon_class;
        document.getElementById('menu-order').value = menu.order_index;
        document.getElementById('menu-active').checked = menu.is_active;
        document.getElementById('icon-preview-box').innerHTML = `<i class="${menu.icon_class}"></i>`;
    }

    document.getElementById('modal-menu').style.display = 'flex';
};

async function saveMenu() {
    const id = document.getElementById('menu-id').value;
    const roles = Array.from(document.querySelectorAll('input[name="roles"]:checked')).map(cb => cb.value);
    const levels = Array.from(document.querySelectorAll('input[name="levels"]:checked')).map(cb => cb.value);

    const payload = {
        title: document.getElementById('menu-title').value,
        route: document.getElementById('menu-route').value,
        category: document.getElementById('menu-category').value,
        icon_class: document.getElementById('menu-icon').value || 'fa-solid fa-circle',
        order_index: parseInt(document.getElementById('menu-order').value),
        is_active: document.getElementById('menu-active').checked,
        allowed_roles: roles,
        allowed_level_ids: levels
    };

    if (id) await supabase.from('app_menus').update(payload).eq('id', id);
    else await supabase.from('app_menus').insert(payload);

    window.closeModal('modal-menu');
    await loadInitialData();
}

// ==========================================
// 6. STYLING (OPTIMIZED TABLET REFORM)
// ==========================================
function injectStyles() {
    if (document.getElementById('mm-deep-ui-css')) return;
    const s = document.createElement('style');
    s.id = 'mm-deep-ui-css';
    s.textContent = `
        /* BASE LAYOUT */
        .mm-master-wrapper { background: #f1f5f9; min-height: 100vh; padding-top: 140px; font-family: 'Poppins', sans-serif; }
        .mm-main-header { position: fixed; top: 0; left: 0; width: 100%; background: white; z-index: 1000; border-bottom: 1px solid #e2e8f0; }
        .header-content { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-logo { width: 42px; height: 42px; background: #4d97ff; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .brand-text h1 { font-size: 1rem; margin: 0; color: #1e293b; font-weight: 800; }
        .brand-text p { font-size: 0.7rem; margin: 0; color: #64748b; }
        
        .header-actions { display: flex; gap: 8px; }
        .btn-fun-primary { background: #4d97ff; color: white; border: none; padding: 0 18px; border-radius: 12px; font-weight: 800; box-shadow: 0 4px 12px rgba(77,151,255,0.3); }
        .btn-fun-outline { background: white; color: #4d97ff; border: 2px solid #4d97ff; border-radius: 12px; }
        
        .quick-jump-bar { display: flex; gap: 8px; padding: 0 20px 12px; overflow-x: auto; }
        .jump-tab { background: #e2e8f0; padding: 6px 16px; border-radius: 50px; font-size: 0.75rem; font-weight: 700; color: #475569; text-decoration: none; white-space: nowrap; border: 1px solid transparent; }

        /* CATEGORY SECTION */
        .mm-render-area { padding: 0 15px 50px; }
        .category-section { margin-bottom: 25px; scroll-margin-top: 150px; }
        
        /* FIX: Header Kategori ala Screenshot */
        .cat-header-black { display: flex; align-items: center; gap: 10px; background: #1e293b; color: white; padding: 8px 18px; border-radius: 50px; font-size: 0.8rem; font-weight: 800; margin-bottom: 12px; width: fit-content; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .modul-count { opacity: 0.6; font-size: 0.65rem; margin-left: 5px; }

        /* MENU GRID & CARD */
        .menu-tablet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
        @media (min-width: 900px) { .menu-tablet-grid { grid-template-columns: repeat(3, 1fr); } }
        
        .menu-tablet-card { background: white; border-radius: 16px; padding: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid #e2e8f0; transition: 0.2s; }
        .menu-tablet-card.is-inactive { opacity: 0.5; filter: grayscale(1); }
        .card-visual { width: 48px; height: 48px; background: #f0f7ff; color: #4d97ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .card-info { flex: 1; min-width: 0; }
        .card-info h4 { margin: 0 0 4px; font-size: 0.85rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        /* BADGE STACK (Role + Level) */
        .badge-stack { display: flex; flex-direction: column; gap: 4px; }
        .role-group, .level-group { display: flex; gap: 3px; flex-wrap: wrap; }
        
        .pill-role { font-size: 0.55rem; width: 16px; height: 16px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; }
        .pill-role.super_admin { background: #ef4444; } .pill-role.pic { background: #4d97ff; } 
        .pill-role.teacher { background: #10b981; } .pill-role.student { background: #94a3b8; }
        .pill-role.guest { background: #ffab19; }
        
        .pill-level { background: #f1f5f9; color: #475569; font-size: 0.55rem; padding: 1px 5px; border-radius: 3px; font-weight: 800; border: 1px solid #e2e8f0; }

        .btn-op { width: 38px; height: 38px; border: none; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .btn-op.edit { background: #f0f7ff; color: #4d97ff; }
        .btn-op.del { background: #fff1f2; color: #ef4444; }

        /* MODAL */
        .mm-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 15px; }
        .mm-modal-card { background: white; width: 680px; max-width: 100%; border-radius: 20px; padding: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 95vh; overflow-y: auto; }
        .modal-head-fun { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .modal-head-info h3 { margin: 0; font-weight: 800; font-size: 1.1rem; }
        
        .form-row-compact { display: flex; gap: 12px; margin-bottom: 12px; }
        .fun-input-group label { display: block; font-size: 0.7rem; font-weight: 800; color: #64748b; margin-bottom: 5px; text-transform: uppercase; }
        .input-fun, .select-fun { width: 100%; height: 42px; border: 2px solid #f1f5f9; border-radius: 10px; padding: 0 12px; font-size: 0.9rem; }
        
        /* SECURITY GRID (2 COL) */
        .security-config-box { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; background: #fdfdfd; padding: 12px; border: 1px solid #f1f5f9; border-radius: 15px; }
        .sec-label { display: block; font-size: 0.75rem; font-weight: 800; margin-bottom: 10px; }
        .checks-grid-compact { display: grid; grid-template-columns: 1fr; gap: 6px; }
        .check-box-item { background: white; border: 1px solid #e2e8f0; padding: 8px; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
        .check-box-item input { width: 16px; height: 16px; }

        .btn-fun-submit { background: #10b981; color: white; height: 48px; border: none; border-radius: 12px; font-weight: 800; flex: 1; cursor: pointer; box-shadow: 0 4px 10px rgba(16,185,129,0.3); }
        .touch-48 { min-height: 48px; min-width: 48px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .fade-in { animation: fadeIn 0.4s ease; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(s);
}

// ==========================================
// 7. EVENT BINDING & OTHERS
// ==========================================
function bindEvents() {
    document.getElementById('btn-add-menu').onclick = () => window.editMenu(null);
    document.getElementById('btn-save-menu-master').onclick = saveMenu;
    document.getElementById('btn-cat-mgr').onclick = () => { renderCatList(); document.getElementById('modal-cat').style.display = 'flex'; };
    document.getElementById('btn-icon-gallery').onclick = () => { renderIconGrid(); document.getElementById('modal-icons').style.display = 'flex'; };
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.deleteMenu = async (id) => {
    if (confirm("⚠️ Hapus permanen menu ini?")) {
        await supabase.from('app_menus').delete().eq('id', id);
        await loadInitialData();
    }
};

function populateCategorySelect() {
    const sel = document.getElementById('menu-category');
    sel.innerHTML = '<option value="">-- Pilih Kategori --</option>' + 
        allCategories.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
}

function renderIconGrid(filter = '') {
    const grid = document.getElementById('icon-grid-render');
    grid.innerHTML = iconLibrary.map(icon => `<div class="icon-item-fun-mini" onclick="window.selectIcon('${icon}')"><i class="${icon}"></i></div>`).join('');
}

window.selectIcon = (icon) => {
    document.getElementById('menu-icon').value = icon;
    document.getElementById('icon-preview-box').innerHTML = `<i class="${icon}"></i>`;
    window.closeModal('modal-icons');
};

async function renderCatList() {
    const box = document.getElementById('cat-list-items');
    box.innerHTML = allCategories.map(c => `
        <div class="cat-fun-item-compact">
            <span><strong>${c.title}</strong></span>
            <button onclick="window.deleteCategory('${c.id}')" class="btn-op del"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');
}