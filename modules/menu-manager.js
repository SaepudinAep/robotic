/**
 * Project: Menu Manager Module (SPA) - AESTHETIC V2
 * Features: Soft UI, Gradient Icons, DOM Integrity Fix
 * Filename: modules/menu-manager.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

let allMenus = [];
let allLevels = [];
let allCategories = [];
let modalOpenInProgress = false;

const iconLibrary = [
    "fa-solid fa-house", "fa-solid fa-gauge", "fa-solid fa-user", "fa-solid fa-users", 
    "fa-solid fa-user-graduate", "fa-solid fa-chalkboard-user", "fa-solid fa-school", 
    "fa-solid fa-book", "fa-solid fa-book-open", "fa-solid fa-calendar-days", 
    "fa-solid fa-clipboard-list", "fa-solid fa-list-check", "fa-solid fa-chart-pie", 
    "fa-solid fa-chart-line", "fa-solid fa-gear", "fa-solid fa-gears", "fa-solid fa-right-from-bracket",
    "fa-solid fa-folder", "fa-solid fa-folder-open", "fa-solid fa-file", "fa-solid fa-file-lines", 
    "fa-solid fa-money-bill", "fa-solid fa-envelope", "fa-solid fa-bell", "fa-solid fa-bullhorn",
    "fa-solid fa-trash", "fa-solid fa-pen-to-square", "fa-solid fa-plus", "fa-solid fa-check", 
    "fa-solid fa-xmark", "fa-solid fa-magnifying-glass", "fa-solid fa-cube", "fa-solid fa-layer-group", 
    "fa-solid fa-database", "fa-solid fa-cloud", "fa-solid fa-table", "fa-solid fa-print", 
    "fa-solid fa-download", "fa-solid fa-upload", "fa-solid fa-share-nodes", "fa-solid fa-comments", 
    "fa-solid fa-id-card", "fa-solid fa-key", "fa-solid fa-lock", "fa-solid fa-shield-halved",
    "fa-solid fa-star", "fa-solid fa-heart", "fa-solid fa-thumbs-up", "fa-solid fa-eye", 
    "fa-solid fa-image", "fa-solid fa-camera", "fa-solid fa-video", "fa-solid fa-gamepad", 
    "fa-solid fa-robot", "fa-solid fa-flask", "fa-solid fa-dna", "fa-solid fa-laptop-code"
];

function cleanupModals() {
    const existingContainer = document.getElementById('mm-modals-portal');
    if (existingContainer) existingContainer.remove();
}

export async function init(canvas) {
    cleanupModals();
    injectStyles();

    canvas.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 120px;">
            <div class="mm-toolbar">
                <div>
                    <h2 class="mm-page-title">Menu Manager</h2>
                    <p class="mm-page-subtitle">Desain Navigasi Aplikasi Anda</p>
                </div>
                <div style="display:flex; gap:12px;">
                    <button id="btn-manage-cat" class="mm-btn-action mm-btn-secondary">
                        <i class="fa-solid fa-layer-group"></i> <span class="hide-mobile">Kategori</span>
                    </button>
                    <button id="btn-add-menu" class="mm-btn-action mm-btn-primary">
                        <i class="fa-solid fa-plus"></i> <span class="hide-mobile">Menu Baru</span>
                    </button>
                </div>
            </div>
            <div id="menu-list-container">
                <div class="mm-loading">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Memuat data...</span>
                </div>
            </div>
        </div>
    `;

    // Render Modal Portal di Body (Z-Index Safe Area)
    const modalPortal = document.createElement('div');
    modalPortal.id = 'mm-modals-portal';
    modalPortal.innerHTML = `
        <div id="modal-menu" class="mm-modal">
            <div class="mm-modal-content">
                <div class="modal-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="header-icon-badge"><i class="fa-solid fa-pen-to-square"></i></div>
                        <h3 id="modal-title" style="margin:0;">Form Menu</h3>
                    </div>
                    <span class="close-modal" id="close-menu-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="menu-id">
                    <div class="form-group">
                        <label>Judul Menu</label>
                        <input type="text" id="menu-title" class="input-field" placeholder="Nama tampilan menu...">
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex:2;">
                            <label>Route ID</label>
                            <input type="text" id="menu-route" class="input-field" placeholder="modul-id">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Urutan</label>
                            <input type="number" id="menu-order" class="input-field">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Kategori</label>
                        <div class="select-wrapper">
                            <select id="menu-category" class="input-field"></select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Visual Icon</label>
                        <div class="icon-input-wrapper">
                            <div class="icon-preview-box"><i id="icon-preview" class="fa-solid fa-cube"></i></div>
                            <input type="text" id="menu-icon" class="input-field" style="flex:1;" placeholder="fa-solid fa-...">
                            <button type="button" id="btn-open-picker" class="mm-btn-action mm-btn-yellow">Pilih</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Akses Role</label>
                        <div class="mm-checkbox-group">
                            <label class="mm-checkbox-item"><input type="checkbox" class="cb-role" value="super_admin"> Admin</label>
                            <label class="mm-checkbox-item"><input type="checkbox" class="cb-role" value="teacher"> Teacher</label>
                            <label class="mm-checkbox-item"><input type="checkbox" class="cb-role" value="student"> Student</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Filter Level</label>
                        <div class="mm-checkbox-group" id="container-cb-levels"></div>
                    </div>
                    <div class="form-group">
                        <label class="mm-toggle-switch">
                            <input type="checkbox" id="menu-active" checked>
                            <span class="slider"></span>
                            <strong style="margin-left:10px;">Status Aktif</strong>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btn-save-menu" class="mm-btn-action mm-btn-primary" style="width:100%;">Simpan Perubahan</button>
                </div>
            </div>
        </div>

        <div id="modal-icon-picker" class="mm-modal">
            <div class="mm-modal-content" style="width: 500px;">
                <div class="modal-header">
                    <h3>Pustaka Icon</h3>
                    <span class="close-modal" id="close-picker">&times;</span>
                </div>
                <div style="padding:20px;">
                    <input type="text" id="icon-search" class="input-field" placeholder="Cari icon (misal: user, book)..." style="margin-bottom:15px;">
                    <div id="icon-grid" class="icon-grid"></div>
                </div>
            </div>
        </div>

        <div id="modal-cat" class="mm-modal">
            <div class="mm-modal-content" style="width: 480px;">
                <div class="modal-header">
                    <h3>Kategori Menu</h3>
                    <span class="close-modal" id="close-cat">&times;</span>
                </div>
                <div style="padding:20px;">
                    <div class="cat-form-box">
                        <input type="hidden" id="cat-id">
                        <input type="text" id="cat-title" placeholder="Nama Kategori" class="input-field" style="margin-bottom:10px;">
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="cat-key" placeholder="Key (Unik)" class="input-field">
                            <input type="number" id="cat-order" class="input-field" style="width:80px;" placeholder="Urut">
                        </div>
                        <div class="select-wrapper" style="margin-bottom:15px;">
                            <select id="cat-target" class="input-field">
                                <option value="admin_v2">Admin V2</option>
                                <option value="teacher">Teacher App</option>
                                <option value="student">Student App</option>
                                <option value="all">Semua App</option>
                            </select>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px;">
                            <button id="btn-reset-cat" class="mm-btn-text-danger" style="display:none;">Batal</button>
                            <button id="btn-save-cat" class="mm-btn-action mm-btn-primary">Simpan</button>
                        </div>
                    </div>
                    <div id="cat-list-container" class="cat-list-box"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalPortal);

    bindEvents();
    renderIconGrid();
    await loadData();
}

function injectStyles() {
    if (document.getElementById('menu-manager-css')) return;
    const style = document.createElement('style');
    style.id = 'menu-manager-css';
    style.textContent = `
        /* --- UTILS --- */
        .hide-mobile { display: inline; }
        @media (max-width: 600px) { .hide-mobile { display: none; } }
        
        /* --- TOOLBAR --- */
        .mm-toolbar { 
            background: rgba(255, 255, 255, 0.8); 
            backdrop-filter: blur(10px);
            padding: 20px 25px; 
            border-radius: 16px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.03); 
            margin-bottom: 30px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border: 1px solid rgba(255,255,255,0.5);
        }
        .mm-page-title { margin:0; font-family:'Fredoka One', cursive; color:#1e293b; font-size:1.6rem; letter-spacing:0.5px; }
        .mm-page-subtitle { margin:4px 0 0 0; color:#64748b; font-size:0.9rem; font-weight:500; }

        /* --- LOADING --- */
        .mm-loading { text-align:center; padding: 60px; color: #cbd5e1; font-size: 1.2rem; display:flex; flex-direction:column; gap:15px; align-items:center; }

        /* --- GRID SYSTEM --- */
        .mm-grid { 
            display: grid; 
            gap: 20px; 
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
            margin-bottom: 40px; 
        }

        /* --- CARD DESIGN (ESTETIK) --- */
        .mm-card { 
            background: white; 
            border-radius: 16px; 
            padding: 18px; 
            display: flex; 
            align-items: center; 
            gap: 18px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.02); 
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
            border: 1px solid transparent;
            position: relative;
            overflow: hidden;
        }
        .mm-card:hover { 
            transform: translateY(-5px); 
            box-shadow: 0 15px 30px rgba(0,0,0,0.08); 
            border-color: rgba(77, 151, 255, 0.2);
        }
        
        /* --- GRADIENT ICON BOX --- */
        .mm-icon-box { 
            width: 54px; height: 54px; 
            border-radius: 14px; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 1.4rem; 
            flex-shrink: 0; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        /* THEME COLORS (Colorful & Gradient) */
        .theme-blue .mm-icon-box { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); color: #0284c7; }
        .theme-orange .mm-icon-box { background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%); color: #ea580c; }
        .theme-green .mm-icon-box { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #16a34a; }
        .theme-purple .mm-icon-box { background: linear-gradient(135deg, #f3e8ff 0%, #d8b4fe 100%); color: #9333ea; }
        
        /* TYPOGRAPHY CARD */
        .mm-card-title { font-weight: 700; color: #334155; font-size: 1rem; margin-bottom: 4px; }
        .mm-card-meta { font-size: 0.75rem; color: #94a3b8; font-weight: 500; display:flex; gap:8px; align-items:center; }
        .badge { padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
        .badge-route { background: #f1f5f9; color: #64748b; }
        .badge-order { background: #f8fafc; border: 1px solid #e2e8f0; color: #94a3b8; }

        /* ACTIONS (Hidden by default, show on hover) */
        .mm-actions { 
            margin-left: auto; 
            display: flex; gap: 8px; 
            opacity: 0.6; 
            transition: 0.2s; 
        }
        .mm-card:hover .mm-actions { opacity: 1; }
        
        .btn-icon { 
            width: 36px; height: 36px; 
            border-radius: 10px; 
            border: none; 
            display: flex; align-items: center; justify-content: center; 
            cursor: pointer; 
            background: #f8fafc; color: #64748b; 
            transition: 0.2s; 
        }
        .btn-icon:hover { transform: scale(1.1); }
        .btn-icon.edit:hover { background: #ffab19; color: white; box-shadow: 0 4px 10px rgba(255,171,25,0.3); }
        .btn-icon.del:hover { background: #ef4444; color: white; box-shadow: 0 4px 10px rgba(239,68,68,0.3); }

        /* --- MODAL DESIGN --- */
        .mm-modal { display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); justify-content: center; align-items: center; padding: 20px; }
        #modal-icon-picker { z-index: 10010; }
        .mm-modal.show { display: flex !important; }
        .mm-modal-content { background: #fff; border-radius: 20px; width: 500px; max-width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; max-height: 90vh; border: 1px solid rgba(255,255,255,0.8); }
        @keyframes slideUp { from {transform: translateY(20px); opacity:0;} to {transform: translateY(0); opacity:1;} }
        
        .modal-header { padding: 20px 25px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .header-icon-badge { width: 32px; height: 32px; background: #eff6ff; color: #4d97ff; border-radius: 8px; display:flex; align-items:center; justify-content:center; }
        .modal-body { padding: 25px; overflow-y: auto; background: #fff; }
        .modal-footer { padding: 20px 25px; border-top: 1px solid #f1f5f9; background: #f8fafc; border-radius: 0 0 20px 20px; }
        
        .close-modal { font-size: 1.8rem; cursor: pointer; color: #cbd5e1; line-height: 1; transition:0.2s; }
        .close-modal:hover { color: #ef4444; transform: rotate(90deg); }

        /* --- FORM ELEMENTS --- */
        .form-group { margin-bottom: 18px; }
        .form-group label { display: block; margin-bottom: 8px; font-size: 0.85rem; font-weight: 600; color: #475569; }
        .form-row { display: flex; gap: 15px; }
        
        .input-field { 
            width: 100%; padding: 12px 15px; 
            border: 2px solid #f1f5f9; border-radius: 10px; 
            font-size: 0.95rem; color: #334155; 
            background: #f8fafc; transition: 0.2s; 
        }
        .input-field:focus { border-color: #4d97ff; background: #fff; outline: none; box-shadow: 0 0 0 4px rgba(77, 151, 255, 0.1); }
        
        .icon-input-wrapper { display: flex; gap: 12px; }
        .icon-preview-box { width: 50px; height: 50px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #64748b; }

        .mm-checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
        .mm-checkbox-item { 
            background: #fff; border: 1px solid #e2e8f0; 
            padding: 8px 12px; border-radius: 8px; 
            font-size: 0.85rem; color: #64748b; cursor: pointer; 
            display: flex; align-items: center; gap: 6px; transition:0.2s;
        }
        .mm-checkbox-item:hover { border-color: #cbd5e1; background: #f8fafc; }
        
        /* Toggle Switch */
        .mm-toggle-switch { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
        .mm-toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: relative; display:inline-block; width: 46px; height: 24px; background-color: #cbd5e1; border-radius: 34px; transition: .4s; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: .4s; }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(22px); }

        /* --- BUTTONS --- */
        .mm-btn-action { border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
        .mm-btn-action:hover { transform: translateY(-2px); }
        .mm-btn-primary { background: linear-gradient(135deg, #4d97ff 0%, #2563eb 100%); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
        .mm-btn-secondary { background: white; border: 1px solid #e2e8f0; color: #475569; }
        .mm-btn-secondary:hover { border-color: #4d97ff; color: #4d97ff; }
        .mm-btn-yellow { background: #ffab19; color: #fff; }
        .mm-btn-text-danger { background: none; color: #ef4444; border:none; font-weight:600; cursor:pointer; }
        
        /* --- LISTS --- */
        .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(55px, 1fr)); gap: 12px; max-height: 320px; overflow-y: auto; }
        .icon-item { width: 55px; height: 55px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; border: 1px solid #f1f5f9; font-size: 1.2rem; color: #64748b; transition:0.2s; }
        .icon-item:hover { background: #eff6ff; color: #4d97ff; border-color: #4d97ff; transform: scale(1.1); }
        
        .cat-list-box { max-height: 280px; overflow-y: auto; border: 1px solid #f1f5f9; border-radius: 12px; background: white; }
        .cat-form-box { background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px dashed #cbd5e1; }
    `;
    document.head.appendChild(style);
}

async function loadData() {
    try {
        const [l, c, m] = await Promise.all([
            supabase.from('levels').select('id, kode').order('kode'),
            supabase.from('menu_categories').select('*').order('order_index'),
            supabase.from('app_menus').select('*').order('order_index')
        ]);
        allLevels = l.data || [];
        allCategories = c.data || [];
        allMenus = m.data || [];
        renderLevelCheckboxes();
        renderCategoryOptions();
        renderCategoryList();
        renderMenuList();
    } catch (e) { console.error(e); }
}

function renderLevelCheckboxes() {
    const container = document.getElementById('container-cb-levels');
    if(container) container.innerHTML = allLevels.map(l => `<label class="mm-checkbox-item"><input type="checkbox" class="cb-level" value="${l.id}"> ${l.kode}</label>`).join('');
}

function renderCategoryOptions() {
    const select = document.getElementById('menu-category');
    if(select) select.innerHTML = '<option value="">-- Pilih Kategori --</option>' + allCategories.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
}

function renderMenuList() {
    const container = document.getElementById('menu-list-container');
    container.innerHTML = '';

    allCategories.forEach(cat => {
        const items = allMenus.filter(m => m.category === cat.id);
        if (items.length === 0) return;

        // Logic Warna Tema Kategori
        let themeClass = 'theme-blue'; // Default
        let labelColor = '#4d97ff';
        const titleLower = cat.title.toLowerCase();
        
        if (titleLower.includes('admin') || titleLower.includes('system')) { themeClass = 'theme-orange'; labelColor = '#f97316'; }
        else if (titleLower.includes('home') || titleLower.includes('dashboard')) { themeClass = 'theme-green'; labelColor = '#10b981'; }
        else if (titleLower.includes('user') || titleLower.includes('siswa')) { themeClass = 'theme-purple'; labelColor = '#8b5cf6'; }

        // Section Header dengan InsertAdjacentHTML (Safe DOM)
        const sectionHtml = `
            <div style="margin-top:35px; margin-bottom:20px; display:flex; align-items:center; gap:12px;">
                <div style="height:24px; width:5px; background:${labelColor}; border-radius:10px;"></div>
                <h4 style="margin:0; text-transform:uppercase; color:#475569; font-size:0.85rem; letter-spacing:1.2px; font-weight:700;">${cat.title}</h4>
                <div style="background:#f1f5f9; padding:4px 10px; border-radius:20px; font-size:0.65rem; color:#94a3b8; font-weight:600; text-transform:uppercase;">${cat.target_app}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', sectionHtml);

        const grid = document.createElement('div');
        grid.className = 'mm-grid';

        items.forEach(m => {
            const card = document.createElement('div');
            card.className = `mm-card ${themeClass}`;
            
            // Status Dot
            const statusDot = m.is_active 
                ? '<span style="width:8px; height:8px; background:#10b981; border-radius:50%; display:inline-block;" title="Aktif"></span>'
                : '<span style="width:8px; height:8px; background:#ef4444; border-radius:50%; display:inline-block;" title="Nonaktif"></span>';

            card.innerHTML = `
                <div class="mm-icon-box"><i class="${m.icon_class || 'fa-solid fa-cube'}"></i></div>
                <div style="flex:1; overflow:hidden;">
                    <div class="mm-card-title">${m.title}</div>
                    <div class="mm-card-meta">
                        ${statusDot}
                        <span class="badge badge-route">${m.route}</span>
                        <span class="badge badge-order">#${m.order_index}</span>
                    </div>
                </div>
                <div class="mm-actions">
                    <button class="btn-icon edit" data-id="${m.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon del" data-id="${m.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            card.querySelector('.edit').onclick = (e) => { e.stopPropagation(); openMenuModal(m.id); };
            card.querySelector('.del').onclick = (e) => { e.stopPropagation(); deleteMenu(m.id); };
            card.onclick = () => openMenuModal(m.id);
            grid.appendChild(card);
        });
        container.appendChild(grid);
    });
}

function renderIconGrid(filter = "") {
    const container = document.getElementById('icon-grid');
    if(!container) return;
    container.innerHTML = "";
    iconLibrary.forEach(icon => {
        if (icon.includes(filter.toLowerCase())) {
            const div = document.createElement('div');
            div.className = 'icon-item';
            div.innerHTML = `<i class="${icon}"></i>`;
            div.onclick = () => {
                document.getElementById('menu-icon').value = icon;
                document.getElementById('icon-preview').className = icon;
                toggleModal('modal-icon-picker', false);
            };
            container.appendChild(div);
        }
    });
}

function openMenuModal(id = null) {
    modalOpenInProgress = true;
    const modal = document.getElementById('modal-menu');
    document.getElementById('menu-id').value = id || '';
    document.getElementById('modal-title').textContent = id ? "Edit Menu" : "Tambah Menu Baru";
    
    if (id) {
        const m = allMenus.find(x => x.id === id);
        if (m) {
            document.getElementById('menu-title').value = m.title;
            document.getElementById('menu-route').value = m.route;
            document.getElementById('menu-order').value = m.order_index;
            document.getElementById('menu-category').value = m.category;
            document.getElementById('menu-icon').value = m.icon_class;
            document.getElementById('icon-preview').className = m.icon_class || 'fa-solid fa-cube';
            document.getElementById('menu-active').checked = m.is_active;
            
            let roles = typeof m.allowed_roles === 'string' ? JSON.parse(m.allowed_roles) : m.allowed_roles;
            document.querySelectorAll('.cb-role').forEach(cb => cb.checked = roles?.includes(cb.value));
            
            let lvls = typeof m.allowed_level_ids === 'string' ? JSON.parse(m.allowed_level_ids) : m.allowed_level_ids;
            document.querySelectorAll('.cb-level').forEach(cb => cb.checked = lvls?.includes(cb.value));
        }
    } else {
        document.getElementById('menu-title').value = '';
        document.getElementById('menu-route').value = '';
        document.getElementById('menu-order').value = 1;
        document.getElementById('menu-icon').value = '';
        document.getElementById('menu-category').value = '';
        document.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false);
        document.getElementById('menu-active').checked = true;
    }
    toggleModal('modal-menu', true);
}

async function saveMenu() {
    const id = document.getElementById('menu-id').value;
    const roles = Array.from(document.querySelectorAll('.cb-role:checked')).map(c => c.value);
    const levels = Array.from(document.querySelectorAll('.cb-level:checked')).map(c => c.value);
    const payload = {
        title: document.getElementById('menu-title').value,
        route: document.getElementById('menu-route').value,
        category: document.getElementById('menu-category').value,
        icon_class: document.getElementById('menu-icon').value,
        order_index: parseInt(document.getElementById('menu-order').value) || 0,
        is_active: document.getElementById('menu-active').checked,
        allowed_roles: roles,
        allowed_level_ids: levels
    };
    if(!payload.title || !payload.route || !payload.category) return alert("Data wajib diisi!");
    
    const btn = document.getElementById('btn-save-menu');
    btn.textContent = "Menyimpan..."; btn.disabled = true;

    try {
        if (id) await supabase.from('app_menus').update(payload).eq('id', id);
        else await supabase.from('app_menus').insert([payload]);
        toggleModal('modal-menu', false);
        await loadData();
    } catch(err) { alert(err.message); } finally { btn.textContent = "Simpan Perubahan"; btn.disabled = false; }
}

async function deleteMenu(id) {
    if(confirm("Hapus menu ini permanen?")) {
        await supabase.from('app_menus').delete().eq('id', id);
        await loadData();
    }
}

function renderCategoryList() {
    const container = document.getElementById('cat-list-container');
    if(container) container.innerHTML = allCategories.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f1f5f9; transition:0.2s; border-radius:8px;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <div>
                <div style="font-weight:600; color:#334155; font-size:0.9rem;">${c.title}</div>
                <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">Key: ${c.category_key} • App: ${c.target_app}</div>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn-icon edit" onclick="window.editCat('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon del" onclick="window.delCat('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editCat = (id) => {
    const c = allCategories.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cat-id').value = c.id;
    document.getElementById('cat-title').value = c.title;
    document.getElementById('cat-key').value = c.category_key;
    document.getElementById('cat-order').value = c.order_index;
    document.getElementById('cat-target').value = c.target_app;
    document.getElementById('btn-reset-cat').style.display = "block";
};

window.delCat = async (id) => {
    if(confirm("Hapus kategori? Semua menu di dalamnya juga akan terhapus.")) {
        await supabase.from('menu_categories').delete().eq('id', id);
        await loadData();
    }
};

async function saveCategory() {
    const id = document.getElementById('cat-id').value;
    const payload = {
        title: document.getElementById('cat-title').value,
        category_key: document.getElementById('cat-key').value.toLowerCase().replace(/\s/g, ''),
        order_index: parseInt(document.getElementById('cat-order').value) || 0,
        target_app: document.getElementById('cat-target').value
    };
    if(!payload.title || !payload.category_key) return alert("Lengkapi data kategori!");
    try {
        if (id) await supabase.from('menu_categories').update(payload).eq('id', id);
        else await supabase.from('menu_categories').insert([payload]);
        resetCatForm();
        await loadData();
    } catch(err) { alert(err.message); }
}

function resetCatForm() {
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-title').value = '';
    document.getElementById('cat-key').value = '';
    document.getElementById('cat-order').value = 1;
    document.getElementById('btn-reset-cat').style.display = "none";
}

function bindEvents() {
    document.getElementById('btn-add-menu').onclick = () => openMenuModal();
    document.getElementById('close-menu-modal').onclick = () => toggleModal('modal-menu', false);
    document.getElementById('btn-manage-cat').onclick = () => toggleModal('modal-cat', true);
    document.getElementById('close-cat').onclick = () => toggleModal('modal-cat', false);
    document.getElementById('btn-open-picker').onclick = () => toggleModal('modal-icon-picker', true);
    document.getElementById('close-picker').onclick = () => toggleModal('modal-icon-picker', false);
    document.getElementById('btn-save-menu').onclick = saveMenu;
    document.getElementById('btn-save-cat').onclick = saveCategory;
    document.getElementById('btn-reset-cat').onclick = resetCatForm;
    document.getElementById('icon-search').onkeyup = (e) => renderIconGrid(e.target.value);
    
    window.addEventListener('click', (e) => {
        if (modalOpenInProgress) return;
        if (['modal-menu', 'modal-cat', 'modal-icon-picker'].includes(e.target.id)) {
            e.target.style.display = 'none';
            e.target.classList.remove('show');
        }
    });
}

function toggleModal(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if(show) { modalOpenInProgress = true; el.style.display = 'flex'; el.classList.add('show'); setTimeout(() => { modalOpenInProgress = false; }, 300); }
    else { el.style.display = 'none'; el.classList.remove('show'); }
}