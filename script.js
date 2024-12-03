// Importowanie Firebase z CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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

document.addEventListener('DOMContentLoaded', function() {
    const posts = [];

    function displayPosts() {
        const postsContainer = document.getElementById('posts');
        postsContainer.innerHTML = '<h2>Ostatnie Posty w ModHub</h2>'; 
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.textContent = post;
            postsContainer.appendChild(postElement);
        });
    }

    function addPost(postContent) {
        posts.push(postContent);
        displayPosts();
    }

    // Obsługa formularza rejestracyjnego
    document.getElementById('registrationForm')?.addEventListener('submit', function(event) {
        event.preventDefault(); // Zapobiega przeładowaniu strony

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Rejestracja użytkownika w Firebase
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Rejestracja zakończona sukcesem
                const user = userCredential.user;
                document.getElementById('message').textContent = 'Rejestracja zakończona sukcesem!';
                document.getElementById('registrationForm').reset(); // Resetuje formularz

                // Przekierowanie do strony logowania
                window.location.href = 'login.html';
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                document.getElementById('message').textContent = `Błąd rejestracji: ${errorMessage}`;
            });
    });

    // Obsługa formularza logowania
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Zapobiega przeładowaniu strony

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Logowanie użytkownika w Firebase
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // Logowanie zakończone sukcesem
                    const user = userCredential.user;
                    document.getElementById('message').textContent = 'Zalogowano pomyślnie!';

                    // Przekierowanie do strony głównej
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    document.getElementById('message').textContent = `Błąd logowania: ${errorMessage}`;
                });
        });
    }
});