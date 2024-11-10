const express = require('express');
const cors = require('cors');
const app = express();

// Enable parsing JSON in request body
app.use(express.json());

// CORS configuration
const corsOptions = {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));

// Przykładowa baza danych użytkowników
const users = [];

// Główna strona
app.get('/', (req, res) => {
    res.send('Server is running. Available endpoints: /users, /register, /login');
});

// Endpoint do sprawdzania zarejestrowanych użytkowników
app.get('/users', (req, res) => {
    console.log('Aktualni użytkownicy:', users);
    res.json(users.map(user => ({ username: user.username, email: user.email })));
});

app.post('/register', (req, res) => {
    console.log('Otrzymano żądanie rejestracji:', req.body);
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane.' });
    }

    if (users.find(user => user.username === username || user.email === email)) {
        return res.status(400).json({ success: false, message: 'Użytkownik o podanej nazwie lub emailu już istnieje.' });
    }

    users.push({ username, email, password });
    console.log('Użytkownik zarejestrowany:', { username, email });

    res.json({ success: true, message: `Użytkownik ${username} został zarejestrowany!` });
});

app.post('/login', (req, res) => {
    console.log('Otrzymano żądanie logowania:', req.body);
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        console.log('Brak identyfikatora lub hasła');
        return res.status(400).json({ 
            success: false, 
            message: 'Nazwa użytkownika/email i hasło są wymagane.' 
        });
    }

    console.log('Szukam użytkownika...');
    const user = users.find(user => 
        (user.username === identifier || user.email === identifier) && 
        user.password === password
    );

    if (user) {
        console.log('Znaleziono użytkownika, logowanie udane');
        res.json({ 
            success: true, 
            message: 'Zalogowano pomyślnie!',
            user: {
                username: user.username,
                email: user.email
            }
        });
    } else {
        console.log('Nie znaleziono użytkownika lub niepoprawne hasło');
        res.status(401).json({ 
            success: false, 
            message: 'Nieprawidłowa nazwa użytkownika/email lub hasło.' 
        });
    }
});

app.use((req, res) => {
    res.status(404).send('404 URL NOT FOUND');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log('Dostępni użytkownicy na starcie:', users);
});