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
const helmet = require('helmet'); // [SECURITY] headers
const hpp = require('hpp'); // [SECURITY] HTTP Parameter Pollution
const rateLimit = require('express-rate-limit'); // [SECURITY] rate limiting
const { fileTypeFromFile } = require('file-type'); // [SECURITY] magic-bytes check
const { sanitizeInput } = require('./functions/utils'); // [SECURITY] use sanitization also for sockets

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

// Configure trust proxy safely: production behind proxy, local limited
const isProd = process.env.NODE_ENV === 'production';
app.set('trust proxy', isProd ? 1 : ['loopback', 'linklocal', 'uniquelocal']);
app.disable('x-powered-by'); // [SECURITY] ukryj Express

// Konfiguracja Firebase Firestore
const db = getFirestore();

const allowedOrigins = ['https://forum-project-rncg.onrender.com', 'http://localhost:3000'];

// Konfiguracja CORS
app.use(cors({
    origin: function(origin, callback){
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
}));

// [SECURITY] Nagłówki HTTP (CSP, HSTS w produkcji, nosniff itp.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false, // wyłącz jeśli używasz zewnętrznych zasobów osadzanych
}));
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    // Allow Firebase ESM modules and Socket.IO CDN
    scriptSrc: ["'self'", 'https://www.gstatic.com', 'https://cdn.socket.io'],
    // Be explicit for browsers that honor script-src-elem separately
    scriptSrcElem: ["'self'", 'https://www.gstatic.com', 'https://cdn.socket.io'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    // Allow profile images served by Google if user has photoURL
    imgSrc: ["'self'", "data:", 'https://lh3.googleusercontent.com'],
    // Allow Firebase Auth/Identity endpoints for XHR/fetch
    connectSrc: [
      "'self'",
      ...allowedOrigins,
      'https://www.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://identitytoolkit.googleapis.com'
    ],
  }
}));
if (process.env.NODE_ENV === 'production') {
  app.use(helmet.hsts({ maxAge: 15552000 })); // ~180 dni
}

// [SECURITY] Ochrona przed HPP
app.use(hpp());

// [SECURITY] Ograniczenia rozmiaru body
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

// [SECURITY] Rate limiting: global + per-route
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// Inicjalizacja Socket.IO
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'OPTIONS'],
    },
});

// Middleware do obsługi plików statycznych
app.use(express.static(path.join(__dirname, 'public')));

// Middleware do przesyłania plików
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedFileName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        cb(null, `${Date.now()}-${sanitizedFileName}`);
    },
});

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME.includes(file.mimetype)) {
        return cb(new Error('Niedozwolony typ pliku. Dozwolone są tylko obrazy JPG, PNG, GIF, WEBP.'));
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

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

        // [SECURITY] prosta sanitizacja i limity długości
        const safeText = sanitizeInput(String(text).slice(0, 1000));
        const safeAuthor = sanitizeInput(String(author).slice(0, 60));

        const newMessage = {
            text: safeText,
            author: safeAuthor,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        try {
            const docRef = await db.collection('messages').add(newMessage);
            const saved = await docRef.get();
            const data = saved.data();

            const formattedMessage = {
                id: docRef.id,
                text: data.text,
                author: data.author,
                // [SECURITY/CONSISTENCY] zawsze ISO-8601
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
            };

            io.emit('chat message', formattedMessage);
        } catch (error) {
            console.error('Błąd podczas dodawania wiadomości:', error);
        }
    });
});

// Endpoint do przesyłania plików
app.use('/upload', uploadLimiter); // [SECURITY] limit dla uploadów
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Brak pliku do przesłania lub niedozwolony typ pliku.' });
    }

    try {
        // [SECURITY] Weryfikacja magic bytes pliku po stronie serwera
        const detected = await fileTypeFromFile(req.file.path);
        if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'Wykryty typ pliku jest niedozwolony.' });
        }

        const siteBase = (process.env.SITE_URL && process.env.SITE_URL.replace(/\/$/, '')) ||
                         `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${siteBase}/uploads/${req.file.filename}`;

        res.json({ url: fileUrl });
    } catch (e) {
        console.error('Błąd walidacji pliku:', e);
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        res.status(500).json({ error: 'Wystąpił błąd podczas przetwarzania pliku.' });
    }
});

// Middleware do serwowania przesłanych plików
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, _filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Endpointy API

// Endpoint do dodawania nowego posta
app.post('/api/posts', async (req, res) => {
    try {
        const { title, category, subcategory, content, author } = req.body;

        if (!title || !category || !content) {
            return res.status(400).json({ error: 'Brak wymaganych pól: tytuł, kategoria lub treść.' });
        }

        // [SECURITY] prosta walidacja długości pól
        if (String(title).length > 200 || String(category).length > 100 || String(subcategory || '').length > 100) {
            return res.status(400).json({ error: 'Zbyt długie pola wejściowe.' });
        }

        // Sanitize inputs
        const sanitizedTitle = sanitizeInput(title);
        const sanitizedCategory = sanitizeInput(category);
        const sanitizedSubcategory = subcategory ? sanitizeInput(subcategory) : '';
        const sanitizedContent = sanitizeInput(content);
        const sanitizedAuthor = author ? sanitizeInput(author).slice(0, 60) : 'Anonim';

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

const categoriesData = require('./public/data/categories.json');

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

    // Build structured data: categories -> subcategories -> threads(posts)
    const structured = categoriesData.map((cat, catIndex) => {
      const subcats = cat.subcategories.map((subcat, subIndex) => {
        // Filtruj posty do tej podkategorii i kategorii
        const threads = posts.filter(
          p =>
            (p.category === cat.name || p.category === catIndex || String(p.category) === String(catIndex)) &&
            (p.subcategory === subcat.name || p.subcategory === subIndex || String(p.subcategory) === String(subIndex))
        );
        // Najnowszy post
        const lastThread = threads.length
          ? threads.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
          : null;
        return {
          name: subcat.name,
          icon: subcat.icon,
          threadsCount: threads.length,
          repliesCount: threads.reduce((sum, t) => sum + (t.replies || 0), 0),
          lastThread: lastThread
            ? {
                title: lastThread.title,
                author: lastThread.author,
                timestamp: lastThread.createdAt,
              }
            : null,
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

// --- temporary test endpoint: return sample posts ---
app.get('/api/posts', (req, res) => {
  const sample = [
    {
      id: '1',
      title: 'Welcome — sample post',
      author: 'System',
      timestamp: Date.now(),
      content: '<p>This is a sample post to verify frontend rendering.</p>'
    },
    {
      id: '2',
      title: 'Second post',
      author: 'Mod',
      timestamp: Date.now(),
      content: '<p>Another example post with <b>bold</b> text.</p>'
    }
  ];
  res.json(sample);
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

  app.post('/register', authLimiter, (req, res) => {
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

  app.post('/login', authLimiter, (req, res) => {
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

// Globalny handler błędów (ostatni middleware)
app.use((err, req, res, _next) => {
  console.error('Global error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});
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
