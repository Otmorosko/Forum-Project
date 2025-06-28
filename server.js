const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Inicjalizacja Firebase Admin SDK
const serviceAccountPath = process.env.NODE_ENV === 'production'
    ? '/etc/secrets/forum-project-20acc-firebase-adminsdk-fo2om-75a82d9350.json'
    : path.join(__dirname, 'secrets', 'forum-project-20acc-firebase-adminsdk-fo2om-75a82d9350.json');

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://forum-project-20acc-default-rtdb.firebaseio.com",
    projectId: "forum-project-20acc",
});

// Tworzenie aplikacji Express i serwera HTTP
const app = express();
const server = http.createServer(app);

// Konfiguracja Firebase Firestore
const db = getFirestore();

const allowedOrigins = ['https://forum-project-rncg.onrender.com', 'http://localhost:3000'];

// Konfiguracja CORS
app.use(cors({
    origin: function(origin, callback){
        // allow requests with no origin 
        // (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
}));

// Inicjalizacja Socket.IO
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'OPTIONS'],
    },
});

// Middleware do obsługi JSON i plików statycznych
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware do przesyłania plików
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedFileName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        cb(null, `${Date.now()}-${sanitizedFileName}`);
    },
});

const upload = multer({ storage });

// Obsługa Socket.IO
io.on('connection', async (socket) => {
    console.log('Użytkownik połączony:', socket.id);

    try {
        const snapshot = await db.collection('messages').orderBy('timestamp', 'asc').get();
        const messages = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                text: data.text,
                author: data.author,
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null,
            };
        });

        socket.emit('chat history', messages);
    } catch (error) {
        console.error('Błąd pobierania historii wiadomości:', error);
    }

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
    
            
            const formattedMessage = {
                id: docRef.id,
                text: savedMessage.text,
                author: savedMessage.author,
                timestamp: savedMessage.timestamp, 
            };
    
            io.emit('chat message', formattedMessage);
        } catch (error) {
            console.error('Błąd podczas dodawania wiadomości:', error);
        }
    });
    
});


// Endpoint do przesyłania plików
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Brak pliku do przesłania.' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Middleware do serwowania przesłanych plików
app.use('/uploads', express.static(uploadDir));

const { sanitizeInput } = require('./functions/utils');

// Endpoint do dodawania nowego posta
app.post('/api/posts', async (req, res) => {
    try {
        const { title, category, subcategory, content } = req.body;

        if (!title || !category || !content) {
            return res.status(400).json({ error: 'Brak wymaganych pól: tytuł, kategoria lub treść.' });
        }

        // Sanitize inputs
        const sanitizedTitle = sanitizeInput(title);
        const sanitizedCategory = sanitizeInput(category);
        const sanitizedSubcategory = subcategory ? sanitizeInput(subcategory) : '';
        const sanitizedContent = sanitizeInput(content);

        const newPost = {
            title: sanitizedTitle,
            category: sanitizedCategory,
            subcategory: sanitizedSubcategory,
            content: sanitizedContent,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('posts').add(newPost);

        res.status(201).json({ message: 'Post został dodany pomyślnie.', id: docRef.id });
    } catch (error) {
        console.error('Błąd podczas dodawania posta:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas dodawania posta.' });
    }
});

// Endpoint domyślny dla aplikacji (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start serwera
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
