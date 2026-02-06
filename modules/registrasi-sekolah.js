/**
 * Project: School Data Management (SPA Module) - REFACTORED
 * Update: Added is_active toggle for Students, maintain existing CRUD.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global Modul
let deleteTargetId = null;
let deleteCategory = ''; 
let currentEditId = null;

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="rs-container">
            <div class="rs-header">
                <h2>Manajemen Data Sekolah</h2>
                <p>Kelola Sekolah, Kelas, dan Status Aktif Siswa</p>
            </div>

            <div class="rs-tabs">
                <button class="tab-btn active" id="btn-siswa"><i class="fas fa-user-graduate"></i> Siswa</button>
                <button class="tab-btn" id="btn-kelas"><i class="fas fa-chalkboard"></i> Kelas</button>
                <button class="tab-btn" id="btn-sekolah"><i class="fas fa-school"></i> Sekolah</button>
            </div>

            <div id="tab-siswa-content" class="tab-content active fade-in">
                <div class="card shadow-soft">
                    <div class="card-header">
                        <h4><i class="fas fa-plus-circle"></i> Registrasi Siswa</h4>
                    </div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Pilih Sekolah</label>
                                <select id="reg-school-select" class="form-input"><option value="">-- Pilih Sekolah --</option></select>
                            </div>
                            <div class="form-group">
                                <label>Pilih Kelas</label>
                                <select id="reg-class-select" class="form-input" disabled><option value="">-- Pilih Sekolah Dulu --</option></select>
                            </div>
                        </div>
                        
                        <div class="table-responsive margin-top">
                            <table id="student-input-table" class="modern-table">
                                <thead><tr><th>Nama Lengkap</th><th>Grade / Kelas Asal</th><th width="50"></th></tr></thead>
                                <tbody>
                                    <tr>
                                        <td><input type="text" name="student_name" class="form-input" placeholder="Contoh: Ibrahim Tan" required></td>
                                        <td><input type="text" name="student_grade" class="form-input" placeholder="Contoh: P4 Plesio"></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                            <button type="button" id="add-row-btn" class="btn-outline-small margin-top"><i class="fas fa-plus"></i> Tambah Baris</button>
                        </div>
                        <div class="form-actions margin-top">
                            <button id="save-students-btn" class="btn-primary">Simpan Siswa</button>
                            <button id="cancel-student-btn" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </div>
                </div>

                <div class="card shadow-soft margin-top">
                    <div class="card-header">
                        <h4><i class="fas fa-list"></i> Daftar Siswa</h4>
                    </div>
                    <div id="student-list-container" class="card-body">
                        <p class="text-muted">Pilih kelas di atas untuk melihat daftar siswa.</p>
                    </div>
                </div>
            </div>

            <div id="tab-kelas-content" class="tab-content">...</div>
            <div id="tab-sekolah-content" class="tab-content">...</div>

            <div id="delete-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content">
                    <h3>Konfirmasi Hapus</h3>
                    <p>Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.</p>
                    <div class="modal-actions">
                        <button id="confirm-delete-btn" class="btn-danger">Hapus</button>
                        <button onclick="document.getElementById('delete-modal').style.display='none'" class="btn-secondary">Batal</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupEvents();
    loadSchools();
}

// ==========================================
// 2. LOGIC & EVENTS
// ==========================================

function setupEvents() {
    // Tab Switching
    document.getElementById('btn-siswa').onclick = () => switchTab('siswa');
    document.getElementById('btn-kelas').onclick = () => switchTab('kelas');
    document.getElementById('btn-sekolah').onclick = () => switchTab('sekolah');

    // School & Class Select
    const schoolSelect = document.getElementById('reg-school-select');
    const classSelect = document.getElementById('reg-class-select');

    schoolSelect.onchange = (e) => loadClasses(e.target.value);
    classSelect.onchange = (e) => loadStudentsList(e.target.value);

    // Dynamic Rows
    document.getElementById('add-row-btn').onclick = () => {
        const tbody = document.querySelector('#student-input-table tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" name="student_name" class="form-input" placeholder="Nama Lengkap" required></td>
            <td><input type="text" name="student_grade" class="form-input" placeholder="Grade"></td>
            <td><button class="btn-remove-row" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(tr);
    };

    // Save Data
    document.getElementById('save-students-btn').onclick = handleSaveStudents;
    document.getElementById('confirm-delete-btn').onclick = confirmDelete;
}

// --- TAB SYSTEM ---
function switchTab(target) {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`btn-${target}`).classList.add('active');
    document.getElementById(`tab-${target}-content`).classList.add('active');
}

// --- DATA FETCHING ---
async function loadSchools() {
    const { data } = await supabase.from('schools').select('id, name').order('name');
    const select = document.getElementById('reg-school-select');
    (data || []).forEach(s => select.add(new Option(s.name, s.id)));
}

async function loadClasses(schoolId) {
    const select = document.getElementById('reg-class-select');
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    select.disabled = !schoolId;
    if (!schoolId) return;

    const { data } = await supabase.from('classes').select('id, name').eq('school_id', schoolId).order('name');
    (data || []).forEach(c => select.add(new Option(c.name, c.id)));
}

async function loadStudentsList(classId) {
    const container = document.getElementById('student-list-container');
    if (!classId) { container.innerHTML = '<p class="text-muted">Pilih kelas dulu.</p>'; return; }

    container.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat siswa...';
    
    const { data, error } = await supabase.from('students')
        .select('*')
        .eq('class_id', classId)
        .order('grade', { ascending: true })
        .order('name', { ascending: true });

    if (error) { container.innerHTML = 'Error memuat data.'; return; }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="modern-table">
                <thead><tr><th>Nama Siswa</th><th>Grade</th><th>Status</th><th width="100">Aksi</th></tr></thead>
                <tbody>
                    ${data.map(s => `
                        <tr>
                            <td><strong>${s.name}</strong></td>
                            <td><span class="badge-grade">${s.grade || '-'}</span></td>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" ${s.is_active ? 'checked' : ''} onchange="window.toggleStudentStatus('${s.id}', this.checked)">
                                    <span class="slider round"></span>
                                </label>
                            </td>
                            <td>
                                <button class="btn-icon text-primary" onclick="window.editStudent('${s.id}', '${s.name}', '${s.grade}')"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon text-danger" onclick="window.openDeleteModal('${s.id}', 'student')"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==========================================
// 3. DATABASE OPERATIONS (Refactored)
// ==========================================

async function handleSaveStudents() {
    const schoolId = document.getElementById('reg-school-select').value;
    const classId = document.getElementById('reg-class-select').value;

    if (!schoolId || !classId) return alert("Pilih Sekolah & Kelas!");

    const rows = document.querySelectorAll('#student-input-table tbody tr');
    const studentsData = [];

    rows.forEach(row => {
        const name = row.querySelector('[name="student_name"]').value.trim();
        const grade = row.querySelector('[name="student_grade"]').value.trim();
        if (name) studentsData.push({ name, grade, class_id: classId, school_id: schoolId, is_active: true });
    });

    if (studentsData.length === 0) return alert("Isi minimal satu nama siswa!");

    const btn = document.getElementById('save-students-btn');
    btn.disabled = true;
    btn.textContent = "Menyimpan...";

    try {
        if (currentEditId) {
            await supabase.from('students').update(studentsData[0]).eq('id', currentEditId);
        } else {
            await supabase.from('students').insert(studentsData);
        }
        alert("Data siswa berhasil disimpan!");
        resetStudentForm();
        loadStudentsList(classId);
    } catch (e) {
        alert("Gagal: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Simpan Siswa";
    }
}

// --- TOGGLE STATUS (New Feature) ---
window.toggleStudentStatus = async (id, status) => {
    const { error } = await supabase.from('students').update({ is_active: status }).eq('id', id);
    if (error) {
        alert("Gagal mengubah status!");
        console.error(error);
    }
};

window.editStudent = (id, name, grade) => {
    currentEditId = id;
    document.querySelector('[name="student_name"]').value = name;
    document.querySelector('[name="student_grade"]').value = grade;
    document.getElementById('save-students-btn').textContent = "Update Siswa";
    document.getElementById('cancel-student-btn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function resetStudentForm() {
    currentEditId = null;
    document.getElementById('save-students-btn').textContent = "Simpan Siswa";
    document.getElementById('cancel-student-btn').style.display = 'none';
    document.querySelector('#student-input-table tbody').innerHTML = `
        <tr>
            <td><input type="text" name="student_name" class="form-input" placeholder="Nama Lengkap" required></td>
            <td><input type="text" name="student_grade" class="form-input" placeholder="Grade"></td>
            <td></td>
        </tr>
    `;
}

// ==========================================
// 4. UTILS & MODALS
// ==========================================

window.openDeleteModal = (id, category) => {
    deleteTargetId = id;
    deleteCategory = category;
    document.getElementById('delete-modal').style.display = 'flex';
};

async function confirmDelete() {
    const { error } = await supabase.from('students').delete().eq('id', deleteTargetId);
    if (!error) {
        document.getElementById('delete-modal').style.display = 'none';
        loadStudentsList(document.getElementById('reg-class-select').value);
    }
}

// ==========================================
// 5. STYLING (Injected)
// ==========================================

function injectStyles() {
    const styleId = 'rs-module-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .rs-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Roboto', sans-serif; }
        .rs-header { margin-bottom: 30px; border-left: 5px solid #4d97ff; padding-left: 15px; }
        .rs-header h2 { font-family: 'Fredoka One', cursive; margin: 0; color: #333; }
        .rs-header p { color: #888; margin: 5px 0 0; }

        /* TABS */
        .rs-tabs { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .tab-btn { background: none; border: none; padding: 10px 20px; cursor: pointer; font-weight: bold; color: #999; border-radius: 8px; transition: 0.3s; }
        .tab-btn.active { background: #4d97ff; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* CARDS */
        .card { background: white; border-radius: 16px; border: 1px solid #f0f0f0; overflow: hidden; }
        .card-header { background: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #eee; }
        .card-header h4 { margin: 0; color: #333; display: flex; align-items: center; gap: 10px; }
        .card-body { padding: 20px; }
        .shadow-soft { box-shadow: 0 4px 20px rgba(0,0,0,0.03); }

        /* FORMS */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group label { display: block; font-size: 0.8rem; font-weight: bold; color: #555; margin-bottom: 8px; }
        .form-input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; }
        
        /* TABLES */
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { text-align: left; padding: 12px; border-bottom: 2px solid #eee; color: #64748b; font-size: 0.8rem; text-transform: uppercase; }
        .modern-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
        .badge-grade { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 0.8rem; color: #475569; }

        /* TOGGLE SWITCH (IOS STYLE) */
        .switch { position: relative; display: inline-block; width: 45px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
        input:checked + .slider { background-color: #2ecc71; }
        input:checked + .slider:before { transform: translateX(23px); }
        .slider.round { border-radius: 34px; }
        .slider.round:before { border-radius: 50%; }

        /* BUTTONS */
        .btn-primary { background: #4d97ff; color: white; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: bold; }
        .btn-outline-small { background: white; border: 1px solid #4d97ff; color: #4d97ff; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: bold; }
        .btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 5px; }
        .text-danger { color: #ef4444; }
        .text-primary { color: #4d97ff; }

        /* UTILS */
        .margin-top { margin-top: 20px; }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
}