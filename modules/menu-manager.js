/**
 * Project: Robopanda Navigator (Admin Panel)
 * File: modules/menu-manager.js
 * Version: 5.3 - Navigation Fix (Back Button & Breadcrumb)
 * Status: Final Stable
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. GLOBAL STATE & ASSETS ---
let allMenus = [];
let allCategories = [];
let allLevels = [];

const iconLibrary = [
    "fa-solid fa-house", "fa-solid fa-gauge", "fa-solid fa-school", "fa-solid fa-graduation-cap", 
    "fa-solid fa-chalkboard-user", "fa-solid fa-users", "fa-solid fa-calendar-days", 
    "fa-solid fa-images", "fa-solid fa-medal", "fa-solid fa-gear", "fa-solid fa-lock", 
    "fa-solid fa-robot", "fa-solid fa-shield-halved", "fa-solid fa-file-lines", "fa-solid fa-rocket",
    "fa-solid fa-key", "fa-solid fa-calendar-check", "fa-solid fa-clipboard-user", "fa-solid fa-laptop-code",
    "fa-solid fa-user-plus", "fa-solid fa-money-bill-wave", "fa-solid fa-chart-line"
];

// --- 2. HELPER FUNCTIONS ---

function safeParseArray(data) {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return [];
}

function showToast(msg, type = 'success') {
    let box = document.getElementById('toast-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toast-box';
        document.body.appendChild(box);
    }
    
    const el = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.innerHTML = type === 'success' 
        ? `<i class="fa-solid fa-circle-check"></i> ${msg}` 
        : `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
    
    box.appendChild(el);
    setTimeout(() => { 
        el.style.opacity = '0'; 
        setTimeout(() => el.remove(), 300); 
    }, 3000);
}

// ==========================================
// 3. CORE INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles(); 

    canvas.innerHTML = `
        <div class="mm-wrapper fade-in">
            <div class="mm-header">
                <div class="header-left">
                    <button class="btn-back" id="btn-back-dash" title="Kembali ke Dashboard">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>

                    <div class="logo-box"><i class="fa-solid fa-sliders"></i></div>
                    <div>
                        <h2 class="page-title">Menu Manager</h2>
                        <div class="page-breadcrumb">
                            <span style="opacity:0.6">Home</span> 
                            <i class="fa-solid fa-chevron-right" style="font-size:0.6rem; opacity:0.4; margin:0 4px;"></i>
                            <span style="opacity:0.6">Tools</span>
                            <i class="fa-solid fa-chevron-right" style="font-size:0.6rem; opacity:0.4; margin:0 4px;"></i>
                            <span>Settings</span>
                        </div>
                    </div>
                </div>
                <div class="header-right">
                    <button class="btn-secondary" id="btn-cat-mgr">
                        <i class="fa-solid fa-layer-group"></i> Kategori
                    </button>
                    <button class="btn-primary" id="btn-add-menu">
                        <i class="fa-solid fa-plus"></i> Menu Baru
                    </button>
                </div>
            </div>

            <div id="mm-content" class="mm-content">
                <div class="loading-state">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Memuat Data...
                </div>
            </div>
        </div>

        <div id="modal-menu" class="mm-modal-backdrop" style="display:none;">
            <div class="mm-modal-card">
                <div class="modal-header">
                    <h3>Konfigurasi Menu</h3>
                    <button class="btn-close" onclick="window.closeModal('modal-menu')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-menu">
                        <input type="hidden" id="menu-id">
                        
                        <div class="form-row">
                            <div class="form-group flex-2">
                                <label>Label Menu</label>
                                <input type="text" id="menu-title" class="input-field" placeholder="Contoh: Galeri" required>
                            </div>
                            <div class="form-group flex-1">
                                <label>Urutan</label>
                                <input type="number" id="menu-order" class="input-field" value="0">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>File Route (Modules)</label>
                            <input type="text" id="menu-route" class="input-field" placeholder="contoh: gallery-module" required>
                            <small class="hint">Nama file tanpa .js di folder modules</small>
                        </div>

                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label>Kategori</label>
                                <select id="menu-category" class="input-field select"></select>
                            </div>
                            <div class="form-group flex-1">
                                <label>Ikon</label>
                                <div class="icon-selector" id="btn-icon-trigger">
                                    <div id="icon-preview" class="icon-box-small"><i class="fa-solid fa-cube"></i></div>
                                    <span id="icon-name">Pilih Ikon...</span>
                                    <input type="hidden" id="menu-icon">
                                </div>
                            </div>
                        </div>

                        <hr class="divider">

                        <div class="chips-group">
                            <label class="group-label"><i class="fa-solid fa-shield-halved"></i> Izin Akses (Role)</label>
                            <div id="role-chips" class="chips-container"></div>
                        </div>

                        <div class="chips-group">
                            <label class="group-label"><i class="fa-solid fa-graduation-cap"></i> Level Khusus (Opsional)</label>
                            <div id="level-chips" class="chips-container"></div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <div class="switch-wrapper">
                        <input type="checkbox" id="menu-active" class="toggle-input" checked>
                        <label for="menu-active" class="toggle-label">Status Aktif</label>
                    </div>
                    <button id="btn-save-menu" class="btn-primary full-width">Simpan Perubahan</button>
                </div>
            </div>
        </div>

        <div id="modal-cat" class="mm-modal-backdrop" style="display:none;">
            <div class="mm-modal-card small">
                <div class="modal-header">
                    <h3>Kelola Kategori</h3>
                    <button class="btn-close" onclick="window.closeModal('modal-cat')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="cat-form-box">
                        <input type="hidden" id="cat-id-edit">
                        <div class="form-group">
                            <label>Nama Kategori</label>
                            <input type="text" id="cat-title" class="input-field" placeholder="Nama...">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Key ID</label>
                                <input type="text" id="cat-key" class="input-field" placeholder="key_unik">
                            </div>
                            <div class="form-group">
                                <label>Urut</label>
                                <input type="number" id="cat-order" class="input-field" value="99">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Target Aplikasi</label>
                            <select id="cat-target" class="input-field select">
                                <option value="admin_v2">Admin V2 (Dashboard)</option>
                                <option value="public">Public (Homepage)</option>
                                <option value="admin">Legacy (V1)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                            <div class="switch-wrapper">
                                <input type="checkbox" id="cat-active" class="toggle-input" checked>
                                <label for="cat-active" class="toggle-label">Tampilkan Kategori Ini?</label>
                            </div>
                        </div>

                        <div class="cat-actions">
                            <button id="btn-reset-cat" class="btn-secondary small">Batal</button>
                            <button id="btn-save-cat" class="btn-primary small">Simpan/Update</button>
                        </div>
                    </div>
                    
                    <div class="cat-list-header">Daftar Kategori</div>
                    <div id="cat-list-render" class="cat-list-scroll"></div>
                </div>
            </div>
        </div>

        <div id="modal-icons" class="mm-modal-backdrop" style="display:none;">
            <div class="mm-modal-card">
                <div class="modal-header">
                    <h3>Galeri Ikon</h3>
                    <button class="btn-close" onclick="window.closeModal('modal-icons')">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="icon-grid" class="icon-grid"></div>
                </div>
            </div>
        </div>
    `;

    bindEvents();
    await loadData();
}

// ==========================================
// 4. DATA LOGIC & RENDERING
// ==========================================
async function loadData() {
    try {
        const [resMenu, resCat, resLvl] = await Promise.all([
            supabase.from('app_menus').select('*').order('order_index'),
            supabase.from('menu_categories').select('*').order('order_index'),
            supabase.from('levels').select('id, kode').order('kode')
        ]);

        allMenus = resMenu.data || [];
        allCategories = resCat.data || [];
        allLevels = resLvl.data || [];

        renderContent();
        populateCategoryDropdown();
    } catch (err) {
        console.error(err);
        showToast("Gagal memuat data", "error");
    }
}

function renderContent() {
    const area = document.getElementById('mm-content');
    area.innerHTML = '';

    const sortedCats = allCategories.sort((a, b) => {
        const order = ['admin_v2', 'public', 'admin'];
        return order.indexOf(a.target_app) - order.indexOf(b.target_app) || a.order_index - b.order_index;
    });

    sortedCats.forEach(cat => {
        const menus = allMenus.filter(m => m.category === cat.id);
        
        let badgeClass = 'badge-gray';
        if (cat.target_app === 'admin_v2') badgeClass = 'badge-blue';
        if (cat.target_app === 'public') badgeClass = 'badge-green';

        const isInactive = cat.is_active === false; 
        const opacityStyle = isInactive ? 'opacity: 0.5; filter: grayscale(1);' : '';
        const inactiveLabel = isInactive ? '<span style="color:red; font-size:0.7rem; font-weight:bold; margin-left:5px;">[NON-AKTIF]</span>' : '';

        const wrapper = document.createElement('div');
        wrapper.className = 'category-block';
        wrapper.style = opacityStyle; 
        
        wrapper.innerHTML = `
            <div class="cat-header">
                <span class="cat-badge ${badgeClass}">${cat.target_app}</span>
                <span class="cat-title">${cat.title} ${inactiveLabel}</span>
                <span class="count-badge">${menus.length}</span>
            </div>
            <div class="menu-grid">
                ${menus.length ? menus.map(m => createMenuCard(m)).join('') : '<div class="empty-msg">Belum ada menu</div>'}
            </div>
        `;
        area.appendChild(wrapper);
    });
}

function createMenuCard(menu) {
    const roles = safeParseArray(menu.allowed_roles);
    const levelIds = safeParseArray(menu.allowed_level_ids);
    const levels = levelIds.map(id => {
        const l = allLevels.find(x => x.id === id);
        return l ? l.kode : null;
    }).filter(Boolean);

    return `
        <div class="menu-card ${menu.is_active ? '' : 'inactive'}">
            <div class="mc-icon"><i class="${menu.icon_class}"></i></div>
            <div class="mc-content">
                <strong>${menu.title}</strong>
                <div class="mc-meta">
                    ${roles.slice(0, 3).map(r => `<span class="badge-role">${r.slice(0,1).toUpperCase()}</span>`).join('')}
                    ${(roles.length > 0 && levels.length > 0) ? '<span style="color:#cbd5e1">|</span>' : ''}
                    ${levels.slice(0, 2).map(l => `<span class="badge-level">${l}</span>`).join('')}
                </div>
            </div>
            <div class="mc-actions">
                <button onclick="window.editMenu('${menu.id}')" class="btn-icon edit"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.deleteMenu('${menu.id}')" class="btn-icon del"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `;
}

// ==========================================
// 5. ACTIONS & EVENTS
// ==========================================
window.toggleChip = (el) => {
    if (el.classList.contains('active')) el.classList.remove('active');
    else el.classList.add('active');
};

function bindEvents() {
    // Tombol Kembali ke Dashboard (NEW)
    const btnBack = document.getElementById('btn-back-dash');
    if (btnBack) {
        btnBack.onclick = () => {
            // Panggil fungsi global loadAdminModule (dari main.js) jika ada
            if (window.loadAdminModule) {
                window.loadAdminModule('overview', 'Dashboard', 'Home');
            } else {
                // Fallback jika tidak ada fungsi global (reload ke root)
                window.location.reload(); 
            }
        };
    }

    document.getElementById('btn-add-menu').onclick = () => window.editMenu(null);
    document.getElementById('btn-save-menu').onclick = saveMenu;
    
    document.getElementById('btn-cat-mgr').onclick = () => {
        resetCatForm();
        renderCatList();
        document.getElementById('modal-cat').style.display = 'flex';
    };
    document.getElementById('btn-save-cat').onclick = saveCat;
    document.getElementById('btn-reset-cat').onclick = resetCatForm;

    document.getElementById('btn-icon-trigger').onclick = () => {
        const grid = document.getElementById('icon-grid');
        grid.innerHTML = iconLibrary.map(i => `<div class="icon-option" onclick="window.selectIcon('${i}')"><i class="${i}"></i></div>`).join('');
        document.getElementById('modal-icons').style.display = 'flex';
    };
}

// ... (CRUD Functions sama seperti V5.2 - tidak berubah) ...
window.editMenu = (id) => {
    const menu = allMenus.find(m => m.id === id);
    const form = document.getElementById('form-menu');
    const roleBox = document.getElementById('role-chips');
    const levelBox = document.getElementById('level-chips');
    form.reset();
    document.getElementById('menu-id').value = menu?.id || '';
    const currentRoles = menu ? safeParseArray(menu.allowed_roles) : [];
    const currentLevels = menu ? safeParseArray(menu.allowed_level_ids) : [];
    roleBox.innerHTML = ['super_admin', 'pic', 'teacher', 'student', 'guest'].map(r => `
        <div class="chip ${currentRoles.includes(r) ? 'active' : ''}" onclick="window.toggleChip(this)" data-val="${r}">${r.replace('_', ' ').toUpperCase()}</div>`).join('');
    levelBox.innerHTML = allLevels.map(l => `
        <div class="chip ${currentLevels.includes(l.id) ? 'active' : ''}" onclick="window.toggleChip(this)" data-val="${l.id}">${l.kode}</div>`).join('');
    if (menu) {
        document.getElementById('menu-title').value = menu.title;
        document.getElementById('menu-route').value = menu.route;
        document.getElementById('menu-category').value = menu.category;
        document.getElementById('menu-order').value = menu.order_index;
        document.getElementById('menu-active').checked = menu.is_active;
        document.getElementById('menu-icon').value = menu.icon_class;
        document.getElementById('icon-preview').innerHTML = `<i class="${menu.icon_class}"></i>`;
        document.getElementById('icon-name').textContent = menu.icon_class;
    }
    document.getElementById('modal-menu').style.display = 'flex';
};

async function saveMenu() {
    const id = document.getElementById('menu-id').value;
    const activeRoles = Array.from(document.querySelectorAll('#role-chips .chip.active')).map(e => e.dataset.val);
    const activeLevels = Array.from(document.querySelectorAll('#level-chips .chip.active')).map(e => e.dataset.val);
    const payload = {
        title: document.getElementById('menu-title').value,
        route: document.getElementById('menu-route').value,
        category: document.getElementById('menu-category').value,
        icon_class: document.getElementById('menu-icon').value || 'fa-solid fa-circle',
        order_index: parseInt(document.getElementById('menu-order').value) || 0,
        is_active: document.getElementById('menu-active').checked,
        allowed_roles: activeRoles,
        allowed_level_ids: activeLevels
    };
    if (id) await supabase.from('app_menus').update(payload).eq('id', id);
    else await supabase.from('app_menus').insert(payload);
    showToast("Menu berhasil disimpan");
    window.closeModal('modal-menu');
    await loadData();
}

window.deleteMenu = async (id) => {
    if (confirm("Hapus permanen menu ini?")) {
        await supabase.from('app_menus').delete().eq('id', id);
        showToast("Menu dihapus");
        await loadData();
    }
};

async function renderCatList() {
    const box = document.getElementById('cat-list-render');
    box.innerHTML = allCategories.map(c => `
        <div class="cat-list-item">
            <div>
                <strong>${c.title}</strong>
                <span class="micro-badge">${c.target_app}</span>
                ${c.is_active === false ? '<span style="color:red; font-size:0.7rem; font-weight:bold;">[OFF]</span>' : '<span style="color:green; font-size:0.7rem; font-weight:bold;">[ON]</span>'}
            </div>
            <div>
                <button onclick="window.editCat('${c.id}')" class="btn-icon blue"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.deleteCat('${c.id}')" class="btn-icon red"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editCat = (id) => {
    const cat = allCategories.find(c => c.id === id);
    document.getElementById('cat-id-edit').value = cat.id;
    document.getElementById('cat-title').value = cat.title;
    document.getElementById('cat-key').value = cat.category_key;
    document.getElementById('cat-order').value = cat.order_index;
    document.getElementById('cat-target').value = cat.target_app || 'admin_v2';
    document.getElementById('cat-active').checked = (cat.is_active !== false);
    document.getElementById('btn-save-cat').textContent = "Update";
};

async function saveCat() {
    const id = document.getElementById('cat-id-edit').value;
    const title = document.getElementById('cat-title').value;
    if(!title) return showToast("Nama Kategori wajib diisi", "error");
    const payload = {
        title: title,
        category_key: document.getElementById('cat-key').value,
        order_index: document.getElementById('cat-order').value,
        target_app: document.getElementById('cat-target').value,
        is_active: document.getElementById('cat-active').checked
    };
    if (id) await supabase.from('menu_categories').update(payload).eq('id', id);
    else await supabase.from('menu_categories').insert(payload);
    resetCatForm();
    showToast("Kategori disimpan");
    renderCatList();
    await loadData();
}

window.deleteCat = async (id) => {
    if (confirm("Hapus kategori ini?")) {
        const hasChild = allMenus.some(m => m.category === id);
        if(hasChild) return showToast("Gagal: Kategori masih memiliki menu!", "error");
        await supabase.from('menu_categories').delete().eq('id', id);
        renderCatList();
        await loadData();
    }
};

function resetCatForm() {
    document.getElementById('cat-id-edit').value = '';
    document.getElementById('cat-title').value = '';
    document.getElementById('cat-key').value = '';
    document.getElementById('cat-active').checked = true;
    document.getElementById('btn-save-cat').textContent = "Simpan";
}

function populateCategoryDropdown() {
    const sel = document.getElementById('menu-category');
    sel.innerHTML = '<option value="">-- Pilih Kategori --</option>' + 
        allCategories.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
}

window.selectIcon = (icon) => {
    document.getElementById('menu-icon').value = icon;
    document.getElementById('icon-preview').innerHTML = `<i class="${icon}"></i>`;
    document.getElementById('icon-name').textContent = icon;
    window.closeModal('modal-icons');
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

// ==========================================
// 6. CSS (STYLES) - WITH BACK BTN & BREADCRUMB
// ==========================================
function injectStyles() {
    if (document.getElementById('mm-styles-v5')) return;
    const s = document.createElement('style');
    s.id = 'mm-styles-v5';
    s.textContent = `
        /* RESET */
        .mm-wrapper { background: #f8fafc; min-height: 100vh; padding-top: 80px; font-family: sans-serif; }
        
        /* HEADER (NAVIGATION FIXED) */
        .mm-header { 
            position: fixed; top: 0; left: 0; width: 100%; height: 70px; 
            background: white; border-bottom: 1px solid #e2e8f0; z-index: 900;
            display: flex; justify-content: space-between; align-items: center; padding: 0 20px;
        }
        .header-left { display: flex; align-items: center; gap: 15px; }

        /* BACK BUTTON STYLE */
        .btn-back {
            background: #f1f5f9; border: none; width: 40px; height: 40px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: #64748b; font-size: 1.2rem; cursor: pointer; transition: 0.2s;
        }
        .btn-back:hover { background: #e2e8f0; color: #3b82f6; }

        .logo-box { width: 40px; height: 40px; background: #3b82f6; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .page-title { margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: bold; }
        
        /* BREADCRUMB */
        .page-breadcrumb { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; }

        .header-right { display: flex; gap: 8px; }

        /* ... (REST OF CSS SAME AS V5.2) ... */
        .btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 50px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary { background: white; color: #475569; border: 1px solid #cbd5e1; padding: 10px 15px; border-radius: 50px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-icon.edit { background: #f0f9ff; color: #0284c7; }
        .btn-icon.del { background: #fef2f2; color: #ef4444; }
        .btn-close { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }

        .mm-content { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .category-block { margin-bottom: 30px; animation: fadeIn 0.4s ease; transition: 0.3s; }
        .cat-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        .cat-badge { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
        .badge-blue { background: #3b82f6; } .badge-green { background: #10b981; } .badge-gray { background: #64748b; }
        .cat-title { font-size: 1.1rem; font-weight: bold; color: #1e293b; }
        
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
        
        .menu-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .menu-card.inactive { opacity: 0.5; background: #f1f5f9; }
        .mc-icon { width: 44px; height: 44px; background: #eff6ff; color: #3b82f6; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .mc-content { flex: 1; min-width: 0; }
        .mc-content strong { display: block; font-size: 0.95rem; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .mc-meta { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
        .badge-role { font-size: 0.6rem; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
        .badge-level { font-size: 0.6rem; background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; font-weight: 600; border: 1px solid #fde68a; }

        .mm-modal-backdrop { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 1000; 
            display: flex; align-items: center; justify-content: center; padding: 15px;
        }
        .mm-modal-card { background: white; width: 600px; max-width: 100%; border-radius: 16px; display: flex; flex-direction: column; max-height: 90vh; }
        .mm-modal-card.small { width: 400px; }
        
        .modal-header { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 20px; overflow-y: auto; flex: 1; }
        .modal-footer { padding: 15px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }

        .form-row { display: flex; gap: 15px; }
        .flex-1 { flex: 1; } .flex-2 { flex: 2; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-size: 0.8rem; font-weight: bold; color: #475569; margin-bottom: 5px; }
        .input-field { width: 100%; height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 1rem; box-sizing: border-box; }
        .input-field.select { background: white; }
        .hint { font-size: 0.75rem; color: #94a3b8; }

        .switch-wrapper { display: flex; align-items: center; gap: 10px; }
        .toggle-input { width: 20px; height: 20px; accent-color: #3b82f6; cursor: pointer; }
        .toggle-label { font-weight: bold; color: #334155; cursor: pointer; }

        .chips-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .chip { padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 50px; font-size: 0.8rem; color: #64748b; cursor: pointer; user-select: none; transition: 0.2s; }
        .chip.active { background: #3b82f6; color: white; border-color: #3b82f6; font-weight: bold; box-shadow: 0 2px 5px rgba(59,130,246,0.3); }

        .icon-selector { display: flex; align-items: center; gap: 10px; border: 1px solid #cbd5e1; padding: 5px; border-radius: 8px; cursor: pointer; }
        .icon-box-small { width: 30px; height: 30px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
        .icon-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        .icon-option { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 1.2rem; }
        .icon-option:hover { background: #eff6ff; color: #3b82f6; }

        .cat-list-scroll { max-height: 200px; overflow-y: auto; margin-top: 10px; border-top: 1px solid #e2e8f0; }
        .cat-list-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .micro-badge { font-size: 0.7rem; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; color: #64748b; margin-right: 5px; }

        #toast-box { position: fixed; bottom: 20px; right: 20px; z-index: 3000; display: flex; flex-direction: column; gap: 10px; }
        .toast-item { padding: 12px 20px; border-radius: 50px; color: white; font-weight: bold; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .toast-item.success { background: #10b981; }
        .toast-item.error { background: #ef4444; }

        @media (max-width: 600px) {
            .hide-mobile { display: none; }
            .form-row { flex-direction: column; gap: 0; }
            .mm-modal-card, .mm-modal-card.small { width: 100%; height: 100%; border-radius: 0; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(s);
}