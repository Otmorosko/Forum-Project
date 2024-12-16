import { getUserProfile } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const userNameElement = document.getElementById('userName');
    const emailDisplayElement = document.getElementById('emailDisplay');
    const profilePicElement = document.getElementById('profilePic');
    const photoInput = document.getElementById('photoInput');
    const updatePhotoBtn = document.getElementById('updatePhotoBtn');
    const navProfilePic = document.getElementById('profileLink'); // Zdjęcie w nawigacji

    // Wczytywanie danych z Local Storage przy starcie
    const storedPhoto = localStorage.getItem('profilePhoto');
    const storedName = localStorage.getItem('userName');

    if (storedPhoto) {
        profilePicElement.src = storedPhoto;
        if (navProfilePic) navProfilePic.src = storedPhoto; // Aktualizacja nawigacji
    } else {
        profilePicElement.src = 'public/icons/user_icon.png';
    }

    if (storedName) {
        userNameElement.textContent = storedName;
    } else {
        userNameElement.textContent = 'Nieznany użytkownik';
    }

    // Pobranie i wyświetlenie danych użytkownika z profilu
    getUserProfile((profile) => {
        if (profile) {
            userNameElement.textContent = profile.displayName || storedName || 'Nieznany użytkownik';
            emailDisplayElement.textContent = `Zalogowany jako: ${profile.email}`;

            // Aktualizacja zdjęcia na stronie i w nawigacji
            if (profile.photoURL) {
                profilePicElement.src = profile.photoURL;
                if (navProfilePic) navProfilePic.src = profile.photoURL;
                localStorage.setItem('profilePhoto', profile.photoURL);
            }
        }
    });

    // Obsługa przesyłania nowego zdjęcia
    updatePhotoBtn.addEventListener('click', () => {
        const file = photoInput.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                const photoURL = e.target.result;
                localStorage.setItem('profilePhoto', photoURL);
                profilePicElement.src = photoURL;

                // Aktualizacja zdjęcia w nawigacji
                if (navProfilePic) navProfilePic.src = photoURL;

                alert('Zdjęcie profilowe zostało zaktualizowane.');
            };

            reader.readAsDataURL(file);
        } else {
            alert('Wybierz plik przed aktualizacją zdjęcia.');
        }
    });
});
