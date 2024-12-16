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

// Konfiguracja Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Usuwanie znaków specjalnych z nazwy pliku
        const sanitizedFileName = file.originalname
            .replace(/[^a-z0-9.]/gi, '_') // Zamienia wszystkie znaki inne niż alfanumeryczne i kropki na '_'
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

    console.log('=== Otrzymano plik ===');
    console.log('Ścieżka pliku:', req.file.path);
    console.log('Nazwa pliku:', req.file.filename);

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log('Wygenerowany URL pliku:', fileUrl);

    res.json({ url: fileUrl });
});

// Middleware do serwowania plików statycznych
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.listen(port, () => {
    console.log(`Serwer działa na http://localhost:${port}`);
    console.log(`Statyczny katalog uploads: ${path.join(__dirname, 'uploads')}`);
});
