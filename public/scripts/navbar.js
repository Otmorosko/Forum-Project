import { monitorAuthState, logoutUser  } from './auth.js';

export const navbarHTML = `
<header>
    <h1>ModHub</h1>
    <nav>
        <a href="index.html">Strona Główna</a>
        <a href="posts.html">Lista Postów</a>
        <a href="post.html">Dodaj Post</a>
        <div class="user-menu">
            <a href="#" id="userPanelLink">
                <img id="navProfilePic" src="icons/user_icon.png" alt="Użytkownik" class="user-icon">
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
        
            const defaultProfilePic = 'public/icons/user_icon.png'; // Użyj względnej ścieżki
        
            if (user) {
                // Użytkownik jest zalogowany
                loginLink.style.display = 'none';
                registerLink.style.display = 'none';
                profileLink.style.display = 'block';
                logoutLink.style.display = 'block';
        
                // Ustawienia zdjęcia profilowego
                if (navProfilePic) {
                    navProfilePic.src = user.photoURL || defaultProfilePic; // Użyj zdjęcia użytkownika lub domyślnego
                }
            } else {
                // Użytkownik nie jest zalogowany
                loginLink.style.display = 'block';
                registerLink.style.display = 'block';
                profileLink.style.display = 'none';
                logoutLink.style.display = 'none';
        
                // Ustawienie domyślnego zdjęcia
                if (navProfilePic) {
                    navProfilePic.src = defaultProfilePic; // Użyj domyślnego zdjęcia
                }
            }
        });

        // Obsługa wylogowania
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (event) => {
                event.preventDefault();
                try {
                    await logoutUser ();
                } catch (error) {
                    console.error('Błąd przy wylogowaniu:', error);
                }
            });
        }
    }
}

// Wywołanie renderowania navbaru na każdej stronie
 document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
});