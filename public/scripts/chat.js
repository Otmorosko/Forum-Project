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

// Funkcja do renderowania czatu
function loadChat() {
  const chatHTML = `
    <div id="chat-container">
      <div id="chat-icon" onclick="toggleChat()">💬</div>
      <div id="chat" class="hidden">
        <ul id="messages"></ul>
        <form id="form">
          <input id="input" autocomplete="off" placeholder="Wpisz wiadomość..." />
          <button type="submit">Wyślij</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", chatHTML);

  setupChat();
}

// Funkcja do obsługi czatu
function setupChat() {
  const chat = document.getElementById("chat");
  const chatIcon = document.getElementById("chat-icon");

  // Funkcja do przełączania widoczności czatu
  window.toggleChat = function () {
    chat.classList.toggle("hidden");
    chatIcon.classList.toggle("active");
  };

  // Upewnij się, że `io` jest dostępne
  if (typeof io === "undefined") {
    console.error("Biblioteka Socket.IO nie została załadowana.");
    return;
  }

  const socket = io("https://forum-project-rncg.onrender.com/");

  // Funkcja do renderowania wiadomości
  function renderMessage(msg) {
    const messagesList = document.getElementById("messages");
    const li = document.createElement("li");

    // Obsługa formatu daty Firestore
    let timestamp = "Brak daty";
    if (msg.timestamp) {
      if (msg.timestamp.seconds) {
        timestamp = new Date(msg.timestamp.seconds * 1000).toLocaleString("pl-PL");
      } else if (msg.timestamp._seconds) {
        timestamp = new Date(msg.timestamp._seconds * 1000).toLocaleString("pl-PL");
      }
    }

    li.textContent = `[${timestamp}] ${msg.author}: ${msg.text}`;
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight; // Automatyczne przewijanie
  }

  // Pobieranie historii wiadomości z serwera
  socket.on("chat history", (messages) => {
    console.log("Odebrano historię wiadomości:", messages);

    const messagesList = document.getElementById("messages");
    messagesList.innerHTML = ""; // Wyczyść listę wiadomości

    // Renderuj każdą wiadomość z historii
    messages.forEach((msg) => renderMessage(msg));
  });

  // Obsługa odebrania nowej wiadomości
  socket.on("chat message", (msg) => {
    console.log("Nowa wiadomość odebrana:", msg);
    renderMessage(msg); // Renderuj nową wiadomość
  });

  // Obsługa przesyłania wiadomości
  document.getElementById("form").addEventListener("submit", (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("Musisz być zalogowany, aby wysyłać wiadomości.");
      return;
    }

    const input = document.getElementById("input");
    const messageText = input.value.trim();

    if (!messageText) {
      alert("Wiadomość nie może być pusta.");
      return;
    }

    const message = {
      text: messageText,
      author: currentUser.displayName || currentUser.email || "Nieznany użytkownik",
    };

    // Wysłanie wiadomości na serwer
    socket.emit("chat message", message);
    console.log("Wysłano wiadomość:", message);

    // Wyczyszczenie pola wejściowego
    input.value = "";
  });
}

// Ładuj czat po załadowaniu DOM
document.addEventListener("DOMContentLoaded", loadChat);
