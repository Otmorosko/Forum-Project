export const navbarHTML = `
<header>
    <h1>ModHub</h1>
    <nav>
        <a href="index.html">Strona Główna</a> 
        <a href="post.html">Dodaj Post</a>
        <div class="user-menu">
            <a href="user-panel.html" id="userPanelLink">
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

// Funkcja do wstawienia paska nawigacyjnego do DOM
export function renderNavbar() {
    const existingNavbar = document.querySelector('header');
    if (!existingNavbar) {
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    }
}
