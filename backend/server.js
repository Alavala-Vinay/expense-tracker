const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");

dotenv.config();

const { Server: SocketIOServer } = require("socket.io");

const authRoutes = require("./routes/authRoutes.js");
const incomeRoutes = require("./routes/incomeRoutes.js");
const expenseRoutes = require("./routes/expenseRoutes.js");
const dashboardRoutes = require("./routes/dashboardRoutes.js");
const tripRoutes = require("./routes/tripRoutes.js");

const Trip = require("./models/Trip.js");
const TripMessage = require("./models/TripMessage.js");
const User = require("./models/User.js");
const { connectDB } = require("./config/db.js");

const app = express();
const server = http.createServer(app);

// --- CORS ---
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://expensia.vercel.app",
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// --- DB ---
connectDB();

// --- Routes ---
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/income", incomeRoutes);
app.use("/api/v1/expense", expenseRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/trips", tripRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Socket.IO ---
const allowedOrigin = process.env.FRONTEND_URL || "https://expensia.vercel.app";
const io = new SocketIOServer(server, {
  cors: { origin: [process.env.FRONTEND_URL || "https://expensia.vercel.app"], methods: ["GET", "POST"] },
});

// ✅ Make io available inside controllers
app.set("io", io);

// Middleware: verify JWT
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) return next(new Error("unauthorized"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: payload.id || payload._id };
    next();
  } catch (err) {
    console.error("Socket auth failed:", err.message);
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.id}`);

  // Join trip room
  socket.on("join-trip", async (tripId) => {
    try {
      const trip = await Trip.findById(tripId).select(
        "userId participants visibility"
      );
      if (!trip) return socket.emit("error", "Trip not found");

      const uid = String(socket.user.id);
      const isCreator = String(trip.userId) === uid;
      const isParticipant = trip.participants.map(String).includes(uid);

      if (
        (trip.visibility === "private" && !isCreator) ||
        (!isCreator && !isParticipant)
      ) {
        return socket.emit("error", "Access denied");
      }

      socket.join(`trip:${tripId}`);
      socket.emit("joined", tripId);
    } catch (err) {
      console.error("Join trip error:", err);
      socket.emit("error", "Server error");
    }
  });

  // Handle messages
  socket.on("trip-message", async ({ tripId, message }) => {
    if (!tripId || !message) return;

    try {
      // Save message to DB
      const msg = await TripMessage.create({
        trip: tripId,
        user: socket.user.id,
        message,
      });

      const populated = await msg.populate("user", "fullName email");

      // Broadcast to room
      io.to(`trip:${tripId}`).emit("trip-message", populated);
    } catch (err) {
      console.error("Trip message error:", err);
      socket.emit("error", "Message not sent");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
