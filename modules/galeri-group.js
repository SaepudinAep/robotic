/**
 * Project: Galeri Group Module (Private Class)
 * Features: Dropdown Nav, Split Upload, Hybrid Publish, Auto Folder, Auto Resize HD
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// State Global
let activePrivateClassId = null;
let activeClassName = null;
let activeSessionId = null;
let currentUserRole = null;
let uploadMode = 'file'; 
let filesToUpload = [];

// Config Resize
const MAX_WIDTH = 1280; // HD Only
const JPG_QUALITY = 0.8;

// ==========================================
// 1. INITIALIZATION
// ==========================================
export async function init(canvas) {
    activePrivateClassId = localStorage.getItem("activePrivateClassId");
    activeClassName = localStorage.getItem("activePrivateClassName");

    if (!activePrivateClassId) {
        canvas.innerHTML = '<div style="padding:20px; color:red;">Error: Tidak ada kelas private dipilih.</div>';
        return;
    }

    injectStyles();
    await checkUserRole();

    // Render Layout
    canvas.innerHTML = `
        <div class="gg-container fade-in">
            <div class="gg-header">
                <div class="header-left">
                    <button class="btn-back" onclick="window.dispatchModuleLoad ? window.dispatchModuleLoad('galeri-private') : window.loadModule('galeri-private')">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="class-title">${activeClassName}</h2>
                        <span class="sub-label">Private Session Gallery</span>
                    </div>
                </div>
                
                <div class="header-center">
                    <div class="select-wrapper">
                        <select id="session-dropdown" onchange="handleSessionChange(this.value)">
                            <option value="" disabled selected>Memuat Jadwal...</option>
                        </select>
                        <i class="fa-solid fa-chevron-down"></i>
                    </div>
                </div>

                <div class="header-right">
                    <div class="bulk-toggle-wrapper" id="bulk-wrapper" style="display:none;">
                        <span class="toggle-label">Publish Sesi Ini:</span>
                        <label class="switch">
                            <input type="checkbox" id="bulk-toggle-cb" onchange="handleBulkPublish(this.checked)">
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="gg-toolbar" id="toolbar-area" style="display:none;">
                <div class="mentor-badge"><i class="fa-solid fa-chalkboard-user"></i> <span id="mentor-name">-</span></div>
                
                <div class="action-buttons">
                    <button class="btn-action blue" onclick="openUploadModal('file')">
                        <i class="fa-solid fa-cloud-arrow-up"></i> Upload Foto/Video
                    </button>
                    <button class="btn-action red" onclick="openUploadModal('youtube')">
                        <i class="fa-brands fa-youtube"></i> Input YouTube
                    </button>
                </div>
            </div>

            <div id="gallery-grid" class="gallery-grid">
                <div class="empty-start">
                    <i class="fa-solid fa-calendar-days"></i>
                    <p>Silakan pilih tanggal pertemuan di atas.</p>
                </div>
            </div>
        </div>

        <div id="modal-upload" class="modal-overlay">
            <div class="modal-card">
                <div class="modal-head">
                    <h3 id="modal-title">Upload</h3>
                    <span class="close-modal" onclick="closeUploadModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="form-file" style="display:none;">
                        <div class="drop-zone" onclick="document.getElementById('file-input').click()">
                            <i class="fa-solid fa-images"></i>
                            <p>Klik untuk pilih file (Otomatis Resize HD)</p>
                            <input type="file" id="file-input" multiple accept="image/*,video/*" hidden onchange="handleFileSelect(this)">
                        </div>
                        <div id="file-preview-list" class="file-list"></div>
                    </div>
                    <div id="form-youtube" style="display:none;">
                        <input type="text" id="yt-url" class="input-modern" placeholder="Paste Link YouTube..." oninput="previewYoutube(this.value)">
                        <input type="text" id="yt-title" class="input-modern" placeholder="Judul Video...">
                        <div id="yt-preview" class="yt-thumb-box"></div>
                    </div>
                </div>
                <div class="modal-foot">
                    <span id="upload-status" style="font-size:0.8rem; color:#2563eb; margin-right:10px;"></span>
                    <button id="btn-save" class="btn-save" onclick="executeUpload()">Simpan</button>
                </div>
            </div>
        </div>

        <div id="lightbox" class="lightbox-overlay" onclick="closeLightbox(event)">
            <span class="close-lightbox">&times;</span>
            <div class="lightbox-content">
                <img id="lightbox-img" src="" style="display:none;">
                <div id="lightbox-vid" style="display:none;"></div>
            </div>
        </div>
    `;

    await loadSessions();
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
    const dropdown = document.getElementById('session-dropdown');
    
    const { data: sessions, error } = await supabase
        .from('pertemuan_private')
        .select(`id, tanggal, pertemuan_ke, materi_private(judul), teachers(name)`)
        .eq('class_id', activePrivateClassId)
        .order('tanggal', { ascending: false });

    if (error || !sessions.length) {
        dropdown.innerHTML = '<option disabled selected>Belum ada sesi</option>';
        return;
    }

    dropdown.innerHTML = '<option value="" disabled selected>-- Pilih Tanggal Sesi --</option>' + 
        sessions.map(s => {
            const title = s.materi_private?.judul || `Sesi ke-${s.pertemuan_ke}`;
            const dateStr = new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            return `<option value="${s.id}" data-mentor="${s.teachers?.name || 'Mentor'}">${dateStr} : ${title}</option>`;
        }).join('');
}

window.handleSessionChange = async (sessionId) => {
    activeSessionId = sessionId;
    
    // Update Mentor Name
    const dropdown = document.getElementById('session-dropdown');
    const selectedOpt = dropdown.options[dropdown.selectedIndex];
    const mentorName = selectedOpt.getAttribute('data-mentor');
    
    document.getElementById('mentor-name').innerText = mentorName;
    document.getElementById('toolbar-area').style.display = 'flex';
    document.getElementById('bulk-wrapper').style.display = 'flex';

    await loadPhotos();
};

async function loadPhotos() {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</div>';

    let query = supabase.from('gallery_contents')
        .select('*')
        .eq('pertemuan_id', activeSessionId)
        .order('created_at', { ascending: false });

    if (currentUserRole !== 'super_admin') {
        query = query.eq('is_deleted', false);
    }

    const { data: photos, error } = await query;

    if (error) { grid.innerHTML = `<div class="error">Error: ${error.message}</div>`; return; }
    if (!photos.length) { grid.innerHTML = '<div class="empty-start"><p>Belum ada dokumentasi.</p></div>'; return; }

    const allPublished = photos.every(p => p.is_published);
    document.getElementById('bulk-toggle-cb').checked = allPublished;

    renderGrid(photos, grid);
}

function renderGrid(photos, container) {
    container.innerHTML = photos.map(p => {
        const isVid = p.media_type === 'video';
        const isYt = p.media_type === 'youtube';
        let thumb = p.file_url;
        let badge = '';

        if (isYt) {
            const id = getYtId(p.file_url);
            thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
            badge = '<i class="fa-brands fa-youtube badge-icon yt"></i>';
        } else if (isVid) {
            thumb = p.file_url.replace('.mp4', '.jpg').replace('/upload/', '/upload/w_400,q_auto,f_auto/');
            badge = '<i class="fa-solid fa-play badge-icon vid"></i>';
        } else {
            thumb = p.file_url.replace('/upload/', '/upload/w_400,q_auto,f_auto/');
        }

        const statusClass = p.is_published ? 'pub-true' : 'pub-false';
        const statusIcon = p.is_published ? 'fa-eye' : 'fa-eye-slash';

        return `
            <div class="photo-card ${p.is_deleted ? 'deleted' : ''}">
                <div class="img-box" onclick="openLightbox('${p.media_type}', '${p.file_url}')">
                    ${badge}
                    <img src="${thumb}" loading="lazy">
                    <div class="status-pill ${statusClass}">${p.is_published ? 'LIVE' : 'DRAFT'}</div>
                </div>
                <div class="card-ctrl">
                    <button class="btn-icon ${statusClass}" onclick="toggleSinglePublish('${p.id}', ${p.is_published})" title="Publish/Unpublish">
                        <i class="fa-solid ${statusIcon}"></i>
                    </button>
                    <button class="btn-icon del" onclick="deleteItem('${p.id}', '${p.public_id}')" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 3. UPLOAD LOGIC (RESIZE + FOLDER)
// ==========================================

window.openUploadModal = (mode) => {
    uploadMode = mode;
    filesToUpload = [];
    document.getElementById('file-preview-list').innerHTML = '';
    document.getElementById('yt-url').value = '';
    document.getElementById('yt-title').value = '';
    document.getElementById('yt-preview').innerHTML = '';
    document.getElementById('upload-status').innerText = '';
    
    document.getElementById('modal-upload').style.display = 'flex';
    document.getElementById('modal-title').innerText = mode === 'file' ? 'Upload Media' : 'Input YouTube';
    document.getElementById('form-file').style.display = mode === 'file' ? 'block' : 'none';
    document.getElementById('form-youtube').style.display = mode === 'youtube' ? 'block' : 'none';
};

window.handleFileSelect = (input) => {
    filesToUpload = Array.from(input.files);
    const list = document.getElementById('file-preview-list');
    list.innerHTML = filesToUpload.map(f => `<div class="file-item"><i class="fa-solid fa-file"></i> ${f.name}</div>`).join('');
};

window.previewYoutube = (url) => {
    const id = getYtId(url);
    const box = document.getElementById('yt-preview');
    if(id) box.innerHTML = `<img src="https://img.youtube.com/vi/${id}/mqdefault.jpg">`;
    else box.innerHTML = '';
};

window.executeUpload = async () => {
    const btn = document.getElementById('btn-save');
    const status = document.getElementById('upload-status');
    btn.disabled = true;
    btn.innerText = 'Processing...';

    try {
        const { data: acc } = await supabase.from('cloudinary_accounts').select('id, cloud_name').eq('is_active', true).single();
        if(!acc) throw new Error("Tidak ada akun Cloudinary aktif.");

        if (uploadMode === 'youtube') {
            const url = document.getElementById('yt-url').value;
            const title = document.getElementById('yt-title').value;
            const vidId = getYtId(url);
            if(!vidId || !title) throw new Error("Data YouTube tidak lengkap.");

            await supabase.from('gallery_contents').insert({
                pertemuan_id: activeSessionId,
                file_url: `https://www.youtube.com/embed/${vidId}`,
                media_type: 'youtube',
                public_id: 'yt_' + vidId,
                caption: title,
                is_published: false
            });

        } else {
            if(!filesToUpload.length) throw new Error("Pilih file dulu.");
            
            // FOLDER PATH: galeri-private / NamaKelas / Tanggal
            const dateVal = document.getElementById('session-dropdown').options[document.getElementById('session-dropdown').selectedIndex].text;
            const folderPath = `galeri-private/${sanitize(activeClassName)}/${sanitize(dateVal)}`;

            for (const file of filesToUpload) {
                // 1. COMPRESS / RESIZE HD
                status.innerText = `Mengompresi ${file.name}...`;
                const compressedFile = await compressImage(file);

                // 2. SIGNATURE
                status.innerText = `Mengupload ${file.name}...`;
                const { data: { session } } = await supabase.auth.getSession();
                const signRes = await fetch('https://aedtrwpomswdqxarvsrg.supabase.co/functions/v1/cloudinary-sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ action: 'get_signature', account_id: acc.id, params: { folder: folderPath } })
                });
                const signData = await signRes.json();
                
                // 3. UPLOAD CLOUDINARY
                const fd = new FormData();
                fd.append('file', compressedFile);
                fd.append('api_key', signData.api_key);
                fd.append('timestamp', signData.timestamp);
                fd.append('signature', signData.signature);
                fd.append('folder', folderPath);

                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${acc.cloud_name}/upload`, { method: 'POST', body: fd });
                const cloudData = await cloudRes.json();

                // 4. SAVE DB
                await supabase.from('gallery_contents').insert({
                    pertemuan_id: activeSessionId,
                    file_url: cloudData.secure_url,
                    public_id: cloudData.public_id,
                    media_type: cloudData.resource_type,
                    caption: file.name,
                    is_published: false
                });
            }
        }
        closeUploadModal();
        loadPhotos();
    } catch(err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Simpan';
        status.innerText = '';
    }
};

// ==========================================
// 4. HELPERS (RESIZE, PUBLISH, ETC)
// ==========================================

function compressImage(file) {
    return new Promise((resolve, reject) => {
        if (file.type.indexOf("image") === -1) return resolve(file); // Skip Video
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                // RESIZE LOGIC HD (1280px)
                if (width > MAX_WIDTH) {
                    height = Math.round(height * (MAX_WIDTH / width));
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', JPG_QUALITY);
            };
        };
        reader.onerror = (err) => reject(err);
    });
}

window.handleBulkPublish = async (isChecked) => {
    if(!confirm(`Yakin ingin mengubah status SEMUA foto menjadi ${isChecked ? 'PUBLISHED' : 'DRAFT'}?`)) {
        document.getElementById('bulk-toggle-cb').checked = !isChecked; 
        return;
    }
    await supabase.from('gallery_contents').update({ is_published: isChecked }).eq('pertemuan_id', activeSessionId).eq('is_deleted', false);
    loadPhotos();
};

window.toggleSinglePublish = async (id, currentStatus) => {
    await supabase.from('gallery_contents').update({ is_published: !currentStatus }).eq('id', id);
    loadPhotos();
};

window.deleteItem = async (id, publicId) => {
    if(!confirm("Hapus item ini?")) return;
    if (currentUserRole === 'super_admin') {
        // Hard delete would go here (fetch delete_image)
        await supabase.from('gallery_contents').delete().eq('id', id);
    } else {
        await supabase.from('gallery_contents').update({ is_deleted: true }).eq('id', id);
    }
    loadPhotos();
};

window.closeUploadModal = () => document.getElementById('modal-upload').style.display = 'none';
window.closeLightbox = (e) => {
    if(e.target.id==='lightbox' || e.target.className==='close-lightbox') {
        document.getElementById('lightbox').style.display='none';
        document.getElementById('lightbox-vid').innerHTML='';
    }
};
window.openLightbox = (type, url) => {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const vid = document.getElementById('lightbox-vid');
    lb.style.display = 'flex';
    if(type==='image'){ img.src=url; img.style.display='block'; vid.style.display='none'; }
    else { img.style.display='none'; vid.style.display='block'; vid.innerHTML = type==='youtube' ? `<iframe src="${url}" width="100%" height="100%"></iframe>` : `<video src="${url}" controls></video>`; }
};

function getYtId(url) { const m = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/); return m && m[1].length==11 ? m[1] : null; }
function sanitize(s) { return s.replace(/[^a-z0-9]/gi, '_'); }

function injectStyles() {
    if (document.getElementById('gg-css')) return;
    const s = document.createElement('style');
    s.id = 'gg-css';
    s.textContent = `
        .gg-container { padding: 20px; font-family: 'Poppins', sans-serif; background: #f8fafc; min-height: 85vh; }
        .gg-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 25px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); flex-wrap: wrap; gap: 15px; }
        .header-left { display: flex; align-items: center; gap: 15px; }
        .btn-back { background: #f1f5f9; border: none; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; color: #64748b; }
        .class-title { margin: 0; font-size: 1.2rem; font-weight: 800; color: #1e293b; }
        .sub-label { font-size: 0.8rem; color: #94a3b8; }
        .header-center { flex: 1; display: flex; justify-content: center; }
        .select-wrapper { position: relative; width: 100%; max-width: 400px; }
        .select-wrapper select { width: 100%; padding: 12px 40px 12px 15px; border-radius: 12px; border: 1px solid #cbd5e1; appearance: none; font-weight: 600; color: #334155; font-family: inherit; }
        .select-wrapper i { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8; }
        .header-right { display: flex; align-items: center; }
        .bulk-toggle-wrapper { display: flex; align-items: center; gap: 10px; background: #f0fdf4; padding: 8px 15px; border-radius: 20px; border: 1px solid #dcfce7; }
        .toggle-label { font-size: 0.8rem; font-weight: 600; color: #15803d; }
        .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(18px); }
        .gg-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .mentor-badge { background: #e0f2fe; color: #0369a1; padding: 8px 15px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; }
        .action-buttons { display: flex; gap: 10px; }
        .btn-action { border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; color: white; transition: 0.2s; }
        .btn-action.blue { background: #3b82f6; } .btn-action.blue:hover { background: #2563eb; }
        .btn-action.red { background: #ef4444; } .btn-action.red:hover { background: #dc2626; }
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .photo-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative; transition: 0.3s; border: 2px solid transparent; }
        .photo-card.deleted { opacity: 0.5; filter: grayscale(1); border-color: red; }
        .img-box { height: 180px; position: relative; cursor: pointer; background: #000; }
        .img-box img { width: 100%; height: 100%; object-fit: cover; }
        .badge-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 2rem; z-index: 2; text-shadow: 0 2px 5px rgba(0,0,0,0.5); }
        .status-pill { position: absolute; top: 10px; left: 10px; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; color: white; z-index: 2; }
        .pub-true { background: rgba(16, 185, 129, 0.9); }
        .pub-false { background: rgba(100, 116, 139, 0.9); }
        .card-ctrl { padding: 10px; display: flex; justify-content: space-between; background: white; }
        .btn-icon { border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-icon.pub-true { color: #10b981; background: #ecfdf5; }
        .btn-icon.pub-false { color: #64748b; background: #f1f5f9; }
        .btn-icon.del { color: #ef4444; background: #fef2f2; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: none; justify-content: center; align-items: center; }
        .modal-card { background: white; padding: 25px; border-radius: 16px; width: 90%; max-width: 450px; }
        .modal-head { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: 800; font-size: 1.2rem; }
        .close-modal { cursor: pointer; }
        .drop-zone { border: 2px dashed #cbd5e1; padding: 30px; text-align: center; border-radius: 12px; cursor: pointer; color: #64748b; }
        .input-modern { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 10px; }
        .btn-save { width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px; }
        .empty-start { grid-column: 1/-1; text-align: center; padding: 50px; color: #94a3b8; font-size: 1.1rem; }
        .lightbox-overlay { position: fixed; inset: 0; background: black; z-index: 2000; display: none; justify-content: center; align-items: center; }
        .lightbox-content { max-width: 90%; max-height: 90%; }
        .lightbox-content img, .lightbox-content video, .lightbox-content iframe { max-width: 100%; max-height: 90vh; }
        .close-lightbox { position: absolute; top: 20px; right: 20px; color: white; font-size: 3rem; cursor: pointer; }
        @media (max-width: 900px) {
            .gg-container { flex-direction: column; padding: 10px; }
            .gg-header { flex-direction: column; align-items: stretch; gap: 15px; }
            .select-wrapper { max-width: 100%; }
            .gallery-grid { grid-template-columns: repeat(2, 1fr); }
        }
    `;
    document.head.appendChild(s);
}