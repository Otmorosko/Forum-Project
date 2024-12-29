import { monitorAuthState, logoutUser } from './auth.js';

export const navbarHTML = `
<header>
    <h1>ModHub</h1>
    <nav>
        <a href="index.html">Strona Główna</a>
        <a href="posts.html">Lista Postów</a>
        <a href="post.html">Dodaj Post</a>
        <div class="user-menu">
            <a href="#" id="userPanelLink">
                <img id="navProfilePic" src="./icons/user_icon.png" alt="Użytkownik" class="user-icon">
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
    console.log('Start renderNavbar');
    const existingNavbar = document.querySelector('header');
    if (!existingNavbar) {
        console.log('Navbar does not exist. Injecting navbarHTML...');
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    }

    // Monitorowanie stanu użytkownika
    monitorAuthState((user) => {
        console.log('monitorAuthState triggered:', user);

        const loginLink = document.getElementById('loginLink');
        const registerLink = document.getElementById('registerLink');
        const logoutLink = document.getElementById('logoutLink');
        const profileLink = document.getElementById('profileLink');
        const navProfilePic = document.getElementById('navProfilePic');

        const defaultProfilePic = './icons/user_icon.png';

        if (user) {
            console.log('User is logged in:', user);
            loginLink.style.display = 'none';
            registerLink.style.display = 'none';
            profileLink.style.display = 'block';
            logoutLink.style.display = 'block';

            const photoURL = user.photoURL || defaultProfilePic;
            if (navProfilePic) {
                console.log('Setting profile picture to:', photoURL);
                navProfilePic.src = photoURL;
            }
        } else {
            console.log('User is not logged in.');
            loginLink.style.display = 'block';
            registerLink.style.display = 'block';
            profileLink.style.display = 'none';
            logoutLink.style.display = 'none';

            if (navProfilePic) {
                console.log('Setting profile picture to default:', defaultProfilePic);
                navProfilePic.src = defaultProfilePic;
            }
        }
    });

    // Obsługa wylogowania
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                console.log('Logging out...');
                await logoutUser();
                alert('Logged out successfully.');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenuContent = document.getElementById('mobileMenuContent');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuContent.classList.toggle('active');
        });
    }
});


document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded triggered');
    renderNavbar();
});
