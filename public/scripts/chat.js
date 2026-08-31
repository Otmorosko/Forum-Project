/* eslint-env browser */
/* global io, DOMPurify */
import { monitorAuthState, getAuthToken } from "./auth.js";

let currentUser = null;

// Funkcja do renderowania czatu
function loadChat() {
  console.log("Ładowanie czatu...");
  const chatHTML = `
    <div id="chat-container">
      <div id="chat-icon" class="chat-icon">💬</div>
      <div id="chat" class="chat-box hidden">
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
  console.log("Konfiguracja czatu...");
  const chat = document.getElementById("chat");
  const chatIcon = document.getElementById("chat-icon");
  let socket = null;

  // Sprawdzenie dostępności elementów
  if (!chat || !chatIcon) {
    console.error("Nie znaleziono elementów czatu.");
    return;
  }

  // Funkcja do przełączania widoczności czatu
  function toggleChat() {
    console.log("toggleChat wywołane");
    chat.classList.toggle("hidden");
    chatIcon.classList.toggle("active");

    // Sprawdzenie widoczności
    console.log("Widoczność chat:", window.getComputedStyle(chat).display);
}


  chatIcon.addEventListener("click", toggleChat);

  function attachSocketListeners(activeSocket) {
    activeSocket.on("connect", () => console.log("Połączono z serwerem Socket.IO"));

    // Obsługa błędów połączenia
    activeSocket.on("connect_error", (err) => {
      console.error("Błąd połączenia z serwerem Socket.IO:", err.message);
    });

    // Pobieranie historii wiadomości z serwera
    activeSocket.on("chat history", (messages) => {
      console.log("Odebrano historię wiadomości:", messages);

      const messagesList = document.getElementById("messages");
      messagesList.innerHTML = ""; // Wyczyść listę wiadomości

      messages.forEach((msg) => renderMessage(msg)); // Renderuj każdą wiadomość
    });

    // Obsługa odebrania nowej wiadomości
    activeSocket.on("chat message", (msg) => {
      console.log("Nowa wiadomość odebrana:", msg);
      renderMessage(msg); // Renderuj nową wiadomość
    });
  }

  async function reconnectSocketForUser(user) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    if (!user) {
      return;
    }

    if (typeof io === 'undefined') {
      console.error("Socket.IO client (io) not found on window; chat disabled.");
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      console.warn("Brak tokenu użytkownika. Chat nie zostanie podłączony.");
      return;
    }

    socket = io({ auth: { token } });
    attachSocketListeners(socket);
  }

  // Monitorowanie stanu logowania i podłączanie autoryzowanego socketu
  monitorAuthState(async (user) => {
    if (user) {
      currentUser = user;
      console.log("Zalogowany użytkownik:", user.displayName || user.email);
    } else {
      console.log("Brak zalogowanego użytkownika.");
      currentUser = null;
    }

    await reconnectSocketForUser(user);
  });

  // Dodaj na górze pliku (lub tuż przed użyciem SafeDOMPurify)
  const SafeDOMPurify = (typeof DOMPurify !== 'undefined' && DOMPurify)
  || (typeof window !== 'undefined' && window.DOMPurify)
  || {
    sanitize: (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  };

  // upewnij się, że renderMessage używa SafeDOMPurify.sanitize(...) zamiast bezpośrednio SafeDOMPurify
  function renderMessage(msg) {
    const messagesList = document.getElementById("messages");
    if (!messagesList) return;
    const li = document.createElement("li");

    let timestamp = "Brak daty";
    if (msg.timestamp) {
      if (msg.timestamp.seconds) {
        timestamp = new Date(msg.timestamp.seconds * 1000).toLocaleString("pl-PL");
      } else if (msg.timestamp._seconds) {
        timestamp = new Date(msg.timestamp._seconds * 1000).toLocaleString("pl-PL");
      } else if (typeof msg.timestamp === 'string' || msg.timestamp instanceof String) {
        timestamp = new Date(msg.timestamp).toLocaleString("pl-PL");
      }
    }

    const safeAuthor = SafeDOMPurify.sanitize(msg.author || 'Anonim', { ALLOWED_TAGS: [] });
    const safeText = SafeDOMPurify.sanitize(msg.text || '', { ALLOWED_TAGS: [] });

    li.textContent = `[${timestamp}] ${safeAuthor}: ${safeText}`;
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  // Obsługa przesyłania wiadomości
  const form = document.getElementById("form");
  if (form) {
    form.addEventListener("submit", (e) => {
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

      if (!socket || !socket.connected) {
        alert("Połączenie czatu nie jest aktywne. Spróbuj ponownie za chwilę.");
        return;
      }

      const message = { text: messageText };

      // Wysłanie wiadomości na serwer
      socket.emit("chat message", message);
      console.log("Wysłano wiadomość:", message);

      input.value = ""; // Wyczyszczenie pola wejściowego
    });
  } else {
    console.error("Nie znaleziono formularza czatu.");
  }
}

// Ładuj czat po załadowaniu DOM
document.addEventListener("DOMContentLoaded", loadChat);
