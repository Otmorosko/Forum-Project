// Pobieranie kategorii i podkategorii
async function loadCategories() {
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');

    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();

        // Wypełnianie selecta kategoriami
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });

        // Obsługa zmiany kategorii, by załadować odpowiednie podkategorie
        categorySelect.addEventListener('change', () => {
            const selectedCategory = categories.find(c => c.name === categorySelect.value);
            subcategorySelect.innerHTML = ''; // Reset podkategorii

            if (selectedCategory) {
                selectedCategory.subcategories.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.name;
                    option.textContent = sub.name;
                    subcategorySelect.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Błąd podczas ładowania kategorii:', error);
    }
}

// Obsługa formularza dodawania posta
document.getElementById('addPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const category = document.getElementById('category').value;
    const subcategory = document.getElementById('subcategory').value;

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, category, subcategory })
        });

        const result = await response.json();
        const messageDiv = document.getElementById('message');
        if (response.ok) {
            messageDiv.textContent = result.message;
            messageDiv.style.color = 'green';
            document.getElementById('addPostForm').reset();
        } else {
            messageDiv.textContent = result.error;
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        console.error('Błąd podczas dodawania posta:', error);
    }
});

// Inicjalizacja ładowania kategorii
loadCategories();
