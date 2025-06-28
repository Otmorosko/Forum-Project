import { monitorAuthState } from './auth.js';

// Pobieranie kategorii i podkategorii
async function loadCategories() {
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');

    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error('Błąd podczas ładowania kategorii: ' + response.statusText);
        }
        const categories = await response.json();

        // Wypełnianie selecta kategoriami
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id; 
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });

        // Obsługa zmiany kategorii, by załadować odpowiednie podkategorie
        categorySelect.addEventListener('change', async () => {
            subcategorySelect.innerHTML = ''; 
            const selectedCategoryId = parseInt(categorySelect.value);
            console.log('Selected category ID:', selectedCategoryId);
            try {
                const subResponse = await fetch(`/api/subcategories?categoryId=${selectedCategoryId}`);
                if (!subResponse.ok) {
                    throw new Error('Błąd podczas ładowania podkategorii: ' + subResponse.statusText);
                }
                const subcategories = await subResponse.json();
                console.log('Fetched subcategories:', subcategories);

                subcategories.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id; 
                    option.textContent = sub.name;
                    subcategorySelect.appendChild(option);
                });
            } catch (error) {
                console.error(error);
                document.getElementById('message').textContent = error.message;
            }
        });
    } catch (error) {
 console.error('Błąd podczas ładowania kategorii:', error);
        document.getElementById('message').textContent = error.message;
    }
}

// Funkcje do formatowania tekstu i dodawania obrazów
window.formatText = function(command) {
    document.execCommand(command, false, null);
    document.getElementById('editor').focus();
};

window.insertImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = `<img src="${e.target.result}" alt="Image" style="max-width: 100%; height: auto;">`;
            document.getElementById('editor').innerHTML += img;
        };
        reader.readAsDataURL(file);
    }
};

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();

    // Monitorowanie stanu logowania
    monitorAuthState((user) => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });

    const form = document.getElementById('addPostForm');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const title = document.getElementById('title').value;
        const category = document.getElementById('category').value;
        const subcategory = document.getElementById('subcategory').value;
        const content = document.getElementById('editor').innerHTML;

        // Wysyłanie danych do serwera
        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, category, subcategory, content }),
            });

            if (response.ok) {
                document.getElementById('message').textContent = 'Post został dodany pomyślnie!';
                form.reset();
                document.getElementById('editor').innerHTML = '';
            } else {
                throw new Error('Błąd podczas dodawania posta: ' + response.statusText);
            }
        } catch (error) {
            console.error(error);
            document.getElementById('message').textContent = error.message;
        }
    });
});