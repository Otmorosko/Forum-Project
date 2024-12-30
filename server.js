const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Inicjalizacja Firebase Admin SDK z użyciem pliku JSON
const path = require('path');

const serviceAccountPath = process.env.NODE_ENV === 'production'
    ? '/etc/secrets/forum-project-20acc-firebase-adminsdk-fo2om-75a82d9350.json'
    : path.join(__dirname, 'secrets', 'forum-project-20acc-firebase-adminsdk-fo2om-75a82d9350.json');

const serviceAccount = require(serviceAccountPath);



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://forum-project-20acc-default-rtdb.firebaseio.com",
    projectId: "forum-project-20acc" 
});


// Tworzenie aplikacji Express i serwera HTTP
const app = express();
const server = http.createServer(app);

// Inicjalizacja Socket.IO
const io = new Server(server, {
    cors: {
        origin: 'https://forum-project-20acc.web.app',
        methods: ['GET', 'POST', 'OPTIONS'],
    },
});

// Konfiguracja Firebase Firestore
const db = getFirestore();

// Middleware do obsługi CORS
app.use(cors({
    origin: 'https://forum-project-20acc.web.app',
    methods: ['GET', 'POST', 'OPTIONS'],
}));

app.use(express.json());

// Konfiguracja Multer do lokalnego przesyłania plików
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log(`Katalog ${uploadDir} został utworzony.`);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedFileName = file.originalname
            .replace(/[^a-z0-9.]/gi, '_')
            .toLowerCase();
        cb(null, `${Date.now()}-${sanitizedFileName}`);
    },
});

const upload = multer({ storage });

// Obsługa Socket.IO
io.on('connection', (socket) => {
    console.log('Użytkownik połączony:', socket.id);

    // Pobieranie historii wiadomości
    db.collection('messages').orderBy('timestamp', 'asc').get()
        .then((snapshot) => {
            const messages = snapshot.docs.map((doc) => doc.data());
            socket.emit('chat history', messages);
        })
        .catch((error) => console.error('Błąd pobierania wiadomości:', error));

    // Obsługa nowych wiadomości
    socket.on('chat message', async ({ text, author }) => {
        if (!text || !author) {
            console.error('Nieprawidłowe dane wiadomości: brak tekstu lub autora.');
            return;
        }

        const newMessage = {
            text,
            author,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        try {
            const docRef = await db.collection('messages').add(newMessage);
            const savedMessage = (await docRef.get()).data();
            io.emit('chat message', savedMessage);
        } catch (error) {
            console.error('Błąd podczas dodawania wiadomości:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Użytkownik rozłączony:', socket.id);
    });
});

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

// Middleware do serwowania przesłanych plików
app.use('/uploads', express.static(uploadDir));

// Endpoint do pobierania kategorii z podkategoriami i wątkami
app.get('/api/categories', async (req, res) => {
    try {
        const categoriesSnapshot = await db.collection('categories').get();
        const categories = categoriesSnapshot.docs.map((doc) => doc.data());
        res.json(categories);
    } catch (error) {
        console.error('Błąd podczas pobierania kategorii:', error);
        res.status(500).json({ error: 'Błąd pobierania kategorii.' });
    }
});

// Start serwera
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
