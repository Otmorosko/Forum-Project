const socket = io("http://localhost:3000");

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
