import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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

// Funkcja monitorująca stan logowania
export function monitorAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        console.log('Stan logowania:', user);
        callback(user);
    });
}

// Funkcja do pobrania profilu użytkownika
export function getUserProfile(callback) {
    monitorAuthState((user) => {
        if (user) {
            const profile = {
                displayName: localStorage.getItem('userName') || user.displayName || 'Nieznany użytkownik',
                email: user.email || 'Brak adresu e-mail',
                photoURL: localStorage.getItem('profilePhoto') || user.photoURL || 'path/to/default-profile-pic.jpg',
            };
            callback(profile);
        } else {
            callback(null);
        }
    });
}

// Funkcja do rejestracji użytkownika
export async function registerUser(email, password, nickname) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: nickname });
    return user;
}

// Funkcja do logowania użytkownika
export async function loginUser(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
}

// Funkcja do wylogowania użytkownika
export function logoutUser() {
    return signOut(auth)
        .then(() => window.location.href = 'login.html')
        .catch((error) => {
            console.error('Błąd podczas wylogowania:', error);
            throw error;
        });
}

// Funkcja do aktualizacji zdjęcia profilowego
export async function updateUserPhoto(photoURL) {
    const user = auth.currentUser;
    if (user) {
        await updateProfile(user, { photoURL });
        localStorage.setItem('profilePhoto', photoURL);
    } else {
        throw new Error('Nie znaleziono zalogowanego użytkownika.');
    }
}

// Funkcja do ukrywania i wyświetlania linków nawigacyjnych
export function updateNavLinks() {
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutLink = document.getElementById('logoutLink');
    const profileLink = document.getElementById('profileLink');

    monitorAuthState((user) => {
        if (user) {
            loginLink?.style.setProperty('display', 'none');
            registerLink?.style.setProperty('display', 'none');
            logoutLink?.style.setProperty('display', 'block');
            profileLink?.style.setProperty('display', 'block');
        } else {
            loginLink?.style.setProperty('display', 'block');
            registerLink?.style.setProperty('display', 'block');
            logoutLink?.style.setProperty('display', 'none');
            profileLink?.style.setProperty('display', 'none');
        }
    });
}
