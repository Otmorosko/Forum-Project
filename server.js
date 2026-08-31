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
const cookieParser = require('cookie-parser');
const helmet = require('helmet'); // [SECURITY] headers
const hpp = require('hpp'); // [SECURITY] HTTP Parameter Pollution
const rateLimit = require('express-rate-limit'); // [SECURITY] rate limiting
const csrf = require('csurf');
const { fileTypeFromFile } = require('file-type'); // [SECURITY] magic-bytes check
const { sanitizeInput } = require('./functions/utils'); // [SECURITY] use sanitization also for sockets

// [SECURITY] Turnstile (CAPTCHA)
const turnstileEnabled = process.env.TURNSTILE_ENABLED === 'true';
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '';
const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || '';

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
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    // Allow Firebase ESM modules and Socket.IO CDN
    scriptSrc: ["'self'", 'https://www.gstatic.com', 'https://cdn.socket.io', 'https://challenges.cloudflare.com'],
    // Be explicit for browsers that honor script-src-elem separately
    scriptSrcElem: ["'self'", 'https://www.gstatic.com', 'https://cdn.socket.io', 'https://challenges.cloudflare.com'],
    frameSrc: ["'self'", 'https://challenges.cloudflare.com'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    // Allow profile images served by Google if user has photoURL
    imgSrc: ["'self'", "data:", 'https://lh3.googleusercontent.com'],
    // Allow Firebase Auth/Identity endpoints for XHR/fetch
    connectSrc: [
      "'self'",
      ...allowedOrigins,
      'https://www.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://challenges.cloudflare.com',
      // Allow WebSocket connections for Socket.IO
      'wss://forum-project-rncg.onrender.com',
      'ws://localhost:3000'
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
app.use(cookieParser());

// [SECURITY] CSRF protection (cookie-based token)
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd,
  },
});

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
const createPostLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

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

async function verifyTurnstileToken(token, remoteIp) {
  if (!turnstileEnabled) {
    // In dev/test we allow disabling CAPTCHA via env flag.
    return true;
  }

  if (!turnstileSecret) {
    console.error('TURNSTILE_ENABLED=true but TURNSTILE_SECRET_KEY is missing.');
    return false;
  }

  if (!token) {
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret: turnstileSecret,
      response: token,
      remoteip: remoteIp || '',
    });

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return Boolean(result && result.success);
  } catch (error) {
    console.error('Turnstile verify error:', error.message);
    return false;
  }
}

// [SECURITY] Middleware: weryfikacja Firebase ID token (Bearer)
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokenu autoryzacji.' });
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    return res.status(401).json({ error: 'Nieprawidłowy token autoryzacji.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    return next();
  } catch (err) {
    console.error('Auth verify error:', err.message);
    return res.status(401).json({ error: 'Token nieważny lub wygasły.' });
  }
}

// Resolve current author display names by UID (deduplicated)
async function resolveDisplayNamesByUid(uids = []) {
  const uniqueUids = [...new Set((uids || []).map((uid) => String(uid || '').trim()).filter(Boolean))];
  const result = new Map();

  await Promise.all(uniqueUids.map(async (uid) => {
    try {
      const userRecord = await admin.auth().getUser(uid);
      const liveName = String(userRecord?.displayName || '').trim();
      if (liveName) {
        result.set(uid, sanitizeInput(liveName).slice(0, 60));
      }
    } catch {
      // ignore single-user lookup failures, fallback to stored author name
    }
  }));

  return result;
}

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
app.post('/upload', requireAuth, csrfProtection, upload.single('file'), async (req, res) => {
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
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get('/api/security/captcha/config', (req, res) => {
  res.json({
    enabled: turnstileEnabled,
    siteKey: turnstileEnabled ? turnstileSiteKey : '',
  });
});

app.post('/api/security/captcha/verify', async (req, res) => {
  const { token } = req.body || {};
  const isValid = await verifyTurnstileToken(token, req.ip);
  if (!isValid) {
    return res.status(400).json({ success: false, error: 'CAPTCHA verification failed.' });
  }
  return res.json({ success: true });
});

// Endpoint do dodawania nowego posta
app.post('/api/posts', requireAuth, csrfProtection, createPostLimiter, async (req, res) => {
    try {
    const { title, category, subcategory, content } = req.body;

        if (!title || !category || !content) {
            return res.status(400).json({ error: 'Brak wymaganych pól: tytuł, kategoria lub treść.' });
        }

        // [SECURITY] prosta walidacja długości pól
    if (
      String(title).length > 200 ||
      String(category).length > 100 ||
      String(subcategory || '').length > 100 ||
          String(content).length > 20000
    ) {
            return res.status(400).json({ error: 'Zbyt długie pola wejściowe.' });
        }

        // Sanitize inputs
        const sanitizedTitle = sanitizeInput(title);
        const sanitizedCategory = sanitizeInput(category);
        const sanitizedSubcategory = subcategory ? sanitizeInput(subcategory) : '';
        const sanitizedContent = sanitizeInput(content);
        const authorUid = String(req.user?.uid || '').trim();

        let liveDisplayName = '';
        if (authorUid) {
          try {
            const userRecord = await admin.auth().getUser(authorUid);
            liveDisplayName = String(userRecord?.displayName || '').trim();
          } catch (userReadError) {
            console.warn('Nie udało się pobrać aktualnego displayName z Firebase Auth:', userReadError.message);
          }
        }

        const authorFromIdentity = liveDisplayName || req.user?.name || req.user?.email || 'Anonim';
        const sanitizedAuthor = sanitizeInput(String(authorFromIdentity)).slice(0, 60);

        const newPost = {
            title: sanitizedTitle,
            category: sanitizedCategory,
            subcategory: sanitizedSubcategory,
            content: sanitizedContent,
            author: sanitizedAuthor,
          authorUid,
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

// Endpoint: synchronizacja nazwy autora w istniejących postach po zmianie displayName
app.post('/api/profile/sync-display-name', requireAuth, csrfProtection, createPostLimiter, async (req, res) => {
  try {
    const uid = String(req.user?.uid || '').trim();
    if (!uid) {
      return res.status(400).json({ error: 'Brak identyfikatora użytkownika.' });
    }

    const requestedDisplayName = sanitizeInput(String(req.body?.displayName || '')).trim().slice(0, 60);
    if (!requestedDisplayName) {
      return res.status(400).json({ error: 'Brak nowej nazwy użytkownika.' });
    }

    const previousDisplayName = sanitizeInput(String(req.body?.previousDisplayName || '')).trim().slice(0, 60);
    const emailAlias = sanitizeInput(String(req.user?.email || '')).trim().slice(0, 120);

    const updates = new Map();

    // 1) Pewny przypadek: posty należące do UID
    const byUidSnapshot = await db.collection('posts').where('authorUid', '==', uid).get();
    byUidSnapshot.forEach((doc) => {
      updates.set(doc.id, { ref: doc.ref, data: doc.data() });
    });

    // 2) Kompatybilność wstecz: starsze posty mogły nie mieć authorUid
    const aliases = [previousDisplayName, emailAlias].filter(Boolean);
    for (const alias of aliases) {
      const byAliasSnapshot = await db.collection('posts').where('author', '==', alias).get();
      byAliasSnapshot.forEach((doc) => {
        const data = doc.data() || {};
        const postUid = String(data.authorUid || '').trim();
        if (!postUid || postUid === uid) {
          updates.set(doc.id, { ref: doc.ref, data });
        }
      });
    }

    if (updates.size === 0) {
      return res.json({ success: true, updated: 0 });
    }

    const batch = db.batch();
    for (const { ref } of updates.values()) {
      batch.update(ref, {
        author: requestedDisplayName,
        authorUid: uid,
      });
    }

    await batch.commit();
    return res.json({ success: true, updated: updates.size });
  } catch (error) {
    console.error('Error syncing display name:', error);
    return res.status(500).json({ error: 'Nie udało się zsynchronizować nazwy użytkownika w postach.' });
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
    const rawPosts = postsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        author: data.author || 'Anonim',
        authorUid: data.authorUid || '',
        category: data.category,
        subcategory: data.subcategory,
        replies: data.replies !== undefined ? data.replies : 0,
        likes: data.likes !== undefined ? data.likes : 0,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    const liveNamesByUid = await resolveDisplayNamesByUid(rawPosts.map((p) => p.authorUid));
    const posts = rawPosts.map((post) => ({
      ...post,
      author: liveNamesByUid.get(String(post.authorUid || '').trim()) || post.author,
    }));

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
          id: subIndex,
          name: subcat.name,
          icon: subcat.icon,
          threadsCount: threads.length,
          repliesCount: threads.reduce((sum, t) => sum + (t.replies || 0), 0),
          lastThread: lastThread
            ? {
                id: lastThread.id,
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

// Fallback endpoint: return posts from Firestore in flat format
app.get('/api/posts', async (req, res) => {
  try {
    const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
    const rawPosts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        author: data.author || 'Anonim',
        authorUid: data.authorUid || '',
        category: data.category,
        subcategory: data.subcategory,
        content: data.content || '',
        timestamp: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    const liveNamesByUid = await resolveDisplayNamesByUid(rawPosts.map((p) => p.authorUid));
    const posts = rawPosts.map((post) => ({
      ...post,
      author: liveNamesByUid.get(String(post.authorUid || '').trim()) || post.author,
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Endpoint: pojedynczy post po ID
app.get('/api/posts/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Missing post id' });
    }

    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const data = doc.data();
    const authorUid = data.authorUid || '';
    const liveNamesByUid = await resolveDisplayNamesByUid([authorUid]);

    return res.json({
      id: doc.id,
      title: data.title,
      author: liveNamesByUid.get(String(authorUid).trim()) || data.author || 'Anonim',
      authorUid,
      category: data.category,
      subcategory: data.subcategory,
      content: data.content || '',
      timestamp: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      replies: data.replies !== undefined ? data.replies : 0,
      likes: data.likes !== undefined ? data.likes : 0,
    });
  } catch (error) {
    console.error('Error fetching post by id:', error);
    return res.status(500).json({ error: 'Failed to fetch post' });
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
