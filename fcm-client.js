// FCM Web Push Notification Handler
class FCMNotificationHandler {
  constructor() {
    this.messaging = null;
    this.token = null;
  }

  async initialize() {
    try {
      // Check if service workers are supported
      if (!("serviceWorker" in navigator)) {
        console.warn("Service Workers are not supported in this browser");
        return false;
      }

      // Check if notifications are supported
      if (!("Notification" in window)) {
        console.warn("Notifications are not supported in this browser");
        return false;
      }

      // Check if permission is already granted
      if (Notification.permission !== "granted") {
        console.log("Notification permission not granted yet");
        return false;
      }

      // Register the service worker
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );
      console.log("Service Worker registered successfully:", registration);

      // Initialize Firebase Messaging
      this.messaging = firebase.messaging();

      // Get FCM token
      await this.getToken();

      // Handle foreground messages
      this.setupForegroundMessageHandler();

      return true;
    } catch (error) {
      console.error("Error initializing FCM:", error);
      return false;
    }
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  }

  async getToken() {
    try {
      const currentToken = await this.messaging.getToken({
        vapidKey:
          "BJCoNsC-FtWM37z-yLvJ3eRI519OQ4akJCv8UPkDzZSzu93l6a8ns5OR-f9i_N1cBq7bpOvh1Mu15IrVZgfs7AM", // You need to generate this in Firebase Console
      });

      if (currentToken) {
        console.log("=".repeat(80));
        console.log("FCM TOKEN (Copy this to Firebase Console):");
        console.log(currentToken);
        console.log("=".repeat(80));
        
        this.token = currentToken;

        // Save token to localStorage
        localStorage.setItem("fcmToken", currentToken);

        // Show token in a copyable alert
        this.showTokenAlert(currentToken);

        // Subscribe to topics based on user data
        this.subscribeToTopics();

        return currentToken;
      } else {
        console.log("No registration token available.");
        return null;
      }
    } catch (error) {
      console.error("Error getting FCM token:", error);
      return null;
    }
  }

  setupForegroundMessageHandler() {
    this.messaging.onMessage((payload) => {
      console.log("Message received in foreground:", payload);

      // Show notification even when app is open
      const notificationTitle =
        payload.notification?.title || "TimeZen Notification";
      const notificationOptions = {
        body: payload.notification?.body || "You have a new notification",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: true,
        data: payload.data,
      };

      // Show browser notification
      if (Notification.permission === "granted") {
        new Notification(notificationTitle, notificationOptions);
      }

      // Also show in-app toast
      if (typeof showToast === "function") {
        showToast(payload.notification?.body || "New notification", "info");
      }
    });
  }

  showTokenAlert(token) {
    // Create a modal to show the token
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
        <h3 style="margin-top: 0; color: var(--primary-green); font-size: 24px;">✅ FCM Token Generated!</h3>
        <p style="color: var(--text-primary); margin-bottom: 15px;">Copy this token to Firebase Console for testing:</p>
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
    
    // Auto-close after 30 seconds
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 30000);
  }

  subscribeToTopics() {
    const userData = JSON.parse(localStorage.getItem("userSession"));
    if (!userData) return;

    // Note: Topic subscription must be done server-side
    // You need to send the token to your backend to subscribe to topics
    console.log("User division:", userData.division);
    console.log("FCM Token for topic subscription:", this.token);

    // Store division info for later use
    localStorage.setItem("userDivision", userData.division);
  }

  async refreshToken() {
    try {
      await this.messaging.deleteToken();
      await this.getToken();
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }
}

// Initialize FCM when the page loads
const fcmHandler = new FCMNotificationHandler();

// Export for use in other scripts
window.fcmHandler = fcmHandler;
