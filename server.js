const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let users = []; // Tablica do przechowywania użytkowników

app.post('/register', async (req, res) => {
  console.log('Otrzymano żądanie rejestracji:', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane.' });
  }

  if (users.find(user => user.username === username)) {
    return res.status(400).json({ success: false, message: 'Użytkownik o podanej nazwie już istnieje.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  console.log('Użytkownik zarejestrowany:', { username });

  res.json({ success: true, message: `Użytkownik ${username} został zarejestrowany!` });
});

// Dodajemy nowy endpoint do logowania
app.post('/login', async (req, res) => {
  console.log('Otrzymano żądanie logowania:', req.body);
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane.' });
  }

  const user = users.find(user => user.username === identifier);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Niepoprawna nazwa użytkownika lub hasło.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ success: false, message: 'Niepoprawna nazwa użytkownika lub hasło.' });
  }

  res.json({ success: true, message: 'Zalogowano pomyślnie!' });
});

app.listen(port, () => {
  console.log(`Serwer działa na http://localhost:${port}`);
});