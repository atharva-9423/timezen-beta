
function goBackHome() {
  window.location.href = 'index.html';
}

function showToast(message, type = 'warning') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '⚠️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="closeToast(this)">✕</button>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    closeToast(toast.querySelector('.toast-close'));
  }, 4000);
}

function closeToast(button) {
  const toast = button.parentElement;
  toast.classList.add('hide');
  setTimeout(() => toast.remove(), 300);
}

// Force light theme for about page
function initTheme() {
  document.body.classList.remove('dark-mode');
}

// Sophisticated scroll animations with stagger effect
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -80px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      } else {
        entry.target.classList.remove('animate-in');
      }
    });
  }, observerOptions);

  const animatedElements = document.querySelectorAll(
    '.animate-on-scroll, .animate-fade, .animate-scale, .animate-slide-left, .animate-slide-right'
  );
  
  // Add stagger delay for feature cards
  const featureCards = document.querySelectorAll('.feature-card.animate-on-scroll');
  featureCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.08}s`;
  });

  // Add stagger delay for stat cards
  const statCards = document.querySelectorAll('.stat-card.animate-scale');
  statCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.15}s`;
  });

  // Add stagger delay for story blocks
  const storyBlocks = document.querySelectorAll('.story-block');
  storyBlocks.forEach((block, index) => {
    block.style.transitionDelay = `${index * 0.12}s`;
  });
  
  animatedElements.forEach(el => observer.observe(el));
}

// Handle Android back button
window.addEventListener('popstate', function(event) {
  // When back button is pressed, go back to main app
  window.location.href = 'index.html';
});

// Add initial history state to enable back button handling
window.history.pushState({ page: 'about' }, '', '');

document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initScrollAnimations();
});

if (document.readyState !== 'loading') {
  initTheme();
  initScrollAnimations();
}
