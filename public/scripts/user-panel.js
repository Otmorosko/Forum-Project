import { renderNavbar } from './navbar.js';
import { monitorAuthState, updateNavLinks, getUserProfile } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Wyświetlenie nazwy użytkownika i adresu e-mail
    const userNameElement = document.querySelector('.user-profile h2'); // Element, gdzie wyświetlamy nazwę
    const userEmailElement = document.querySelector('.user-profile p'); // Element na e-mail

    getUserProfile((profile) => {
        if (profile) {
            userNameElement.textContent = profile.displayName; // Ustawienie nazwy użytkownika
            userEmailElement.textContent = `Zalogowany jako: ${profile.email}`; // Ustawienie e-maila
        } else {
            userNameElement.textContent = 'Niezalogowany użytkownik';
            userEmailElement.textContent = '';
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Wstawienie paska nawigacyjnego
    renderNavbar();

    // Aktualizacja linków nawigacyjnych w zależności od stanu logowania
    updateNavLinks();

    // Wyświetlenie informacji o użytkowniku
    const emailDisplay = document.getElementById('emailDisplay');
    monitorAuthState((user) => {
        if (user) {
            emailDisplay.textContent = `Zalogowany jako: ${user.email}`;
        } else {
            emailDisplay.textContent = 'Brak zalogowanego użytkownika.';
        }
    });

    // Obsługa zmiany nicku
    const nicknameForm = document.getElementById('nicknameForm');
    if (nicknameForm) {
        nicknameForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const nickname = document.getElementById('nickname').value;
            document.getElementById('message').textContent = `Nick został zmieniony na: ${nickname}`;
        });
    }
});
