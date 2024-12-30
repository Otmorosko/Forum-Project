import { monitorAuthState } from "./auth.js";

let currentUser = null;

// Monitorowanie stanu logowania i ustawienie aktualnego użytkownika
monitorAuthState((user) => {
  if (user) {
    currentUser = user;
    console.log("Zalogowany użytkownik:", user.displayName || user.email);
  } else {
    console.log("Brak zalogowanego użytkownika.");
    currentUser = null;
  }
});

const socket = io("https://forum-project-rncg.onrender.com/");

// Pobieranie historii wiadomości z serwera
socket.on("chat history", (messages) => {
  console.log("Odebrano historię wiadomości:", messages);

  const messagesList = document.getElementById("messages");
  messagesList.innerHTML = ""; // Wyczyść listę wiadomości

  messages.forEach((msg) => {
    const li = document.createElement("li");
    li.textContent = `${msg.author}: ${msg.text}`;
    messagesList.appendChild(li);
  });
});

// Obsługa odebrania nowej wiadomości
socket.on("chat message", (msg) => {
  console.log("Nowa wiadomość odebrana:", msg);

  const messages = document.getElementById("messages");
  const li = document.createElement("li");
  li.textContent = `${msg.author}: ${msg.text}`;
  messages.appendChild(li);
});

// Przesyłanie wiadomości
document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();

  if (!currentUser) {
    alert("Musisz być zalogowany, aby wysyłać wiadomości.");
    return;
  }

  const input = document.getElementById("input");

  const message = {
    text: input.value,
    author: currentUser.displayName || currentUser.email || "Nieznany użytkownik",
  };

  // Wysłanie wiadomości na serwer
  socket.emit("chat message", message);
  console.log("Wysłano wiadomość:", message);

  // Wyczyszczenie pola wejściowego
  input.value = "";
});
