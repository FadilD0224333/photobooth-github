/**
 * Web PhotoBooth - Composer Module
 * Handles photo composition with Fabric.js
 */

class PhotoComposer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.sessionData = null;
        this.template = null;
    }
    
    /**
     * Initialize composer
     */
    async init() {
        // Load session data
        const sessionJson = localStorage.getItem('photobooth_session');
        if (!sessionJson) {
            alert('Tidak ada data foto. Silakan foto ulang.');
            window.location.href = 'index.html';
            return false;
        }
        
        this.sessionData = JSON.parse(sessionJson);
        
        // Initialize Fabric canvas
        this.canvas = new fabric.Canvas(this.canvasId, {
            backgroundColor: '#ffffff',
            selection: false,
            preserveObjectStacking: true
        });
        
        // Set canvas size based on template
        this.setupCanvasSize();
        
        return true;
    }
    
    /**
     * Setup canvas dimensions
     */
    setupCanvasSize() {
        const template = this.sessionData.template || 'classic';
        const sizes = {
            classic: { width: 600, height: 1800 },  // Vertical strip
            square: { width: 1200, height: 1200 },   // Square grid
            polaroid: { width: 800, height: 1600 }   // Polaroid style
        };
        
        const size = sizes[template] || sizes.classic;
        this.canvas.setWidth(size.width);
        this.canvas.setHeight(size.height);
        
        this.template = template;
    }
    
    /**
     * Create photo strip composition
     */
    async compose() {
        const photos = this.sessionData.photos;
        
        // Add background/frame
        await this.addBackground();
        
        // Add photos based on template
        switch (this.template) {
            case 'square':
                await this.createSquareGrid(photos);
                break;
            case 'polaroid':
                await this.createPolaroid(photos);
                break;
            case 'classic':
            default:
                await this.createVerticalStrip(photos);
                break;
        }
        
        // Add text overlays
        this.addTextOverlays();
        
        // Render
        this.canvas.renderAll();
        
        return this.canvas.toDataURL({
            format: 'jpeg',
            quality: 0.95
        });
    }
    
    /**
     * Create vertical strip layout
     */
    async createVerticalStrip(photos) {
        const margin = 30;
        const headerHeight = 100;
        const footerHeight = 150;
        const availableHeight = this.canvas.height - headerHeight - footerHeight - (margin * 2);
        const photoHeight = (availableHeight - (margin * (photos.length - 1))) / photos.length;
        const photoWidth = this.canvas.width - (margin * 2);
        
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            const top = headerHeight + margin + (i * (photoHeight + margin));
            
            await this.addPhotoToCanvas(photo.data, {
                left: margin,
                top: top,
                width: photoWidth,
                height: photoHeight,
                borderRadius: 10
            });
        }
    }
    
    /**
     * Create square grid layout (2x2)
     */
    async createSquareGrid(photos) {
        const margin = 40;
        const headerHeight = 120;
        const gridSize = 2;
        const cellWidth = (this.canvas.width - (margin * 3)) / gridSize;
        const cellHeight = (this.canvas.height - headerHeight - (margin * 3)) / gridSize;
        
        for (let i = 0; i < photos.length && i < 4; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            
            const left = margin + (col * (cellWidth + margin));
            const top = headerHeight + margin + (row * (cellHeight + margin));
            
            await this.addPhotoToCanvas(photos[i].data, {
                left: left,
                top: top,
                width: cellWidth,
                height: cellHeight,
                borderRadius: 15
            });
        }
    }
    
    /**
     * Create polaroid style layout
     */
    async createPolaroid(photos) {
        const margin = 40;
        const polaroidWidth = this.canvas.width - (margin * 2);
        const polaroidHeight = 280;
        
        for (let i = 0; i < photos.length; i++) {
            const top = 100 + (i * (polaroidHeight + margin));
            
            // White frame background
            const frame = new fabric.Rect({
                left: margin - 10,
                top: top - 10,
                width: polaroidWidth + 20,
                height: polaroidHeight + 60,
                fill: '#ffffff',
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.2)',
                    blur: 10,
                    offsetX: 5,
                    offsetY: 5
                })
            });
            this.canvas.add(frame);
            
            // Photo
            await this.addPhotoToCanvas(photos[i].data, {
                left: margin,
                top: top,
                width: polaroidWidth,
                height: polaroidHeight,
                borderRadius: 0
            });
        }
    }
    
    /**
     * Add single photo to canvas
     */
    addPhotoToCanvas(photoData, options) {
        return new Promise((resolve) => {
            fabric.Image.fromURL(photoData, (img) => {
                // Calculate scale to fit
                const scaleX = options.width / img.width;
                const scaleY = options.height / img.height;
                const scale = Math.min(scaleX, scaleY);
                
                img.set({
                    left: options.left,
                    top: options.top,
                    scaleX: scale,
                    scaleY: scale,
                    selectable: false,
                    originX: 'left',
                    originY: 'top'
                });
                
                // Center crop if needed
                if (img.getScaledWidth() < options.width || img.getScaledHeight() < options.height) {
                    img.scaleToWidth(options.width);
                }
                
                // Clip to rounded rectangle
                if (options.borderRadius) {
                    img.clipPath = new fabric.Rect({
                        width: img.getScaledWidth(),
                        height: img.getScaledHeight(),
                        rx: options.borderRadius,
                        ry: options.borderRadius,
                        originX: 'center',
                        originY: 'center'
                    });
                }
                
                this.canvas.add(img);
                resolve(img);
            });
        });
    }
    
    /**
     * Add background/frame
     */
    async addBackground() {
        // Try to load template frame
        const frameUrl = `templates/frame-${this.template}.png`;
        
        try {
            await new Promise((resolve, reject) => {
                fabric.Image.fromURL(frameUrl, (img) => {
                    if (img && img.width > 0) {
                        img.scaleToWidth(this.canvas.width);
                        this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas));
                        resolve();
                    } else {
                        reject();
                    }
                }, { crossOrigin: 'anonymous' });
            });
        } catch (e) {
            // Use solid color background
            const colors = {
                classic: '#f8f8f8',
                square: '#2c3e50',
                polaroid: '#e8e8e8'
            };
            this.canvas.backgroundColor = colors[this.template] || '#ffffff';
        }
    }
    
    /**
     * Add text overlays
     */
    addTextOverlays() {
        const headerText = new fabric.Textbox('WEB BOOTH', {
            left: this.canvas.width / 2,
            top: 30,
            fontSize: 36,
            fontWeight: 'bold',
            fill: '#333333',
            textAlign: 'center',
            originX: 'center',
            fontFamily: 'Arial, sans-serif',
            selectable: false
        });
        this.canvas.add(headerText);
        
        const dateText = new fabric.Textbox(new Date().toLocaleDateString('id-ID'), {
            left: this.canvas.width / 2,
            top: this.canvas.height - 60,
            fontSize: 20,
            fill: '#666666',
            textAlign: 'center',
            originX: 'center',
            fontFamily: 'Arial, sans-serif',
            selectable: false
        });
        this.canvas.add(dateText);
    }
    
    /**
     * Get final image data
     */
    getImageData(format = 'jpeg', quality = 0.95) {
        return this.canvas.toDataURL({
            format: format,
            quality: quality,
            multiplier: 2 // High resolution
        });
    }
    
    /**
     * Download image
     */
    download(filename = null) {
        const dataUrl = this.getImageData();
        const name = filename || `photobooth-${Date.now()}.jpg`;
        
        const link = document.createElement('a');
        link.download = name;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhotoComposer };
}
