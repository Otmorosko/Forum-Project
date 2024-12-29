import { getUserProfile, updateUserPhoto, updateUserName } from './auth.js';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const userNameElement = document.getElementById('userName');
    const emailDisplayElement = document.getElementById('emailDisplay');
    const profilePicElement = document.getElementById('profilePic');
    const photoInput = document.getElementById('photoInput');
    const updatePhotoBtn = document.getElementById('updatePhotoBtn');
    const navProfilePicElement = document.getElementById('navProfilePic');

    const defaultProfilePic = './icons/user_icon.png';

    // Pobranie i wyświetlenie danych użytkownika
    getUserProfile((profile) => {
        console.log('Pobieranie profilu użytkownika:', profile);

        if (profile) {
            userNameElement.textContent = profile.displayName || 'Nieznany użytkownik';
            emailDisplayElement.textContent = `Zalogowany jako: ${profile.email}`;

            const profilePhotoURL = profile.photoURL || defaultProfilePic;
            profilePicElement.src = `${profilePhotoURL}?t=${Date.now()}`;
            if (navProfilePicElement) {
                navProfilePicElement.src = `${profilePhotoURL}?t=${Date.now()}`;
            }
        } else {
            userNameElement.textContent = 'Niezalogowany użytkownik';
            emailDisplayElement.textContent = '';
            profilePicElement.src = defaultProfilePic;
            if (navProfilePicElement) {
                navProfilePicElement.src = defaultProfilePic;
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

                const response = await fetch('/upload', { // Użyj relatywnej ścieżki
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Błąd przesyłania pliku.');

                const data = await response.json();
                await updateUserPhoto(data.url);

                profilePicElement.src = `${data.url}?t=${Date.now()}`;
                if (navProfilePicElement) {
                    navProfilePicElement.src = `${data.url}?t=${Date.now()}`;
                }

                alert('Zdjęcie zaktualizowano.');
            } catch (error) {
                console.error('Błąd:', error);
                alert('Aktualizacja zdjęcia nie powiodła się.');
            }
        } else {
            alert('Wybierz plik.');
        }
    });

    // Edycja nazwy użytkownika
    const editProfileBtn = document.querySelector('.edit-profile');
    editProfileBtn.addEventListener('click', async () => {
        const newName = prompt('Nowa nazwa:');
        if (newName) {
            try {
                await updateUserName(newName);
                userNameElement.textContent = newName;
                alert('Nazwa zaktualizowana.');
            } catch (error) {
                console.error('Błąd:', error);
                alert('Nie udało się zaktualizować nazwy.');
            }
        }
    });

    // Obsługa zmiany hasła
    const changePasswordBtn = document.querySelector('.change-password');
    changePasswordBtn.addEventListener('click', async () => {
        const newPassword = prompt('Podaj nowe hasło:');
        if (newPassword) {
            try {
                const user = getAuth().currentUser;
                if (!user) throw new Error('Brak zalogowanego użytkownika.');

                const email = user.email;
                const currentPassword = prompt('Podaj obecne hasło:');
                if (!currentPassword) throw new Error('Musisz podać obecne hasło.');

                const credential = EmailAuthProvider.credential(email, currentPassword);
                await reauthenticateWithCredential(user, credential);

                await updatePassword(user, newPassword);
                alert('Hasło zostało zaktualizowane.');
            } catch (error) {
                console.error('Błąd podczas zmiany hasła:', error);
                if (error.code === 'auth/wrong-password') {
                    alert('Podano nieprawidłowe obecne hasło.');
                } else {
                    alert('Nie udało się zaktualizować hasła.');
                }
            }
        }
    });
});
