import { getUserProfile, updateUserPhoto, updateUserName } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const userNameElement = document.getElementById('userName');
    const emailDisplayElement = document.getElementById('emailDisplay');
    const profilePicElement = document.getElementById('profilePic');
    const photoInput = document.getElementById('photoInput');
    const updatePhotoBtn = document.getElementById('updatePhotoBtn');

    const navProfilePicElement = document.getElementById('navProfilePic'); 

    // Pobranie i wyświetlenie danych użytkownika
    getUserProfile((profile) => {
        if (profile) {
            userNameElement.textContent = profile.displayName || 'Nieznany użytkownik';
            emailDisplayElement.textContent = `Zalogowany jako: ${profile.email}`;

            // Ustaw zdjęcie profilowe na stronie głównej
            const profilePhotoURL = profile.photoURL || 'public/icons/user_icon.png';
            profilePicElement.src = `${profilePhotoURL}?t=${Date.now()}`;

            // Zaktualizuj zdjęcie profilowe w navbarze
            if (navProfilePicElement) {
                navProfilePicElement.src = `${profilePhotoURL}?t=${Date.now()}`;
            }
        } else {
            userNameElement.textContent = 'Niezalogowany użytkownik';
            emailDisplayElement.textContent = '';
            profilePicElement.src = 'public/icons/user_icon.png';
            if (navProfilePicElement) {
                navProfilePicElement.src = 'public/icons/user_icon.png';
            }
        }
    });

    // Obsługa aktualizacji zdjęcia
    updatePhotoBtn.addEventListener('click', async () => {
        const file = photoInput.files[0];
        if (file) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                // Wysyłanie pliku na backend
                const response = await fetch('http://localhost:3000/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Błąd podczas przesyłania pliku.');
                }

                const data = await response.json();
                console.log('URL zdjęcia z serwera:', data.url);

                // Zaktualizuj zdjęcie profilowe w Firebase
                await updateUserPhoto(data.url);

                // Ustawienie nowego zdjęcia profilowego na stronie
                profilePicElement.src = `${data.url}?t=${Date.now()}`;
                if (navProfilePicElement) {
                    navProfilePicElement.src = `${data.url}?t=${Date.now()}`;
                }

                alert('Zdjęcie profilowe zostało zaktualizowane.');
            } catch (error) {
                console.error('Błąd podczas aktualizacji zdjęcia:', error);
                alert('Nie udało się zaktualizować zdjęcia.');
            }
        } else {
            alert('Wybierz plik przed aktualizacją zdjęcia.');
        }
    });

    // Obsługa edycji nazwy użytkownika
    const editProfileBtn = document.querySelector('.edit-profile');
    editProfileBtn.addEventListener('click', async () => {
        const newName = prompt('Podaj nową nazwę użytkownika:');
        if (newName) {
            try {
                await updateUserName(newName); 
                userNameElement.textContent = newName;
                alert('Nazwa użytkownika została zaktualizowana.');
            } catch (error) {
                console.error('Błąd podczas aktualizacji nazwy:', error);
                alert('Nie udało się zaktualizować nazwy użytkownika.');
            }
        }
    });
});
