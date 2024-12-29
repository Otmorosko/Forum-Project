const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['https://forum-project-20acc.web.app'], // Domena Firebase
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true
    }
});

const port = 3000;

// Konfiguracja SQLite
const db = new Database('database.db');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Tworzenie katalogu uploads, jeśli nie istnieje
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log(`Katalog ${uploadDir} został utworzony.`);
}

app.use(cors({
    origin: ['https://forum-project-20acc.web.app'], // Domena Firebase
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

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

// Endpoint do przesyłania plików
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        console.error('Brak pliku w żądaniu.');
        return res.status(400).json({ error: 'Brak pliku do przesłania.' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log('Przesłano plik:', fileUrl);
    res.json({ url: fileUrl });
});

// Middleware do serwowania plików statycznych
app.use('/uploads', express.static(uploadDir));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Obsługa Socket.IO
io.on('connection', (socket) => {
    console.log('Użytkownik połączony:', socket.id);

    try {
        const messages = db.prepare('SELECT * FROM messages ORDER BY timestamp ASC').all();
        console.log(`Wysłano historię wiadomości do ${socket.id}, liczba wiadomości: ${messages.length}`);
        socket.emit('chat history', messages);
    } catch (err) {
        console.error('Błąd podczas pobierania wiadomości:', err.message);
    }

    socket.on('chat message', ({ text, author }) => {
        if (!text || !author) {
            console.error('Nieprawidłowe dane wiadomości: brak tekstu lub autora.');
            return;
        }

        try {
            const stmt = db.prepare('INSERT INTO messages (text, author) VALUES (?, ?)');
            const info = stmt.run(text, author);
            const newMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);

            console.log('Dodano nową wiadomość:', newMessage);
            io.emit('chat message', newMessage);
        } catch (err) {
            console.error('Błąd podczas dodawania wiadomości do bazy danych:', err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('Użytkownik rozłączony:', socket.id);
    });
});

// Endpoint do pobierania kategorii z podkategoriami i wątkami
app.get('/api/categories', (req, res) => {
    const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.json');
    const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');

    fs.readFile(CATEGORIES_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Błąd odczytu pliku categories.json:', err);
            return res.status(500).json({ error: 'Błąd pobierania danych kategorii.' });
        }
        try {
            const categories = JSON.parse(data);
            fs.readFile(POSTS_FILE, 'utf8', (err, postsData) => {
                if (err) {
                    console.error('Błąd odczytu pliku posts.json:', err);
                    return res.status(500).json({ error: 'Błąd pobierania postów.' });
                }

                const posts = JSON.parse(postsData);

                categories.forEach(category => {
                    if (!category.subcategories) category.subcategories = [];
                    category.subcategories.forEach(subcategory => {
                        if (!subcategory.threads) subcategory.threads = [];
                        subcategory.threads = posts.filter(
                            post => post.category === category.name && post.subcategory === subcategory.name
                        );
                    });
                });

                console.log('Wysłano kategorie:', categories);
                res.json(categories);
            });
        } catch (parseError) {
            console.error('Błąd parsowania danych kategorii:', parseError);
            res.status(500).json({ error: 'Błąd parsowania danych kategorii.' });
        }
    });
});

// Serwowanie głównej strony
app.get('/', (req, res) => {
    console.log('Żądanie głównej strony');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start serwera
server.listen(port, () => {
    console.log(`Serwer działa na http://localhost:${port}`);
    console.log(`Socket.IO dostępny pod /socket.io/socket.io.js`);
});
