/**
 * Project: Galeri Harian Module (FINAL V5 - Dynamic Account & Auto Folder)
 * Fixes: Upload Error (Account ID), Folder Structure, Split UI
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let activeClassId = null;
let activeSessionId = null;
let currentUserRole = null;
let filesToUpload = [];
let uploadMode = 'file'; // 'file' or 'youtube'

// Context untuk Folder Cloudinary (Diisi otomatis saat init)
let contextData = { school: 'Umum', year: 'Umum', class: 'Umum' };

// Config Resize
const MAX_WIDTH = 1280;
const JPG_QUALITY = 0.8;

// ==========================================
// 1. INITIALIZATION & CONTEXT SETUP
// ==========================================
export async function init(canvas) {
    activeClassId = localStorage.getItem("activeClassId");
    const classNameDisplay = localStorage.getItem("activeClassName");

    if (!activeClassId) {
        canvas.innerHTML = '<div class="error-state">Error: Tidak ada kelas yang dipilih.</div>';
        return;
    }

    injectStyles();
    canvas.innerHTML = '<div class="loading-grid"><i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan konteks kelas...</div>';

    // 1. Ambil Data Konteks untuk Nama Folder & Validasi
    const { data: clsDetails, error: clsErr } = await supabase
        .from('classes')
        .select('name, schools(name), academic_years(year)')
        .eq('id', activeClassId)
        .single();

    if (!clsErr && clsDetails) {
        contextData = {
            school: sanitizeName(clsDetails.schools?.name),
            year: sanitizeName(clsDetails.academic_years?.year),
            class: sanitizeName(clsDetails.name)
        };
    }

    await checkUserRole();

    // 2. Render Layout Utama
    canvas.innerHTML = `
        <div class="gh-container fade-in">
            <div class="gh-nav-area">
                <div class="nav-header">
                    <button class="btn-back" onclick="window.dispatchModuleLoad('galeri-sekolah')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div class="header-text desktop-only">
                        <h3>${classNameDisplay}</h3>
                        <span>Timeline Kegiatan</span>
                    </div>
                    <div class="mobile-select-wrapper mobile-only">
                        <select id="mobile-session-select" onchange="handleMobileSelect(this.value)">
                            <option value="" disabled selected>-- Pilih Kegiatan --</option>
                        </select>
                        <i class="fa-solid fa-chevron-down select-icon"></i>
                    </div>
                </div>
                <div id="session-list" class="session-list desktop-only">
                    <div class="loading-small"><i class="fa-solid fa-spinner fa-spin"></i> Memuat jadwal...</div>
                </div>
            </div>

            <div class="gh-main">
                <div id="gallery-header" class="main-header" style="visibility:hidden;">
                    <div class="header-info">
                        <span id="session-date-lbl" class="date-badge">-</span>
                        <h2 id="session-title-lbl">Topik Kegiatan</h2>
                        <input type="hidden" id="session-raw-date" value="">
                    </div>
                    <div class="header-actions-group">
                         <button id="btn-up-file" class="btn-pill btn-blue">
                            <i class="fa-solid fa-cloud-arrow-up"></i> <span class="btn-txt">Upload Media</span>
                        </button>
                         <button id="btn-up-yt" class="btn-pill btn-red">
                            <i class="fa-brands fa-youtube"></i> <span class="btn-txt">Link YouTube</span>
                        </button>
                    </div>
                </div>

                <div id="gallery-grid" class="gallery-grid">
                    <div class="empty-state-start">
                        <img src="https://img.icons8.com/clouds/100/null/calendar.png" alt="Calendar">
                        <p>Pilih tanggal kegiatan di navigasi untuk memulai.</p>
                    </div>
                </div>
            </div>
        </div>

        <div id="modal-upload" class="modal-overlay">
            <div class="modal-card bounce-in">
                <div class="modal-head">
                    <h3 id="modal-title">Tambah Dokumentasi</h3>
                    <span class="close-modal" onclick="closeUploadModal()">&times;</span>
                </div>
                
                <div class="modal-body">
                    <div id="section-file" style="display:none;">
                        <div class="drop-area" onclick="document.getElementById('file-input').click()">
                            <i class="fa-solid fa-images"></i>
                            <p>Klik untuk memilih foto/video</p>
                            <span class="sub-text">(Otomatis dikompres & Folder Rapi)</span>
                            <input type="file" id="file-input" multiple accept="image/*,video/*" style="display:none;">
                        </div>
                        <div id="preview-list" class="preview-list"></div>
                    </div>

                    <div id="section-youtube" style="display:none;">
                        <div class="form-group">
                            <label><i class="fa-brands fa-youtube" style="color:red;"></i> Link Video YouTube</label>
                            <input type="text" id="youtube-url" class="input-modern" placeholder="Contoh: https://youtu.be/dQw4w9WgXcQ">
                        </div>
                        <div class="form-group">
                            <label>Judul / Keterangan</label>
                            <input type="text" id="youtube-title" class="input-modern" placeholder="Tulis judul video disini...">
                        </div>
                        <div id="yt-preview-box" class="yt-preview-box" style="display:none;"></div>
                    </div>
                </div>

                <div class="modal-foot">
                    <span id="upload-status" class="status-text"></span>
                    <button id="btn-exec-upload" class="btn-confirm">Simpan Dokumentasi</button>
                </div>
            </div>
        </div>

        <div id="lightbox" class="lightbox-overlay" onclick="closeLightbox(event)">
            <span class="close-lightbox">&times;</span>
            <div class="lightbox-content">
                <img id="lightbox-img" src="" style="display:none;">
                <div id="lightbox-video-container" style="display:none; width:100%; height:100%;"></div>
            </div>
            <div class="lightbox-controls" id="img-controls">
                <button onclick="rotateImage(90)"><i class="fa-solid fa-rotate-right"></i> Putar Foto</button>
            </div>
        </div>
    `;

    bindEvents();
    loadSessions();
}

// ==========================================
// 2. DATA LOADING & NAVIGATION
// ==========================================

async function checkUserRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        currentUserRole = data?.role || 'student';
    }
}

async function loadSessions() {
    const sidebarList = document.getElementById('session-list');
    const mobileSelect = document.getElementById('mobile-session-select');
    
    const { data: sessions, error } = await supabase
        .from('pertemuan_kelas')
        .select(`id, tanggal, materi (title)`)
        .eq('class_id', activeClassId)
        .order('tanggal', { ascending: false });

    if (error || !sessions.length) {
        sidebarList.innerHTML = '<div class="empty-mini">Belum ada jadwal kegiatan.</div>';
        mobileSelect.innerHTML = '<option disabled selected>Belum ada jadwal</option>';
        return;
    }

    // Populate Sidebar & Mobile Select
    sidebarList.innerHTML = sessions.map(s => `
        <div class="session-item" id="sess-${s.id}" 
             data-raw-date="${s.tanggal}"
             onclick="window.selectSession('${s.id}', '${s.tanggal}', '${s.materi?.title || 'Kegiatan Rutin'}')">
            <div class="sess-date">
                <span class="day">${new Date(s.tanggal).getDate()}</span>
                <span class="month">${new Date(s.tanggal).toLocaleString('id-ID', { month: 'short' })}</span>
            </div>
            <div class="sess-info">
                <div class="sess-topic">${s.materi?.title || 'Kegiatan Kelas'}</div>
                <div class="sess-meta">Buka Galeri</div>
            </div>
            <i class="fa-solid fa-chevron-right arrow-icon"></i>
        </div>
    `).join('');

    const optionsHtml = sessions.map(s => {
        const dateStr = new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const title = s.materi?.title || 'Kegiatan Rutin';
        return `<option value="${s.id}" data-date="${s.tanggal}" data-title="${title}">${dateStr} : ${title}</option>`;
    }).join('');
    mobileSelect.innerHTML = '<option value="" disabled selected>-- Pilih Kegiatan --</option>' + optionsHtml;
}

window.handleMobileSelect = (sessionId) => {
    const select = document.getElementById('mobile-session-select');
    const option = select.options[select.selectedIndex];
    window.selectSession(sessionId, option.getAttribute('data-date'), option.getAttribute('data-title'));
};

window.selectSession = async (id, dateRaw, title) => {
    activeSessionId = id;
    
    // Sync Visuals
    document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.getElementById(`sess-${id}`);
    if(activeItem) activeItem.classList.add('active');

    const mobileSelect = document.getElementById('mobile-session-select');
    if(mobileSelect.value !== id) mobileSelect.value = id;

    // Update Header
    const header = document.getElementById('gallery-header');
    header.style.visibility = 'visible';
    header.classList.add('fade-in');
    document.getElementById('session-title-lbl').innerText = title;
    document.getElementById('session-date-lbl').innerText = new Date(dateRaw).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('session-raw-date').value = dateRaw.split('T')[0];

    await loadPhotos();
};

async function loadPhotos() {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '<div class="loading-grid"><i class="fa-solid fa-spinner fa-spin"></i> Memuat foto & video...</div>';

    let query = supabase.from('gallery_contents')
        .select('*')
        .eq('pertemuan_id', activeSessionId)
        .order('created_at', { ascending: false });

    if (currentUserRole !== 'super_admin') {
        query = query.eq('is_deleted', false);
    }

    const { data: photos, error } = await query;

    if (error) {
        grid.innerHTML = `<div class="error-state">Gagal memuat: ${error.message}</div>`;
        return;
    }

    if (!photos.length) {
        grid.innerHTML = `
            <div class="empty-state-grid fade-in">
                <img src="https://img.icons8.com/clouds/100/null/add-image.png" alt="Empty">
                <p>Belum ada dokumentasi di kegiatan ini.</p>
                <span class="sub-empty">Gunakan tombol di atas untuk menambah.</span>
            </div>
        `;
        return;
    }

    renderGrid(photos, grid);
}

function renderGrid(photos, container) {
    container.innerHTML = photos.map(p => {
        const ghostClass = p.is_deleted ? 'ghost-mode' : '';
        const publishClass = p.is_published ? 'status-pub' : 'status-draft';
        const publishIcon = p.is_published ? 'fa-eye' : 'fa-eye-slash';
        
        let contentHtml = '', clickAction = '';

        if (p.media_type === 'youtube') {
            const vidId = getYoutubeId(p.file_url);
            const thumbYt = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
            contentHtml = `<div class="type-badge yt"><i class="fa-brands fa-youtube"></i></div><img src="${thumbYt}" class="grid-thumb" loading="lazy">`;
            clickAction = `openLightbox('youtube', '${p.file_url}')`;
        } else if (p.media_type === 'video') {
            const thumbUrl = p.file_url.replace('.mp4', '.jpg').replace('/upload/', '/upload/w_400,q_auto,f_auto/');
            contentHtml = `<div class="type-badge vid"><i class="fa-solid fa-play"></i></div><img src="${thumbUrl}" class="grid-thumb" loading="lazy">`;
            clickAction = `openLightbox('video', '${p.file_url}')`;
        } else {
            let imgUrl = p.file_url;
            if (p.rotation && p.rotation !== 0) imgUrl = imgUrl.replace('/upload/', `/upload/a_${p.rotation}/`);
            const thumbUrl = imgUrl.replace('/upload/', '/upload/w_400,q_auto,f_auto/');
            contentHtml = `<img src="${thumbUrl}" class="grid-thumb" loading="lazy">`;
            clickAction = `openLightbox('image', '${imgUrl}')`;
        }

        return `
            <div class="photo-card fade-in ${ghostClass}">
                <div class="status-badge ${publishClass}">${p.is_published ? 'LIVE' : 'DRAFT'}</div>
                <div class="img-wrapper" onclick="${clickAction}">
                    ${contentHtml}
                    ${p.caption ? `<div class="caption-overlay truncate">${p.caption}</div>` : ''}
                </div>
                <div class="card-actions">
                    <button class="btn-icon ${p.is_published ? 'btn-unpub' : 'btn-pub'}" title="Ubah Status Publish"
                            onclick="togglePublish('${p.id}', ${p.is_published})">
                        <i class="fa-solid ${publishIcon}"></i>
                    </button>
                    <button class="btn-icon btn-del" title="Hapus Item"
                            onclick="handleDelete('${p.id}', '${p.public_id}', ${p.is_deleted})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 3. UPLOAD LOGIC (FIXED: DYNAMIC ID)
// ==========================================

function sanitizeName(text) {
    if (!text) return 'Umum';
    return text.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 50);
}

function bindEvents() {
    document.getElementById('btn-up-file').onclick = () => openModal('file');
    document.getElementById('btn-up-yt').onclick = () => openModal('youtube');

    document.getElementById('file-input').onchange = (e) => {
        filesToUpload = Array.from(e.target.files);
        if(filesToUpload.length > 0) showUploadPreview();
    };

    document.getElementById('youtube-url').oninput = (e) => {
        const id = getYoutubeId(e.target.value);
        const preview = document.getElementById('yt-preview-box');
        if(id) {
            preview.style.display = 'block';
            preview.innerHTML = `<img src="https://img.youtube.com/vi/${id}/hqdefault.jpg">`;
        } else { preview.style.display = 'none'; }
    };

    document.getElementById('btn-exec-upload').onclick = executeSave;
}

function openModal(mode) {
    uploadMode = mode;
    filesToUpload = [];
    document.getElementById('preview-list').innerHTML = '';
    document.getElementById('youtube-url').value = '';
    document.getElementById('youtube-title').value = '';
    document.getElementById('upload-status').innerText = '';
    
    document.getElementById('modal-upload').style.display = 'flex';
    
    if(mode === 'file') {
        document.getElementById('modal-title').innerText = "Upload Foto/Video";
        document.getElementById('section-file').style.display = 'block';
        document.getElementById('section-youtube').style.display = 'none';
    } else {
        document.getElementById('modal-title').innerText = "Simpan Link YouTube";
        document.getElementById('section-file').style.display = 'none';
        document.getElementById('section-youtube').style.display = 'block';
    }
}

function showUploadPreview() {
    const list = document.getElementById('preview-list');
    list.innerHTML = '';
    filesToUpload.forEach((file, idx) => {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        list.innerHTML += `
            <div class="preview-item">
                <div><i class="fa-solid fa-file"></i> ${file.name} <small>(${sizeMB} MB)</small></div>
                <div class="pi-status" id="status-${idx}">Menunggu...</div>
            </div>`;
    });
}

// --- FUNGSI UPLOAD YANG DIPERBAIKI ---
async function executeSave() {
    const btn = document.getElementById('btn-exec-upload');
    const statusMain = document.getElementById('upload-status');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    statusMain.innerText = "Sedang berjalan, jangan tutup halaman...";

    try {
        // [FIX] AMBIL AKUN CLOUDINARY AKTIF DARI DB
        const { data: activeCloud, error: cloudErr } = await supabase
            .from('cloudinary_accounts')
            .select('id, cloud_name')
            .eq('is_active', true)
            .single();

        if (cloudErr || !activeCloud) {
            throw new Error("Sistem Error: Tidak ada akun Cloudinary yang aktif. Harap aktifkan satu akun di Manager.");
        }
        
        const targetAccountId = activeCloud.id; // ID untuk Sign
        const targetCloudName = activeCloud.cloud_name; // Cloud name untuk URL

        // 1. LOGIKA SIMPAN YOUTUBE
        if (uploadMode === 'youtube') {
            const url = document.getElementById('youtube-url').value;
            const title = document.getElementById('youtube-title').value;
            const vidId = getYoutubeId(url);
            if (!vidId || !title) throw new Error("Link YouTube tidak valid atau judul belum diisi.");

            await supabase.from('gallery_contents').insert({
                class_id: activeClassId, pertemuan_id: activeSessionId,
                file_url: `https://www.youtube.com/embed/${vidId}`,
                media_type: 'youtube', public_id: 'yt_' + vidId, caption: title, is_published: false
            });

        // 2. LOGIKA UPLOAD FILE
        } else {
            if(filesToUpload.length === 0) throw new Error("Belum ada file yang dipilih.");
            
            // FOLDER OTOMATIS: Sekolah/Tahun/Kelas/Tanggal_Topik
            const rawDate = document.getElementById('session-raw-date').value; 
            const sessionName = sanitizeName(document.getElementById('session-title-lbl').innerText);
            const sessionFolder = sanitizeName(`${rawDate}_${sessionName}`);
            const dynamicFolder = `galeri-sekolah/${contextData.year}/${contextData.school}/${contextData.class}/${sessionFolder}`;
            
            for (let i = 0; i < filesToUpload.length; i++) {
                const file = filesToUpload[i];
                const statusEl = document.getElementById(`status-${i}`);
                
                statusEl.innerText = "Mengompresi...";
                statusEl.className = "pi-status running";
                const compressedFile = await compressImage(file);
                
                statusEl.innerText = "Mengupload ke Cloud...";
                
                const { data: { session } } = await supabase.auth.getSession();
                
                // MINTA SIGNATURE (ID DINAMIS)
                const signRes = await fetch('https://aedtrwpomswdqxarvsrg.supabase.co/functions/v1/cloudinary-sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ 
                        action: 'get_signature', 
                        account_id: targetAccountId, // <--- ID AKUN DARI DB
                        params: { folder: dynamicFolder }
                    })
                });
                const signData = await signRes.json();
                if(signData.error) throw new Error(signData.error);
                
                // UPLOAD KE CLOUDINARY
                const fd = new FormData();
                fd.append('file', compressedFile);
                fd.append('api_key', signData.api_key);
                fd.append('timestamp', signData.timestamp);
                fd.append('signature', signData.signature);
                fd.append('folder', dynamicFolder);

                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`, { method: 'POST', body: fd });
                const cloudData = await cloudRes.json();
                if(cloudData.error) throw new Error(cloudData.error.message);

                // SIMPAN KE DB
                await supabase.from('gallery_contents').insert({
                    class_id: activeClassId, pertemuan_id: activeSessionId,
                    file_url: cloudData.secure_url, public_id: cloudData.public_id,
                    media_type: cloudData.resource_type, caption: file.name, is_published: false
                });
                statusEl.innerText = "Sukses ";
                statusEl.className = "pi-status done";
            }
        }
        closeUploadModal();
        loadPhotos();
        statusMain.innerText = "";
    } catch (err) { 
        alert(err.message); 
        statusMain.innerText = "Gagal: " + err.message;
    } finally { btn.disabled = false; btn.innerHTML = 'Simpan Dokumentasi'; }
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        if (file.type.indexOf("image") === -1) return resolve(file);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > MAX_WIDTH) { height = Math.round(height * (MAX_WIDTH / width)); width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', JPG_QUALITY);
            };
        };
        reader.onerror = (err) => reject(err);
    });
}

// ==========================================
// 4. ACTIONS & DELETE (FIXED: DYNAMIC ID)
// ==========================================
window.closeUploadModal = () => document.getElementById('modal-upload').style.display = 'none';

window.togglePublish = async (id, status) => {
    const action = status ? 'Unpublish (Draft)' : 'Publish (Live)';
    if (confirm(`Ubah status menjadi ${action}?`)) { 
        await supabase.from('gallery_contents').update({ is_published: !status }).eq('id', id); loadPhotos(); 
    }
};

window.handleDelete = async (id, publicId, isDeleted) => {
    // ADMIN: Hapus Permanen
    if (currentUserRole === 'super_admin' && isDeleted) {
        if (confirm("PERINGATAN ADMIN: Hapus PERMANEN file ini dari Cloudinary dan Database? Aksi ini tidak bisa dibatalkan.")) {
            try {
                // [FIX] AMBIL AKUN AKTIF
                const { data: activeCloud } = await supabase.from('cloudinary_accounts').select('id').eq('is_active', true).single();
                
                // Abaikan error jika cloud tidak ada, tetap hapus DB (opsional), tapi lebih baik aman
                if (activeCloud && !publicId.startsWith('yt_')) {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch('https://aedtrwpomswdqxarvsrg.supabase.co/functions/v1/cloudinary-sign', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                        body: JSON.stringify({ 
                            action: 'delete_image', 
                            account_id: activeCloud.id, // ID DINAMIS
                            params: { public_id: publicId } 
                        })
                    });
                }
                await supabase.from('gallery_contents').delete().eq('id', id);
                loadPhotos();
            } catch(e) { alert("Gagal hapus fisik: " + e.message); }
        }
        return;
    }
    // GURU: Soft Delete
    if (confirm("Sembunyikan item ini dari galeri publik? (Soft Delete)")) { 
        await supabase.from('gallery_contents').update({ is_deleted: true }).eq('id', id); loadPhotos(); 
    }
};

window.openLightbox = (type, url) => {
    const lb = document.getElementById('lightbox'), img = document.getElementById('lightbox-img'), vid = document.getElementById('lightbox-video-container');
    lb.style.display = 'flex';
    if (type === 'image') { img.src = url; img.style.display = 'block'; vid.style.display = 'none'; vid.innerHTML = ''; document.getElementById('img-controls').style.display = 'flex'; }
    else { img.style.display = 'none'; vid.style.display = 'block'; document.getElementById('img-controls').style.display = 'none'; 
           vid.innerHTML = type === 'youtube' ? `<iframe width="100%" height="100%" src="${url}?autoplay=1&rel=0" frameborder="0" allowfullscreen></iframe>` : `<video controls autoplay style="width:100%; height:100%"><source src="${url}"></video>`; }
};
window.closeLightbox = (e) => { if (e.target.id === 'lightbox' || e.target.classList.contains('close-lightbox')) { document.getElementById('lightbox').style.display = 'none'; document.getElementById('lightbox-video-container').innerHTML = ''; } };

function getYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ==========================================
// 5. STYLING (POLISHED UI)
// ==========================================
function injectStyles() {
    if (document.getElementById('gh-css')) return;
    const s = document.createElement('style');
    s.id = 'gh-css';
    s.textContent = `
        /* LAYOUT UTAMA */
        .gh-container { display: flex; height: calc(100vh - 85px); gap: 20px; padding: 20px; font-family: 'Poppins', sans-serif; overflow: hidden; background:#f8fafc; }
        .gh-nav-area { width: 300px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
        .gh-main { flex: 1; display: flex; flex-direction: column; background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; min-width: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.03); position: relative; }
        
        /* SIDEBAR NAV */
        .nav-header { padding: 15px; background: #fff; border-bottom: 1px solid #f1f5f9; display: flex; gap: 12px; align-items: center; }
        .btn-back { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; color: #64748b; display:flex; align-items:center; justify-content:center; transition:0.2s; }
        .btn-back:hover { background:#e2e8f0; color:#1e293b; }
        .header-text h3 { margin: 0; font-size: 1rem; color: #1e293b; font-weight:700; }
        .header-text span { font-size: 0.75rem; color: #94a3b8; font-weight:500; }
        .session-list { flex: 1; overflow-y: auto; padding: 12px; background:#fcfdff; }
        
        .session-item { padding: 10px; border-radius: 12px; cursor: pointer; display: flex; gap: 12px; margin-bottom: 8px; border: 1px solid transparent; background:white; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition:0.2s; align-items:center; }
        .session-item:hover { border-color:#cbd5e1; transform:translateX(3px); }
        .session-item.active { background: #eff6ff; border-color: #bfdbfe; box-shadow:0 4px 8px rgba(59,130,246,0.1); }
        .session-item.active .sess-date { background:#3b82f6; color:white; }
        .sess-date { width: 48px; height: 48px; background: #f1f5f9; border-radius: 10px; color: #64748b; display:flex; flex-direction:column; align-items:center; justify-content:center; font-weight:800; transition:0.2s; }
        .sess-date .day { font-size: 1.1rem; line-height:1; }
        .sess-date .month { font-size: 0.65rem; text-transform:uppercase; letter-spacing:0.5px; }
        .sess-info { flex:1; }
        .sess-topic { font-size: 0.9rem; font-weight: 700; color: #334155; line-height:1.2; margin-bottom:3px; }
        .sess-meta { font-size: 0.75rem; color: #94a3b8; font-weight:500; }
        .arrow-icon { color:#cbd5e1; font-size:0.9rem; }
        
        /* MOBILE NAV (Hidden on Desktop) */
        .mobile-only { display: none; }
        .mobile-select-wrapper { flex: 1; position: relative; }
        .mobile-select-wrapper select { width: 100%; height: 45px; padding: 0 40px 0 15px; border-radius: 10px; border: 1px solid #cbd5e1; background: white; font-size: 0.95rem; font-weight: 600; color: #1e293b; appearance: none; box-shadow:0 2px 5px rgba(0,0,0,0.05); }
        .select-icon { position: absolute; right: 15px; top: 50%; transform:translateY(-50%); pointer-events: none; color: #64748b; }

        /* MAIN HEADER (Sticky & Split Buttons) */
        .main-header { padding: 15px 25px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.95); backdrop-filter:blur(5px); position:sticky; top:0; z-index:10; }
        .header-info h2 { margin: 8px 0 0; font-size: 1.25rem; color: #1e293b; line-height: 1.2; font-weight:800; }
        .date-badge { background: #f0f9ff; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border:1px solid #e0f2fe; display:inline-block; }
        
        .header-actions-group { display:flex; gap:10px; }
        .btn-pill { border: none; padding: 10px 20px; border-radius: 50px; font-weight: 700; cursor: pointer; display: flex; gap: 8px; align-items: center; font-size:0.9rem; transition:0.2s; box-shadow:0 4px 6px rgba(0,0,0,0.05); }
        .btn-pill:hover { transform:translateY(-2px); box-shadow:0 6px 12px rgba(0,0,0,0.1); }
        .btn-blue { background: #3b82f6; color: white; } .btn-blue:hover { background: #2563eb; }
        .btn-red { background: #ef4444; color: white; } .btn-red:hover { background: #dc2626; }
        
        /* GALLERY GRID */
        .gallery-grid { flex: 1; overflow-y: auto; padding: 25px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; align-content: start; background:#fcfdff; }
        
        /* PHOTO CARD (Polished) */
        .photo-card { border-radius: 16px; overflow: hidden; background: white; border: 1px solid #f1f5f9; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.03); transition:0.3s; }
        .photo-card:hover { transform:translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); border-color:#e2e8f0; }
        .img-wrapper { height: 160px; position: relative; cursor: pointer; background: #0f172a; }
        .grid-thumb { width: 100%; height: 100%; object-fit: cover; opacity:0.95; transition:0.3s; }
        .img-wrapper:hover .grid-thumb { opacity:1; transform:scale(1.05); }
        
        .type-badge, .play-icon { position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.5); width:45px; height:45px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.4rem; backdrop-filter:blur(2px); border:2px solid rgba(255,255,255,0.3); }
        .yt i { color:#ff0000; }
        .caption-overlay { position:absolute; bottom:0; left:0; width:100%; padding:10px; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); color:white; font-size:0.8rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .card-actions { padding: 10px; display: flex; justify-content: space-between; background: #fff; border-top: 1px solid #f8fafc; }
        .btn-icon { border: none; background: #f1f5f9; width:32px; height:32px; border-radius: 8px; cursor: pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:0.2s; }
        .btn-icon:hover { background:#e2e8f0; }
        .btn-pub { color: #059669; background: #ecfdf5; } .btn-pub:hover { background:#d1fae5; }
        .btn-unpub { color: #d97706; background: #fff7ed; } .btn-unpub:hover { background:#ffedd5; }
        .btn-del { color: #ef4444; background: #fef2f2; } .btn-del:hover { background:#fee2e2; }
        
        .status-badge { position: absolute; top: 10px; left: 10px; padding: 4px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 800; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing:0.5px; backdrop-filter:blur(4px); }
        .status-draft { background: rgba(148,163,184,0.9); color: white; }
        .status-pub { background: rgba(16,185,129,0.9); color: white; }
        .ghost-mode { opacity: 0.5; border: 2px dashed #ef4444; filter:grayscale(1); }

        /* MODAL UPLOAD */
        .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); display:none; justify-content:center; align-items:center; z-index:9999; backdrop-filter:blur(5px); }
        .modal-card { background:white; width:480px; border-radius:20px; padding:30px; max-width:90%; box-shadow:0 20px 40px rgba(0,0,0,0.2); }
        .modal-head { display:flex; justify-content:space-between; margin-bottom:25px; align-items:center; }
        .modal-head h3 { margin:0; font-size:1.4rem; color:#1e293b; font-weight:800; }
        .close-modal { cursor:pointer; font-size:1.8rem; color:#cbd5e1; transition:0.2s; } .close-modal:hover { color:#ef4444; }
        
        .drop-area { border:3px dashed #e2e8f0; border-radius:16px; padding:40px 20px; text-align:center; color:#64748b; cursor:pointer; transition:0.3s; background:#f8fafc; }
        .drop-area:hover { border-color:#3b82f6; background:#eff6ff; color:#3b82f6; }
        .drop-area i { font-size:3rem; margin-bottom:15px; color:#3b82f6; }
        .drop-area p { font-size:1.1rem; font-weight:600; margin:0; }
        .sub-text { font-size:0.8rem; color:#94a3b8; }
        
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 0.9rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .input-modern { width: 100%; padding: 12px 15px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; transition:0.2s; }
        .input-modern:focus { border-color:#3b82f6; outline:none; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }

        .preview-list { margin-top:20px; max-height:200px; overflow-y:auto; border:1px solid #f1f5f9; border-radius:12px; }
        .preview-item { padding:12px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; }
        .preview-item i { color:#3b82f6; margin-right:10px; }
        .pi-status { font-weight:600; font-size:0.8rem; padding:4px 10px; border-radius:20px; background:#f1f5f9; color:#64748b; }
        .pi-status.running { background:#dbeafe; color:#1e40af; } .pi-status.done { background:#dcfce7; color:#166534; }
        
        .modal-foot { margin-top:25px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:20px; }
        .status-text { font-size:0.9rem; font-weight:600; color:#3b82f6; }
        .btn-confirm { background:#10b981; color:white; border:none; padding:12px 25px; border-radius:10px; font-weight:700; cursor:pointer; font-size:1rem; transition:0.2s; box-shadow:0 4px 10px rgba(16,185,129,0.2); }
        .btn-confirm:hover { background:#059669; transform:translateY(-2px); box-shadow:0 6px 15px rgba(16,185,129,0.3); }
        .btn-confirm:disabled { background:#cbd5e1; cursor:not-allowed; transform:none; box-shadow:none; }

        /* EMPTY STATES */
        .empty-state-start, .empty-state-grid, .empty-mini { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; text-align:center; padding:20px; }
        .empty-state-start img, .empty-state-grid img { width:80px; opacity:0.5; margin-bottom:15px; }
        .empty-state-start p, .empty-state-grid p { font-size:1.1rem; font-weight:600; margin:0; color:#64748b; }
        .sub-empty { font-size:0.9rem; margin-top:5px; }
        .empty-mini { font-size:0.9rem; font-style:italic; }
        .loading-grid, .loading-small { display:flex; align-items:center; justify-content:center; height:100%; gap:10px; color:#64748b; font-weight:600; }

        /* LIGHTBOX & UTILS */
        .lightbox-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); display:none; justify-content:center; align-items:center; z-index:10000; flex-direction:column; }
        .lightbox-content { max-width:90%; max-height:80vh; width:100%; display:flex; justify-content:center; }
        .lightbox-content img { max-height:80vh; max-width:100%; object-fit:contain; border-radius:4px; box-shadow:0 5px 20px rgba(0,0,0,0.5); }
        .close-lightbox { position:absolute; top:20px; right:30px; color:white; font-size:3rem; cursor:pointer; opacity:0.7; transition:0.2s; } .close-lightbox:hover { opacity:1; }
        .lightbox-controls { margin-top:20px; } .lightbox-controls button { background:rgba(255,255,255,0.2); color:white; padding:10px 25px; border-radius:30px; cursor:pointer; border:1px solid rgba(255,255,255,0.4); display:flex; gap:10px; align-items:center; font-weight:600; transition:0.2s; } .lightbox-controls button:hover { background:white; color:black; }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .bounce-in { animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; } @keyframes bounceIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* RESPONSIVE BREAKPOINT (< 900px) */
        @media (max-width: 900px) {
            .gh-container { flex-direction: column; padding: 10px 10px 60px 10px; height: auto; overflow: visible; background:white; }
            .desktop-only { display: none !important; }
            .mobile-only { display: block !important; }
            .gh-nav-area { width: 100%; height: auto; border:none; box-shadow:none; background:transparent; margin-bottom:10px; }
            .nav-header { padding:0; border:none; background:transparent; }
            .gh-main { min-height: 60vh; border-radius: 16px; border:1px solid #f1f5f9; box-shadow:0 4px 15px rgba(0,0,0,0.05); }
            .main-header { padding: 15px; position: sticky; top: 0; flex-direction:column; gap:15px; align-items:flex-start; }
            .header-info { width:100%; }
            .header-actions-group { width:100%; gap:10px; }
            .btn-pill { flex:1; justify-content:center; padding:12px; }
            .gallery-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 15px; }
            .img-wrapper { height: 130px; }
            .caption-overlay { display:none; }
        }
    `;
    document.head.appendChild(s);
}