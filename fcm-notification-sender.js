
// Server-side FCM Notification Sender
// Note: This should be run on a backend server with Firebase Admin SDK
// For security reasons, never expose your Firebase Admin credentials in client-side code

const admin = require('firebase-admin');

// Initialize Firebase Admin (You need to download service account key from Firebase Console)
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://edutrack-89d25-default-rtdb.asia-southeast1.firebasedatabase.app"
});

// Send notification to a specific division
async function sendNotificationToDivision(division, notification) {
  const message = {
    notification: {
      title: notification.title,
      body: notification.content
    },
    data: {
      priority: notification.priority,
      notificationId: notification.id
    },
    topic: `division_${division}`
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Send notification to all students
async function sendNotificationToAll(notification) {
  const message = {
    notification: {
      title: notification.title,
      body: notification.content
    },
    data: {
      priority: notification.priority,
      notificationId: notification.id
    },
    topic: 'all_students'
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message to all:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Subscribe user to division topic
async function subscribeUserToDivision(token, division) {
  try {
    const response = await admin.messaging().subscribeToTopic(
      token,
      `division_${division}`
    );
    console.log('Successfully subscribed to division:', response);
    return response;
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    throw error;
  }
}

// Subscribe user to all students topic
async function subscribeUserToAllStudents(token) {
  try {
    const response = await admin.messaging().subscribeToTopic(
      token,
      'all_students'
    );
    console.log('Successfully subscribed to all students:', response);
    return response;
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    throw error;
  }
}

module.exports = {
  sendNotificationToDivision,
  sendNotificationToAll,
  subscribeUserToDivision,
  subscribeUserToAllStudents
};
