// Firebase configuration is assumed to be handled by a global script tag for CDN usage.
// For example, in your index.html:
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
// <script>
//   var firebaseConfig = {
//     apiKey: "YOUR_API_KEY",
//     authDomain: "YOUR_AUTH_DOMAIN",
//     databaseURL: "YOUR_DATABASE_URL",
//     projectId: "YOUR_PROJECT_ID",
//     storageBucket: "YOUR_STORAGE_BUCKET",
//     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//     appId: "YOUR_APP_ID"
//   };
//   firebase.initializeApp(firebaseConfig);
//   var database = firebase.database(); // Use this global 'database' object
// </script>

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

let currentDivision = null;
let currentDay = null;
let editingSubjectId = null;
let editingSlotId = null;

const ALL_DIVISION = 'ALL';
const DIVISIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
const DAYS = [
  { code: 'MON', name: 'Monday' },
  { code: 'TUE', name: 'Tuesday' },
  { code: 'WED', name: 'Wednesday' },
  { code: 'THU', name: 'Thursday' },
  { code: 'FRI', name: 'Friday' },
  { code: 'SAT', name: 'Saturday' }
];

let divisionCompletionStatus = {};

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

function goToAdminPage(pageName) {
  const pages = document.querySelectorAll('.admin-page');
  pages.forEach(page => page.classList.remove('active'));

  const targetPage = document.getElementById(pageName);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // Load division cards when navigating to schedule-manager
  if (pageName === 'schedule-manager') {
    loadDivisionCards();
  }

  // Load notices when navigating to post-notice
  if (pageName === 'post-notice') {
    loadNotices();
  }

  // Load holidays when navigating to post-holiday
  if (pageName === 'post-holiday') {
    loadHolidays();
  }

  // Load backpack division cards when navigating to backpack-manager
  if (pageName === 'backpack-manager') {
    loadBackpackDivisionCards();
  }
}

function handleAdminLogin(event) {
  event.preventDefault();

  const username = document.getElementById('admin-username').value;
  const password = document.getElementById('admin-password').value;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    localStorage.setItem('adminSession', 'true');
    goToAdminPage('admin-dashboard');
    showToast('Login successful!', 'success');
  } else {
    showToast('Invalid credentials!', 'error');
  }
}

function handleAdminLogout() {
  localStorage.removeItem('adminSession');
  goToAdminPage('admin-login');
  showToast('Logged out successfully', 'info');
}

function checkAdminSession() {
  const isAdmin = localStorage.getItem('adminSession');
  if (isAdmin) {
    goToAdminPage('admin-dashboard');
  }
}

async function loadDivisionCards() {
  const divisionGrid = document.getElementById('divisionGrid');

  try {
    const completionRef = database.ref('divisionCompletion');
    const snapshot = await completionRef.once('value');
    divisionCompletionStatus = snapshot.exists() ? snapshot.val() : {};

    let html = '';
    DIVISIONS.forEach((division) => {
      const isCompleted = divisionCompletionStatus[division] === true;
      const completedClass = isCompleted ? 'completed' : '';

      html += `
        <div class="division-card ${completedClass}">
          <div class="division-content" onclick="openDivision('${division}')">
            <div class="division-letter">${division}</div>
            <div class="division-name">Division ${division}</div>
          </div>
          <button class="btn-done ${isCompleted ? 'active' : ''}" onclick="toggleDivisionCompletion(event, '${division}')">
            ${isCompleted ? '✓ Done' : 'Done'}
          </button>
        </div>
      `;
    });

    divisionGrid.innerHTML = html;
  } catch (error) {
    console.error('Error loading division cards:', error);
    showToast('Error loading divisions', 'error');
  }
}

async function openDivision(division) {
  currentDivision = division;
  document.getElementById('divisionTitle').textContent = `Division ${division}`;
  goToAdminPage('division-detail');
  await loadSubjects();
}

async function loadSubjects() {
  const subjectsList = document.getElementById('subjectsList');

  try {
    const subjectsRef = database.ref(`divisions/${currentDivision}/subjects`);
    const snapshot = await subjectsRef.once('value');
    let html = '';
    if (snapshot.exists()) {
      const subjects = snapshot.val();
      Object.keys(subjects).forEach(subjectId => {
        const subject = subjects[subjectId];
        html += `
          <div class="subject-card">
            <div class="subject-info">
              <div class="subject-name">${subject.name}</div>
              <div class="subject-teacher">Teacher: ${subject.teacher}</div>
            </div>
            <div class="subject-actions">
              <button class="btn-edit-small" onclick="editSubject('${subjectId}')">
                Edit
              </button>
              <button class="btn-delete-small" onclick="deleteSubject('${subjectId}')">
                ✕
              </button>
            </div>
          </div>
        `;
      });
    } else {
      html = `
        <div class="empty-state">
          <p>No subjects added yet. Click "Add Subject" to get started.</p>
        </div>
      `;
    }

    subjectsList.innerHTML = html;
  } catch (error) {
    console.error('Error loading subjects:', error);
    showToast('Error loading subjects', 'error');
  }
}

function openSubjectModal() {
  const modal = document.getElementById('subjectModal');
  const modalTitle = modal.querySelector('.modal-header h3');
  const submitBtn = modal.querySelector('button[type="submit"]');

  modalTitle.textContent = 'Add Subject';
  submitBtn.textContent = 'Add Subject';
  editingSubjectId = null;

  modal.classList.add('active');
  document.getElementById('subject-name').value = '';
  document.getElementById('subject-teacher').value = '';
}

async function editSubject(subjectId) {
  try {
    const subjectRef = database.ref(`divisions/${currentDivision}/subjects/${subjectId}`);
    const snapshot = await subjectRef.once('value');

    if (snapshot.exists()) {
      const subject = snapshot.val();
      const modal = document.getElementById('subjectModal');
      const modalTitle = modal.querySelector('.modal-header h3');
      const submitBtn = modal.querySelector('button[type="submit"]');

      modalTitle.textContent = 'Edit Subject';
      submitBtn.textContent = 'Update Subject';
      editingSubjectId = subjectId;

      document.getElementById('subject-name').value = subject.name;
      document.getElementById('subject-teacher').value = subject.teacher;

      modal.classList.add('active');
    }
  } catch (error) {
    console.error('Error loading subject:', error);
    showToast('Error loading subject', 'error');
  }
}

function closeSubjectModal() {
  const modal = document.getElementById('subjectModal');
  modal.classList.remove('active');
}

async function handleSubjectSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('subject-name').value;
  const teacher = document.getElementById('subject-teacher').value;

  try {
    const subjectId = editingSubjectId || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const subjectRef = database.ref(`divisions/${currentDivision}/subjects/${subjectId}`);

    await subjectRef.set({
      name,
      teacher,
      id: subjectId
    });

    closeSubjectModal();
    await loadSubjects();
    showToast(editingSubjectId ? 'Subject updated successfully!' : 'Subject added successfully!', 'success');
    editingSubjectId = null;
  } catch (error) {
    console.error('Error saving subject:', error);
    showToast('Error saving subject', 'error');
  }
}

async function deleteSubject(subjectId) {
  if (!confirm('Are you sure you want to delete this subject? All associated schedules will also be removed.')) {
    return;
  }

  try {
    const subjectRef = database.ref(`divisions/${currentDivision}/subjects/${subjectId}`);
    await subjectRef.remove();

    const schedulesRef = database.ref(`divisions/${currentDivision}/schedules`);
    const schedulesSnapshot = await schedulesRef.once('value');

    if (schedulesSnapshot.exists()) {
      const allSchedules = schedulesSnapshot.val();
      for (const day in allSchedules) {
        for (const slotId in allSchedules[day]) {
          if (allSchedules[day][slotId].subjectId === subjectId) {
            const slotRef = database.ref(`divisions/${currentDivision}/schedules/${day}/${slotId}`);
            await slotRef.remove();
          }
        }
      }
    }

    await loadSubjects();
    showToast('Subject and associated schedules deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting subject:', error);
    showToast('Error deleting subject', 'error');
  }
}

function goToScheduleSetup() {
  goToAdminPage('day-selection');
  loadDayCards();
}

function backToDivisionDetail() {
  goToAdminPage('division-detail');
  loadSubjects();
}

function loadDayCards() {
  const dayGrid = document.getElementById('dayGrid');

  let html = '';
  DAYS.forEach(day => {
    html += `
      <div class="day-card" onclick="openDaySchedule('${day.code}', '${day.name}')">
        <div class="day-name">${day.name}</div>
      </div>
    `;
  });

  dayGrid.innerHTML = html;
}

async function openDaySchedule(dayCode, dayName) {
  currentDay = dayCode;
  document.getElementById('dayScheduleTitle').textContent = `${dayName} Schedule`;
  goToAdminPage('day-schedule');
  await loadDaySchedule();
}

async function loadDaySchedule() {
  const scheduleTimeline = document.getElementById('scheduleTimeline');

  try {
    const scheduleRef = database.ref(`divisions/${currentDivision}/schedules/${currentDay}`);
    const snapshot = await scheduleRef.once('value');

    let html = '';
    if (snapshot.exists()) {
      const schedules = snapshot.val();

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

      for (const schedule of schedulesArray) {
        const subjectRef = database.ref(`divisions/${currentDivision}/subjects/${schedule.subjectId}`);
        const subjectSnapshot = await subjectRef.once('value');
        const subject = subjectSnapshot.exists() ? subjectSnapshot.val() : { name: 'Unknown', teacher: 'Unknown' };

        // Determine background color based on type
        let slotColor = 'var(--primary-purple)';
        if (schedule.type === 'green') {
          slotColor = 'var(--primary-green)';
        } else if (schedule.type === 'red') {
          slotColor = 'var(--primary-red)';
        }

        html += `
          <div class="schedule-slot" style="background: ${slotColor};">
            <div class="slot-time">${schedule.time}</div>
            <div class="slot-info">
              <div class="slot-subject">${subject.name}</div>
              <div class="slot-teacher">Teacher: ${subject.teacher}</div>
            </div>
            <div class="slot-actions">
              <button class="btn-edit-small" onclick="editTimeSlot('${schedule.id}')">
                Edit
              </button>
              <button class="btn-delete-small" onclick="deleteTimeSlot('${schedule.id}')">
                ✕
              </button>
            </div>
          </div>
        `;
      }
    } else {
      html = `
        <div class="empty-state">
          <p>No schedules for this day yet. Click "Add Schedule" to add time slots.</p>
        </div>
      `;
    }

    scheduleTimeline.innerHTML = html;
  } catch (error) {
    console.error('Error loading schedule:', error);
    showToast('Error loading schedule', 'error');
  }
}

async function openTimeSlotModal() {
  const modal = document.getElementById('timeSlotModal');
  const modalTitle = modal.querySelector('.modal-header h3');
  const submitBtn = modal.querySelector('button[type="submit"]');
  const subjectSelect = document.getElementById('slot-subject');

  modalTitle.textContent = 'Add Time Slot';
  submitBtn.textContent = 'Add Time Slot';
  editingSlotId = null;

  try {
    const subjectsRef = database.ref(`divisions/${currentDivision}/subjects`);
    const snapshot = await subjectsRef.once('value');

    let options = '<option value="">Select Subject</option>';
    if (snapshot.exists()) {
      const subjects = snapshot.val();
      Object.keys(subjects).forEach(subjectId => {
        const subject = subjects[subjectId];
        options += `<option value="${subjectId}">${subject.name}</option>`;
      });
    }

    subjectSelect.innerHTML = options;

    // Set default card color to purple
    document.getElementById('slot-color').value = 'purple';

    modal.classList.add('active');
    document.getElementById('slot-start-time').value = '';
    document.getElementById('slot-end-time').value = '';
  } catch (error) {
    console.error('Error loading subjects:', error);
    showToast('Error loading subjects', 'error');
  }
}

function convertTo24Hour(time12) {
  const [time, modifier] = time12.trim().split(' ');
  let [hours, minutes] = time.split(':');

  if (hours === '12') {
    hours = '00';
  }

  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

async function editTimeSlot(slotId) {
  try {
    const slotRef = database.ref(`divisions/${currentDivision}/schedules/${currentDay}/${slotId}`);
    const slotSnapshot = await slotRef.once('value');

    if (slotSnapshot.exists()) {
      const slot = slotSnapshot.val();
      const modal = document.getElementById('timeSlotModal');
      const modalTitle = modal.querySelector('.modal-header h3');
      const submitBtn = modal.querySelector('button[type="submit"]');
      const subjectSelect = document.getElementById('slot-subject');

      modalTitle.textContent = 'Edit Time Slot';
      submitBtn.textContent = 'Update Time Slot';
      editingSlotId = slotId;

      const subjectsRef = database.ref(`divisions/${currentDivision}/subjects`);
      const snapshot = await subjectsRef.once('value');

      let options = '<option value="">Select Subject</option>';
      if (snapshot.exists()) {
        const subjects = snapshot.val();
        Object.keys(subjects).forEach(subjectId => {
          const subject = subjects[subjectId];
          const selected = subjectId === slot.subjectId ? 'selected' : '';
          options += `<option value="${subjectId}" ${selected}>${subject.name}</option>`;
        });
      }

      subjectSelect.innerHTML = options;

      // Parse time range if it exists (format: "HH:MM AM/PM-HH:MM AM/PM")
      if (slot.time && slot.time.includes('-')) {
        const [startTime, endTime] = slot.time.split('-');
        // Convert 12-hour format to 24-hour for input fields
        document.getElementById('slot-start-time').value = convertTo24Hour(startTime.trim());
        document.getElementById('slot-end-time').value = convertTo24Hour(endTime.trim());
      } else {
        document.getElementById('slot-start-time').value = '';
        document.getElementById('slot-end-time').value = '';
      }

      document.getElementById('slot-color').value = slot.type || 'purple';

      modal.classList.add('active');
    }
  } catch (error) {
    console.error('Error loading time slot:', error);
    showToast('Error loading time slot', 'error');
  }
}

function closeTimeSlotModal() {
  const modal = document.getElementById('timeSlotModal');
  modal.classList.remove('active');
}

function convertTo12Hour(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

async function handleTimeSlotSubmit(event) {
  event.preventDefault();

  const startTime = document.getElementById('slot-start-time').value;
  const endTime = document.getElementById('slot-end-time').value;
  const subjectId = document.getElementById('slot-subject').value;
  const color = document.getElementById('slot-color').value;

  // Validate that end time is after start time
  if (startTime >= endTime) {
    showToast('End time must be after start time', 'error');
    return;
  }

  // Convert to 12-hour format
  const startTime12 = convertTo12Hour(startTime);
  const endTime12 = convertTo12Hour(endTime);
  const timeRange = `${startTime12}-${endTime12}`;

  try {
    const slotId = editingSlotId || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const slotRef = database.ref(`divisions/${currentDivision}/schedules/${currentDay}/${slotId}`);

    await slotRef.set({
      id: slotId,
      time: timeRange,
      subjectId,
      type: color
    });

    closeTimeSlotModal();
    await loadDaySchedule();
    showToast(editingSlotId ? 'Time slot updated successfully!' : 'Time slot added successfully!', 'success');
    editingSlotId = null;
  } catch (error) {
    console.error('Error saving time slot:', error);
    showToast('Error saving time slot', 'error');
  }
}

async function deleteTimeSlot(slotId) {
  if (!confirm('Are you sure you want to delete this time slot?')) {
    return;
  }

  try {
    const slotRef = database.ref(`divisions/${currentDivision}/schedules/${currentDay}/${slotId}`);
    await slotRef.remove();
    await loadDaySchedule();
    showToast('Time slot deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting time slot:', error);
    showToast('Error deleting time slot', 'error');
  }
}

async function toggleDivisionCompletion(event, division) {
  event.stopPropagation();

  try {
    const newStatus = !divisionCompletionStatus[division];
    const completionRef = database.ref(`divisionCompletion/${division}`);

    await completionRef.set(newStatus);
    divisionCompletionStatus[division] = newStatus;

    await loadDivisionCards();
    showToast(newStatus ? `Division ${division} marked as done!` : `Division ${division} unmarked`, 'success');
  } catch (error) {
    console.error('Error updating division status:', error);
    showToast('Error updating division status', 'error');
  }
}

// Holiday management functions
function openHolidayModal() {
  const modal = document.getElementById('holidayModal');
  modal.classList.add('active');

  // Reset form
  document.getElementById('holiday-name').value = '';
  document.getElementById('holiday-start-date').value = '';
  document.getElementById('holiday-end-date').value = '';
}

function closeHolidayModal() {
  const modal = document.getElementById('holidayModal');
  modal.classList.remove('active');
}

async function handleHolidaySubmit(event) {
  event.preventDefault();

  const name = document.getElementById('holiday-name').value;
  const startDate = document.getElementById('holiday-start-date').value;
  const endDate = document.getElementById('holiday-end-date').value;

  try {
    const holidayId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const holidayRef = database.ref(`holidays/${holidayId}`);

    await holidayRef.set({
      id: holidayId,
      name,
      startDate,
      endDate: endDate || startDate, // If no end date, use start date
      timestamp: Date.now()
    });

    closeHolidayModal();
    await loadHolidays();
    showToast('Holiday posted successfully!', 'success');
  } catch (error) {
    console.error('Error posting holiday:', error);
    showToast('Error posting holiday', 'error');
  }
}

async function loadHolidays() {
  const holidaysList = document.getElementById('holidaysList');

  if (!holidaysList) return;

  try {
    const holidaysRef = database.ref('holidays');
    const snapshot = await holidaysRef.once('value');

    let html = '';
    if (snapshot.exists()) {
      const holidays = snapshot.val();
      const holidaysArray = Object.values(holidays).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

      holidaysArray.forEach(holiday => {
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);

        const startDateStr = startDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        const endDateStr = endDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        const dateRange = holiday.startDate === holiday.endDate
          ? startDateStr
          : `${startDateStr} - ${endDateStr}`;

        html += `
          <div class="notice-card">
            <div class="notice-header">
              <span class="notice-priority" style="background: var(--primary-green);">🎉 Holiday</span>
              <span class="notice-date">${dateRange}</span>
            </div>
            <h4 class="notice-title">${holiday.name}</h4>
            <button class="btn-delete-small" onclick="deleteHoliday('${holiday.id}')">
              Delete
            </button>
          </div>
        `;
      });
    } else {
      html = `
        <div class="empty-state">
          <p>No holidays posted yet. Click "Create Holiday" to get started.</p>
        </div>
      `;
    }

    holidaysList.innerHTML = html;
  } catch (error) {
    console.error('Error loading holidays:', error);
    showToast('Error loading holidays', 'error');
  }
}

async function deleteHoliday(holidayId) {
  if (!confirm('Are you sure you want to delete this holiday?')) {
    return;
  }

  try {
    const holidayRef = database.ref(`holidays/${holidayId}`);
    await holidayRef.remove();
    await loadHolidays();
    showToast('Holiday deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting holiday:', error);
    showToast('Error deleting holiday', 'error');
  }
}

// Notice management functions
function openNoticeModal() {
  const modal = document.getElementById('noticeModal');
  modal.classList.add('active');

  // Reset form
  document.getElementById('notice-title').value = '';
  document.getElementById('notice-content').value = '';
  document.getElementById('notice-attachment').value = '';
  document.getElementById('notice-priority').value = '';
}

function closeNoticeModal() {
  const modal = document.getElementById('noticeModal');
  modal.classList.remove('active');
}

async function handleNoticeSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('notice-title').value;
  const content = document.getElementById('notice-content').value;
  const priority = document.getElementById('notice-priority').value;
  const attachmentInput = document.getElementById('notice-attachment');

  let attachmentData = null;

  // Handle file attachment
  if (attachmentInput.files.length > 0) {
    const file = attachmentInput.files[0];

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      return;
    }

    // Convert to base64
    try {
      attachmentData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
          data: e.target.result,
          name: file.name,
          type: file.type
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error reading file:', error);
      showToast('Error uploading file', 'error');
      return;
    }
  }

  try {
    const noticeId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const timestamp = Date.now();
    const expiryTimestamp = timestamp + (7 * 24 * 60 * 60 * 1000); // 7 days from now

    const noticeData = {
      id: noticeId,
      title,
      content,
      priority,
      attachment: attachmentData,
      timestamp: timestamp,
      expiryTimestamp: expiryTimestamp,
      read: false
    };

    // Save to notices collection (for admin viewing)
    const noticeRef = database.ref(`notices/${noticeId}`);
    await noticeRef.set(noticeData);

    // Save to notifications collection (for student notification bell - 7 days persistence)
    const notificationRef = database.ref(`notifications/${noticeId}`);
    await notificationRef.set(noticeData);

    closeNoticeModal();
    await loadNotices();
    showToast('Notice posted successfully!', 'success');
  } catch (error) {
    console.error('Error posting notice:', error);
    showToast('Error posting notice', 'error');
  }
}

async function loadNotices() {
  const noticesList = document.getElementById('noticesList');

  if (!noticesList) return;

  try {
    const noticesRef = database.ref('notices');
    const snapshot = await noticesRef.once('value');

    let html = '';
    if (snapshot.exists()) {
      const notices = snapshot.val();
      const noticesArray = Object.values(notices).sort((a, b) => b.timestamp - a.timestamp);

      noticesArray.forEach(notice => {
        const date = new Date(notice.timestamp);
        const dateStr = date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let priorityBadge = '';
        let priorityColor = 'var(--primary-blue)';

        if (notice.priority === 'urgent') {
          priorityBadge = '🚨 Urgent';
          priorityColor = 'var(--primary-red)';
        } else if (notice.priority === 'holiday') {
          priorityBadge = '🎉 Holiday';
          priorityColor = 'var(--primary-green)';
        } else {
          priorityBadge = '📢 Normal';
          priorityColor = 'var(--primary-purple)';
        }

        html += `
          <div class="notice-card">
            <div class="notice-header">
              <span class="notice-priority" style="background: ${priorityColor};">${priorityBadge}</span>
              <span class="notice-date">${dateStr}</span>
            </div>
            <h4 class="notice-title">${notice.title}</h4>
            <p class="notice-content">${notice.content}</p>
            ${notice.attachment ? `
              <div class="notice-attachment">
                📎 ${notice.attachment.name}
              </div>
            ` : ''}
            <button class="btn-delete-small" onclick="deleteNotice('${notice.id}')">
              Delete
            </button>
          </div>
        `;
      });
    } else {
      html = `
        <div class="empty-state">
          <p>No notices posted yet. Click "Create Notice" to get started.</p>
        </div>
      `;
    }

    noticesList.innerHTML = html;
  } catch (error) {
    console.error('Error loading notices:', error);
    showToast('Error loading notices', 'error');
  }
}

async function deleteNotice(noticeId) {
  if (!confirm('Are you sure you want to delete this notice?')) {
    return;
  }

  try {
    // Delete from both notices and notifications collections
    const noticeRef = database.ref(`notices/${noticeId}`);
    const notificationRef = database.ref(`notifications/${noticeId}`);
    
    await noticeRef.remove();
    await notificationRef.remove();
    
    await loadNotices();
    showToast('Notice deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting notice:', error);
    showToast('Error deleting notice', 'error');
  }
}

window.goToAdminPage = goToAdminPage;
window.handleAdminLogin = handleAdminLogin;
window.handleAdminLogout = handleAdminLogout;
window.openDivision = openDivision;
window.openSubjectModal = openSubjectModal;
window.editSubject = editSubject;
window.closeSubjectModal = closeSubjectModal;
window.handleSubjectSubmit = handleSubjectSubmit;
window.deleteSubject = deleteSubject;
window.goToScheduleSetup = goToScheduleSetup;
window.backToDivisionDetail = backToDivisionDetail;
window.openDaySchedule = openDaySchedule;
window.openTimeSlotModal = openTimeSlotModal;
window.editTimeSlot = editTimeSlot;
window.closeTimeSlotModal = closeTimeSlotModal;
window.handleTimeSlotSubmit = handleTimeSlotSubmit;
window.deleteTimeSlot = deleteTimeSlot;
window.closeToast = closeToast;
window.toggleDivisionCompletion = toggleDivisionCompletion;
window.openNoticeModal = openNoticeModal;
window.closeNoticeModal = closeNoticeModal;
window.handleNoticeSubmit = handleNoticeSubmit;
window.deleteNotice = deleteNotice;
window.openHolidayModal = openHolidayModal;
window.closeHolidayModal = closeHolidayModal;
window.handleHolidaySubmit = handleHolidaySubmit;
window.deleteHoliday = deleteHoliday;

// Groq API configuration functions
async function handleGroqApiSubmit(event) {
  event.preventDefault();

  const apiKey = document.getElementById('groq-api-key').value.trim();
  const model = document.getElementById('groq-model').value;

  if (!apiKey) {
    showToast('Please enter a valid Groq API key', 'error');
    return;
  }

  if (!apiKey.startsWith('gsk_')) {
    showToast('Invalid API key format. Groq keys start with "gsk_"', 'error');
    return;
  }

  try {
    const configRef = database.ref('config/groq');
    
    await configRef.set({
      apiKey: apiKey,
      model: model,
      updatedAt: Date.now()
    });

    showToast('Groq API configuration saved successfully!', 'success');
    document.getElementById('groq-status').textContent = 'Configured ✓';
    document.getElementById('groq-api-key').value = '';
    
    // Show the indicator after saving
    const apiKeyIndicator = document.getElementById('api-key-indicator');
    const apiKeyInput = document.getElementById('groq-api-key');
    if (apiKeyIndicator) {
      apiKeyIndicator.style.display = 'block';
    }
    if (apiKeyInput) {
      apiKeyInput.placeholder = 'API key already set (enter new key to update)';
    }
  } catch (error) {
    console.error('Error saving Groq configuration:', error);
    showToast('Error saving configuration', 'error');
  }
}

async function loadGroqConfig() {
  try {
    const configRef = database.ref('config/groq');
    const snapshot = await configRef.once('value');

    const apiKeyIndicator = document.getElementById('api-key-indicator');
    const apiKeyInput = document.getElementById('groq-api-key');

    if (snapshot.exists()) {
      const config = snapshot.val();
      document.getElementById('groq-model').value = config.model || 'llama-3.3-70b-versatile';
      document.getElementById('groq-status').textContent = 'Configured ✓';
      
      // Show the indicator and set placeholder
      if (apiKeyIndicator) {
        apiKeyIndicator.style.display = 'block';
      }
      if (apiKeyInput) {
        apiKeyInput.placeholder = 'API key already set (enter new key to update)';
      }
    } else {
      document.getElementById('groq-status').textContent = 'Not Configured';
      
      // Hide the indicator and reset placeholder
      if (apiKeyIndicator) {
        apiKeyIndicator.style.display = 'none';
      }
      if (apiKeyInput) {
        apiKeyInput.placeholder = 'Enter your Groq API key (gsk_...)';
      }
    }
    
    await loadTokenUsage();
  } catch (error) {
    console.error('Error loading Groq configuration:', error);
  }
}

function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split('T')[0];
}

async function cleanupOldUsageData() {
  try {
    const today = getTodayIST();
    const usageRootRef = database.ref('config/groq/usage');
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

async function loadTokenUsage() {
  try {
    await cleanupOldUsageData();
    
    const today = getTodayIST();
    const usageRef = database.ref(`config/groq/usage/${today}`);
    const snapshot = await usageRef.once('value');
    
    const modelLimits = {
      'llama-3.3-70b-versatile': { limit: 375, id: 'zen-alpha' },
      'meta-llama_llama-4-maverick-17b-128e-instruct': { limit: 1875, id: 'zen-beta' },
      'llama-3.1-8b-instant': { limit: 1875, id: 'zen-gamma' },
      'groq_compound': { limit: -1, id: 'zen-omega' }
    };
    
    const usageData = snapshot.val() || {};
    
    for (const [safeModelName, config] of Object.entries(modelLimits)) {
      const count = usageData[safeModelName] || 0;
      const usageElement = document.getElementById(`usage-${config.id}`);
      const progressElement = document.getElementById(`progress-${config.id}`);
      
      if (usageElement) {
        usageElement.textContent = count;
      }
      
      if (progressElement && config.limit > 0) {
        const percentage = Math.min((count / config.limit) * 100, 100);
        progressElement.style.width = `${percentage}%`;
      }
    }
  } catch (error) {
    console.error('Error loading token usage:', error);
  }
}

window.handleGroqApiSubmit = handleGroqApiSubmit;
window.loadGroqConfig = loadGroqConfig;



// Version Management Functions
async function handleVersionUpdate(event) {
  event.preventDefault();

  const newVersion = document.getElementById('app-version').value.trim();

  if (!newVersion) {
    showToast('Please enter a version number', 'error');
    return;
  }

  try {
    const versionRef = database.ref('appConfig/version');
    
    await versionRef.set(newVersion);

    // Update last modified timestamp
    const timestampRef = database.ref('appConfig/versionUpdatedAt');
    await timestampRef.set(Date.now());

    showToast('Version updated successfully! All users will be logged out on their next visit.', 'success');
    
    // Reload the version display
    loadCurrentVersion();
  } catch (error) {
    console.error('Error updating version:', error);
    showToast('Error updating version', 'error');
  }
}

async function loadCurrentVersion() {
  try {
    const versionRef = database.ref('appConfig/version');
    const timestampRef = database.ref('appConfig/versionUpdatedAt');
    
    const [versionSnapshot, timestampSnapshot] = await Promise.all([
      versionRef.once('value'),
      timestampRef.once('value')
    ]);

    const versionDisplay = document.getElementById('current-version-display');
    const lastUpdatedDisplay = document.getElementById('version-last-updated');
    const versionInput = document.getElementById('app-version');

    if (versionSnapshot.exists()) {
      const version = versionSnapshot.val();
      if (versionDisplay) {
        versionDisplay.textContent = version;
      }
      if (versionInput) {
        versionInput.value = version;
      }
    } else {
      if (versionDisplay) {
        versionDisplay.textContent = 'Not Set';
      }
    }

    if (timestampSnapshot.exists()) {
      const timestamp = timestampSnapshot.val();
      const date = new Date(timestamp);
      if (lastUpdatedDisplay) {
        lastUpdatedDisplay.textContent = date.toLocaleString();
      }
    } else {
      if (lastUpdatedDisplay) {
        lastUpdatedDisplay.textContent = 'Never';
      }
    }
  } catch (error) {
    console.error('Error loading current version:', error);
  }
}

// Backpack Management Functions
let currentBackpackDivision = null;

async function loadBackpackDivisionCards() {
  const backpackGrid = document.getElementById('backpackDivisionGrid');

  let html = '';
  
  // Add "All" card first (on top)
  html += `
    <div class="division-card" style="background: var(--primary-yellow);">
      <div class="division-content" onclick="openBackpackDivision('ALL')">
        <div class="division-letter">ALL</div>
        <div class="division-name">All Divisions</div>
      </div>
    </div>
  `;

  // Add division cards A-Q
  DIVISIONS.forEach((division) => {
    html += `
      <div class="division-card" style="background: var(--primary-purple);">
        <div class="division-content" onclick="openBackpackDivision('${division}')">
          <div class="division-letter">${division}</div>
          <div class="division-name">Division ${division}</div>
        </div>
      </div>
    `;
  });

  backpackGrid.innerHTML = html;
}

async function openBackpackDivision(division) {
  currentBackpackDivision = division;
  const titleText = division === 'ALL' ? 'All Divisions - Backpack' : `Division ${division} - Backpack`;
  document.getElementById('backpackDivisionTitle').textContent = titleText;
  goToAdminPage('backpack-division-detail');
  await loadBackpackSubjects();
}

async function loadBackpackSubjects() {
  const subjectsList = document.getElementById('backpackSubjectsList');

  try {
    const subjectsRef = database.ref(`divisions/${currentBackpackDivision}/studySubjects`);
    const snapshot = await subjectsRef.once('value');
    let html = '';
    
    if (snapshot.exists()) {
      const subjects = snapshot.val();
      Object.keys(subjects).forEach(subjectId => {
        const subject = subjects[subjectId];
        html += `
          <div class="subject-card" style="cursor: pointer;" onclick="openSubjectMaterials('${subjectId}', '${subject.name}')">
            <div class="subject-info">
              <div class="subject-name">${subject.name}</div>
            </div>
            <div class="subject-actions">
              <button class="btn-delete-small" onclick="event.stopPropagation(); deleteBackpackSubject('${subjectId}')">
                ✕
              </button>
            </div>
          </div>
        `;
      });
    } else {
      html = `
        <div class="empty-state">
          <p>No subjects added yet. Click "Add Subject" to get started.</p>
        </div>
      `;
    }

    subjectsList.innerHTML = html;
  } catch (error) {
    console.error('Error loading backpack subjects:', error);
    showToast('Error loading subjects', 'error');
  }
}

function openBackpackSubjectModal() {
  const modal = document.getElementById('backpackSubjectModal');
  modal.classList.add('active');
  document.getElementById('backpack-subject-name').value = '';
}

function closeBackpackSubjectModal() {
  const modal = document.getElementById('backpackSubjectModal');
  modal.classList.remove('active');
}

async function handleBackpackSubjectSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('backpack-subject-name').value.trim();

  if (!name) {
    showToast('Please enter a subject name', 'error');
    return;
  }

  try {
    // Create slug from subject name
    const slug = name.toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (!slug) {
      showToast('Subject name must contain at least one alphanumeric character', 'error');
      return;
    }

    const subjectRef = database.ref(`divisions/${currentBackpackDivision}/studySubjects/${slug}`);
    
    // Check if subject already exists
    const snapshot = await subjectRef.once('value');
    if (snapshot.exists()) {
      showToast('A subject with this name already exists', 'error');
      return;
    }

    await subjectRef.set({
      id: slug,
      name: name,
      timestamp: Date.now()
    });

    closeBackpackSubjectModal();
    await loadBackpackSubjects();
    showToast('Subject added successfully!', 'success');
  } catch (error) {
    console.error('Error saving subject:', error);
    showToast('Error saving subject', 'error');
  }
}

async function deleteBackpackSubject(subjectId) {
  if (!confirm('Are you sure you want to delete this subject?')) {
    return;
  }

  try {
    const subjectRef = database.ref(`divisions/${currentBackpackDivision}/studySubjects/${subjectId}`);
    await subjectRef.remove();

    await loadBackpackSubjects();
    showToast('Subject deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting subject:', error);
    showToast('Error deleting subject', 'error');
  }
}

window.loadBackpackDivisionCards = loadBackpackDivisionCards;
window.openBackpackDivision = openBackpackDivision;
window.loadBackpackSubjects = loadBackpackSubjects;
window.openBackpackSubjectModal = openBackpackSubjectModal;
window.closeBackpackSubjectModal = closeBackpackSubjectModal;
window.handleBackpackSubjectSubmit = handleBackpackSubjectSubmit;
window.deleteBackpackSubject = deleteBackpackSubject;

window.handleVersionUpdate = handleVersionUpdate;
window.loadCurrentVersion = loadCurrentVersion;

// Intro Music Management Functions
async function handleIntroMusicUpload(event) {
  event.preventDefault();

  const fileInput = document.getElementById('intro-music-file');
  
  if (!fileInput.files.length) {
    showToast('Please select an audio file', 'error');
    return;
  }

  const file = fileInput.files[0];

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Audio file size must be less than 5MB', 'error');
    return;
  }

  // Check if it's an audio file
  if (!file.type.startsWith('audio/')) {
    showToast('Please upload a valid audio file', 'error');
    return;
  }

  try {
    showToast('Uploading intro music...', 'info');

    // Convert file to base64
    const audioData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const musicRef = database.ref('config/introMusic');
    
    await musicRef.set({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      audioData: audioData,
      updatedAt: Date.now()
    });

    showToast('Intro music uploaded successfully!', 'success');
    fileInput.value = '';
    
    // Reload the current music display
    loadCurrentIntroMusic();
  } catch (error) {
    console.error('Error uploading intro music:', error);
    showToast('Error uploading intro music', 'error');
  }
}

async function loadCurrentIntroMusic() {
  try {
    const musicRef = database.ref('config/introMusic');
    const snapshot = await musicRef.once('value');

    const musicStatus = document.getElementById('intro-music-status');
    const musicName = document.getElementById('current-music-name');
    const musicLastUpdated = document.getElementById('music-last-updated');
    const musicPreview = document.getElementById('music-preview');

    if (snapshot.exists()) {
      const music = snapshot.val();
      
      if (musicStatus) {
        musicStatus.textContent = 'Uploaded ✓';
      }
      if (musicName) {
        musicName.textContent = music.fileName || 'Custom Music';
      }
      if (musicLastUpdated) {
        const date = new Date(music.updatedAt);
        musicLastUpdated.textContent = date.toLocaleString();
      }
      if (musicPreview) {
        musicPreview.src = music.audioData;
        musicPreview.style.display = 'block';
      }
    } else {
      if (musicStatus) {
        musicStatus.textContent = 'Not Uploaded';
      }
      if (musicName) {
        musicName.textContent = 'Default';
      }
      if (musicLastUpdated) {
        musicLastUpdated.textContent = 'Never';
      }
      if (musicPreview) {
        musicPreview.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error loading intro music:', error);
  }
}

window.handleIntroMusicUpload = handleIntroMusicUpload;
window.loadCurrentIntroMusic = loadCurrentIntroMusic;

// Subject Materials Management
let currentSubjectId = null;
let currentSubjectName = null;

async function openSubjectMaterials(subjectId, subjectName) {
  currentSubjectId = subjectId;
  currentSubjectName = subjectName;
  
  document.getElementById('subjectMaterialsPageTitle').textContent = `${subjectName} - Materials`;
  goToAdminPage('subject-materials-page');
  await loadSubjectMaterials();
}

async function loadSubjectMaterials() {
  const materialsList = document.getElementById('subjectMaterialsList');

  if (!materialsList) return;

  try {
    const materialsRef = database.ref(`divisions/${currentBackpackDivision}/studyMaterials`);
    const snapshot = await materialsRef.once('value');

    let html = '';
    if (snapshot.exists()) {
      const materials = snapshot.val();
      const filteredMaterials = Object.values(materials)
        .filter(m => m.subjectId === currentSubjectId)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (filteredMaterials.length > 0) {
        filteredMaterials.forEach(material => {
          const date = new Date(material.timestamp);
          const dateStr = date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const fileIcon = getFileIcon(material.fileType);
          const fileName = material.fileName || 'Download File';

          html += `
            <div class="notice-card">
              <div class="notice-header">
                <span class="notice-priority" style="background: var(--primary-purple);">${fileIcon} ${material.fileType}</span>
                <span class="notice-date">${dateStr}</span>
              </div>
              <h4 class="notice-title">${material.title}</h4>
              <p class="notice-content">${material.description}</p>
              <div class="notice-attachment" style="display: block; margin-top: 15px;">
                <a href="${material.fileUrl}" download="${fileName}" class="attachment-link" style="display: inline-flex; text-decoration: none;">
                  📎 ${fileName}
                </a>
              </div>
              <button class="btn-delete-small" onclick="deleteSubjectMaterial('${material.id}')">
                Delete
              </button>
            </div>
          `;
        });
      } else {
        html = `
          <div class="empty-state">
            <p>No materials added yet. Click "Add Material" to get started.</p>
          </div>
        `;
      }
    } else {
      html = `
        <div class="empty-state">
          <p>No materials added yet. Click "Add Material" to get started.</p>
        </div>
      `;
    }

    materialsList.innerHTML = html;
  } catch (error) {
    console.error('Error loading materials:', error);
    showToast('Error loading materials', 'error');
  }
}

function getFileIcon(fileType) {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('audio')) return '🎵';
  if (fileType.includes('video')) return '🎥';
  if (fileType.includes('word') || fileType.includes('doc')) return '📝';
  if (fileType.includes('powerpoint') || fileType.includes('ppt')) return '📊';
  return '📎';
}

function openAddMaterialModal() {
  const modal = document.getElementById('addMaterialModal');
  modal.classList.add('active');

  document.getElementById('material-title').value = '';
  document.getElementById('material-description').value = '';
  document.getElementById('material-file').value = '';
}

function closeAddMaterialModal() {
  const modal = document.getElementById('addMaterialModal');
  modal.classList.remove('active');
}

async function handleAddMaterialSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('material-title').value;
  const description = document.getElementById('material-description').value;
  const fileInput = document.getElementById('material-file');

  if (!fileInput.files.length) {
    showToast('Please select a file to upload', 'error');
    return;
  }

  const file = fileInput.files[0];

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size must be less than 10MB', 'error');
    return;
  }

  try {
    showToast('Uploading material...', 'info');

    const materialId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Upload file to Firebase Storage
    const storageRef = storage.ref(`studyMaterials/${currentBackpackDivision}/${materialId}/${file.name}`);
    const uploadTask = storageRef.put(file);

    // Monitor upload progress
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload progress:', progress + '%');
        showToast(`Uploading... ${Math.round(progress)}%`, 'info');
      },
      (error) => {
        console.error('Upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
      },
      async () => {
        // Upload completed successfully, get download URL
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
        console.log('File uploaded, download URL:', downloadURL);

        // Save material metadata to database with HTTP/HTTPS URL
        const materialRef = database.ref(`divisions/${currentBackpackDivision}/studyMaterials/${materialId}`);

        await materialRef.set({
          id: materialId,
          title: title,
          description: description,
          subjectId: currentSubjectId,
          subjectName: currentSubjectName,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl: downloadURL, // This is now an HTTP/HTTPS URL
          timestamp: Date.now()
        });

        closeAddMaterialModal();
        await loadSubjectMaterials();
        showToast('Material uploaded successfully!', 'success');
      }
    );
  } catch (error) {
    console.error('Error uploading material:', error);
    showToast('Error uploading material', 'error');
  }
}

async function deleteSubjectMaterial(materialId) {
  if (!confirm('Are you sure you want to delete this material?')) {
    return;
  }

  try {
    const materialRef = database.ref(`divisions/${currentBackpackDivision}/studyMaterials/${materialId}`);
    await materialRef.remove();
    await loadSubjectMaterials();
    showToast('Material deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting material:', error);
    showToast('Error deleting material', 'error');
  }
}

window.openSubjectMaterials = openSubjectMaterials;
window.loadSubjectMaterials = loadSubjectMaterials;
window.openAddMaterialModal = openAddMaterialModal;
window.closeAddMaterialModal = closeAddMaterialModal;
window.handleAddMaterialSubmit = handleAddMaterialSubmit;
window.deleteSubjectMaterial = deleteSubjectMaterial;

document.addEventListener('DOMContentLoaded', function() {
  checkAdminSession();
  
  // Load Groq config when navigating to settings page
  const groqPage = document.getElementById('groq-settings');
  if (groqPage) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (groqPage.classList.contains('active')) {
          loadGroqConfig();
        }
      });
    });
    observer.observe(groqPage, { attributes: true, attributeFilter: ['class'] });
  }

  // Load version when navigating to version manager page
  const versionPage = document.getElementById('version-manager');
  if (versionPage) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (versionPage.classList.contains('active')) {
          loadCurrentVersion();
        }
      });
    });
    observer.observe(versionPage, { attributes: true, attributeFilter: ['class'] });
  }

  // Load intro music when navigating to intro music page
  const introMusicPage = document.getElementById('intro-music');
  if (introMusicPage) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (introMusicPage.classList.contains('active')) {
          loadCurrentIntroMusic();
        }
      });
    });
    observer.observe(introMusicPage, { attributes: true, attributeFilter: ['class'] });
  }
});

document.addEventListener('click', function(event) {
  const subjectModal = document.getElementById('subjectModal');
  const timeSlotModal = document.getElementById('timeSlotModal');

  if (event.target === subjectModal) {
    closeSubjectModal();
  }
  if (event.target === timeSlotModal) {
    closeTimeSlotModal();
  }
});