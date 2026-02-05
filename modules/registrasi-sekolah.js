/**
 * Project: School Data Management (SPA Module)
 * Description: Modul CRUD untuk Sekolah, Kelas, dan Siswa dengan UI Tab dan Dynamic Input.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global Modul
let deleteTargetId = null;
let deleteCategory = ''; // 'school', 'class', 'student'

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    // 1. Inject CSS
    injectStyles();

    // 2. Render HTML Structure
    canvas.innerHTML = `
        <div class="rs-container">
            
            <div class="rs-header">
                <h2>Manajemen Data Sekolah</h2>
                <p>Sistem Administrasi Sekolah, Kelas, dan Siswa</p>
            </div>

            <div class="rs-tabs">
                <button class="tab-btn active" id="btn-siswa"><i class="fas fa-user-graduate"></i> Siswa</button>
                <button class="tab-btn" id="btn-kelas"><i class="fas fa-chalkboard"></i> Kelas</button>
                <button class="tab-btn" id="btn-sekolah"><i class="fas fa-school"></i> Sekolah</button>
            </div>

            <div id="tab-siswa-content" class="tab-panel active">
                <div class="form-card">
                    <h3 class="card-title">Registrasi Siswa</h3>
                    <form id="student-form">
                        <div class="form-row">
                            <div class="form-group half">
                                <label>Pilih Sekolah</label>
                                <select id="school_id_siswa" class="form-input" required><option>Loading...</option></select>
                            </div>
                            <div class="form-group half">
                                <label>Pilih Kelas</label>
                                <select id="class_id_siswa" class="form-input" required><option value="">-- Pilih Sekolah Dulu --</option></select>
                            </div>
                        </div>

                        <div class="dynamic-table-wrapper">
                            <table id="student-input-table" class="simple-table">
                                <thead>
                                    <tr>
                                        <th>Nama Siswa</th>
                                        <th>Grade (Mis: 4B)</th>
                                        <th width="50"><button type="button" id="add-row-btn" class="btn-icon-add" title="Tambah Baris">+</button></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><input type="text" name="student_name" class="form-input" placeholder="Nama Lengkap" required></td>
                                        <td><input type="text" name="student_grade" class="form-input" placeholder="Grade"></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="form-footer">
                            <button type="submit" id="save-students-btn" class="btn-primary">Simpan Siswa</button>
                            <button type="button" id="cancel-student-btn" class="btn-secondary" style="display:none;">Batal Edit</button>
                        </div>
                    </form>
                </div>

                <div class="table-card">
                    <h3 class="card-title">Daftar Siswa</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr><th>No</th><th>Nama</th><th>Grade</th><th>Aksi</th></tr></thead>
                            <tbody id="student-list-body"><tr><td colspan="4" class="empty-state">Pilih sekolah & kelas untuk lihat data</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="tab-kelas-content" class="tab-panel" style="display:none;">
                <div class="form-card">
                    <h3 class="card-title">Form Kelas</h3>
                    <form id="class-form">
                        <input type="hidden" id="class-edit-id">
                        <div class="form-row">
                            <div class="form-group third">
                                <label>Sekolah</label>
                                <select id="school_id_kelas" class="form-input" required></select>
                            </div>
                            <div class="form-group third">
                                <label>Tahun Ajaran</label>
                                <select id="academic_year" class="form-input" required></select>
                            </div>
                            <div class="form-group third">
                                <label>Semester</label>
                                <select id="semester" class="form-input" required></select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group half">
                                <label>Nama Kelas</label>
                                <input type="text" id="class_name" class="form-input" placeholder="Misal: Robotik A" required>
                            </div>
                            <div class="form-group half">
                                <label>Level</label>
                                <select id="level" class="form-input" required></select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Jadwal</label>
                            <input type="text" id="schedule" class="form-input" placeholder="Senin, 14.00 - 15.30" required>
                        </div>
                        <div class="form-footer">
                            <button type="submit" class="btn-primary">Simpan Kelas</button>
                            <button type="button" id="cancel-class-btn" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </form>
                </div>

                <div class="table-card">
                    <h3 class="card-title">Data Kelas</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr><th>Nama</th><th>Sekolah</th><th>Tahun/Sem</th><th>Level</th><th>Jadwal</th><th>Aksi</th></tr></thead>
                            <tbody id="class-list-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="tab-sekolah-content" class="tab-panel" style="display:none;">
                <div class="form-card">
                    <h3 class="card-title">Profil Sekolah</h3>
                    <form id="school-form">
                        <input type="hidden" id="school-edit-id">
                        <div class="form-group">
                            <label>Nama Sekolah</label>
                            <input type="text" id="school_name" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label>Alamat</label>
                            <input type="text" id="school_address" class="form-input" required>
                        </div>
                        <div class="form-footer">
                            <button type="submit" class="btn-primary">Simpan Sekolah</button>
                            <button type="button" id="cancel-school-btn" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </form>
                </div>

                <div class="table-card">
                    <h3 class="card-title">Data Sekolah</h3>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr><th>No</th><th>Nama Sekolah</th><th>Alamat</th><th>Aksi</th></tr></thead>
                            <tbody id="school-list-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>

        <div id="delete-modal" class="modal-overlay">
            <div class="modal-box">
                <h3>Konfirmasi Hapus</h3>
                <p>Yakin ingin menghapus data ini? Data yang terhapus tidak bisa dikembalikan.</p>
                <div class="modal-actions">
                    <button id="cancel-delete" class="btn-secondary">Batal</button>
                    <button id="confirm-delete" class="btn-danger">Hapus</button>
                </div>
            </div>
        </div>
    `;

    // 3. Setup Logic
    await setupLogic();
}

// ==========================================
// 2. CSS STYLING
// ==========================================
function injectStyles() {
    const styleId = 'registrasi-sekolah-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Container */
        .rs-container { max-width: 1100px; margin: 0 auto; font-family: 'Roboto', sans-serif; padding-bottom: 80px; }
        
        /* Header */
        .rs-header { margin-bottom: 25px; }
        .rs-header h2 { font-family: 'Fredoka One', cursive; color: #333; margin: 0; font-size: 1.8rem; }
        .rs-header p { color: #666; margin: 5px 0 0; }

        /* Tabs */
        .rs-tabs { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 2px solid #eee; padding-bottom: 2px; }
        .tab-btn { background: none; border: none; padding: 12px 20px; font-weight: bold; color: #888; cursor: pointer; border-bottom: 3px solid transparent; transition: 0.3s; font-size: 1rem; }
        .tab-btn i { margin-right: 8px; }
        .tab-btn.active { color: #4d97ff; border-bottom-color: #4d97ff; }
        .tab-btn:hover { color: #4d97ff; background: #f9f9f9; border-radius: 8px 8px 0 0; }

        /* Cards */
        .form-card, .table-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eef2f6; }
        .card-title { margin-top: 0; margin-bottom: 20px; color: #4d97ff; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 10px; }

        /* Forms */
        .form-row { display: flex; gap: 20px; margin-bottom: 15px; }
        .form-group { margin-bottom: 15px; width: 100%; }
        .form-group.half { width: 50%; }
        .form-group.third { width: 33.33%; }
        .form-group label { display: block; font-weight: bold; font-size: 0.85rem; color: #555; margin-bottom: 5px; }
        .form-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; background: #fcfcfc; transition: 0.2s; }
        .form-input:focus { border-color: #4d97ff; background: white; outline: none; box-shadow: 0 0 0 3px rgba(77,151,255,0.1); }

        /* Dynamic Table (Input Siswa) */
        .dynamic-table-wrapper { border: 1px solid #eee; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
        .simple-table { width: 100%; border-collapse: collapse; }
        .simple-table th { background: #f8f9fa; padding: 10px; text-align: left; font-size: 0.85rem; color: #666; }
        .simple-table td { padding: 8px; border-top: 1px solid #eee; }
        .btn-icon-add { background: #2ecc71; color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; }
        .btn-icon-remove { color: #e74c3c; background: none; border: none; cursor: pointer; font-size: 1.2rem; }

        /* Data Tables */
        .table-responsive { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .data-table th { background: #eff6ff; color: #1e3a8a; padding: 12px 15px; text-align: left; font-weight: bold; font-size: 0.9rem; }
        .data-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #333; font-size: 0.9rem; }
        .data-table tr:hover { background: #f8fafc; }
        .empty-state { text-align: center; color: #999; padding: 30px; font-style: italic; }

        /* Buttons */
        .form-footer { display: flex; gap: 10px; }
        .btn-primary { background: #4d97ff; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover { background: #2563eb; }
        .btn-secondary { background: #e2e8f0; color: #333; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-danger { background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
        
        .btn-action { padding: 5px 10px; border-radius: 6px; border: none; cursor: pointer; font-size: 0.8rem; margin-right: 5px; }
        .btn-edit { background: #f59e0b; color: white; }
        .btn-del { background: #ef4444; color: white; }

        /* Modal */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 1000; }
        .modal-box { background: white; padding: 25px; border-radius: 12px; width: 400px; max-width: 90%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: popIn 0.3s; }
        .modal-actions { display: flex; justify-content: center; gap: 15px; margin-top: 20px; }
        
        @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @media (max-width: 768px) { .form-row { flex-direction: column; gap: 10px; } .form-group.half, .form-group.third { width: 100%; } }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC & EVENTS
// ==========================================

async function setupLogic() {
    // 1. Initial Load
    await loadSchools();
    await loadAcademicYears();
    await loadClassesTable();
    setupLevelOptions();

    // 2. Tab Event Listeners
    setupTabs();

    // 3. Form Event Listeners
    document.getElementById('school-form').onsubmit = handleSaveSchool;
    document.getElementById('class-form').onsubmit = handleSaveClass;
    document.getElementById('student-form').onsubmit = handleSaveStudent;

    // 4. Input Events
    document.getElementById('add-row-btn').onclick = addStudentRow;
    document.getElementById('school_id_siswa').onchange = (e) => loadClassesDropdown(e.target.value);
    document.getElementById('class_id_siswa').onchange = (e) => loadStudentsList(e.target.value);
    document.getElementById('academic_year').onchange = (e) => loadSemesters(e.target.value);

    // 5. Cancel Buttons
    document.getElementById('cancel-school-btn').onclick = resetSchoolForm;
    document.getElementById('cancel-class-btn').onclick = resetClassForm;
    document.getElementById('cancel-student-btn').onclick = resetStudentForm;

    // 6. Delete Modal
    document.getElementById('cancel-delete').onclick = () => document.getElementById('delete-modal').style.display = 'none';
    document.getElementById('confirm-delete').onclick = confirmDelete;

    // 7. Table Actions (Delegation)
    setupTableActions();
}

function setupTabs() {
    const tabs = ['siswa', 'kelas', 'sekolah'];
    tabs.forEach(tab => {
        document.getElementById(`btn-${tab}`).onclick = () => {
            // Reset active styles
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
            
            // Set active
            document.getElementById(`btn-${tab}`).classList.add('active');
            document.getElementById(`tab-${tab}-content`).style.display = 'block';
        };
    });
}

function setupTableActions() {
    // Helper untuk delegation
    const addAction = (tableBodyId, editCallback, category) => {
        const body = document.getElementById(tableBodyId);
        body.addEventListener('click', (e) => {
            const btnEdit = e.target.closest('.btn-edit');
            const btnDel = e.target.closest('.btn-del');
            
            if (btnEdit) editCallback(btnEdit.dataset.id);
            if (btnDel) openDeleteModal(btnDel.dataset.id, category);
        });
    };

    addAction('school-list-body', editSchool, 'school');
    addAction('class-list-body', editClass, 'class');
    addAction('student-list-body', editStudent, 'student');
}

// ==========================================
// 4. DATA LOGIC: SEKOLAH
// ==========================================

async function loadSchools() {
    const { data } = await supabase.from('schools').select('*').order('name');
    
    // Render Table
    const tbody = document.getElementById('school-list-body');
    tbody.innerHTML = data.map((s, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${s.name}</td>
            <td>${s.address || '-'}</td>
            <td>
                <button class="btn-action btn-edit" data-id="${s.id}"><i class="fas fa-pen"></i></button>
                <button class="btn-action btn-del" data-id="${s.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    // Update Dropdowns di tab lain
    const options = '<option value="">-- Pilih Sekolah --</option>' + 
        data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    document.getElementById('school_id_kelas').innerHTML = options;
    document.getElementById('school_id_siswa').innerHTML = options;
}

async function handleSaveSchool(e) {
    e.preventDefault();
    const id = document.getElementById('school-edit-id').value;
    const payload = {
        name: document.getElementById('school_name').value,
        address: document.getElementById('school_address').value
    };

    const { error } = id 
        ? await supabase.from('schools').update(payload).eq('id', id)
        : await supabase.from('schools').insert([payload]);

    if (!error) {
        alert('Berhasil!');
        resetSchoolForm();
        loadSchools();
    } else {
        alert('Error: ' + error.message);
    }
}

async function editSchool(id) {
    const { data } = await supabase.from('schools').select('*').eq('id', id).single();
    if(data) {
        document.getElementById('school_name').value = data.name;
        document.getElementById('school_address').value = data.address;
        document.getElementById('school-edit-id').value = id;
        document.getElementById('cancel-school-btn').style.display = 'inline-block';
        // Pindah tab visual jika perlu
        document.getElementById('btn-sekolah').click();
    }
}

function resetSchoolForm() {
    document.getElementById('school-form').reset();
    document.getElementById('school-edit-id').value = '';
    document.getElementById('cancel-school-btn').style.display = 'none';
}

// ==========================================
// 5. DATA LOGIC: KELAS
// ==========================================

async function loadAcademicYears() {
    const { data } = await supabase.from('academic_years').select('*').order('year');
    const select = document.getElementById('academic_year');
    select.innerHTML = '<option value="">-- Tahun Ajaran --</option>' + 
        data.map(y => `<option value="${y.id}">${y.year}</option>`).join('');
}

async function loadSemesters(yearId) {
    if(!yearId) return;
    const { data } = await supabase.from('semesters').select('*').eq('academic_year_id', yearId);
    const select = document.getElementById('semester');
    select.innerHTML = '<option value="">-- Pilih Semester --</option>' + 
        data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

function setupLevelOptions() {
    const levels = ['Kiddy', 'Beginner', 'Intermediate', 'Advanced'];
    document.getElementById('level').innerHTML = '<option value="">-- Pilih Level --</option>' + 
        levels.map(l => `<option value="${l}">${l}</option>`).join('');
}

async function loadClassesTable() {
    const { data } = await supabase.from('classes')
        .select('*, schools(name), academic_years(year), semesters(name)')
        .order('created_at', { ascending: false });

    document.getElementById('class-list-body').innerHTML = data.map(c => `
        <tr>
            <td style="font-weight:bold;">${c.name}</td>
            <td>${c.schools?.name || '-'}</td>
            <td>${c.academic_years?.year || '-'}/${c.semesters?.name || '-'}</td>
            <td><span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${c.level}</span></td>
            <td>${c.jadwal}</td>
            <td>
                <button class="btn-action btn-edit" data-id="${c.id}"><i class="fas fa-pen"></i></button>
                <button class="btn-action btn-del" data-id="${c.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function handleSaveClass(e) {
    e.preventDefault();
    const id = document.getElementById('class-edit-id').value;
    const payload = {
        name: document.getElementById('class_name').value,
        school_id: document.getElementById('school_id_kelas').value,
        academic_year_id: document.getElementById('academic_year').value,
        semester_id: document.getElementById('semester').value,
        level: document.getElementById('level').value,
        jadwal: document.getElementById('schedule').value
    };

    const { error } = id 
        ? await supabase.from('classes').update(payload).eq('id', id)
        : await supabase.from('classes').insert([payload]);

    if (!error) {
        alert('Kelas tersimpan');
        resetClassForm();
        loadClassesTable();
    }
}

async function editClass(id) {
    const { data } = await supabase.from('classes').select('*').eq('id', id).single();
    if(data) {
        document.getElementById('school_id_kelas').value = data.school_id;
        document.getElementById('academic_year').value = data.academic_year_id;
        await loadSemesters(data.academic_year_id); // Load dependent dropdown
        document.getElementById('semester').value = data.semester_id;
        
        document.getElementById('class_name').value = data.name;
        document.getElementById('level').value = data.level;
        document.getElementById('schedule').value = data.jadwal;
        document.getElementById('class-edit-id').value = id;
        
        document.getElementById('cancel-class-btn').style.display = 'inline-block';
        document.getElementById('btn-kelas').click();
    }
}

function resetClassForm() {
    document.getElementById('class-form').reset();
    document.getElementById('class-edit-id').value = '';
    document.getElementById('cancel-class-btn').style.display = 'none';
}

// ==========================================
// 6. DATA LOGIC: SISWA
// ==========================================

async function loadClassesDropdown(schoolId) {
    const select = document.getElementById('class_id_siswa');
    select.innerHTML = '<option>Loading...</option>';
    
    const { data } = await supabase.from('classes').select('id, name').eq('school_id', schoolId);
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>' + 
        data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadStudentsList(classId) {
    if(!classId) return;
    const { data } = await supabase.from('students').select('*').eq('class_id', classId).order('name');
    
    const tbody = document.getElementById('student-list-body');
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada siswa di kelas ini</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((s, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${s.name}</td>
            <td>${s.grade || '-'}</td>
            <td>
                <button class="btn-action btn-edit" data-id="${s.id}"><i class="fas fa-pen"></i></button>
                <button class="btn-action btn-del" data-id="${s.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function addStudentRow() {
    // Jika sedang mode edit single student, tolak tambah baris
    if (document.getElementById('student-form').dataset.mode === 'edit') return;

    const tbody = document.querySelector('#student-input-table tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" name="student_name" class="form-input" placeholder="Nama Lengkap" required></td>
        <td><input type="text" name="student_grade" class="form-input" placeholder="Grade"></td>
        <td><button type="button" class="btn-icon-remove" title="Hapus Baris">&times;</button></td>
    `;
    tbody.appendChild(row);
    row.querySelector('.btn-icon-remove').onclick = () => row.remove();
}

async function handleSaveStudent(e) {
    e.preventDefault();
    const classId = document.getElementById('class_id_siswa').value;
    const form = document.getElementById('student-form');
    
    if(!classId) return alert("Pilih Kelas terlebih dahulu!");

    if (form.dataset.mode === 'edit') {
        // Update Single
        const id = form.dataset.editId;
        const row = document.querySelector('#student-input-table tbody tr');
        const payload = {
            name: row.querySelector('input[name="student_name"]').value,
            grade: row.querySelector('input[name="student_grade"]').value
        };
        await supabase.from('students').update(payload).eq('id', id);
        resetStudentForm();
    } else {
        // Bulk Insert
        const rows = document.querySelectorAll('#student-input-table tbody tr');
        const students = Array.from(rows).map(row => ({
            name: row.querySelector('input[name="student_name"]').value,
            grade: row.querySelector('input[name="student_grade"]').value,
            school_id: document.getElementById('school_id_siswa').value,
            class_id: classId
        })).filter(s => s.name); // Filter nama kosong

        const { error } = await supabase.from('students').insert(students);
        if(error) return alert("Gagal: " + error.message);
        
        // Reset tabel input ke 1 baris
        document.querySelector('#student-input-table tbody').innerHTML = `
            <tr>
                <td><input type="text" name="student_name" class="form-input" placeholder="Nama Lengkap" required></td>
                <td><input type="text" name="student_grade" class="form-input" placeholder="Grade"></td>
                <td></td>
            </tr>
        `;
    }

    loadStudentsList(classId);
    alert('Data siswa tersimpan!');
}

async function editStudent(id) {
    const { data } = await supabase.from('students').select('*').eq('id', id).single();
    if(data) {
        // Mode Edit
        const form = document.getElementById('student-form');
        form.dataset.mode = 'edit';
        form.dataset.editId = id;
        
        // Set Header
        document.querySelector('.dynamic-table-wrapper').style.border = "2px solid #f59e0b";
        document.getElementById('save-students-btn').textContent = "Update Siswa";
        document.getElementById('cancel-student-btn').style.display = 'inline-block';

        // Isi baris pertama saja
        const tbody = document.querySelector('#student-input-table tbody');
        tbody.innerHTML = `
            <tr>
                <td><input type="text" name="student_name" class="form-input" value="${data.name}" required></td>
                <td><input type="text" name="student_grade" class="form-input" value="${data.grade || ''}"></td>
                <td></td>
            </tr>
        `;
    }
}

function resetStudentForm() {
    const form = document.getElementById('student-form');
    delete form.dataset.mode;
    delete form.dataset.editId;
    
    document.querySelector('.dynamic-table-wrapper').style.border = "1px solid #eee";
    document.getElementById('save-students-btn').textContent = "Simpan Siswa";
    document.getElementById('cancel-student-btn').style.display = 'none';
    
    // Reset ke 1 baris kosong
    document.querySelector('#student-input-table tbody').innerHTML = `
        <tr>
            <td><input type="text" name="student_name" class="form-input" placeholder="Nama Lengkap" required></td>
            <td><input type="text" name="student_grade" class="form-input" placeholder="Grade"></td>
            <td></td>
        </tr>
    `;
}

// ==========================================
// 7. GLOBAL DELETE MODAL
// ==========================================

function openDeleteModal(id, category) {
    deleteTargetId = id;
    deleteCategory = category;
    document.getElementById('delete-modal').style.display = 'flex';
}

async function confirmDelete() {
    const tableMap = { 'school': 'schools', 'class': 'classes', 'student': 'students' };
    const { error } = await supabase.from(tableMap[deleteCategory]).delete().eq('id', deleteTargetId);
    
    if (!error) {
        document.getElementById('delete-modal').style.display = 'none';
        if (deleteCategory === 'school') loadSchools();
        if (deleteCategory === 'class') loadClassesTable();
        if (deleteCategory === 'student') loadStudentsList(document.getElementById('class_id_siswa').value);
    } else {
        alert("Gagal menghapus: " + error.message);
    }
}