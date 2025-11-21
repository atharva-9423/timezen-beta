
// PDF.js worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.0; // Current zoom scale
let pdfUrl = '';
let pdfFileName = '';
let isRendering = false;

// Pan/drag state
let isPanning = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

// Touch zoom state
let initialPinchDistance = null;
let initialScale = 1.0;
let lastTouchX = 0;
let lastTouchY = 0;

// Debounce timer for zoom
let zoomDebounceTimer = null;
let pinchZoomTimer = null;
let animationFrameId = null;

// Initialize theme from localStorage
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
}

// Initialize theme immediately to prevent flash
initTheme();

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Ensure theme is applied
  initTheme();
  
  // Try sessionStorage first, then localStorage as fallback
  pdfUrl = sessionStorage.getItem('pdfViewerUrl') || localStorage.getItem('pdfViewerUrl');
  pdfFileName = sessionStorage.getItem('pdfViewerName') || localStorage.getItem('pdfViewerName') || 'Document.pdf';

  // Don't clear storage here - keep it for refresh capability

  document.getElementById('pdfTitle').textContent = pdfFileName;

  if (!pdfUrl) {
    showError('No PDF URL provided');
    return;
  }

  loadPDF();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('backBtn').addEventListener('click', goBack);
  document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
  document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
  document.getElementById('prevPageBtn').addEventListener('click', previousPage);
  document.getElementById('nextPageBtn').addEventListener('click', nextPage);
  document.getElementById('retryBtn').addEventListener('click', loadPDF);

  const container = document.getElementById('pdfCanvasContainer');
  
  // Touch events for pinch-to-zoom and pan
  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  // Mouse events for pan (drag)
  container.addEventListener('mousedown', handleMouseDown);
  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('mouseup', handleMouseEnd);
  container.addEventListener('mouseleave', handleMouseEnd);
  
  // Mouse wheel zoom (Ctrl+Scroll)
  container.addEventListener('wheel', handleWheel, { passive: false });
}

function handleTouchStart(e) {
  if (e.touches.length === 2) {
    // Two finger pinch - zoom
    e.preventDefault();
    initialPinchDistance = getPinchDistance(e.touches);
    initialScale = scale;
    
    // Store the center point of the pinch
    const rect = e.target.getBoundingClientRect();
    lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
    lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
  } else if (e.touches.length === 1 && scale > 0.6) {
    // Single finger - pan (only if zoomed in more than 60%)
    isPanning = true;
    startX = e.touches[0].clientX - translateX;
    startY = e.touches[0].clientY - translateY;
  }
}

function handleTouchMove(e) {
  if (e.touches.length === 2 && initialPinchDistance) {
    // Pinch zoom
    e.preventDefault();
    const currentDistance = getPinchDistance(e.touches);
    const scaleChange = currentDistance / initialPinchDistance;
    let newScale = initialScale * scaleChange;
    
    // Clamp scale between 0.5 and 5.0
    newScale = Math.max(0.5, Math.min(5.0, newScale));
    
    if (Math.abs(newScale - scale) > 0.01) {
      scale = newScale;
      
      // Update zoom level display immediately for instant feedback
      document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;
      
      // Use CSS transform for instant visual feedback
      const canvas = document.getElementById('pdfCanvas');
      canvas.style.transform = `scale(${scale / initialScale}) translate(${translateX}px, ${translateY}px)`;
      
      // Debounce the actual high-quality re-render
      clearTimeout(pinchZoomTimer);
      pinchZoomTimer = setTimeout(() => {
        updateCanvasPosition();
        renderPage(currentPage);
      }, 300);
    }
  } else if (e.touches.length === 1 && isPanning && scale > 0.6) {
    // Pan with requestAnimationFrame for smoothness
    e.preventDefault();
    
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(() => {
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        updateCanvasPosition();
        animationFrameId = null;
      });
    }
  }
}

function handleTouchEnd(e) {
  if (e.touches.length < 2) {
    initialPinchDistance = null;
    // Ensure final render happens when pinch ends
    if (pinchZoomTimer) {
      clearTimeout(pinchZoomTimer);
      updateCanvasPosition();
      renderPage(currentPage);
    }
  }
  if (e.touches.length === 0) {
    isPanning = false;
  }
}

function handleMouseDown(e) {
  if (scale > 0.6) {
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    e.target.style.cursor = 'grabbing';
  }
}

function handleMouseMove(e) {
  if (isPanning && scale > 0.6) {
    e.preventDefault();
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateCanvasPosition();
  } else if (scale > 0.6) {
    e.target.style.cursor = 'grab';
  } else {
    e.target.style.cursor = 'default';
  }
}

function handleMouseEnd(e) {
  if (isPanning) {
    isPanning = false;
    if (scale > 0.6) {
      e.target.style.cursor = 'grab';
    } else {
      e.target.style.cursor = 'default';
    }
  }
}

function handleWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    
    const delta = -Math.sign(e.deltaY);
    let newScale = scale + (delta * 0.1);
    
    // Clamp scale between 0.5 and 5.0
    newScale = Math.max(0.5, Math.min(5.0, newScale));
    
    if (newScale !== scale) {
      scale = newScale;
      renderPage(currentPage);
    }
  }
}

function getPinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function updateCanvasPosition() {
  const canvas = document.getElementById('pdfCanvas');
  const container = document.getElementById('pdfCanvasContainer');
  
  // Only apply constraints when zoomed in (scale > 0.6)
  if (scale > 0.6) {
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate maximum allowed translation
    const maxTranslateX = Math.max(0, (canvasRect.width - containerRect.width) / 2);
    const maxTranslateY = Math.max(0, (canvasRect.height - containerRect.height) / 2);
    
    // Constrain translation within boundaries
    translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
    translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
  }
  
  canvas.style.transform = `translate(${translateX}px, ${translateY}px)`;
}

function goBack() {
  // Clear both sessionStorage and localStorage when leaving
  sessionStorage.removeItem('pdfViewerUrl');
  sessionStorage.removeItem('pdfViewerName');
  localStorage.removeItem('pdfViewerUrl');
  localStorage.removeItem('pdfViewerName');
  
  // Use native browser history for instant back navigation
  window.history.back();
}

async function loadPDF() {
  try {
    showLoading();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: false,
      isEvalSupported: false
    });

    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;
    
    hideLoading();
    renderPage(currentPage);
  } catch (error) {
    console.error('Error loading PDF:', error);
    showError('Failed to load PDF. Please check your internet connection.');
  }
}

async function renderPage(pageNum) {
  if (isRendering) {
    return;
  }
  
  try {
    isRendering = true;
    const page = await pdfDoc.getPage(pageNum);
    const canvas = document.getElementById('pdfCanvas');
    const context = canvas.getContext('2d');

    // Calculate viewport with current scale
    const viewport = page.getViewport({ scale: scale * 2 }); // *2 for high DPI

    // Smooth transition: only clear if dimensions change significantly
    const needsResize = canvas.height !== viewport.height || canvas.width !== viewport.width;
    
    if (needsResize) {
      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Set display size (CSS)
      canvas.style.width = (viewport.width / 2) + 'px';
      canvas.style.height = (viewport.height / 2) + 'px';
    }

    // Clear and render PDF page
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Update position
    updateCanvasPosition();

    // Update UI
    updatePageInfo();
  } catch (error) {
    console.error('Error rendering page:', error);
    showError('Failed to render page');
  } finally {
    isRendering = false;
  }
}

function updatePageInfo() {
  document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages}`;
  document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;

  // Update button states
  document.getElementById('prevPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
  
  // Update cursor
  const container = document.getElementById('pdfCanvasContainer');
  if (scale > 0.6) {
    container.style.cursor = 'grab';
  } else {
    container.style.cursor = 'default';
  }
}

function previousPage() {
  if (currentPage <= 1) return;
  currentPage--;
  translateX = 0;
  translateY = 0;
  renderPage(currentPage);
}

function nextPage() {
  if (currentPage >= totalPages) return;
  currentPage++;
  translateX = 0;
  translateY = 0;
  renderPage(currentPage);
}

function zoomIn() {
  if (scale >= 5.0) return;
  const oldScale = scale;
  scale += 0.25;
  
  // Update zoom level display immediately for responsive feedback
  document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;
  
  // Instant visual feedback with CSS transform
  const canvas = document.getElementById('pdfCanvas');
  canvas.style.transition = 'transform 0.2s ease-out';
  canvas.style.transform = `scale(${scale / oldScale}) translate(${translateX}px, ${translateY}px)`;
  
  // Debounce the actual high-quality rendering
  clearTimeout(zoomDebounceTimer);
  zoomDebounceTimer = setTimeout(() => {
    canvas.style.transition = 'none';
    updateCanvasPosition();
    renderPage(currentPage);
  }, 100);
}

function zoomOut() {
  if (scale <= 0.5) return;
  const oldScale = scale;
  scale -= 0.25;
  
  // Reset pan when zooming out below panning threshold (60%)
  if (scale <= 0.6) {
    translateX = 0;
    translateY = 0;
  }
  
  // Update zoom level display immediately for responsive feedback
  document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;
  
  // Instant visual feedback with CSS transform
  const canvas = document.getElementById('pdfCanvas');
  canvas.style.transition = 'transform 0.2s ease-out';
  canvas.style.transform = `scale(${scale / oldScale}) translate(${translateX}px, ${translateY}px)`;
  
  // Debounce the actual high-quality rendering
  clearTimeout(zoomDebounceTimer);
  zoomDebounceTimer = setTimeout(() => {
    canvas.style.transition = 'none';
    updateCanvasPosition();
    renderPage(currentPage);
  }, 100);
}

function downloadPDF() {
  // Check if we're in Android WebView
  if (window.Android && window.Android.download) {
    // Use Android download bridge
    window.Android.download(pdfUrl);
  } else {
    // Fallback to browser download
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function showLoading() {
  document.getElementById('pdfLoading').style.display = 'flex';
  document.getElementById('pdfError').style.display = 'none';
  document.getElementById('pdfCanvasContainer').style.display = 'none';
}

function hideLoading() {
  document.getElementById('pdfLoading').style.display = 'none';
  document.getElementById('pdfCanvasContainer').style.display = 'flex';
}

function showError(message) {
  document.getElementById('pdfLoading').style.display = 'none';
  document.getElementById('pdfCanvasContainer').style.display = 'none';
  const errorDiv = document.getElementById('pdfError');
  errorDiv.style.display = 'flex';
  errorDiv.querySelector('p').textContent = message;
}

// Handle Android back button
window.addEventListener('popstate', goBack);
