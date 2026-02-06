import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseUrl, supabaseKey } from '../assets/js/config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

let allAccounts = [];
let testAccountId = null;

// ==========================================
// BINDING GLOBAL
// ==========================================
window.editAccount = (id) => openEditModal(id);
window.deleteAccount = (id) => processDelete(id);
window.toggleActive = (id, status) => processToggleActive(id, status);
window.testConnection = (id) => openTestModal(id);
window.syncQuota = (id) => processSyncQuota(id);
window.handleTestFile = (input) => {
    if (input.files && input.files[0]) performSecureTest(input.files[0]);
};

export async function init(canvas) {
    injectStyles();

    canvas.innerHTML = `
        <div class="cm-container fade-in">
            <div class="cm-header shadow-soft">
                <div class="cm-header-content">
                    <div class="cm-icon"><i class="fa-solid fa-cloud"></i></div>
                    <div>
                        <h2 class="cm-title">Cloudinary Manager</h2>
                        <p class="cm-subtitle">Kelola Penyimpanan & Sinkronisasi Kuota</p>
                    </div>
                </div>
                <button id="btn-add-account" class="btn-primary-pill">
                    <i class="fa-solid fa-plus"></i> Akun Baru
                </button>
            </div>

            <div class="cm-stats-grid">
                <div class="stat-card">
                    <span class="stat-label">Total Akun</span>
                    <strong class="stat-value" id="stat-total">0</strong>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Status Utama</span>
                    <strong class="stat-value" id="stat-status">...</strong>
                </div>
            </div>

            <div id="account-list-container" class="cm-grid">
                <div style="padding:20px; text-align:center; grid-column:1/-1;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Memuat Data...
                </div>
            </div>
        </div>

        <div id="modal-account" class="cm-modal-overlay">
            <div class="cm-modal-card bounce-in">
                <div class="cm-modal-header">
                    <h3 id="modal-title">Konfigurasi Akun</h3>
                    <span class="cm-close" id="close-modal-acc">&times;</span>
                </div>
                <div class="cm-modal-body">
                    <form id="form-account" onsubmit="return false;">
                        <input type="hidden" id="acc-id">
                        <label>Display Name</label>
                        <input type="text" id="acc-name" class="input-modern" placeholder="Akun Utama" required>
                        <label>Cloud Name</label>
                        <input type="text" id="acc-cloud" class="input-modern" placeholder="dx8..." required>
                        <div class="form-row">
                            <div class="flex-1">
                                <label>API Key</label>
                                <input type="text" id="acc-key" class="input-modern" required>
                            </div>
                            <div class="flex-1">
                                <label>API Secret</label>
                                <input type="password" id="acc-secret" class="input-modern" required>
                            </div>
                        </div>
                        <label>Upload Preset (Optional)</label>
                        <input type="text" id="acc-preset" class="input-modern">
                        <div class="form-row" style="align-items: center; margin-top:10px;">
                            <div class="flex-1">
                                <label>Limit (GB)</label>
                                <input type="number" id="acc-limit" class="input-modern" value="10">
                            </div>
                            <div class="flex-1">
                                <label class="switch-container">
                                    <input type="checkbox" id="acc-active">
                                    <span class="slider"></span> Aktifkan
                                </label>
                            </div>
                        </div>
                        <button type="button" id="btn-save-acc" class="btn-save-full">Simpan Konfigurasi</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="modal-test" class="cm-modal-overlay">
            <div class="cm-modal-card bounce-in" style="max-width:400px;">
                <div class="cm-modal-header">
                    <h3>Secure Test Connection</h3>
                    <span class="cm-close" id="close-modal-test">&times;</span>
                </div>
                <div class="cm-modal-body" style="text-align:center;">
                    <input type="file" id="test-file-input" style="display:none;" accept="image/*" onchange="window.handleTestFile(this)">
                    <div id="test-dropzone" class="test-zone">
                        <div id="test-ui-idle">
                            <i class="fa-solid fa-upload" style="font-size:2rem; color:#0ea5e9;"></i>
                            <p>Klik untuk upload file percobaan</p>
                        </div>
                        <div id="test-ui-loading" style="display:none;">
                            <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; color:#0ea5e9;"></i>
                            <p id="test-progress-text">Menghubungi Server...</p>
                        </div>
                    </div>
                    <div id="test-result-area" style="margin-top:15px; display:none;"></div>
                </div>
            </div>
        </div>
    `;

    bindEvents();
    await loadAccounts();
}

async function loadAccounts() {
    try {
        const { data, error } = await supabase
            .from('cloudinary_accounts')
            .select('*')
            .order('is_active', { ascending: false });
        if (error) throw error;
        allAccounts = data || [];
        renderList();
        updateStats();
    } catch (e) { console.error("Gagal load:", e.message); }
}

function renderList() {
    const container = document.getElementById('account-list-container');
    if (!container) return;
    if (allAccounts.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">Belum ada akun.</div>`;
        return;
    }
    container.innerHTML = allAccounts.map(acc => {
        const usage = acc.current_usage_gb || 0;
        const limit = acc.usage_limit_gb || 10;
        const percent = Math.min((usage / limit) * 100, 100);
        return `
            <div class="acc-card ${acc.is_active ? 'active' : ''}">
                <div class="acc-card-header">
                    <strong>${acc.display_name}</strong>
                    <code>${acc.cloud_name}</code>
                </div>
                <div class="usage-box">
                    <div class="usage-label">
                        <span>Penyimpanan</span>
                        <button class="btn-sync-text" onclick="window.syncQuota('${acc.id}')">
                            <i class="fa-solid fa-arrows-rotate"></i> Sync
                        </button>
                    </div>
                    <div class="usage-bar-bg">
                        <div class="usage-bar-fill" style="width:${percent}%"></div>
                    </div>
                    <div class="usage-meta">
                        <span>${usage} GB / ${limit} GB</span>
                    </div>
                </div>
                <div class="acc-actions">
                    <button class="btn-small" onclick="window.testConnection('${acc.id}')">Tes</button>
                    <button class="btn-small" onclick="window.editAccount('${acc.id}')">Edit</button>
                    <button class="btn-small" onclick="window.deleteAccount('${acc.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

async function processSyncQuota(id) {
    const btn = document.querySelector(`button[onclick="window.syncQuota('${id}')"]`);
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
        const { data, error } = await supabase.functions.invoke('cloudinary-sign', {
            body: { account_id: id, action: 'sync_quota' }
        });
        if (error) throw error;
        alert("Berhasil! Penggunaan saat ini: " + data.usage_gb + " GB");
        await loadAccounts();
    } catch (e) { alert("Sync Gagal: " + e.message); }
    finally { btn.innerHTML = original; }
}

async function performSecureTest(file) {
    const acc = allAccounts.find(a => a.id === testAccountId);
    const uiIdle = document.getElementById('test-ui-idle');
    const uiLoading = document.getElementById('test-ui-loading');
    const resultArea = document.getElementById('test-result-area');

    uiIdle.style.display = 'none';
    uiLoading.style.display = 'block';
    resultArea.style.display = 'none';

    try {
        const { data, error } = await supabase.functions.invoke('cloudinary-sign', {
            body: { 
                account_id: acc.id, 
                action: 'get_signature', 
                params: { folder: 'test_robotik' } 
            }
        });

        if (error) {
            const errBody = await error.context.json().catch(() => ({ error: error.message }));
            throw new Error(errBody.error || "Server Error");
        }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('api_key', data.api_key);
        fd.append('timestamp', data.timestamp);
        fd.append('signature', data.signature);
        fd.append('folder', 'test_robotik');

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${data.cloud_name}/image/upload`, {
            method: 'POST', body: fd
        });
        const cloudData = await cloudRes.json();
        if (cloudData.error) throw new Error(cloudData.error.message);

        resultArea.style.display = 'block';
        resultArea.innerHTML = `<div class="alert-success">✅ Berhasil Terhubung!</div>`;
    } catch (e) {
        resultArea.style.display = 'block';
        resultArea.innerHTML = `<div class="alert-danger">❌ Gagal: ${e.message}</div>`;
    } finally {
        uiLoading.style.display = 'none';
        uiIdle.style.display = 'block';
    }
}

function bindEvents() {
    document.getElementById('btn-add-account').onclick = () => {
        document.getElementById('form-account').reset();
        document.getElementById('acc-id').value = '';
        toggleModal('modal-account', true);
    };
    document.getElementById('btn-save-acc').onclick = saveAccount;
    document.getElementById('close-modal-acc').onclick = () => toggleModal('modal-account', false);
    document.getElementById('close-modal-test').onclick = () => toggleModal('modal-test', false);
    
    const dropzone = document.getElementById('test-dropzone');
    if (dropzone) dropzone.onclick = () => document.getElementById('test-file-input').click();
}

async function saveAccount() {
    const id = document.getElementById('acc-id').value;
    const payload = {
        display_name: document.getElementById('acc-name').value,
        cloud_name: document.getElementById('acc-cloud').value,
        api_key: document.getElementById('acc-key').value,
        api_secret: document.getElementById('acc-secret').value,
        upload_preset: document.getElementById('acc-preset').value,
        usage_limit_gb: document.getElementById('acc-limit').value,
        is_active: document.getElementById('acc-active').checked
    };
    if (payload.is_active) await supabase.from('cloudinary_accounts').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (id) await supabase.from('cloudinary_accounts').update(payload).eq('id', id);
    else await supabase.from('cloudinary_accounts').insert(payload);
    toggleModal('modal-account', false);
    await loadAccounts();
}

async function processDelete(id) {
    if (confirm("Hapus akun ini?")) { await supabase.from('cloudinary_accounts').delete().eq('id', id); await loadAccounts(); }
}

async function processToggleActive(id, status) {
    if (status) await supabase.from('cloudinary_accounts').update({ is_active: false }).neq('id', id);
    await supabase.from('cloudinary_accounts').update({ is_active: status }).eq('id', id);
    await loadAccounts();
}

function openEditModal(id) {
    if (!id) return;
    const a = allAccounts.find(x => x.id === id);
    document.getElementById('acc-id').value = a.id;
    document.getElementById('acc-name').value = a.display_name;
    document.getElementById('acc-cloud').value = a.cloud_name;
    document.getElementById('acc-key').value = a.api_key;
    document.getElementById('acc-secret').value = a.api_secret;
    document.getElementById('acc-preset').value = a.upload_preset || '';
    document.getElementById('acc-limit').value = a.usage_limit_gb;
    document.getElementById('acc-active').checked = a.is_active;
    toggleModal('modal-account', true);
}

function openTestModal(id) {
    testAccountId = id;
    document.getElementById('test-result-area').style.display = 'none';
    toggleModal('modal-test', true);
}

function toggleModal(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
}

function updateStats() {
    document.getElementById('stat-total').innerText = allAccounts.length;
    const active = allAccounts.find(a => a.is_active);
    document.getElementById('stat-status').innerHTML = active ? `<span style="color:#10b981;">Aktif (${active.cloud_name})</span>` : 'Tidak Aktif';
}

function injectStyles() {
    if (document.getElementById('cm-styles')) return;
    const s = document.createElement('style');
    s.id = 'cm-styles';
    s.textContent = `
        .cm-container { padding: 20px; font-family: 'Poppins', sans-serif; background: #f8fafc; min-height: 100vh; }
        .cm-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 20px; border-radius: 15px; margin-bottom: 25px; border-left: 5px solid #0ea5e9; }
        .cm-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
        .stat-card { background: white; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .cm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .acc-card { background: white; padding: 20px; border-radius: 15px; border: 1px solid #e2e8f0; position: relative; }
        .active { border-color: #10b981; }
        .usage-bar-bg { background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin: 10px 0; }
        .usage-bar-fill { height: 100%; background: #0ea5e9; transition: 0.3s; }
        .usage-label { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; }
        .usage-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; }
        .cm-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 9999; }
        .cm-modal-card { background: white; border-radius: 20px; width: 95%; max-width: 500px; overflow: hidden; }
        .cm-modal-header { padding: 15px 20px; background: #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .cm-modal-body { padding: 20px; }
        .input-modern { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; }
        .btn-primary-pill { background: #0ea5e9; color: white; border: none; padding: 10px 20px; border-radius: 50px; cursor: pointer; }
        .btn-save-full { width: 100%; background: #10b981; color: white; padding: 12px; border: none; border-radius: 10px; cursor: pointer; }
        .acc-actions { display: flex; gap: 5px; margin-top: 15px; }
        .btn-small { flex: 1; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; cursor: pointer; }
        .test-zone { border: 2px dashed #cbd5e1; padding: 30px; border-radius: 15px; cursor: pointer; text-align: center; }
        .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 10px; border-radius: 8px; }
        .alert-danger { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px; border-radius: 8px; }
        .cm-close { cursor: pointer; font-size: 1.5rem; }
    `;
    document.head.appendChild(s);
}