class ImageViewer {
  constructor() {
    this.imageUrl = '';
    this.imageFileName = '';
    this.scale = 1.0;
    this.minScale = 0.5;
    this.maxScale = 5.0;
    this.translateX = 0;
    this.translateY = 0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.isLoaded = false;
    this.initialPinchDistance = null;
    this.initialScale = 1.0;
    
    this.elements = {
      mainImage: document.getElementById('mainImage'),
      imageViewport: document.getElementById('imageViewport'),
      loadingState: document.getElementById('loadingState'),
      errorState: document.getElementById('errorState'),
      errorMessage: document.getElementById('errorMessage'),
      imageTitle: document.getElementById('imageTitle'),
      zoomLevel: document.getElementById('zoomLevel'),
      backBtn: document.getElementById('backBtn'),
      zoomInBtn: document.getElementById('zoomInBtn'),
      zoomOutBtn: document.getElementById('zoomOutBtn'),
      resetBtn: document.getElementById('resetBtn'),
      retryBtn: document.getElementById('retryBtn')
    };
  }

  init() {
    this.applyTheme();
    this.loadImageData();
    this.setupEventListeners();
    
    if (!this.imageUrl) {
      this.showError('No image URL provided');
      return;
    }
    
    this.loadImage();
  }

  applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }
  }

  loadImageData() {
    this.imageUrl = sessionStorage.getItem('imageViewerUrl') || 
                    localStorage.getItem('imageViewerUrl') || '';
    this.imageFileName = sessionStorage.getItem('imageViewerName') || 
                         localStorage.getItem('imageViewerName') || 'Image';
    this.elements.imageTitle.textContent = this.imageFileName;
  }

  setupEventListeners() {
    this.elements.backBtn.addEventListener('click', () => this.goBack());
    this.elements.zoomInBtn.addEventListener('click', () => this.zoom(0.25));
    this.elements.zoomOutBtn.addEventListener('click', () => this.zoom(-0.25));
    this.elements.resetBtn.addEventListener('click', () => this.resetView());
    this.elements.retryBtn.addEventListener('click', () => this.retryLoad());

    this.elements.imageViewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.elements.imageViewport.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.elements.imageViewport.addEventListener('mouseup', () => this.handleMouseUp());
    this.elements.imageViewport.addEventListener('mouseleave', () => this.handleMouseUp());
    this.elements.imageViewport.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    this.elements.imageViewport.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

    this.elements.imageViewport.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.elements.imageViewport.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.elements.imageViewport.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
  }

  loadImage() {
    this.showLoading();
    
    this.elements.mainImage.onload = () => {
      this.hideLoading();
      this.isLoaded = true;
      this.elements.mainImage.classList.add('loaded');
      this.resetView();
    };
    
    this.elements.mainImage.onerror = () => {
      console.error('Failed to load image:', this.imageUrl);
      this.showError('Failed to load image. Please check your connection and try again.');
    };
    
    this.elements.mainImage.src = this.imageUrl;
  }

  zoom(delta) {
    const newScale = this.scale + delta;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    
    if (this.scale <= 1.0) {
      this.translateX = 0;
      this.translateY = 0;
    }
    
    this.applyTransform();
    this.updateZoomDisplay();
  }

  resetView() {
    this.scale = 1.0;
    this.translateX = 0;
    this.translateY = 0;
    this.applyTransform();
    this.updateZoomDisplay();
  }

  applyTransform() {
    this.elements.mainImage.style.transform = 
      `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    
    this.updateCursor();
  }

  updateCursor() {
    if (this.scale > 1.0) {
      this.elements.imageViewport.style.cursor = this.isPanning ? 'grabbing' : 'grab';
    } else {
      this.elements.imageViewport.style.cursor = 'default';
    }
  }

  updateZoomDisplay() {
    this.elements.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
  }

  handleMouseDown(e) {
    if (this.scale <= 1.0) return;
    
    e.preventDefault();
    this.isPanning = true;
    this.startX = e.clientX - this.translateX;
    this.startY = e.clientY - this.translateY;
    this.updateCursor();
  }

  handleMouseMove(e) {
    if (!this.isPanning) return;
    
    e.preventDefault();
    this.translateX = e.clientX - this.startX;
    this.translateY = e.clientY - this.startY;
    this.applyTransform();
  }

  handleMouseUp() {
    if (!this.isPanning) return;
    
    this.isPanning = false;
    this.updateCursor();
  }

  handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    this.zoom(delta);
  }

  handleDoubleClick(e) {
    e.preventDefault();
    if (this.scale === 1.0) {
      this.zoom(1.0);
    } else {
      this.resetView();
    }
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      if (this.scale > 1.0) {
        e.preventDefault();
        this.isPanning = true;
        this.startX = e.touches[0].clientX - this.translateX;
        this.startY = e.touches[0].clientY - this.translateY;
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      this.isPanning = false;
      const distance = this.getTouchDistance(e.touches[0], e.touches[1]);
      this.initialPinchDistance = distance;
      this.initialScale = this.scale;
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 1 && this.isPanning && this.scale > 1.0) {
      e.preventDefault();
      this.translateX = e.touches[0].clientX - this.startX;
      this.translateY = e.touches[0].clientY - this.startY;
      this.applyTransform();
    } else if (e.touches.length === 2 && this.initialPinchDistance) {
      e.preventDefault();
      const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
      const pinchScale = currentDistance / this.initialPinchDistance;
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.initialScale * pinchScale));
      
      if (this.scale <= 1.0) {
        this.translateX = 0;
        this.translateY = 0;
      }
      
      this.applyTransform();
      this.updateZoomDisplay();
    }
  }

  handleTouchEnd(e) {
    if (e.touches.length === 0) {
      this.isPanning = false;
      this.initialPinchDistance = null;
    } else if (e.touches.length === 1) {
      this.initialPinchDistance = null;
      if (this.scale > 1.0) {
        this.isPanning = true;
        this.startX = e.touches[0].clientX - this.translateX;
        this.startY = e.touches[0].clientY - this.translateY;
      }
    }
  }

  getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.hypot(dx, dy);
  }

  goBack() {
    window.history.back();
  }

  retryLoad() {
    this.hideError();
    this.loadImage();
  }

  showLoading() {
    this.elements.loadingState.classList.remove('hidden');
    this.elements.errorState.classList.remove('visible');
    this.elements.mainImage.classList.remove('loaded');
  }

  hideLoading() {
    this.elements.loadingState.classList.add('hidden');
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorState.classList.add('visible');
    this.elements.loadingState.classList.add('hidden');
    this.elements.mainImage.classList.remove('loaded');
  }

  hideError() {
    this.elements.errorState.classList.remove('visible');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const viewer = new ImageViewer();
  viewer.init();
});
