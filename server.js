const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let users = []; // Tablica do przechowywania użytkowników

app.post('/register', async (req, res) => {
  console.log('Otrzymano żądanie rejestracji:', req.body); // Logowanie danych
  const { username, password } = req.body;

  // Walidacja danych
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane.' });
  }

  if (users.find(user => user.username === username)) {
    return res.status(400).json({ success: false, message: 'Użytkownik o podanej nazwie już istnieje.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  console.log('Użytkownik zarejestrowany:', { username }); // Logowanie nowego użytkownika

  res.json({ success: true, message: `Użytkownik ${username} został zarejestrowany!` });
});

app.listen(port, () => {
  console.log(`Serwer działa na http://localhost:${port}`);
});