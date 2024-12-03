// navbar.js
const navbarHTML = `
    <header>
        <img src="path/to/your/logo.png" alt="Logo ModHub" class="logo"> <!-- Dodaj logo -->
        <h1>ModHub</h1>
        <nav>
            <a href="index.html">Strona Główna</a>
            <a href="login.html">Logowanie</a>
            <a href="register.html">Rejestracja</a>
            <a href="post.html">Dodaj Post</a>
        </nav>
    </header>
`;

function loadNavbar() {
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
}

// Wywołanie funkcji do załadowania nawigacji
loadNavbar();