const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3000;

// Tworzenie katalogu uploads, jeśli nie istnieje
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log(`Katalog ${uploadDir} został utworzony.`);
}

// Middleware CORS
app.use(cors());

// Middleware do parsowania JSON
app.use(express.json());

// Pliki danych
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');
const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.json');

// Inicjalizacja plików z danymi, jeśli nie istnieją
if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(CATEGORIES_FILE)) {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify([]));
}

// Konfiguracja Multer do przesyłania plików
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedFileName = file.originalname
            .replace(/[^a-z0-9.]/gi, '_')
            .toLowerCase();
        cb(null, `${Date.now()}-${sanitizedFileName}`);
    }
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        console.error('Brak pliku w żądaniu.');
        return res.status(400).json({ error: 'Brak pliku do przesłania.' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Middleware do serwowania plików statycznych
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Endpoint do pobierania kategorii z podkategoriami i wątkami
app.get('/api/categories', (req, res) => {
    fs.readFile(CATEGORIES_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Błąd odczytu pliku categories.json:', err);
            return res.status(500).json({ error: 'Błąd pobierania danych kategorii.' });
        }
        try {
            const categories = JSON.parse(data);

            // Pobranie postów dla podkategorii
            fs.readFile(POSTS_FILE, 'utf8', (err, postsData) => {
                if (err) {
                    console.error('Błąd odczytu pliku posts.json:', err);
                    return res.status(500).json({ error: 'Błąd pobierania postów.' });
                }

                const posts = JSON.parse(postsData);

                // Walidacja i dodanie postów do odpowiednich podkategorii
                categories.forEach(category => {
                    if (!category.subcategories) category.subcategories = [];
                    category.subcategories.forEach(subcategory => {
                        if (!subcategory.threads) subcategory.threads = [];
                        subcategory.threads = posts.filter(
                            post => post.category === category.name && post.subcategory === subcategory.name
                        );
                    });
                });

                res.json(categories);
            });
        } catch (parseError) {
            console.error('Błąd parsowania danych kategorii:', parseError);
            res.status(500).json({ error: 'Błąd parsowania danych kategorii.' });
        }
    });
});

// Endpoint do dodawania nowego posta
app.post('/api/posts', (req, res) => {
    const newPost = req.body;

    // Walidacja danych
    if (!newPost.title || !newPost.author || !newPost.subcategory || !newPost.category) {
        return res.status(400).json({ error: "Wszystkie pola są wymagane: title, author, subcategory, category." });
    }

    // Dodanie posta do istniejących danych
    fs.readFile(POSTS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Błąd odczytu pliku posts.json:', err);
            return res.status(500).json({ error: 'Błąd podczas zapisu nowego posta.' });
        }

        const posts = JSON.parse(data || '[]'); // Jeśli plik jest pusty, inicjalizujemy pustą tablicę
        posts.push(newPost);

        // Zapis zaktualizowanych danych do pliku
        fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Błąd zapisu do pliku posts.json:', writeErr);
                return res.status(500).json({ error: 'Błąd podczas zapisu nowego posta.' });
            }

            res.status(201).json({ message: 'Post został pomyślnie dodany!', post: newPost });
        });
    });
});

// Endpoint do pobierania wszystkich postów
app.get('/api/posts', (req, res) => {
    fs.readFile(POSTS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Błąd odczytu pliku posts.json:', err);
            return res.status(500).json({ error: 'Błąd pobierania postów.' });
        }
        try {
            const posts = JSON.parse(data);
            res.json(posts);
        } catch (parseError) {
            console.error('Błąd parsowania danych postów:', parseError);
            res.status(500).json({ error: 'Błąd parsowania danych postów.' });
        }
    });
});

// Middleware do obsługi plików w folderze publicznym
app.use(express.static('public'));

// Ustawienie głównej strony
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start serwera
app.listen(port, () => {
    console.log(`Serwer działa na http://localhost:${port}`);
    console.log(`Statyczny katalog uploads: ${path.join(__dirname, 'uploads')}`);
});
