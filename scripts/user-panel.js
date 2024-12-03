document.addEventListener('DOMContentLoaded', function() {
    const existingNicknames = new Set(); // Przechowuje istniejące nicki

    // Funkcja do generowania tymczasowego nicku
    function generateTemporaryNickname() {
        const randomSuffix = Math.random().toString(36).substring(2, 7); // Losowy ciąg znaków
        return `User  ${randomSuffix}`;
    }

    // Ustawienie domyślnego nicku
    let userNickname = generateTemporaryNickname();
    existingNicknames.add(userNickname);
    document.getElementById('nickname').value = userNickname;

    // Obsługa formularza zmiany nicku
    document.getElementById('nicknameForm').addEventListener('submit', function(event) {
        event.preventDefault(); // Zapobiega przeładowaniu strony

        const newNickname = document.getElementById('nickname').value;

        // Sprawdzenie, czy nowy nick jest już zajęty
        if (existingNicknames.has(newNickname)) {
            document.getElementById('message').textContent = 'Ten nick jest już zajęty. Wybierz inny.';
        } else {
            existingNicknames.add(newNickname);
            userNickname = newNickname;
            document.getElementById('message').textContent = `Nick został zmieniony na: ${userNickname}`;
        }
    });
});