
// Check online/offline status
window.addEventListener('online', () => {
  location.reload();
});

window.addEventListener('offline', () => {
  console.log('You are offline');
});

// Check if online on load
if (navigator.onLine) {
  window.location.href = '/';
}
