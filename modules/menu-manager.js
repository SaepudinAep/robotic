/**
 * Project: Menu Manager Module (SPA) - FIXED
 * Features: Icon Picker, Edit Fix, Card UI
 * Filename: modules/menu-manager.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE GLOBAL ---
let allMenus = [];
let allLevels = [];
let allCategories = [];

// --- ICON LIBRARY (Koleksi Icon Umum untuk Sekolah) ---
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

export async function init(canvas) {
    // 1. INJECT STYLE 
    injectStyles();

    // 2. RENDER HTML SHELL
    canvas.innerHTML = `
        <div style="max-width: 1100px; margin: 0 auto; padding-bottom: 100px;">
            <div class="mm-toolbar">
                <div>
                    <h2 style="margin:0; font-family:'Fredoka One'; color:#333; font-size:1.4rem;">Menu Manager</h2>
                    <p style="margin:2px 0 0 0; color:#666; font-size:0.9rem;">Atur navigasi aplikasi</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="btn-manage-cat" class="mm-btn-action mm-bg-yellow">
                        <i class="fa-solid fa-layer-group"></i> <span class="hide-mobile">Kategori</span>
                    </button>
                    <button id="btn-add-menu" class="mm-btn-action mm-bg-blue">
                        <i class="fa-solid fa-plus"></i> <span class="hide-mobile">Menu Baru</span>
                    </button>
                </div>
            </div>

            <div id="menu-list-container" class="mm-grid-container">
                <div style="text-align:center; padding:50px; color:#999;">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data...
                </div>
            </div>
        </div>

        <div id="modal-menu" class="mm-modal">
            <div class="mm-modal-content">
                <div class="modal-header">
                    <h3 id="modal-title" style="margin:0;">Form Menu</h3>
                    <span class="close-modal" id="close-menu-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="menu-id">
                    
                    <div class="form-group">
                        <label>Judul Menu</label>
                        <input type="text" id="menu-title" placeholder="Contoh: Data Siswa" class="input-field">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex:2;">
                            <label>Route (Modul ID)</label>
                            <input type="text" id="menu-route" placeholder="Contoh: students" class="input-field">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Urutan</label>
                            <input type="number" id="menu-order" value="1" class="input-field">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Kategori</label>
                        <select id="menu-category" class="input-field">
                            <option value="">-- Pilih --</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Icon</label>
                        <div style="display:flex; gap:10px;">
                            <div id="icon-preview-box" class="icon-preview-box">
                                <i id="icon-preview" class="fa-solid fa-cube"></i>
                            </div>
                            <input type="text" id="menu-icon" placeholder="fa-solid fa-cube" class="input-field" style="flex:1;">
                            <button type="button" id="btn-open-picker" class="mm-btn-action mm-bg-yellow">Pilih</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Hak Akses Role</label>
                        <div class="mm-checkbox-group">
                            <label class="mm-checkbox-item"><input type="checkbox" class="cb-role" value="super_admin"> Super Admin</label>
                            <label class="mm-checkbox-item"><input type="checkbox" class="cb-role" value="teacher"> Teacher</label>
                            <label class="mm-checkbox-item"><input type="checkbox" class="cb-role" value="student"> Student</label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Filter Level (Opsional)</label>
                        <div class="mm-checkbox-group" id="container-cb-levels">Loading levels...</div>
                    </div>

                    <div class="form-group">
                        <label class="mm-checkbox-item" style="background:none; border:none; padding:0;">
                            <input type="checkbox" id="menu-active" checked> 
                            <strong>Menu Aktif?</strong>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btn-save-menu" class="mm-btn-action mm-bg-blue" style="width:100%; justify-content:center;">Simpan Data</button>
                </div>
            </div>
        </div>

        <div id="modal-icon-picker" class="mm-modal" style="z-index: 10001;">
            <div class="mm-modal-content" style="width: 500px;">
                <div class="modal-header">
                    <h3 style="margin:0;">Pilih Icon</h3>
                    <span class="close-modal" id="close-picker">&times;</span>
                </div>
                <div style="padding:15px;">
                    <input type="text" id="icon-search" class="input-field" placeholder="Cari icon (ex: user, book)..." style="margin-bottom:15px;">
                    <div id="icon-grid" class="icon-grid"></div>
                </div>
            </div>
        </div>

        <div id="modal-cat" class="mm-modal">
            <div class="mm-modal-content" style="width: 450px;">
                <div class="modal-header">
                    <h3 style="margin:0;">Kategori Menu</h3>
                    <span class="close-modal" id="close-cat">&times;</span>
                </div>
                <div style="padding:15px;">
                    <div class="cat-form-box">
                        <h4 id="cat-form-title" style="margin:0 0 10px 0; color:#666;">Tambah Baru</h4>
                        <input type="hidden" id="cat-id">
                        <input type="text" id="cat-title" placeholder="Nama Kategori" class="input-field" style="margin-bottom:10px;">
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="cat-key" placeholder="Key (unik)" class="input-field">
                            <input type="number" id="cat-order" value="1" class="input-field" style="width:70px;">
                        </div>
                        <select id="cat-target" class="input-field" style="margin-bottom:10px;">
                            <option value="admin_v2">Admin V2</option>
                            <option value="all">Semua App</option>
                        </select>
                        <div style="display:flex; justify-content:flex-end; gap:10px;">
                            <button id="btn-reset-cat" style="display:none; color:red; background:none; border:none; cursor:pointer;">Batal</button>
                            <button id="btn-save-cat" class="mm-btn-action mm-bg-blue">Simpan</button>
                        </div>
                    </div>
                    <div id="cat-list-container" class="cat-list-box"></div>
                </div>
            </div>
        </div>
    `;

    // 3. BIND EVENTS (Pastikan DOM sudah ada)
    bindEvents();
    
    // 4. LOAD DATA
    renderIconGrid();
    await loadData();
}

// ==========================================
// 2. CSS STYLING
// ==========================================
function injectStyles() {
    if (document.getElementById('menu-manager-css')) return;
    const style = document.createElement('style');
    style.id = 'menu-manager-css';
    style.textContent = `
        /* UTILS */
        .hide-mobile { display: inline; }
        @media (max-width: 600px) { .hide-mobile { display: none; } }
        
        .mm-toolbar { 
            background: white; padding: 15px 20px; border-radius: 12px; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-bottom: 25px;
            display: flex; justify-content: space-between; align-items: center;
        }

        /* GRID & CARDS */
        .mm-grid { display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); margin-bottom: 25px; }
        
        .mm-card { 
            background: white; border-radius: 12px; padding: 15px; 
            border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02); transition: all 0.2s; cursor: pointer;
            position: relative;
        }
        .mm-card:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.08); border-color: #4d97ff; }
        
        .mm-icon-box { 
            width: 45px; height: 45px; background: #eff6ff; color: #4d97ff; 
            border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
        }
        .mm-content { flex: 1; overflow: hidden; }
        .mm-title { font-weight: 700; color: #334155; font-size: 1rem; margin-bottom: 3px; }
        .mm-meta { font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ACTIONS (Floating) */
        .mm-actions { display: flex; gap: 5px; }
        .btn-mini { width: 30px; height: 30px; border-radius: 6px; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .btn-mini.edit:hover { background: #ffab19; color: white; border-color: #ffab19; }
        .btn-mini.del:hover { background: #ef4444; color: white; border-color: #ef4444; }

        /* MODAL */
        .mm-modal { display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); backdrop-filter: blur(3px); justify-content: center; align-items: center; }
        .mm-modal-content { background-color: #fff; border-radius: 12px; width: 500px; max-width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: popIn 0.3s; display: flex; flex-direction: column; max-height: 90vh; }
        @keyframes popIn { from {transform: scale(0.9); opacity: 0;} to {transform: scale(1); opacity: 1;} }
        
        .modal-header { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 20px; overflow-y: auto; }
        .modal-footer { padding: 15px 20px; border-top: 1px solid #eee; background: #f8fafc; border-radius: 0 0 12px 12px; }
        .close-modal { font-size: 1.5rem; cursor: pointer; color: #999; }
        .close-modal:hover { color: #333; }

        /* FORM ELEMENTS */
        .form-group { margin-bottom: 15px; }
        .form-row { display: flex; gap: 10px; }
        .input-field { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; }
        .input-field:focus { border-color: #4d97ff; outline: none; box-shadow: 0 0 0 3px rgba(77, 151, 255, 0.1); }
        .mm-checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .mm-checkbox-item { font-size: 0.85rem; display: flex; align-items: center; gap: 5px; cursor: pointer; }

        /* BUTTONS */
        .mm-btn-action { border: none; padding: 10px 15px; border-radius: 8px; color: white; font-weight: bold; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
        .mm-bg-blue { background: #4d97ff; } .mm-bg-blue:hover { background: #2563eb; }
        .mm-bg-yellow { background: #ffab19; color: #333; } .mm-bg-yellow:hover { background: #e69500; }
        .mm-bg-red { background: #ef4444; }

        /* ICON PICKER GRID */
        .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto; margin-top: 10px; }
        .icon-item { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border: 1px solid #eee; border-radius: 8px; cursor: pointer; font-size: 1.2rem; color: #555; transition: 0.2s; }
        .icon-item:hover { background: #e0f2fe; color: #4d97ff; border-color: #4d97ff; transform: scale(1.1); }
        .icon-preview-box { width: 42px; height: 42px; background: #eee; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #555; }

        /* CATEGORY LIST */
        .cat-list-box { max-height: 250px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; background: white; }
        .cat-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f1f5f9; }
        .cat-item:last-child { border-bottom: none; }
        .cat-form-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e2e8f0; }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOAD DATA
// ==========================================
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
        
    } catch (e) {
        console.error("Load Data Error:", e);
        document.getElementById('menu-list-container').innerHTML = '<p style="color:red; text-align:center;">Gagal memuat data.</p>';
    }
}

function renderLevelCheckboxes() {
    const container = document.getElementById('container-cb-levels');
    container.innerHTML = allLevels.map(l => `
        <label class="mm-checkbox-item"><input type="checkbox" class="cb-level" value="${l.id}"> ${l.kode}</label>
    `).join('');
}

function renderCategoryOptions() {
    const select = document.getElementById('menu-category');
    select.innerHTML = '<option value="">-- Pilih Kategori --</option>' + 
        allCategories.map(c => `<option value="${c.id}">${c.title} (${c.target_app})</option>`).join('');
}

// ==========================================
// 4. RENDER MENU LIST
// ==========================================
function renderMenuList() {
    const container = document.getElementById('menu-list-container');
    container.innerHTML = '';

    allCategories.forEach(cat => {
        const items = allMenus.filter(m => m.category === cat.id);
        if (items.length === 0) return;

        // Header Kategori
        container.innerHTML += `
            <div style="margin-top:20px; margin-bottom:10px; padding-bottom:5px; border-bottom:2px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin:0; text-transform:uppercase; color:#64748b; font-size:0.85rem; letter-spacing:1px;">
                    ${cat.title} <span style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-size:0.7rem;">${cat.target_app}</span>
                </h4>
            </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'mm-grid';

        items.forEach(m => {
            const card = document.createElement('div');
            card.className = 'mm-card';
            
            // Render Card Content
            card.innerHTML = `
                <div class="mm-icon-box"><i class="${m.icon_class || 'fa-solid fa-cube'}"></i></div>
                <div class="mm-content">
                    <div class="mm-title">${m.title}</div>
                    <div class="mm-meta">Route: ${m.route}</div>
                    <div style="margin-top:5px; font-size:0.75rem;">
                        ${m.is_active ? '<span style="color:green;">● Aktif</span>' : '<span style="color:red;">● Mati</span>'} 
                        | Urutan: ${m.order_index}
                    </div>
                </div>
                <div class="mm-actions">
                    <button class="btn-mini edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-mini del" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            // Event Listeners (Prevent Bubbling)
            const btnEdit = card.querySelector('.edit');
            const btnDel = card.querySelector('.del');

            btnEdit.onclick = (e) => { e.stopPropagation(); openMenuModal(m.id); };
            btnDel.onclick = (e) => { e.stopPropagation(); deleteMenu(m.id); };
            
            // Klik kartu juga membuka edit
            card.onclick = () => openMenuModal(m.id);

            grid.appendChild(card);
        });
        container.appendChild(grid);
    });
}

// ==========================================
// 5. ICON PICKER LOGIC
// ==========================================
function renderIconGrid(filter = "") {
    const container = document.getElementById('icon-grid');
    container.innerHTML = "";
    const term = filter.toLowerCase();
    
    iconLibrary.forEach(icon => {
        if (icon.includes(term)) {
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

// ==========================================
// 6. FORM LOGIC (ADD/EDIT)
// ==========================================
function openMenuModal(id = null) {
    const modal = document.getElementById('modal-menu');
    const title = document.getElementById('modal-title');
    
    // Reset Form
    document.getElementById('menu-id').value = '';
    document.getElementById('menu-title').value = '';
    document.getElementById('menu-route').value = '';
    document.getElementById('menu-order').value = 1;
    document.getElementById('menu-category').value = '';
    document.getElementById('menu-icon').value = '';
    document.getElementById('icon-preview').className = 'fa-solid fa-cube';
    document.querySelectorAll('.cb-role').forEach(cb => cb.checked = false);
    document.querySelectorAll('.cb-level').forEach(cb => cb.checked = false);
    document.getElementById('menu-active').checked = true;

    if (id) {
        // Mode EDIT: Isi data
        const m = allMenus.find(x => x.id === id);
        if (m) {
            title.textContent = "Edit Menu";
            document.getElementById('menu-id').value = m.id;
            document.getElementById('menu-title').value = m.title;
            document.getElementById('menu-route').value = m.route;
            document.getElementById('menu-order').value = m.order_index;
            document.getElementById('menu-category').value = m.category;
            document.getElementById('menu-icon').value = m.icon_class;
            document.getElementById('icon-preview').className = m.icon_class || 'fa-solid fa-cube';
            document.getElementById('menu-active').checked = m.is_active;

            // Parse JSONB Roles & Levels
            let roles = [];
            try { roles = typeof m.allowed_roles === 'string' ? JSON.parse(m.allowed_roles) : m.allowed_roles; } catch(e){}
            document.querySelectorAll('.cb-role').forEach(cb => cb.checked = roles?.includes(cb.value));

            let levels = [];
            try { levels = typeof m.allowed_level_ids === 'string' ? JSON.parse(m.allowed_level_ids) : m.allowed_level_ids; } catch(e){}
            document.querySelectorAll('.cb-level').forEach(cb => cb.checked = levels?.includes(cb.value));
        }
    } else {
        title.textContent = "Tambah Menu Baru";
    }

    modal.style.display = 'flex'; // Gunakan Flex agar centered
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

    if(!payload.title || !payload.route || !payload.category) return alert("Judul, Route, dan Kategori wajib diisi!");

    const btn = document.getElementById('btn-save-menu');
    btn.textContent = "Menyimpan..."; btn.disabled = true;

    const { error } = id 
        ? await supabase.from('app_menus').update(payload).eq('id', id)
        : await supabase.from('app_menus').insert([payload]);

    if(error) alert("Error: " + error.message);
    else {
        toggleModal('modal-menu', false);
        loadData();
    }
    btn.textContent = "Simpan Data"; btn.disabled = false;
}

async function deleteMenu(id) {
    if(confirm("Yakin hapus menu ini?")) {
        await supabase.from('app_menus').delete().eq('id', id);
        loadData();
    }
}

// ==========================================
// 7. CATEGORY LOGIC
// ==========================================
function renderCategoryList() {
    const container = document.getElementById('cat-list-container');
    container.innerHTML = allCategories.map(c => `
        <div class="cat-item">
            <div>
                <strong>${c.title}</strong> <small>(${c.category_key})</small>
                <div style="font-size:0.75rem; color:#666;">Urutan: ${c.order_index} | App: ${c.target_app}</div>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="btn-mini edit" onclick="window.editCat('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-mini del" onclick="window.delCat('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// Global functions for inline onclick in category list
window.editCat = (id) => {
    const c = allCategories.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cat-id').value = c.id;
    document.getElementById('cat-title').value = c.title;
    document.getElementById('cat-key').value = c.category_key;
    document.getElementById('cat-order').value = c.order_index;
    document.getElementById('cat-target').value = c.target_app;
    
    document.getElementById('cat-form-title').textContent = "Edit Kategori";
    document.getElementById('btn-save-cat').textContent = "Update";
    document.getElementById('btn-reset-cat').style.display = "block";
};

window.delCat = async (id) => {
    if(confirm("Hapus kategori? Semua menu di dalamnya akan ikut terhapus!")) {
        await supabase.from('menu_categories').delete().eq('id', id);
        loadData();
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

    if(!payload.title || !payload.category_key) return alert("Data kategori tidak lengkap!");

    const { error } = id
        ? await supabase.from('menu_categories').update(payload).eq('id', id)
        : await supabase.from('menu_categories').insert([payload]);

    if(error) alert("Error: " + error.message);
    else {
        resetCatForm();
        loadData();
    }
}

function resetCatForm() {
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-title').value = '';
    document.getElementById('cat-key').value = '';
    document.getElementById('cat-order').value = 1;
    document.getElementById('cat-form-title').textContent = "Tambah Baru";
    document.getElementById('btn-save-cat').textContent = "Simpan";
    document.getElementById('btn-reset-cat').style.display = "none";
}

// ==========================================
// 8. BIND EVENTS
// ==========================================
function bindEvents() {
    // Modal Toggles
    document.getElementById('btn-add-menu').onclick = () => openMenuModal();
    document.getElementById('close-menu-modal').onclick = () => toggleModal('modal-menu', false);
    
    document.getElementById('btn-manage-cat').onclick = () => toggleModal('modal-cat', true);
    document.getElementById('close-cat').onclick = () => toggleModal('modal-cat', false);
    
    document.getElementById('btn-open-picker').onclick = () => toggleModal('modal-icon-picker', true);
    document.getElementById('close-picker').onclick = () => toggleModal('modal-icon-picker', false);

    // Save Actions
    document.getElementById('btn-save-menu').onclick = saveMenu;
    document.getElementById('btn-save-cat').onclick = saveCategory;
    document.getElementById('btn-reset-cat').onclick = resetCatForm;

    // Search Icon
    document.getElementById('icon-search').onkeyup = (e) => renderIconGrid(e.target.value);
    
    // Close modal on outside click
    window.onclick = (e) => {
        if (e.target.classList.contains('mm-modal')) {
            e.target.style.display = 'none';
        }
    };
}

function toggleModal(id, show) {
    const el = document.getElementById(id);
    if(show) el.style.display = 'flex';
    else el.style.display = 'none';
}