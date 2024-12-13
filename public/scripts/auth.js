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

// Funkcja do ukrywania i wyświetlania linków w nawigacji
export function updateNavLinks() {
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutLink = document.getElementById('logoutLink');
    const profileLink = document.getElementById('profileLink');

    monitorAuthState((user) => {
        if (user) {
            // Ukrycie linków logowania i rejestracji
            if (loginLink) loginLink.style.display = 'none';
            if (registerLink) registerLink.style.display = 'none';

            // Wyświetlenie linków wylogowania i profilu
            if (logoutLink) logoutLink.style.display = 'block';
            if (profileLink) profileLink.style.display = 'block';
        } else {
            // Wyświetlenie linków logowania i rejestracji
            if (loginLink) loginLink.style.display = 'block';
            if (registerLink) registerLink.style.display = 'block';

            // Ukrycie linków wylogowania i profilu
            if (logoutLink) logoutLink.style.display = 'none';
            if (profileLink) profileLink.style.display = 'none';
        }
    });
}

// Funkcja do rejestracji użytkownika
export async function registerUser(email, password, nickname) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Ustawienie nazwy użytkownika
        await updateProfile(user, {
            displayName: nickname,
        });

        console.log('Rejestracja zakończona sukcesem:', user);
        return user;
    } catch (error) {
        console.error('Błąd podczas rejestracji:', error);
        throw error;
    }
}

// Funkcja do logowania użytkownika
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Logowanie zakończone sukcesem:', userCredential.user);
        return userCredential.user;
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        throw error;
    }
}

// Funkcja do wylogowania użytkownika
export function logoutUser() {
    console.log('Wywołanie logoutUser()');
    return signOut(auth)
        .then(() => {
            console.log('Użytkownik wylogowany');
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Błąd podczas wylogowania:', error);
            alert('Wylogowanie nie powiodło się. Spróbuj ponownie później.');
        });
}

// Funkcja do wyświetlania profilu użytkownika
export function getUserProfile(callback) {
    monitorAuthState((user) => {
        if (user) {
            const profile = {
                displayName: user.displayName || 'Nieznany użytkownik',
                email: user.email || 'Brak adresu e-mail',
            };
            callback(profile);
        } else {
            callback(null);
        }
    });
}
