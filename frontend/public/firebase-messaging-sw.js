// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
// Replace 10.13.2 with latest version of the Firebase JS SDK.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
    apiKey: "AIzaSyBkLhKshuOjD7IQpUl3wV1g3uT_xlPgzGk",
    authDomain: "bmw-project-5ab42.firebaseapp.com",
    projectId: "bmw-project-5ab42",
    storageBucket: "bmw-project-5ab42.firebasestorage.app",
    messagingSenderId: "14654770851",
    appId: "1:14654770851:web:5a983e25953711a30f3916"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log(
      '[firebase-messaging-sw.js] Received background message ',
      payload
    );
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: "/images/logo.png"
    };
  
    self.registration.showNotification(notificationTitle, notificationOptions);
  });