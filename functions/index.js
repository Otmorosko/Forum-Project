const functions = require("firebase-functions");
const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const { sanitizeInput } = require("./utils");

// Inicjalizacja Express i Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Zezwól na wszystkie domeny
    methods: ["GET", "POST"],
  },
});

// Logika Socket.IO
io.on("connection", (socket) => {
  console.log("Użytkownik połączony:", socket.id);

  socket.on("chat message", (message) => {
    console.log("Wiadomość otrzymana:", message);
    // Sanitize message text before broadcasting
    if (message && typeof message.text === "string") {
      message.text = sanitizeInput(message.text);
    }
    io.emit("chat message", message); // Rozsyłanie wiadomości
  });

  socket.on("disconnect", () => {
    console.log("Użytkownik rozłączony:", socket.id);
  });
});

// Eksport funkcji Firebase Functions
exports.socket = functions.https.onRequest((req, res) => {
  if (!req.path) {
    req.url = `/${req.url}`; // Naprawienie ścieżek
  }
  return server(req, res);
});
