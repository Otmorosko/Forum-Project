const functions = require("firebase-functions");
const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const { sanitizeInput } = require("./utils");

// Inicjalizacja Express i Socket.IO
const app = express();
const server = http.createServer(app);
const allowedOrigins = ['https://forum-project-rncg.onrender.com', 'http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
  },
});

// Logika Socket.IO
io.on("connection", (socket) => {
  console.log("Użytkownik połączony:", socket.id);

  socket.on("chat message", (message) => {
    console.log("Wiadomość otrzymana:", message);
    // TODO: Add authentication check here if possible
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
