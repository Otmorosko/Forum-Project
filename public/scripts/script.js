import { renderNavbar } from './navbar.js';
import { updateNavLinks, loginUser, logoutUser, registerUser, monitorAuthState } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Wstawienie nawigacji
    renderNavbar();

    // Aktualizacja linków nawigacyjnych w zależności od stanu logowania
    updateNavLinks();

    // Monitorowanie stanu logowania dla ikony profilu
    monitorAuthState((user) => {
        const profileImage = document.querySelector('.user-icon');
        const profileLink = document.getElementById('profileLink');

        if (user) {
            // Jeśli użytkownik jest zalogowany, zmień ikonę na zdjęcie profilowe
            profileImage.src = user.photoURL || localStorage.getItem('profilePhoto') || 'icons/user_icon.png';

            // Pokaż przycisk "Profil"
            if (profileLink) {
                profileLink.style.display = 'block';
            }
        } else {
            // Ustaw domyślną ikonę dla niezalogowanego użytkownika
            profileImage.src = 'icons/user_icon.png';

            // Ukryj przycisk "Profil"
            if (profileLink) {
                profileLink.style.display = 'none';
            }
        }
    });

    // Obsługa rejestracji
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const nickname = document.getElementById('nickname').value;

            try {
                const user = await registerUser(email, password, nickname);
                console.log('Użytkownik zarejestrowany:', user);
                window.location.href = 'index.html'; // Przekierowanie po rejestracji
            } catch (error) {
                console.error('Błąd rejestracji:', error);
                alert('Błąd rejestracji. Spróbuj ponownie.');
            }
        });
    }

    // Obsługa logowania
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const user = await loginUser(email, password);
                console.log('Zalogowano użytkownika:', user);
                window.location.href = 'index.html'; // Przekierowanie po zalogowaniu
            } catch (error) {
                console.error('Błąd podczas logowania:', error);
                alert('Nieprawidłowe dane logowania.');
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
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Błąd przy wylogowaniu:', error);
                alert('Nie udało się wylogować. Spróbuj ponownie.');
            }
        });
    }
});
