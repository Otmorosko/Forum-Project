const socket = io("https://forum-project-rncg.onrender.com", {
  path: "/socket.io", // Dodajemy ścieżkę, jeśli serwer jej wymaga
  transports: ["websocket"], // Wymuszamy użycie WebSocket
});

// Nasłuchiwanie na wiadomości
socket.on("chat message", (msg) => {
  console.log("Nowa wiadomość odebrana:", msg);
  // Możesz tu dodać logikę do wyświetlania wiadomości na stronie
});

// Obsługa błędów połączenia
socket.on("connect_error", (err) => {
  console.error("Błąd połączenia z Socket.IO:", err);
});

socket.on("connect", () => {
  console.log("Połączono z serwerem Socket.IO:", socket.id);
});

// Przesyłanie wiadomości
document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("input");
  const author = "Anonymous"; // Możesz dodać logikę pobierania autora
  if (input.value.trim() !== "") {
    socket.emit("chat message", { text: input.value.trim(), author });
    console.log("Wysłano wiadomość:", input.value);
    input.value = ""; // Reset pola wejściowego
  }
});
