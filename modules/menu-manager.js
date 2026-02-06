/**
 * Project: Menu Manager Module (Final Fixed)
 * Features: Full Category CRUD, Role Sync, Expanded Icons
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let allMenus = [];
let allCategories = [];
let editCategoryId = null;

// Library Ikon (50+ Ikon)
const iconLibrary = [
    "fa-solid fa-house", "fa-solid fa-gauge", "fa-solid fa-chart-line", "fa-solid fa-chart-pie", 
    "fa-solid fa-bullhorn", "fa-solid fa-bell", "fa-solid fa-magnifying-glass",
    "fa-solid fa-school", "fa-solid fa-graduation-cap", "fa-solid fa-chalkboard-user", 
    "fa-solid fa-book", "fa-solid fa-book-open", "fa-solid fa-pencil", "fa-solid fa-marker",
    "fa-solid fa-users", "fa-solid fa-user-graduate", "fa-solid fa-id-card",
    "fa-solid fa-calendar-days", "fa-solid fa-clock", "fa-solid fa-clipboard-list",
    "fa-solid fa-images", "fa-solid fa-camera", "fa-solid fa-video", "fa-solid fa-photo-film",
    "fa-solid fa-folder-open", "fa-solid fa-cloud-arrow-up",
    "fa-solid fa-file-invoice", "fa-solid fa-file-lines", "fa-solid fa-money-bill-wave", 
    "fa-solid fa-wallet", "fa-solid fa-calculator", "fa-solid fa-receipt",
    "fa-solid fa-star", "fa-solid fa-medal", "fa-solid fa-trophy",
    "fa-solid fa-gear", "fa-solid fa-gears", "fa-solid fa-sliders", "fa-solid fa-wrench",
    "fa-solid fa-lock", "fa-solid fa-key", "fa-solid fa-user-shield", "fa-solid fa-database",
    "fa-solid fa-server", "fa-solid fa-robot", "fa-solid fa-bug", "fa-solid fa-power-off"
];

// ==========================================
// 1. INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="mm-container fade-in">
            <div class="mm-header">
                <div>
                    <h2>Menu Manager</h2>
                    <p>Atur navigasi, kategori, dan hak akses</p>
                </div>
                <div class="header-actions">
                    <button id="btn-manage-cat" class="btn-secondary-pill">
                        <i class="fa-solid fa-layer-group"></i> Kelola Kategori
                    </button>
                    <button id="btn-add-menu" class="btn-primary-pill">
                        <i class="fa-solid fa-plus"></i> Menu Baru
                    </button>
                </div>
            </div>

            <div id="menu-list-container" class="mm-content">
                <div class="mm-loading">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Memuat daftar menu...
                </div>
            </div>
        </div>

        <div id="modal-menu" class="mm-modal-overlay">
            <div class="mm-modal-card bounce-in">
                <div class="mm-modal-header">
                    <h3 id="modal-title">Konfigurasi Menu</h3>
                    <span class="mm-close" id="close-menu-modal">&times;</span>
                </div>
                <div class="mm-modal-body">
                    <form id="form-menu" onsubmit="return false;">
                        <input type="hidden" id="menu-id">
                        
                        <div class="form-group">
                            <label>Judul Menu</label>
                            <input type="text" id="menu-title" class="input-modern" placeholder="Cth: Galeri Sekolah" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label>Route (Modul)</label>
                                <input type="text" id="menu-route" class="input-modern" placeholder="Cth: galeri-sekolah" required>
                            </div>
                            <div class="form-group flex-1">
                                <label>Kategori</label>
                                <select id="menu-category" class="input-modern"></select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Ikon</label>
                            <div class="icon-selector">
                                <div id="selected-icon-preview"><i class="fa-solid fa-circle"></i></div>
                                <input type="text" id="menu-icon" class="input-modern" placeholder="Pilih ikon..." readonly>
                                <button type="button" id="btn-open-picker" class="btn-medium">Galeri Ikon</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Hak Akses (Role)</label>
                            <div id="role-checkbox-container" class="checkbox-grid">
                                </div>
                        </div>

                        <div class="form-row align-center">
                            <div class="form-group flex-1">
                                <label>Urutan</label>
                                <input type="number" id="menu-order" class="input-modern" value="0">
                            </div>
                            <div class="form-group flex-1">
                                <label class="switch-wrap">
                                    <input type="checkbox" id="menu-active" checked>
                                    <span class="slider"></span> 
                                    <span class="label-active">Aktif</span>
                                </label>
                            </div>
                        </div>

                        <button type="button" id="btn-save-menu" class="btn-save-full">Simpan Menu</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="modal-cat" class="mm-modal-overlay">
            <div class="mm-modal-card">
                <div class="mm-modal-header">
                    <h3>Kelola Kategori</h3>
                    <span class="mm-close" id="close-cat">&times;</span>
                </div>
                <div class="mm-modal-body">
                    <div class="cat-form-box">
                        <h4 id="cat-form-title">Tambah Kategori Baru</h4>
                        <div class="cat-input-group">
                            <div style="flex:2">
                                <input type="text" id="cat-title" placeholder="Nama" class="input-modern">
                            </div>
                            <div style="flex:1">
                                <input type="text" id="cat-key" placeholder="Key" class="input-modern">
                            </div>
                            <div style="flex:0.5">
                                <input type="number" id="cat-order" placeholder="No." class="input-modern">
                            </div>
                        </div>
                        <div class="cat-action-row">
                            <button id="btn-save-cat" class="btn-save-cat"><i class="fa-solid fa-plus"></i> Tambah</button>
                            <button id="btn-cancel-cat" class="btn-cancel-cat" style="display:none;">Batal</button>
                        </div>
                    </div>

                    <div class="cat-list-header">Daftar Kategori</div>
                    <div id="cat-list" class="cat-list-box"></div>
                </div>
            </div>
        </div>

        <div id="modal-icon-picker" class="mm-modal-overlay" style="z-index: 10002;">
            <div class="mm-modal-card" style="max-width: 600px;">
                <div class="mm-modal-header">
                    <h3>Pilih Ikon</h3>
                    <input type="text" id="icon-search" placeholder="Cari nama ikon..." class="input-small">
                    <span class="mm-close" id="close-picker">&times;</span>
                </div>
                <div class="mm-modal-body">
                    <div id="icon-grid" class="icon-grid"></div>
                </div>
            </div>
        </div>
    `;

    bindEvents();
    await loadData();
}

// ==========================================
// 2. DATA LOADING & RENDERING
// ==========================================

async function loadData() {
    try {
        const [resMenu, resCat] = await Promise.all([
            supabase.from('app_menus').select('*, menu_categories(title, order_index)').order('order_index', { ascending: true }),
            supabase.from('menu_categories').select('*').order('order_index', { ascending: true })
        ]);

        allMenus = resMenu.data || [];
        allCategories = resCat.data || [];

        renderGroupedMenuTable();
        populateCategorySelect();
    } catch (e) {
        console.error("Load Error:", e);
    }
}

function renderGroupedMenuTable() {
    const container = document.getElementById('menu-list-container');
    if (!container) return;

    if (allMenus.length === 0) {
        container.innerHTML = '<div class="mm-empty">Belum ada menu terdaftar.</div>';
        return;
    }

    container.innerHTML = ''; 

    // 1. Grouping Menu per Kategori
    allCategories.sort((a, b) => a.order_index - b.order_index).forEach(cat => {
        const menusInCat = allMenus.filter(m => m.category === cat.id);
        
        if (menusInCat.length > 0) {
            const groupHTML = `
                <div class="menu-group fade-in">
                    <h4 class="group-title"><i class="fa-solid fa-layer-group"></i> ${cat.title}</h4>
                    <div class="group-items">
                        ${menusInCat.map(renderMenuItem).join('')}
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', groupHTML);
        }
    });

    // 2. Uncategorized Menus
    const uncategorized = allMenus.filter(m => !m.category);
    if (uncategorized.length > 0) {
        const groupHTML = `
            <div class="menu-group fade-in">
                <h4 class="group-title"><i class="fa-solid fa-box-open"></i> Lainnya</h4>
                <div class="group-items">
                    ${uncategorized.map(renderMenuItem).join('')}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', groupHTML);
    }
}

function renderMenuItem(menu) {
    const roleBadges = (menu.allowed_roles || []).map(role => {
        let badgeColor = 'bg-gray'; 
        if (role === 'super_admin') badgeColor = 'bg-red';
        if (role === 'pic') badgeColor = 'bg-blue';
        if (role === 'teacher') badgeColor = 'bg-green';
        
        const label = role === 'pic' ? 'PIC' : role.replace('_', ' ').toUpperCase();
        return `<span class="role-badge ${badgeColor}">${label}</span>`;
    }).join('');

    const statusClass = menu.is_active ? '' : 'item-inactive';

    return `
        <div class="menu-item shadow-sm ${statusClass}">
            <div class="menu-left">
                <div class="menu-icon-box">
                    <i class="${menu.icon_class}"></i>
                </div>
                <div class="menu-details">
                    <div class="menu-top-row">
                        <span class="menu-title">${menu.title}</span>
                        <span class="menu-route-tag">${menu.route}</span>
                        ${!menu.is_active ? '<span class="tag-disabled">Non-Aktif</span>' : ''}
                    </div>
                    <div class="menu-role-row">
                        ${roleBadges}
                    </div>
                </div>
            </div>
            <div class="menu-actions">
                <button class="btn-action edit" onclick="window.editMenu('${menu.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-action delete" onclick="window.deleteMenu('${menu.id}')" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `;
}

function populateCategorySelect() {
    const sel = document.getElementById('menu-category');
    const catList = document.getElementById('cat-list');
    
    if(sel) {
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">-- Pilih Kategori --</option>' + 
        allCategories.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
        sel.value = currentVal; 
    }

    if(catList) {
        catList.innerHTML = allCategories.map(c => `
            <div class="cat-list-item">
                <div class="cat-info">
                    <strong>${c.title}</strong>
                    <span>Key: ${c.category_key} | Urut: ${c.order_index}</span>
                </div>
                <div class="cat-actions">
                    <button class="btn-mini edit" onclick="window.editCategory('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-mini delete" onclick="window.deleteCategory('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
}

// ==========================================
// 3. LOGIC HANDLERS
// ==========================================

// GLOBAL BINDING AGAR TERBACA DI HTML
window.editMenu = (id) => {
    const menu = allMenus.find(m => m.id === id);
    if(menu) openMenuModal(menu);
};

window.deleteMenu = async (id) => {
    if(confirm("Hapus menu ini secara permanen?")) {
        await supabase.from('app_menus').delete().eq('id', id);
        await loadData();
    }
};

window.editCategory = (id) => {
    const cat = allCategories.find(c => c.id === id);
    if(!cat) return;

    editCategoryId = id;
    document.getElementById('cat-title').value = cat.title;
    document.getElementById('cat-key').value = cat.category_key;
    document.getElementById('cat-order').value = cat.order_index;
    
    document.getElementById('cat-form-title').innerText = "Edit Kategori";
    document.getElementById('btn-save-cat').innerHTML = '<i class="fa-solid fa-save"></i> Update';
    document.getElementById('btn-save-cat').classList.add('btn-update-mode');
    document.getElementById('btn-cancel-cat').style.display = 'inline-block';
};

window.deleteCategory = async (id) => {
    if(confirm("Hapus kategori ini? Menu di dalamnya akan kehilangan kategori.")) {
        await supabase.from('menu_categories').delete().eq('id', id);
        await loadData();
    }
};

window.resetCatForm = () => {
    editCategoryId = null;
    document.getElementById('cat-title').value = '';
    document.getElementById('cat-key').value = '';
    document.getElementById('cat-order').value = '';
    
    document.getElementById('cat-form-title').innerText = "Tambah Kategori Baru";
    document.getElementById('btn-save-cat').innerHTML = '<i class="fa-solid fa-plus"></i> Tambah';
    document.getElementById('btn-save-cat').classList.remove('btn-update-mode');
    document.getElementById('btn-cancel-cat').style.display = 'none';
};

window.selectIcon = (icon) => {
    document.getElementById('menu-icon').value = icon;
    document.getElementById('selected-icon-preview').innerHTML = `<i class="${icon}"></i>`;
    toggleModal('modal-icon-picker', false);
};

// INTERNAL FUNCTIONS

async function saveCategory() {
    const title = document.getElementById('cat-title').value;
    const key = document.getElementById('cat-key').value;
    const order = document.getElementById('cat-order').value || 0;

    if(!title || !key) return alert("Nama dan Key wajib diisi!");

    if(editCategoryId) {
        await supabase.from('menu_categories')
            .update({ title, category_key: key, order_index: order })
            .eq('id', editCategoryId);
    } else {
        await supabase.from('menu_categories')
            .insert({ title, category_key: key, order_index: order });
    }

    window.resetCatForm();
    await loadData();
}

function openMenuModal(menu = null) {
    document.getElementById('form-menu').reset();
    const title = document.getElementById('modal-title');
    const idInput = document.getElementById('menu-id');
    
    if (menu) {
        title.innerText = "Edit Menu";
        idInput.value = menu.id;
        document.getElementById('menu-title').value = menu.title;
        document.getElementById('menu-route').value = menu.route;
        document.getElementById('menu-category').value = menu.category;
        document.getElementById('menu-icon').value = menu.icon_class;
        document.getElementById('menu-order').value = menu.order_index;
        document.getElementById('menu-active').checked = menu.is_active;
        document.getElementById('selected-icon-preview').innerHTML = `<i class="${menu.icon_class}"></i>`;
    } else {
        title.innerText = "Tambah Menu Baru";
        idInput.value = "";
        document.getElementById('selected-icon-preview').innerHTML = `<i class="fa-solid fa-circle"></i>`;
    }

    const roles = ['super_admin', 'pic', 'teacher', 'student'];
    const container = document.getElementById('role-checkbox-container');
    
    container.innerHTML = roles.map(r => {
        const isChecked = menu && menu.allowed_roles && menu.allowed_roles.includes(r);
        const label = r === 'pic' ? 'PIC' : r.replace('_', ' ').toUpperCase();
        return `
            <label class="check-box-item">
                <input type="checkbox" name="role_access" value="${r}" ${isChecked ? 'checked' : ''}>
                <span>${label}</span>
            </label>
        `;
    }).join('');

    toggleModal('modal-menu', true);
}

async function saveMenu() {
    const id = document.getElementById('menu-id').value;
    const checkedRoles = Array.from(document.querySelectorAll('input[name="role_access"]:checked')).map(cb => cb.value);

    const payload = {
        title: document.getElementById('menu-title').value,
        route: document.getElementById('menu-route').value,
        category: document.getElementById('menu-category').value,
        icon_class: document.getElementById('menu-icon').value || 'fa-solid fa-circle',
        order_index: document.getElementById('menu-order').value,
        is_active: document.getElementById('menu-active').checked,
        allowed_roles: checkedRoles
    };

    if(!payload.title || !payload.route) return alert("Judul dan Route wajib diisi!");

    if (id) {
        await supabase.from('app_menus').update(payload).eq('id', id);
    } else {
        await supabase.from('app_menus').insert(payload);
    }
    
    toggleModal('modal-menu', false);
    await loadData();
}

function bindEvents() {
    document.getElementById('btn-add-menu').onclick = () => openMenuModal();
    document.getElementById('close-menu-modal').onclick = () => toggleModal('modal-menu', false);
    
    document.getElementById('btn-manage-cat').onclick = () => {
        window.resetCatForm();
        toggleModal('modal-cat', true);
    };
    document.getElementById('close-cat').onclick = () => toggleModal('modal-cat', false);
    document.getElementById('btn-save-cat').onclick = saveCategory;
    document.getElementById('btn-cancel-cat').onclick = window.resetCatForm;

    document.getElementById('btn-open-picker').onclick = () => {
        renderIconGrid();
        toggleModal('modal-icon-picker', true);
    };
    document.getElementById('close-picker').onclick = () => toggleModal('modal-icon-picker', false);
    document.getElementById('icon-search').onkeyup = (e) => renderIconGrid(e.target.value);

    document.getElementById('btn-save-menu').onclick = saveMenu;
}

function renderIconGrid(filter = '') {
    const grid = document.getElementById('icon-grid');
    const filtered = iconLibrary.filter(i => i.includes(filter.toLowerCase()));
    
    grid.innerHTML = filtered.map(icon => `
        <div class="icon-item" onclick="window.selectIcon('${icon}')">
            <i class="${icon}"></i>
        </div>
    `).join('');
}

function toggleModal(id, show) {
    const el = document.getElementById(id);
    if(el) el.style.display = show ? 'flex' : 'none';
}

function injectStyles() {
    if (document.getElementById('mm-css')) return;
    const s = document.createElement('style');
    s.id = 'mm-css';
    s.textContent = `
        /* CONTAINER */
        .mm-container { padding: 20px; font-family: 'Poppins', sans-serif; max-width: 1000px; margin: 0 auto; }
        .mm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .mm-header h2 { margin: 0; font-size: 1.6rem; color: #1e293b; font-weight: 700; }
        .header-actions { display: flex; gap: 10px; }

        /* BUTTONS */
        .btn-primary-pill { background: #0ea5e9; color: white; border: none; padding: 12px 25px; border-radius: 50px; cursor: pointer; font-weight: 600; font-size: 0.95rem; display: flex; gap: 8px; align-items: center; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.2); }
        .btn-secondary-pill { background: white; color: #475569; border: 1px solid #cbd5e1; padding: 12px 25px; border-radius: 50px; cursor: pointer; font-weight: 600; font-size: 0.95rem; display: flex; gap: 8px; align-items: center; }
        .btn-medium { padding: 8px 15px; border: 1px solid #ccc; background: #fff; cursor: pointer; border-radius: 6px; font-weight: 600; }
        .btn-save-full { width: 100%; background: #10b981; color: white; padding: 14px; border: none; border-radius: 10px; margin-top: 20px; font-weight: 700; font-size: 1rem; cursor: pointer; }
        
        /* ACTION BUTTONS (42px) */
        .btn-action { width: 42px; height: 42px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: transform 0.1s; }
        .btn-action:active { transform: scale(0.95); }
        .edit { background: #e0f2fe; color: #0284c7; }
        .delete { background: #fee2e2; color: #dc2626; }

        /* GROUPS & LIST */
        .mm-content { display: flex; flex-direction: column; gap: 30px; }
        .menu-group { background: #f8fafc; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; }
        .group-title { margin: 0 0 15px 0; font-size: 1rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 10px; }
        .group-items { display: flex; flex-direction: column; gap: 12px; }

        .menu-item { background: white; padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s; }
        .menu-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #cbd5e1; }
        .item-inactive { opacity: 0.6; background: #f9f9f9; }

        .menu-left { display: flex; gap: 18px; align-items: center; flex: 1; }
        .menu-icon-box { width: 45px; height: 45px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #475569; font-size: 1.4rem; }
        
        .menu-details { display: flex; flex-direction: column; gap: 6px; }
        .menu-top-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .menu-title { font-weight: 700; color: #1e293b; font-size: 1rem; }
        .menu-route-tag { font-family: monospace; font-size: 0.8rem; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; color: #64748b; }
        .tag-disabled { font-size: 0.7rem; background: #fee2e2; color: #dc2626; padding: 3px 8px; border-radius: 6px; font-weight: bold; }

        .menu-role-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .role-badge { font-size: 0.7rem; padding: 3px 10px; border-radius: 6px; font-weight: 800; color: white; text-transform: uppercase; }
        .bg-red { background: #ef4444; }
        .bg-blue { background: #3b82f6; }
        .bg-green { background: #10b981; }
        .bg-gray { background: #94a3b8; }

        .menu-actions { display: flex; gap: 10px; }

        /* MODAL */
        .mm-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(3px); }
        .mm-modal-card { background: white; width: 95%; max-width: 550px; border-radius: 20px; padding: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); max-height: 90vh; overflow-y: auto; }
        .mm-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
        .mm-close { cursor: pointer; font-size: 1.8rem; color: #94a3b8; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        
        /* CATEGORY FORM */
        .cat-form-box { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
        .cat-input-group { display: flex; gap: 10px; margin-bottom: 15px; }
        .cat-action-row { display: flex; gap: 10px; }
        .btn-save-cat { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .btn-update-mode { background: #f59e0b !important; color: white !important; }
        .btn-cancel-cat { background: #fee2e2; color: #dc2626; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }

        .cat-list-header { font-weight: 800; color: #334155; margin-bottom: 10px; text-transform: uppercase; font-size: 0.85rem; }
        .cat-list-box { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
        .cat-list-item { background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .cat-actions { display: flex; gap: 5px; }
        .btn-mini { width: 35px; height: 35px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 0.9rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .input-modern { width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; }
        .input-modern:focus { border-color: #0ea5e9; outline: none; }
        .form-row { display: flex; gap: 20px; }
        .flex-1 { flex: 1; }
        .align-center { align-items: center; }

        .icon-selector { display: flex; gap: 12px; align-items: center; }
        #selected-icon-preview { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 10px; color: #334155; font-size: 1.5rem; }
        
        .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .check-box-item { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; font-weight: 500; cursor: pointer; color: #334155; }
        
        .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; padding: 5px; }
        .icon-item { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 10px; cursor: pointer; transition: 0.2s; font-size: 1.2rem; color: #64748b; }
        .icon-item:hover { background: #e0f2fe; color: #0284c7; transform: scale(1.1); }

        .switch-wrap { display: flex; align-items: center; gap: 12px; cursor: pointer; font-weight: 600; color: #475569; }
        .slider { width: 46px; height: 24px; background: #cbd5e1; border-radius: 24px; position: relative; transition: .4s; display: inline-block; }
        .slider:before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .4s; }
        input:checked + .slider { background: #10b981; }
        input:checked + .slider:before { transform: translateX(22px); }

        .fade-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(s);
}