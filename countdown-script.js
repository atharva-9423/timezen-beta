let countdownInterval = null;

function getURLParameters() {
  const params = new URLSearchParams(window.location.search);
  return {
    fileUrl: params.get('fileUrl'),
    fileName: params.get('fileName')
  };
}

function startCountdown() {
  const { fileUrl, fileName } = getURLParameters();

  if (!fileUrl || !fileName) {
    document.getElementById('countdownFileName').textContent = 'Error: Missing file information';
    document.getElementById('countdownNumber').textContent = '!';
    return;
  }

  const filenameElement = document.getElementById('countdownFileName');
  const countdownElement = document.getElementById('countdownNumber');

  filenameElement.textContent = fileName;

  let timeLeft = 3;

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  countdownInterval = setInterval(() => {
    timeLeft--;

    if (countdownElement) {
      countdownElement.textContent = timeLeft;
      countdownElement.classList.add('countdown-number-tick');
      setTimeout(() => {
        countdownElement.classList.remove('countdown-number-tick');
      }, 300);
    }

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;

      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.history.back();
      }, 1000);
    }
  }, 1000);
}

function cancelDownload() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  window.history.back();
}

document.getElementById('cancelBtn').addEventListener('click', cancelDownload);

window.addEventListener('beforeunload', () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

startCountdown();
