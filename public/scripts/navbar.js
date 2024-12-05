const navbarHTML = `
<header>
    <img src="icons/logo.png" alt="Logo ModHub" class="logo"> 
    <h1>ModHub</h1>
    <nav>
        <a href="index.html">Strona Główna</a> 
        <a href="login.html">Logowanie</a> 
        <a href="register.html">Zarejestruj się</a> 
        <a href="post.html">Dodaj Post</a>
        <div class="user-menu">
            <a href="#" id="userPanelLink">
                <img src="icons/user_icon.png" alt="Użytkownik" class="user-icon"> 
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

// Dodanie navbarHTML do DOM
document.addEventListener('DOMContentLoaded', function() {
    // Wstawienie navbaru na początku body
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
});