require('dotenv').config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express    = require("express");
const cors       = require("cors");
const dotenv     = require("dotenv");
const http       = require("http");
const { Server } = require("socket.io");
const jwt        = require("jsonwebtoken");
const ratingRoutes = require("./routes/ratingRoutes");

dotenv.config();

const mongoDB = require("./config/db");
const authController = require('./controllers/authController');
const chatModel = require("./models/chatModel");


const app    = express();
const server = http.createServer(app);            // wrap express in http server
const io     = new Server(server, {
  cors: { origin: "*", credentials: true },
});

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/items",    require("./routes/itemRoutes"));
app.use("/api/requests", require("./routes/requestRoutes"));
app.use("/api/orders",   require("./routes/orderRoutes"));
app.use("/api/chat",     require("./routes/chatRoutes"));
app.use("/api/user",     require("./routes/userRoutes")); 
app.use("/api/ratings", require("./routes/ratingRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/admin-auth", require("./routes/adminAuthRoutes"));
app.use("/api/super-admin", require("./routes/superAdminRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.get("/", (req, res) => res.json({ message: "LenDen backend running" }));

// ── Socket.io — real-time chat ────────────────────────────────────────────────
// Auth middleware: verify JWT on every socket connection
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;   // { userId, email, org, name }
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const user = socket.user;

  // Client joins a chat room
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    chatModel.markRead(roomId, user.email).catch(() => {});
  });

  // Client sends a message
  // payload: { roomId, text, contextType, contextId, contextTitle, contextPrice, contextImage, recipientEmail, recipientName, org }
  socket.on("send_message", async (payload) => {
    try {
      const msg = {
        roomId:         payload.roomId,
        senderEmail:    user.email,
        senderName:     user.name,
        recipientEmail: payload.recipientEmail,
        text:           payload.text,
        org:            payload.org || user.org,
      };

      // Save message to DB
      const result = await chatModel.saveMessage(msg);
      const saved  = { ...msg, _id: result.insertedId, createdAt: new Date() };

      // Update conversation record (inbox entry)
      await chatModel.upsertConversation(payload.roomId, {
        contextType:   payload.contextType,
        contextId:     payload.contextId,
        contextTitle:  payload.contextTitle,
        contextPrice:  payload.contextPrice,
        contextImage:  payload.contextImage,
        participants:  [user.email, payload.recipientEmail],
        lastMessage:   payload.text,
        org:           payload.org || user.org,
      });

      // Broadcast to everyone in the room (sender + recipient)
      io.to(payload.roomId).emit("new_message", saved);
    } catch (e) {
      socket.emit("error", { message: e.message });
    }
  });

  socket.on("leave_room", (roomId) => socket.leave(roomId));
  socket.on("disconnect", () => {});
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function startServer() {
    await mongoDB.connect();
    
    await authController.refreshAllowedDomains();
    
    const superAdminModel = require('./models/superAdminModel');
    await superAdminModel.initializeSuperAdmins();
    
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

process.on("SIGINT",  async () => { await mongoDB.close(); process.exit(0); });
process.on("SIGTERM", async () => { await mongoDB.close(); process.exit(0); });

startServer();