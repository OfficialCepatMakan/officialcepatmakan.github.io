const firebaseConfig = {
  apiKey: "AIzaSyDzIMXj13T1u7SWIEWIgQC5qUr-nVTzX14",
  authDomain: "cepatmakan-fa681.firebaseapp.com",
  databaseURL: "https://cepatmakan-fa681-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cepatmakan-fa681",
  storageBucket: "cepatmakan-fa681.appspot.com",
  messagingSenderId: "964273406485",
  appId: "1:964273406485:web:137588bd7b2dd5d6bcc41c",
  measurementId: "G-JCQLDB0CLG"
};

// Initialize Firebase using compat globals:
firebase.initializeApp(firebaseConfig);
firebase.analytics();
const db = firebase.database();  // <-- compat style
