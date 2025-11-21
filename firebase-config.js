
const firebaseConfig = {
  apiKey: "AIzaSyBf_9M2aho-GUlSTjuwseMqAZZrbb0IGy0",
  authDomain: "edutrack-89d25.firebaseapp.com",
  databaseURL: "https://edutrack-89d25-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "edutrack-89d25",
  storageBucket: "edutrack-89d25.firebasestorage.app",
  messagingSenderId: "836526382897",
  appId: "1:836526382897:web:fd71b29377c46074c21a10",
  measurementId: "G-23HSEM5FFW"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();
window.database = database;
window.storage = storage;
