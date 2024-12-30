const socket = io("https://forum-project-rncg.onrender.com");

socket.on("chat message", (msg) => {
  console.log("Nowa wiadomość:", msg);
});

// Przesyłanie wiadomości
document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("input");
  socket.emit("chat message", input.value);
  input.value = ""; 
});
