// src/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

// ✅ Configuración COMPLETA de Firebase (todos los campos)
firebase.initializeApp({
  apiKey: "AIzaSyAFF5Ci99VUFgiLYfkHELq0OYTZaSoUct4",
  authDomain: "ceroespera-88bc0.firebaseapp.com",
  projectId: "ceroespera-88bc0",
  storageBucket: "ceroespera-88bc0.firebasestorage.app",
  messagingSenderId: "169164208305",
  appId: "1:169164208305:web:299ad02b7cfd5efd3d0a90"
});

const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Notificación en segundo plano:', payload);
  
  const notificationTitle = payload.notification?.title || 'Nueva notificación';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});