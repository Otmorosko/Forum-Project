const footerHTML = `
<footer>
    <div class="footer-container">
        <div class="footer-brand">
            <h2>MODHUB</h2>
            <p>Wzbogacaj swoją rozgrywkę dzięki modom.</p>
            <div class="footer-socials">
                <a href="#" class="social-icon">Instagram</a>
                <a href="#" class="social-icon">Twitter</a>
                <a href="#" class="social-icon">LinkedIn</a>
            </div>
        </div>
        <div class="footer-links">
            <div class="footer-column">
                <h3>Modyfikacje</h3>
                <ul>
                    <li><a href="#">Dyskusje</a></li>
                    <li><a href="#">Współprace</a></li>
                    <li><a href="#">Premium</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>Udostępnianie</h3>
                <ul>
                    <li><a href="#">Dołącz teraz</a></li>
                    <li><a href="#">Porównanie</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>O nas</h3>
                <ul>
                    <li><a href="#">Społeczność</a></li>
                    <li><a href="#">Możliwości</a></li>
                    <li><a href="#">Aktualizacje</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>Zasoby</h3>
                <ul>
                    <li><a href="#">Blog</a></li>
                    <li><a href="#">Baza wiedzy</a></li>
                    <li><a href="#">Obsługa klienta</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>Wsparcie</h3>
                <ul>
                    <li><a href="#">Czat</a></li>
                    <li><a href="#">Sugestie</a></li>
                    <li><a href="#">Kontakt</a></li>
                </ul>
            </div>
        </div>
    </div>
</footer>
`;

// Dodanie footerHTML do DOM
document.addEventListener('DOMContentLoaded', function() {
    // Wstawienie stopki na końcu body
    document.body.insertAdjacentHTML('beforeend', footerHTML);
});
