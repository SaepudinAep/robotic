/**
 * Project: School Data Management (SPA Module) - VERIFIED ARCHITECTURE
 * Features: Full CRUD, Relational Sync, Active Period Toggle, and Alert State Lifecycle.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. GLOBAL STATE MANAGEMENT
// ==========================================
let deleteTargetId = null;
let deleteCategory = ''; 
let currentEditSchoolId = null;
let currentEditClassId = null;
let currentEditStudentId = null;

// State Periode Aktif Sistem
let activeAcademicYearId = null;
let activeSemesterId = null;
let activeYearLabel = "Belum Set";
let activeSemesterLabel = "Belum Set";

// ==========================================
// 2. CORE INITIALIZATION & UI
// ==========================================
export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="rs-container">
            <div class="rs-header">
                <h2>Manajemen Data Sekolah (Verified)</h2>
                <p>Sinkronisasi Data Sekolah, Kelas, Siswa, dan Periode Aktif secara Real-Time</p>
            </div>

            <div class="rs-tabs">
                <button class="tab-btn active" id="btn-siswa"><i class="fas fa-user-graduate"></i> Siswa</button>
                <button class="tab-btn" id="btn-kelas"><i class="fas fa-chalkboard"></i> Kelas</button>
                <button class="tab-btn" id="btn-sekolah"><i class="fas fa-school"></i> Sekolah</button>
                <button class="tab-btn" id="btn-setting"><i class="fas fa-cogs"></i> Periode Aktif</button>
            </div>

            <div id="tab-siswa-content" class="tab-content active fade-in">
                <div class="card shadow-soft">
                    <div class="card-header"><h4 id="title-form-siswa"><i class="fas fa-plus-circle"></i> Kelola & Registrasi Siswa</h4></div>
                    <div class="card-body">
                        <div class="session-banner" id="siswa-session-banner" style="margin-bottom:15px;">
                            <i class="fas fa-info-circle"></i> Memuat periode aktif...
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Sekolah</label>
                                <select id="reg-school-select" class="form-input"><option value="">-- Pilih Sekolah --</option></select>
                            </div>
                            <div class="form-group">
                                <label>Kelas Tujuan</label>
                                <select id="reg-class-select" class="form-input" disabled><option value="">-- Pilih Sekolah Dulu --</option></select>
                            </div>
                        </div>
                        
                        <div class="batch-input-card">
                            <label class="batch-label"><i class="fas fa-clipboard-list"></i> Input Batch Siswa</label>
                            <textarea id="batch-student-input" class="form-input" rows="4" placeholder="Tempel daftar siswa di sini. Satu siswa per baris, format: Nama # Grade. Contoh: ata # KG B2"></textarea>
                            <p class="text-muted batch-hint">Satu siswa per baris. Pisahkan <strong>Nama</strong> dan <strong>Grade</strong> dengan tanda <code>#</code>. Baris kosong diabaikan otomatis.</p>
                            <div class="batch-actions">
                                <button type="button" id="apply-batch-btn" class="btn-outline-small"><i class="fas fa-arrow-right"></i> Terapkan ke Tabel</button>
                                <span id="batch-feedback" class="text-muted"></span>
                            </div>
                        </div>
                        <div class="table-responsive margin-top">
                            <table id="student-input-table" class="modern-table">
                                <thead><tr><th>Nama Lengkap Siswa</th><th>Grade / Kelas Asal (CSV)</th><th width="50"></th></tr></thead>
                                <tbody>
                                    <tr>
                                        <td><input type="text" name="student_name" class="form-input" placeholder="Contoh: Ibrahim Tan Athaya" required></td>
                                        <td><input type="text" name="student_grade" class="form-input" placeholder="Contoh: P4 Plesio"></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                            <button type="button" id="add-row-btn" class="btn-outline-small margin-top"><i class="fas fa-plus"></i> Tambah Baris Masal</button>
                        </div>
                        <div class="form-actions margin-top">
                            <button id="save-students-btn" class="btn-primary">Simpan Data Siswa</button>
                            <button id="cancel-student-btn" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </div>
                </div>

                <div class="card shadow-soft margin-top">
                    <div class="card-header"><h4><i class="fas fa-list"></i> Daftar Siswa Terdaftar</h4></div>
                    <div id="student-list-container" class="card-body">
                        <p class="text-muted">Silahkan tentukan Sekolah dan Kelas di atas untuk memuat data siswa.</p>
                    </div>
                </div>
            </div>

            <div id="tab-kelas-content" class="tab-content fade-in">
                <div class="session-banner" id="kelas-session-banner">
                    <i class="fas fa-info-circle"></i> Memuat status sinkronisasi periode aktif...
                </div>

                <div class="card shadow-soft margin-top">
                    <div class="card-header"><h4 id="title-form-kelas"><i class="fas fa-plus"></i> Buat / Ubah Kelas</h4></div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Pilih Sekolah</label>
                                <select id="kelas-school-select" class="form-input"><option value="">-- Pilih Sekolah --</option></select>
                            </div>
                            <div class="form-group">
                                <label>Nama Kelas</label>
                                <input type="text" id="input-class-name" class="form-input" placeholder="Contoh: P1-P2 / Grade 1">
                            </div>
                        </div>
                        <div class="form-grid margin-top">
                            <div class="form-group">
                                <label>Level</label>
                                <select id="input-class-level" class="form-input">
                                    <option value="">-- Memuat level --</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Jadwal Belajar</label>
                                <input type="text" id="input-class-jadwal" class="form-input" placeholder="Contoh: Rabu Pukul 13.00-14.00">
                            </div>
                        </div>
                        <div class="form-actions margin-top">
                            <button id="btn-add-class" class="btn-primary">Simpan Kelas</button>
                            <button id="btn-cancel-class" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </div>
                </div>

                <div class="card shadow-soft margin-top">
                    <div class="card-header"><h4><i class="fas fa-cubes"></i> Daftar Kelas Terdaftar</h4></div>
                    <div class="card-body">
                        <select id="filter-class-school" class="form-input" style="max-width:300px; margin-bottom:15px;"><option value="">-- Filter Berdasarkan Sekolah --</option></select>
                        <div id="class-list-container"><p class="text-muted">Pilih sekolah untuk menampilkan data kelas.</p></div>
                    </div>
                </div>
            </div>

            <div id="tab-sekolah-content" class="tab-content fade-in">
                <div class="card shadow-soft">
                    <div class="card-header"><h4 id="title-form-sekolah"><i class="fas fa-plus"></i> Pendaftaran Master Sekolah</h4></div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Nama Sekolah</label>
                                <input type="text" id="input-school-name" class="form-input" placeholder="Contoh: TKK PLUS PENABUR CIREBON">
                            </div>
                            <div class="form-group">
                                <label>Alamat Sekolah</label>
                                <input type="text" id="input-school-address" class="form-input" placeholder="Contoh: Jl. Pemuda Cirebon">
                            </div>
                        </div>
                        <div class="form-actions margin-top">
                            <button id="btn-add-school" class="btn-primary">Simpan Sekolah</button>
                            <button id="btn-cancel-school" class="btn-secondary" style="display:none;">Batal</button>
                        </div>
                    </div>
                </div>

                <div class="card shadow-soft margin-top">
                    <div class="card-header"><h4><i class="fas fa-building"></i> Data Master Sekolah (CSV Verified)</h4></div>
                    <div class="card-body" id="school-list-container">
                        <i class="fas fa-spinner fa-spin"></i> Menghubungkan ke database...
                    </div>
                </div>
            </div>

            <div id="tab-setting-content" class="tab-content fade-in">
                <div class="card shadow-soft">
                    <div class="card-header"><h4><i class="fas fa-calendar-alt"></i> Periode Aktif</h4></div>
                    <div class="card-body">
                        <div class="session-banner" id="periode-active-banner" style="margin-bottom:15px;">
                            <i class="fas fa-info-circle"></i> Memuat periode aktif...
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label>Tahun Ajaran</label>
                                <select id="setting-ta-context-select" class="form-input"><option value="">-- Pilih TA --</option></select>
                            </div>
                            <div class="form-group">
                                <label>Semester</label>
                                <select id="setting-semester-select" class="form-input" disabled><option value="">-- Pilih TA terlebih dahulu --</option></select>
                            </div>
                        </div>

                        <button id="btn-apply-periode" class="btn-primary margin-top" style="width:100%;">
                            <i class="fas fa-check-circle"></i> Terapkan Periode Aktif</button>

                        <hr class="form-divider">

                        <div class="form-group">
                            <label>Tambah Tahun Ajaran / Semester</label>
                            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                <input type="text" id="input-setting-ta" class="form-input" placeholder="Contoh: 2026/2027" style="flex:1; min-width:150px;">
                                <button id="btn-save-ta-global" class="btn-primary" style="padding:10px 18px;">+ TA</button>
                                <input type="text" id="input-setting-semester" class="form-input" placeholder="Contoh: Semester 1" style="flex:1; min-width:150px;" disabled>
                                <button id="btn-save-sem-global" class="btn-primary" style="padding:10px 18px;" disabled>+ Semester</button>
                            </div>
                            <p class="text-muted" style="font-size:.78rem; margin-top:6px;">
                                Tambah data master di sini, lalu pilih TA & Semester di dropdown atas
                                dan klik <b>Terapkan Periode Aktif</b>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div id="delete-modal" class="modal-overlay" style="display:none;">
                <div class="modal-content">
                    <h3>Konfirmasi Penghapusan</h3>
                    <p>Apakah Anda yakin ingin menghapus data ini? Seluruh data yang berelasi mungkin akan terdampak.</p>
                    <div class="modal-actions">
                        <button id="confirm-delete-btn" class="btn-danger">Ya, Hapus</button>
                        <button type="button" id="cancel-delete-btn" class="btn-secondary">Batal</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    initAccordions(canvas);
    setupEvents();
    await fetchGlobalSession();
    await loadSchools();
    await loadLevelOptions();
}

// ==========================================
// 2b. ACCORDION (Collapsible Card)
// ==========================================
function initAccordions(canvas) {
    canvas.querySelectorAll('.card').forEach(card => {
        const header = card.querySelector(':scope > .card-header');
        if (!header) return;

        header.classList.add('acc-header');
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'true');

        if (!header.querySelector('.acc-chevron')) {
            const chev = document.createElement('i');
            chev.className = 'fas fa-chevron-down acc-chevron';
            chev.setAttribute('aria-hidden', 'true');
            header.appendChild(chev);
        }

        const toggle = () => {
            const nowCollapsed = header.classList.toggle('collapsed');
            const body = card.querySelector(':scope > .card-body');
            if (body) body.classList.toggle('collapsed', nowCollapsed);
            header.setAttribute('aria-expanded', String(!nowCollapsed));
        };

        header.addEventListener('click', (e) => {
            if (e.target.closest('input, select, button, textarea, a, label')) return;
            toggle();
        });
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
    });
}

// ==========================================
// 3. EVENT BINDINGS
// ==========================================
function setupEvents() {
    document.getElementById('btn-siswa').onclick = () => switchTab('siswa');
    document.getElementById('btn-kelas').onclick = () => { switchTab('kelas'); updateKelasBanner(); renderClassesList(); };
    document.getElementById('btn-sekolah').onclick = () => switchTab('sekolah');
    document.getElementById('btn-setting').onclick = () => { switchTab('setting'); loadSettingModules(); };

    const schoolSelect = document.getElementById('reg-school-select');
    const classSelect = document.getElementById('reg-class-select');
    
    schoolSelect.onchange = (e) => loadClasses(e.target.value);
    classSelect.onchange = (e) => loadStudentsList(e.target.value);

    document.getElementById('filter-class-school').onchange = (e) => renderClassesList(e.target.value);
    document.getElementById('setting-ta-context-select').onchange = (e) => loadSemesterSelect(e.target.value);
    document.getElementById('btn-apply-periode').onclick = applyActivePeriod;

    document.getElementById('add-row-btn').onclick = () => {
        if (currentEditStudentId) return alert("Peringatan: Mode ubah aktif. Selesaikan atau batalkan editing sebelum menambah baris!");
        const tbody = document.querySelector('#student-input-table tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" name="student_name" class="form-input" placeholder="Nama Lengkap Siswa" required></td>
            <td><input type="text" name="student_grade" class="form-input" placeholder="Grade Asal"></td>
            <td><button type="button" class="btn-remove-row" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(tr);
    };

    document.getElementById('apply-batch-btn').onclick = applyBatchToTable;

    document.getElementById('save-students-btn').onclick = handleSaveStudents;
    document.getElementById('cancel-student-btn').onclick = resetStudentForm;
    
    document.getElementById('btn-add-class').onclick = handleSaveClass;
    document.getElementById('btn-cancel-class').onclick = resetClassForm;

    document.getElementById('btn-add-school').onclick = handleSaveSchool;
    document.getElementById('btn-cancel-school').onclick = resetSchoolForm;

    document.getElementById('btn-save-ta-global').onclick = handleAddAcademicYear;
    document.getElementById('btn-save-sem-global').onclick = handleAddSemester;
    
    document.getElementById('confirm-delete-btn').onclick = confirmDelete;
    document.getElementById('cancel-delete-btn').onclick = () => { document.getElementById('delete-modal').style.display = 'none'; };

    window.openDeleteModal = (id, category) => {
        deleteTargetId = id;
        deleteCategory = category;
        document.getElementById('delete-modal').style.display = 'flex';
    };
}

function switchTab(target) {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`btn-${target}`).classList.add('active');
    document.getElementById(`tab-${target}-content`).classList.add('active');
}

function updateKelasBanner() {
    const kelasBanner = document.getElementById('kelas-session-banner');
    if (kelasBanner) {
        kelasBanner.innerHTML = `
            <i class="fas fa-link"></i> Pembuatan kelas baru otomatis terikat pada periode aktif: 
            <strong>TA ${activeYearLabel}</strong> — <strong>${activeSemesterLabel}</strong>.
        `;
    }
    // Banner tab Siswa: konteks periode untuk pemilihan kelas
    const siswaBanner = document.getElementById('siswa-session-banner');
    if (siswaBanner) {
        siswaBanner.innerHTML = `
            <i class="fas fa-calendar-check"></i> Periode aktif sistem: 
            <strong>TA ${activeYearLabel}</strong> — <strong>${activeSemesterLabel}</strong>. 
            Kelas bertanda <strong>★</strong> adalah kelas periode berjalan.
        `;
    }
}

// ==========================================
// 4. TA & SEMESTER TOGGLE AUTO-SYNC LOGIC
// ==========================================
async function fetchGlobalSession() {
    try {
        const { data: currentTA } = await supabase.from('academic_years').select('id, year').eq('is_active', true).limit(1).maybeSingle();
        const { data: currentSem } = await supabase.from('semesters').select('id, name').eq('is_active', true).limit(1).maybeSingle();
        
        activeAcademicYearId = currentTA ? currentTA.id : null;
        activeYearLabel = currentTA ? currentTA.year : "Belum Set";
        activeSemesterId = currentSem ? currentSem.id : null;
        activeSemesterLabel = currentSem ? currentSem.name : "Belum Set";
        
        updateKelasBanner();
    } catch (err) {
        console.error("Gagal melakukan sinkronisasi session:", err);
    }
}

async function loadSettingModules() {
    // Pastikan state periode aktif selalu sinkron dari DB sebelum render picker
    await fetchGlobalSession();

    // 1. Isi dropdown Tahun Ajaran
    const selectTA = document.getElementById('setting-ta-context-select');
    const prevVal = selectTA.value;
    selectTA.innerHTML = '<option value="">-- Pilih TA --</option>';

    const { data } = await supabase.from('academic_years').select('id, year, is_active').order('year', { ascending: false });
    const rows = data || [];

    // TA aktif dinaikkan ke paling atas agar mudah terlihat, sisanya urut tahun terbaru
    const sorted = [...rows].sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return String(b.year).localeCompare(String(a.year));
    });

    sorted.forEach(ta => selectTA.add(new Option(
        ta.is_active ? `${ta.year} (Aktif)` : ta.year, ta.id
    )));

    // Auto-pick: 1) nilai yang sedang dipilih, 2) TA aktif di DB, 3) TA teratas
    const targetId =
        (prevVal && rows.some(r => r.id === prevVal)) ? prevVal
        : (activeAcademicYearId && rows.some(r => r.id === activeAcademicYearId)) ? activeAcademicYearId
        : (sorted[0]?.id || '');
    selectTA.value = targetId;

    // 2. Isi dropdown Semester mengikuti TA terpilih
    await loadSemesterSelect(targetId);

    // 3. Perbarui banner info periode aktif
    updatePeriodeBanner();
}

// Isi dropdown semester untuk TA tertentu; auto-pick semester aktif bila relevan
async function loadSemesterSelect(taId) {
    const selectSem = document.getElementById('setting-semester-select');
    const inputSem = document.getElementById('input-setting-semester');
    const btnSem = document.getElementById('btn-save-sem-global');

    selectSem.innerHTML = '<option value="">-- Pilih Semester --</option>';
    const noTa = !taId;
    selectSem.disabled = noTa;
    inputSem.disabled = noTa;
    btnSem.disabled = noTa;
    if (noTa) return;

    const { data } = await supabase.from('semesters')
        .select('id, name, is_active')
        .eq('academic_year_id', taId)
        .order('name');

    const sems = data || [];
    // Semester aktif dinaikkan ke paling atas, sisanya urut nama
    const sorted = [...sems].sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return String(a.name).localeCompare(String(b.name));
    });

    sorted.forEach(sem => selectSem.add(new Option(
        sem.is_active ? `${sem.name} (Aktif)` : sem.name, sem.id
    )));

    // Auto-pick semester aktif (hanya jika TA terpilih = TA aktif), else semester pertama
    const activeSemHere = sems.find(s => s.is_active);
    selectSem.value = (activeAcademicYearId === taId && activeSemHere) ? activeSemHere.id
        : (sorted[0]?.id || '');
}

// Terapkan TA + Semester terpilih sebagai periode aktif sistem
async function applyActivePeriod() {
    const taId = document.getElementById('setting-ta-context-select').value;
    const semId = document.getElementById('setting-semester-select').value;

    if (!taId || !semId) return alert('Gagal: Pilih Tahun Ajaran dan Semester terlebih dahulu.');

    const taLabel = document.querySelector('#setting-ta-context-select option:checked')?.text || '';
    const semLabel = document.querySelector('#setting-semester-select option:checked')?.text || '';

    const ok = confirm(`Terapkan periode aktif ke:\n\nTA ${taLabel} · ${semLabel}?\n\nPeriode lain otomatis dinonaktifkan.`);
    if (!ok) return;

    const btn = document.getElementById('btn-apply-periode');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
        // Nonaktifkan semua TA & semester, lalu aktifkan yang terpilih
        await supabase.from('academic_years').update({ is_active: false }).neq('is_active', null);
        await supabase.from('academic_years').update({ is_active: true }).eq('id', taId);
        await supabase.from('semesters').update({ is_active: false }).neq('is_active', null);
        await supabase.from('semesters').update({ is_active: true }).eq('id', semId);

        alert(`Sukses: Periode aktif dipindahkan ke TA ${taLabel} · ${semLabel}.`);
    } catch (err) {
        alert(`Gagal: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
        await fetchGlobalSession();
        await loadSettingModules();
        updateKelasBanner();
    }
}

// Banner info di atas picker periode aktif
function updatePeriodeBanner() {
    const banner = document.getElementById('periode-active-banner');
    if (!banner) return;
    if (activeAcademicYearId && activeSemesterId) {
        banner.innerHTML = `
            <i class="fas fa-calendar-check"></i>
            Periode aktif saat ini: <strong>TA ${activeYearLabel}</strong> —
            <strong>${activeSemesterLabel}</strong>.
            Pilih TA & Semester di bawah lalu klik <b>Terapkan</b> untuk mengganti.`;
    } else {
        banner.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            Belum ada periode aktif. Pilih TA & Semester di bawah lalu klik <b>Terapkan Periode Aktif</b>.`;
    }
}

async function loadSemesterTable(taId) {
    // Legacy alias — aman bila ada kode luar yang masih memanggilnya.
    await loadSemesterSelect(taId);
}

// ==========================================
// 5. CRUD: MASTER SEKOLAH
// ==========================================
async function loadSchools() {
    const { data } = await supabase.from('schools').select('*').order('name');
    const regSelect = document.getElementById('reg-school-select');
    const classSelect = document.getElementById('kelas-school-select');
    const filterSelect = document.getElementById('filter-class-school');

    const prevReg = regSelect.value;
    const prevClass = classSelect.value;
    const prevFilter = filterSelect.value;

    regSelect.innerHTML = '<option value="">-- Pilih Sekolah --</option>';
    classSelect.innerHTML = '<option value="">-- Pilih Sekolah --</option>';
    filterSelect.innerHTML = '<option value="">-- Semua Sekolah --</option>';

    (data || []).forEach(s => {
        regSelect.add(new Option(s.name, s.id));
        classSelect.add(new Option(s.name, s.id));
        filterSelect.add(new Option(s.name, s.id));
    });

    regSelect.value = prevReg;
    classSelect.value = prevClass;
    filterSelect.value = prevFilter;

    renderSchoolsList(data);
}

// Level Kelas selalu mengikuti MASTER `levels` (kode = nama level).
// Dipanggil saat init; jika tabel levels gagal dibaca, fallback
// ke Kiddy/Beginner agar form tetap berfungsi.
async function loadLevelOptions() {
    const select = document.getElementById('input-class-level');
    if (!select) return;
    const prevVal = select.value;
    select.innerHTML = '';

    let list = [];
    try {
        const { data, error } = await supabase
            .from('levels')
            .select('id, kode, order_index')
            .order('order_index', { ascending: true, nullsFirst: false })
            .order('kode', { ascending: true });
        if (error) throw error;
        list = data || [];
    } catch (err) {
        console.error('Gagal memuat level dari tabel levels:', err.message);
    }

    if (!list.length) {
        // Fallback: pastikan form tetap bisa dipakai saat tabel levels kosong/gagal
        list = [{ kode: 'Kiddy' }, { kode: 'Beginner' }];
        console.warn('Level fallback (Kiddy/Beginner) dipakai karena tabel levels tidak tersedia.');
    }

    list.forEach(lv => select.add(new Option(lv.kode, lv.kode)));

    // Default = level pertama sesuai order_index; saat edit, editClass()
    // yang akan mengembalikan nilai lama (levat prevVal).
    select.value = prevVal || (select.options[0]?.value || '');
}

async function handleSaveSchool() {
    const name = document.getElementById('input-school-name').value.trim();
    const address = document.getElementById('input-school-address').value.trim();
    if (!name) return alert("Gagal: Kolom Nama Sekolah tidak boleh kosong!");

    const btn = document.getElementById('btn-add-school');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Menyimpan data (Pending)...";

    try {
        if (currentEditSchoolId) {
            const { error } = await supabase.from('schools').update({ name, address: address || null }).eq('id', currentEditSchoolId);
            if (error) throw error;
            alert("Sukses: Data sekolah berhasil diperbarui!");
        } else {
            const { error } = await supabase.from('schools').insert([{ name, address: address || null, is_active: false }]);
            if (error) throw error;
            alert("Sukses: Sekolah baru berhasil didaftarkan!");
        }
        resetSchoolForm();
        await loadSchools();
    } catch (err) {
        alert("Gagal menyimpan data: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function renderSchoolsList(data) {
    const container = document.getElementById('school-list-container');
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted">Tidak ada data sekolah di database.</p>';
        return;
    }

    window.editSchool = (id, name, address) => {
        currentEditSchoolId = id;
        document.getElementById('input-school-name').value = name;
        document.getElementById('input-school-address').value = address === 'null' || !address ? '' : address;
        document.getElementById('title-form-sekolah').innerHTML = '<i class="fas fa-edit"></i> Perbarui Data Sekolah';
        document.getElementById('btn-add-school').textContent = "Update Sekolah";
        document.getElementById('btn-cancel-school').style.display = 'inline-block';
    };

    container.innerHTML = `
        <table class="modern-table">
            <thead><tr><th>Nama Sekolah</th><th>Alamat / Lokasi</th><th width="100">Aksi</th></tr></thead>
            <tbody>
                ${data.map(s => `
                    <tr>
                        <td><strong>${s.name}</strong></td>
                        <td><span class="text-muted">${s.address || '-'}</span></td>
                        <td>
                            <button type="button" class="btn-icon text-primary" onclick="window.editSchool('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${s.address ? s.address.replace(/'/g, "\\'") : ''}')"><i class="fas fa-edit"></i></button>
                            <button type="button" class="btn-icon text-danger" onclick="window.openDeleteModal('${s.id}', 'school')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function resetSchoolForm() {
    currentEditSchoolId = null;
    document.getElementById('input-school-name').value = '';
    document.getElementById('input-school-address').value = '';
    document.getElementById('title-form-sekolah').innerHTML = '<i class="fas fa-plus"></i> Pendaftaran Master Sekolah';
    document.getElementById('btn-add-school').textContent = "Simpan Sekolah";
    document.getElementById('btn-cancel-school').style.display = 'none';
}

// ==========================================
// 6. CRUD: MANAJEMEN KELAS
// ==========================================
async function handleSaveClass() {
    const schoolId = document.getElementById('kelas-school-select').value;
    const name = document.getElementById('input-class-name').value.trim();
    const level = document.getElementById('input-class-level').value;
    const jadwal = document.getElementById('input-class-jadwal').value.trim();

    if (!schoolId || !name) return alert("Gagal: Sekolah dan Nama Kelas wajib ditentukan!");
    if (!level) return alert("Gagal: Level kelas wajib ditentukan.");

    // [GARD] Pastikan level yang dipilih benar-benar terdaftar di master `levels`.
    // Ini mencegah nilai hasil edit/migrasi lama yang tidak relevan terkirim ke DB.
    const levelSelect = document.getElementById('input-class-level');
    const isKnownLevel = Array.from(levelSelect.options).some(o => o.value === level);
    if (!isKnownLevel) {
        return alert(`Gagal: Level "${level}" tidak dikenali. Silakan pilih level dari daftar master.`);
    }

    const btn = document.getElementById('btn-add-class');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Memproses (Pending)...";

    try {
        if (currentEditClassId) {
            const { error } = await supabase.from('classes').update({
                school_id: schoolId, name, level, jadwal: jadwal || null
            }).eq('id', currentEditClassId);
            if (error) throw error;
            alert("Sukses: Data kelas berhasil diubah!");
        } else {
            if (!activeAcademicYearId || !activeSemesterId) {
                throw new Error("Sistem menolak pembuatan kelas. Silahkan aktifkan TA/Semester di tab pengaturan terlebih dahulu!");
            }
            const { error } = await supabase.from('classes').insert([{
                school_id: schoolId, name, level, jadwal: jadwal || null,
                academic_year_id: activeAcademicYearId, semester_id: activeSemesterId
            }]);
            if (error) throw error;
            alert("Sukses: Kelas baru berhasil ditambahkan!");
        }
        resetClassForm();
        renderClassesList(document.getElementById('filter-class-school').value);
    } catch (err) {
        // [GARD] Error khusus CHECK constraint lama pada classes.level.
        // Solusi permanen: jalankan migrasi migrations/2026-08-31-classes-level-dinamis.sql
        // (DROP CONSTRAINT classes_level_check) di Supabase SQL Editor.
        if (/check constraint|classes_level_check|violates check/i.test(err.message || '')) {
            alert('Database masih membatasi level kelas (constraint classes_level_check). ' +
                  'Jalankan migrasi "2026-08-31-classes-level-dinamis.sql" di Supabase SQL Editor terlebih dahulu, ' +
                  'atau pilih level yang sudah diizinkan (Kiddy/Beginner).');
        } else {
            alert("Gagal: " + err.message);
        }
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function renderClassesList(schoolId) {
    const container = document.getElementById('class-list-container');

    // [FIX] Daftar kelas sekarang menampilkan SEMUA kelas pada periode aktif
    // (TA + Semester aktif), tanpa wajib memilih sekolah. Filter sekolah (opsional)
    // hanya mempersempit tampilan jika user memilihnya.
    if (!activeAcademicYearId || !activeSemesterId) {
        container.innerHTML = `<p class="text-muted">Periode aktif belum diatur. Set TA & Semester di tab <b>Periode Aktif</b> terlebih dahulu.</p>`;
        return;
    }

    let query = supabase
        .from('classes')
        .select('*, schools(name), academic_years(year), semesters(name)')
        .eq('academic_year_id', activeAcademicYearId)
        .eq('semester_id', activeSemesterId)
        .order('name');
    // Filter sekolah bersifat opsional (default: semua sekolah)
    if (schoolId) query = query.eq('school_id', schoolId);

    const { data, error } = await query;
    if (error) {
        container.innerHTML = `<p class="text-muted">Gagal memuat kelas: ${error.message}</p>`;
        return;
    }
    if (!data || data.length === 0) {
        container.innerHTML = schoolId
            ? '<p class="text-muted">Belum ada kelas terdaftar untuk sekolah ini pada periode aktif.</p>'
            : '<p class="text-muted">Belum ada kelas terdaftar pada periode aktif.</p>';
        return;
    }

    // Urutkan nama kelas A-Z (periode sudah seragam = periode aktif)
    data.sort((a, b) => a.name.localeCompare(b.name));

    window.editClass = (id, school, name, level, jadwal) => {
        currentEditClassId = id;
        document.getElementById('kelas-school-select').value = school;
        document.getElementById('input-class-name').value = name;
        // Jika level lama tidak ada daftar levels (kelas terdaftar sebelum migrasi),
        // tambahkan sementara agar nilai lama tetap terbaca saat diedit.
        const levelSel = document.getElementById('input-class-level');
        if (level && !Array.from(levelSel.options).some(o => o.value === level)) {
            levelSel.add(new Option(level, level));
        }
        levelSel.value = level || '';
        document.getElementById('input-class-jadwal').value = jadwal === 'null' || !jadwal ? '' : jadwal;
        
        document.getElementById('title-form-kelas').innerHTML = '<i class="fas fa-edit"></i> Edit Konfigurasi Kelas';
        document.getElementById('btn-add-class').textContent = "Update Kelas";
        document.getElementById('btn-cancel-class').style.display = 'inline-block';
    };

    const filterLabel = schoolId
        ? (Array.from(document.getElementById('filter-class-school').options).find(o => o.value === schoolId)?.text || '')
        : 'semua sekolah';

    container.innerHTML = `
        <div class="text-muted" style="margin-bottom:10px;">
            Menampilkan <strong>${data.length}</strong> kelas pada periode aktif —
            <strong>TA ${activeYearLabel}</strong> · <strong>${activeSemesterLabel}</strong>
            ${schoolId ? ` — Sekolah: <strong>${filterLabel}</strong>` : ' — Semua Sekolah'}.
        </div>
        <table class="modern-table">
            <thead><tr>
                <th>Nama Kelas</th><th>Sekolah</th><th>Level</th><th>Periode (TA · Semester)</th><th>Jadwal Belajar</th><th width="100">Aksi</th>
            </tr></thead>
            <tbody>
                ${data.map(c => `
                    <tr>
                        <td><strong>${c.name}</strong></td>
                        <td>${c.schools?.name || '-'}</td>
                        <td><span class="badge-grade">${c.level || '-'}</span></td>
                        <td><span class="badge-period">${c.academic_years?.year || '-'} · ${c.semesters?.name || '-'}</span></td>
                        <td><span class="text-muted">${c.jadwal || '-'}</span></td>
                        <td>
                            <button type="button" class="btn-icon text-primary" onclick="window.editClass('${c.id}', '${c.school_id}', '${c.name}', '${c.level}', '${c.jadwal ? c.jadwal.replace(/'/g, "\\'") : ''}')"><i class="fas fa-edit"></i></button>
                            <button type="button" class="btn-icon text-danger" onclick="window.openDeleteModal('${c.id}', 'class')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>
    `;
}

function resetClassForm() {
    currentEditClassId = null;
    document.getElementById('input-class-name').value = '';
    document.getElementById('input-class-jadwal').value = '';
    document.getElementById('title-form-kelas').innerHTML = '<i class="fas fa-plus"></i> Buat / Ubah Kelas';
    document.getElementById('btn-add-class').textContent = "Simpan Kelas";
    document.getElementById('btn-cancel-class').style.display = 'none';
}

// ==========================================
// 7. CRUD: DATA SISWA (WITH INLINE TOGGLE)
// ==========================================
async function loadClasses(schoolId) {
    const select = document.getElementById('reg-class-select');
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    select.disabled = !schoolId;
    if (!schoolId) return;

    // Ambil kelas BESERTA periode (TA & Semester) agar tidak ambigu
    const { data } = await supabase.from('classes')
        .select('id, name, academic_year_id, semester_id, academic_years(year), semesters(name)')
        .eq('school_id', schoolId)
        .order('name');

    // Urutkan: periode terbaru di atas, lalu nama kelas
    const sorted = (data || []).sort((a, b) => {
        const ya = a.academic_years?.year || '', yb = b.academic_years?.year || '';
        if (ya !== yb) return yb.localeCompare(ya);
        const sa = a.semesters?.name || '', sb = b.semesters?.name || '';
        if (sa !== sb) return sb.localeCompare(sa);
        return a.name.localeCompare(b.name);
    });

    sorted.forEach(c => {
        const ta = c.academic_years?.year || 'TA ?';
        const sem = c.semesters?.name || 'Semester ?';
        const isActivePeriod = (c.academic_year_id === activeAcademicYearId && c.semester_id === activeSemesterId);
        const label = isActivePeriod
            ? `★ ${c.name} — ${ta} · ${sem} (PERIODE AKTIF)`
            : `${c.name} — ${ta} · ${sem}`;
        select.add(new Option(label, c.id));
    });
}

async function loadStudentsList(classId) {
    const container = document.getElementById('student-list-container');
    if (!classId) { container.innerHTML = '<p class="text-muted">Silahkan pilih kelas untuk memuat data.</p>'; return; }

    container.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungkan ke database server...';
    const { data, error } = await supabase.from('students').select('*').eq('class_id', classId).order('name', { ascending: true });

    if (error) { container.innerHTML = 'Gagal sinkronisasi data dari server.'; return; }
    if (data.length === 0) { container.innerHTML = '<p class="text-muted">Tidak ada siswa terdaftar di dalam kelas ini.</p>'; return; }

    window.toggleStudentStatus = async (id, status) => {
        const { error: err } = await supabase.from('students').update({ is_active: status }).eq('id', id);
        if (err) alert("Gagal: Sistem tidak dapat memperbarui status keaktifan siswa!");
    };

    window.editStudent = (id, name, grade) => {
        currentEditStudentId = id;
        document.querySelector('[name="student_name"]').value = name;
        document.querySelector('[name="student_grade"]').value = grade === 'null' || !grade ? '' : grade;
        
        document.getElementById('title-form-siswa').innerHTML = '<i class="fas fa-edit"></i> Edit Informasi Siswa';
        document.getElementById('save-students-btn').textContent = "Update Siswa";
        document.getElementById('cancel-student-btn').style.display = 'inline-block';
        document.getElementById('add-row-btn').style.display = 'none';
        const batchBtn = document.getElementById('apply-batch-btn');
        if (batchBtn) { batchBtn.disabled = true; batchBtn.style.opacity = '0.5'; }
    };

    container.innerHTML = `
        <div class="table-responsive">
            <table class="modern-table">
                <thead><tr><th>Nama Siswa</th><th>Grade Asal (CSV)</th><th width="110">Status Aktif</th><th width="100">Aksi</th></tr></thead>
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
                                <button type="button" class="btn-icon text-primary" onclick="window.editStudent('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${s.grade ? s.grade.replace(/'/g, "\\'") : ''}')"><i class="fas fa-edit"></i></button>
                                <button type="button" class="btn-icon text-danger" onclick="window.openDeleteModal('${s.id}', 'student')"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function handleSaveStudents() {
    const schoolId = document.getElementById('reg-school-select').value;
    const classId = document.getElementById('reg-class-select').value;
    if (!schoolId || !classId) return alert("Gagal: Konteks sekolah dan kelas penempatan wajib ditentukan!");

    const rows = document.querySelectorAll('#student-input-table tbody tr');
    const studentsData = [];

    rows.forEach(row => {
        const name = row.querySelector('[name="student_name"]').value.trim();
        const grade = row.querySelector('[name="student_grade"]').value.trim();
        if (name) studentsData.push({ name, grade: grade || null, class_id: classId, school_id: schoolId, is_active: true });
    });

    if (studentsData.length === 0) return alert("Gagal: Input nama siswa kosong!");
    
    const btn = document.getElementById('save-students-btn');
    btn.disabled = true;
    btn.textContent = "Memproses transaksi (Pending)...";

    try {
        if (currentEditStudentId) {
            const { error } = await supabase.from('students').update(studentsData[0]).eq('id', currentEditStudentId);
            if (error) throw error;
            alert("Sukses: Data siswa berhasil diperbarui!");
        } else {
            const { error } = await supabase.from('students').insert(studentsData);
            if (error) throw error;
            alert(`Sukses: Berhasil memasukkan ${studentsData.length} data siswa baru!`);
        }
        resetStudentForm();
        loadStudentsList(classId);
    } catch (e) {
        alert("Gagal memproses ke database: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = currentEditStudentId ? "Update Siswa" : "Simpan Data Siswa";
    }
}

function resetStudentForm() {
    currentEditStudentId = null;
    document.getElementById('title-form-siswa').innerHTML = '<i class="fas fa-plus-circle"></i> Kelola & Registrasi Siswa';
    document.getElementById('save-students-btn').textContent = "Simpan Data Siswa";
    document.getElementById('cancel-student-btn').style.display = 'none';
    document.getElementById('add-row-btn').style.display = 'inline-block';
    const batchInput = document.getElementById('batch-student-input');
    if (batchInput) batchInput.value = '';
    const batchFeedback = document.getElementById('batch-feedback');
    if (batchFeedback) { batchFeedback.textContent = ''; batchFeedback.style.color = ''; }
    const batchBtn = document.getElementById('apply-batch-btn');
    if (batchBtn) { batchBtn.disabled = false; batchBtn.style.opacity = ''; }
    document.querySelector('#student-input-table tbody').innerHTML = `
        <tr>
            <td><input type="text" name="student_name" class="form-input" placeholder="Nama Lengkap Siswa" required></td>
            <td><input type="text" name="student_grade" class="form-input" placeholder="Grade Asal"></td>
            <td></td>
        </tr>
    `;
}

// ==========================================
// 7b. INPUT BATCH SISWA (Separator #)
// ==========================================
// Format: 1 baris = 1 siswa, pola "Nama # Grade".
// Baris kosong / baris tanpa nama akan dihitung sebagai skipped.
// ==========================================
function parseBatchStudents(raw) {
    const students = [];
    let skippedLines = 0;

    raw.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) { skippedLines++; return; }

        const sep = trimmed.indexOf('#');
        let name, grade = '';
        if (sep === -1) {
            name = trimmed;
        } else {
            name = trimmed.slice(0, sep).trim();
            grade = trimmed.slice(sep + 1).trim();
        }
        if (!name) { skippedLines++; return; }
        students.push({ name, grade });
    });

    return { students, skippedLines };
}

function applyBatchToTable() {
    if (currentEditStudentId) return alert("Peringatan: Mode ubah aktif. Selesaikan atau batalkan editing sebelum menambah baris!");

    const raw = document.getElementById('batch-student-input').value || '';
    const { students, skippedLines } = parseBatchStudents(raw);
    const feedback = document.getElementById('batch-feedback');

    if (students.length === 0) {
        feedback.textContent = skippedLines > 0
            ? 'Tidak ada baris valid — periksa format (Nama # Grade).'
            : 'Kosong: tidak ada data untuk diterapkan.';
        feedback.style.color = '#b91c1c';
        return;
    }

    // Isi ulang tabel input (masih bisa diedit per baris sebelum disimpan)
    const tbody = document.querySelector('#student-input-table tbody');
    tbody.innerHTML = '';

    students.forEach(s => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        const inputName = document.createElement('input');
        inputName.type = 'text';
        inputName.name = 'student_name';
        inputName.className = 'form-input';
        inputName.placeholder = 'Nama Lengkap Siswa';
        inputName.required = true;
        inputName.value = s.name;
        tdName.appendChild(inputName);

        const tdGrade = document.createElement('td');
        const inputGrade = document.createElement('input');
        inputGrade.type = 'text';
        inputGrade.name = 'student_grade';
        inputGrade.className = 'form-input';
        inputGrade.placeholder = 'Grade Asal';
        inputGrade.value = s.grade;
        tdGrade.appendChild(inputGrade);

        const tdAction = document.createElement('td');
        if (students.length > 1) {
            const btnRemove = document.createElement('button');
            btnRemove.type = 'button';
            btnRemove.className = 'btn-remove-row';
            btnRemove.innerHTML = '<i class="fas fa-times"></i>';
            btnRemove.onclick = () => tr.remove();
            tdAction.appendChild(btnRemove);
        }

        tr.appendChild(tdName);
        tr.appendChild(tdGrade);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    });

    feedback.style.color = '';
    feedback.textContent = `Berhasil menyiapkan ${students.length} siswa di tabel.`;
    if (skippedLines > 0) feedback.textContent += ` ${skippedLines} baris kosong diabaikan.`;
}

// ==========================================
// 8. DATA GENERATION CONFIGURATION
// ==========================================
async function handleAddAcademicYear() {
    const input = document.getElementById('input-setting-ta');
    const val = input.value.trim();
    if (!val) return alert("Gagal: Input Tahun Ajaran kosong.");

    try {
        // Langsung pilih TA yang baru ditambahkan agar bisa segera memuat semester-nya
        const { data, error } = await supabase.from('academic_years').insert([{ year: val, is_active: false }]).select();
        if (error) throw error;
        alert(`Sukses: Tahun Ajaran ${val} terdaftar.`);
        input.value = '';

        await loadSettingModules();
        if (data?.[0]) {
            document.getElementById('setting-ta-context-select').value = data[0].id;
            await loadSemesterSelect(data[0].id);
        }
    } catch (err) { alert("Gagal: " + err.message); }
}

async function handleAddSemester() {
    const taId = document.getElementById('setting-ta-context-select').value;
    const input = document.getElementById('input-setting-semester');
    const val = input.value.trim();
    if (!val || !taId) return alert("Gagal: Parameter tidak lengkap.");

    try {
        // Langsung pilih semester yang baru ditambahkan pada dropdown semester
        const { data, error } = await supabase.from('semesters').insert([{ name: val, academic_year_id: taId, is_active: false }]).select();
        if (error) throw error;
        alert(`Sukses: ${val} berhasil ditambahkan.`);
        input.value = '';

        await loadSemesterSelect(taId);
        if (data?.[0]) document.getElementById('setting-semester-select').value = data[0].id;
    } catch (err) { alert("Gagal: " + err.message); }
}

// ==========================================
// 9. TRANSACTION: MASTER DELETION HANDLER
// ==========================================
async function confirmDelete() {
    if (!deleteTargetId || !deleteCategory) return;
    
    let table = '';
    if (deleteCategory === 'student') table = 'students';
    else if (deleteCategory === 'class') table = 'classes';
    else if (deleteCategory === 'school') table = 'schools';

    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.textContent = "Menghapus (Pending)...";

    try {
        const { error } = await supabase.from(table).delete().eq('id', deleteTargetId);
        if (error) throw error;

        alert(`Sukses: Data ${deleteCategory} berhasil dihapus secara permanen.`);
        document.getElementById('delete-modal').style.display = 'none';

        if (deleteCategory === 'school') {
            await loadSchools();
        } else if (deleteCategory === 'class') {
            renderClassesList(document.getElementById('filter-class-school').value);
        } else if (deleteCategory === 'student') {
            loadStudentsList(document.getElementById('reg-class-select').value);
        }
    } catch (err) {
        alert("Gagal menghapus data: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Ya, Hapus";
        deleteTargetId = null;
        deleteCategory = '';
    }
}

// ==========================================
// 10. REAL-TIME CSS INJECTION SYSTEM
// ==========================================
function injectStyles() {
    const styleId = 'rs-management-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .rs-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', -apple-system, sans-serif; }
        .rs-header { margin-bottom: 25px; }
        .rs-header h2 { margin: 0 0 5px 0; color: #2c3e50; font-weight: 700; }
        .rs-header p { margin: 0; color: #7f8c8d; font-size: 0.9rem; }
        
        .rs-tabs { display: flex; gap: 8px; margin-bottom: 25px; border-bottom: 2px solid #eaeded; padding-bottom: 10px; }
        .tab-btn { background: none; border: none; padding: 10px 18px; font-weight: 600; color: #7f8c8d; cursor: pointer; border-radius: 6px; transition: all 0.2s; }
        .tab-btn:hover { background: #f4f6f6; color: #4d97ff; }
        .tab-btn.active { background: #4d97ff; color: white; }

        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        .card { background: white; border-radius: 8px; border: 1px solid #d5dbdb; overflow: hidden; }
        .card-header { padding: 12px 20px; background: #f8f9f9; border-bottom: 1px solid #d5dbdb; }
        .card-header h4 { margin: 0; color: #2c3e50; font-weight: 600; }
        .card-body { padding: 20px; }
        .acc-header { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; -webkit-user-select: none; transition: background 0.2s ease; }
        .acc-header:hover { background: #edf1f2; }
        .acc-header h4 { flex: 1; }
        .acc-header .acc-chevron { margin-left: auto; color: #7f8c8d; font-size: 0.8rem; transition: transform 0.25s ease; }
        .acc-header.collapsed .acc-chevron { transform: rotate(-90deg); }
        .card-body.collapsed { display: none; }
        
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: #34495e; }
        .form-input { padding: 10px; border: 1px solid #bdc3c7; border-radius: 6px; font-size: 0.9rem; transition: border 0.2s; }
        .form-input:focus { border-color: #4d97ff; outline: none; box-shadow: 0 0 4px rgba(77,151,255,0.4); }
        .form-divider { border: 0; border-top: 1px solid #eaeded; margin: 20px 0; }
        
        .modern-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
        .modern-table th, .modern-table td { padding: 12px 15px; border-bottom: 1px solid #eaeded; }
        .modern-table th { background: #f4f6f6; font-weight: 600; color: #34495e; }
        
        .btn-primary { background: #4d97ff; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
        .btn-secondary { background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        .btn-danger { background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        .btn-outline-small { background: white; border: 1px solid #bdc3c7; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; color:#34495e; font-weight:600; }
        
        .btn-primary:disabled, .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 4px 8px; }
        .btn-remove-row { background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 1.1rem; }

        .session-banner { padding: 12px 20px; background: #ebf5fb; border-left: 4px solid #4d97ff; border-radius: 4px; color: #2c3e50; font-size: 0.9rem; font-weight:500; }
        .badge-grade { padding: 3px 8px; background: #eaeaea; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color:#2c3e50; }
        .badge-period { padding: 3px 8px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 4px; font-size: 0.72rem; font-weight: 600; color:#1e40af; white-space: nowrap; }
        .badge-period-active { padding: 2px 8px; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 10px; font-size: 0.68rem; font-weight: 700; color:#15803d; margin-left:6px; white-space:nowrap; }
        .text-muted { color: #95a5a6; font-size: 0.85rem; }
        .margin-top { margin-top: 20px; }

        .batch-input-card { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; }
        .batch-input-card .batch-label { display: block; font-weight: 700; font-size: 0.85rem; color: #334155; margin-bottom: 8px; }
        .batch-input-card .batch-hint { margin: 8px 0 0; font-size: 0.78rem; line-height: 1.5; }
        .batch-input-card .batch-hint code { background: #e2e8f0; padding: 1px 6px; border-radius: 4px; font-weight: 600; color: #0f172a; }
        .batch-input-card .batch-actions { display: flex; align-items: center; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
        #batch-feedback { font-size: 0.8rem; font-weight: 600; }
        
        .modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999; }
        .modal-content { background:white; padding:25px; border-radius:8px; max-width:400px; width:100%; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .modal-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; }
        
        /* Toggle Switch Widget Styling */
        .switch { position: relative; display: inline-block; width: 42px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #bdc3c7; transition: .3s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 4px; bottom: 4px; background-color: white; transition: .3s; border-radius: 50%; }
        input:checked + .slider { background-color: #00b894; }
        input:checked + .slider:before { transform: translateX(20px); }

        .fade-in { animation: fadeIn 0.25s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
}