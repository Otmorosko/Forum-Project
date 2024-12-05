// Importowanie Firebase z CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { monitorAuthState } from './auth.js'; // Upewnij się, że monitorAuthState jest zaimportowane z auth.js

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

// Log do konsoli, aby potwierdzić inicjalizację Firebase
console.log('Firebase zainicjowany: ', app);

document.addEventListener('DOMContentLoaded', function() {
    const posts = [];

    function displayPosts() {
        const postsContainer = document.getElementById('posts');
        postsContainer.innerHTML = '<h2>Ostatnie Posty w ModHub</h2>'; 
        posts.forEach(post => {
            const postElement = document.createElement('div'); // Tworzy nowy element dla posta
            postElement.textContent = post; // Ustawia treść posta
            postsContainer.appendChild(postElement); // Dodaje post do kontenera
        });
    }

    function addPost(postContent) {
        posts.push(postContent); // Dodaje nowy post do tablicy
        displayPosts(); // Wyświetla zaktualizowaną listę postów
    }

    // Obsługa formularza rejestracyjnego
    document.getElementById('registrationForm')?.addEventListener('submit', function(event) {
        event.preventDefault(); // Zapobiega przeładowaniu strony

        const email = document.getElementById('email').value; // Pobiera adres e-mail
        const password = document.getElementById('password').value; // Pobiera hasło

        // Rejestracja użytkownika w Firebase
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Użytkownik po rejestracji
                const user = userCredential.user;
                document.getElementById('registrationForm').reset(); // Resetuje formularz
                window.location.href = 'login.html'; // Przekierowanie do strony logowania
            })
            .catch((error) => {
                console.error(error); // Wyświetla szczegóły błędu w konsoli
                const errorMessage = error.message; // Pobiera komunikat o błędzie
                const messageElement = document.getElementById('message');
                if (error.code === 'auth/email-already-in-use') {
                    messageElement.textContent = 'Ten adres e-mail jest już używany. Proszę spróbować innego.';
                } else {
                    messageElement.textContent = `Błąd rejestracji: ${errorMessage}`; // Wyświetla komunikat o błędzie
                }
                messageElement.style.color = 'red'; // Ustawia kolor komunikatu na czerwony
            });
    });

    // Obsługa formularza logowania
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Zapobiega przeładow aniu strony

            const email = document.getElementById('email').value; // Pobiera adres e-mail
            const password = document.getElementById('password').value; // Pobiera hasło

            // Logowanie użytkownika w Firebase
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user; // Użytkownik po logowaniu
                    window.location.href = 'index.html'; // Przekierowanie do strony głównej
                })
                .catch((error) => {
                    console.error(error); // Wyświetla szczegóły błędu w konsoli
                    const errorMessage = error.message; // Pobiera komunikat o błędzie
                    const messageElement = document.getElementById('message');
                    if (error.code === 'auth/wrong-password') {
                        messageElement.textContent = 'Nieprawidłowe hasło. Proszę spróbować ponownie.';
                    } else if (error.code === 'auth/user-not-found') {
                        messageElement.textContent = 'Nie znaleziono użytkownika z tym adresem e-mail. Proszę sprawdzić i spróbować ponownie.';
                    } else {
                        messageElement.textContent = `Błąd logowania: ${errorMessage}`; // Wyświetla komunikat o błędzie
                    }
                    messageElement.style.color = 'red'; // Ustawia kolor komunikatu na czerwony
                });
        });
    }

    // Monitorowanie stanu logowania użytkownika
    monitorAuthState((user) => {
        const loginLink = document.getElementById('loginLink');
        const registerLink = document.getElementById('registerLink');
        const logoutLink = document.getElementById('logoutLink');
        const profileLink = document.getElementById('profileLink'); // Nowy link do profilu

        if (user) {
            console.log('Użytkownik zalogowany');
            console.log('Zalogowany użytkownik: ', user);
            
            // Użytkownik jest zalogowany, ukryj linki logowania i rejestracji, pokaż link wylogowania i profil
            loginLink.style.display = 'none';
            registerLink.style.display = 'none';
            logoutLink.style.display = 'block'; // Pokaż link wylogowania
            profileLink.style.display = 'block'; // Pokaż link do profilu
        } else {
            // Użytkownik nie jest zalogowany
            console.log('Brak zalogowanego użytkownika');
            
            // Użytkownik nie jest zalogowany, pokaż linki logowania i rejestracji, ukryj link wylogowania i profil
            loginLink.style.display = 'block';
            registerLink.style.display = 'block';
            logoutLink.style.display = 'none'; // Ukryj link wylogowania
            profileLink.style.display = 'none'; // Ukryj link do profilu
        }
    });

    document.getElementById('logoutLink')?.addEventListener('click', function(event) {
        event.preventDefault(); // Zapobiega przeładowaniu strony
        signOut(auth).then(() => {
            console.log('Użytkownik wylogowany');
            // Możesz dodać przekierowanie lub inne działania po wylogowaniu
            window.location.href = 'login.html'; // Przekierowanie do strony logowania
        }).catch((error) => {
            console.error('Błąd wylogowania: ', error);
        });
    });
});