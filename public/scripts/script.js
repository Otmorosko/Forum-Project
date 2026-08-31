import { renderNavbar } from './navbar.js';
import { loginUser, logoutUser, registerUser } from './auth.js';

let captchaEnabled = false;
let loginWidgetId = null;
let registerWidgetId = null;

async function loadCaptchaConfig() {
    try {
        const res = await fetch('/api/security/captcha/config');
        if (!res.ok) return { enabled: false, siteKey: '' };
        return await res.json();
    } catch {
        return { enabled: false, siteKey: '' };
    }
}

function renderTurnstileWidget(containerId, siteKey) {
    const container = document.getElementById(containerId);
    if (!container || !siteKey || !window.turnstile) return null;
    return window.turnstile.render(container, {
        sitekey: siteKey,
        theme: 'dark',
    });
}

function getCaptchaToken(widgetId) {
    if (!captchaEnabled || widgetId === null || !window.turnstile) return null;
    return window.turnstile.getResponse(widgetId);
}

async function verifyCaptchaOrThrow(widgetId) {
    if (!captchaEnabled) return;

    const token = getCaptchaToken(widgetId);
    if (!token) {
        throw new Error('Potwierdź CAPTCHA przed kontynuacją.');
    }

    const res = await fetch('/api/security/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });

    if (!res.ok) {
        throw new Error('Weryfikacja CAPTCHA nie powiodła się.');
    }
}

function resetCaptcha(widgetId) {
    if (!captchaEnabled || widgetId === null || !window.turnstile) return;
    window.turnstile.reset(widgetId);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM załadowany, inicjalizacja navbaru...');
    renderNavbar();

    // Inicjalizacja CAPTCHA
    loadCaptchaConfig().then((cfg) => {
        captchaEnabled = Boolean(cfg?.enabled && cfg?.siteKey);
        if (!captchaEnabled) return;

        loginWidgetId = renderTurnstileWidget('captchaContainerLogin', cfg.siteKey);
        registerWidgetId = renderTurnstileWidget('captchaContainerRegister', cfg.siteKey);
    });

    // Obsługa logowania
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            console.log('Próba logowania z e-mailem:', email);
            try {
                await verifyCaptchaOrThrow(loginWidgetId);
                const user = await loginUser(email, password);
                console.log('Zalogowano użytkownika:', user);
                window.location.href = 'index.html'; // Przekierowanie po zalogowaniu
            } catch (error) {
                console.error('Błąd podczas logowania:', error);
                resetCaptcha(loginWidgetId);
            }
        });
    }

    // Obsługa rejestracji
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const nickname = document.getElementById('nickname').value;

            console.log('Próba rejestracji z e-mailem:', email);
            try {
                await verifyCaptchaOrThrow(registerWidgetId);
                const user = await registerUser(email, password, nickname);
                console.log('Użytkownik zarejestrowany:', user);
                window.location.href = 'login.html'; // Przekierowanie do strony logowania po rejestracji
            } catch (error) {
                console.error('Błąd podczas rejestracji:', error);
                resetCaptcha(registerWidgetId);
            }
        });
    }

    // Obsługa wylogowania
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            console.log('Kliknięto logoutLink');
            try {
                await logoutUser();
                console.log('Wylogowanie zakończone sukcesem');
            } catch (error) {
                console.error('Błąd przy wylogowaniu:', error);
            }
        });
    }
});
