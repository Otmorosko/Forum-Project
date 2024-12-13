import { renderNavbar } from './navbar.js';
import { updateNavLinks, monitorAuthState, logoutUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Wstawienie nawigacji
    renderNavbar();

    // Aktualizacja linków nawigacyjnych w zależności od stanu logowania
    updateNavLinks();

    // Obsługa rejestracji
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Funkcja rejestracji użytkownika
            import('./auth.js').then(({ registerUser }) => {
                registerUser(email, password)
                    .then((user) => console.log('Użytkownik zarejestrowany:', user))
                    .catch((error) => console.error('Błąd rejestracji:', error));
            });
        });
    }

    // Obsługa logowania
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Funkcja logowania użytkownika
            import('./auth.js').then(({ loginUser }) => {
                loginUser(email, password)
                    .then((user) => {
                        console.log('Zalogowano:', user);
                        window.location.href = 'index.html';
                    })
                    .catch((error) => console.error('Błąd logowania:', error));
            });
        });
    }

    // Obsługa wylogowania
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            logoutUser()
                .catch((error) => console.error('Błąd podczas wylogowania:', error));
        });
    }
});
