import { monitorAuthState } from './auth.js';

export const navbarHTML = `
<header>
    <h1>ModHub</h1>
    <nav>
        <a href="index.html">Strona Główna</a>
        <a href="posts.html">Lista Postów</a> <!-- Link do strony z listą postów -->
        <a href="post.html">Dodaj Post</a>
        <div class="user-menu">
            <a href="#" id="userPanelLink">
                <img id="navProfilePic" src="public/icons/user_icon.png" alt="Użytkownik" class="user-icon">
            </a>
            <div class="dropdown-content" id="dropdownMenu">
                <a href="login.html" id="loginLink">Logowanie</a>
                <a href="register.html" id="registerLink">Zarejestruj się</a>
                <a href="user-panel.html" id="profileLink" style="display: none;">Profil</a>
                <a href="#" id="logoutLink" style="display: none;">Wyloguj się</a>
            </div>
        </div>
    </nav>
</header>
`;

export function renderNavbar() {
    // Sprawdzanie, czy navbar już istnieje
    const existingNavbar = document.querySelector('header');
    if (!existingNavbar) {
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);

        // Ustawienia dla zdjęcia i opcji użytkownika
        monitorAuthState((user) => {
            const loginLink = document.getElementById('loginLink');
            const registerLink = document.getElementById('registerLink');
            const logoutLink = document.getElementById('logoutLink');
            const profileLink = document.getElementById('profileLink');
            const navProfilePic = document.getElementById('navProfilePic');

            if (user) {
                // Ustawienia widoczności linków
                if (loginLink) loginLink.style.display = 'none';
                if (registerLink) registerLink.style.display = 'none';
                if (logoutLink) logoutLink.style.display = 'block';
                if (profileLink) profileLink.style.display = 'block';

                // Ustawienia zdjęcia profilowego
                if (navProfilePic) {
                    navProfilePic.src = user.photoURL || 'public/icons/user_icon.png';
                }
            } else {
                // Przywracanie domyślnej widoczności
                if (loginLink) loginLink.style.display = 'block';
                if (registerLink) registerLink.style.display = 'block';
                if (logoutLink) logoutLink.style.display = 'none';
                if (profileLink) profileLink.style.display = 'none';

                // Ustawienie domyślnego zdjęcia
                if (navProfilePic) {
                    navProfilePic.src = 'public/icons/user_icon.png';
                }
            }
        });
    }
}

// Wywołanie renderowania navbaru na każdej stronie
document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
});
