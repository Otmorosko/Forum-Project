import { renderNavbar } from './navbar.js';
import { loginUser, logoutUser, registerUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM załadowany, inicjalizacja navbaru...');
    renderNavbar();

    // Obsługa logowania
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            console.log('Próba logowania z e-mailem:', email);
            try {
                const user = await loginUser(email, password);
                console.log('Zalogowano użytkownika:', user);
                window.location.href = 'index.html'; // Przekierowanie po zalogowaniu
            } catch (error) {
                console.error('Błąd podczas logowania:', error);
            }
        });
    }

    // Obsługa rejestracji
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const nickname = document.getElementById('nickname').value;

            console.log('Próba rejestracji z e-mailem:', email);
            try {
                const user = await registerUser(email, password, nickname);
                console.log('Użytkownik zarejestrowany:', user);
                window.location.href = 'login.html'; // Przekierowanie do strony logowania po rejestracji
            } catch (error) {
                console.error('Błąd podczas rejestracji:', error);
            }
        });
    }

    // Obsługa wylogowania
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            console.log('Kliknięto logoutLink');
            try {
                await logoutUser();
                console.log('Wylogowanie zakończone sukcesem');
            } catch (error) {
                console.error('Błąd przy wylogowaniu:', error);
            }
        });
    }
});
