/**
 * Web PhotoBooth - Camera Module
 * Handles getUserMedia, countdown, and photo capture
 */

class PhotoBoothCamera {
    constructor() {
        this.video = document.getElementById('camera-video');
        this.canvas = document.getElementById('process-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.isCapturing = false;
        
        // Configuration
        this.config = {
            photoCount: 4,
            countdownSeconds: 3,
            quality: 0.9,
            width: 1280,
            height: 720
        };
        
        this.photos = [];
    }
    
    /**
     * Initialize camera access
     */
    async init() {
        try {
            // Check browser support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Browser tidak mendukung akses kamera');
            }
            
            // Get camera stream
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: this.config.width },
                    height: { ideal: this.config.height }
                },
                audio: false
            });
            
            // Set video source
            this.video.srcObject = this.stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            
            console.log('✅ Kamera berhasil diinisialisasi');
            return true;
            
        } catch (error) {
            console.error('❌ Error kamera:', error);
            this.showError(error.message);
            return false;
        }
    }
    
    /**
     * Start photo capture sequence
     */
    async startCapture() {
        if (this.isCapturing) return;
        
        this.isCapturing = true;
        this.photos = [];
        
        const captureBtn = document.getElementById('capture-btn');
        captureBtn.disabled = true;
        
        // Capture multiple photos
        for (let i = 0; i < this.config.photoCount; i++) {
            await this.countdownAndCapture(i + 1);
            
            // Delay between photos (except last one)
            if (i < this.config.photoCount - 1) {
                await this.sleep(1500);
            }
        }
        
        // Save to localStorage
        this.savePhotos();
        
        // Redirect to result page
        window.location.href = 'result.html';
    }
    
    /**
     * Countdown then capture
     */
    async countdownAndCapture(photoNumber) {
        const countdownEl = document.getElementById('countdown');
        const counterEl = document.getElementById('current-count');
        
        // Update counter display
        counterEl.textContent = photoNumber;
        
        // Countdown 3, 2, 1
        for (let i = this.config.countdownSeconds; i > 0; i--) {
            countdownEl.textContent = i;
            countdownEl.classList.remove('hidden');
            countdownEl.classList.add('pulse');
            
            // Play beep sound (optional)
            this.playBeep();
            
            await this.sleep(1000);
        }
        
        // Hide countdown
        countdownEl.classList.add('hidden');
        countdownEl.classList.remove('pulse');
        
        // Capture photo
        this.captureFrame(photoNumber);
    }
    
    /**
     * Capture single frame
     */
    captureFrame(photoNumber) {
        // Flash effect
        this.triggerFlash();
        
        // Set canvas size to match video
        this.canvas.width = this.video.videoWidth || 1280;
        this.canvas.height = this.video.videoHeight || 720;
        
        // Draw video frame to canvas
        this.ctx.drawImage(this.video, 0, 0);
        
        // Convert to JPEG
        const photoData = this.canvas.toDataURL('image/jpeg', this.config.quality);
        
        // Add to photos array
        this.photos.push({
            id: Date.now() + photoNumber,
            data: photoData,
            timestamp: new Date().toISOString()
        });
        
        // Update preview strip
        this.addToPreviewStrip(photoData);
        
        console.log(`📸 Foto ${photoNumber} berhasil diambil`);
    }
    
    /**
     * Flash animation
     */
    triggerFlash() {
        const flash = document.getElementById('flash-overlay');
        flash.style.opacity = '1';
        
        setTimeout(() => {
            flash.style.opacity = '0';
        }, 150);
    }
    
    /**
     * Add thumbnail to preview strip
     */
    addToPreviewStrip(photoData) {
        const strip = document.getElementById('preview-strip');
        
        const img = document.createElement('img');
        img.src = photoData;
        img.alt = `Foto ${this.photos.length}`;
        
        // Add animation
        img.style.animation = 'slideIn 0.3s ease';
        
        strip.appendChild(img);
        
        // Scroll to latest
        strip.scrollLeft = strip.scrollWidth;
    }
    
    /**
     * Save photos to localStorage
     */
    savePhotos() {
        try {
            const sessionData = {
                sessionId: 'session_' + Date.now(),
                photos: this.photos,
                createdAt: new Date().toISOString(),
                template: localStorage.getItem('selectedTemplate') || 'classic'
            };
            
            localStorage.setItem('photobooth_session', JSON.stringify(sessionData));
            
            // Also save to history
            let history = JSON.parse(localStorage.getItem('photobooth_history') || '[]');
            history.push(sessionData);
            
            // Keep only last 10 sessions
            if (history.length > 10) {
                history = history.slice(-10);
            }
            
            localStorage.setItem('photobooth_history', JSON.stringify(history));
            
        } catch (error) {
            console.error('Error saving photos:', error);
            alert('Gagal menyimpan foto. Penyimpanan penuh?');
        }
    }
    
    /**
     * Play beep sound
     */
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            
        } catch (e) {
            // Silent fail if audio not supported
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'camera-error';
        errorDiv.innerHTML = `
            <div class="error-box">
                <h3>⚠️ Error Kamera</h3>
                <p>${message}</p>
                <button onclick="location.reload()">Coba Lagi</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
    
    /**
     * Stop camera stream
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
    
    /**
     * Utility: Sleep/delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const camera = new PhotoBoothCamera();
    
    // Initialize camera
    camera.init().then(success => {
        if (success) {
            // Setup capture button
            const captureBtn = document.getElementById('capture-btn');
            if (captureBtn) {
                captureBtn.addEventListener('click', () => {
                    camera.startCapture();
                });
            }
        }
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        camera.stop();
    });
});
