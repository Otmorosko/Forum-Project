// Importowanie Firebase z CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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
                if (error.code === 'auth/email-already-in-use') {
                    document.getElementById('message').textContent = 'Ten adres e-mail jest już używany. Proszę spróbować innego.';
                } else {
                    document.getElementById('message').textContent = `Błąd rejestracji: ${errorMessage}`; // Wyświetla komunikat o błędzie
                }
            });
    });

    // Obsługa formularza logowania
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Zapobiega przeładowaniu strony

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
                    document.getElementById('message').textContent = `Błąd logowania: ${errorMessage}`; // Wyświetla komunikat o błędzie
                });
        });
    }

    // Monitorowanie stanu logowania użytkownika
    onAuthStateChanged(auth, (user) => {
        const loginLink = document.getElementById('loginLink');
        const registerLink = document.getElementById('registerLink');
        const logoutLink = document.getElementById('logoutLink');
    
        if (user) {
            console.log('Użytkownik zalogowany');
            console.log('Zalogowany użytkownik: ', user);
            
            // Użytkownik jest zalogowany, ukryj linki logowania i rejestracji, pokaż link wylogowania
            loginLink.style.display = 'none';
            registerLink.style.display = 'none';
            logoutLink.style.display = 'block'; // Pokaż link wylogowania
        } else {
            // Użytkownik nie jest zalogowany
            console.log('Brak zalogowanego użytkownika');
            
            // Użytkownik nie jest zalogowany, pokaż linki logowania i rejestracji, ukryj link wylogowania
            loginLink.style.display = 'block';
            registerLink.style.display = 'block';
            logoutLink.style.display = 'none'; // Ukryj link wylogowania
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
