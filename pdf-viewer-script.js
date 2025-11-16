
// PDF.js worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.0;
let pdfUrl = '';
let pdfFileName = '';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Get URL from sessionStorage instead of URL parameters
  pdfUrl = sessionStorage.getItem('pdfViewerUrl');
  pdfFileName = sessionStorage.getItem('pdfViewerName') || 'Document.pdf';

  // Clear sessionStorage after reading
  sessionStorage.removeItem('pdfViewerUrl');
  sessionStorage.removeItem('pdfViewerName');

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
  document.getElementById('downloadBtn').addEventListener('click', downloadPDF);
  document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
  document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
  document.getElementById('prevPageBtn').addEventListener('click', previousPage);
  document.getElementById('nextPageBtn').addEventListener('click', nextPage);
  document.getElementById('retryBtn').addEventListener('click', loadPDF);
}

function goBack() {
  // Check if we're in an Android app or web browser
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // If opened directly, try to close the window or redirect
    window.close();
    // Fallback if close doesn't work
    setTimeout(() => {
      window.location.href = 'index.html#study-materials-subjects';
    }, 100);
  }
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
  try {
    const page = await pdfDoc.getPage(pageNum);
    const canvas = document.getElementById('pdfCanvas');
    const context = canvas.getContext('2d');

    // Calculate viewport
    const viewport = page.getViewport({ scale: scale });

    // Set canvas dimensions
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Update UI
    updatePageInfo();
  } catch (error) {
    console.error('Error rendering page:', error);
    showError('Failed to render page');
  }
}

function updatePageInfo() {
  document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages}`;
  document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;

  // Update button states
  document.getElementById('prevPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
}

function previousPage() {
  if (currentPage <= 1) return;
  currentPage--;
  renderPage(currentPage);
}

function nextPage() {
  if (currentPage >= totalPages) return;
  currentPage++;
  renderPage(currentPage);
}

function zoomIn() {
  if (scale >= 3.0) return;
  scale += 0.25;
  renderPage(currentPage);
}

function zoomOut() {
  if (scale <= 0.5) return;
  scale -= 0.25;
  renderPage(currentPage);
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
