/**
 * Project: Private Registration Module (SPA)
 * Description: Manajemen Group Private, Kelas Private, dan Siswa Private.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Editing
let editingGroupId = null;
let editingClassId = null;
let editingStudentId = null;
let allSubLevels = [];

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Inject CSS
    injectStyles();

    // 2. Render Skeleton HTML
    canvas.innerHTML = `
        <div class="rp-container">
            
            <div class="rp-header">
                <div>
                    <h2>Registrasi Private</h2>
                    <p>Manajemen Group, Class, dan Students Private</p>
                </div>
            </div>

            <div class="rp-tabs">
                <button class="tab-btn active" id="tab-students"><i class="fas fa-user-graduate"></i> Students</button>
                <button class="tab-btn" id="tab-class"><i class="fas fa-chalkboard"></i> Class</button>
                <button class="tab-btn" id="tab-group"><i class="fas fa-users"></i> Group</button>
            </div>

            <div id="content-students" class="tab-panel active">
                <div class="form-card">
                    <h3 class="card-title">Form Siswa</h3>
                    <form id="form-students">
                        <div class="form-group">
                            <label>Nama Siswa</label>
                            <input type="text" id="student-name" class="form-input" placeholder="Nama Lengkap" required>
                        </div>
                        <div class="form-group">
                            <label>Pilih Kelas</label>
                            <select id="student-class" class="form-input" required>
                                <option value="">-- Memuat Kelas... --</option>
                            </select>
                        </div>
                        <div class="form-footer">
                            <button type="submit" id="btn-save-student" class="btn-primary">Simpan Siswa</button>
                            <button type="button" id="btn-cancel-student" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </form>
                </div>

                <div class="table-card">
                    <h3 class="card-title">Daftar Siswa Private</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr><th>Nama</th><th>Kelas</th><th width="90">Status</th><th>Aksi</th></tr></thead>
                            <tbody id="list-students"><tr><td colspan="4" class="loading">Memuat data...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="content-class" class="tab-panel" style="display:none;">
                <div class="form-card">
                    <h3 class="card-title">Form Kelas</h3>
                    <form id="form-class">
                        <div class="form-group">
                            <label>Nama Kelas</label>
                            <input type="text" id="class-name" class="form-input" placeholder="Contoh: Robotic A" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group half">
                                <label>Level</label>
                                <select id="class-level" class="form-input" required><option>Loading...</option></select>
                            </div>
                            <div class="form-group half">
                                <label>Sub-Level / Kit</label>
                                <select id="class-sub-level" class="form-input"><option value="">-- Pilih Sub-Level --</option></select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Group Induk</label>
                                <select id="class-group" class="form-input" required><option>Loading...</option></select>
                            </div>
                        </div>
                        <div class="form-footer">
                            <button type="submit" id="btn-save-class" class="btn-primary">Simpan Kelas</button>
                            <button type="button" id="btn-cancel-class" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </form>
                </div>

                <div class="table-card">
                    <h3 class="card-title">Daftar Kelas</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr><th>Nama Kelas</th><th>Level</th><th>Group</th><th width="90">Status</th><th>Aksi</th></tr></thead>
                            <tbody id="list-class"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="content-group" class="tab-panel" style="display:none;">
                <div class="form-card">
                    <h3 class="card-title">Form Group (Orang Tua/Instansi)</h3>
                    <form id="form-group-data">
                        <div class="form-row">
                            <div class="form-group half">
                                <label>Kode Group</label>
                                <input type="text" id="group-code" class="form-input" placeholder="CTH: GRP-01" required>
                            </div>
                            <div class="form-group half">
                                <label>Nama Owner/Ortu</label>
                                <input type="text" id="group-owner" class="form-input" placeholder="Nama Pemilik" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Alamat</label>
                            <textarea id="group-address" class="form-input" rows="2"></textarea>
                        </div>
                        <div class="form-footer">
                            <button type="submit" id="btn-save-group" class="btn-primary">Simpan Group</button>
                            <button type="button" id="btn-cancel-group" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </form>
                </div>

                <div class="table-card">
                    <h3 class="card-title">Daftar Group</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr><th>Kode</th><th>Owner</th><th>Alamat</th><th>Aksi</th></tr></thead>
                            <tbody id="list-group"></tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    `;

    // 3. Logic Setup
    await setupLogic();
}

// ==========================================
// 2. CSS STYLING
// ==========================================
function injectStyles() {
    const styleId = 'registrasi-private-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Container */
        .rp-container { max-width: 1000px; margin: 0 auto; font-family: 'Roboto', sans-serif; padding-bottom: 80px; }
        
        /* Header */
        .rp-header { margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
        .rp-header h2 { font-family: 'Fredoka One', cursive; color: #333; margin: 0; font-size: 1.8rem; }
        .rp-header p { color: #666; margin: 5px 0 0; }

        /* Tabs */
        .rp-tabs { display: flex; gap: 10px; margin-bottom: 25px; }
        .tab-btn { background: white; border: 1px solid #eee; padding: 12px 20px; font-weight: bold; color: #888; cursor: pointer; border-radius: 8px; transition: 0.3s; font-size: 0.95rem; flex: 1; display:flex; align-items:center; justify-content:center; gap:8px; }
        .tab-btn.active { background: #4d97ff; color: white; border-color: #4d97ff; box-shadow: 0 4px 10px rgba(77, 151, 255, 0.3); }
        .tab-btn:hover:not(.active) { background: #f9f9f9; }

        /* Cards */
        .form-card, .table-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eef2f6; }
        .card-title { margin-top: 0; margin-bottom: 20px; color: #4d97ff; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 10px; font-weight: 600; }

        /* Forms */
        .form-row { display: flex; gap: 20px; }
        .form-group { margin-bottom: 15px; width: 100%; }
        .form-group.half { width: 50%; }
        
        .form-group label { display: block; font-weight: bold; font-size: 0.85rem; color: #555; margin-bottom: 5px; }
        .form-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; transition: 0.2s; background: #fbfbfb; }
        .form-input:focus { border-color: #4d97ff; background: white; outline: none; box-shadow: 0 0 0 3px rgba(77,151,255,0.1); }

        /* Tables */
        .table-responsive { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .data-table th { background: #f0f7ff; color: #333; padding: 12px 15px; text-align: left; font-weight: bold; font-size: 0.9rem; border-bottom: 2px solid #e0e0e0; }
        .data-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #444; font-size: 0.9rem; }
        .data-table tr:hover { background: #fcfcfc; }
        .loading { text-align: center; color: #999; padding: 20px; font-style: italic; }

        /* Buttons & Actions */
        .form-footer { display: flex; gap: 10px; margin-top: 10px; }
        .btn-primary { background: #4d97ff; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
        .btn-secondary { background: #e2e8f0; color: #333; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        
        .action-btn { border: none; background: transparent; cursor: pointer; font-size: 1rem; padding: 5px; transition: 0.2s; margin-right: 5px; }
        .btn-edit { color: #f39c12; }
        .btn-del { color: #e74c3c; }
        .action-btn:hover { transform: scale(1.2); }

        /* Toggle Switch Status Siswa */
        .switch { position: relative; display: inline-block; width: 42px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 4px; bottom: 4px; background-color: white; transition: .3s; border-radius: 50%; }
        input:checked + .slider { background-color: #00b894; }
        input:checked + .slider:before { transform: translateX(20px); }

        /* Badge & Counter */
        .badge-inactive { padding: 2px 8px; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 10px; font-size: 0.68rem; font-weight: 700; margin-left: 6px; vertical-align: middle; white-space: nowrap; }
        .count-pill { float: right; background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; padding: 3px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .badge-level { display: inline-block; padding: 2px 8px; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; border-radius: 10px; font-size: 0.68rem; font-weight: 700; margin-left: 6px; vertical-align: middle; white-space: nowrap; }

        @media (max-width: 768px) { .form-row { flex-direction: column; gap: 0; } .form-group.half { width: 100%; } }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC & EVENTS
// ==========================================

async function setupLogic() {
    // Initial Load
    await loadGroups();
    await loadLevelsDropdown();
    await loadClasses();
    await loadStudents();

    // Tab Events
    const tabs = ['students', 'class', 'group'];
    tabs.forEach(t => {
        document.getElementById(`tab-${t}`).onclick = () => switchTab(t);
    });

    // Form Submits
    document.getElementById('form-group-data').onsubmit = handleSaveGroup;
    document.getElementById('form-class').onsubmit = handleSaveClass;
    document.getElementById('form-students').onsubmit = handleSaveStudent;

    // Cancel Buttons
    document.getElementById('btn-cancel-group').onclick = resetGroupForm;
    document.getElementById('btn-cancel-class').onclick = resetClassForm;
    document.getElementById('btn-cancel-student').onclick = resetStudentForm;

    // Event Delegation for Tables
    setupTableActions();
}

function switchTab(activeTab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`content-${activeTab}`).style.display = 'block';
    document.getElementById(`tab-${activeTab}`).classList.add('active');
}

function setupTableActions() {
    // Helper Delegation
    const addAction = (tableId, editFn, deleteFn) => {
        document.getElementById(tableId).addEventListener('click', (e) => {
            const btnEdit = e.target.closest('.btn-edit');
            const btnDel = e.target.closest('.btn-del');
            if (btnEdit) editFn(btnEdit.dataset.id);
            if (btnDel) deleteFn(btnDel.dataset.id);
        });
    };

    addAction('list-group', editGroup, deleteGroup);
    addAction('list-class', editClass, deleteClass);
    addAction('list-students', editStudent, deleteStudent);

    // Toggle Status Aktif/Non-Aktif Siswa (delegasi event 'change')
    document.getElementById('list-students').addEventListener('change', async (e) => {
        const cb = e.target.closest('.toggle-student-active');
        if (!cb) return;
        const id = cb.dataset.id;
        const status = cb.checked;
        cb.disabled = true; // Cegah spam klik saat proses
        const { error } = await supabase.from('students_private').update({ is_active: status }).eq('id', id);
        cb.disabled = false;
        if (error) {
            cb.checked = !status; // Revert UI jika gagal
            alert('Gagal mengubah status: ' + error.message);
            return;
        }
        loadStudents(); // Refresh baris + counter aktif
    });

    // Toggle Status Aktif/Non-Aktif KELAS Private (delegasi event 'change')
    document.getElementById('list-class').addEventListener('change', async (e) => {
        const cb = e.target.closest('.toggle-class-active');
        if (!cb) return;
        const id = cb.dataset.id;
        const status = cb.checked;
        cb.disabled = true; // Cegah spam klik saat proses
        const { error } = await supabase.from('class_private').update({ is_active: status }).eq('id', id);
        cb.disabled = false;
        if (error) {
            cb.checked = !status; // Revert UI jika gagal
            alert('Gagal mengubah status kelas: ' + error.message);
            return;
        }
        loadClasses(); // Refresh baris + dropdown siswa
    });
}

// ==========================================
// 4. GROUP LOGIC
// ==========================================

async function loadGroups() {
    const { data, error } = await supabase.from('group_private').select('*').order('code');
    
    // Render Table
    const tbody = document.getElementById('list-group');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Belum ada group</td></tr>';
    } else {
        tbody.innerHTML = data.map(g => `
            <tr>
                <td><span style="font-weight:bold; color:#4d97ff;">${g.code}</span></td>
                <td>${g.owner}</td>
                <td>${g.address || '-'}</td>
                <td>
                    <button class="action-btn btn-edit" data-id="${g.id}" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="action-btn btn-del" data-id="${g.id}" title="Hapus"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // Populate Dropdown for Class Form
    const select = document.getElementById('class-group');
    select.innerHTML = '<option value="">-- Pilih Group --</option>' + 
        data.map(g => `<option value="${g.id}">${g.code} - ${g.owner}</option>`).join('');
}

async function handleSaveGroup(e) {
    e.preventDefault();
    const payload = {
        code: document.getElementById('group-code').value.trim(),
        owner: document.getElementById('group-owner').value.trim(),
        address: document.getElementById('group-address').value.trim()
    };

    const { error } = editingGroupId 
        ? await supabase.from('group_private').update(payload).eq('id', editingGroupId)
        : await supabase.from('group_private').insert([payload]);

    if (!error) {
        alert('Group berhasil disimpan');
        resetGroupForm();
        loadGroups();
    } else alert(error.message);
}

async function editGroup(id) {
    const { data } = await supabase.from('group_private').select('*').eq('id', id).single();
    if(data) {
        document.getElementById('group-code').value = data.code;
        document.getElementById('group-owner').value = data.owner;
        document.getElementById('group-address').value = data.address || '';
        editingGroupId = id;
        document.getElementById('btn-save-group').textContent = 'Update Group';
        document.getElementById('btn-cancel-group').style.display = 'inline-block';
        window.scrollTo({top:0, behavior:'smooth'});
    }
}

async function deleteGroup(id) {
    if(!confirm("Hapus group ini?")) return;
    const { error } = await supabase.from('group_private').delete().eq('id', id);
    if(!error) loadGroups(); else alert(error.message);
}

function resetGroupForm() {
    document.getElementById('form-group-data').reset();
    editingGroupId = null;
    document.getElementById('btn-save-group').textContent = 'Simpan Group';
    document.getElementById('btn-cancel-group').style.display = 'none';
}

// ==========================================
// 5. CLASS LOGIC
// ==========================================

async function loadLevelsDropdown() {
    const { data: lvData } = await supabase.from('levels').select('id, kode').order('kode');
    const { data: subData } = await supabase.from('sub_levels').select('id, level_id, kode, name, kit_alat').order('name');
    allSubLevels = subData || [];

    const lvlSel = document.getElementById('class-level');
    lvlSel.innerHTML = '<option value="">-- Pilih Level --</option>' + 
        (lvData || []).map(l => `<option value="${l.id}">${l.kode}</option>`).join('');

    lvlSel.onchange = (e) => {
        populateSubLevelsDropdown(e.target.value);
    };
}

function populateSubLevelsDropdown(levelId, currentSubId = null) {
    const subSel = document.getElementById('class-sub-level');
    if (!subSel) return;
    const filtered = allSubLevels.filter(s => s.level_id === levelId);
    if (filtered.length === 0) {
        subSel.innerHTML = '<option value="">-- Tidak ada Sub-Level untuk Level ini --</option>';
        return;
    }
    subSel.innerHTML = '<option value="">-- Pilih Sub-Level --</option>' + 
        filtered.map(s => `<option value="${s.id}" ${currentSubId === s.id ? 'selected' : ''}>${s.name} ${s.kit_alat ? `[${s.kit_alat}]` : ''}</option>`).join('');
}

async function loadClasses() {
    const { data, error } = await supabase.from('class_private')
        .select('id, name, is_active, level_id, sub_level_id, group_id, group_private(code), levels(kode), sub_levels(name)')
        .order('name');

    const tbody = document.getElementById('list-class');
    if (error) {
        console.error('Load classes error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Gagal memuat data kelas.</td></tr>';
        return;
    }
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Belum ada kelas</td></tr>';
        return;
    }

    const activeCount = data.filter(c => c.is_active !== false).length;
    tbody.innerHTML = data.map(c => {
        const isActive = c.is_active !== false; // Data lama tanpa kolom dianggap aktif
        return `
            <tr${isActive ? '' : ' style="opacity:0.55; background:#f8fafc;"'}>
                <td style="font-weight:500;">${escapeHtml(c.name)}${isActive ? '' : '<span class="badge-inactive">Non-Aktif</span>'}</td>
                <td>
                    <span class="badge-level">${escapeHtml(c.levels?.kode || '-')}</span>
                    ${c.sub_levels?.name ? `<span class="badge-level" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">${escapeHtml(c.sub_levels.name)}</span>` : ''}
                </td>
                <td>${escapeHtml(c.group_private?.code || '-')}</td>
                <td>
                    <label class="switch" title="${isActive ? 'Klik untuk non-aktifkan' : 'Klik untuk aktifkan'}">
                        <input type="checkbox" class="toggle-class-active" data-id="${c.id}" ${isActive ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <button class="action-btn btn-edit" data-id="${c.id}"><i class="fas fa-pen"></i></button>
                    <button class="action-btn btn-del" data-id="${c.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    }).join('');

    // Counter ringkas di judul kartu
    const title = document.querySelector('#content-class .table-card .card-title');
    if (title) title.innerHTML = `Daftar Kelas <span class="count-pill">${activeCount}/${data.length} Aktif</span>`;

    // Populate Dropdown for Student Form
    // Kelas non-aktif tetap ditampilan bertanda agar edit siswa lama tidak rusak
    const select = document.getElementById('student-class');
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>' +
        data.map(c => {
            const isActive = c.is_active !== false;
            const tag = isActive ? '' : ' [Non-Aktif]';
            const subTag = c.sub_levels?.name ? ` - ${c.sub_levels.name}` : '';
            return `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.levels?.kode || '-')}${escapeHtml(subTag)})${tag}</option>`;
        }).join('');
}

async function handleSaveClass(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('class-name').value.trim(),
        level_id: document.getElementById('class-level').value,
        sub_level_id: document.getElementById('class-sub-level').value || null,
        group_id: document.getElementById('class-group').value
    };

    const { error } = editingClassId 
        ? await supabase.from('class_private').update(payload).eq('id', editingClassId)
        : await supabase.from('class_private').insert([payload]);

    if (!error) {
        alert('Kelas berhasil disimpan');
        resetClassForm();
        loadClasses();
    } else alert(error.message);
}

async function editClass(id) {
    const { data } = await supabase.from('class_private').select('*').eq('id', id).single();
    if(data) {
        document.getElementById('class-name').value = data.name;
        document.getElementById('class-level').value = data.level_id;
        populateSubLevelsDropdown(data.level_id, data.sub_level_id);
        document.getElementById('class-group').value = data.group_id;
        editingClassId = id;
        document.getElementById('btn-save-class').textContent = 'Update Kelas';
        document.getElementById('btn-cancel-class').style.display = 'inline-block';
        document.getElementById('tab-class').click(); // Pindah tab
        window.scrollTo({top:0, behavior:'smooth'});
    }
}

async function deleteClass(id) {
    if(!confirm("Hapus kelas ini?")) return;
    const { error } = await supabase.from('class_private').delete().eq('id', id);
    if(!error) loadClasses(); else alert(error.message);
}

function resetClassForm() {
    document.getElementById('form-class').reset();
    const subSel = document.getElementById('class-sub-level');
    if (subSel) subSel.innerHTML = '<option value="">-- Pilih Sub-Level --</option>';
    editingClassId = null;
    document.getElementById('btn-save-class').textContent = 'Simpan Kelas';
    document.getElementById('btn-cancel-class').style.display = 'none';
}

// ==========================================
// 6. STUDENT LOGIC
// ==========================================

async function loadStudents() {
    const { data, error } = await supabase.from('students_private')
        .select('id, name, is_active, class_id, class_private(name, levels(kode))')
        .order('name');

    const tbody = document.getElementById('list-students');
    if (error) {
        console.error('Load students error:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Gagal memuat data siswa.</td></tr>';
        return;
    }
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Belum ada siswa</td></tr>';
        return;
    }

    const activeCount = data.filter(s => s.is_active !== false).length;
    tbody.innerHTML = data.map(s => {
        const isActive = s.is_active !== false; // Data lama tanpa kolom dianggap aktif
        return `
            <tr${isActive ? '' : ' style="opacity:0.55; background:#f8fafc;"'}>
                <td style="font-weight:500;">${escapeHtml(s.name)}${isActive ? '' : '<span class="badge-inactive">Non-Aktif</span>'}</td>
                <td>${escapeHtml(s.class_private?.name || '-')} <span class="badge-level">${escapeHtml(s.class_private?.levels?.kode || '-')}</span></td>
                <td>
                    <label class="switch" title="${isActive ? 'Klik untuk non-aktifkan' : 'Klik untuk aktifkan'}">
                        <input type="checkbox" class="toggle-student-active" data-id="${s.id}" ${isActive ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <button class="action-btn btn-edit" data-id="${s.id}"><i class="fas fa-pen"></i></button>
                    <button class="action-btn btn-del" data-id="${s.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    }).join('');

    // Counter ringkas di judul kartu
    const title = document.querySelector('#content-students .table-card .card-title');
    if (title) title.innerHTML = `Daftar Siswa Private <span class="count-pill">${activeCount}/${data.length} Aktif</span>`;
}

async function handleSaveStudent(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('student-name').value.trim(),
        class_id: document.getElementById('student-class').value
    };

    const { error } = editingStudentId 
        ? await supabase.from('students_private').update(payload).eq('id', editingStudentId)
        : await supabase.from('students_private').insert([payload]);

    if (!error) {
        alert('Siswa berhasil disimpan');
        resetStudentForm();
        loadStudents();
    } else alert(error.message);
}

async function editStudent(id) {
    const { data } = await supabase.from('students_private').select('*').eq('id', id).single();
    if(data) {
        document.getElementById('student-name').value = data.name;
        document.getElementById('student-class').value = data.class_id;
        editingStudentId = id;
        document.getElementById('btn-save-student').textContent = 'Update Siswa';
        document.getElementById('btn-cancel-student').style.display = 'inline-block';
        document.getElementById('tab-students').click();
        window.scrollTo({top:0, behavior:'smooth'});
    }
}

async function deleteStudent(id) {
    if(!confirm("Hapus siswa ini?")) return;
    const { error } = await supabase.from('students_private').delete().eq('id', id);
    if(!error) loadStudents(); else alert(error.message);
}

function resetStudentForm() {
    document.getElementById('form-students').reset();
    editingStudentId = null;
    document.getElementById('btn-save-student').textContent = 'Simpan Siswa';
    document.getElementById('btn-cancel-student').style.display = 'none';
}

// Sanitasi teks dari DB sebelum disuntik ke HTML (cegah XSS)
function escapeHtml(text) {
    const NAMES = { 38: 'amp', 60: 'lt', 62: 'gt', 34: 'quot', 39: '#39' };
    return String(text ?? "").replace(/[&<>"']/g, ch => '&' + NAMES[ch.charCodeAt(0)] + ';');
}
