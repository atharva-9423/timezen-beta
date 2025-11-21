// Flag to track if schedule modal has been shown on this page load
let scheduleModalShownOnLoad = false;

function goToPage(pageName, addToHistory = true) {
  const pages = document.querySelectorAll('.page');
  const targetPage = document.getElementById(pageName + '-page');
  const timelinePage = document.getElementById('timeline-page');
  const profilePage = document.getElementById('profile-page');

  // Handle Study Materials Subjects page
  if (pageName === 'study-materials-subjects') {
    // Ensure study materials are loaded
    if (!studyMaterialsListenerInitialized) {
      loadStudyMaterials();
    }
    // Refresh the subjects grid when navigating to this page
    setTimeout(() => {
      updateSubjectMaterialsGrid();
    }, 100);
  }

  // Handle Zen AI page with loading animation
  if (pageName === 'zen-ai') {
    // Lazy load Groq config when accessing Zen AI
    loadGroqConfig();

    // Save current chat before navigating away
    if (currentChatId && zenAIChatHistory.length > 0) {
      saveCurrentChat();
    }

    // Start a new chat when entering Zen AI
    currentChatId = Date.now().toString();
    zenAIChatHistory = [];

    // Hide all pages first
    pages.forEach(page => {
      page.classList.remove('active', 'fade-in');
    });

    // Show zen-ai page
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Trigger loading animation
    const loadingOverlay = document.getElementById('zenAILoadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('active');

      // Remove animation class after it completes
      setTimeout(() => {
        loadingOverlay.classList.remove('active');
      }, 2000);
    }

    // Add to browser history
    if (addToHistory) {
      history.pushState({ page: pageName }, '', `#${pageName}`);
    }
    return;
  }

  if (pageName === 'study-materials') {
    // Lazy load study materials when accessing this page
    loadStudyMaterials();
  }

  if (pageName === 'study-materials-subjects') {
    // Lazy load study materials and subjects when accessing this page
    loadStudyMaterials();
    loadDivisionSubjects();
  }

  if (pageName === 'community') {
    // Initialize community page when accessing it
    initCommunityPage();
  }

  // Handle profile slide transitions
  if (pageName === 'profile') {
    // Show profile with slide-down animation
    profilePage.classList.remove('slide-up');
    profilePage.classList.add('active', 'slide-down');

    // Hide other pages without fade animation
    pages.forEach(page => {
      if (page.id !== 'profile-page') {
        page.classList.remove('active', 'fade-in');
      }
    });
  } else if (document.getElementById('profile-page').classList.contains('active')) {
    // Sliding up from profile to another page
    profilePage.classList.remove('slide-down');
    profilePage.classList.add('slide-up');

    // Wait for animation to complete before hiding profile
    setTimeout(() => {
      profilePage.classList.remove('active', 'slide-up');

      // Show target page without fade animation
      if (targetPage) {
        targetPage.classList.add('active');
      }
    }, 400); // Match animation duration
  } else if (pageName === 'timeline') {
    // Show timeline with slide-in animation
    timelinePage.classList.remove('slide-out');
    timelinePage.classList.add('active', 'slide-in');

    // Hide other pages without fade animation
    pages.forEach(page => {
      if (page.id !== 'timeline-page') {
        page.classList.remove('active', 'fade-in');
      }
    });

    loadTimelineSchedule();
  } else if (pageName === 'master-timetable') {
    // Load master timetable when navigating to it
    pages.forEach(page => {
      page.classList.remove('active', 'fade-in');
    });

    if (targetPage) {
      targetPage.classList.add('active', 'fade-in');
    }

    // Load division cards view (will add to history if needed)
    loadMasterDivisionCards('MON', addToHistory);
  } else if (document.getElementById('timeline-page').classList.contains('active')) {
    // Sliding out from timeline to another page
    timelinePage.classList.remove('slide-in');
    timelinePage.classList.add('slide-out');

    // Wait for animation to complete before hiding timeline
    setTimeout(() => {
      timelinePage.classList.remove('active', 'slide-out');

      // Show target page without fade animation
      if (targetPage) {
        targetPage.classList.add('active');
      }
    }, 400); // Match animation duration
  } else {
    // Normal navigation between non-timeline pages
    pages.forEach(page => {
      page.classList.remove('active', 'fade-in');
    });

    if (targetPage) {
      targetPage.classList.add('active', 'fade-in');
    }
  }

  // Add to browser history for back button support
  // Skip adding to history for master-timetable as it will be handled by loadMasterDivisionCards
  if (addToHistory && pageName !== 'master-timetable') {
    history.pushState({ page: pageName }, '', `#${pageName}`);
  }

  // Emit custom event after navigation is complete
  window.dispatchEvent(new CustomEvent('page:navigated', { 
    detail: { page: pageName } 
  }));
}

// Handle browser back/forward navigation
window.addEventListener('popstate', function(event) {
  // Check if notification modal is open
  const notificationDropdown = document.getElementById('notificationDropdown');
  if (notificationDropdown && notificationDropdown.classList.contains('active')) {
    closeNotifications();
    return;
  }

  // Check if user is logged in
  const userData = localStorage.getItem('userSession');
  const currentPage = document.querySelector('.page.active')?.id;

  // If user is logged in and trying to go back from home page
  if (userData && currentPage === 'home-page') {
    // Check if they're trying to go to welcome or login
    if (event.state && (event.state.page === 'welcome' || event.state.page === 'login')) {
      // Prevent going back, stay on home page
      history.pushState({ page: 'home' }, '', '#home');
      return;
    }
    // If no state (going to welcome), also prevent
    if (!event.state) {
      history.pushState({ page: 'home' }, '', '#home');
      return;
    }
  }

  if (event.state && event.state.page) {
    // Handle master timetable page with sub-views
    if (event.state.page === 'master-timetable') {
      goToPage('master-timetable', false);

      // Restore the correct view state
      if (event.state.view === 'division' && event.state.division) {
        // Show division detail view
        showDivisionSchedule(event.state.division, event.state.day || 'MON', false);
      } else {
        // Show division grid view
        loadMasterDivisionCards(event.state.day || 'MON', false);
      }
    } else {
      goToPage(event.state.page, false);
    }
  } else {
    // If no state, check the hash
    const hash = window.location.hash.substring(1);
    if (hash) {
      if (hash === 'master-timetable') {
        goToPage(hash, false);
        loadMasterDivisionCards('MON', false);
      } else {
        goToPage(hash, false);
      }
    } else {
      // Only go to welcome if user is not logged in
      if (userData) {
        goToPage('home', false);
      } else {
        goToPage('welcome', false);
      }
    }
  }
});

// Set initial history state on page load
window.addEventListener('load', function() {
  const hash = window.location.hash.substring(1);
  const currentPage = hash || 'welcome';
  history.replaceState({ page: currentPage }, '', `#${currentPage}`);
});

// Intro animation function
async function playIntroAnimation() {
  const overlay = document.getElementById('introAnimation');
  const step1 = document.querySelector('.intro-step-1');
  const step2 = document.querySelector('.intro-step-2');
  const step3 = document.querySelector('.intro-step-3');
  const step4 = document.querySelector('.intro-step-4');
  const step5 = document.querySelector('.intro-step-5');
  const step6 = document.querySelector('.intro-step-6');
  const step7 = document.querySelector('.intro-step-7');

  // Load custom intro music from Firebase
  let audioSource = 'attached_assets/lv_0_20251113200122_1763044463179.mp3'; // Default

  try {
    const musicRef = database.ref('config/introMusic');
    const snapshot = await musicRef.once('value');

    if (snapshot.exists()) {
      const music = snapshot.val();
      audioSource = music.audioData;
    }
  } catch (error) {
    console.log('Failed to load custom intro music, using default:', error);
  }

  // Create and play theme song
  const themeAudio = new Audio(audioSource);
  themeAudio.volume = 1.0;
  themeAudio.play().catch(err => console.log('Audio playback failed:', err));

  // Start fade out after 13 seconds (2.5 seconds before animation ends)
  setTimeout(() => {
    const fadeOutDuration = 2500; // 2.5 seconds fade out
    const fadeOutInterval = 50; // Update every 50ms
    const steps = fadeOutDuration / fadeOutInterval;
    const volumeDecrement = themeAudio.volume / steps;

    const fadeOut = setInterval(() => {
      if (themeAudio.volume > volumeDecrement) {
        themeAudio.volume = Math.max(0, themeAudio.volume - volumeDecrement);
      } else {
        themeAudio.volume = 0;
        themeAudio.pause();
        clearInterval(fadeOut);
      }
    }, fadeOutInterval);
  }, 13000);

  // Show overlay
  overlay.classList.add('active');

  // Step 1: Introducing TimeZen
  step1.style.animation = 'blurFadeIn 0.8s ease forwards';

  setTimeout(() => {
    step1.style.animation = 'blurFadeOut 0.8s ease forwards';

    setTimeout(() => {
      step1.style.display = 'none';

      // Step 2: Meet our Team
      step2.style.animation = 'blurFadeIn 0.8s ease forwards';

      setTimeout(() => {
        step2.style.animation = 'blurFadeOut 0.8s ease forwards';

        setTimeout(() => {
          step2.style.display = 'none';

          // Step 3: Founder name
          step3.style.animation = 'blurFadeIn 0.8s ease forwards';

          setTimeout(() => {
            step3.style.animation = 'blurFadeOut 0.8s ease forwards';

            setTimeout(() => {
              step3.style.display = 'none';

              // Step 4: Co-Founder
              step4.style.animation = 'blurFadeIn 0.8s ease forwards';

              setTimeout(() => {
                step4.style.animation = 'blurFadeOut 0.8s ease forwards';

                setTimeout(() => {
                  step4.style.display = 'none';

                  // Step 5: Data Scientist and Analyst
                  step5.style.animation = 'blurFadeIn 0.8s ease forwards';

                  setTimeout(() => {
                    step5.style.animation = 'blurFadeOut 0.8s ease forwards';

                    setTimeout(() => {
                      step5.style.display = 'none';

                      // Step 6: Testing & Quality Analyst
                      step6.style.animation = 'blurFadeIn 0.8s ease forwards';

                      setTimeout(() => {
                        step6.style.animation = 'blurFadeOut 0.8s ease forwards';

                        setTimeout(() => {
                          step6.style.display = 'none';

                          // Step 7: UI Designer
                          step7.style.animation = 'blurFadeIn 0.8s ease forwards';

                          setTimeout(() => {
                            step7.style.animation = 'blurFadeOut 0.8s ease forwards';

                            setTimeout(() => {
                              step7.style.display = 'none';

                              // Navigate to login page immediately (before fade-out)
                              goToPage('login');

                              // Fade out entire overlay
                              overlay.style.animation = 'fadeOut 0.8s ease forwards';

                              setTimeout(() => {
                                overlay.classList.remove('active');
                                overlay.style.animation = '';

                                // Reset all steps for next time
                                step1.style.display = '';
                                step2.style.display = '';
                                step3.style.display = '';
                                step4.style.display = '';
                                step5.style.display = '';
                                step6.style.display = '';
                                step7.style.display = '';
                                step1.style.animation = '';
                                step2.style.animation = '';
                                step3.style.animation = '';
                                step4.style.animation = '';
                                step5.style.animation = '';
                                step6.style.animation = '';
                                step7.style.animation = '';
                              }, 800);
                            }, 800);
                          }, 1200); // Show UI Designer
                        }, 800);
                      }, 1200); // Show Testing & Quality Analyst
                    }, 800);
                  }, 1200); // Show Data Scientist and Analyst
                }, 800);
              }, 1200); // Show Co-Founder
            }, 800);
          }, 1500); // Show founder
        }, 800);
      }, 1500); // Show "Meet our Team"
    }, 800);
  }, 1500); // Show "Introducing TimeZen"
}

// Modify the Get Started button to trigger animation
window.playIntroAnimation = playIntroAnimation;

// Check online/offline status
window.addEventListener('online', () => {
  console.log('[App] Back online');
  showToast('Back online! Syncing data...', 'success');
  // Refresh data from Firebase
  if (window.location.hash === '#home' || !window.location.hash) {
    checkAndDisplayNotices();
    loadStudyMaterials();
    updateNextClassCountdown();
  }
});

window.addEventListener('offline', () => {
  console.log('[App] Offline - using cached data');
  showToast('You are offline. Showing cached data.', 'warning');
});

// Don't redirect to offline page - let service worker handle it
// The app will work with cached data

function showToast(message, type = 'warning') {
  const toastContainer = document.getElementById('toast-container');

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Set icon based on type
  let icon = '⚠️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="closeToast(this)">✕</button>
  `;

  // Add to container
  toastContainer.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    closeToast(toast.querySelector('.toast-close'));
  }, 4000);
}

function closeToast(button) {
  const toast = button.parentElement;
  toast.classList.add('hide');

  // Remove from DOM after animation
  setTimeout(() => {
    toast.remove();
  }, 300);
}

function showAlert(message) {
  showToast(message, 'info');
}

function toggleDropdown(selectName) {
  const selectElement = document.getElementById(`${selectName}-options`).parentElement;
  const optionsElement = document.getElementById(`${selectName}-options`);

  // Close all other dropdowns
  document.querySelectorAll('.custom-select').forEach(select => {
    if (select !== selectElement) {
      select.classList.remove('active');
      select.querySelector('.select-options').classList.remove('active');
    }
  });

  // Toggle current dropdown
  selectElement.classList.toggle('active');
  optionsElement.classList.toggle('active');
}

function selectOption(selectName, value) {
  const selectElement = document.getElementById(`${selectName}-options`).parentElement;
  const valueElement = selectElement.querySelector('.select-value');
  const hiddenInput = document.getElementById(selectName);

  // Update displayed value
  valueElement.textContent = value;
  valueElement.removeAttribute('data-placeholder');

  // Update hidden input
  hiddenInput.value = value;

  // Remove selected class from all options
  selectElement.querySelectorAll('.select-option').forEach(option => {
    option.classList.remove('selected');
  });

  // Add selected class to clicked option
  event.target.classList.add('selected');

  // Close dropdown
  selectElement.classList.remove('active');
  document.getElementById(`${selectName}-options`).classList.remove('active');
}

// Generate or retrieve device ID
function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

// Record login in Firebase RTDB
function recordLoginInFirebase(userData) {
  const deviceId = getDeviceId();
  const loginRef = database.ref('logins/' + deviceId);

  // Also fetch and save the current app version
  database.ref('appConfig/version').once('value').then((versionSnapshot) => {
    if (versionSnapshot.exists()) {
      const currentVersion = versionSnapshot.val();
      localStorage.setItem('appVersion', currentVersion);
      console.log('App version synced:', currentVersion);
    }
  }).catch((error) => {
    console.error('Error fetching app version:', error);
  });

  // Check if device already exists in database
  loginRef.once('value').then((snapshot) => {
    if (!snapshot.exists()) {
      // Device doesn't exist, register it
      loginRef.set({
        deviceId: deviceId,
        studentName: userData.studentName,
        branch: userData.branch,
        division: userData.division,
        year: userData.year,
        firstLoginTimestamp: firebase.database.ServerValue.TIMESTAMP,
        lastLoginTimestamp: firebase.database.ServerValue.TIMESTAMP,
        loginCount: 1
      }).then(() => {
        console.log('Device registered in Firebase');
      }).catch((error) => {
        console.error('Error registering device:', error);
      });
    } else {
      // Device exists, just update last login timestamp and increment count
      loginRef.update({
        studentName: userData.studentName,
        branch: userData.branch,
        division: userData.division,
        year: userData.year,
        lastLoginTimestamp: firebase.database.ServerValue.TIMESTAMP,
        loginCount: snapshot.val().loginCount + 1
      }).then(() => {
        console.log('Login timestamp updated in Firebase');
      }).catch((error) => {
        console.error('Error updating login:', error);
      });
    }
  }).catch((error) => {
    console.error('Error checking device in Firebase:', error);
  });
}

function handleLogin(event) {
  event.preventDefault();

  const studentName = document.getElementById('student-name').value;
  const branch = document.getElementById('branch').value;
  const division = document.getElementById('division').value;
  const year = document.getElementById('year').value;

  // Validate individual fields with specific messages
  if (!studentName) {
    showToast('Please enter your student name', 'warning');
    return;
  }

  if (!branch) {
    showToast('Please select your branch', 'warning');
    return;
  }

  if (!division) {
    showToast('Please select your division', 'warning');
    return;
  }

  if (!year) {
    showToast('Please select your year', 'warning');
    return;
  }

  // Store user data temporarily in sessionStorage
  const tempUserData = { studentName, branch, division, year };
  sessionStorage.setItem('tempUserData', JSON.stringify(tempUserData));
  console.log('Login Data (temporary):', tempUserData);

  // Redirect to authentication page
  goToPage('auth');
}

function handleAuthentication(event) {
  event.preventDefault();

  const enrNumber = document.getElementById('enr-number').value;
  const password = document.getElementById('password').value;

  // Validate enrollment number (must be exactly 10 digits)
  if (!enrNumber) {
    showToast('Please enter your enrollment number', 'warning');
    return;
  }

  if (enrNumber.length !== 10 || !/^\d{10}$/.test(enrNumber)) {
    showToast('Enrollment number must be exactly 10 digits', 'error');
    return;
  }

  // Validate password
  if (!password) {
    showToast('Please enter your password', 'warning');
    return;
  }

  // Check credentials (demo: enr=1234567890, password=zen@space)
  if (enrNumber !== '1234567890' || password !== 'zen@space') {
    showToast('Invalid enrollment number or password', 'error');
    return;
  }

  // Get temporary user data from sessionStorage
  const tempUserData = JSON.parse(sessionStorage.getItem('tempUserData') || '{}');

  // Add enrollment number to user data and store in localStorage
  const userData = { ...tempUserData, enrNumber };
  localStorage.setItem('userSession', JSON.stringify(userData));
  console.log('Authentication successful, User Data:', userData);

  // Clear temporary data
  sessionStorage.removeItem('tempUserData');

  // Record login in Firebase RTDB
  recordLoginInFirebase(userData);

  // Show loading animation
  const loadingOverlay = document.getElementById('loadingOverlay');
  loadingOverlay.classList.add('active');

  // Redirect to home page after loading animation
  setTimeout(() => {
    // Play fade out sound effect first
    playFadeOutSound();

    // Navigate to home page after brief delay
    setTimeout(() => {
      goToPage('home');
      loadingOverlay.classList.add('fade-out');
    }, 100);

    // Wait for fade out animation to complete, then remove overlay and show toast
    setTimeout(() => {
      loadingOverlay.classList.remove('active', 'fade-out');
      showToast('Authentication successful! Welcome to TimeZen', 'success');
    }, 600); // Match the fadeOut animation duration + delay
  }, 2000);
}

// Function to play fade out sound effect
function playFadeOutSound() {
  try {
    const audio = new Audio('attached_assets/swoosh-riser-reverb-390309_1760884727578.mp3');
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch(error => {
      console.log('Audio playback failed:', error);
    });
  } catch (error) {
    console.log('Audio playback not supported:', error);
  }
}

// Function to get current day code (MON, TUE, WED, etc.)
function getCurrentDayCode() {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = new Date().getDay();
  return days[today];
}

// Function to show schedule modal
function showScheduleModal() {
  const modal = document.getElementById('scheduleModal');
  const userData = JSON.parse(localStorage.getItem('userSession') || '{}');

  // Only show modal if user is logged in
  if (!userData.division) {
    return;
  }

  modal.classList.add('active');
  loadTodaySchedule();
}

// Function to close schedule modal
function closeScheduleModal() {
  const modal = document.getElementById('scheduleModal');
  modal.classList.remove('active');
}

// Function to load today's schedule
async function loadTodaySchedule() {
  const container = document.getElementById('scheduleModalBody');
  if (!container) return;

  const userData = JSON.parse(localStorage.getItem('userSession') || '{}');

  if (!userData.division) {
    container.innerHTML = '<div class="schedule-empty">Please login to view schedule</div>';
    return;
  }

  const dayCode = getCurrentDayCode();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[new Date().getDay()];

  // Show loading state
  container.innerHTML = '<div class="schedule-loading">Loading schedule...</div>';

  try {
    const scheduleRef = database.ref(`divisions/${userData.division}/schedules/${dayCode}`);
    const snapshot = await scheduleRef.once('value');

    if (snapshot.exists()) {
      const schedules = snapshot.val();

      // Function to convert 12-hour time to minutes for proper sorting
      const timeToMinutes = (timeStr) => {
        const time = timeStr.split('-')[0].trim();
        const [timePart, period] = time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return hours * 60 + minutes;
      };

      const schedulesArray = Object.values(schedules).sort((a, b) =>
        timeToMinutes(a.time) - timeToMinutes(b.time)
      );

      let html = `<div class="schedule-day-info">${dayName}</div>`;

      for (const schedule of schedulesArray) {
        const subjectRef = database.ref(`divisions/${userData.division}/subjects/${schedule.subjectId}`);
        const subjectSnapshot = await subjectRef.once('value');
        const subject = subjectSnapshot.exists() ? subjectSnapshot.val() : { name: 'Unknown', teacher: 'Unknown' };

        let slotClass = 'purple';
        if (schedule.type === 'green') {
          slotClass = 'green';
        } else if (schedule.type === 'red') {
          slotClass = 'red';
        }

        html += `
          <div class="schedule-preview-card ${slotClass}">
            <div class="schedule-preview-time">${schedule.time}</div>
            <div class="schedule-preview-info">
              <div class="schedule-preview-subject">${subject.name}</div>
              <div class="schedule-preview-teacher">${subject.teacher}</div>
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
    } else {
      container.innerHTML = `
        <div class="schedule-day-info">${dayName}</div>
        <div class="schedule-empty">
          <p>No classes scheduled for today</p>
          <p class="schedule-empty-emoji">🎉</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading today\'s schedule:', error);
    container.innerHTML = '<div class="schedule-error">Error loading schedule</div>';
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.custom-select')) {
    document.querySelectorAll('.custom-select').forEach(select => {
      select.classList.remove('active');
      select.querySelector('.select-options').classList.remove('active');
    });
  }
});

// Centralized function to clean up Firebase listeners
function resetHomeLazyState() {
  // Reset lazy loading flags
  homePageDataLoaded = false;
  scheduleModalShownOnLoad = false;

  // Clear countdown interval
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}

function cleanupFirebaseListeners() {
  const userData = JSON.parse(localStorage.getItem('userSession') || '{}');

  // Detach study materials listeners
  if (studyMaterialsListenerInitialized && userData.division) {
    database.ref(`divisions/${userData.division}/studyMaterials`).off();
    database.ref(`divisions/ALL/studyMaterials`).off();
  }
  studyMaterialsListenerInitialized = false;

  // Detach subjects listeners
  if (subjectsListenerInitialized && userData.division) {
    database.ref(`divisions/${userData.division}/studySubjects`).off();
    database.ref(`divisions/ALL/studySubjects`).off();
  }
  subjectsListenerInitialized = false;
}

function handleLogout() {
  // Wait for the button animation to finish (500ms)
  setTimeout(() => {
    // Show the custom logout modal
    const modal = document.getElementById('logoutModal');
    modal.classList.add('active');
  }, 500);
}

function confirmLogout() {
  // Hide modal
  const modal = document.getElementById('logoutModal');
  modal.classList.remove('active');

  // Clean up Firebase listeners
  cleanupFirebaseListeners();

  // Reset lazy loading state
  resetHomeLazyState();

  // Clear stored session data
  localStorage.removeItem('userSession');

  console.log('User logged out');

  // Redirect to welcome page
  setTimeout(() => {
    goToPage('welcome');
  }, 300);
}

function cancelLogout() {
  // Just hide the modal
  const modal = document.getElementById('logoutModal');
  modal.classList.remove('active');
}

// Profile menu toggle
function toggleProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  const backdrop = document.getElementById('profileBackdrop');

  dropdown.classList.toggle('active');
  if (backdrop) {
    backdrop.classList.toggle('active');
  }
}

// Open admin panel
function openAdminPanel() {
  // Get the base path from current URL (works for both local and GitHub Pages)
  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  const adminUrl = basePath + 'admin.html';

  // Try opening in new tab first
  const adminWindow = window.open(adminUrl, '_blank');

  // If popup blocked or failed, navigate in same window
  if (!adminWindow || adminWindow.closed || typeof adminWindow.closed === 'undefined') {
    window.location.href = adminUrl;
  }
}

// Open about page
function openAboutPage() {
  // Get the base path from current URL (works for both local and GitHub Pages)
  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  const aboutUrl = basePath + 'about.html';

  // Try opening in new tab first
  const aboutWindow = window.open(aboutUrl, '_blank');

  // If popup blocked or failed, navigate in same window
  if (!aboutWindow || aboutWindow.closed || typeof aboutWindow.closed === 'undefined') {
    window.location.href = aboutUrl;
  }
}

// Open GitHub page
function openGithubPage() {
  // Open GitHub profile in new tab
  const githubWindow = window.open('https://github.com/atharva-9423', '_blank');

  // If popup blocked or failed, navigate in same window
  if (!githubWindow || githubWindow.closed || typeof githubWindow.closed === 'undefined') {
    window.location.href = 'https://github.com/atharva-9423';
  }
}

// Close profile menu when clicking outside
document.addEventListener('click', function(event) {
  const profileContainer = document.querySelector('.profile-container');
  const dropdown = document.getElementById('profileDropdown');
  const backdrop = document.getElementById('profileBackdrop');

  if (dropdown && !profileContainer.contains(event.target)) {
    dropdown.classList.remove('active');
    if (backdrop) {
      backdrop.classList.remove('active');
    }
  }
});

// Check app version from Firebase and force logout if version mismatch
function checkAppVersion() {
  return new Promise((resolve) => {
    const versionRef = database.ref('appConfig/version');

    versionRef.once('value').then((snapshot) => {
      if (snapshot.exists()) {
        const firebaseVersion = snapshot.val();
        const localVersion = localStorage.getItem('appVersion');

        // Only force logout if there WAS a version stored and it changed
        // Don't force logout on first login (when localVersion is null)
        if (localVersion && localVersion !== firebaseVersion) {
          console.log('App version mismatch. Forcing logout...');

          // Clean up Firebase listeners before clearing session
          cleanupFirebaseListeners();

          // Reset lazy loading state
          resetHomeLazyState();

          // Clear all localStorage except deviceId (to keep device tracking)
          const deviceId = localStorage.getItem('deviceId');
          localStorage.clear();
          if (deviceId) {
            localStorage.setItem('deviceId', deviceId);
          }

          // Save new version
          localStorage.setItem('appVersion', firebaseVersion);

          // Force redirect to welcome page
          goToPage('welcome', false);
          resolve(false); // Not allowed to stay logged in
        } else {
          // First time or version matches - just save the version and proceed
          if (!localVersion) {
            console.log('First time - saving app version:', firebaseVersion);
          }
          localStorage.setItem('appVersion', firebaseVersion);
          resolve(true); // Version matches or first time, proceed
        }
      } else {
        // No version set in Firebase yet, just proceed
        console.log('No app version found in Firebase');
        resolve(true);
      }
    }).catch((error) => {
      console.error('Error checking app version:', error);
      resolve(true); // On error, allow login (don't break the app)
    });
  });
}

// Session management
function checkUserSession() {
  // First check app version
  checkAppVersion().then((canProceed) => {
    if (!canProceed) {
      // Version mismatch already handled in checkAppVersion
      return;
    }

    const savedSession = localStorage.getItem('userSession');

    if (savedSession) {
      // User is logged in
      const userData = JSON.parse(savedSession);
      console.log('User session found:', userData);

      // Update profile picture on main screen
      updateMainProfilePicture();

      // Check if there's a hash in the URL (current page)
      const hash = window.location.hash.substring(1);

      // If there's a hash, navigate to that page (stay on current page after reload)
      // Otherwise, redirect to home page
      if (hash && hash !== 'login' && hash !== 'welcome') {
        goToPage(hash, false);
      } else if (!hash || hash === 'login' || hash === 'welcome') {
        // Only redirect to home if on login/welcome page or no page specified
        goToPage('home');
      }
    }
  });
}

// Initialize session before page content is visible
function initializeSession() {
  const savedSession = localStorage.getItem('userSession');

  if (savedSession) {
    // User is logged in - hide welcome page and show home page immediately
    const welcomePage = document.getElementById('welcome-page');
    const homePage = document.getElementById('home-page');

    if (welcomePage) {
      welcomePage.classList.remove('active');
    }

    // Check for hash to determine which page to show
    const hash = window.location.hash.substring(1);
    if (hash && hash !== 'login' && hash !== 'welcome') {
      const targetPage = document.getElementById(hash + '-page');
      if (targetPage) {
        targetPage.classList.add('active');
      } else {
        homePage.classList.add('active');
      }
    } else {
      homePage.classList.add('active');
    }
  } else {
    // User not logged in - show welcome page
    const welcomePage = document.getElementById('welcome-page');
    if (welcomePage) {
      welcomePage.classList.add('active');
    }
  }

  // Mark body as initialized to show pages
  document.body.classList.add('initialized');
}

// Register Service Worker for offline functionality
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/edutrack/service-worker.js', {
        scope: '/edutrack/'
      });

      console.log('[App] Service Worker registered successfully:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('[App] New Service Worker available');
            showToast('App update available! Refresh to update.', 'info');
          }
        });
      });

      // Cache user's division data for offline access
      const userData = localStorage.getItem('userSession');
      if (userData) {
        const user = JSON.parse(userData);
        // Request to cache division-specific data
        if (registration.active) {
          registration.active.postMessage({
            type: 'CACHE_URLS',
            urls: [
              `/edutrack/index.html`,
              `/edutrack/style.css`,
              `/edutrack/script.js`
            ]
          });
        }
      }

      return registration;
    } catch (error) {
      console.error('[App] Service Worker registration failed:', error);
    }
  } else {
    console.log('[App] Service Workers not supported');
  }
}

function updateMainProfilePicture() {
  const profilePhoto = localStorage.getItem('profilePhoto');
  const mainProfilePic = document.querySelector('.profile-pic');

  if (mainProfilePic && profilePhoto) {
    mainProfilePic.innerHTML = `<img src="${profilePhoto}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;">`;
  } else if (mainProfilePic) {
    mainProfilePic.innerHTML = '<i class="ph ph-user"></i>';
  }
}

// Theme toggling functions
function toggleTheme() {
  const body = document.body;
  const checkbox = document.querySelector('.theme-switch__checkbox');
  const isDarkMode = checkbox.checked;

  if (isDarkMode) {
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
  }

  // Save preference to localStorage
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const isDarkMode = savedTheme === 'dark';

  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }

  // Update checkbox after a brief delay to ensure DOM is ready
  setTimeout(() => {
    const checkbox = document.querySelector('.theme-switch__checkbox');
    if (checkbox) {
      checkbox.checked = isDarkMode;
    }
  }, 100);
}

// Date and Time Utilities for Indian Standard Time (IST)
function getISTTime() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + istOffset);
  return istTime;
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatDate(date) {
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-IN', options);
}

function getDayName(date, short = false) {
  const options = { weekday: short ? 'short' : 'long' };
  return date.toLocaleDateString('en-IN', options);
}

function updateLiveClock() {
  const clockElement = document.getElementById('live-clock');
  if (clockElement) {
    const istTime = getISTTime();
    const timeString = formatTime(istTime);
    const dateString = formatDate(istTime);
    const dayName = getDayName(istTime);

    clockElement.innerHTML = `
      <div class="clock-time">${timeString}</div>
      <div class="clock-date">${dayName}, ${dateString}</div>
    `;
  }
}

let selectedScheduleDay = null;

function updateWeekCalendar() {
  const weekSelector = document.querySelector('.week-selector');
  if (!weekSelector) return;

  const istTime = getISTTime();
  const currentDay = istTime.getDay();
  const currentDate = istTime.getDate();
  const currentMonth = istTime.getMonth();
  const currentYear = istTime.getFullYear();

  const monday = new Date(istTime);
  const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
  monday.setDate(currentDate - daysSinceMonday);

  weekSelector.innerHTML = '';

  const dayKeys = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  for (let i = 0; i < 6; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);

    const isToday = day.getDate() === currentDate &&
                    day.getMonth() === currentMonth &&
                    day.getFullYear() === currentYear;
    const dayName = getDayName(day, true);
    const dayNumber = day.getDate();
    const dayKey = dayKeys[i];

    const dayItem = document.createElement('div');
    dayItem.className = `day-item ${isToday ? 'active' : ''}`;
    dayItem.setAttribute('data-day', dayKey);
    dayItem.setAttribute('data-date', day.toISOString().split('T')[0]); // Store actual date
    dayItem.innerHTML = `
      <span class="day-label">${dayName}</span>
      <span class="day-number">${dayNumber}</span>
    `;

    dayItem.addEventListener('click', function() {
      document.querySelectorAll('.day-item').forEach(item => {
        item.classList.remove('selected');
      });
      this.classList.add('selected');
      selectedScheduleDay = dayKey;
      const actualDate = this.getAttribute('data-date');
      loadTimelineSchedule(dayKey, actualDate);
    });

    weekSelector.appendChild(dayItem);
  }
}

function calculateTimeUntilClass(classHour, classMinute) {
  const istTime = getISTTime();
  const classTime = new Date(istTime);
  classTime.setHours(classHour, classMinute, 0, 0);

  if (classTime < istTime) {
    classTime.setDate(classTime.getDate() + 1);
  }

  const timeDiff = classTime - istTime;
  const minutes = Math.floor(timeDiff / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes} Minutes`;
}

async function updateNextClassCountdown() {
  const nextClassCard = document.querySelector('.next-class-card h2');
  const classTimeElement = document.querySelector('.class-time');
  const teacherNameElement = document.querySelector('.next-class-card .teacher-name');
  const classCountElement = document.querySelector('.class-count');
  const classLabelElement = document.querySelector('.class-label');

  if (!nextClassCard || !classTimeElement) return;

  const userData = JSON.parse(localStorage.getItem('userSession'));
  if (!userData || !userData.division) {
    nextClassCard.innerHTML = `No Class<br />Scheduled`;
    classTimeElement.textContent = '--:--';
    if (teacherNameElement) teacherNameElement.textContent = 'Login to view schedule';
    if (classCountElement) classCountElement.textContent = '0/0';
    return;
  }

  const division = userData.division;
  const istTime = getISTTime();
  const currentDay = istTime.getDay();

  const dayKeys = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayKey = dayKeys[currentDay];

  if (dayKey === 'SUN') {
    nextClassCard.innerHTML = `No Class<br />Today`;
    classTimeElement.textContent = '--:--';
    if (teacherNameElement) teacherNameElement.textContent = 'Enjoy your Sunday!';
    if (classCountElement) classCountElement.textContent = '0/0';
    return;
  }

  try {
    const schedulesRef = database.ref(`divisions/${division}/schedules/${dayKey}`);
    const subjectsRef = database.ref(`divisions/${division}/subjects`);

    const [scheduleSnapshot, subjectsSnapshot] = await Promise.all([
      schedulesRef.once('value'),
      subjectsRef.once('value')
    ]);

    if (!scheduleSnapshot.exists()) {
      nextClassCard.innerHTML = `No Class<br />Scheduled`;
      classTimeElement.textContent = '--:--';
      if (teacherNameElement) teacherNameElement.textContent = 'No schedule available';
      if (classCountElement) classCountElement.textContent = '0/0';
      return;
    }

    const schedules = scheduleSnapshot.val();
    const subjects = subjectsSnapshot.exists() ? subjectsSnapshot.val() : {};

    const parseTimeToMinutes = (timeStr) => {
      const time = timeStr.split('-')[0].trim();
      const [timePart, period] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const parseEndTimeToMinutes = (timeStr) => {
      const time = timeStr.split('-')[1]?.trim();
      if (!time) return parseTimeToMinutes(timeStr);
      const [timePart, period] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();
    const schedulesArray = Object.values(schedules)
      .filter(s => s.type !== 'lunch')
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

    const totalLectures = schedulesArray.length;
    let completedLectures = 0;

    for (const classItem of schedulesArray) {
      const classEndMinutes = parseEndTimeToMinutes(classItem.time);
      if (classEndMinutes <= currentMinutes) {
        completedLectures++;
      }
    }

    if (classCountElement) {
      classCountElement.textContent = `${completedLectures}/${totalLectures}`;
    }
    if (classLabelElement) {
      classLabelElement.innerHTML = 'Lectures<br />Completed';
    }

    let nextClass = null;
    for (const classItem of schedulesArray) {
      const classStartMinutes = parseTimeToMinutes(classItem.time);
      if (classStartMinutes > currentMinutes) {
        nextClass = classItem;
        break;
      }
    }

    if (nextClass) {
      const subject = subjects[nextClass.subjectId] || { name: 'Unknown Subject', teacher: 'Unknown Teacher' };
      const startTime = nextClass.time.split('-')[0].trim();
      const [timePart, period] = startTime.split(' ');
      const [hours, minutes] = timePart.split(':').map(Number);

      let hours24 = hours;
      if (period === 'PM' && hours !== 12) hours24 += 12;
      if (period === 'AM' && hours === 12) hours24 = 0;

      const countdown = calculateTimeUntilClass(hours24, minutes);

      nextClassCard.innerHTML = `${subject.name} In<br />${countdown}`;
      classTimeElement.textContent = startTime;
      if (teacherNameElement) teacherNameElement.textContent = subject.teacher;
    } else {
      nextClassCard.innerHTML = `All Classes<br />Completed`;
      classTimeElement.textContent = '';
      if (teacherNameElement) teacherNameElement.textContent = 'Great job today!';
    }
  } catch (error) {
    console.error('Error fetching next class:', error);
    nextClassCard.innerHTML = `Error Loading<br />Schedule`;
    classTimeElement.textContent = '--:--';
    if (teacherNameElement) teacherNameElement.textContent = 'Please try again';
    if (classCountElement) classCountElement.textContent = '0/0';
  }
}

function initDateTime() {
  // Only update clock and calendar on initial load (no Firebase calls)
  updateLiveClock();
  updateWeekCalendar();

  // Set up clock update interval
  setInterval(() => {
    updateLiveClock();
  }, 1000);

  // Set up calendar update interval
  setInterval(updateWeekCalendar, 60000);

  // Note: updateNextClassCountdown will be called lazily when home page is visible
}

async function checkIfHoliday(dayKey, dateOverride = null) {
  try {
    // Use provided date or calculate from week selector
    let targetDate;

    if (dateOverride) {
      targetDate = new Date(dateOverride);
    } else {
      const istTime = getISTTime();
      const currentDay = istTime.getDay();
      const currentDate = istTime.getDate();
      const currentMonth = istTime.getMonth();
      const currentYear = istTime.getFullYear();

      // Map day keys to day numbers (0 = Sunday, 1 = Monday, etc.)
      const dayKeyToNumber = {
        'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
      };

      const targetDayNumber = dayKeyToNumber[dayKey];

      // Calculate Monday of current week
      const monday = new Date(istTime);
      const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
      monday.setDate(currentDate - daysSinceMonday);

      // Calculate target date based on Monday
      const daysFromMonday = targetDayNumber - 1; // MON=1, so MON is 0 days from Monday
      targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + daysFromMonday);
    }

    // Normalize to midnight for proper comparison
    targetDate.setHours(0, 0, 0, 0);

    // Check Firebase for holidays
    const holidaysRef = database.ref('holidays');
    const snapshot = await holidaysRef.once('value');

    if (snapshot.exists()) {
      const holidays = snapshot.val();
      for (const holidayId in holidays) {
        const holiday = holidays[holidayId];
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);

        // Normalize dates to midnight for accurate comparison
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        // Check if target date falls within holiday range (inclusive)
        if (targetDate >= startDate && targetDate <= endDate) {
          return holiday;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking holidays:', error);
    return null;
  }
}

function checkCollegeEndedShownToday() {
  const today = new Date().toDateString();
  const lastShown = localStorage.getItem('collegeEndedModalDate');
  return lastShown === today;
}

function markCollegeEndedShownToday() {
  const today = new Date().toDateString();
  localStorage.setItem('collegeEndedModalDate', today);
}

function updateActiveLecture() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper function to parse time string to minutes
  const parseTimeToMinutes = (timeStr) => {
    const [timePart, period] = timeStr.trim().split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  // Remove active-now class from all cards
  document.querySelectorAll('.timeline-card').forEach(card => {
    card.classList.remove('active-now');
  });

  // Find and highlight the active lecture, update tick marks
  let activeCard = null;
  let lastLectureEndTime = 0;
  let lastLectureEndTimeStr = '';

  document.querySelectorAll('.timeline-card[data-time-range]').forEach(card => {
    const timeRange = card.getAttribute('data-time-range');
    if (!timeRange) return;

    const [startTime, endTime] = timeRange.split('-').map(t => t.trim());
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    // Track the last lecture end time
    if (endMinutes > lastLectureEndTime) {
      lastLectureEndTime = endMinutes;
      lastLectureEndTimeStr = endTime;
    }

    // Update tick mark based on completion (past days all completed, today based on time, future none)
    const tickMark = card.querySelector('.timeline-check');
    if (tickMark) {
      // Get the selected date from the day selector
      const selectedDayElement = document.querySelector(`.day-item[data-day="${selectedScheduleDay}"]`);
      const selectedDate = selectedDayElement ? selectedDayElement.getAttribute('data-date') : null;

      if (selectedDate) {
        const today = getISTTime();
        const todayDateStr = today.toISOString().split('T')[0];
        const selectedDateObj = new Date(selectedDate);
        const todayDateObj = new Date(todayDateStr);

        // Normalize dates to midnight for comparison
        selectedDateObj.setHours(0, 0, 0, 0);
        todayDateObj.setHours(0, 0, 0, 0);

        if (selectedDateObj < todayDateObj) {
          // Past day - show all as completed
          tickMark.classList.add('completed');
        } else if (selectedDateObj.getTime() === todayDateObj.getTime()) {
          // Today - show based on current time
          if (currentMinutes >= endMinutes) {
            tickMark.classList.add('completed');
          } else {
            tickMark.classList.remove('completed');
          }
        } else {
          // Future day - don't show tick marks
          tickMark.classList.remove('completed');
        }
      }
    }

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      card.classList.add('active-now');
      activeCard = card;
    }
  });

  // Check if college day has ended and modal hasn't been shown today
  if (lastLectureEndTime > 0 && currentMinutes >= lastLectureEndTime && !checkCollegeEndedShownToday()) {
    showCollegeEndedModal(lastLectureEndTimeStr);
    markCollegeEndedShownToday();
  }

  // Scroll to active card if it exists and is not in viewport
  if (activeCard) {
    const cardRect = activeCard.getBoundingClientRect();
    const isInViewport = (
      cardRect.top >= 0 &&
      cardRect.bottom <= window.innerHeight
    );

    if (!isInViewport) {
      activeCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
}

function showCollegeEndedModal(endTime) {
  const modal = document.getElementById('collegeEndedModal');
  const timeElement = document.getElementById('collegeEndedTime');

  if (modal && timeElement) {
    timeElement.textContent = `Ended at ${endTime}`;
    modal.classList.add('active');
  }
}

function closeCollegeEndedModal() {
  const modal = document.getElementById('collegeEndedModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

async function loadStudyMaterials() {
  try {
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    if (!userSession || !userSession.division) {
      console.log('No user session found for study materials');
      updateSubjectMaterialsGrid();
      return;
    }

    // Only attach listeners once
    if (studyMaterialsListenerInitialized) {
      return;
    }
    studyMaterialsListenerInitialized = true;

    const userDivision = userSession.division;

    // Listen to both division-specific and ALL division materials
    const materialsRef = database.ref(`divisions/${userDivision}/studyMaterials`);
    const allMaterialsRef = database.ref('divisions/ALL/studyMaterials');

    const updateMaterialsCache = () => {
      Promise.all([
        materialsRef.once('value'),
        allMaterialsRef.once('value')
      ]).then(([divisionSnapshot, allSnapshot]) => {
        studyMaterialsCache = [];

        // Add division-specific materials
        if (divisionSnapshot.exists()) {
          const materials = divisionSnapshot.val();
          Object.values(materials).forEach(material => {
            studyMaterialsCache.push({
              ...material,
              division: userDivision,
              subject: material.subjectName || material.subject
            });
          });
        }

        // Add ALL division materials
        if (allSnapshot.exists()) {
          const allMaterials = allSnapshot.val();
          Object.values(allMaterials).forEach(material => {
            studyMaterialsCache.push({
              ...material,
              division: 'ALL',
              subject: material.subjectName || material.subject
            });
          });
        }

        console.log('Study materials loaded:', studyMaterialsCache.length);

        // Update subject materials grid if on that page
        const subjectsPage = document.getElementById('study-materials-subjects-page');
        if (subjectsPage && subjectsPage.classList.contains('active')) {
          updateSubjectMaterialsGrid();
        }
      });
    };

    // Initial load
    updateMaterialsCache();

    // Set up listeners for real-time updates
    materialsRef.on('value', updateMaterialsCache);
    allMaterialsRef.on('value', updateMaterialsCache);

  } catch (error) {
    console.error('Error loading study materials:', error);
    updateSubjectMaterialsGrid();
  }
}

function getMaterialIcon(type) {
  switch (type) {
    case 'pdf':
      return '<i class="ph ph-file-pdf"></i>';
    case 'doc':
    case 'docx':
      return '<i class="ph ph-file-doc"></i>';
    case 'ppt':
    case 'pptx':
      return '<i class="ph ph-file-presentation"></i>';
    case 'zip':
    case 'rar':
      return '<i class="ph ph-file-zip"></i>';
    case 'image':
      return '<i class="ph ph-image"></i>';
    case 'video':
      return '<i class="ph ph-play-circle"></i>';
    default:
      return '<i class="ph ph-file-text"></i>';
  }
}


async function loadTimelineSchedule(dayKey, actualDate = null) {
  const userData = JSON.parse(localStorage.getItem('userSession'));
  if (!userData || !userData.division) return;

  const division = userData.division;

  // Initialize week calendar first
  updateWeekCalendar();

  // If no day specified, use current day
  if (!dayKey) {
    const today = new Date().getDay();
    dayKey = today === 1 ? 'MON' : today === 2 ? 'TUE' : today === 3 ? 'WED' :
             today === 4 ? 'THU' : today === 5 ? 'FRI' : today === 6 ? 'SAT' : 'MON';
  }

  selectedScheduleDay = dayKey;

  // Check if selected day is a holiday using actual date
  const isHoliday = await checkIfHoliday(dayKey, actualDate);
  if (isHoliday) {
    const timeline = document.querySelector('.timeline');
    if (timeline) {
      timeline.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 80px; margin-bottom: 20px;">🎉</div>
          <h3 style="font-size: 28px; font-weight: 700; margin-bottom: 10px; color: var(--primary-green);">Holiday - ${isHoliday.name}</h3>
          <p style="font-size: 16px; color: var(--text-secondary);">No classes scheduled for this day. Enjoy your holiday!</p>
        </div>
        <button class="btn-timeline" onclick="goToPage('home')">← Back to Home</button>
      `;

      // Update selected day indicator
      document.querySelectorAll('.day-item').forEach(item => {
        if (item.getAttribute('data-day') === dayKey) {
          item.classList.add('selected');
        }
      });
    }
    return;
  }

  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  // Listen for real-time updates from Firebase - use admin panel's data structure
  const schedulesRef = database.ref(`divisions/${division}/schedules/${dayKey}`);
  const subjectsRef = database.ref(`divisions/${division}/subjects`);

  schedulesRef.on('value', async (scheduleSnapshot) => {
    if (!scheduleSnapshot.exists()) {
      timeline.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-primary);">
          <h3>No schedule available</h3>
          <p>Your schedule for ${dayKey} - Division ${division} will appear here once configured by admin.</p>
        </div>
        <button class="btn-timeline" onclick="goToPage('home')">← Back to Home</button>
      `;

      // Update selected day indicator
      document.querySelectorAll('.day-item').forEach(item => {
        if (item.getAttribute('data-day') === dayKey) {
          item.classList.add('selected');
        }
      });
      return;
    }

    // Get subjects data
    const subjectsSnapshot = await subjectsRef.once('value');
    const subjects = subjectsSnapshot.exists() ? subjectsSnapshot.val() : {};

    const schedules = scheduleSnapshot.val();

    // Function to convert 12-hour time to minutes for proper sorting
    const timeToMinutes = (timeStr) => {
      const time = timeStr.split('-')[0].trim(); // Get start time
      const [timePart, period] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const schedulesArray = Object.values(schedules).sort((a, b) =>
      timeToMinutes(a.time) - timeToMinutes(b.time)
    );

    timeline.innerHTML = '';

    schedulesArray.forEach((classItem, index) => {
      const startTime = classItem.time.split('-')[0];
      const subject = subjects[classItem.subjectId] || { name: 'Unknown', teacher: 'Unknown' };

      const timelineItem = document.createElement('div');
      timelineItem.className = 'timeline-item';

      const cardClass = classItem.type === 'green' ? 'green' :
                        classItem.type === 'red' ? 'lunch-break' : '';

      // Check if lecture has ended (only for today's schedule)
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const endTime = classItem.time.split('-')[1].trim();
      const [endTimePart, endPeriod] = endTime.split(' ');
      let [endHours, endMinutes] = endTimePart.split(':').map(Number);

      if (endPeriod === 'PM' && endHours !== 12) endHours += 12;
      if (endPeriod === 'AM' && endHours === 12) endHours = 0;

      const endTimeMinutes = endHours * 60 + endMinutes;

      // Mark as completed based on date (past days show all completed, today shows based on time, future shows none)
      const today = getISTTime();

      // Get the actual date being viewed from the day selector
      const selectedDayElement = document.querySelector(`.day-item[data-day="${dayKey}"]`);
      const selectedDate = selectedDayElement ? selectedDayElement.getAttribute('data-date') : null;

      // Check if selected date is today, past, or future
      const todayDateStr = today.toISOString().split('T')[0];
      const selectedDateObj = new Date(selectedDate);
      const todayDateObj = new Date(todayDateStr);

      // Normalize dates to midnight for comparison
      selectedDateObj.setHours(0, 0, 0, 0);
      todayDateObj.setHours(0, 0, 0, 0);

      let isCompleted = false;
      if (selectedDateObj < todayDateObj) {
        // Past day - show all as completed
        isCompleted = true;
      } else if (selectedDateObj.getTime() === todayDateObj.getTime()) {
        // Today - show based on current time
        isCompleted = currentMinutes >= endTimeMinutes;
      }
      // Future day - isCompleted remains false

      timelineItem.innerHTML = `
        <div class="time-label">${startTime}</div>
        <div class="timeline-card ${cardClass}" data-time-range="${classItem.time}">
          <div class="timeline-time">${classItem.time}</div>
          <h4>${subject.name}</h4>
          <p>${subject.teacher}</p>
          <div class="timeline-check ${isCompleted ? 'completed' : ''}">✓</div>
        </div>
      `;

      timeline.appendChild(timelineItem);

      if (index < schedulesArray.length - 1) {
        const spacer = document.createElement('div');
        spacer.className = 'timeline-item';
        spacer.innerHTML = '<div class="time-label"></div><div class="timeline-spacer"></div>';
        timeline.appendChild(spacer);
      }
    });

    // Start tracking active lecture
    updateActiveLecture();
    if (window.activeLectureInterval) {
      clearInterval(window.activeLectureInterval);
    }
    window.activeLectureInterval = setInterval(updateActiveLecture, 30000); // Update every 30 seconds

    const backButton = document.createElement('button');
    backButton.className = 'btn-timeline';
    backButton.onclick = () => goToPage('home');
    backButton.textContent = '← Back to Home';
    timeline.appendChild(backButton);

    // Update selected day indicator
    document.querySelectorAll('.day-item').forEach(item => {
      if (item.getAttribute('data-day') === dayKey) {
        item.classList.add('selected');
      }
    });
  });
}

let currentMasterDay = 'MON';
let currentMasterDivision = null;

function handleMasterDayChange(dayKey) {
  const divisionScheduleView = document.getElementById('divisionScheduleView');

  if (divisionScheduleView && divisionScheduleView.style.display !== 'none' && currentMasterDivision) {
    // Don't add to history when just switching days in division view
    showDivisionSchedule(currentMasterDivision, dayKey, false);
  } else {
    // Don't add to history when just switching days in grid view
    loadMasterDivisionCards(dayKey, false);
  }
}

function loadMasterDivisionCards(dayKey = 'MON', addToHistory = true) {
  currentMasterDivision = null;
  const DIVISIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  const divisionsGrid = document.getElementById('divisionsGrid');
  const divisionScheduleView = document.getElementById('divisionScheduleView');
  const masterBackBtn = document.getElementById('masterBackBtn');
  const masterMainTitle = document.getElementById('masterMainTitle');
  const masterSubtitle = document.getElementById('masterSubtitle');

  if (!divisionsGrid) return;

  currentMasterDay = dayKey;

  document.querySelectorAll('.master-day-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-day') === dayKey) {
      btn.classList.add('active');
    }
  });

  divisionsGrid.style.display = 'grid';
  divisionScheduleView.style.display = 'none';

  masterBackBtn.onclick = () => goToPage('timeline');
  masterMainTitle.textContent = 'All Division Schedules';
  masterSubtitle.textContent = `Click a division to view ${getDayFullName(dayKey)} schedule`;

  let cardsHTML = '';
  DIVISIONS.forEach((division, index) => {
    cardsHTML += `
      <div class="division-card-item" onclick="showDivisionSchedule('${division}', '${dayKey}')">
        <div class="division-card-letter">${division}</div>
        <div class="division-card-label">Division ${division}</div>
        <div class="division-card-day">${getDayFullName(dayKey)}</div>
      </div>
    `;
  });

  divisionsGrid.innerHTML = cardsHTML;

  // Add to browser history for back button support
  if (addToHistory) {
    history.pushState({
      page: 'master-timetable',
      view: 'grid',
      day: dayKey
    }, '', `#master-timetable`);
  }
}

function getDayFullName(dayKey) {
  const dayNames = {
    'MON': 'Monday',
    'TUE': 'Tuesday',
    'WED': 'Wednesday',
    'THU': 'Thursday',
    'FRI': 'Friday',
    'SAT': 'Saturday'
  };
  return dayNames[dayKey] || dayKey;
}

async function showDivisionSchedule(division, dayKey, addToHistory = true) {
  const divisionsGrid = document.getElementById('divisionsGrid');
  const divisionScheduleView = document.getElementById('divisionScheduleView');
  const masterBackBtn = document.getElementById('masterBackBtn');
  const masterMainTitle = document.getElementById('masterMainTitle');
  const masterSubtitle = document.getElementById('masterSubtitle');

  if (!divisionScheduleView) return;

  currentMasterDivision = division;
  currentMasterDay = dayKey;

  document.querySelectorAll('.master-day-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-day') === dayKey) {
      btn.classList.add('active');
    }
  });

  divisionsGrid.style.display = 'none';
  divisionScheduleView.style.display = 'block';

  masterBackBtn.onclick = () => {
    // Use browser back to properly handle history
    history.back();
  };
  masterMainTitle.textContent = `Division ${division}`;
  masterSubtitle.textContent = `${getDayFullName(dayKey)} Schedule - View Only`;

  divisionScheduleView.innerHTML = '<div style="text-align: center; padding: 40px;"><h3>Loading schedule...</h3></div>';

  // Add to browser history for back button support
  if (addToHistory) {
    history.pushState({
      page: 'master-timetable',
      view: 'division',
      division: division,
      day: dayKey
    }, '', `#master-timetable`);
  }

  const timeToMinutes = (timeStr) => {
    const time = timeStr.split('-')[0].trim();
    const [timePart, period] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  try {
    const schedulesRef = database.ref(`divisions/${division}/schedules/${dayKey}`);
    const subjectsRef = database.ref(`divisions/${division}/subjects`);

    const [scheduleSnapshot, subjectsSnapshot] = await Promise.all([
      schedulesRef.once('value'),
      subjectsRef.once('value')
    ]);

    const subjects = subjectsSnapshot.exists() ? subjectsSnapshot.val() : {};

    let scheduleHTML = '';

    if (scheduleSnapshot.exists()) {
      const schedules = scheduleSnapshot.val();
      const schedulesArray = Object.values(schedules).sort((a, b) =>
        timeToMinutes(a.time) - timeToMinutes(b.time)
      );

      for (const schedule of schedulesArray) {
        const subject = subjects[schedule.subjectId] || { name: 'Unknown', teacher: 'Unknown' };

        let colorClass = '';
        if (schedule.type === 'green') {
          colorClass = 'green';
        } else if (schedule.type === 'red') {
          colorClass = 'lunch-break';
        } else if (schedule.type === 'yellow') {
          colorClass = 'yellow';
        }

        scheduleHTML += `
          <div class="master-schedule-slot ${colorClass}">
            <div class="master-slot-time">${schedule.time}</div>
            <div class="master-slot-subject">${subject.name}</div>
            <div class="master-slot-teacher">👨‍🏫 ${subject.teacher}</div>
          </div>
        `;
      }
    } else {
      scheduleHTML = `
        <div class="division-empty-state">
          <p>No schedule available for Division ${division} on ${getDayFullName(dayKey)}</p>
        </div>
      `;
    }

    divisionScheduleView.innerHTML = scheduleHTML;
  } catch (error) {
    console.error(`Error loading schedule for division ${division}:`, error);
    divisionScheduleView.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--primary-red);"><h3>Error loading schedule</h3></div>';
  }
}

// Make functions globally accessible for onclick handlers
window.goToPage = goToPage;
window.showToast = showToast;
window.closeToast = closeToast;
window.showAlert = showAlert;
window.toggleDropdown = toggleDropdown;
window.selectOption = selectOption;
window.handleLogin = handleLogin;
window.handleAuthentication = handleAuthentication;
window.handleLogout = handleLogout;
window.confirmLogout = confirmLogout;
window.cancelLogout = cancelLogout;
window.toggleProfileMenu = toggleProfileMenu;
window.openAdminPanel = openAdminPanel;
window.openAboutPage = openAboutPage; // Added openAboutPage function
window.toggleTheme = toggleTheme;
window.updateActiveLecture = updateActiveLecture;
window.loadMasterDivisionCards = loadMasterDivisionCards;
window.showDivisionSchedule = showDivisionSchedule;
window.getDayFullName = getDayFullName;
window.handleMasterDayChange = handleMasterDayChange;
window.showCollegeEndedModal = showCollegeEndedModal;
window.closeCollegeEndedModal = closeCollegeEndedModal;
window.loadStudyMaterials = loadStudyMaterials; // Added loadStudyMaterials function
window.openSettingsPage = function() {
  // Get the base path from current URL (works for both local and GitHub Pages)
  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  const settingsUrl = basePath + 'settings.html';

  // Navigate in same window
  window.location.href = settingsUrl;
};

window.toggleChatHistory = toggleChatHistory;
window.loadChatHistory = loadChatHistory;
window.deleteChatHistory = deleteChatHistory;
window.cancelDeleteChat = cancelDeleteChat;
window.confirmDeleteChat = confirmDeleteChat;
window.startNewChat = startNewChat;
window.closeScheduleModal = closeScheduleModal;
window.clearZenAIChat = clearZenAIChat;

// Profile page functions
let isEditingProfile = false;

function openProfilePage() {
  // Close the dropdown
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }

  // Navigate to profile page
  goToPage('profile');

  // Load profile data
  loadProfileData();
}

function loadProfileData() {
  const userData = JSON.parse(localStorage.getItem('userSession'));
  const profilePhoto = localStorage.getItem('profilePhoto');

  if (userData) {
    // Update display name
    const displayName = document.getElementById('profileDisplayName');
    if (displayName) {
      displayName.textContent = userData.studentName;
    }

    // Update edit name input
    const editName = document.getElementById('profileEditName');
    if (editName) {
      editName.value = userData.studentName;
    }

    // Update profile info
    const profileBranch = document.getElementById('profileBranch');
    const profileDivision = document.getElementById('profileDivision');
    const profileYear = document.getElementById('profileYear');

    if (profileBranch) profileBranch.textContent = userData.branch;
    if (profileDivision) profileDivision.textContent = userData.division;
    if (profileYear) profileYear.textContent = userData.year;

    // Update profile photo
    const photoElement = document.getElementById('profilePhoto');
    if (photoElement && profilePhoto) {
      photoElement.innerHTML = `<img src="${profilePhoto}" alt="Profile">`;
    } else if (photoElement) {
      photoElement.innerHTML = '<i class="ph ph-user"></i>';
    }
  }
}

function toggleEditMode() {
  isEditingProfile = !isEditingProfile;

  const displayName = document.getElementById('profileDisplayName');
  const editName = document.getElementById('profileEditName');
  const photoEditBtn = document.getElementById('photoEditBtn');
  const profileActions = document.getElementById('profileActions');
  const editIcon = document.getElementById('editIcon');

  if (isEditingProfile) {
    // Enter edit mode
    displayName.style.display = 'none';
    editName.style.display = 'block';
    photoEditBtn.style.display = 'flex';
    profileActions.style.display = 'flex';
    editIcon.className = 'ph ph-x';
  } else {
    // Exit edit mode
    displayName.style.display = 'block';
    editName.style.display = 'none';
    photoEditBtn.style.display = 'none';
    profileActions.style.display = 'none';
    editIcon.className = 'ph ph-pencil-simple';

    // Reload original data
    loadProfileData();
  }
}

function openPhotoSelector() {
  const photoInput = document.getElementById('photoInput');
  if (photoInput) {
    photoInput.click();
  }
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size should be less than 5MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const photoElement = document.getElementById('profilePhoto');
    if (photoElement) {
      photoElement.innerHTML = `<img src="${e.target.result}" alt="Profile">`;
    }
  };
  reader.readAsDataURL(file);
}

function saveProfileChanges() {
  const editName = document.getElementById('profileEditName');
  const photoElement = document.getElementById('profilePhoto');

  if (!editName) return;

  const newName = editName.value.trim();

  // Validate name
  if (!newName) {
    showToast('Please enter your name', 'error');
    return;
  }

  // Get current user data
  const userData = JSON.parse(localStorage.getItem('userSession'));

  // Update name
  userData.studentName = newName;

  // Save to localStorage
  localStorage.setItem('userSession', JSON.stringify(userData));

  // Save photo if changed
  const imgElement = photoElement.querySelector('img');
  if (imgElement) {
    localStorage.setItem('profilePhoto', imgElement.src);
  }

  // Update display
  loadProfileData();

  // Update main profile picture on home page
  updateMainProfilePicture();

  // Exit edit mode
  toggleEditMode();

  showToast('Profile updated successfully!', 'success');
}

function cancelProfileEdit() {
  toggleEditMode();
}

window.openProfilePage = openProfilePage;
window.loadProfileData = loadProfileData;
window.toggleEditMode = toggleEditMode;
window.openPhotoSelector = openPhotoSelector;
window.handlePhotoUpload = handlePhotoUpload;
window.saveProfileChanges = saveProfileChanges;
window.cancelProfileEdit = cancelProfileEdit;
window.updateMainProfilePicture = updateMainProfilePicture;

// Notification functions
let noticesCache = [];
let shownNotices = new Set(JSON.parse(localStorage.getItem('shownNotices') || '[]'));

function toggleNotifications() {
  const dropdown = document.getElementById('notificationDropdown');
  const backdrop = document.getElementById('notificationBackdrop');
  const isOpen = dropdown.classList.contains('active');

  if (isOpen) {
    closeNotifications();
  } else {
    dropdown.classList.add('active');
    if (backdrop) {
      backdrop.classList.add('active');
    }

    // Add to history for Android back button support
    history.pushState({ notificationOpen: true }, '');
  }

  // Close profile dropdown if open
  const profileDropdown = document.getElementById('profileDropdown');
  if (profileDropdown) {
    profileDropdown.classList.remove('active');
  }
}

function closeNotifications() {
  const dropdown = document.getElementById('notificationDropdown');
  const backdrop = document.getElementById('notificationBackdrop');

  if (dropdown) {
    dropdown.classList.remove('active');
  }
  if (backdrop) {
    backdrop.classList.remove('active');
  }
}

async function checkAndDisplayNotices() {
  try {
    const notificationsRef = database.ref('notifications');

    // Use on for real-time updates
    notificationsRef.on('value', async (snapshot) => {
      if (snapshot.exists()) {
        const notifications = snapshot.val();
        const currentTime = Date.now();

        // Filter out expired notifications and delete them from Firebase
        const validNotifications = [];
        const deletionPromises = [];

        for (const notifId in notifications) {
          const notification = notifications[notifId];

          // Check if notification has expired (older than 7 days)
          if (notification.expiryTimestamp && notification.expiryTimestamp < currentTime) {
            // Delete expired notification from Firebase
            const deleteRef = database.ref(`notifications/${notifId}`);
            deletionPromises.push(deleteRef.remove());
          } else {
            validNotifications.push(notification);
          }
        }

        // Execute all deletions in parallel
        if (deletionPromises.length > 0) {
          await Promise.all(deletionPromises);
          console.log(`Deleted ${deletionPromises.length} expired notifications`);
        }

        // Sort valid notifications by timestamp (newest first)
        noticesCache = validNotifications.sort((a, b) => b.timestamp - a.timestamp);

        // Update notification badge (count all notifications)
        const unreadCount = noticesCache.length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
          if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'block';
          } else {
            badge.style.display = 'none';
          }
        }

        // Show urgent/holiday popups for notices not yet shown
        noticesCache.forEach(notice => {
          if (!shownNotices.has(notice.id)) {
            if (notice.priority === 'urgent') {
              showUrgentNoticePopup(notice);
              shownNotices.add(notice.id);
            } else if (notice.priority === 'holiday') {
              showHolidayNoticePopup(notice);
              shownNotices.add(notice.id);
            }
          }
        });

        // Save shown notices to localStorage
        localStorage.setItem('shownNotices', JSON.stringify(Array.from(shownNotices)));

        // Update notification list
        updateNotificationsList();
      } else {
        // No notifications in database
        noticesCache = [];
        const badge = document.getElementById('notificationBadge');
        if (badge) {
          badge.style.display = 'none';
        }
        updateNotificationsList();
      }
    });
  } catch (error) {
    console.error('Error checking notices:', error);
  }
}

function updateNotificationsList() {
  const notificationsList = document.getElementById('notificationsList');
  if (!notificationsList) return;

  // Show all notifications (urgent, holiday, and normal) in the bell dropdown
  if (noticesCache.length === 0) {
    notificationsList.innerHTML = `
      <div class="notification-empty">
        <p>No notifications</p>
      </div>
    `;
    return;
  }

  let html = '';
  noticesCache.forEach(notice => {
    const date = new Date(notice.timestamp);
    const dateStr = date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Get icon based on priority
    let icon = '📢'; // Normal
    if (notice.priority === 'urgent') {
      icon = '🚨';
    } else if (notice.priority === 'holiday') {
      icon = '🎉';
    }

    html += `
      <div class="notification-item" onclick="openNoticeDetail('${notice.id}')">
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
          <h5>${notice.title}</h5>
          <p>${notice.content.substring(0, 60)}${notice.content.length > 60 ? '...' : ''}</p>
          <span class="notification-time">${dateStr}</span>
        </div>
      </div>
    `;
  });

  notificationsList.innerHTML = html;
}

function showUrgentNoticePopup(notice) {
  const popup = document.getElementById('urgentNoticePopup');
  document.getElementById('urgentNoticeTitle').textContent = notice.title;
  document.getElementById('urgentNoticeContent').textContent = notice.content;

  const attachmentDiv = document.getElementById('urgentNoticeAttachment');
  if (notice.attachment) {
    attachmentDiv.innerHTML = `
      <a href="${notice.attachment.data}" download="${notice.attachment.name}" class="attachment-link">
        📎 ${notice.attachment.name}
      </a>
    `;
    attachmentDiv.style.display = 'block';
  } else {
    attachmentDiv.style.display = 'none';
  }

  popup.classList.add('active');
}

function showHolidayNoticePopup(notice) {
  const popup = document.getElementById('holidayNoticePopup');
  document.getElementById('holidayNoticeTitle').textContent = notice.title;
  document.getElementById('holidayNoticeContent').textContent = notice.content;

  const attachmentDiv = document.getElementById('holidayNoticeAttachment');
  if (notice.attachment) {
    attachmentDiv.innerHTML = `
      <a href="${notice.attachment.data}" download="${notice.attachment.name}" class="attachment-link">
        📎 ${notice.attachment.name}
      </a>
    `;
    attachmentDiv.style.display = 'block';
  } else {
    attachmentDiv.style.display = 'none';
  }

  popup.classList.add('active');
}

function closeUrgentNotice() {
  const popup = document.getElementById('urgentNoticePopup');
  popup.classList.remove('active');
}

function closeHolidayNotice() {
  const popup = document.getElementById('holidayNoticePopup');
  popup.classList.remove('active');
}

function showNormalNoticePopup(notice) {
  const popup = document.getElementById('normalNoticePopup');
  document.getElementById('normalNoticeTitle').textContent = notice.title;
  document.getElementById('normalNoticeContent').textContent = notice.content;

  const attachmentDiv = document.getElementById('normalNoticeAttachment');
  if (notice.attachment) {
    attachmentDiv.innerHTML = `
      <a href="${notice.attachment.data}" download="${notice.attachment.name}" class="attachment-link">
        📎 ${notice.attachment.name}
      </a>
    `;
    attachmentDiv.style.display = 'block';
  } else {
    attachmentDiv.style.display = 'none';
  }

  popup.classList.add('active');
}

function closeNormalNotice() {
  const popup = document.getElementById('normalNoticePopup');
  popup.classList.remove('active');
}

function openNoticeDetail(noticeId) {
  const notice = noticesCache.find(n => n.id === noticeId);
  if (!notice) return;

  // Show appropriate popup based on priority
  if (notice.priority === 'urgent') {
    showUrgentNoticePopup(notice);
  } else if (notice.priority === 'holiday') {
    showHolidayNoticePopup(notice);
  } else if (notice.priority === 'normal') {
    showNormalNoticePopup(notice);
  }

  toggleNotifications(); // Close dropdown
}

function markAllNoticesAsRead() {
  const badge = document.getElementById('notificationBadge');
  if (badge) {
    badge.style.display = 'none';
  }
  showToast('All notifications marked as read', 'success');
}

window.toggleNotifications = toggleNotifications;
window.closeNotifications = closeNotifications;
window.closeUrgentNotice = closeUrgentNotice;
window.closeHolidayNotice = closeHolidayNotice;
window.closeNormalNotice = closeNormalNotice;
window.markAllNoticesAsRead = markAllNoticesAsRead;

// Study Materials functions
let studyMaterialsCache = [];
let studyMaterialsListenerInitialized = false;
let divisionSubjectsCache = [];
let subjectsListenerInitialized = false;

async function loadDivisionSubjects() {
  try {
    const userData = JSON.parse(localStorage.getItem('userSession'));
    if (!userData) {
      console.log('No user data found for subjects');
      updateSubjectMaterialsGrid();
      return;
    }

    // Only attach listeners once
    if (subjectsListenerInitialized) {
      return;
    }
    subjectsListenerInitialized = true;

    const userDivision = userData.division;

    // Listen to both division-specific and ALL division subjects
    const divisionSubjectsRef = database.ref(`divisions/${userDivision}/studySubjects`);
    const allSubjectsRef = database.ref('divisions/ALL/studySubjects');

    const updateSubjectsCache = () => {
      Promise.all([
        divisionSubjectsRef.once('value'),
        allSubjectsRef.once('value')
      ]).then(([divisionSnapshot, allSnapshot]) => {
        divisionSubjectsCache = [];

        // Add division-specific subjects
        if (divisionSnapshot.exists()) {
          const subjects = divisionSnapshot.val();
          divisionSubjectsCache.push(...Object.values(subjects));
        }

        // Add ALL division subjects
        if (allSnapshot.exists()) {
          const subjects = allSnapshot.val();
          divisionSubjectsCache.push(...Object.values(subjects));
        }

        console.log('Division subjects loaded:', divisionSubjectsCache.length);

        // Update subject materials grid if on that page
        const subjectsPage = document.getElementById('study-materials-subjects-page');
        if (subjectsPage && subjectsPage.classList.contains('active')) {
          updateSubjectMaterialsGrid();
        }
      });
    };

    // Initial load
    updateSubjectsCache();

    // Set up listeners for real-time updates
    divisionSubjectsRef.on('value', updateSubjectsCache);
    allSubjectsRef.on('value', updateSubjectsCache);

  } catch (error) {
    console.error('Error loading division subjects:', error);
    updateSubjectMaterialsGrid();
  }
}

async function loadStudyMaterials() {
  try {
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    if (!userSession || !userSession.division) {
      console.log('No user session found for study materials');
      updateSubjectMaterialsGrid();
      return;
    }

    // Only attach listeners once
    if (studyMaterialsListenerInitialized) {
      return;
    }
    studyMaterialsListenerInitialized = true;

    const userDivision = userSession.division;

    // Listen to both division-specific and ALL division materials
    const materialsRef = database.ref(`divisions/${userDivision}/studyMaterials`);
    const allMaterialsRef = database.ref('divisions/ALL/studyMaterials');

    const updateMaterialsCache = () => {
      Promise.all([
        materialsRef.once('value'),
        allMaterialsRef.once('value')
      ]).then(([divisionSnapshot, allSnapshot]) => {
        studyMaterialsCache = [];

        // Add division-specific materials
        if (divisionSnapshot.exists()) {
          const materials = divisionSnapshot.val();
          Object.values(materials).forEach(material => {
            studyMaterialsCache.push({
              ...material,
              division: userDivision,
              subject: material.subjectName || material.subject
            });
          });
        }

        // Add ALL division materials
        if (allSnapshot.exists()) {
          const allMaterials = allSnapshot.val();
          Object.values(allMaterials).forEach(material => {
            studyMaterialsCache.push({
              ...material,
              division: 'ALL',
              subject: material.subjectName || material.subject
            });
          });
        }

        console.log('Study materials loaded:', studyMaterialsCache.length);

        // Update subject materials grid if on that page
        const subjectsPage = document.getElementById('study-materials-subjects-page');
        if (subjectsPage && subjectsPage.classList.contains('active')) {
          updateSubjectMaterialsGrid();
        }
      });
    };

    // Initial load
    updateMaterialsCache();

    // Set up listeners for real-time updates
    materialsRef.on('value', updateMaterialsCache);
    allMaterialsRef.on('value', updateMaterialsCache);

  } catch (error) {
    console.error('Error loading study materials:', error);
    updateSubjectMaterialsGrid();
  }
}

function createSubjectSlug(name) {
  return name.toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function updateSubjectMaterialsGrid() {
  const subjectsGrid = document.getElementById('subjectsMaterialsGrid');
  if (!subjectsGrid) return;

  // Build a Map keyed by subject slug
  const subjectMap = new Map();

  // Seed map with subjects from Firebase (division + ALL)
  divisionSubjectsCache.forEach(subject => {
    const slug = subject.id || createSubjectSlug(subject.name);
    if (!subjectMap.has(slug)) {
      subjectMap.set(slug, {
        name: subject.name,
        slug: slug,
        count: 0,
        materials: []
      });
    }
  });

  // Count materials for each subject
  const uncategorizedMaterials = [];
  studyMaterialsCache.forEach(material => {
    if (!material.subject) {
      uncategorizedMaterials.push(material);
      return;
    }

    const slug = createSubjectSlug(material.subject);
    if (subjectMap.has(slug)) {
      const entry = subjectMap.get(slug);
      entry.count++;
      entry.materials.push(material);
    } else {
      // Material has a subject but it doesn't exist in Firebase subjects
      // Add it to the map as an "unregistered" subject
      subjectMap.set(slug, {
        name: material.subject,
        slug: slug,
        count: 1,
        materials: [material]
      });
    }
  });

  // If nothing to show
  if (subjectMap.size === 0 && uncategorizedMaterials.length === 0) {
    subjectsGrid.innerHTML = `
      <div class="notification-empty">
        <p>No subjects or study materials available</p>
      </div>
    `;
    return;
  }

  // Generate subject cards
  let html = '';

  // Sort subjects by name
  const sortedSubjects = Array.from(subjectMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  sortedSubjects.forEach(subject => {
    html += `
      <div class="subject-material-card" onclick="viewSubjectMaterials('${subject.name}')">
        <div class="subject-icon">📚</div>
        <div class="subject-name">${subject.name}</div>
        <div class="subject-count">${subject.count} Material${subject.count !== 1 ? 's' : ''}</div>
      </div>
    `;
  });

  // Add uncategorized card if there are any
  if (uncategorizedMaterials.length > 0) {
    html += `
      <div class="subject-material-card" onclick="viewUncategorizedMaterials()" style="border-color: var(--primary-yellow);">
        <div class="subject-icon">📦</div>
        <div class="subject-name">Uncategorized</div>
        <div class="subject-count">${uncategorizedMaterials.length} Material${uncategorizedMaterials.length !== 1 ? 's' : ''}</div>
      </div>
    `;
  }

  subjectsGrid.innerHTML = html;
}

// Store current subject for re-rendering when navigating back
let currentViewingSubject = null;

function viewSubjectMaterials(subjectName) {
  console.log('Opening materials for subject:', subjectName);

  goToPage('subject-materials-detail');

  // Wait for page transition and data to be ready
  setTimeout(() => {
    const titleElement = document.getElementById('subjectMaterialsTitle');
    if (titleElement) {
      titleElement.textContent = subjectName;
    }

    const materialsGrid = document.getElementById('subjectMaterialsDetailGrid');
    if (!materialsGrid) {
      console.error('Detail grid not found');
      return;
    }

    // Filter materials for this subject
    const subjectMaterials = studyMaterialsCache.filter(m => {
      const materialSubject = m.subject || m.subjectName || '';
      return materialSubject.toLowerCase() === subjectName.toLowerCase();
    });

    console.log('Filtered materials for', subjectName, ':', subjectMaterials.length);

    if (subjectMaterials.length === 0) {
      materialsGrid.innerHTML = `
        <div class="notification-empty">
          <p>No materials available for this subject yet</p>
        </div>
      `;
      return;
    }

    // Build HTML for all materials
    let html = '';
    subjectMaterials.forEach(material => {
      const date = new Date(material.timestamp);
      const dateStr = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      html += `
        <div class="study-material-card">
          <div class="study-material-header">
            <h5 class="study-material-title">${material.title}</h5>
            <span class="study-material-subject-badge">${material.subject || material.subjectName}</span>
          </div>
          <p class="study-material-description">${material.description || 'No description available'}</p>
          <div class="study-material-meta">
            <span class="study-material-division">Division: ${material.division}</span>
            <span class="study-material-date">${dateStr}</span>
          </div>
          <button class="study-material-view" data-file-url="${material.fileUrl}" data-file-name="${material.fileName}">
            <i class="ph ph-file-text"></i> ${material.fileName}
          </button>
        </div>
      `;
    });

    // Render once
    materialsGrid.innerHTML = html;
  }, 150);
}

function viewUncategorizedMaterials() {
  const uncategorizedMaterials = studyMaterialsCache.filter(m => !m.subject);

  goToPage('subject-materials-detail');

  setTimeout(() => {
    const titleElement = document.getElementById('subjectMaterialsTitle');
    if (titleElement) {
      titleElement.textContent = 'Uncategorized Materials';
    }

    const materialsGrid = document.getElementById('subjectMaterialsDetailGrid');

    if (!materialsGrid) {
      console.error('Detail grid not found');
      return;
    }

    if (uncategorizedMaterials.length === 0) {
      materialsGrid.innerHTML = `
        <div class="notification-empty">
          <p>No uncategorized materials</p>
        </div>
      `;
      return;
    }

    let html = '';
    uncategorizedMaterials.forEach(material => {
      const date = new Date(material.timestamp);
      const dateStr = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      html += `
        <div class="study-material-card">
          <div class="study-material-header">
            <h5 class="study-material-title">${material.title}</h5>
            <span class="study-material-subject-badge" style="background: var(--primary-yellow);">Uncategorized</span>
          </div>
          <p class="study-material-description">${material.description || 'No description available'}</p>
          <div class="study-material-meta">
            <span class="study-material-division">Division: ${material.division}</span>
            <span class="study-material-date">${dateStr}</span>
          </div>
          <button class="study-material-view" data-file-url="${material.fileUrl}" data-file-name="${material.fileName}">
            <i class="ph ph-file-text"></i> ${material.fileName}
          </button>
        </div>
      `;
    });

    materialsGrid.innerHTML = html;
  }, 100);
}


// Handle study material view button clicks
document.addEventListener('click', async function(event) {
  const viewBtn = event.target.closest('.study-material-view');
  if (viewBtn) {
    event.preventDefault();
    const fileUrl = viewBtn.getAttribute('data-file-url');
    const fileName = viewBtn.getAttribute('data-file-name');

    if (fileUrl && fileName) {
      openFilePreview(fileUrl, fileName);
    }
  }
});

// Open file preview using custom viewer
function openFilePreview(fileUrl, fileName) {
  // Detect file type from extension
  const extension = fileName.toLowerCase().split('.').pop();
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const isImage = imageExtensions.includes(extension);

  // Get base path
  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);

  if (isImage) {
    // Store URL and filename for image viewer
    sessionStorage.setItem('imageViewerUrl', fileUrl);
    sessionStorage.setItem('imageViewerName', fileName);
    localStorage.setItem('imageViewerUrl', fileUrl);
    localStorage.setItem('imageViewerName', fileName);

    // Open image viewer
    window.location.href = `${basePath}image-viewer.html`;
  } else {
    // Store URL and filename for PDF viewer
    sessionStorage.setItem('pdfViewerUrl', fileUrl);
    sessionStorage.setItem('pdfViewerName', fileName);
    localStorage.setItem('pdfViewerUrl', fileUrl);
    localStorage.setItem('pdfViewerName', fileName);

    // Open PDF viewer
    window.location.href = `${basePath}pdf-viewer.html`;
  }
}

// Close file preview modal (deprecated, kept for compatibility)
function closeFilePreview() {
  // This function is no longer needed but kept for backward compatibility
  window.history.back();
}

// Initialize FCM notifications (only if user has enabled it in settings)
async function initializeFCM() {
  const userData = localStorage.getItem('userSession');
  const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');

  // Only initialize if user has explicitly enabled push notifications
  if (userData && appSettings.pushNotifications && Notification.permission === 'granted' && window.fcmHandler) {
    const initialized = await window.fcmHandler.initialize();
    if (initialized) {
      console.log('FCM initialized successfully');
    } else {
      console.log('FCM initialization failed');
    }
  }
}

// Initialize session immediately to prevent flash of welcome screen
initializeSession();

// Register Service Worker
registerServiceWorker();

// Initialize on page load - ONLY load essential functions (no Firebase calls)
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  checkUserSession();
  initDateTime(); // Only clock/calendar, no Firebase

  // Defer FCM initialization
  setTimeout(() => {
    initializeFCM();
  }, 2000);
});

// Initialize immediately (in case DOMContentLoaded already fired)
if (document.readyState !== 'loading') {
  registerServiceWorker();
  initTheme();
  checkUserSession();
  initDateTime(); // Only clock/calendar, no Firebase

  // Defer FCM initialization
  setTimeout(() => {
    initializeFCM();
  }, 2000);
}

// Handle back navigation from PDF viewer (bfcache restoration)
window.addEventListener('pageshow', function(event) {
  // Reinitialize theme when page is restored from cache
  if (event.persisted) {
    initTheme();
  }
});

// Close notification dropdown when clicking outside
document.addEventListener('click', function(event) {
  const notificationBtn = document.querySelector('.notification-btn');
  const notificationDropdown = document.getElementById('notificationDropdown');

  if (notificationDropdown && !notificationBtn?.contains(event.target) && !notificationDropdown.contains(event.target)) {
    closeNotifications();
  }
});

// Track if home page data has been loaded
let homePageDataLoaded = false;
let countdownIntervalId = null;

// Listen for navigation events to show schedule modal on home page
window.addEventListener('page:navigated', function(event) {
  const userData = localStorage.getItem('userSession');

  // Load home page data when navigating to home (lazy loading)
  if (event.detail.page === 'home' && userData && !homePageDataLoaded) {
    homePageDataLoaded = true;

    // Defer data loading slightly to let the UI render first
    const loadHomeData = () => {
      // Load notifications
      checkAndDisplayNotices();

      // Load next class countdown
      updateNextClassCountdown();

      // Start countdown interval (every 30 seconds)
      countdownIntervalId = setInterval(() => {
        updateNextClassCountdown();
      }, 30000);
    };

    // Use requestIdleCallback if available, otherwise use setTimeout
    if (window.requestIdleCallback) {
      requestIdleCallback(loadHomeData, { timeout: 500 });
    } else {
      setTimeout(loadHomeData, 100);
    }
  }

  // Show schedule modal when navigating to home page with active session
  // Only show once per page load
  if (event.detail.page === 'home' && userData && !scheduleModalShownOnLoad) {
    scheduleModalShownOnLoad = true;
    setTimeout(() => {
      showScheduleModal();
    }, 500);
  }

  // Re-render subject materials when navigating back to detail page
  if (event.detail.page === 'subject-materials-detail' && currentViewingSubject) {
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      const subjectMaterials = studyMaterialsCache.filter(m => m.subject === currentViewingSubject);
      console.log('Re-rendering subject materials:', currentViewingSubject, subjectMaterials.length);
      if (subjectMaterials.length > 0) {
        renderSubjectMaterials(currentViewingSubject, subjectMaterials);
      } else {
        // If cache is empty, try reloading materials
        console.log('Materials cache empty, reloading...');
        setTimeout(() => {
          const materials = studyMaterialsCache.filter(m => m.subject === currentViewingSubject);
          renderSubjectMaterials(currentViewingSubject, materials);
        }, 200);
      }
    });
  }
});

// Zen AI Chat Functionality
let zenAIChatHistory = [];
let groqConfig = null;
let currentChatId = null;
let allChatHistories = [];

async function loadGroqConfig() {
  try {
    const configRef = database.ref('config/groq');
    const snapshot = await configRef.once('value');

    if (snapshot.exists()) {
      groqConfig = snapshot.val();
    }

    // Load chat histories from localStorage
    loadAllChatHistories();

    return snapshot.exists();
  } catch (error) {
    console.error('Error loading Groq config:', error);
    return false;
  }
}

function loadAllChatHistories() {
  const saved = localStorage.getItem('zenAIChatHistories');
  if (saved) {
    allChatHistories = JSON.parse(saved);
  } else {
    allChatHistories = [];
  }
}

function saveAllChatHistories() {
  localStorage.setItem('zenAIChatHistories', JSON.stringify(allChatHistories));
}

function toggleChatHistory() {
  const sidebar = document.getElementById('chatHistorySidebar');
  const backdrop = document.getElementById('chatHistoryBackdrop');

  sidebar.classList.toggle('active');
  backdrop.classList.toggle('active');

  if (sidebar.classList.contains('active')) {
    renderChatHistory();
  }
}

function renderChatHistory() {
  const listContainer = document.getElementById('chatHistoryList');

  if (allChatHistories.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-history">
        <p>No chat history yet</p>
      </div>
    `;
    return;
  }

  let html = '';
  allChatHistories.slice().reverse().forEach(chat => {
    const date = new Date(chat.timestamp);
    const dateStr = date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const firstMessage = chat.messages.find(m => m.role === 'user');
    const preview = firstMessage ? firstMessage.content.substring(0, 60) + (firstMessage.content.length > 60 ? '...' : '') : 'New conversation';

    html += `
      <div class="history-item" onclick="loadChatHistory('${chat.id}')">
        <div class="history-item-header">
          <h4 class="history-item-title">${chat.title}</h4>
          <span class="history-item-date">${dateStr}</span>
        </div>
        <p class="history-item-preview">${preview}</p>
        <div class="history-item-actions">
          <button class="btn-delete-history" onclick="event.stopPropagation(); deleteChatHistory('${chat.id}')">
            <i class="ph ph-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html;
}

function loadChatHistory(chatId) {
  const chat = allChatHistories.find(c => c.id === chatId);
  if (!chat) return;

  // Save current chat if it has messages
  saveCurrentChat();

  // Load the selected chat
  currentChatId = chatId;
  zenAIChatHistory = [...chat.messages];

  // Hide welcome screen and render messages
  hideWelcomeScreen();
  const messagesContainer = document.getElementById('zenAIChatMessages');
  messagesContainer.innerHTML = '';

  zenAIChatHistory.forEach(msg => {
    if (msg.role === 'user') {
      displayUserMessage(msg.content);
    } else if (msg.role === 'ai') {
      displayAIMessage(msg.content);
    }
  });

  toggleChatHistory();
}

let pendingDeleteChatId = null;

function deleteChatHistory(chatId) {
  pendingDeleteChatId = chatId;
  const modal = document.getElementById('deleteChatModal');
  modal.classList.add('active');
}

function cancelDeleteChat() {
  pendingDeleteChatId = null;
  const modal = document.getElementById('deleteChatModal');
  modal.classList.remove('active');
}

function confirmDeleteChat() {
  if (pendingDeleteChatId) {
    allChatHistories = allChatHistories.filter(c => c.id !== pendingDeleteChatId);
    saveAllChatHistories();
    renderChatHistory();
    showToast('Chat deleted successfully', 'success');
    pendingDeleteChatId = null;
  }

  const modal = document.getElementById('deleteChatModal');
  modal.classList.remove('active');
}

function startNewChat() {
  // Save current chat if it has messages
  saveCurrentChat();

  // Create new chat
  currentChatId = Date.now().toString();
  zenAIChatHistory = [];

  // Clear the UI
  const messagesContainer = document.getElementById('zenAIChatMessages');
  messagesContainer.innerHTML = '';

  const welcomeScreen = document.getElementById('zenAIWelcome');
  if (welcomeScreen) {
    welcomeScreen.style.display = 'flex';
  }

  toggleChatHistory();
  showToast('Started new chat', 'success');
}

function saveCurrentChat() {
  // Only save if there are messages and it's not already saved
  if (zenAIChatHistory.length === 0) return;

  const existingChatIndex = allChatHistories.findIndex(c => c.id === currentChatId);

  const firstUserMessage = zenAIChatHistory.find(m => m.role === 'user');
  const title = firstUserMessage ? firstUserMessage.content.substring(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '') : 'New conversation';

  const chatData = {
    id: currentChatId,
    title: title,
    messages: [...zenAIChatHistory],
    timestamp: Date.now()
  };

  if (existingChatIndex >= 0) {
    allChatHistories[existingChatIndex] = chatData;
  } else {
    allChatHistories.push(chatData);
  }

  saveAllChatHistories();
}

function clearZenAIChat() {
  startNewChat();
}

async function sendZenAIMessage() {
  const input = document.getElementById('zenAIInput');
  const message = input.value.trim();

  if (!message) return;

  // Initialize chat ID if new chat
  if (!currentChatId) {
    currentChatId = Date.now().toString();
  }

  hideWelcomeScreen();
  displayUserMessage(message);
  input.value = '';

  // Reset textarea height
  input.style.height = 'auto';
  input.style.height = '50px';

  setTimeout(async () => {
    showTypingIndicator();

    if (!groqConfig) {
      await loadGroqConfig();
    }

    await generateGroqAIResponse(message);

    // Save chat after AI response
    saveCurrentChat();
  }, 300);
}

function sendSuggestion(suggestion) {
  const input = document.getElementById('zenAIInput');
  input.value = suggestion;
  sendZenAIMessage();
}

function displayUserMessage(message) {
  const messagesContainer = document.getElementById('zenAIChatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'zen-ai-message user';
  messageDiv.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-content">${escapeHtml(message)}</div>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  zenAIChatHistory.push({ role: 'user', content: message });
}

function displayAIMessage(message) {
  const messagesContainer = document.getElementById('zenAIChatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'zen-ai-message ai';
  messageDiv.innerHTML = `
    <div class="message-avatar"><img src="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3e%3ctitle%3eZendesk%3c/title%3e%3cpath fill='black' d='M12.914 2.904V16.29L24 2.905zM0 2.906C0 5.966 2.483 8.45 5.543 8.45s5.542-2.484 5.543-5.544zm11.086 4.807L0 21.096h11.086zm7.37 7.84a5.54 5.54 0 0 0-5.542 5.543H24c0-3.06-2.48-5.543-5.543-5.543z'/%3e%3c/svg%3e" alt="Zen AI" style="width: 24px; height: 24px;" /></div>
    <div class="message-content">${formatAIMessage(message)}</div>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  zenAIChatHistory.push({ role: 'ai', content: message });
}

function showTypingIndicator() {
  const messagesContainer = document.getElementById('zenAIChatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'zen-ai-message ai';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-avatar"><img src="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3e%3ctitle%3eZendesk%3c/title%3e%3cpath fill='black' d='M12.914 2.904V16.29L24 2.905zM0 2.906C0 5.966 2.483 8.45 5.543 8.45s5.542-2.484 5.543-5.544zm11.086 4.807L0 21.096h11.086zm7.37 7.84a5.54 5.54 0 0 0-5.542 5.543H24c0-3.06-2.48-5.543-5.543-5.543z'/%3e%3c/svg%3e" alt="Zen AI" style="width: 24px; height: 24px;" /></div>
    <div class="message-content">
      <div class="message-typing">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

function hideWelcomeScreen() {
  const welcomeScreen = document.getElementById('zenAIWelcome');
  if (welcomeScreen) {
    welcomeScreen.style.display = 'none';
  }
}

async function generateGroqAIResponse(userMessage) {
  try {
    // Check if API key is configured
    if (!groqConfig || !groqConfig.apiKey) {
      hideTypingIndicator();
      displayAIMessage('I guess my master forgot to turn me on.');
      return;
    }

    // Check internet connection
    if (!navigator.onLine) {
      hideTypingIndicator();
      displayAIMessage('Can you please turn on your internet?');
      return;
    }

    const userData = JSON.parse(localStorage.getItem('userSession'));
    const modelName = groqConfig.model || 'llama-3.3-70b-versatile';
    const modelDisplayNames = {
      'llama-3.3-70b-versatile': 'Zen-Alpha (Llama 3.3 70B Versatile)',
      'meta-llama/llama-4-maverick-17b-128e-instruct': 'Zen-Beta (Llama 4 Maverick 17B)',
      'llama-3.1-8b-instant': 'Zen-Gamma (Llama 3.1 8B Instant)',
      'groq/compound': 'Zen-Omega (Groq Compound)'
    };
    const modelDisplay = modelDisplayNames[modelName] || modelName;

    const systemPrompt = `You are Zen AI, an intelligent academic assistant for TimeZen college app. You are powered by ${modelDisplay} running on Groq's ultra-fast inference platform.

USER CONTEXT:
- Student: ${userData?.studentName || 'a student'}
- Branch: ${userData?.branch || 'Engineering'}
- Division: ${userData?.division || 'N/A'}
- Academic Year: ${userData?.year || 'studying'}

YOUR CAPABILITIES:
1. **Academic Excellence**: Provide accurate, step-by-step solutions to math, physics, chemistry, programming, and engineering problems
2. **Study Support**: Class schedules, exam preparation, study techniques, time management
3. **Problem Solving**: Break down complex problems into understandable steps
4. **Subject Expertise**: Engineering, mathematics, sciences, programming, and general academics
5. **Productivity**: Time management, study planning, productivity tips

RESPONSE GUIDELINES:
- For math/technical questions: Show step-by-step working, explain reasoning clearly
- For complex topics: Break them down into simpler concepts
- For calculations: Double-check accuracy before responding
- For study help: Provide practical, actionable advice
- Be precise, accurate, and thorough - no shortcuts or approximations
- If unsure, acknowledge limitations and suggest resources or approaches
- Use clear formatting with bullet points, numbered steps, or sections when helpful
- Include relevant formulas, theorems, or principles when applicable

RESPONSE STYLE:
- Professional yet friendly
- Clear and well-structured
- Use emojis sparingly (only when they add value)
- Prioritize accuracy over speed
- Explain your reasoning

When asked about technical details or capabilities, be transparent about being ${modelDisplay} and your strengths/limitations.

Remember: Quality and accuracy are paramount. Take time to think through problems carefully.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...zenAIChatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: groqConfig.model || 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.3,
        max_tokens: 1500,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      // Check for token/rate limit or server errors
      if (response.status === 429 || response.status >= 500) {
        hideTypingIndicator();
        displayAIMessage('I guess my server is blown up, I will be back soon.');
        return;
      }

      // Check for authentication errors (invalid API key)
      if (response.status === 401 || response.status === 403) {
        hideTypingIndicator();
        displayAIMessage('I guess my master forgot to turn me on.');
        return;
      }

      throw new Error('Groq API request failed');
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;

    // Validate response quality
    if (!aiResponse || aiResponse.trim().length < 10) {
      aiResponse = "I apologize, but I couldn't generate a proper response. Could you please rephrase your question or provide more details?";
    }

    // Check if response seems like hallucination or low quality
    const lowQualityIndicators = [
      /I don't have|I cannot|I'm not able to/i,
      /as an AI/i,
      /I apologize, but I/i
    ];

    const seemsLowQuality = lowQualityIndicators.some(pattern => 
      pattern.test(aiResponse) && aiResponse.length < 100
    );

    if (seemsLowQuality && userMessage.length > 20) {
      // For complex questions that got a short "I can't help" response, try to be more helpful
      aiResponse += "\n\n💡 **Tip**: For complex problems, try breaking them down into smaller parts, or let me know what specific aspect you'd like help with!";
    }

    await trackTokenUsage(modelName);

    hideTypingIndicator();
    displayAIMessage(aiResponse);
  } catch (error) {
    console.error('Error calling Groq API:', error);
    hideTypingIndicator();

    // Check if it's a network error
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      displayAIMessage('Can you please turn on your internet?');
    } else {
      displayAIMessage('I guess my server is blown up, I will be back soon.');
    }
  }
}

function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime;
}

async function cleanupOldUsageData() {
  try {
    if (!window.database) return;

    const today = getISTTime();
    const usageRootRef = window.database.ref('config/groq/usage');
    const snapshot = await usageRootRef.once('value');

    if (snapshot.exists()) {
      const allDates = snapshot.val();
      const deletePromises = [];

      for (const date in allDates) {
        if (date !== today) {
          deletePromises.push(usageRootRef.child(date).remove());
        }
      }

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`Cleaned up ${deletePromises.length} old usage records`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old usage data:', error);
  }
}

async function trackTokenUsage(modelName) {
  try {
    if (!window.database) {
      console.error('Database not initialized');
      return;
    }

    await cleanupOldUsageData();

    const todayDate = getISTTime();
    const today = todayDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const safeModelName = modelName.replace(/\//g, '_');
    const usageRef = window.database.ref(`config/groq/usage/${today}/${safeModelName}`);

    await usageRef.transaction((currentCount) => {
      return (currentCount || 0) + 1;
    });
  } catch (error) {
    console.error('Error tracking token usage:', error.message || error);
  }
}

function clearZenAIChat() {
  if (confirm('Are you sure you want to clear the chat history?')) {
    const messagesContainer = document.getElementById('zenAIChatMessages');
    messagesContainer.innerHTML = '';
    const welcomeScreen = document.getElementById('zenAIWelcome');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
    }
    zenAIChatHistory = [];
    showToast('Chat cleared successfully', 'success');
  }
}

function handleZenAIKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendZenAIMessage();
  }
  // Auto-resize textarea
  setTimeout(() => {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  }, 0);
}

// Add paste event handler for proper Unicode support
function handleZenAIPaste(event) {
  // Allow default paste behavior for all characters including Unicode
  setTimeout(() => {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  }, 0);
}

function formatAIMessage(text) {
  // Escape HTML first
  const div = document.createElement('div');
  div.textContent = text;
  let formatted = div.innerHTML;

  // Convert markdown-style formatting
  // Bold text: **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic text: *text* or _text_
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');

  // Code blocks: `code`
  formatted = formatted.replace(/`(.+?)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');

  // Bullet points: - item or * item
  formatted = formatted.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin: 8px 0; padding-left: 20px;">$&</ul>');

  // Numbered lists: 1. item
  formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Convert line breaks
  formatted = formatted.replace(/\n\n/g, '<br><br>');
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

window.sendZenAIMessage = sendZenAIMessage;
window.sendSuggestion = sendSuggestion;
window.clearZenAIChat = clearZenAIChat;
window.handleZenAIKeyPress = handleZenAIKeyPress;
window.handleZenAIPaste = handleZenAIPaste;
// ========================================
// Community Doubts Functionality - WhatsApp-like Interface
// ========================================

let communityAttachedFiles = [];
let currentViewingDoubtId = null;

// Initialize community page
function initCommunityPage() {
  const userData = JSON.parse(localStorage.getItem('userSession'));
  if (!userData) {
    goToPage('welcome');
    return;
  }

  const division = userData.division;
  const communityFilterText = document.getElementById('communityFilterText');
  const communityDivisionTag = document.getElementById('communityDivisionTag');
  
  if (communityFilterText) {
    communityFilterText.textContent = `Div ${division}`;
  }
  
  if (communityDivisionTag) {
    communityDivisionTag.textContent = `Div ${division}`;
  }

  communityAttachedFiles = [];
  updateAttachedFilesPreview();

  const inputField = document.getElementById('communityDoubtInput');
  if (inputField) {
    inputField.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendDoubtFromInput();
      }
    });
  }

  loadCommunityDoubts(division);
}

// Load doubts for specific division
async function loadCommunityDoubts(division) {
  const doubtsFeed = document.getElementById('doubtsFeed');
  if (!doubtsFeed) return;

  doubtsFeed.innerHTML = `
    <div class="doubts-loading">
      <div class="spinner"></div>
      <p>Loading doubts...</p>
    </div>
  `;

  try {
    const doubtsRef = database.ref(`community/doubts/${division}`);
    const snapshot = await doubtsRef.orderByChild('timestamp').once('value');
    
    if (!snapshot.exists()) {
      doubtsFeed.innerHTML = `
        <div class="doubts-empty">
          <i class="ph ph-chats-circle"></i>
          <h3>No Doubts Yet</h3>
          <p>Be the first to ask a doubt in your division!</p>
        </div>
      `;
      return;
    }

    const doubts = [];
    snapshot.forEach((childSnapshot) => {
      doubts.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    doubts.reverse();

    let doubtsHTML = '';
    for (const doubt of doubts) {
      const repliesCount = doubt.replies ? Object.keys(doubt.replies).length : 0;
      const attachmentsCount = doubt.attachments ? doubt.attachments.length : 0;
      
      let attachmentsPreviewHTML = '';
      if (doubt.attachments && doubt.attachments.length > 0) {
        attachmentsPreviewHTML = '<div class="doubt-attachments-preview">';
        doubt.attachments.slice(0, 3).forEach(att => {
          if (att.type.startsWith('image/')) {
            attachmentsPreviewHTML += `
              <div class="attachment-preview">
                <img src="${att.url}" alt="Attachment">
              </div>
            `;
          } else if (att.type === 'application/pdf') {
            attachmentsPreviewHTML += `
              <div class="attachment-preview pdf">
                <i class="ph ph-file-pdf"></i>
              </div>
            `;
          }
        });
        if (doubt.attachments.length > 3) {
          attachmentsPreviewHTML += `<div class="attachment-preview">+${doubt.attachments.length - 3}</div>`;
        }
        attachmentsPreviewHTML += '</div>';
      }

      const timeAgo = getTimeAgo(doubt.timestamp);

      doubtsHTML += `
        <div class="doubt-card" onclick="viewDoubt('${doubt.id}', '${division}')">
          <div class="doubt-card-header">
            <div class="doubt-author-avatar">
              <i class="ph ph-user"></i>
            </div>
            <div class="doubt-author-info">
              <div class="doubt-author-name">${doubt.authorName}</div>
              <div class="doubt-meta">
                <span><i class="ph ph-clock"></i> ${timeAgo}</span>
                <span><i class="ph ph-graduation-cap"></i> Division ${division}</span>
              </div>
            </div>
          </div>
          <h3 class="doubt-card-title">${doubt.title}</h3>
          <p class="doubt-card-description">${doubt.description}</p>
          ${attachmentsPreviewHTML}
          <div class="doubt-card-footer">
            <div class="doubt-stat">
              <i class="ph ph-chat-circle"></i>
              <span>${repliesCount} ${repliesCount === 1 ? 'Reply' : 'Replies'}</span>
            </div>
            ${attachmentsCount > 0 ? `
              <div class="doubt-stat">
                <i class="ph ph-paperclip"></i>
                <span>${attachmentsCount} ${attachmentsCount === 1 ? 'Attachment' : 'Attachments'}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    doubtsFeed.innerHTML = doubtsHTML;
  } catch (error) {
    console.error('Error loading doubts:', error);
    doubtsFeed.innerHTML = `
      <div class="doubts-empty">
        <i class="ph ph-warning-circle"></i>
        <h3>Error Loading Doubts</h3>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

// Handle file selection for community
function handleCommunityFileSelect(event) {
  const files = Array.from(event.target.files);
  
  for (const file of files) {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size should be less than 10MB', 'error');
        continue;
      }
      
      if (communityAttachedFiles.length >= 5) {
        showToast('Maximum 5 files allowed', 'error');
        break;
      }
      
      communityAttachedFiles.push(file);
    } else {
      showToast('Only images and PDFs are allowed', 'error');
    }
  }
  
  updateAttachedFilesPreview();
  event.target.value = '';
}

// Update attached files preview
function updateAttachedFilesPreview() {
  const container = document.getElementById('attachedFilesPreview');
  if (!container) return;

  if (communityAttachedFiles.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  let html = '';
  
  communityAttachedFiles.forEach((file, index) => {
    const isPdf = file.type === 'application/pdf';
    
    if (isPdf) {
      html += `
        <div class="attached-file-item pdf-file">
          <i class="ph ph-file-pdf"></i>
          <span>${file.name.substring(0, 10)}...</span>
          <button class="remove-attached-file" onclick="removeCommunityFile(${index})">×</button>
        </div>
      `;
    } else {
      const reader = new FileReader();
      reader.onload = (function(idx) {
        return function(e) {
          const preview = document.querySelector(`[data-file-index="${idx}"]`);
          if (preview) {
            preview.innerHTML = `
              <img src="${e.target.result}" alt="Preview">
              <button class="remove-attached-file" onclick="removeCommunityFile(${idx})">×</button>
            `;
          }
        };
      })(index);
      reader.readAsDataURL(file);
      
      html += `
        <div class="attached-file-item" data-file-index="${index}">
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; opacity: 0.5;">
            <i class="ph ph-image"></i>
          </div>
          <button class="remove-attached-file" onclick="removeCommunityFile(${index})">×</button>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

// Remove file from community attachments
function removeCommunityFile(index) {
  communityAttachedFiles.splice(index, 1);
  updateAttachedFilesPreview();
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Send doubt from input field (WhatsApp-like)
async function sendDoubtFromInput() {
  const userData = JSON.parse(localStorage.getItem('userSession'));
  if (!userData) {
    showToast('Please login first', 'error');
    return;
  }

  const inputField = document.getElementById('communityDoubtInput');
  const description = inputField.value.trim();

  if (!description && communityAttachedFiles.length === 0) {
    showToast('Please write something or attach files', 'error');
    return;
  }

  const division = userData.division;
  const doubtId = 'doubt_' + Date.now();

  const sendBtn = document.querySelector('.send-btn');
  if (sendBtn) {
    sendBtn.disabled = true;
  }

  try {
    let attachments = [];

    if (communityAttachedFiles.length > 0) {
      showToast('Uploading files...', 'info');
      
      for (const file of communityAttachedFiles) {
        const fileRef = storage.ref(`community/${division}/${doubtId}/${file.name}`);
        const uploadTask = await fileRef.put(file);
        const downloadURL = await uploadTask.ref.getDownloadURL();
        
        attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: downloadURL
        });
      }
    }

    const title = description.substring(0, 50) + (description.length > 50 ? '...' : '');

    const doubtData = {
      id: doubtId,
      title: title,
      description: description || 'Attachment',
      authorName: userData.studentName,
      division: division,
      timestamp: Date.now(),
      attachments: attachments,
      replies: {}
    };

    await database.ref(`community/doubts/${division}/${doubtId}`).set(doubtData);

    inputField.value = '';
    communityAttachedFiles = [];
    updateAttachedFilesPreview();
    
    showToast('Posted successfully!', 'success');
    loadCommunityDoubts(division);

  } catch (error) {
    console.error('Error posting doubt:', error);
    showToast('Error posting. Please try again.', 'error');
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
    }
  }
}

// View doubt details
async function viewDoubt(doubtId, division) {
  currentViewingDoubtId = doubtId;
  const modal = document.getElementById('viewDoubtModal');
  const modalBody = document.getElementById('viewDoubtBody');
  const modalTitle = document.getElementById('viewDoubtTitle');
  
  if (!modal || !modalBody) return;

  modal.classList.add('active');
  modalBody.innerHTML = `
    <div class="doubt-details-loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  `;

  try {
    const doubtRef = database.ref(`community/doubts/${division}/${doubtId}`);
    const snapshot = await doubtRef.once('value');
    
    if (!snapshot.exists()) {
      modalBody.innerHTML = '<p>Doubt not found.</p>';
      return;
    }

    const doubt = snapshot.val();
    modalTitle.textContent = doubt.title;

    const timeAgo = getTimeAgo(doubt.timestamp);
    
    let attachmentsHTML = '';
    if (doubt.attachments && doubt.attachments.length > 0) {
      attachmentsHTML = '<div class="doubt-attachments-full">';
      doubt.attachments.forEach(att => {
        if (att.type.startsWith('image/')) {
          attachmentsHTML += `
            <div class="attachment-full" onclick="window.open('${att.url}', '_blank')">
              <img src="${att.url}" alt="${att.name}">
            </div>
          `;
        } else if (att.type === 'application/pdf') {
          attachmentsHTML += `
            <div class="attachment-full pdf-attachment" onclick="window.open('${att.url}', '_blank')">
              <i class="ph ph-file-pdf"></i>
              <span>${att.name}</span>
            </div>
          `;
        }
      });
      attachmentsHTML += '</div>';
    }

    let repliesHTML = '';
    if (doubt.replies && Object.keys(doubt.replies).length > 0) {
      repliesHTML = `
        <div class="replies-section">
          <div class="replies-header">
            <i class="ph ph-chat-circle-text"></i>
            <span>${Object.keys(doubt.replies).length} ${Object.keys(doubt.replies).length === 1 ? 'Reply' : 'Replies'}</span>
          </div>
          <div class="replies-list">
      `;

      const repliesArray = Object.values(doubt.replies).sort((a, b) => a.timestamp - b.timestamp);
      
      repliesArray.forEach(reply => {
        const replyTimeAgo = getTimeAgo(reply.timestamp);
        repliesHTML += `
          <div class="reply-item">
            <div class="reply-header">
              <div class="reply-avatar">
                <i class="ph ph-user"></i>
              </div>
              <div class="reply-author">
                <div class="reply-author-name">${reply.authorName}</div>
              </div>
              <div class="reply-time">${replyTimeAgo}</div>
            </div>
            <div class="reply-text">${reply.text}</div>
          </div>
        `;
      });

      repliesHTML += '</div></div>';
    }

    modalBody.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="width: 48px; height: 48px; background: var(--primary-blue); border: 2px solid var(--black); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
            <i class="ph ph-user"></i>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 16px;">${doubt.authorName}</div>
            <div style="font-size: 13px; opacity: 0.6;">
              <i class="ph ph-clock"></i> ${timeAgo} • Division ${division}
            </div>
          </div>
        </div>
        <div class="doubt-full-description">${doubt.description}</div>
        ${attachmentsHTML}
      </div>
      ${repliesHTML}
    `;

  } catch (error) {
    console.error('Error loading doubt:', error);
    modalBody.innerHTML = '<p>Error loading doubt details.</p>';
  }
}

// Close view doubt modal
function closeViewDoubtModal() {
  const modal = document.getElementById('viewDoubtModal');
  if (modal) {
    modal.classList.remove('active');
    currentViewingDoubtId = null;
    document.getElementById('replyText').value = '';
  }
}

// Submit reply
async function submitReply() {
  const userData = JSON.parse(localStorage.getItem('userSession'));
  if (!userData) {
    showToast('Please login first', 'error');
    return;
  }

  if (!currentViewingDoubtId) {
    showToast('Error: No doubt selected', 'error');
    return;
  }

  const replyText = document.getElementById('replyText').value.trim();
  
  if (!replyText) {
    showToast('Please write a reply', 'error');
    return;
  }

  const division = userData.division;
  const replyId = 'reply_' + Date.now();

  try {
    const replyData = {
      id: replyId,
      text: replyText,
      authorName: userData.studentName,
      timestamp: Date.now()
    };

    await database.ref(`community/doubts/${division}/${currentViewingDoubtId}/replies/${replyId}`).set(replyData);

    showToast('Reply posted!', 'success');
    document.getElementById('replyText').value = '';
    
    viewDoubt(currentViewingDoubtId, division);

  } catch (error) {
    console.error('Error posting reply:', error);
    showToast('Error posting reply. Please try again.', 'error');
  }
}

// Get time ago string
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Initialize community when page loads
document.addEventListener('DOMContentLoaded', function() {
  const currentPage = document.querySelector('.page.active');
  if (currentPage && currentPage.id === 'community-page') {
    initCommunityPage();
  }
});

