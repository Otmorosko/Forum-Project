// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Konfiguracja Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBPfqFhhCv09KnFAhvURHQMeEjxKxqv00A",
    authDomain: "forum-project-20acc.firebaseapp.com",
    projectId: "forum-project-20acc",
    storageBucket: "forum-project-20acc.appspot.com",
    messagingSenderId: "941755754883",
    appId: "1:941755754883:web:14a587a2e956c25602eeb6",
    measurementId: "G-WCCBFDS86P"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Funkcja do monitorowania stanu logowania
export function monitorAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

// Funkcja do uzyskania aktualnego użytkownika
export function getCurrentUser () {
    return auth.currentUser ;
}