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

// Monitorowanie stanu logowania
export function monitorAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        console.log('Stan logowania użytkownika:', user);

        // Aktualizacja widoczności elementów w menu nawigacji
        const loginLink = document.getElementById('loginLink');
        const registerLink = document.getElementById('registerLink');
        const logoutLink = document.getElementById('logoutLink');
        const profileLink = document.getElementById('profileLink');
        const navProfilePic = document.getElementById('navProfilePic'); // Ikona profilu w navbarze

        if (user) {
            // Ukrywanie przycisków logowania/rejestracji
            if (loginLink) loginLink.style.display = 'none';
            if (registerLink) registerLink.style.display = 'none';

            // Pokazywanie przycisków profilu/wylogowania
            if (logoutLink) logoutLink.style.display = 'block';
            if (profileLink) profileLink.style.display = 'block';

            // Ustawianie zdjęcia profilowego w navbarze
            if (navProfilePic) {
                navProfilePic.src = user.photoURL || 'public/icons/user_icon.png';
            }

            // Wywołanie callbacka
            callback({
                displayName: user.displayName || 'Nieznany użytkownik',
                email: user.email || 'Brak adresu e-mail',
                photoURL: user.photoURL || 'public/icons/user_icon.png',
            });
        } else {
            // Pokazywanie przycisków logowania/rejestracji
            if (loginLink) loginLink.style.display = 'block';
            if (registerLink) registerLink.style.display = 'block';

            // Ukrywanie przycisków profilu/wylogowania
            if (logoutLink) logoutLink.style.display = 'none';
            if (profileLink) profileLink.style.display = 'none';

            // Resetowanie zdjęcia profilowego w navbarze
            if (navProfilePic) {
                navProfilePic.src = 'public/icons/user_icon.png';
            }

            // Wywołanie callbacka
            callback(null);
        }
    });
}

// Funkcja do logowania użytkownika
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Użytkownik zalogowany:', userCredential.user);
        return userCredential.user;
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        throw error;
    }
}

// Funkcja do rejestracji użytkownika
export async function registerUser(email, password, nickname) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Ustawienie nazwy użytkownika
        await updateProfile(user, { displayName: nickname });
        console.log('Użytkownik zarejestrowany:', user);
        return user;
    } catch (error) {
        console.error('Błąd podczas rejestracji:', error);
        throw error;
    }
}

// Funkcja do wylogowania użytkownika
export async function logoutUser() {
    try {
        await signOut(auth);
        console.log('Użytkownik został wylogowany.');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Błąd podczas wylogowywania:', error);
    }
}

// Funkcja do aktualizacji zdjęcia profilowego
export async function updateUserPhoto(photoURL) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('Brak zalogowanego użytkownika.');
    }

    try {
        await updateProfile(user, { photoURL });
        console.log('Zdjęcie profilowe zaktualizowane:', photoURL);
    } catch (error) {
        console.error('Błąd podczas aktualizacji zdjęcia profilowego:', error);
        throw error;
    }
}

// Funkcja do aktualizacji nazwy użytkownika
export async function updateUserName(newName) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('Brak zalogowanego użytkownika.');
    }

    try {
        await updateProfile(user, { displayName: newName });
        console.log('Nazwa użytkownika zaktualizowana:', newName);
    } catch (error) {
        console.error('Błąd podczas aktualizacji nazwy użytkownika:', error);
        throw error;
    }
}

// Funkcja do pobierania profilu użytkownika
export function getUserProfile(callback) {
    monitorAuthState((user) => {
        if (user) {
            callback({
                displayName: user.displayName || 'Nieznany użytkownik',
                email: user.email || 'Brak adresu e-mail',
                photoURL: user.photoURL || 'public/icons/user_icon.png',
            });
        } else {
            callback(null);
        }
    });
}
