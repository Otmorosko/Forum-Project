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

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function truncateText(value, maxLen) {
  return String(value || '').slice(0, maxLen);
}

async function auditSecurityEvent(eventType, details = {}) {
  try {
    await db.collection('security_events').add({
      eventType,
      severity: details.severity || 'info',
      route: details.route || '',
      method: details.method || '',
      ip: details.ip || '',
      uid: details.uid || '',
      userAgent: details.userAgent || '',
      message: details.message || '',
      meta: details.meta || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Audit log write error:', error.message);
  }
}

async function auditFromReq(req, eventType, details = {}) {
  return auditSecurityEvent(eventType, {
    severity: details.severity || 'info',
    route: req.originalUrl || req.url || '',
    method: req.method || '',
    ip: getClientIp(req),
    uid: req.user?.uid || '',
    userAgent: truncateText(req.get('user-agent') || '', 180),
    message: details.message || '',
    meta: details.meta || {},
  });
}

function sanitizeField(value, maxLen) {
  return sanitizeInput(String(value ?? '')).trim().slice(0, maxLen);
}

function validateCreatePostPayload(payload) {
  const title = sanitizeField(payload?.title, 200);
  const category = sanitizeField(payload?.category, 100);
  const subcategory = sanitizeField(payload?.subcategory, 100);
  const content = sanitizeField(payload?.content, 20000);

  if (!title || !category || !content) {
    return {
      ok: false,
      status: 400,
      error: 'Brak wymaganych pól: tytuł, kategoria lub treść.',
    };
  }

  if (title.length < 3) {
    return {
      ok: false,
      status: 400,
      error: 'Tytuł jest zbyt krótki (min. 3 znaki).',
    };
  }

  return {
    ok: true,
    data: {
      title,
      category,
      subcategory,
      content,
    },
  };
}

function parseCsvEnv(envValue) {
  return String(envValue || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function isAdminUser(decodedUser) {
  if (!decodedUser) return false;

  const adminUids = parseCsvEnv(process.env.ADMIN_UIDS);
  const adminEmails = parseCsvEnv(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase());

  const uid = String(decodedUser.uid || '').trim();
  const email = String(decodedUser.email || '').trim().toLowerCase();

  if (adminUids.includes(uid)) return true;
  if (email && adminEmails.includes(email)) return true;

  // Ułatwienie testów lokalnych: w non-production wystarczy poprawne uwierzytelnienie.
  return process.env.NODE_ENV !== 'production';
}

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
    await auditFromReq(req, 'auth.missing_bearer', {
      severity: 'warn',
      message: 'Brak nagłówka Bearer w żądaniu chronionym.',
    });
    return res.status(401).json({ error: 'Brak tokenu autoryzacji.' });
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    await auditFromReq(req, 'auth.empty_token', {
      severity: 'warn',
      message: 'Pusty token autoryzacji.',
    });
    return res.status(401).json({ error: 'Nieprawidłowy token autoryzacji.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    return next();
  } catch (err) {
    console.error('Auth verify error:', err.message);
    await auditFromReq(req, 'auth.invalid_token', {
      severity: 'warn',
      message: 'Token nieważny lub wygasły.',
      meta: { reason: truncateText(err.message, 120) },
    });
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

// [SECURITY] Socket.IO auth: require Firebase ID token in handshake
io.use(async (socket, next) => {
  try {
    const rawToken = String(socket.handshake?.auth?.token || '').trim();
    const idToken = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken;

    if (!idToken) {
      return next(new Error('Unauthorized: missing token'));
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    socket.user = decodedToken;
    return next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    await auditSecurityEvent('socket.auth_invalid', {
      severity: 'warn',
      route: 'socket.io',
      method: 'WS_HANDSHAKE',
      ip: String(socket.handshake?.address || ''),
      uid: '',
      userAgent: truncateText(String(socket.handshake?.headers?.['user-agent'] || ''), 180),
      message: 'Nieudana autoryzacja Socket.IO.',
      meta: {
        reason: truncateText(error.message, 120),
        origin: truncateText(String(socket.handshake?.headers?.origin || ''), 120),
      },
    });
    return next(new Error('Unauthorized: invalid token'));
  }
});

// Obsługa Socket.IO
io.on('connection', async (socket) => {
  const socketUserUid = String(socket.user?.uid || '').trim();
  const socketUserEmail = String(socket.user?.email || '').trim();
  let socketDisplayName = String(socket.user?.name || '').trim();

  if (socketUserUid) {
    try {
      const userRecord = await admin.auth().getUser(socketUserUid);
      socketDisplayName = String(userRecord?.displayName || socketDisplayName).trim();
    } catch {
      // fallback to token claims
    }
  }

  const resolvedAuthor = sanitizeInput(socketDisplayName || socketUserEmail || 'Anonim').slice(0, 60);
  console.log('Użytkownik połączony (socket):', socket.id, socketUserUid || 'unknown-uid');

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

    socket.on('chat message', async ({ text }) => {
      if (!text) {
        console.error('Nieprawidłowe dane wiadomości: brak tekstu.');
        await auditSecurityEvent('chat.invalid_payload', {
          severity: 'warn',
          route: 'socket.io/chat message',
          method: 'WS_EVENT',
          ip: String(socket.handshake?.address || ''),
          uid: socketUserUid,
          userAgent: truncateText(String(socket.handshake?.headers?.['user-agent'] || ''), 180),
          message: 'Odrzucono wiadomość bez treści.',
        });
            return;
        }

        // [SECURITY] prosta sanitizacja i limity długości
        const safeText = sanitizeInput(String(text).slice(0, 1000));

        const newMessage = {
            text: safeText,
        author: resolvedAuthor,
        authorUid: socketUserUid,
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

            await auditSecurityEvent('chat.message_sent', {
              severity: 'info',
              route: 'socket.io/chat message',
              method: 'WS_EVENT',
              ip: String(socket.handshake?.address || ''),
              uid: socketUserUid,
              userAgent: truncateText(String(socket.handshake?.headers?.['user-agent'] || ''), 180),
              message: 'Wiadomość czatu zapisana.',
              meta: { messageId: docRef.id, textLength: safeText.length },
            });
        } catch (error) {
            console.error('Błąd podczas dodawania wiadomości:', error);

            await auditSecurityEvent('chat.message_error', {
              severity: 'error',
              route: 'socket.io/chat message',
              method: 'WS_EVENT',
              ip: String(socket.handshake?.address || ''),
              uid: socketUserUid,
              userAgent: truncateText(String(socket.handshake?.headers?.['user-agent'] || ''), 180),
              message: 'Błąd zapisu wiadomości czatu.',
              meta: { reason: truncateText(error.message, 120) },
            });
        }
    });
});

// Endpoint do przesyłania plików
app.use('/upload', uploadLimiter); // [SECURITY] limit dla uploadów
app.post('/upload', requireAuth, csrfProtection, upload.single('file'), async (req, res) => {
    if (!req.file) {
        await auditFromReq(req, 'upload.missing_or_invalid_file', {
          severity: 'warn',
          message: 'Brak pliku lub niedozwolony typ.',
        });
        return res.status(400).json({ error: 'Brak pliku do przesłania lub niedozwolony typ pliku.' });
    }

    try {
        // [SECURITY] Weryfikacja magic bytes pliku po stronie serwera
        const detected = await fileTypeFromFile(req.file.path);
        if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
            fs.unlink(req.file.path, () => {});
            await auditFromReq(req, 'upload.blocked_mime', {
              severity: 'warn',
              message: 'Upload odrzucony po weryfikacji magic bytes.',
              meta: {
                detectedMime: detected?.mime || 'unknown',
                file: truncateText(req.file.originalname || '', 120),
              },
            });
            return res.status(400).json({ error: 'Wykryty typ pliku jest niedozwolony.' });
        }

        const siteBase = (process.env.SITE_URL && process.env.SITE_URL.replace(/\/$/, '')) ||
                         `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${siteBase}/uploads/${req.file.filename}`;

        await auditFromReq(req, 'upload.success', {
          severity: 'info',
          message: 'Upload zakończony sukcesem.',
          meta: {
            file: truncateText(req.file.originalname || '', 120),
            mime: truncateText(detected.mime || '', 60),
          },
        });

        res.json({ url: fileUrl });
    } catch (e) {
        console.error('Błąd walidacji pliku:', e);
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        await auditFromReq(req, 'upload.error', {
          severity: 'error',
          message: 'Błąd przetwarzania uploadu.',
          meta: { reason: truncateText(e.message, 120) },
        });
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
    await auditFromReq(req, 'captcha.verify_failed', {
      severity: 'warn',
      message: 'Nieudana weryfikacja CAPTCHA.',
    });
    return res.status(400).json({ success: false, error: 'CAPTCHA verification failed.' });
  }
  await auditFromReq(req, 'captcha.verify_success', {
    severity: 'info',
    message: 'CAPTCHA zweryfikowana poprawnie.',
  });
  return res.json({ success: true });
});

// Endpoint do dodawania nowego posta
app.post('/api/posts', requireAuth, csrfProtection, createPostLimiter, async (req, res) => {
    try {
    const validation = validateCreatePostPayload(req.body || {});
    if (!validation.ok) {
      await auditFromReq(req, 'post.create_validation_failed', {
        severity: 'warn',
        message: validation.error,
      });
      return res.status(validation.status || 400).json({ error: validation.error });
    }

    const { title: sanitizedTitle, category: sanitizedCategory, subcategory: sanitizedSubcategory, content: sanitizedContent } = validation.data;
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

        await auditFromReq(req, 'post.create_success', {
          severity: 'info',
          message: 'Post dodany.',
          meta: {
            postId: docRef.id,
            category: sanitizedCategory,
            subcategory: sanitizedSubcategory,
            titleLength: sanitizedTitle.length,
            contentLength: sanitizedContent.length,
          },
        });

        res.status(201).json({ message: 'Post został dodany pomyślnie.', id: docRef.id });
    } catch (error) {
        console.error('Błąd podczas dodawania posta:', error);
        await auditFromReq(req, 'post.create_error', {
          severity: 'error',
          message: 'Błąd podczas dodawania posta.',
          meta: { reason: truncateText(error.message, 120) },
        });
        res.status(500).json({ error: 'Wystąpił błąd podczas dodawania posta.' });
    }
});

// Endpoint: synchronizacja nazwy autora w istniejących postach po zmianie displayName
app.post('/api/profile/sync-display-name', requireAuth, csrfProtection, createPostLimiter, async (req, res) => {
  try {
    const uid = String(req.user?.uid || '').trim();
    if (!uid) {
      await auditFromReq(req, 'profile.sync_display_name_no_uid', {
        severity: 'warn',
        message: 'Brak UID przy synchronizacji displayName.',
      });
      return res.status(400).json({ error: 'Brak identyfikatora użytkownika.' });
    }

    const requestedDisplayName = sanitizeInput(String(req.body?.displayName || '')).trim().slice(0, 60);
    if (!requestedDisplayName) {
      await auditFromReq(req, 'profile.sync_display_name_empty', {
        severity: 'warn',
        message: 'Pusta nowa nazwa użytkownika.',
      });
      return res.status(400).json({ error: 'Brak nowej nazwy użytkownika.' });
    }

    const previousDisplayName = sanitizeInput(String(req.body?.previousDisplayName || '')).trim().slice(0, 60);
    const emailAlias = sanitizeInput(String(req.user?.email || '')).trim().slice(0, 120);

    const updates = new Map();

    // 1) Posty należące do UID
    const byUidSnapshot = await db.collection('posts').where('authorUid', '==', uid).get();
    byUidSnapshot.forEach((doc) => {
      updates.set(`posts:${doc.id}`, { ref: doc.ref, data: doc.data(), collection: 'posts' });
    });

    // 2) Kompatybilność wstecz: starsze posty mogły nie mieć authorUid
    const aliases = [previousDisplayName, emailAlias].filter(Boolean);
    for (const alias of aliases) {
      const byAliasSnapshot = await db.collection('posts').where('author', '==', alias).get();
      byAliasSnapshot.forEach((doc) => {
        const data = doc.data() || {};
        const postUid = String(data.authorUid || '').trim();
        if (!postUid || postUid === uid) {
          updates.set(`posts:${doc.id}`, { ref: doc.ref, data, collection: 'posts' });
        }
      });
    }

    // 3) Wiadomości czatu należące do UID
    const chatByUidSnapshot = await db.collection('messages').where('authorUid', '==', uid).get();
    chatByUidSnapshot.forEach((doc) => {
      updates.set(`messages:${doc.id}`, { ref: doc.ref, data: doc.data(), collection: 'messages' });
    });

    // 4) Starsze wiadomości czatu bez authorUid, dopasowane po poprzedniej nazwie lub emailu
    for (const alias of aliases) {
      const chatByAliasSnapshot = await db.collection('messages').where('author', '==', alias).get();
      chatByAliasSnapshot.forEach((doc) => {
        const data = doc.data() || {};
        const messageUid = String(data.authorUid || '').trim();
        if (!messageUid || messageUid === uid) {
          updates.set(`messages:${doc.id}`, { ref: doc.ref, data, collection: 'messages' });
        }
      });
    }

    if (updates.size === 0) {
      await auditFromReq(req, 'profile.sync_display_name_no_changes', {
        severity: 'info',
        message: 'Brak postów ani wiadomości do aktualizacji nazwy autora.',
      });
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
    await auditFromReq(req, 'profile.sync_display_name_success', {
      severity: 'info',
      message: 'Zsynchronizowano nazwę autora w postach i wiadomościach czatu.',
      meta: { updated: updates.size },
    });
    return res.json({ success: true, updated: updates.size });
  } catch (error) {
    console.error('Error syncing display name:', error);
    await auditFromReq(req, 'profile.sync_display_name_error', {
      severity: 'error',
      message: 'Błąd synchronizacji nazwy autora.',
      meta: { reason: truncateText(error.message, 120) },
    });
    return res.status(500).json({ error: 'Nie udało się zsynchronizować nazwy użytkownika w postach i czacie.' });
  }
});

// Endpoint admin: podgląd logów bezpieczeństwa (audit trail)
app.get('/api/admin/security-events', requireAuth, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      await auditFromReq(req, 'admin.security_events_forbidden', {
        severity: 'warn',
        message: 'Próba dostępu do logów bezpieczeństwa bez uprawnień.',
      });
      return res.status(403).json({ error: 'Brak uprawnień.' });
    }

    const limitRaw = Number.parseInt(String(req.query.limit || '100'), 10);
    const limit = Number.isNaN(limitRaw) ? 100 : Math.max(1, Math.min(limitRaw, 200));
    const eventTypeFilter = sanitizeField(req.query.eventType, 80);
    const severityFilter = sanitizeField(req.query.severity, 20).toLowerCase();

    const fetchCount = Math.max(limit, 120);
    const snapshot = await db.collection('security_events')
      .orderBy('createdAt', 'desc')
      .limit(fetchCount)
      .get();

    let items = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        eventType: data.eventType || '',
        severity: data.severity || 'info',
        route: data.route || '',
        method: data.method || '',
        ip: data.ip || '',
        uid: data.uid || '',
        userAgent: data.userAgent || '',
        message: data.message || '',
        meta: data.meta || {},
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    if (eventTypeFilter) {
      items = items.filter((item) => item.eventType === eventTypeFilter);
    }
    if (severityFilter) {
      items = items.filter((item) => String(item.severity || '').toLowerCase() === severityFilter);
    }

    const events = items.slice(0, limit);

    await auditFromReq(req, 'admin.security_events_read', {
      severity: 'info',
      message: 'Pobrano logi bezpieczeństwa.',
      meta: {
        requestedLimit: limit,
        returned: events.length,
        eventTypeFilter,
        severityFilter,
      },
    });

    return res.json({
      count: events.length,
      limit,
      filters: {
        eventType: eventTypeFilter || null,
        severity: severityFilter || null,
      },
      events,
    });
  } catch (error) {
    console.error('Error fetching security events:', error);
    await auditFromReq(req, 'admin.security_events_error', {
      severity: 'error',
      message: 'Błąd pobierania logów bezpieczeństwa.',
      meta: { reason: truncateText(error.message, 120) },
    });
    return res.status(500).json({ error: 'Nie udało się pobrać logów bezpieczeństwa.' });
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
  if (err && err.code === 'EBADCSRFTOKEN') {
    auditFromReq(req, 'csrf.invalid_token', {
      severity: 'warn',
      message: 'Nieprawidłowy lub brakujący token CSRF.',
    });
    return res.status(403).json({ error: 'Invalid CSRF token.' });
  }

  auditFromReq(req, 'server.unhandled_error', {
    severity: 'error',
    message: 'Globalny błąd serwera.',
    meta: { reason: truncateText(err?.message || 'unknown', 120) },
  });
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
