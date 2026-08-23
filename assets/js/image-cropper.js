/**
 * Universal 3:4 Touch & Desktop Image Cropper with Cloudinary Direct Upload
 * Optimized for Huawei T10s, Mobile, and Desktop Browsers.
 */

import { cloudinaryConfig } from './config.js';

class ImageCropperModal {
    constructor() {
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.scale = 1;
        this.minScale = 0.2;
        this.maxScale = 5;
        this.posX = 0;
        this.posY = 0;
        this.rotation = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.targetAspect = 3 / 4; // 3:4 aspect ratio
        this.onSuccessCallback = null;
        this.currentFolder = 'robotic_school';
        
        // Touch pinch variables
        this.initialDistance = null;
        this.initialScale = 1;

        this.initDOM();
    }

    initDOM() {
        if (document.getElementById('universal-cropper-modal')) {
            this.modal = document.getElementById('universal-cropper-modal');
            return;
        }

        const modalDiv = document.createElement('div');
        modalDiv.id = 'universal-cropper-modal';
        modalDiv.className = 'ucm-overlay';
        modalDiv.innerHTML = `
            <div class="ucm-dialog">
                <div class="ucm-header">
                    <div class="ucm-title-block">
                        <i class="fas fa-crop-simple"></i>
                        <span>Sesuaikan & Potong Foto (3:4)</span>
                    </div>
                    <button type="button" class="ucm-btn-close" id="ucm-close-btn">&times;</button>
                </div>
                
                <div class="ucm-body">
                    <div class="ucm-viewport-container" id="ucm-viewport-container">
                        <canvas id="ucm-canvas"></canvas>
                        <div class="ucm-crop-guide">
                            <div class="ucm-grid-line ucm-grid-h1"></div>
                            <div class="ucm-grid-line ucm-grid-h2"></div>
                            <div class="ucm-grid-line ucm-grid-v1"></div>
                            <div class="ucm-grid-line ucm-grid-v2"></div>
                            <span class="ucm-ratio-badge">3 : 4</span>
                        </div>
                    </div>

                    <div class="ucm-hint">
                        <i class="fas fa-hand-pointer"></i> Geser & cubit/geser slider untuk mengatur posisi & zoom foto
                    </div>

                    <div class="ucm-controls">
                        <div class="ucm-zoom-row">
                            <button type="button" class="ucm-ctrl-btn" id="ucm-zoom-out" title="Perkecil">
                                <i class="fas fa-magnifying-glass-minus"></i>
                            </button>
                            <input type="range" id="ucm-zoom-slider" min="0.2" max="3" step="0.01" value="1">
                            <button type="button" class="ucm-ctrl-btn" id="ucm-zoom-in" title="Perbesar">
                                <i class="fas fa-magnifying-glass-plus"></i>
                            </button>
                        </div>

                        <div class="ucm-action-row">
                            <button type="button" class="ucm-tool-btn" id="ucm-rotate-btn">
                                <i class="fas fa-rotate-right"></i> Putar 90°
                            </button>
                            <button type="button" class="ucm-tool-btn" id="ucm-fit-btn">
                                <i class="fas fa-expand"></i> Pas-kan
                            </button>
                        </div>
                    </div>
                </div>

                <div class="ucm-footer">
                    <button type="button" class="ucm-btn-cancel" id="ucm-cancel-btn">Batal</button>
                    <button type="button" class="ucm-btn-save" id="ucm-save-btn">
                        <i class="fas fa-cloud-arrow-up"></i>
                        <span id="ucm-save-text">Potong & Simpan Foto</span>
                    </button>
                </div>
            </div>
            
            <input type="file" id="ucm-file-input" accept="image/*" style="display:none;">
        `;

        document.body.appendChild(modalDiv);
        this.modal = modalDiv;

        this.injectStyles();
        this.bindEvents();
    }

    injectStyles() {
        const styleId = 'universal-cropper-css';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .ucm-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(10, 15, 29, 0.85); z-index: 99999;
                display: none; align-items: center; justify-content: center;
                backdrop-filter: blur(5px); padding: 15px; box-sizing: border-box;
                font-family: 'Poppins', sans-serif;
            }
            .ucm-overlay.active { display: flex; animation: ucmFadeIn 0.25s ease-out; }
            
            .ucm-dialog {
                background: #1e293b; width: 100%; max-width: 480px;
                border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                display: flex; flex-direction: column; overflow: hidden;
                border: 1px solid #334155; animation: ucmScaleUp 0.25s ease-out;
            }
            
            .ucm-header {
                padding: 16px 20px; background: #0f172a; border-bottom: 1px solid #334155;
                display: flex; justify-content: space-between; align-items: center; color: white;
            }
            .ucm-title-block { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.05rem; }
            .ucm-title-block i { color: #f59e0b; }
            .ucm-btn-close { background: none; border: none; font-size: 1.8rem; color: #94a3b8; cursor: pointer; line-height: 1; }
            .ucm-btn-close:hover { color: #f87171; }
            
            .ucm-body { padding: 18px 20px; display: flex; flex-direction: column; align-items: center; }
            
            /* Viewport with fixed 3:4 Aspect Frame */
            .ucm-viewport-container {
                width: 270px; height: 360px; /* 3:4 exact ratio */
                background: #090d16; border-radius: 12px;
                position: relative; overflow: hidden;
                box-shadow: 0 0 0 2px #475569, 0 10px 25px rgba(0,0,0,0.5);
                touch-action: none; user-select: none; cursor: grab;
            }
            .ucm-viewport-container:active { cursor: grabbing; }
            
            #ucm-canvas { width: 100%; height: 100%; display: block; }
            
            .ucm-crop-guide {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; border: 2px dashed rgba(255, 255, 255, 0.7);
                box-sizing: border-box;
            }
            .ucm-grid-line { position: absolute; background: rgba(255,255,255,0.25); }
            .ucm-grid-h1 { top: 33.33%; left: 0; width: 100%; height: 1px; }
            .ucm-grid-h2 { top: 66.66%; left: 0; width: 100%; height: 1px; }
            .ucm-grid-v1 { left: 33.33%; top: 0; width: 1px; height: 100%; }
            .ucm-grid-v2 { left: 66.66%; top: 0; width: 1px; height: 100%; }
            
            .ucm-ratio-badge {
                position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6);
                color: #fbbf24; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem;
                font-weight: 700; letter-spacing: 0.5px; border: 1px solid rgba(251, 191, 36, 0.3);
            }
            
            .ucm-hint { color: #94a3b8; font-size: 0.78rem; margin: 12px 0 10px; text-align: center; }
            .ucm-hint i { color: #38bdf8; margin-right: 4px; }
            
            .ucm-controls { width: 100%; display: flex; flex-direction: column; gap: 10px; }
            .ucm-zoom-row { display: flex; align-items: center; gap: 12px; width: 100%; }
            .ucm-ctrl-btn {
                background: #334155; border: none; color: white; width: 36px; height: 36px;
                border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                font-size: 0.95rem; transition: 0.2s;
            }
            .ucm-ctrl-btn:hover { background: #475569; }
            
            #ucm-zoom-slider {
                flex: 1; -webkit-appearance: none; appearance: none; height: 6px;
                background: #475569; border-radius: 4px; outline: none;
            }
            #ucm-zoom-slider::-webkit-slider-thumb {
                -webkit-appearance: none; appearance: none; width: 20px; height: 20px;
                border-radius: 50%; background: #f59e0b; cursor: pointer; border: 2px solid white;
            }
            
            .ucm-action-row { display: flex; gap: 10px; justify-content: center; }
            .ucm-tool-btn {
                background: #334155; border: 1px solid #475569; color: #e2e8f0;
                padding: 7px 16px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;
                cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s;
            }
            .ucm-tool-btn:hover { background: #475569; color: white; }
            
            .ucm-footer {
                padding: 14px 20px; background: #0f172a; border-top: 1px solid #334155;
                display: flex; gap: 12px; justify-content: flex-end;
            }
            .ucm-btn-cancel {
                padding: 10px 18px; background: #334155; color: #cbd5e1; border: none;
                border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.9rem;
            }
            .ucm-btn-cancel:hover { background: #475569; color: white; }
            
            .ucm-btn-save {
                flex: 1; padding: 12px 20px; background: #f59e0b; color: white; border: none;
                border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.95rem;
                display: flex; align-items: center; justify-content: center; gap: 8px;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); transition: 0.2s;
            }
            .ucm-btn-save:hover { background: #d97706; }
            .ucm-btn-save:disabled { background: #64748b; cursor: not-allowed; box-shadow: none; }
            
            @keyframes ucmFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ucmScaleUp { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }

            @media (max-height: 700px) {
                .ucm-viewport-container { width: 225px; height: 300px; }
                .ucm-body { padding: 10px 15px; }
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        const fileInput = document.getElementById('ucm-file-input');
        const closeBtn = document.getElementById('ucm-close-btn');
        const cancelBtn = document.getElementById('ucm-cancel-btn');
        const saveBtn = document.getElementById('ucm-save-btn');
        const zoomSlider = document.getElementById('ucm-zoom-slider');
        const zoomIn = document.getElementById('ucm-zoom-in');
        const zoomOut = document.getElementById('ucm-zoom-out');
        const rotateBtn = document.getElementById('ucm-rotate-btn');
        const fitBtn = document.getElementById('ucm-fit-btn');
        const viewport = document.getElementById('ucm-viewport-container');

        this.canvas = document.getElementById('ucm-canvas');
        this.ctx = this.canvas.getContext('2d');

        closeBtn.onclick = () => this.close();
        cancelBtn.onclick = () => this.close();

        fileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                this.loadImageFile(e.target.files[0]);
                fileInput.value = '';
            }
        };

        // Zoom Controls
        zoomSlider.oninput = (e) => {
            this.scale = parseFloat(e.target.value);
            this.draw();
        };

        zoomIn.onclick = () => {
            this.scale = Math.min(this.maxScale, this.scale + 0.15);
            zoomSlider.value = this.scale;
            this.draw();
        };

        zoomOut.onclick = () => {
            this.scale = Math.max(this.minScale, this.scale - 0.15);
            zoomSlider.value = this.scale;
            this.draw();
        };

        rotateBtn.onclick = () => {
            this.rotation = (this.rotation + 90) % 360;
            this.draw();
        };

        fitBtn.onclick = () => {
            this.fitToViewport();
        };

        // Mouse Drag
        viewport.onmousedown = (e) => {
            this.isDragging = true;
            this.startX = e.clientX - this.posX;
            this.startY = e.clientY - this.posY;
        };

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.posX = e.clientX - this.startX;
            this.posY = e.clientY - this.startY;
            this.draw();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Touch Drag & Pinch Zoom
        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.startX = e.touches[0].clientX - this.posX;
                this.startY = e.touches[0].clientY - this.posY;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                this.initialDistance = this.getDistance(e.touches);
                this.initialScale = this.scale;
            }
        }, { passive: false });

        viewport.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isDragging) {
                this.posX = e.touches[0].clientX - this.startX;
                this.posY = e.touches[0].clientY - this.startY;
                this.draw();
            } else if (e.touches.length === 2 && this.initialDistance) {
                const currentDistance = this.getDistance(e.touches);
                const ratio = currentDistance / this.initialDistance;
                this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.initialScale * ratio));
                zoomSlider.value = this.scale;
                this.draw();
            }
        }, { passive: false });

        viewport.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.isDragging = false;
                this.initialDistance = null;
            }
        });

        // Save & Upload Button
        saveBtn.onclick = () => this.processAndUpload();
    }

    getDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    open(folderName = 'robotic_school', callback) {
        this.currentFolder = folderName;
        this.onSuccessCallback = callback;
        const fileInput = document.getElementById('ucm-file-input');
        fileInput.click();
    }

    loadImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.rotation = 0;
                this.modal.classList.add('active');
                
                // Initialize canvas internal resolution
                const rect = document.getElementById('ucm-viewport-container').getBoundingClientRect();
                this.canvas.width = rect.width || 270;
                this.canvas.height = rect.height || 360;

                this.fitToViewport();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    fitToViewport() {
        if (!this.image) return;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const isSideways = this.rotation === 90 || this.rotation === 270;
        const iw = isSideways ? this.image.height : this.image.width;
        const ih = isSideways ? this.image.width : this.image.height;

        // Cover fit
        const scaleX = cw / iw;
        const scaleY = ch / ih;
        this.scale = Math.max(scaleX, scaleY);
        
        const slider = document.getElementById('ucm-zoom-slider');
        if (slider) {
            slider.min = (Math.min(scaleX, scaleY) * 0.5).toFixed(2);
            slider.max = (Math.max(scaleX, scaleY) * 3).toFixed(2);
            slider.value = this.scale;
        }

        this.posX = cw / 2;
        this.posY = ch / 2;
        this.draw();
    }

    draw() {
        if (!this.image || !this.ctx) return;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        this.ctx.clearRect(0, 0, cw, ch);
        this.ctx.save();

        this.ctx.translate(this.posX, this.posY);
        this.ctx.rotate((this.rotation * Math.PI) / 180);
        this.ctx.scale(this.scale, this.scale);

        this.ctx.drawImage(
            this.image,
            -this.image.width / 2,
            -this.image.height / 2
        );

        this.ctx.restore();
    }

    close() {
        this.modal.classList.remove('active');
        this.image = null;
        const saveBtn = document.getElementById('ucm-save-btn');
        const saveText = document.getElementById('ucm-save-text');
        saveBtn.disabled = false;
        saveText.innerText = 'Potong & Simpan Foto';
    }

    async processAndUpload() {
        const saveBtn = document.getElementById('ucm-save-btn');
        const saveText = document.getElementById('ucm-save-text');
        saveBtn.disabled = true;
        saveText.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Mengompres & Mengupload...';

        try {
            // Render high-res 3:4 crop to export canvas (600 x 800)
            const exportWidth = 600;
            const exportHeight = 800;
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = exportWidth;
            exportCanvas.height = exportHeight;
            const expCtx = exportCanvas.getContext('2d');

            const viewWidth = this.canvas.width;
            const viewHeight = this.canvas.height;
            const exportRatio = exportWidth / viewWidth;

            expCtx.fillStyle = '#ffffff';
            expCtx.fillRect(0, 0, exportWidth, exportHeight);

            expCtx.save();
            expCtx.translate(this.posX * exportRatio, this.posY * exportRatio);
            expCtx.rotate((this.rotation * Math.PI) / 180);
            expCtx.scale(this.scale * exportRatio, this.scale * exportRatio);

            expCtx.drawImage(
                this.image,
                -this.image.width / 2,
                -this.image.height / 2
            );
            expCtx.restore();

            // Export to JPEG Blob
            const blob = await new Promise((resolve) => {
                exportCanvas.toBlob(resolve, 'image/jpeg', 0.85);
            });

            if (!blob) throw new Error('Gagal menghasilkan gambar hasil crop.');

            // Direct Cloudinary Upload via FormData
            const formData = new FormData();
            formData.append('file', blob, `crop_${Date.now()}.jpg`);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);
            formData.append('folder', this.currentFolder);

            const uploadRes = await fetch(cloudinaryConfig.uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Upload Cloudinary gagal (${uploadRes.status})`);
            }

            const resData = await uploadRes.json();
            const secureUrl = resData.secure_url;

            if (this.onSuccessCallback) {
                this.onSuccessCallback(secureUrl);
            }

            this.close();

        } catch (err) {
            console.error('Crop/Upload Error:', err);
            alert('Gagal mengupload foto: ' + err.message);
            saveBtn.disabled = false;
            saveText.innerText = 'Coba Lagi';
        }
    }
}

// Singleton instance
const cropperInstance = new ImageCropperModal();

/**
 * Public function to open touch-friendly 3:4 cropper
 * @param {string} folderName - Cloudinary folder (e.g. 'robotic_school', 'robotic_private')
 * @param {function} callback - Receives uploaded secure URL
 */
export function openImageCropper(folderName, callback) {
    cropperInstance.open(folderName, callback);
}
