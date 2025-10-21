// @ts-nocheck
/* eslint-env node */
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


app.set('trust proxy', true);

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

    // preferuj jawnie ustawione SITE_URL (np. https://forum-project-rncg.onrender.com),
    // w przeciwnym razie używaj req.protocol (po trust proxy będzie https) i host
    const siteBase = (process.env.SITE_URL && process.env.SITE_URL.replace(/\/$/, '')) ||
                     `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${siteBase}/uploads/${req.file.filename}`;

    res.json({ url: fileUrl });
});

// Middleware do serwowania przesłanych plików
app.use('/uploads', express.static(uploadDir));

const { sanitizeInput } = require('./functions/utils');

// Endpoint do dodawania nowego posta
app.post('/api/posts', async (req, res) => {
    try {
        const { title, category, subcategory, content, author } = req.body;

        if (!title || !category || !content) {
            return res.status(400).json({ error: 'Brak wymaganych pól: tytuł, kategoria lub treść.' });
        }

        // Sanitize inputs
        const sanitizedTitle = sanitizeInput(title);
        const sanitizedCategory = sanitizeInput(category);
        const sanitizedSubcategory = subcategory ? sanitizeInput(subcategory) : '';
        const sanitizedContent = sanitizeInput(content);
        const sanitizedAuthor = author ? sanitizeInput(author) : 'Anonim';

        const newPost = {
            title: sanitizedTitle,
            category: sanitizedCategory,
            subcategory: sanitizedSubcategory,
            content: sanitizedContent,
            author: sanitizedAuthor,
            replies: 0,
            likes: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('posts').add(newPost);

        res.status(201).json({ message: 'Post został dodany pomyślnie.', id: docRef.id });
    } catch (error) {
        console.error('Błąd podczas dodawania posta:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas dodawania posta.' });
    }
});

const categoriesData = require('./data/categories.json');

// GET /api/categories - return list of categories with id and name
app.get('/api/categories', (req, res) => {
  const categories = categoriesData.map((cat, index) => ({
    id: index,
    name: cat.name,
  }));
  res.json(categories);
});

// GET /api/subcategories?categoryId= - return subcategories for category
app.get('/api/subcategories', (req, res) => {
  const categoryId = parseInt(req.query.categoryId);
  if (isNaN(categoryId) || categoryId < 0 || categoryId >= categoriesData.length) {
    return res.status(400).json({ error: 'Invalid categoryId' });
  }
  const subcategories = categoriesData[categoryId].subcategories.map((subcat, index) => ({
    id: index,
    name: subcat.name,
  }));
  res.json(subcategories);
});

// New endpoint to get categories with subcategories and posts (threads)
app.get('/api/posts-structured', async (req, res) => {
  try {
    // Fetch all posts from Firestore
    const postsSnapshot = await db.collection('posts').get();
    const posts = postsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        author: data.author || 'Anonim',
        category: data.category,
        subcategory: data.subcategory,
        replies: data.replies !== undefined ? data.replies : 0,
        likes: data.likes !== undefined ? data.likes : 0,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    console.log('Fetched posts from Firestore:', posts);

    // Build structured data: categories -> subcategories -> threads(posts)
    const structured = categoriesData.map((cat, catIndex) => {
      const subcats = cat.subcategories.map((subcat, subIndex) => {
        // Filter posts for this category and subcategory
        const threads = posts.filter(post => {
          const matchCategory = post.category && post.category.trim().toLowerCase() === cat.name.trim().toLowerCase();
          const matchSubcategory = post.subcategory && post.subcategory.trim().toLowerCase() === subcat.name.trim().toLowerCase();
          return matchCategory && matchSubcategory;
        });
        return {
          id: subIndex,
          name: subcat.name,
          threads: threads,
        };
      });
      return {
        id: catIndex,
        name: cat.name,
        subcategories: subcats,
      };
    });

    res.json(structured);
  } catch (error) {
    console.error('Error fetching structured posts:', error);
    res.status(500).json({ error: 'Failed to fetch structured posts' });
  }
});


// Endpoint domyślny dla aplikacji (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -----------------------
// Testowe endpointy auth (tylko w non-production)
// -----------------------
if (process.env.NODE_ENV !== 'production') {
  app.use(express.json()); 

  const _testUsers = new Map();

  app.post('/register', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'missing username or password' });
    }
    if (_testUsers.has(username)) {
      return res.status(409).json({ success: false, error: 'user exists' });
    }
    _testUsers.set(username, password);
    return res.status(201).json({ success: true });
  });

  app.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'missing username or password' });
    }
    const stored = _testUsers.get(username);
    if (!stored || stored !== password) {
      return res.status(401).json({ success: false, error: 'invalid credentials' });
    }
    return res.status(200).json({ token: 'test-token' });
  });
}

// Start serwera tylko gdy plik jest uruchamiany bezpośrednio
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
  });
} else {
  // when required as module (e.g. in tests), do not listen here
  console.log('server.js required as module — not starting HTTP listener');
}

// eksport do użycia w testach
module.exports = { app, server };
