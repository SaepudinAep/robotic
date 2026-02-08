/**
 * Project: Universal Gallery Master (Dual-Core Support)
 * Version: 4.0 - Tablet Optimized (Performance Fix & Solid UI)
 * File: modules/galeri-master.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE GLOBAL ---
let context = {
    mode: null,      // 'SCHOOL' atau 'PRIVATE'
    activeClassId: null,
    user: null,      // Profile & Role
    className: null,
    school: 'Umum'
};

let activeSessionId = null;
let activeSessionDate = '';
let activeSessionTitle = '';
let currentPhotos = []; 

// Config Resize HD
const MAX_WIDTH = 1280;
const JPG_QUALITY = 0.85;

// ==========================================
// 1. INITIALIZATION
// ==========================================
export async function init(canvas) {
    injectStyles(); // CSS First!
    
    // A. Deteksi Konteks dari LocalStorage
    const mode = localStorage.getItem("galleryContextMode");

    if (mode === 'PRIVATE') {
        context.mode = 'PRIVATE';
        context.activeClassId = localStorage.getItem("activePrivateClassId");
        context.className = localStorage.getItem("activePrivateClassName") || 'Kelas Private';
    } else if (mode === 'SCHOOL') {
        context.mode = 'SCHOOL';
        context.activeClassId = localStorage.getItem("activeClassId");
        context.className = localStorage.getItem("activeClassName") || 'Kelas Sekolah';
    } else {
        canvas.innerHTML = `
            <div class="gm-error-box">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Mode galeri tidak terdeteksi. Silakan kembali ke Dashboard.</p>
                <button onclick="window.loadAdminModule('overview', 'Dashboard', 'Home')" class="gm-btn-submit" style="width:auto; margin-top:10px;">Ke Dashboard</button>
            </div>`;
        return;
    }

    if (!context.activeClassId) {
        canvas.innerHTML = '<div class="gm-error-box"><i class="fa-solid fa-ban"></i> Error: ID Kelas hilang.</div>';
        return;
    }

    // B. Ambil Profil User (Untuk Cek Role Guru/Admin)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
        context.user = profile;
    }

    renderMainLayout(canvas);
    await loadSessions();
}

// ==========================================
// 2. SMART NAVIGATION (FIXED)
// ==========================================
window.handleBackNavigation = () => {
    // Paksa kembali ke Dashboard (Overview) karena ini modul detail
    if (window.loadAdminModule) {
        window.loadAdminModule('overview', 'Dashboard', 'Home');
    } else {
        window.location.reload();
    }
};

// ==========================================
// 3. DATA LOADERS
// ==========================================

async function loadSessions() {
    const sessionBar = document.getElementById('session-horizontal-bar');
    sessionBar.innerHTML = '<div class="gm-loading-pill"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat Sesi...</div>';

    let query;
    if (context.mode === 'SCHOOL') {
        query = supabase.from('pertemuan_kelas').select('id, tanggal, materi(title, level_id)').eq('class_id', context.activeClassId);
    } else {
        query = supabase.from('pertemuan_private').select('id, tanggal, materi_private(judul, level_id)').eq('class_id', context.activeClassId);
    }

    // Filter guru: Hanya lihat materi levelnya sendiri (kecuali Admin/PIC)
    const isSuper = ['super_admin', 'pic'].includes(context.user?.role);
    if (!isSuper && context.user?.role === 'teacher' && context.user.level_id) {
        const levelPath = context.mode === 'SCHOOL' ? 'materi.level_id' : 'materi_private.level_id';
        query = query.eq(levelPath, context.user.level_id);
    }

    const { data: sessions, error } = await query.order('tanggal', { ascending: false });
    
    if (error || !sessions?.length) {
        sessionBar.innerHTML = '<div class="gm-empty-pill">Belum ada sesi/pertemuan aktif.</div>';
        return;
    }

    sessionBar.innerHTML = sessions.map(s => {
        const title = context.mode === 'SCHOOL' ? (s.materi?.title || 'Kegiatan') : (s.materi_private?.judul || 'Sesi Private');
        const dateObj = new Date(s.tanggal);
        const tgl = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const rawDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }).replace(' ', '');
        
        return `
            <button class="gm-sess-pill touch-feedback" onclick="window.selectSession('${s.id}', '${rawDate}', '${escapeHtml(title)}', this)">
                <span class="sess-date">${tgl}</span>
                <span class="sess-name">${title}</span>
            </button>
        `;
    }).join('');

    // Auto-select sesi pertama (terbaru)
    if (sessions.length > 0) {
        const firstBtn = document.querySelector('.gm-sess-pill');
        if(firstBtn) firstBtn.click();
    }
}

window.selectSession = async (id, dateFormatted, title, element) => {
    activeSessionId = id;
    activeSessionDate = dateFormatted; 
    activeSessionTitle = title.replace(/\s/g, ''); 
    
    document.querySelectorAll('.gm-sess-pill').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    document.getElementById('display-session-title').innerText = title;
    
    const toolbar = document.getElementById('gallery-toolbar');
    toolbar.style.display = 'flex';
    toolbar.classList.add('fade-in');

    await loadPhotos();
};

async function loadPhotos() {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '<div class="gm-loading-grid"><i class="fa-solid fa-spinner fa-spin"></i> Mengambil dokumentasi...</div>';

    const targetCol = context.mode === 'SCHOOL' ? 'pertemuan_id' : 'pertemuan_private_id';

    let query = supabase.from('gallery_contents')
        .select('*')
        .eq(targetCol, activeSessionId)
        .order('created_at', { ascending: false });
    
    // Admin bisa lihat yg terhapus (soft delete), Guru tidak
    if (context.user?.role !== 'super_admin' && context.user?.role !== 'pic') {
        query = query.eq('is_deleted', false);
    }

    const { data: photos } = await query;
    currentPhotos = photos || [];

    updatePublishButtonState();

    if (!photos?.length) {
        grid.innerHTML = `
            <div class="gm-empty-state">
                <div class="empty-icon"><i class="fa-regular fa-images"></i></div>
                <p>Belum ada dokumentasi di sesi ini.</p>
                <button class="gm-btn-tool blue" onclick="window.openUploadModal('file')">Upload Foto Pertama</button>
            </div>
        `;
        return;
    }
    renderGrid(photos, grid);
}

function updatePublishButtonState() {
    const btn = document.getElementById('btn-publish-all');
    if (!btn) return;
    
    // Cek apakah ada yang masih Draft
    const hasDraft = currentPhotos.some(p => !p.is_published && !p.is_deleted);
    
    if (hasDraft) {
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i> <span class="hide-mobile">Publish All</span>';
        btn.onclick = () => window.togglePublishAll(true);
        btn.className = "gm-btn-tool orange touch-feedback";
    } else {
        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> <span class="hide-mobile">Draft All</span>';
        btn.onclick = () => window.togglePublishAll(false);
        btn.className = "gm-btn-tool dark touch-feedback";
    }
}

function renderGrid(photos, container) {
    container.innerHTML = photos.map(p => {
        const isYt = p.media_type === 'youtube';
        const isVid = p.media_type === 'video';
        let thumb = p.file_url;
        
        // Optimasi Cloudinary Thumbnail
        const rot = p.rotation ? `a_${p.rotation}/` : '';
        if (isYt) {
            const ytId = getYoutubeId(p.file_url);
            thumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
        } else if (p.file_url.includes('cloudinary')) {
            // Resize ke w_400 agar ringan di grid
            const resourceType = isVid ? 'video' : 'image'; 
            // Trik: video di cloudinary bisa ambil poster jpg dengan ganti ekstensi
            const cleanUrl = isVid ? p.file_url.replace(/\.[^/.]+$/, ".jpg") : p.file_url;
            thumb = cleanUrl.replace('/upload/', `/upload/${rot}w_400,q_auto,f_auto/`);
        }
        
        const isDeleted = p.is_deleted;
        const statusClass = p.is_published ? 'status-live' : 'status-draft';
        const deleteOverlay = isDeleted ? '<div class="deleted-overlay"><i class="fa-solid fa-trash"></i> TERHAPUS</div>' : '';

        return `
            <div class="gm-card ${isDeleted ? 'deleted-item' : ''} fade-in">
                <div class="gm-card-media" onclick="window.openLightbox('${p.media_type}', '${p.file_url}', '${p.id}', ${p.rotation || 0})">
                    ${isYt ? '<div class="media-badge yt"><i class="fa-brands fa-youtube"></i></div>' : ''}
                    ${isVid ? '<div class="media-badge vid"><i class="fa-solid fa-video"></i></div>' : ''}
                    <img src="${thumb}" loading="lazy" alt="Dokumentasi">
                    <div class="status-pill ${statusClass}">${p.is_published ? 'LIVE' : 'DRAFT'}</div>
                    ${deleteOverlay}
                    <div class="caption-overlay">${p.caption || ''}</div>
                </div>
                <div class="gm-card-actions">
                    <button class="btn-mini-action" onclick="window.togglePublish('${p.id}', ${p.is_published})" title="Publish/Draft">
                        <i class="fa-solid ${p.is_published ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                    <button class="btn-mini-action danger" onclick="window.deleteItem('${p.id}', ${p.is_deleted})" title="Hapus">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 4. ACTIONS (UPLOAD & PUBLISH)
// ==========================================
window.openUploadModal = (type) => {
    const modal = document.getElementById('modal-upload');
    modal.style.display = 'flex'; // Flex agar centering jalan
    document.getElementById('form-file').style.display = type === 'file' ? 'block' : 'none';
    document.getElementById('form-yt').style.display = type === 'yt' ? 'block' : 'none';
    document.getElementById('upload-status').innerHTML = '';
};

window.togglePublishAll = async (targetState) => {
    if (!confirm(targetState ? "Publish semua foto ini ke Siswa?" : "Sembunyikan semua foto (Draft)?")) return;

    const targetCol = context.mode === 'SCHOOL' ? 'pertemuan_id' : 'pertemuan_private_id';
    
    const { error } = await supabase.from('gallery_contents')
        .update({ is_published: targetState })
        .eq(targetCol, activeSessionId)
        .eq('is_deleted', false); // Jangan publish yg terhapus

    if (error) showToast("Gagal update batch: " + error.message, "error");
    else await loadPhotos();
};

window.executeUpload = async () => {
    const btn = document.getElementById('btn-upload-action');
    const status = document.getElementById('upload-status');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

    try {
        const { data: acc } = await supabase.from('cloudinary_accounts').select('*').eq('is_active', true).single();
        if (!acc) throw new Error("Tidak ada akun Cloudinary aktif.");

        const isYt = document.getElementById('form-yt').style.display === 'block';
        
        // Payload Dasar
        const payloadBase = {};
        if (context.mode === 'SCHOOL') {
            payloadBase.pertemuan_id = activeSessionId;
            payloadBase.class_id = context.activeClassId; 
        } else {
            payloadBase.pertemuan_private_id = activeSessionId;
            // Private tidak pakai class_id di gallery_contents (opsional tergantung schema, tapi aman dikosongkan)
        }

        if (isYt) {
            const url = document.getElementById('yt-url').value;
            const title = document.getElementById('yt-title').value || "Video Youtube";
            if(!url) throw new Error("Link URL wajib diisi");
            
            await supabase.from('gallery_contents').insert({
                ...payloadBase,
                file_url: url, media_type: 'youtube', caption: title, is_published: true
            });
        } else {
            const files = Array.from(document.getElementById('file-input').files);
            if(files.length === 0) throw new Error("Pilih minimal 1 file.");
            
            const activeYear = localStorage.getItem("activeAcademicYear") || "Umum"; 
            const folderPath = `galeri-${context.mode.toLowerCase()}/${sanitize(activeYear)}/${sanitize(context.className)}/${sanitize(activeSessionDate)}`;

            let startIndex = currentPhotos.length + 1;

            for (const file of files) {
                status.innerHTML = `<span style="color:#2563eb">Mengupload ${file.name}...</span>`;
                
                const noUrut = startIndex.toString().padStart(2, '0');
                const cleanCaption = `robopanda_${activeSessionDate}_${activeSessionTitle}_${noUrut}`;
                startIndex++;

                const fileToUpload = await compressImage(file);
                
                const { data: { session } } = await supabase.auth.getSession();
                
                // Panggil Edge Function
                const signRes = await fetch('https://aedtrwpomswdqxarvsrg.supabase.co/functions/v1/cloudinary-sign', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ action: 'get_signature', account_id: acc.id, params: { folder: folderPath } })
                });
                
                if(!signRes.ok) throw new Error("Gagal otorisasi Cloudinary.");
                const signData = await signRes.json();

                const fd = new FormData();
                fd.append('file', fileToUpload);
                fd.append('api_key', signData.api_key);
                fd.append('timestamp', signData.timestamp);
                fd.append('signature', signData.signature);
                fd.append('folder', folderPath);

                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${acc.cloud_name}/upload`, { method: 'POST', body: fd });
                if(!cloudRes.ok) throw new Error("Gagal upload ke cloud.");
                const cloudData = await cloudRes.json();

                await supabase.from('gallery_contents').insert({
                    ...payloadBase,
                    file_url: cloudData.secure_url, 
                    public_id: cloudData.public_id,
                    media_type: cloudData.resource_type, 
                    caption: cleanCaption, 
                    cloudinary_account_id: acc.id, 
                    is_published: true
                });
            }
        }
        window.closeModal('modal-upload');
        loadPhotos();
        showToast("Upload Berhasil!");
    } catch (err) { 
        status.innerHTML = `<span style="color:#ef4444;">Error: ${err.message}</span>`; 
    } finally { 
        btn.disabled = false; btn.innerText = "Simpan Dokumentasi"; 
    }
};

window.togglePublish = async (id, cur) => { await supabase.from('gallery_contents').update({ is_published: !cur }).eq('id', id); loadPhotos(); };

window.deleteItem = async (id, isDel) => {
    if (!confirm(isDel ? "Hapus PERMANEN? Tidak bisa dikembalikan." : "Hapus item ini?")) return;
    
    if (isDel && context.user?.role === 'super_admin') {
        // Hard Delete
        await supabase.from('gallery_contents').delete().eq('id', id);
    } else {
        // Soft Delete
        await supabase.from('gallery_contents').update({ is_deleted: true }).eq('id', id);
    }
    loadPhotos();
};

window.rotateImage = async (id, curr) => {
    const newRot = (curr + 90) % 360;
    const img = document.getElementById('lb-img');
    
    // Manipulasi URL Cloudinary untuk rotasi instan di UI
    // Cari segmen 'upload/' lalu sisipkan transformasi
    const parts = img.src.split('/upload/');
    if (parts.length === 2) {
        // Hapus rotasi lama jika ada (a_90, etc)
        const cleanTail = parts[1].replace(/a_\d+\//, '');
        img.src = `${parts[0]}/upload/a_${newRot}/${cleanTail}`;
    }
    
    document.getElementById('btn-lb-rotate').onclick = () => window.rotateImage(id, newRot);
    
    // Simpan ke DB
    await supabase.from('gallery_contents').update({ rotation: newRot }).eq('id', id);
    // Tidak perlu reload photos agar lightbox tidak tertutup
};

// ==========================================
// 5. UI RENDERER
// ==========================================
function renderMainLayout(canvas) {
    canvas.innerHTML = `
        <div class="gm-wrapper fade-in">
            <div id="toast-box"></div>

            <div class="gm-header">
                <div class="gm-header-top">
                    <button class="gm-btn-back touch-feedback" onclick="window.handleBackNavigation()" title="Kembali ke Dashboard">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div class="gm-header-info">
                        <h1>${context.mode === 'SCHOOL' ? 'Galeri Sekolah' : 'Galeri Private'}</h1>
                        <p><i class="fa-solid fa-shapes"></i> ${context.className}</p>
                    </div>
                </div>
                <div id="session-horizontal-bar" class="gm-session-bar hide-scrollbar"></div>
            </div>

            <div class="gm-content">
                <div id="gallery-toolbar" class="gm-toolbar" style="display:none;">
                    <span id="display-session-title" class="current-topic">Topik Sesi</span>
                    <div class="gm-tools-right">
                        <button id="btn-publish-all" class="gm-btn-tool dark touch-feedback"><i class="fa-solid fa-check-double"></i></button>
                        <button class="gm-btn-tool blue touch-feedback" onclick="window.openUploadModal('file')"><i class="fa-solid fa-cloud-arrow-up"></i> <span class="hide-mobile">Upload</span></button>
                        <button class="gm-btn-tool red touch-feedback" onclick="window.openUploadModal('yt')"><i class="fa-brands fa-youtube"></i> <span class="hide-mobile">Video</span></button>
                    </div>
                </div>
                <div id="gallery-grid" class="gm-grid">
                    <div class="gm-empty-state">Pilih tanggal sesi di atas untuk melihat foto.</div>
                </div>
            </div>
        </div>

        <div id="modal-upload" class="gm-modal-overlay">
            <div class="gm-modal-card bounce-in">
                <div class="gm-modal-head">
                    <h3><i class="fa-solid fa-folder-plus"></i> Tambah Media</h3>
                    <button class="gm-close-btn" onclick="window.closeModal('modal-upload')">&times;</button>
                </div>
                <div class="gm-modal-body">
                    <div id="form-file">
                        <div class="gm-dropzone" onclick="document.getElementById('file-input').click()">
                            <i class="fa-solid fa-images"></i>
                            <p>Tap untuk pilih Foto/Video</p>
                            <small>Auto-Resize HD & Auto-Caption</small>
                            <input type="file" id="file-input" multiple accept="image/*,video/*" hidden onchange="this.nextElementSibling.innerText = this.files.length + ' file dipilih'">
                            <div class="file-count-label"></div>
                        </div>
                    </div>
                    <div id="form-yt" style="display:none;">
                        <div class="form-group">
                            <label>Link YouTube</label>
                            <input type="text" id="yt-url" class="gm-input" placeholder="https://youtu.be/...">
                        </div>
                        <div class="form-group">
                            <label>Judul Video</label>
                            <input type="text" id="yt-title" class="gm-input" placeholder="Judul...">
                        </div>
                    </div>
                    <div id="upload-status" class="gm-status-text"></div>
                </div>
                <div class="gm-modal-foot">
                    <button id="btn-upload-action" class="gm-btn-submit" onclick="window.executeUpload()">Simpan Dokumentasi</button>
                </div>
            </div>
        </div>

        <div id="lightbox" class="gm-lightbox" onclick="window.closeModal('lightbox')">
            <button class="gm-lb-close">&times;</button>
            <div class="gm-lb-content" onclick="event.stopPropagation()">
                <img id="lb-img" class="gm-lb-media" style="display:none;">
                <div id="lb-vid" class="gm-lb-media" style="display:none;"></div>
                <div class="gm-lb-controls">
                    <button id="btn-lb-rotate" class="gm-lb-btn"><i class="fa-solid fa-rotate-right"></i> Putar Foto</button>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 6. STYLING (PERFORMANCE OPTIMIZED)
// ==========================================
function injectStyles() {
    if (document.getElementById('gm-css')) return;
    const s = document.createElement('style');
    s.id = 'gm-css';
    s.textContent = `
        /* LAYOUT */
        .gm-wrapper { display: flex; flex-direction: column; height: 100vh; background: #f1f5f9; font-family: 'Poppins', sans-serif; overflow: hidden; }
        .gm-header { background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.03); z-index: 50; padding-bottom: 5px; }
        .gm-header-top { padding: 15px 20px; display: flex; align-items: center; gap: 15px; }
        
        .gm-btn-back { background: #f8fafc; border: 1px solid #e2e8f0; width: 42px; height: 42px; border-radius: 50%; color: #64748b; font-size: 1.1rem; cursor: pointer; display:flex; align-items:center; justify-content:center; }
        .gm-btn-back:hover { background: #e2e8f0; color: #334155; }
        
        .gm-header-info h1 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1e293b; }
        .gm-header-info p { margin: 0; font-size: 0.8rem; color: #64748b; }

        /* SESSION PILLS (TABLET FRIENDLY) */
        .gm-session-bar { display: flex; gap: 12px; overflow-x: auto; padding: 5px 20px 15px; scrollbar-width: none; }
        .gm-sess-pill { flex-shrink: 0; padding: 8px 18px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; min-width: 110px; text-align: left; }
        .gm-sess-pill.active { background: #3b82f6; border-color: #3b82f6; color: white; box-shadow: 0 4px 12px rgba(59,130,246,0.3); transform: scale(1.02); }
        .sess-date { font-size: 0.75rem; font-weight: 700; opacity: 0.9; }
        .sess-name { font-size: 0.85rem; font-weight: 600; white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }

        /* CONTENT & GRID */
        .gm-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .gm-toolbar { padding: 15px 20px; background: #fff; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 40; }
        .current-topic { font-weight: 700; color: #334155; font-size: 1rem; border-left: 4px solid #f59e0b; padding-left: 12px; }
        .gm-tools-right { display: flex; gap: 10px; }
        
        .gm-btn-tool { border: none; padding: 10px 18px; border-radius: 50px; color: white; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .gm-btn-tool.blue { background: #3b82f6; } 
        .gm-btn-tool.red { background: #ef4444; }
        .gm-btn-tool.orange { background: #f59e0b; }
        .gm-btn-tool.dark { background: #475569; }

        .gm-grid { padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }
        .gm-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.03); position: relative; transition: 0.2s; border:1px solid #f1f5f9; }
        .gm-card-media { height: 180px; position: relative; cursor: pointer; background: #0f172a; }
        .gm-card-media img { width: 100%; height: 100%; object-fit: cover; }
        
        /* BADGES */
        .media-badge { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: white; z-index: 2; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
        .media-badge.yt { background: #ff0000; } .media-badge.vid { background: #3b82f6; }
        
        .status-pill { position: absolute; bottom: 10px; left: 10px; font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; z-index: 2; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
        .status-live { background: #10b981; color: white; } .status-draft { background: #f59e0b; color: white; }
        
        .deleted-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ef4444; font-weight: bold; font-size: 0.9rem; z-index: 5; }
        
        .caption-overlay { position: absolute; bottom: 0; left: 0; width: 100%; padding: 6px; background: rgba(0,0,0,0.7); color: white; font-size: 0.7rem; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0; transition: 0.2s; }
        .gm-card:hover .caption-overlay { opacity: 1; }

        .gm-card-actions { padding: 10px; display: flex; justify-content: flex-end; gap: 8px; background: #fff; border-top: 1px solid #f1f5f9; }
        .btn-mini-action { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; font-size:1rem; }
        .btn-mini-action:hover { background: #f1f5f9; color: #3b82f6; }
        .btn-mini-action.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }

        /* MODALS (SOLID DARK OVERLAY - CRITICAL FOR TABLET) */
        .gm-modal-overlay { 
            position: fixed; inset: 0; 
            background: rgba(0, 0, 0, 0.85); /* Solid Dark */
            display: none; align-items: center; justify-content: center; z-index: 2000; 
        }
        .gm-modal-card { background: white; width: 500px; max-width: 90%; border-radius: 20px; overflow: hidden; }
        .gm-modal-head { padding: 20px 25px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .gm-modal-head h3 { margin:0; font-size:1.1rem; color:#1e293b; }
        .gm-close-btn { background:none; border:none; font-size:1.5rem; color:#64748b; cursor:pointer; }
        
        .gm-modal-body { padding: 25px; }
        .gm-dropzone { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 40px 20px; text-align: center; cursor: pointer; transition: 0.2s; background: #f8fafc; }
        .gm-dropzone:active { background: #e0f2fe; border-color: #3b82f6; }
        .gm-dropzone i { font-size: 3rem; color: #94a3b8; margin-bottom: 10px; }
        
        .form-group { margin-bottom: 15px; } 
        .form-group label { display:block; font-weight:600; font-size:0.85rem; color:#475569; margin-bottom:5px; }
        .gm-input { width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; box-sizing:border-box; }
        .gm-input:focus { border-color: #3b82f6; outline:none; }
        
        .gm-modal-foot { padding: 20px 25px; background: #f8fafc; text-align: right; border-top: 1px solid #e2e8f0; }
        .gm-btn-submit { background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; width: 100%; font-size:1rem; }

        /* LIGHTBOX */
        .gm-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 3000; display: none; align-items: center; justify-content: center; }
        .gm-lb-content { max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; align-items: center; position: relative; }
        .gm-lb-media { max-width: 100%; max-height: 80vh; border-radius: 4px; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
        .gm-lb-close { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); color: white; border: none; width: 48px; height: 48px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; z-index: 3001; }
        .gm-lb-btn { background: #3b82f6; border: none; color: white; padding: 10px 25px; border-radius: 30px; cursor: pointer; font-size: 1rem; display: flex; gap: 8px; align-items: center; margin-top:20px; font-weight:600; }

        /* TOAST */
        #toast-box { position: fixed; bottom: 20px; right: 20px; z-index: 3000; display: flex; flex-direction: column; gap: 10px; }
        .toast-item { padding: 12px 20px; border-radius: 50px; color: white; font-weight: bold; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .toast-item.success { background: #10b981; } .toast-item.error { background: #ef4444; }

        .hide-mobile { display: inline; }
        @media (max-width: 600px) { .hide-mobile { display: none; } .gm-grid { grid-template-columns: 1fr 1fr; gap: 10px; } }
        .fade-in { animation: fadeIn 0.4s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .gm-empty-state { grid-column: 1 / -1; text-align: center; padding: 60px; color: #94a3b8; }
        .gm-error-box { text-align: center; padding: 50px; color: #ef4444; font-weight: bold; }
    `;
    document.head.appendChild(s);
}

// ==========================================
// 7. UTILS
// ==========================================
function showToast(msg, type = 'success') {
    const box = document.getElementById('toast-box');
    if(!box) return;
    const el = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.innerHTML = type === 'success' ? `<i class="fa-solid fa-circle-check"></i> ${msg}` : `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

function compressImage(file) {
    return new Promise((resolve) => {
        if (file.type.indexOf("image") === -1) return resolve(file);
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > MAX_WIDTH) { h = Math.round(h * (MAX_WIDTH / w)); w = MAX_WIDTH; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', JPG_QUALITY);
            };
        };
    });
}

function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/['"]/g, "");
}

window.closeModal = (id) => { const el = document.getElementById(id); el.style.display = 'none'; if(id === 'lightbox') { document.getElementById('lb-vid').innerHTML = ''; document.getElementById('lb-img').src = ''; }};
function getYoutubeId(url) { const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/); return (m && m[2].length === 11) ? m[2] : null; }
function sanitize(s) { return s ? s.replace(/[^a-z0-9]/gi, '').toLowerCase() : 'u'; }