/**
 * Project: Universal Gallery Master (Admin Repo)
 * Version: Compact Tablet Edition (1.0)
 * Features: Auto-Context (School/Private), Level Security, Bulk Publish, Rotate, HD Resize
 * UI Standard: 48px Touch Targets, Space-Efficient Horizontal Layout
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- STATE GLOBAL ---
let context = {
    mode: null,      // 'SCHOOL' atau 'PRIVATE'
    activeClassId: null,
    user: null,      // Profile & Role
    school: 'Umum'   // Nama sekolah untuk folder
};

let activeSessionId = null;
let filesToUpload = [];

// Config Resize HD
const MAX_WIDTH = 1280;
const JPG_QUALITY = 0.8;

// ==========================================
// 1. INITIALIZATION & SECURITY
// ==========================================
export async function init(canvas) {
    injectStyles();
    
    // A. Deteksi Konteks & Mode
    const schoolId = localStorage.getItem("activeClassId");
    const privateId = localStorage.getItem("activePrivateClassId");

    if (schoolId) {
        context.mode = 'SCHOOL';
        context.activeClassId = schoolId;
    } else if (privateId) {
        context.mode = 'PRIVATE';
        context.activeClassId = privateId;
    } else {
        canvas.innerHTML = '<div class="err-box">Error: Pilih kelas terlebih dahulu.</div>';
        return;
    }

    // B. Ambil Profil User (Teacher/Super Admin)
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    context.user = profile;

    // C. Ambil Detail Kelas untuk Nama Folder
    if (context.mode === 'SCHOOL') {
        const { data: cls } = await supabase.from('classes').select('name, schools(name)').eq('id', context.activeClassId).single();
        context.school = cls?.schools?.name || 'Sekolah';
        context.className = cls?.name || 'Kelas';
    } else {
        const { data: cls } = await supabase.from('class_private').select('name').eq('id', context.activeClassId).single();
        context.className = cls?.name || 'Private';
    }

    renderMainLayout(canvas);
    await loadSessions();
}

// ==========================================
// 2. DATA LOADERS (SECURITY FILTERED)
// ==========================================

async function loadSessions() {
    const sidebar = document.getElementById('session-sidebar');
    sidebar.innerHTML = '<div class="load-mini">Memuat Jadwal...</div>';

    let query;
    if (context.mode === 'SCHOOL') {
        query = supabase.from('pertemuan_kelas').select('id, tanggal, materi(title, level_id)').eq('class_id', context.activeClassId);
    } else {
        query = supabase.from('pertemuan_private').select('id, tanggal, materi_private(judul, level_id)').eq('class_id', context.activeClassId);
    }

    // --- FILTER LEVEL UNTUK TEACHER (Double-Lock) ---
    if (context.user.role === 'teacher' && context.user.level_id) {
        const levelPath = context.mode === 'SCHOOL' ? 'materi.level_id' : 'materi_private.level_id';
        query = query.eq(levelPath, context.user.level_id);
    }

    const { data: sessions, error } = await query.order('tanggal', { ascending: false });

    if (error || !sessions.length) {
        sidebar.innerHTML = '<div class="empty-mini">Belum ada jadwal.</div>';
        return;
    }

    sidebar.innerHTML = sessions.map(s => {
        const title = context.mode === 'SCHOOL' ? (s.materi?.title || 'Kegiatan') : (s.materi_private?.judul || 'Sesi Private');
        const tgl = new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return `
            <div class="sess-card touch-48" onclick="window.selectSession('${s.id}', '${s.tanggal}', '${title}')">
                <span class="sess-tgl">${tgl}</span>
                <p class="sess-title">${title}</p>
            </div>
        `;
    }).join('');
}

window.selectSession = async (id, date, title) => {
    activeSessionId = id;
    document.querySelectorAll('.sess-card').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update Header Sesi
    document.getElementById('display-session-title').innerText = title;
    document.getElementById('display-session-date').innerText = date;
    document.getElementById('gallery-toolbar').style.display = 'flex';
    document.getElementById('bulk-area').style.display = 'flex';

    await loadPhotos();
};

async function loadPhotos() {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '<div class="load-mini">Memuat Dokumentasi...</div>';

    const { data: photos } = await supabase.from('gallery_contents')
        .select('*')
        .eq('pertemuan_id', activeSessionId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

    if (!photos?.length) {
        grid.innerHTML = '<div class="empty-grid">Belum ada dokumentasi untuk sesi ini.</div>';
        document.getElementById('bulk-toggle').checked = false;
        return;
    }

    // Cek status Bulk Toggle (jika semua sudah LIVE)
    const allPublished = photos.every(p => p.is_published);
    document.getElementById('bulk-toggle').checked = allPublished;

    renderGrid(photos, grid);
}

function renderGrid(photos, container) {
    container.innerHTML = photos.map(p => {
        const isVid = p.media_type === 'video';
        const isYt = p.media_type === 'youtube';
        let thumb = p.file_url;

        // Optimized Thumbnails & Rotations
        if (isYt) {
            const ytId = getYoutubeId(p.file_url);
            thumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
        } else {
            const rot = p.rotation ? `a_${p.rotation}/` : '';
            thumb = p.file_url.replace('/upload/', `/upload/${rot}w_400,q_auto,f_auto/`);
        }

        return `
            <div class="photo-card ${p.is_published ? 'is-live' : 'is-draft'}">
                <div class="card-media" onclick="window.openLightbox('${p.media_type}', '${p.file_url}', '${p.id}', ${p.rotation || 0})">
                    ${isYt ? '<div class="badge-type yt">YT</div>' : (isVid ? '<div class="badge-type vid">VID</div>' : '')}
                    <img src="${thumb}" loading="lazy">
                    <div class="status-pill">${p.is_published ? 'LIVE' : 'DRAFT'}</div>
                </div>
                <div class="card-ctrl">
                    <button class="btn-icon touch-48" onclick="window.togglePublish('${p.id}', ${p.is_published})" title="Publish">
                        <i class="fa-solid ${p.is_published ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                    <button class="btn-icon del touch-48" onclick="window.deleteItem('${p.id}', '${p.public_id}')" title="Hapus">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 3. POWER TOOLS (ROTATE, BULK, DELETE)
// ==========================================

window.togglePublish = async (id, currentStatus) => {
    await supabase.from('gallery_contents').update({ is_published: !currentStatus }).eq('id', id);
    loadPhotos();
};

window.handleBulkPublish = async (isChecked) => {
    if (!confirm(`Ubah SEMUA dokumentasi di sesi ini menjadi ${isChecked ? 'LIVE (Terpublikasi)' : 'DRAFT (Tersembunyi)'}?`)) {
        document.getElementById('bulk-toggle').checked = !isChecked;
        return;
    }
    await supabase.from('gallery_contents').update({ is_published: isChecked }).eq('pertemuan_id', activeSessionId);
    loadPhotos();
};

window.rotateImage = async (id, currentRotation) => {
    const newRotation = (currentRotation + 90) % 360;
    await supabase.from('gallery_contents').update({ rotation: newRotation }).eq('id', id);
    
    // Update Lightbox Visual
    const img = document.getElementById('lb-img');
    const rot = newRotation ? `a_${newRotation}/` : '';
    img.src = img.src.split('/upload/')[0] + `/upload/${rot}` + img.src.split('/upload/')[1].replace(/a_\d+\//, '');
    
    // Simpan rotation baru ke tombol rotate agar bisa klik berulang
    document.getElementById('btn-lb-rotate').onclick = () => window.rotateImage(id, newRotation);
    loadPhotos();
};

window.deleteItem = async (id, publicId) => {
    if (!confirm("Hapus item ini secara permanen?")) return;
    
    if (context.user.role === 'super_admin') {
        // Hard Delete Logic would call Edge Function here to delete Cloudinary file
        await supabase.from('gallery_contents').delete().eq('id', id);
    } else {
        await supabase.from('gallery_contents').update({ is_deleted: true }).eq('id', id);
    }
    loadPhotos();
};

// ==========================================
// 4. UPLOAD LOGIC (HD & DYNAMIC ACCOUNTS)
// ==========================================

window.openUploadModal = (type) => {
    document.getElementById('modal-upload').style.display = 'flex';
    document.getElementById('form-file').style.display = type === 'file' ? 'block' : 'none';
    document.getElementById('form-yt').style.display = type === 'yt' ? 'block' : 'none';
};

window.executeUpload = async () => {
    const btn = document.getElementById('btn-save-upload');
    const status = document.getElementById('upload-status');
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        // 1. Ambil Akun Cloudinary Aktif
        const { data: acc } = await supabase.from('cloudinary_accounts').select('*').eq('is_active', true).single();
        if (!acc) throw new Error("Tidak ada akun Cloudinary yang aktif.");

        const isYt = document.getElementById('form-yt').style.display === 'block';

        if (isYt) {
            const url = document.getElementById('yt-url').value;
            const title = document.getElementById('yt-title').value;
            const vidId = getYoutubeId(url);
            if (!vidId) throw new Error("Link YouTube tidak valid.");

            await supabase.from('gallery_contents').insert({
                pertemuan_id: activeSessionId, class_id: context.activeClassId,
                file_url: `https://www.youtube.com/embed/${vidId}`,
                media_type: 'youtube', public_id: 'yt_' + vidId, caption: title
            });
        } else {
            const input = document.getElementById('file-input');
            const files = Array.from(input.files);
            if (!files.length) throw new Error("Pilih file terlebih dahulu.");

            const dateStr = document.getElementById('display-session-date').innerText;
            const folderPath = `galeri-${context.mode.toLowerCase()}/${sanitize(context.school)}/${sanitize(context.className)}/${sanitize(dateStr)}`;

            for (const file of files) {
                status.innerText = `Mengolah ${file.name}...`;
                const compressed = await compressImage(file);

                const { data: { session } } = await supabase.auth.getSession();
                const signRes = await fetch('https://aedtrwpomswdqxarvsrg.supabase.co/functions/v1/cloudinary-sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ action: 'get_signature', account_id: acc.id, params: { folder: folderPath } })
                });
                const signData = await signRes.json();

                const fd = new FormData();
                fd.append('file', compressed);
                fd.append('api_key', signData.api_key);
                fd.append('timestamp', signData.timestamp);
                fd.append('signature', signData.signature);
                fd.append('folder', folderPath);

                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${acc.cloud_name}/upload`, { method: 'POST', body: fd });
                const cloudData = await cloudRes.json();

                await supabase.from('gallery_contents').insert({
                    pertemuan_id: activeSessionId, class_id: context.activeClassId,
                    file_url: cloudData.secure_url, public_id: cloudData.public_id,
                    media_type: cloudData.resource_type, caption: file.name, cloudinary_account_id: acc.id
                });
            }
        }
        
        window.closeModal('modal-upload');
        loadPhotos();
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Simpan";
        status.innerText = "";
    }
};

// ==========================================
// 5. UI LAYOUT & STYLES (COMPACT TABLET)
// ==========================================

function renderMainLayout(canvas) {
    canvas.innerHTML = `
        <div class="gm-master-wrapper fade-in">
            <!-- HEADER -->
            <div class="gm-header">
                <div class="header-left">
                    <button class="btn-icon touch-48" onclick="window.history.back()"><i class="fa-solid fa-arrow-left"></i></button>
                    <div class="header-info">
                        <h1>Galeri ${context.mode === 'SCHOOL' ? 'Sekolah' : 'Private'}</h1>
                        <p>${context.className} | <span id="display-session-title">Pilih Sesi</span></p>
                    </div>
                </div>
                <div class="header-right" id="bulk-area" style="display:none;">
                    <div class="bulk-wrap">
                        <span>Publish Semua:</span>
                        <label class="switch">
                            <input type="checkbox" id="bulk-toggle" onchange="window.handleBulkPublish(this.checked)">
                            <span class="slider-toggle"></span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENT (HORIZONTAL SPLIT) -->
            <div class="gm-body">
                <div id="session-sidebar" class="gm-sidebar hide-scrollbar"></div>
                
                <div class="gm-main">
                    <div id="gallery-toolbar" class="gm-toolbar" style="display:none;">
                        <span id="display-session-date" class="sess-date-label"></span>
                        <div class="action-group">
                            <button class="btn-action blue touch-48" onclick="window.openUploadModal('file')">
                                <i class="fa-solid fa-cloud-arrow-up"></i> Upload
                            </button>
                            <button class="btn-action red touch-48" onclick="window.openUploadModal('yt')">
                                <i class="fa-brands fa-youtube"></i> YouTube
                            </button>
                        </div>
                    </div>
                    <div id="gallery-grid" class="gallery-grid">
                        <div class="empty-state">Pilih tanggal sesi di samping untuk melihat dokumentasi.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL UPLOAD -->
        <div id="modal-upload" class="modal-overlay">
            <div class="modal-card">
                <div class="modal-head">
                    <h3>Tambah Dokumentasi</h3>
                    <span class="close-modal touch-48" onclick="window.closeModal('modal-upload')">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="form-file">
                        <div class="drop-zone" onclick="document.getElementById('file-input').click()">
                            <i class="fa-solid fa-images"></i>
                            <p>Klik untuk pilih Foto/Video</p>
                            <input type="file" id="file-input" multiple accept="image/*,video/*" hidden onchange="document.getElementById('file-name-preview').innerText = this.files.length + ' file dipilih'">
                            <div id="file-name-preview" style="font-size:0.8rem; margin-top:10px; color:#3b82f6;"></div>
                        </div>
                    </div>
                    <div id="form-yt">
                        <input type="text" id="yt-url" class="input-flat" placeholder="Link YouTube">
                        <input type="text" id="yt-title" class="input-flat" placeholder="Judul Video">
                    </div>
                    <div id="upload-status" class="status-msg"></div>
                </div>
                <div class="modal-foot">
                    <button id="btn-save-upload" class="btn-submit touch-48" onclick="window.executeUpload()">Simpan</button>
                </div>
            </div>
        </div>

        <!-- LIGHTBOX -->
        <div id="lightbox" class="lightbox-overlay" onclick="window.closeModal('lightbox')">
            <span class="close-lb touch-48">&times;</span>
            <div class="lb-content" onclick="event.stopPropagation()">
                <img id="lb-img" style="display:none;">
                <div id="lb-vid" style="display:none; width:100%; height:100%;"></div>
                <div class="lb-tools">
                    <button id="btn-lb-rotate" class="btn-tool touch-48"><i class="fa-solid fa-rotate-right"></i> Putar</button>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 6. HELPERS (RESIZE, SANITIZE, ETC)
// ==========================================

function compressImage(file) {
    return new Promise((resolve) => {
        if (file.type.indexOf("image") === -1) return resolve(file);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
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
    });
}

window.openLightbox = (type, url, id, rotation) => {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lb-img');
    const vid = document.getElementById('lb-vid');
    const btnRot = document.getElementById('btn-lb-rotate');
    
    lb.style.display = 'flex';
    if (type === 'image') {
        const rotParam = rotation ? `a_${rotation}/` : '';
        img.src = url.replace('/upload/', `/upload/${rotParam}`);
        img.style.display = 'block'; vid.style.display = 'none';
        btnRot.style.display = 'block';
        btnRot.onclick = () => window.rotateImage(id, rotation);
    } else {
        img.style.display = 'none'; vid.style.display = 'block';
        btnRot.style.display = 'none';
        vid.innerHTML = type === 'youtube' ? `<iframe src="${url}" frameborder="0" allowfullscreen></iframe>` : `<video src="${url}" controls autoplay></video>`;
    }
};

window.closeModal = (id) => {
    document.getElementById(id).style.display = 'none';
    if(id === 'lightbox') document.getElementById('lb-vid').innerHTML = '';
};

function getYoutubeId(url) { const m = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/); return m && m[1].length==11 ? m[1] : null; }
function sanitize(s) { return s ? s.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'u'; }

function injectStyles() {
    if (document.getElementById('gm-master-css')) return;
    const s = document.createElement('style');
    s.id = 'gm-master-css';
    s.textContent = `
        .gm-master-wrapper { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; font-family: 'Poppins', sans-serif; overflow: hidden; }
        .gm-header { background: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
        .header-left { display: flex; align-items: center; gap: 15px; }
        .header-info h1 { margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: 800; }
        .header-info p { margin: 0; font-size: 0.8rem; color: #64748b; }
        
        .bulk-wrap { display: flex; align-items: center; gap: 10px; background: #eff6ff; padding: 5px 15px; border-radius: 30px; border: 1px solid #dbeafe; }
        .bulk-wrap span { font-size: 0.75rem; font-weight: 700; color: #1e40af; }
        
        .gm-body { display: flex; flex: 1; overflow: hidden; }
        .gm-sidebar { width: 220px; background: white; border-right: 1px solid #e2e8f0; overflow-y: auto; padding: 15px; }
        .sess-card { padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 10px; cursor: pointer; transition: 0.2s; }
        .sess-card:hover { border-color: #3b82f6; background: #fcfdff; }
        .sess-card.active { background: #3b82f6; color: white; border-color: #2563eb; }
        .sess-tgl { font-size: 0.7rem; font-weight: 800; opacity: 0.8; text-transform: uppercase; }
        .sess-title { margin: 3px 0 0; font-size: 0.85rem; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .gm-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .gm-toolbar { padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; background: #fcfdff; border-bottom: 1px solid #f1f5f9; }
        .sess-date-label { font-weight: 800; color: #475569; font-size: 0.9rem; }
        .action-group { display: flex; gap: 10px; }
        .btn-action { border: none; padding: 0 20px; border-radius: 12px; color: white; font-weight: 700; font-size: 0.85rem; }
        .btn-action.blue { background: #3b82f6; }
        .btn-action.red { background: #ef4444; }

        .gallery-grid { flex: 1; overflow-y: auto; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; align-content: start; }
        .photo-card { background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 2px solid transparent; }
        .photo-card.is-draft { opacity: 0.7; }
        .photo-card.is-live { border-color: #10b981; }
        .card-media { height: 140px; position: relative; background: #000; cursor: pointer; }
        .card-media img { width: 100%; height: 100%; object-fit: cover; }
        .badge-type { position: absolute; top: 10px; right: 10px; padding: 2px 8px; border-radius: 4px; font-size: 0.6rem; font-weight: 900; color: white; }
        .badge-type.yt { background: #ff0000; }
        .badge-type.vid { background: #3b82f6; }
        .status-pill { position: absolute; bottom: 10px; left: 10px; font-size: 0.6rem; font-weight: 900; background: rgba(0,0,0,0.6); color: white; padding: 2px 8px; border-radius: 4px; }
        .card-ctrl { padding: 8px; display: flex; justify-content: flex-end; gap: 5px; }
        .btn-icon { border: none; background: #f1f5f9; border-radius: 10px; color: #64748b; font-size: 1rem; }
        .btn-icon.del { color: #ef4444; background: #fef2f2; }

        /* MODALS & LIGHTBOX */
        .modal-overlay, .lightbox-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); display: none; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(4px); }
        .modal-card { background: white; width: 450px; border-radius: 20px; padding: 25px; box-shadow: 0 20px 25px rgba(0,0,0,0.2); }
        .modal-head { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .drop-zone { border: 3px dashed #e2e8f0; border-radius: 15px; padding: 30px; text-align: center; cursor: pointer; color: #64748b; }
        .input-flat { width: 100%; padding: 12px; border: 2px solid #f1f5f9; border-radius: 10px; margin-bottom: 10px; box-sizing: border-box; }
        .btn-submit { width: 100%; background: #10b981; color: white; border: none; border-radius: 12px; font-weight: 800; }

        .lb-content { max-width: 90%; max-height: 85vh; position: relative; }
        .lb-content img, .lb-content iframe, .lb-content video { max-width: 100%; max-height: 80vh; border-radius: 8px; }
        .lb-tools { margin-top: 15px; display: flex; justify-content: center; }
        .btn-tool { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 0 20px; border-radius: 30px; font-weight: 600; }
        .close-lb { position: absolute; top: 20px; right: 20px; color: white; font-size: 2.5rem; cursor: pointer; }

        .switch { position: relative; width: 34px; height: 18px; display: inline-block; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider-toggle { position: absolute; inset: 0; background: #cbd5e1; border-radius: 20px; transition: 0.3s; cursor: pointer; }
        .slider-toggle:before { content: ""; position: absolute; width: 12px; height: 12px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
        input:checked + .slider-toggle { background: #10b981; }
        input:checked + .slider-toggle:before { transform: translateX(16px); }

        @media (max-width: 850px) {
            .gm-sidebar { width: 150px; }
            .gallery-grid { grid-template-columns: repeat(2, 1fr); }
            .header-info p { font-size: 0.7rem; }
        }
    `;
    document.head.appendChild(s);
}