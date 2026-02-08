/**
 * Project: Unified Menu Manager (Admin Repo)
 * Features: Level-Based Security, Role Access, Category Management, Icon Picker
 * Relevancy: Handling allowed_level_ids for Teacher/Admin Security
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE GLOBAL ---
let allMenus = [];
let allCategories = [];
let allLevels = [];
let editCategoryId = null;

// Library Ikon Populer
const iconLibrary = [
    "fa-solid fa-house", "fa-solid fa-gauge", "fa-solid fa-chart-line", "fa-solid fa-school", 
    "fa-solid fa-graduation-cap", "fa-solid fa-chalkboard-user", "fa-solid fa-book", 
    "fa-solid fa-users", "fa-solid fa-calendar-days", "fa-solid fa-images", 
    "fa-solid fa-folder-open", "fa-solid fa-medal", "fa-solid fa-gear", "fa-solid fa-lock", 
    "fa-solid fa-robot", "fa-solid fa-database", "fa-solid fa-shield-halved", "fa-solid fa-file-lines"
];

// ==========================================
// 1. INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="mm-master-container fade-in">
            <!-- Header Section -->
            <div class="mm-header-card">
                <div class="header-info">
                    <h1>Menu Navigator</h1>
                    <p>Konfigurasi hak akses Role & Level (Repo Admin)</p>
                </div>
                <div class="header-actions">
                    <button class="btn-outline" id="open-cat-mgr">
                        <i class="fa-solid fa-layer-group"></i> Kelola Kategori
                    </button>
                    <button class="btn-primary" id="open-new-menu">
                        <i class="fa-solid fa-plus"></i> Tambah Menu Baru
                    </button>
                </div>
            </div>

            <!-- Content Section -->
            <div id="mm-main-content" class="mm-grid">
                <div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan Jantung Navigasi...</div>
            </div>
        </div>

        <!-- MODAL MENU (The Core Configurator) -->
        <div id="modal-menu" class="modal-overlay">
            <div class="modal-card bounce-in">
                <div class="modal-head">
                    <h3 id="menu-modal-title">Konfigurasi Menu</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="form-menu">
                        <input type="hidden" id="menu-id">
                        
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Nama Menu</label>
                                <input type="text" id="menu-title" class="input-flat" placeholder="Contoh: Galeri Sekolah" required>
                            </div>
                            <div class="form-group">
                                <label>Route (Modul)</label>
                                <input type="text" id="menu-route" class="input-flat" placeholder="galeri-sekolah" required>
                            </div>
                        </div>

                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Kategori</label>
                                <select id="menu-category" class="input-flat"></select>
                            </div>
                            <div class="form-group">
                                <label>Urutan Tampil</label>
                                <input type="number" id="menu-order" class="input-flat" value="0">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Visual Ikon</label>
                            <div class="icon-picker-box">
                                <div id="icon-preview"><i class="fa-solid fa-circle"></i></div>
                                <input type="text" id="menu-icon" class="input-flat" readonly>
                                <button type="button" id="btn-pick-icon" class="btn-small">Pilih Ikon</button>
                            </div>
                        </div>

                        <!-- SECURITY DOUBLE LOCK -->
                        <div class="security-box">
                            <div class="security-section">
                                <label><i class="fa-solid fa-user-shield"></i> Izin Role (Allowed Roles)</label>
                                <div id="role-checks" class="checks-grid"></div>
                            </div>
                            <div class="security-section">
                                <label><i class="fa-solid fa-medal"></i> Izin Level (Allowed Levels)</label>
                                <div id="level-checks" class="checks-grid"></div>
                                <span class="helper">*Jika kosong, semua level diizinkan.</span>
                            </div>
                        </div>

                        <div class="form-group-row">
                            <label class="toggle">
                                <input type="checkbox" id="menu-active" checked>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">Status Menu Aktif</span>
                            </label>
                        </div>

                        <button type="submit" class="btn-submit-full">Simpan Konfigurasi</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- MODAL KATEGORI -->
        <div id="modal-cat" class="modal-overlay">
            <div class="modal-card mini">
                <div class="modal-head">
                    <h3>Kategori Menu</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="cat-form">
                        <input type="text" id="cat-title" placeholder="Nama Kategori" class="input-flat">
                        <input type="text" id="cat-key" placeholder="Key (unik)" class="input-flat">
                        <button id="btn-save-cat" class="btn-primary">Tambah</button>
                    </div>
                    <div id="cat-list-items" class="cat-list"></div>
                </div>
            </div>
        </div>

        <!-- MODAL ICON PICKER -->
        <div id="modal-icons" class="modal-overlay">
            <div class="modal-card">
                <div class="modal-head">
                    <h3>Pilih Ikon</h3>
                    <input type="text" id="search-icon" placeholder="Cari..." class="input-flat-small">
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="icon-grid-render" class="icon-grid"></div>
                </div>
            </div>
        </div>
    `;

    setupEvents();
    await loadInitialData();
}

// ==========================================
// 2. DATA HANDLERS
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

        renderMenuUI();
    } catch (err) {
        console.error("Critical Load Error", err);
    }
}

function renderMenuUI() {
    const container = document.getElementById('mm-main-content');
    container.innerHTML = '';

    if (allCategories.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada kategori. Tambah kategori dulu ya Pak.</div>';
        return;
    }

    allCategories.forEach(cat => {
        const menus = allMenus.filter(m => m.category === cat.id);
        const section = document.createElement('div');
        section.className = 'menu-section';
        section.innerHTML = `
            <h2 class="cat-title"><i class="fa-solid fa-folder-tree"></i> ${cat.title} <small>${cat.category_key}</small></h2>
            <div class="menu-cards-container">
                ${menus.length ? menus.map(m => renderMenuCard(m)).join('') : '<div class="no-data">Belum ada menu di kategori ini.</div>'}
            </div>
        `;
        container.appendChild(section);
    });
}

function renderMenuCard(menu) {
    const roleBadges = (menu.allowed_roles || []).map(r => `<span class="badge role ${r}">${r}</span>`).join('');
    
    // Logika Relevansi: Mencocokkan UUID level dengan Kode level untuk tampilan Admin
    const levelBadges = (menu.allowed_level_ids || []).map(id => {
        const found = allLevels.find(l => l.id === id);
        return found ? `<span class="badge level">${found.kode}</span>` : '';
    }).join('');

    return `
        <div class="menu-card ${menu.is_active ? '' : 'disabled'}">
            <div class="card-icon"><i class="${menu.icon_class}"></i></div>
            <div class="card-info">
                <h3>${menu.title}</h3>
                <code class="route-tag">${menu.route}</code>
                <div class="access-row">
                    ${roleBadges}
                    ${levelBadges ? '<span class="divider"></span>' + levelBadges : ''}
                </div>
            </div>
            <div class="card-ctrl">
                <button class="btn-icon edit" onclick="window.editMenu('${menu.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn-icon del" onclick="window.deleteMenu('${menu.id}')"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>
    `;
}

// ==========================================
// 3. CORE FUNCTIONS (CRUD)
// ==========================================

window.editMenu = (id) => {
    const menu = allMenus.find(m => m.id === id);
    if (!menu) return;

    // Set Form
    document.getElementById('menu-id').value = menu.id;
    document.getElementById('menu-title').value = menu.title;
    document.getElementById('menu-route').value = menu.route;
    document.getElementById('menu-category').value = menu.category;
    document.getElementById('menu-order').value = menu.order_index;
    document.getElementById('menu-icon').value = menu.icon_class;
    document.getElementById('menu-active').checked = menu.is_active;
    document.getElementById('icon-preview').innerHTML = `<i class="${menu.icon_class}"></i>`;

    renderAccessCheckboxes(menu.allowed_roles, menu.allowed_level_ids);
    openModal('modal-menu');
};

async function handleMenuSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('menu-id').value;
    
    // Ambil Nilai Checkbox Role
    const roles = Array.from(document.querySelectorAll('input[name="roles"]:checked')).map(i => i.value);
    // Ambil Nilai Checkbox Level (Ini Fitur Utama yang tadi Hilang)
    const levels = Array.from(document.querySelectorAll('input[name="levels"]:checked')).map(i => i.value);

    const payload = {
        title: document.getElementById('menu-title').value,
        route: document.getElementById('menu-route').value,
        category: document.getElementById('menu-category').value,
        order_index: document.getElementById('menu-order').value,
        icon_class: document.getElementById('menu-icon').value || 'fa-solid fa-circle',
        is_active: document.getElementById('menu-active').checked,
        allowed_roles: roles,
        allowed_level_ids: levels
    };

    if (id) {
        await supabase.from('app_menus').update(payload).eq('id', id);
    } else {
        await supabase.from('app_menus').insert(payload);
    }

    closeModal('modal-menu');
    await loadInitialData();
}

// ==========================================
// 4. UI LOGICS (MODALS, PICKERS)
// ==========================================

function renderAccessCheckboxes(selectedRoles = [], selectedLevels = []) {
    // 1. Render Roles
    const roles = ['super_admin', 'pic', 'teacher', 'student'];
    document.getElementById('role-checks').innerHTML = roles.map(r => `
        <label class="check-item">
            <input type="checkbox" name="roles" value="${r}" ${selectedRoles.includes(r) ? 'checked' : ''}>
            <span>${r.replace('_', ' ').toUpperCase()}</span>
        </label>
    `).join('');

    // 2. Render Levels (Sync dengan Database Levels)
    document.getElementById('level-checks').innerHTML = allLevels.map(l => `
        <label class="check-item">
            <input type="checkbox" name="levels" value="${l.id}" ${selectedLevels.includes(l.id) ? 'checked' : ''}>
            <span>${l.kode}</span>
        </label>
    `).join('');
}

function setupEvents() {
    // Modal Openers
    document.getElementById('open-new-menu').onclick = () => {
        document.getElementById('form-menu').reset();
        document.getElementById('menu-id').value = '';
        renderAccessCheckboxes();
        openModal('modal-menu');
    };

    document.getElementById('open-cat-mgr').onclick = () => {
        renderCatList();
        openModal('modal-cat');
    };

    // Close Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => closeModal(btn.closest('.modal-overlay').id);
    });

    // Form Submit
    document.getElementById('form-menu').onsubmit = handleMenuSubmit;

    // Icon Picker
    document.getElementById('btn-pick-icon').onclick = () => {
        renderIconGrid();
        openModal('modal-icons');
    };

    document.getElementById('search-icon').oninput = (e) => renderIconGrid(e.target.value);
}

function renderIconGrid(filter = '') {
    const grid = document.getElementById('icon-grid-render');
    const filtered = iconLibrary.filter(i => i.includes(filter.toLowerCase()));
    grid.innerHTML = filtered.map(icon => `
        <div class="icon-item" onclick="selectIcon('${icon}')">
            <i class="${icon}"></i>
        </div>
    `).join('');
}

window.selectIcon = (icon) => {
    document.getElementById('menu-icon').value = icon;
    document.getElementById('icon-preview').innerHTML = `<i class="${icon}"></i>`;
    closeModal('modal-icons');
};

// ==========================================
// 5. STYLING (ADMIN REPO STANDARD)
// ==========================================

function injectStyles() {
    if (document.getElementById('mm-master-css')) return;
    const s = document.createElement('style');
    s.id = 'mm-master-css';
    s.textContent = `
        .mm-master-container { padding: 30px; background: #f1f5f9; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .mm-header-card { background: white; padding: 25px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 30px; }
        .header-info h1 { margin: 0; font-size: 1.5rem; color: #1e293b; font-weight: 800; }
        .header-info p { margin: 5px 0 0; color: #64748b; font-size: 0.9rem; }
        .header-actions { display: flex; gap: 12px; }

        /* BUTTONS */
        .btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-outline { background: white; color: #475569; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .btn-submit-full { width: 100%; background: #10b981; color: white; border: none; padding: 14px; border-radius: 10px; font-weight: 700; cursor: pointer; margin-top: 20px; }

        /* MENU SECTIONS */
        .menu-section { margin-bottom: 40px; }
        .cat-title { font-size: 1rem; color: #475569; font-weight: 700; display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 15px; }
        .cat-title small { font-weight: 400; color: #94a3b8; margin-left: 10px; font-family: monospace; }
        .menu-cards-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }

        /* MENU CARD */
        .menu-card { background: white; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 20px; box-shadow: 0 2px 4px rgb(0 0 0 / 0.05); border: 1px solid #f1f5f9; transition: 0.2s; }
        .menu-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
        .menu-card.disabled { opacity: 0.6; filter: grayscale(1); }
        .card-icon { width: 50px; height: 50px; background: #eff6ff; color: #3b82f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .card-info { flex: 1; }
        .card-info h3 { margin: 0; font-size: 1rem; color: #1e293b; }
        .route-tag { font-size: 0.75rem; background: #f8fafc; padding: 2px 6px; border-radius: 4px; color: #64748b; }
        .access-row { display: flex; gap: 5px; margin-top: 8px; flex-wrap: wrap; align-items: center; }
        .divider { width: 1px; height: 12px; background: #e2e8f0; margin: 0 5px; }

        /* BADGES */
        .badge { font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
        .badge.role { background: #f1f5f9; color: #475569; }
        .badge.role.super_admin { background: #fee2e2; color: #dc2626; }
        .badge.role.pic { background: #e0f2fe; color: #0284c7; }
        .badge.level { background: #ecfdf5; color: #059669; }

        /* CARD CTRL */
        .card-ctrl { display: flex; gap: 8px; }
        .btn-icon { width: 35px; height: 35px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-icon.edit { background: #f1f5f9; color: #64748b; } .btn-icon.edit:hover { background: #3b82f6; color: white; }
        .btn-icon.del { background: #fef2f2; color: #ef4444; } .btn-icon.del:hover { background: #ef4444; color: white; }

        /* MODALS */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 9999; }
        .modal-card { background: white; width: 550px; max-width: 95%; border-radius: 20px; padding: 30px; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }
        .modal-card.mini { width: 400px; }
        .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .modal-head h3 { margin: 0; font-size: 1.25rem; color: #1e293b; }
        .close-modal { cursor: pointer; font-size: 1.5rem; color: #94a3b8; }
        
        /* FORM COMPONENTS */
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group { margin-bottom: 18px; }
        .form-group label { display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .input-flat { width: 100%; padding: 12px; border: 2px solid #f1f5f9; border-radius: 10px; font-size: 0.95rem; transition: 0.2s; }
        .input-flat:focus { border-color: #3b82f6; outline: none; }
        
        .security-box { background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #f1f5f9; margin-bottom: 18px; }
        .security-section { margin-bottom: 15px; }
        .security-section:last-child { margin-bottom: 0; }
        .checks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        .check-item { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #475569; font-weight: 600; cursor: pointer; }
        .helper { font-size: 0.75rem; color: #94a3b8; font-style: italic; }

        .icon-picker-box { display: flex; align-items: center; gap: 12px; }
        #icon-preview { width: 45px; height: 45px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #1e293b; }

        /* TOGGLE SWITCH */
        .toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .toggle-slider { width: 40px; height: 20px; background: #e2e8f0; border-radius: 20px; position: relative; transition: 0.3s; }
        .toggle-slider:before { content: ""; position: absolute; width: 14px; height: 14px; background: white; border-radius: 50%; left: 3px; top: 3px; transition: 0.3s; }
        input:checked + .toggle-slider { background: #10b981; }
        input:checked + .toggle-slider:before { transform: translateX(20px); }
        .toggle-label { font-weight: 700; color: #475569; font-size: 0.9rem; }

        .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto; }
        .icon-item { width: 50px; height: 50px; background: #f8fafc; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; }
        .icon-item:hover { background: #3b82f6; color: white; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .bounce-in { animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes bounceIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(s);
}

// Global Helper Modals
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }