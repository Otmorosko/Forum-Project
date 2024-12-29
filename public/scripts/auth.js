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
console.log('Inicjalizacja Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
console.log('Firebase zainicjalizowany:', app);

// Monitorowanie stanu logowania
export function monitorAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user); // Przekazanie obiektu użytkownika do callbacka
    });
}

// Funkcja do logowania użytkownika
export async function loginUser(email, password) {
    console.log('Próba logowania z e-mailem:', email);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Użytkownik zalogowany:', userCredential.user);
        return userCredential.user;
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        alert('Błąd logowania: ' + error.message);
        throw error;
    }
}

// Funkcja do rejestracji użytkownika
export async function registerUser(email, password, nickname) {
    console.log('Próba rejestracji z e-mailem:', email);
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
            const profilePhotoURL = user.photoURL || '/icons/user_icon.png'; // Ustawienie domyślnego zdjęcia
            callback({
                displayName: user.displayName || 'Nieznany użytkownik',
                email: user.email || 'Brak adresu e-mail',
                photoURL: profilePhotoURL, // Użycie domyślnego zdjęcia, jeśli nie ma ustawionego
            });
        } else {
            callback(null);
        }
    });
}
