const navbarHTML = `
    <header>
        <img src="icons/logo.png" alt="Logo ModHub" class="logo"> <!-- Dodaj logo -->
        <h1>ModHub</h1>
        <nav>
            <a href="../html/index.html">Strona Główna</a>
            <a href="../html/login.html">Logowanie</a>
            <a href="../html/register.html">Rejestracja</a>
            <a href="../html/post.html">Dodaj Post</a>
            <a href="../html/user-panel.html" id="userPanelLink"><img src="icons/user_icon.png" alt="Użytkownik" class="user-icon"></a>
        </nav>
    </header>
`;
document.body.insertAdjacentHTML('afterbegin', navbarHTML);