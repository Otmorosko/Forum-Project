const footerHTML = `
<footer>
    <div class="footer-container">
        <div class="footer-brand">
            <h2>MODHUB</h2>
            <p>Empower your gaming journey with mods.</p>
            <div class="footer-socials">
                <a href="#" class="social-icon">Instagram</a>
                <a href="#" class="social-icon">Twitter</a>
                <a href="#" class="social-icon">LinkedIn</a>
            </div>
        </div>
        <div class="footer-links">
            <div class="footer-column">
                <h3>Mods</h3>
                <ul>
                    <li><a href="#">Discussions</a></li>
                    <li><a href="#">Collaborations</a></li>
                    <li><a href="#">Premium</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>Sharing</h3>
                <ul>
                    <li><a href="#">Join now</a></li>
                    <li><a href="#">Comparison</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>About us</h3>
                <ul>
                    <li><a href="#">Community</a></li>
                    <li><a href="#">Opportunities</a></li>
                    <li><a href="#">Updates</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>Resources</h3>
                <ul>
                    <li><a href="#">Blog</a></li>
                    <li><a href="#">Knowledge base</a></li>
                    <li><a href="#">Customer service</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h3>Support</h3>
                <ul>
                    <li><a href="#">Chat</a></li>
                    <li><a href="#">Suggestions</a></li>
                    <li><a href="#">Contact us</a></li>
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