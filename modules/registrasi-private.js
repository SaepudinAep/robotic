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
                            <thead><tr><th>Nama</th><th>Kelas</th><th>Aksi</th></tr></thead>
                            <tbody id="list-students"><tr><td colspan="3" class="loading">Memuat data...</td></tr></tbody>
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
                            <thead><tr><th>Nama Kelas</th><th>Level</th><th>Group</th><th>Aksi</th></tr></thead>
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
    const { data } = await supabase.from('levels').select('id, kode').order('kode');
    document.getElementById('class-level').innerHTML = '<option value="">-- Pilih Level --</option>' + 
        data.map(l => `<option value="${l.id}">${l.kode}</option>`).join('');
}

async function loadClasses() {
    const { data, error } = await supabase.from('class_private')
        .select('id, name, level_id, group_id, group_private(code), levels(kode)')
        .order('name');

    const tbody = document.getElementById('list-class');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Belum ada kelas</td></tr>';
    } else {
        tbody.innerHTML = data.map(c => `
            <tr>
                <td>${c.name}</td>
                <td><span style="background:#eee; padding:2px 6px; border-radius:4px; font-size:0.85rem;">${c.levels?.kode || '-'}</span></td>
                <td>${c.group_private?.code || '-'}</td>
                <td>
                    <button class="action-btn btn-edit" data-id="${c.id}"><i class="fas fa-pen"></i></button>
                    <button class="action-btn btn-del" data-id="${c.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // Populate Dropdown for Student Form
    const select = document.getElementById('student-class');
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>' + 
        data.map(c => `<option value="${c.id}">${c.name} (${c.levels?.kode || '-'})</option>`).join('');
}

async function handleSaveClass(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('class-name').value.trim(),
        level_id: document.getElementById('class-level').value,
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
    editingClassId = null;
    document.getElementById('btn-save-class').textContent = 'Simpan Kelas';
    document.getElementById('btn-cancel-class').style.display = 'none';
}

// ==========================================
// 6. STUDENT LOGIC
// ==========================================

async function loadStudents() {
    const { data, error } = await supabase.from('students_private')
        .select('id, name, class_id, class_private(name)')
        .order('name');

    const tbody = document.getElementById('list-students');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading">Belum ada siswa</td></tr>';
    } else {
        tbody.innerHTML = data.map(s => `
            <tr>
                <td style="font-weight:500;">${s.name}</td>
                <td>${s.class_private?.name || '-'}</td>
                <td>
                    <button class="action-btn btn-edit" data-id="${s.id}"><i class="fas fa-pen"></i></button>
                    <button class="action-btn btn-del" data-id="${s.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
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