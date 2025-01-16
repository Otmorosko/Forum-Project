const footerHTML = `
<footer>
    <div class="footer-container">
        <div class="footer-brand">
            <h2>MODHUB</h2>
            <p>Twórz, dziel się i odkrywaj nowe modyfikacje do swoich ulubionych gier.</p>
            <div class="footer-socials">
                <a href="#" class="social-icon"><img src="./icons/instagram.png" alt="Instagram"></a>
                <a href="#" class="social-icon"><img src="./icons/twitter.png" alt="Twitter"></a>
                <a href="#" class="social-icon"><img src="./icons/linkedin.png" alt="LinkedIn"></a>
            </div>
        </div>
        <div class="footer-links">
            <div class="footer-column">
                <h3>Modyfikacje</h3>
                <ul>
                    <li><a href="#">Dyskusje</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>O nas</h3>
                <ul>
                    <li><a href="#">Społeczność</a></li>
                    <li><a href="#">Aktualizacje</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>Kontakt</h3>
                <ul>
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
    document.body.insertAdjacentHTML('beforeend', footerHTML);
});
