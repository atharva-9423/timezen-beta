
function goBack() {
  window.location.href = 'index.html#home';
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const isDarkMode = savedTheme === 'dark';

  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    document.getElementById('darkModeToggle').checked = true;
  }
}

function toggleDarkMode() {
  const isDarkMode = document.getElementById('darkModeToggle').checked;
  
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  }
}

async function saveSettings() {
  const pushNotificationsCheckbox = document.getElementById('pushNotifications');
  const settings = {
    pushNotifications: pushNotificationsCheckbox.checked,
    classReminders: document.getElementById('classReminders').checked,
    holidayAlerts: document.getElementById('holidayAlerts').checked
  };

  // Request FCM permission if push notifications are enabled
  if (settings.pushNotifications) {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        showToast('Notifications enabled! Initializing...', 'success');
        
        // Initialize FCM if handler exists
        if (window.fcmHandler) {
          await window.fcmHandler.initialize();
        }
      } else {
        settings.pushNotifications = false;
        pushNotificationsCheckbox.checked = false;
        showToast('Notification permission denied. Please enable it in browser settings.', 'error');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      settings.pushNotifications = false;
      pushNotificationsCheckbox.checked = false;
      showToast('Failed to enable notifications', 'error');
    }
  }

  localStorage.setItem('appSettings', JSON.stringify(settings));
  
  if (!settings.pushNotifications || Notification.permission === 'granted') {
    showToast('Settings saved successfully!', 'success');
  }
}

function loadSettings() {
  const savedSettings = localStorage.getItem('appSettings');
  
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    document.getElementById('pushNotifications').checked = settings.pushNotifications !== false;
    document.getElementById('classReminders').checked = settings.classReminders !== false;
    document.getElementById('holidayAlerts').checked = settings.holidayAlerts !== false;
  }
}

async function loadAppVersion() {
  try {
    const versionRef = database.ref('appConfig/version');
    const snapshot = await versionRef.once('value');
    
    const versionDisplay = document.getElementById('app-version-display');
    
    if (snapshot.exists()) {
      const version = snapshot.val();
      versionDisplay.textContent = `TimeZen v${version}`;
    } else {
      versionDisplay.textContent = 'TimeZen v1.0.0 (Not Set)';
    }
  } catch (error) {
    console.error('Error loading app version:', error);
    document.getElementById('app-version-display').textContent = 'TimeZen v1.0.0';
  }
}

function viewFCMToken() {
  const token = localStorage.getItem('fcmToken');
  
  if (!token) {
    showToast('No FCM token found. Please enable push notifications first.', 'warning');
    return;
  }
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="background: var(--white); padding: 30px; border-radius: 16px; max-width: 90%; max-height: 80%; overflow: auto; border: 3px solid var(--black); box-shadow: 8px 8px 0px var(--black);">
      <h3 style="margin-top: 0; color: var(--primary-blue); font-size: 24px;">🔑 Your FCM Token</h3>
      <p style="color: var(--text-primary); margin-bottom: 15px;">Use this token in Firebase Console to send test notifications:</p>
      <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px; border: 2px solid var(--black); margin-bottom: 20px; word-break: break-all; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto;">
        ${token}
      </div>
      <button onclick="navigator.clipboard.writeText('${token}').then(() => alert('Token copied to clipboard!')).catch(() => alert('Please copy manually'))" style="background: var(--primary-green); color: var(--white); border: 2px solid var(--black); padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-right: 10px;">
        📋 Copy Token
      </button>
      <button onclick="this.parentElement.parentElement.remove()" style="background: var(--bg-secondary); color: var(--text-primary); border: 2px solid var(--black); padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">
        Close
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

window.viewFCMToken = viewFCMToken;

function openProfileEdit() {
  window.location.href = 'index.html#profile';
}

function changePassword() {
  showToast('Password change feature coming soon!', 'info');
}

function openAbout() {
  window.open('about.html', '_blank');
}

function openGithub() {
  window.open('https://atharva-9423.github.io/edutrack/', '_blank');
}

function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.removeItem('userSession');
    window.location.href = 'index.html#welcome';
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--primary-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'});
    color: var(--white);
    padding: 16px 24px;
    border-radius: 12px;
    border: 2px solid var(--black);
    box-shadow: 4px 4px 0px var(--black);
    font-weight: 700;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Handle Android back button
window.addEventListener('popstate', function(event) {
  // When back button is pressed, go back to main app
  window.location.href = 'index.html#home';
});

// Add initial history state to enable back button handling
window.history.pushState({ page: 'settings' }, '', '');

document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  loadSettings();
  loadAppVersion();
});
