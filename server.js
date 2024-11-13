const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Konfiguracja połączenia z bazą danych MySQL
const db = mysql.createConnection({
  host: 'localhost', 
  user: 'root', 
  password: 'Qdwo39bj2khc!qdw!wdq', 
  database: 'modhub' 
});

// Połączenie z bazą danych
db.connect(err => {
  if (err) {
    console.error('Błąd połączenia z bazą danych:', err);
    return;
  }
  console.log('Połączono z bazą danych MySQL');
});

// Endpoint rejestracji
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane.' });
  }

  // Sprawdź, czy użytkownik już istnieje
  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Błąd serwera.' });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Użytkownik o podanej nazwie już istnieje.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Zapisz nowego użytkownika
    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Błąd serwera.' });
      }
      res.json({ success: true, message: `Użytkownik ${username} został zarejestrowany!` });
    });
  });
});

// Endpoint logowania
app.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane.' });
  }

  db.query('SELECT * FROM users WHERE username = ?', [identifier], async (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Błąd serwera.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Niepoprawna nazwa użytkownika lub hasło.' });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Niepoprawna nazwa użytkownika lub hasło.' });
    }

    res.json({ success: true, message: 'Zalogowano pomyślnie!' });
  });
});

app.listen(port, () => {
  console.log(`Serwer działa na http://localhost:${port}`);
});