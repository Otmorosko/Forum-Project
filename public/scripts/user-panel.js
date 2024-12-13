import { renderNavbar } from './navbar.js';
import { monitorAuthState, updateNavLinks } from './auth.js';

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
