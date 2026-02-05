/**
 * Project: User Management Module (SPA)
 * Description: Modul manajemen user dengan CSS Injection yang benar (ke Head) dan Tampilan Compact.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// URL Edge Function (Sesuaikan jika URL project Bapak berbeda)
const EDGE_URL = 'https://aedtrwpomswdqxarvsrg.supabase.co/functions/v1/add-user';

// State Global Modul
let allUsers = [];
let allLevels = [];
let currentUserId = null; 
let loggedInUserRole = null;

// ==========================================
// 1. INITIALIZATION (Entry Point)
// ==========================================

export async function init(canvas) {
    // 1. Inject CSS ke HEAD (Supaya tidak terhapus saat render ulang)
    injectStyles();

    // 2. Render Skeleton HTML
    canvas.innerHTML = `
        <div class="um-container">
            
            <div class="um-header">
                <div>
                    <h2>User Management</h2>
                    <p>Kelola Akun, Mapping Area, dan Level Guru</p>
                </div>
                <div class="um-search-box">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" id="searchUser" placeholder="Cari nama atau email...">
                </div>
            </div>

            <div class="um-tabs">
                <button class="tab-btn active" id="tab-reg"><i class="fa-solid fa-user-plus"></i> Registrasi</button>
                <button class="tab-btn" id="tab-scope"><i class="fa-solid fa-map-location-dot"></i> Mapping Area</button>
                <button class="tab-btn" id="tab-teacher"><i class="fa-solid fa-chalkboard-user"></i> Level Guru</button>
            </div>

            <div id="reg-user-content" class="tab-panel active">
                
                <div class="form-compact-wrapper">
                    <div class="form-compact-grid">
                        <input type="hidden" id="userId">
                        
                        <div class="form-group">
                            <label>Nama Lengkap</label>
                            <input type="text" id="fullName" placeholder="Nama User">
                        </div>
                        <div class="form-group">
                            <label>Email Login</label>
                            <input type="email" id="email" placeholder="email@sekolah.com">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="password" placeholder="(Min. 6 Karakter)">
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <select id="role">
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="pic">PIC/Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>
                        <div class="action-group">
                            <button class="btn-compact save" id="btn-save-user">
                                <i class="fa-solid fa-save"></i> Simpan
                            </button>
                            <button class="btn-compact cancel" id="btn-cancel" style="display:none;">Batal</button>
                        </div>
                    </div>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th width="25%">Nama</th>
                                <th width="30%">Email</th>
                                <th width="15%">Role</th>
                                <th width="30%" style="text-align:right;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="user-table-body">
                            <tr><td colspan="4" class="loading-cell">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="scope-content" class="tab-panel" style="display:none;">
                <div class="info-box">
                    <i class="fa-solid fa-info-circle"></i> 
                    <span><strong>Mapping Area:</strong> Tentukan sekolah atau kelas mana yang menjadi milik user ini.</span>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nama User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Wilayah/Scope</th>
                                <th style="text-align:right;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="scope-table-body"></tbody>
                    </table>
                </div>
            </div>

            <div id="teacher-content" class="tab-panel" style="display:none;">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nama Guru</th>
                                <th>Email</th>
                                <th>Level Mengajar</th>
                                <th style="text-align:right;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="teacher-table-body"></tbody>
                    </table>
                </div>
            </div>

        </div>

        <div id="modal-scope" class="mm-modal">
            <div class="mm-modal-content">
                <div class="mm-modal-header">
                    <h3 id="modal-scope-title">Atur Akses</h3>
                    <span id="btn-close-modal">&times;</span>
                </div>
                <div id="modal-body-content" class="mm-modal-body"></div>
                <div id="modal-footer-content" class="mm-modal-footer"></div>
            </div>
        </div>

        <div id="toast" class="toast" style="display:none;"></div>
    `;

    // 3. Logic & Event Binding
    await setupLogic();
}

/**
 * Menyuntikkan CSS ke document.head agar permanen
 */
function injectStyles() {
    const styleId = 'user-management-css';
    if (document.getElementById(styleId)) return; // Cegah duplikasi

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* --- CONTAINER UTAMA --- */
        .um-container { max-width: 1200px; margin: 0 auto; padding-bottom: 80px; font-family: 'Roboto', sans-serif; }

        /* --- HEADER & SEARCH --- */
        .um-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
        .um-header h2 { margin: 0; font-family: 'Fredoka One', cursive; color: #333; font-size: 1.8rem; letter-spacing: 0.5px; }
        .um-header p { margin: 5px 0 0 0; color: #64748b; font-size: 0.9rem; }
        
        .um-search-box { position: relative; width: 100%; max-width: 300px; }
        .um-search-box i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .um-search-box input { width: 100%; padding: 10px 10px 10px 38px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; transition: 0.2s; }
        .um-search-box input:focus { border-color: #4d97ff; outline: none; box-shadow: 0 0 0 3px rgba(77,151,255,0.1); }

        /* --- TABS --- */
        .um-tabs { display: flex; gap: 5px; border-bottom: 2px solid #e2e8f0; margin-bottom: 25px; overflow-x: auto; }
        .tab-btn { background: none; border: none; padding: 12px 20px; cursor: pointer; font-weight: 600; color: #64748b; font-size: 0.95rem; border-bottom: 3px solid transparent; transition: 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
        .tab-btn:hover { color: #4d97ff; background: #f8fafc; border-radius: 8px 8px 0 0; }
        .tab-btn.active { color: #4d97ff; border-bottom-color: #4d97ff; }

        /* --- INFO BOX --- */
        .info-box { background: #eff6ff; border: 1px solid #dbeafe; color: #1e40af; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 10px; }

        /* --- FORM COMPACT --- */
        .form-compact-wrapper { background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); margin-bottom: 30px; border-left: 5px solid #4d97ff; }
        .form-compact-grid { display: grid; grid-template-columns: 1.5fr 1.5fr 1.2fr 1fr auto; gap: 15px; align-items: end; }
        .form-group label { font-size: 0.75rem; font-weight: 700; margin-bottom: 6px; display: block; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        .form-group input, .form-group select { width: 100%; padding: 0 12px; height: 42px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; background: #f8fafc; color: #334155; transition: all 0.2s; }
        .form-group input:focus, .form-group select:focus { border-color: #4d97ff; background: #fff; box-shadow: 0 0 0 3px rgba(77,151,255,0.1); outline: none; }
        
        .action-group { display: flex; gap: 8px; }
        .btn-compact { height: 42px; padding: 0 20px; font-size: 0.9rem; border-radius: 6px; cursor: pointer; font-weight: 600; border: none; display: flex; align-items: center; gap: 8px; transition: 0.2s; justify-content: center; }
        .btn-compact.save { background: #4d97ff; color: white; box-shadow: 0 2px 4px rgba(77,151,255,0.2); }
        .btn-compact.save:hover { background: #2563eb; transform: translateY(-1px); }
        .btn-compact.cancel { background: #f1f5f9; color: #64748b; }
        .btn-compact.cancel:hover { background: #e2e8f0; color: #334155; }

        /* --- TABLE --- */
        .table-container { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow-x: auto; border: 1px solid #e2e8f0; }
        .data-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .data-table th { background: #f8fafc; text-align: left; padding: 16px 20px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .data-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 0.9rem; vertical-align: middle; }
        .data-table tr:hover { background: #f8fafc; }
        .data-table tr:last-child td { border-bottom: none; }
        .loading-cell { text-align: center; color: #94a3b8; font-style: italic; padding: 30px; }

        /* --- BADGES --- */
        .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; }
        .badge.super_admin { background: #fee2e2; color: #991b1b; }
        .badge.teacher { background: #dbeafe; color: #1e40af; }
        .badge.student { background: #dcfce7; color: #166534; }
        .badge.pic { background: #fef3c7; color: #92400e; }

        /* --- MODAL --- */
        .mm-modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); animation: fadeIn 0.2s; }
        .mm-modal-content { background-color: #fff; margin: 8vh auto; border-radius: 16px; width: 500px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; }
        .mm-modal-header { padding: 20px 25px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .mm-modal-header h3 { margin: 0; font-size: 1.1rem; color: #334155; }
        .mm-modal-header span { font-size: 1.5rem; cursor: pointer; color: #94a3b8; transition: 0.2s; }
        .mm-modal-header span:hover { color: #ef4444; }
        .mm-modal-body { padding: 25px; }
        .mm-modal-footer { padding: 20px 25px; border-top: 1px solid #e2e8f0; text-align: right; background: #f8fafc; }

        /* --- TOAST --- */
        .toast { position: fixed; bottom: 30px; right: 30px; background: #1e293b; color: #fff; padding: 12px 24px; border-radius: 8px; z-index: 10000; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; gap: 10px; animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .toast.error { background: #ef4444; }

        /* --- ANIMATIONS --- */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        /* --- RESPONSIVE --- */
        @media (max-width: 1024px) { 
            .form-compact-grid { grid-template-columns: 1fr 1fr; } 
            .action-group { grid-column: span 2; justify-content: flex-end; } 
        }
        @media (max-width: 640px) { 
            .form-compact-grid { grid-template-columns: 1fr; gap: 10px; } 
            .action-group { grid-column: span 1; width: 100%; }
            .btn-compact { width: 100%; }
            .um-header { flex-direction: column; align-items: flex-start; }
            .um-search-box { max-width: 100%; }
            .data-table th, .data-table td { padding: 12px 15px; }
        }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 2. LOGIC & EVENTS
// ==========================================

async function setupLogic() {
    // 1. Ambil Data User Login & Role
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id || null;
    
    // Cek Role di DB (Lebih aman)
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', currentUserId).single();
    loggedInUserRole = profile?.role || 'student';

    // 2. Security Guard
    if (loggedInUserRole !== 'super_admin' && loggedInUserRole !== 'teacher' && loggedInUserRole !== 'pic') {
        document.getElementById('reg-user-content').innerHTML = `
            <div style="padding:40px; text-align:center; color:#ef4444; background:white; border-radius:12px; border:1px solid #fecaca;">
                <i class="fa-solid fa-ban" style="font-size:3rem; margin-bottom:15px;"></i>
                <h3>Akses Ditolak</h3>
                <p>Anda tidak memiliki izin mengelola user.</p>
            </div>`;
        return;
    }

    // 3. UI Adjustments based on Role
    if (loggedInUserRole !== 'super_admin') {
        document.getElementById('tab-teacher').style.display = 'none'; // Sembunyikan tab level guru
        const roleSelect = document.getElementById('role');
        if (roleSelect) {
            // Hapus opsi super_admin jika bukan super_admin
            for (let i = 0; i < roleSelect.options.length; i++) {
                if (roleSelect.options[i].value === 'super_admin') {
                    roleSelect.remove(i);
                    break;
                }
            }
        }
    }

    // 4. Initial Fetch
    await fetchLevels();
    await fetchUsers();

    // 5. Setup Events
    setupEvents();
}

function setupEvents() {
    // Tabs Navigation
    const tabs = ['reg', 'scope', 'teacher'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(btn) btn.onclick = () => switchTab(t);
    });

    // Form Events
    document.getElementById('btn-save-user').onclick = saveUser;
    document.getElementById('btn-cancel').onclick = resetForm;
    document.getElementById('searchUser').oninput = renderRegTable;

    // Table Delegation (Edit/Delete)
    document.getElementById('user-table-body').onclick = handleUserTableClick;
    document.getElementById('scope-table-body').onclick = handleScopeTableClick;
    document.getElementById('teacher-table-body').onclick = handleTeacherTableClick;

    // Modal Events
    document.getElementById('btn-close-modal').onclick = closeModal;
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    let contentId = '';
    if (tabName === 'reg') contentId = 'reg-user-content';
    if (tabName === 'scope') contentId = 'scope-content';
    if (tabName === 'teacher') contentId = 'teacher-content';

    const panel = document.getElementById(contentId);
    if(panel) panel.style.display = 'block';
    
    const btn = document.getElementById(`tab-${tabName}`);
    if(btn) btn.classList.add('active');
}

// ==========================================
// 3. DATA FETCHING
// ==========================================

async function fetchLevels() {
    const { data } = await supabase.from('levels').select('id, kode').order('kode');
    if (data) allLevels = data;
}

async function fetchUsers() {
    const { data, error } = await supabase
        .from('user_profiles')
        .select(`
            id, name, role, email, is_active, school_id, class_id, group_id, class_private_id, level_id,
            schools(name), group_private(code), classes(name), class_private(name), levels(kode) 
        `);

    if (error) return showToast("Gagal sinkron: " + error.message, true);

    allUsers = data.map(u => ({
        ...u,
        email: u.email || "(Belum Sinkron)",
        role: u.role || "student",
        displayScope: formatScopeText(u),
        levelName: Array.isArray(u.levels) ? u.levels[0]?.kode : u.levels?.kode || "-"
    }));

    renderRegTable(); 
    renderScopeTable(); 
    if (loggedInUserRole === 'super_admin') renderTeacherTable(); 
}

function formatScopeText(u) {
    const getVal = (obj, prop) => (Array.isArray(obj) ? obj[0]?.[prop] : obj?.[prop]);
    if (u.role === 'pic') {
        const instansi = getVal(u.schools, 'name') || getVal(u.group_private, 'code') || "Belum diatur";
        return `<strong style="color:#0f172a;">${instansi}</strong>`;
    } else if (u.role === 'student') {
        const instansi = getVal(u.schools, 'name') || getVal(u.group_private, 'code');
        const unit = getVal(u.classes, 'name') || getVal(u.class_private, 'name') || "Belum diatur";
        return instansi ? `${instansi} <i class="fa-solid fa-chevron-right" style="font-size:0.7em; color:#94a3b8; margin:0 5px;"></i> ${unit}` : '<span style="color:#94a3b8; font-style:italic;">Belum diatur</span>';
    }
    return "-";
}

// ==========================================
// 4. RENDERING TABLES
// ==========================================

function renderRegTable() {
    const search = document.getElementById('searchUser').value.toLowerCase();
    const tbody = document.getElementById('user-table-body');
    
    const filtered = allUsers.filter(u => {
        // Filter Privasi: Guru tidak bisa lihat Super Admin
        if (loggedInUserRole === 'teacher' && u.role === 'super_admin') return false;
        
        return (u.name?.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8;">Tidak ditemukan data yang cocok.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        let actionButtons = '';
        if (loggedInUserRole === 'super_admin') {
            actionButtons = `
                <button class="btn-compact save btn-edit" data-id="${u.id}" style="height:34px; padding:0 12px; background:#fff; border:1px solid #e2e8f0; color:#333; box-shadow:none;">
                    <i class="fa-solid fa-pen" style="color:#f59e0b;"></i> Edit
                </button>
                <button class="btn-compact cancel btn-delete" data-id="${u.id}" style="height:34px; padding:0 12px; background:#fff; border:1px solid #fee2e2; color:#ef4444;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
        } else {
            // Guru hanya bisa edit
            actionButtons = `
                <button class="btn-compact save btn-edit" data-id="${u.id}" style="height:34px; background:#fff; border:1px solid #e2e8f0; color:#333; box-shadow:none;">Edit</button>
            `;
        }

        const opacity = u.is_active ? '1' : '0.5';
        const bgRow = u.is_active ? '' : 'background:#fef2f2;';

        return `
            <tr style="${bgRow} opacity:${opacity};">
                <td>
                    <div style="font-weight:600; color:#1e293b;">${u.name || '-'}</div>
                    ${!u.is_active ? '<div style="color:#ef4444; font-size:0.75rem; font-weight:bold; margin-top:2px;">NON-AKTIF</div>' : ''}
                </td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role}">${u.role.replace('_', ' ')}</span></td>
                <td style="text-align:right; display:flex; justify-content:flex-end; gap:8px;">${actionButtons}</td>
            </tr>`;
    }).join('');
}

function renderScopeTable() {
    const tbody = document.getElementById('scope-table-body');
    const scopeUsers = allUsers.filter(u => u.role === 'pic' || u.role === 'student');
    
    if (scopeUsers.length === 0) return tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">Belum ada data PIC/Siswa.</td></tr>';

    tbody.innerHTML = scopeUsers.map(u => `
        <tr>
            <td style="font-weight:600;">${u.name || '-'}</td>
            <td>${u.email}</td>
            <td><span class="badge ${u.role}">${u.role}</span></td>
            <td>${u.displayScope}</td>
            <td style="text-align:right;">
                <button class="btn-compact save btn-set-scope" data-id="${u.id}" style="display:inline-flex; height:34px; font-size:0.8rem;">
                    <i class="fa-solid fa-gear"></i> Mapping
                </button>
            </td>
        </tr>`).join('');
}

function renderTeacherTable() {
    const tbody = document.getElementById('teacher-table-body');
    const teachers = allUsers.filter(u => u.role === 'teacher');

    if (teachers.length === 0) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8;">Tidak ada data Guru.</td></tr>';

    tbody.innerHTML = teachers.map(u => `
        <tr>
            <td style="font-weight:600;">${u.name || '-'}</td>
            <td>${u.email}</td>
            <td><span style="font-weight:bold; color:#4d97ff; background:#eff6ff; padding:4px 8px; border-radius:4px;">${u.levelName}</span></td>
            <td style="text-align:right;">
                <button class="btn-compact save btn-set-level" data-id="${u.id}" style="display:inline-flex; height:34px; font-size:0.8rem;">
                    <i class="fa-solid fa-layer-group"></i> Level
                </button>
            </td>
        </tr>`).join('');
}

// ==========================================
// 5. ACTIONS (CRUD)
// ==========================================

async function saveUser() {
    const id = document.getElementById('userId').value;
    const name = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    if (!email || (!id && !password) || !name) return showToast("Nama, Email & Password wajib diisi!", true);

    const btn = document.getElementById('btn-save-user');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    try {
        const response = await fetch(EDGE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({ action: id ? 'UPDATE' : 'CREATE', userId: id, name, email, password, role })
        });

        if (response.ok) { 
            showToast("User berhasil disimpan"); 
            resetForm(); 
            await fetchUsers(); 
        } else { 
            const msg = await response.text();
            showToast("Gagal: " + msg, true); 
        }
    } catch (e) { 
        showToast("Kesalahan Koneksi", true); 
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteUser(id) {
    if (!confirm("Hapus user ini PERMANEN dari database?")) return;
    
    showToast("Menghapus user...");
    try {
        const response = await fetch(EDGE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({ action: 'DELETE', userId: id })
        });
        if (response.ok) { showToast("User terhapus"); await fetchUsers(); }
        else { showToast("Gagal menghapus", true); }
    } catch (e) { showToast("Error sistem", true); }
}

function handleUserTableClick(e) {
    const target = e.target.closest('button');
    if (!target) return;
    const id = target.dataset.id;

    if (target.classList.contains('btn-edit')) {
        const u = allUsers.find(user => user.id === id);
        if (u) {
            document.getElementById('userId').value = u.id;
            document.getElementById('fullName').value = u.name || '';
            document.getElementById('email').value = u.email;
            document.getElementById('role').value = u.role;
            document.getElementById('password').placeholder = "(Kosongkan jika tidak ubah)";
            
            document.getElementById('btn-save-user').innerHTML = '<i class="fa-solid fa-check"></i> Update';
            document.getElementById('btn-cancel').style.display = 'inline-flex';
            
            // Scroll ke form
            document.querySelector('.form-compact-wrapper').scrollIntoView({behavior: 'smooth'});
        }
    }
    if (target.classList.contains('btn-delete')) {
        deleteUser(id);
    }
}

function resetForm() {
    document.getElementById('userId').value = '';
    document.getElementById('fullName').value = '';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('role').value = 'student';
    document.getElementById('password').placeholder = "(Min. 6 Karakter)";
    
    document.getElementById('btn-save-user').innerHTML = '<i class="fa-solid fa-save"></i> Simpan';
    document.getElementById('btn-cancel').style.display = 'none';
}

// ==========================================
// 6. MODAL HANDLERS
// ==========================================

function closeModal() {
    document.getElementById('modal-scope').style.display = 'none';
}

// --- SCOPE HANDLER ---
function handleScopeTableClick(e) {
    const target = e.target.closest('button');
    if (target && target.classList.contains('btn-set-scope')) {
        openScopeModal(target.dataset.id);
    }
}

async function openScopeModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('modal-scope-title').innerText = "Atur Mapping: " + (user.name || user.email);
    
    // Inject Form Scope ke Modal Body
    document.getElementById('modal-body-content').innerHTML = `
        <input type="hidden" id="modal-user-id" value="${user.id}">
        <input type="hidden" id="modal-user-role" value="${user.role}">
        <div style="margin-bottom:15px;">
            <label style="display:block; margin-bottom:8px; font-weight:bold; font-size:0.9rem;">Tipe Program</label>
            <select id="scope-type" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;">
                <option value="">-- Pilih Tipe --</option>
                <option value="sekolah">Jalur Sekolah</option>
                <option value="private">Jalur Private</option>
            </select>
        </div>
        <div style="margin-bottom:15px;">
            <label style="display:block; margin-bottom:8px; font-weight:bold; font-size:0.9rem;">Lembaga/Institusi</label>
            <select id="scope-induk" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;"><option value="">-- Pilih Tipe Dulu --</option></select>
        </div>
        <div id="group-scope-anak" style="margin-bottom:15px; display:${user.role === 'student' ? 'block' : 'none'};">
            <label style="display:block; margin-bottom:8px; font-weight:bold; font-size:0.9rem;">Unit/Kelas</label>
            <select id="scope-anak" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem;"><option value="">-- Pilih Lembaga Dulu --</option></select>
        </div>
    `;

    document.getElementById('modal-footer-content').innerHTML = `
        <button id="btn-do-save-scope" class="btn-compact save" style="display:inline-flex; width:auto; padding:0 20px;">Simpan Mapping</button>
    `;

    document.getElementById('modal-scope').style.display = 'block';

    // Bind Event di dalam modal
    document.getElementById('scope-type').onchange = (e) => handleScopeTypeChange(e.target.value);
    document.getElementById('scope-induk').onchange = (e) => handleScopeIndukChange(e.target.value);
    document.getElementById('btn-do-save-scope').onclick = saveScope;
}

async function handleScopeTypeChange(type) {
    const select = document.getElementById('scope-induk');
    select.innerHTML = '<option value="">-- Memuat... --</option>';
    if (type === 'sekolah') {
        const { data } = await supabase.from('schools').select('id, name').order('name');
        select.innerHTML = '<option value="">-- Pilih Sekolah --</option>' + data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    } else if (type === 'private') {
        const { data } = await supabase.from('group_private').select('id, code').order('code');
        select.innerHTML = '<option value="">-- Pilih Group --</option>' + data.map(d => `<option value="${d.id}">${d.code}</option>`).join('');
    }
}

async function handleScopeIndukChange(idInduk) {
    const role = document.getElementById('modal-user-role').value;
    const type = document.getElementById('scope-type').value;
    const select = document.getElementById('scope-anak');
    if (role !== 'student' || !idInduk) return;
    
    select.innerHTML = '<option value="">-- Memuat... --</option>';
    const table = type === 'sekolah' ? 'classes' : 'class_private';
    const filter = type === 'sekolah' ? 'school_id' : 'group_id';
    
    const { data } = await supabase.from(table).select('id, name').eq(filter, idInduk).order('name');
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>' + data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

async function saveScope() {
    const userId = document.getElementById('modal-user-id').value;
    const role = document.getElementById('modal-user-role').value;
    const type = document.getElementById('scope-type').value;
    const idInduk = document.getElementById('scope-induk').value;
    const idAnak = document.getElementById('scope-anak')?.value;

    if (!userId || !type || !idInduk) return showToast("Lengkapi data!", true);
    if (role === 'student' && !idAnak) return showToast("Siswa wajib pilih kelas!", true);
    
    showToast("Menyimpan mapping...");
    const payload = { 
        id: userId, 
        role: role, 
        school_id: type === 'sekolah' ? idInduk : null, 
        class_id: type === 'sekolah' ? (idAnak || null) : null, 
        group_id: type === 'private' ? idInduk : null, 
        class_private_id: type === 'private' ? (idAnak || null) : null 
    };
    
    const { error } = await supabase.from('user_profiles').upsert(payload, { onConflict: 'id' });
    if (error) showToast("Gagal: " + error.message, true); else { showToast("Mapping tersimpan!"); closeModal(); await fetchUsers(); }
}

// --- TEACHER LEVEL HANDLER ---
function handleTeacherTableClick(e) {
    const target = e.target.closest('button');
    if (target && target.classList.contains('btn-set-level')) {
        openLevelModal(target.dataset.id);
    }
}

function openLevelModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('modal-scope-title').innerText = "Atur Level Guru: " + (user.name || user.email);
    
    document.getElementById('modal-body-content').innerHTML = `
        <div class="form-group">
            <label style="font-weight:bold; margin-bottom:10px; display:block;">Pilih Level Mengajar</label>
            <select id="select-level-guru" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; font-size:0.9rem;">
                <option value="">-- Pilih Level --</option>
                ${allLevels.map(lvl => `
                    <option value="${lvl.id}" ${user.level_id === lvl.id ? 'selected' : ''}>${lvl.kode}</option>
                `).join('')}
            </select>
        </div>
    `;

    document.getElementById('modal-footer-content').innerHTML = `
        <button id="btn-do-save-level" class="btn-compact save" style="display:inline-flex; width:auto; padding:0 20px;">Simpan Level</button>
    `;

    document.getElementById('modal-scope').style.display = 'block';
    document.getElementById('btn-do-save-level').onclick = () => saveLevel(user.id);
}

async function saveLevel(userId) {
    const levelId = document.getElementById('select-level-guru').value;
    if (!levelId) return showToast("Pilih level terlebih dahulu!", true);
    
    showToast("Menyimpan level...");
    const { error } = await supabase.from('user_profiles').update({ level_id: levelId }).eq('id', userId);
    
    if (error) { showToast("Gagal: " + error.message, true); } 
    else { showToast("Level tersimpan!"); closeModal(); fetchUsers(); }
}

function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${msg}`;
    t.className = isError ? 'toast error' : 'toast';
    t.style.display = 'flex';
    setTimeout(() => t.style.display = 'none', 3000);
}