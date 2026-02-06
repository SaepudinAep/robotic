/**
 * Project: Monitoring Private Module (SPA) - REFACTORED & ENHANCED
 * Features: Bulk Save, WhatsApp Report Ready, Toast UI, Optimized Performance.
 * Filename: modules/monitoring-private.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE MODULE ---
let classId = null;
let levelId = null;
let currentSessionId = null;
let sessionTargets = []; 
let studentList = [];
let attendanceMap = {}; 
let achievementScoreMap = {}; 

// ==========================================
// 1. INITIALIZATION
// ==========================================

export async function init(canvas) {
    classId = localStorage.getItem("activePrivateClassId");
    levelId = localStorage.getItem("activeLevelId");
    const levelKode = localStorage.getItem("activeLevelKode") || "-";
    const className = localStorage.getItem("activeClassName") || "Kelas Private";

    if (!classId) {
        showToast("⚠️ Pilih kelas terlebih dahulu!");
        if(window.dispatchModuleLoad) window.dispatchModuleLoad('absensi-private', 'Absensi Private', 'List');
        return;
    }

    injectStyles();

    canvas.innerHTML = `
        <div class="mp-container">
            <!-- Header Section -->
            <div class="mp-header shadow-soft">
                <button id="btn-back" class="btn-icon-text">
                    <i class="fas fa-arrow-left"></i> Kembali
                </button>
                <div style="text-align:center; flex:1;">
                    <h3 class="page-title">${className}</h3>
                    <span class="level-badge">${levelKode}</span>
                </div>
                <div id="session-status" class="status-badge">BARU</div>
            </div>

            <!-- Setup Section -->
            <div class="card-section shadow-soft">
                <div class="section-header accordion-trigger" id="head-setup">
                    <h4><i class="fas fa-calendar-day" style="color:#4d97ff;"></i> Setup Sesi</h4>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button id="btn-reset-mode" class="btn-action-small" style="display:none;">
                            <i class="fas fa-plus"></i> Baru
                        </button>
                        <i id="icon-setup" class="fas fa-chevron-down accordion-icon rotate-icon"></i>
                    </div>
                </div>

                <div id="setup-form" class="fade-in" style="display:block;">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>📅 Tanggal</label>
                            <input type="date" id="tglPertemuan" class="input-modern">
                        </div>
                        <div class="form-group">
                            <label>👨‍🏫 Guru</label>
                            <select id="pilihGuru" class="input-modern"><option>Loading...</option></select>
                        </div>
                        <div class="form-group full">
                            <label>📚 Materi (Topik Utama)</label>
                            <input type="text" id="materiUtama" class="input-modern" placeholder="Contoh: Pengenalan Sensor">
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top:15px;">
                        <button id="btnSimpanSesi" class="btn-primary full">
                            <i class="fas fa-play"></i> MULAI / UPDATE SESI
                        </button>
                    </div>
                </div>
            </div>

            <!-- Target Section -->
            <div class="card-section shadow-soft" id="section-target">
                <div class="section-header accordion-trigger" id="head-target">
                    <h4><i class="fas fa-bullseye" style="color:#ffab19;"></i> Target Capaian</h4>
                    <i id="icon-target" class="fas fa-chevron-down accordion-icon"></i>
                </div>

                <div id="target-container" class="fade-in" style="display:none;">
                    <div id="input-target-area">
                        <div class="form-group full" style="position:relative;">
                            <label>🔍 Cari / Input Capaian</label>
                            <input type="text" id="mainAchSearch" class="input-modern" placeholder="Ketik minimal 2 huruf..." autocomplete="off">
                            <div id="achSuggestionBox" class="suggestion-box shadow-soft"></div>
                        </div>
                        
                        <div id="subAchContainer" style="display:none; background:#f9f9f9; padding:15px; border-radius:12px; margin-bottom:15px; border: 1px solid #eee;">
                            <label style="font-size:0.8rem; color:#666; font-weight:bold;">Detail Target:</label>
                            <select id="subAchSelect" class="input-modern" style="margin-bottom:10px;"></select>
                            <input type="text" id="subAchManual" class="input-modern" placeholder="Tulis target manual..." style="display:none; margin-bottom:10px;">
                            <div style="text-align:right;">
                                <small id="btnToggleManual" style="color:#4d97ff; cursor:pointer; font-weight:bold;">
                                    <i class="fas fa-pen"></i> Pakai Manual?
                                </small>
                            </div>
                        </div>

                        <button id="btnAddAch" class="btn-secondary full">
                            <i class="fas fa-plus-circle"></i> Tambahkan ke Daftar
                        </button>
                    </div>

                    <div id="targetList" class="preview-box">
                        <div style="text-align:center; color:#999; font-style:italic;">Belum ada target yang ditambahkan.</div>
                    </div>

                    <button id="btnSimpanTarget" class="btn-primary full margin-top" style="display:none; background:linear-gradient(135deg, #ffab19, #f59e0b);">
                        <i class="fas fa-save"></i> KUNCI TARGET KE DATABASE
                    </button>
                    
                    <button id="btnTambahLagi" class="btn-secondary full margin-top" style="display:none;">
                        <i class="fas fa-plus"></i> Tambah Target Lain
                    </button>
                </div>
            </div>

            <!-- Monitoring Section -->
            <div id="monitoringSection" style="margin-top:30px; display:none;" class="fade-in">
                <h4 style="margin-bottom:20px; color:#333; display:flex; align-items:center; gap:10px;">
                    <i class="fas fa-users-viewfinder" style="color:#2ecc71;"></i> Penilaian Siswa
                </h4>
                <div id="studentContainer" class="student-grid-wide"></div>
            </div>

            <!-- History Section -->
            <div style="margin-top:50px;">
                <h4 style="margin-bottom:20px; color:#555; border-left:4px solid #4d97ff; padding-left:15px; font-weight:bold;">
                    Riwayat Sesi Terakhir
                </h4>
                <div id="historyGrid" class="history-grid-wide">
                    <div style="text-align:center; color:#ccc; grid-column:1/-1;">Memuat riwayat...</div>
                </div>
            </div>

        </div>
    `;

    await setupLogic();
}

// ==========================================
// 2. CSS STYLING
// ==========================================
function injectStyles() {
    const styleId = 'monitoring-private-enhanced-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .mp-container { max-width: 900px; margin: 0 auto; padding: 20px 20px 150px 20px; font-family: 'Roboto', sans-serif; }
        .mp-header { display: flex; align-items: center; margin-bottom: 25px; background: white; padding: 15px 20px; border-radius: 15px; }
        .page-title { margin: 0; color: #1e293b; font-family: 'Fredoka One', cursive; font-size: 1.4rem; }
        .level-badge { background:#e0f2fe; color:#0284c7; padding:4px 10px; border-radius:8px; font-size:0.8rem; font-weight:bold; }
        
        .card-section { background: white; padding: 25px; border-radius: 20px; margin-bottom: 25px; border: 1px solid #f1f5f9; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        .section-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 12px; border-radius: 12px; transition: 0.2s; background: #f8fafc; }
        .section-header:hover { background: #f1f5f9; }
        .section-header h4 { margin: 0; font-size: 1.05rem; font-weight: 700; color: #334155; }

        .input-modern { width: 100%; padding: 12px 15px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; transition: 0.3s; }
        .input-modern:focus { border-color: #4d97ff; outline: none; box-shadow: 0 0 0 4px rgba(77,151,255,0.1); }

        .btn-primary { background: linear-gradient(135deg, #4d97ff, #2563eb); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37,99,235,0.3); }

        /* Student Card Enhancement */
        .std-card { border-radius: 20px; padding: 30px; color: white; margin-bottom: 25px; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .variant-0 { background: linear-gradient(135deg, #4d97ff, #2563eb); } 
        .variant-1 { background: linear-gradient(135deg, #f59e0b, #d97706); } 
        .variant-2 { background: linear-gradient(135deg, #10b981, #059669); } 
        .variant-3 { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }

        .std-header { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 20px; }
        .std-name { font-family: 'Fredoka One', cursive; font-size: 1.6rem; }

        .trophy-row { background: rgba(0,0,0,0.15); padding: 12px 18px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.1); }
        .trophy-icon { font-size: 1.8rem; cursor: pointer; color: rgba(255,255,255,0.3); transition: 0.3s; }
        .trophy-icon.gold { color: #fbbf24; filter: drop-shadow(0 0 8px rgba(251,191,36,0.6)); transform: scale(1.1); }
        .trophy-icon.silver { color: #e2e8f0; }
        .trophy-icon.bronze { color: #f97316; }

        /* Floating Message (Toast) */
        #toast-container { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 9999; }
        .toast { background: #1e293b; color: white; padding: 12px 25px; border-radius: 50px; font-size: 0.9rem; font-weight: bold; box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin-bottom: 10px; animation: slideUp 0.3s ease; }

        .btn-copy-report { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 10px; border-radius: 10px; cursor: pointer; width: 100%; font-weight: bold; margin-top: 15px; }
        .btn-copy-report:hover { background: rgba(255,255,255,0.3); }

        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
}

// ==========================================
// 3. LOGIC & DATABASE
// ==========================================

async function setupLogic() {
    document.getElementById('tglPertemuan').valueAsDate = new Date();
    await Promise.all([ fetchTeachers(), fetchStudents(), loadHistory() ]);
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('btn-back').onclick = () => window.dispatchModuleLoad?.('absensi-private', 'Absensi Private', 'List');
    document.getElementById("head-setup").onclick = (e) => !e.target.closest('#btn-reset-mode') && toggleAccordion("setup-form", "icon-setup");
    document.getElementById("head-target").onclick = () => toggleAccordion("target-container", "icon-target");
    document.getElementById("btn-reset-mode").onclick = resetToNewMode;
    document.getElementById("btnSimpanSesi").onclick = savePertemuan;
    
    setupMainAchSearch();
    document.getElementById("btnAddAch").onclick = addAchievementToTarget;
    document.getElementById("btnSimpanTarget").onclick = saveTargetAch;
    document.getElementById("btnTambahLagi").onclick = () => {
        document.getElementById("input-target-area").style.display = 'block';
        document.getElementById("btnSimpanTarget").style.display = 'block';
        document.getElementById("btnTambahLagi").style.display = 'none';
    };
    document.getElementById("btnToggleManual").onclick = toggleManualSub;
}

// --- DB FUNCTIONS ---
async function fetchTeachers() {
    const { data } = await supabase.from('teachers').select('id, name').order('name');
    const sel = document.getElementById('pilihGuru');
    sel.innerHTML = '<option value="">-- Pilih Guru --</option>' + (data || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

async function fetchStudents() {
    const { data } = await supabase.from('students_private').select('id, name').eq('class_id', classId).order('name');
    studentList = data || [];
}

async function loadHistory() {
    const { data } = await supabase.from('pertemuan_private').select(`id, tanggal, materi_private(judul)`).eq('class_id', classId).order('tanggal', {ascending:false}).limit(6);
    const grid = document.getElementById('historyGrid');
    if(!data?.length) return grid.innerHTML = '<div style="color:#ccc; text-align:center; grid-column:1/-1;">Belum ada riwayat.</div>';
    
    grid.innerHTML = data.map((item, index) => `
        <div class="history-card-color variant-${index % 4}" onclick="window.loadSessionForEdit('${item.id}')" style="padding:20px; border-radius:15px; cursor:pointer; color:white;">
            <div style="font-weight:bold;"><i class="fas fa-calendar-alt"></i> ${new Date(item.tanggal).toLocaleDateString('id-ID')}</div>
            <div style="margin-top:10px; font-weight:700;">${item.materi_private?.judul || 'No Topic'}</div>
        </div>
    `).join('');
}

// --- SAVE ACTIONS ---
async function savePertemuan() {
    const tgl = document.getElementById('tglPertemuan').value;
    const guru = document.getElementById('pilihGuru').value; 
    const materiText = document.getElementById('materiUtama').value.trim();

    if (!tgl || !materiText) return showToast("⚠️ Isi Tanggal & Materi!");

    const btn = document.getElementById('btnSimpanSesi');
    btn.disabled = true;

    try {
        // Handle Materi ID
        let { data: m } = await supabase.from('materi_private').select('id').eq('judul', materiText).eq('level_id', levelId).maybeSingle();
        if(!m) {
            const { data: newM } = await supabase.from('materi_private').insert({ judul: materiText, level_id: levelId }).select('id').single();
            m = newM;
        }

        const payload = { class_id: classId, tanggal: tgl, teacher_id: guru || null, materi_id: m.id };
        if (currentSessionId) await supabase.from('pertemuan_private').update(payload).eq('id', currentSessionId);
        else {
            const { data: sess } = await supabase.from('pertemuan_private').insert(payload).select('id').single();
            currentSessionId = sess.id;
        }

        showToast("✅ Sesi Berhasil Disimpan!");
        updateSessionStatus("AKTIF", true);
        document.getElementById("btn-reset-mode").style.display = 'block';
        forceCloseAccordion("setup-form", "icon-setup");
        forceOpenAccordion("target-container", "icon-target");
        loadHistory();
    } catch (e) { showToast("❌ Error: " + e.message); } 
    finally { btn.disabled = false; }
}

async function saveTargetAch() {
    if (!currentSessionId) return showToast("⚠️ Mulai Sesi dulu!");
    const newOnes = sessionTargets.filter(t => !t.id);
    if (!newOnes.length) return showToast("Target sudah sinkron.");

    const btn = document.getElementById('btnSimpanTarget');
    btn.disabled = true;

    try {
        // Bulk Process Achievements
        const inserts = await Promise.all(newOnes.map(async t => {
            let { data: ach } = await supabase.from('achievement_private').select('id').eq('main_achievement', t.main).eq('level_id', levelId).maybeSingle();
            if(!ach) {
                const { data: na } = await supabase.from('achievement_private').insert({ main_achievement: t.main, level_id: levelId }).select('id').single();
                ach = na;
            }
            return { pertemuan_id: currentSessionId, achievement_id: ach.id, catatan: t.sub };
        }));

        await supabase.from('achievement_target').insert(inserts);
        
        // Refresh State
        const { data: refreshed } = await supabase.from('achievement_target').select(`achievement_id, catatan, achievement_private(main_achievement)`).eq('pertemuan_id', currentSessionId);
        sessionTargets = refreshed.map(t => ({ id: t.achievement_id, main: t.achievement_private?.main_achievement, sub: t.catatan }));

        showToast("🎯 Target Berhasil Dikunci!");
        document.getElementById('input-target-area').style.display = 'none';
        document.getElementById('btnSimpanTarget').style.display = 'none';
        document.getElementById('btnTambahLagi').style.display = 'block';
        renderTargetListUI();
        renderStudentCards();
        document.getElementById('monitoringSection').style.display = 'block';
    } catch (e) { showToast("❌ Error: " + e.message); }
    finally { btn.disabled = false; }
}

window.saveMonitoringIndividual = async (studentId) => {
    const btn = document.getElementById(`btn-save-${studentId}`);
    btn.disabled = true;
    
    try {
        const payload = { 
            pertemuan_id: currentSessionId, 
            student_id: studentId, 
            sikap: parseInt(document.getElementById(`sikap_${studentId}`).value), 
            fokus: parseInt(document.getElementById(`fokus_${studentId}`).value), 
            catatan: document.getElementById(`cat_${studentId}`).value 
        };

        const { data: ex } = await supabase.from('attendance_private').select('id').eq('pertemuan_id', currentSessionId).eq('student_id', studentId).maybeSingle();
        if(ex) await supabase.from('attendance_private').update(payload).eq('id', ex.id);
        else await supabase.from('attendance_private').insert(payload);

        // Save Scores
        const rows = document.querySelectorAll(`#starsContainer-${studentId} .trophy-row`);
        for(let row of rows) {
            const achId = row.getAttribute('data-ach-id');
            const score = parseInt(row.getAttribute('data-score'));
            const { data: exS } = await supabase.from('achievement_pertemuan').select('id').eq('pertemuan_id', currentSessionId).eq('student_id', studentId).eq('achievement_id', achId).maybeSingle();
            if(exS) await supabase.from('achievement_pertemuan').update({ indikator: score }).eq('id', exS.id);
            else await supabase.from('achievement_pertemuan').insert({ pertemuan_id: currentSessionId, student_id: studentId, achievement_id: achId, indikator: score });
        }
        showToast("✅ Nilai Tersimpan!");
    } catch (e) { showToast("❌ Gagal Simpan."); }
    finally { btn.disabled = false; }
};

// ==========================================
// 4. UI RENDERERS
// ==========================================

function renderStudentCards() {
    const container = document.getElementById('studentContainer');
    container.innerHTML = studentList.map((s, idx) => {
        const saved = attendanceMap[s.id] || {};
        const trophyHTML = sessionTargets.map(t => {
            const key = `${s.id}_${t.id}`;
            const score = achievementScoreMap[key] || 0;
            return `
                <div class="trophy-row" data-score="${score}" data-ach-id="${t.id}">
                    <span class="trophy-label" style="flex:1; font-weight:500;">${t.sub}</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <small class="score-text" style="opacity:0.7;">${getScoreText(score)}</small>
                        <i class="fas fa-trophy trophy-icon ${getTrophyClass(score)}" onclick="window.cycleTrophy(this)"></i>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="std-card variant-${idx % 4}">
                <div class="std-header">
                    <i class="fas fa-user-circle" style="font-size:2.5rem;"></i>
                    <div class="std-name">${s.name}</div>
                </div>
                <div class="form-grid" style="margin-bottom:20px;">
                    <div class="form-group">
                        <label style="color:white; font-size:0.7rem;">SIKAP</label>
                        <select id="sikap_${s.id}" class="input-modern" style="background:rgba(255,255,255,0.9); border:none;">
                            <option value="5" ${saved.sikap==5?'selected':''}>🤩 Sangat Baik</option>
                            <option value="3" ${saved.sikap==3?'selected':''}>🙂 Cukup</option>
                            <option value="1" ${saved.sikap==1?'selected':''}>❌ Kurang</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="color:white; font-size:0.7rem;">FOKUS</label>
                        <select id="fokus_${s.id}" class="input-modern" style="background:rgba(255,255,255,0.9); border:none;">
                            <option value="3" ${saved.fokus==3?'selected':''}>🔥 Fokus</option>
                            <option value="1" ${saved.fokus==1?'selected':''}>😵 Kurang</option>
                        </select>
                    </div>
                </div>
                <div id="starsContainer-${s.id}">${trophyHTML}</div>
                <textarea id="cat_${s.id}" class="input-modern" style="margin-top:15px; background:rgba(255,255,255,0.95); border:none;" placeholder="Catatan perkembangan...">${saved.catatan || ''}</textarea>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <button id="btn-save-${s.id}" onclick="saveMonitoringIndividual('${s.id}')" class="btn-copy-report" style="background:white; color:#333;">
                        <i class="fas fa-save"></i> SIMPAN
                    </button>
                    <button onclick="window.copyToWA('${s.id}', '${s.name}')" class="btn-copy-report">
                        <i class="fab fa-whatsapp"></i> LAPORAN
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// --- HELPERS ---
window.cycleTrophy = (el) => {
    const row = el.closest('.trophy-row');
    let s = (parseInt(row.getAttribute('data-score')) + 1) % 4;
    row.setAttribute('data-score', s);
    el.className = `fas fa-trophy trophy-icon ${getTrophyClass(s)}`;
    row.querySelector('.score-text').innerText = getScoreText(s);
};

function getTrophyClass(s) { return s==3?'gold': s==2?'silver': s==1?'bronze':''; }
function getScoreText(s) { return ['Belum', 'Cukup', 'Baik', 'Mahir'][s]; }

window.copyToWA = (id, name) => {
    const sikap = document.getElementById(`sikap_${id}`).selectedOptions[0].text;
    const cat = document.getElementById(`cat_${id}`).value;
    const targets = Array.from(document.querySelectorAll(`#starsContainer-${id} .trophy-row`)).map(r => `- ${r.querySelector('.trophy-label').innerText}: ${r.querySelector('.score-text').innerText}`).join('\n');
    
    const text = `*PROGRES BELAJAR PRIVAT*\nSiswa: ${name}\n\n*Capaian Materi:*\n${targets}\n\n*Sikap:* ${sikap}\n*Catatan:* ${cat || '-'}`;
    navigator.clipboard.writeText(text);
    showToast("📋 Laporan disalin ke Clipboard!");
};

function showToast(msg) {
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// UI Accordion logic (same but cleaner)
function toggleAccordion(id, iconId) {
    const el = document.getElementById(id);
    const hide = el.style.display !== 'none';
    el.style.display = hide ? 'none' : 'block';
    document.getElementById(iconId).classList.toggle('rotate-icon', !hide);
}
function forceOpenAccordion(id, iconId) { document.getElementById(id).style.display='block'; document.getElementById(iconId).classList.add('rotate-icon'); }
function forceCloseAccordion(id, iconId) { document.getElementById(id).style.display='none'; document.getElementById(iconId).classList.remove('rotate-icon'); }
function updateSessionStatus(t, act) { const b = document.getElementById('session-status'); b.innerText = t; b.style.color = act?'#2ecc71':'#aaa'; }

function toggleManualSub() {
    const isMan = document.getElementById('subAchManual').style.display === 'block';
    document.getElementById('subAchManual').style.display = isMan ? 'none' : 'block';
    document.getElementById('subAchSelect').style.display = isMan ? 'block' : 'none';
}

async function addAchievementToTarget() {
    const main = document.getElementById('mainAchSearch').value;
    let sub = document.getElementById('subAchSelect').value;
    if(document.getElementById('subAchManual').style.display === 'block') sub = document.getElementById('subAchManual').value;
    
    if(!main || !sub) return showToast("Lengkapi input!");
    sessionTargets.push({ main, sub, id: null });
    renderTargetListUI();
    document.getElementById('btnSimpanTarget').style.display = 'block';
}

function renderTargetListUI() {
    const l = document.getElementById('targetList');
    if(!sessionTargets.length) return l.innerHTML = '...';
    l.innerHTML = sessionTargets.map((t, i) => `<div style="padding:10px; background:white; margin-bottom:5px; border-radius:8px; display:flex; justify-content:space-between;"><span>${t.main}: ${t.sub}</span></div>`).join('');
}

function setupMainAchSearch() {
    const inp = document.getElementById('mainAchSearch');
    const box = document.getElementById('achSuggestionBox');
    inp.oninput = async () => {
        if(inp.value.length < 2) return box.style.display='none';
        const { data } = await supabase.from('achievement_private').select('main_achievement').ilike('main_achievement', `%${inp.value}%`).limit(5);
        box.innerHTML = (data || []).map(d => `<div class="suggestion-item" onclick="window.selectMainAch('${d.main_achievement}')">${d.main_achievement}</div>`).join('');
        box.style.display = 'block';
    };
}
window.selectMainAch = (m) => { document.getElementById('mainAchSearch').value = m; document.getElementById('achSuggestionBox').style.display='none'; document.getElementById('subAchContainer').style.display='block'; };

function resetToNewMode() { location.reload(); }