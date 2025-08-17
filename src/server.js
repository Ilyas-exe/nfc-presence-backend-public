// server.js (New Combined Version)
const http = require('http');
const express = require('express');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./config/swaggerDef');
const connectDB = require('./config/db');

// --- Basic Setup ---
dotenv.config();
const app = express();
const httpServer = http.createServer(app);

// --- Connect to Database ---
connectDB();

// --- Socket.io Integration ---
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});

// --- Middleware Setup ---
// IMPORTANT: Apply middleware BEFORE mounting routes

// Use morgan for HTTP request logging (in development mode)
if (process.env.NODE_ENV === 'development') { 
  app.use(morgan('dev'));
}

// CONFIGURE AND USE CORS
const corsOptions = {
    origin: 'http://localhost:5173', // For development with Vite React. Adjust if your frontend port is different.
    optionsSuccessStatus: 200 // For legacy browser compatibility
};
app.use(cors(corsOptions));

//  USE HELMET FOR SECURITY HEADERS
app.use(helmet());

//  Middleware to parse JSON requests
app.use(express.json());

//  Middleware to attach io to each request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- Route Mounting ---
// Mount API Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition)); // <-- USE THE NEW OBJECT HERE

// Mount authentication routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/filieres', require('./routes/filiereRoutes'));
app.use('/api/modules', require('./routes/moduleRoutes'));
app.use('/api/professeurs', require('./routes/professeurRoutes'));
app.use('/api/salles', require('./routes/salleRoutes'));
app.use('/api/etudiants', require('./routes/etudiantRoutes'));
app.use('/api/seances', require('./routes/seanceRoutes'));
app.use('/api/presences', require('./routes/presenceRoutes'));
app.use('/api/admins', require('./routes/adminRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(err); // Log the full error for debugging

  let errorResponse = {
    success: false,
    message: err.message || 'Une erreur est survenue sur le serveur.',
  };

  let statusCode = err.statusCode || 500;

  // Handle specific Mongoose Errors for better client feedback
  if (err.name === 'CastError') {
    // Happens with malformed ObjectId
    errorResponse.message = `Ressource non trouvée avec cet id invalide : ${err.path}`;
    statusCode = 404;
  }

  if (err.name === 'ValidationError') {
    // Mongoose validation error
    const messages = Object.values(err.errors).map(val => val.message);
    errorResponse.message = messages.join(', ');
    statusCode = 400;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    errorResponse.message = `La valeur pour le champ '${field}' existe déjà. Veuillez en utiliser une autre.`;
    statusCode = 400;
  }

  // In development mode, send the detailed error stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
});

// --- Socket.io Connection Logic ---
io.on('connection', (socket) => {
  console.log('✅ A user connected via WebSocket:', socket.id);

  socket.on('joinSeanceRoom', (seanceId) => {
    socket.join(seanceId);
    console.log(`User ${socket.id} joined room for Seance ${seanceId}`);
  });
  
  socket.on('leaveSeanceRoom', (seanceId) => {
    socket.leave(seanceId);
    console.log(`User ${socket.id} left room for Seance ${seanceId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
// This condition ensures that the server only starts listening
// when the file is run directly, not when it's imported by a test file.
if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the httpServer so our tests can use it
module.exports = httpServer;