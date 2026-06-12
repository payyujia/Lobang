const express   = require('express');
const http      = require('http');
const session   = require('express-session');
const dotenv    = require('dotenv');
const mongoose  = require('mongoose');
const path      = require('path');
const { initSocket } = require('./socketSetup');

dotenv.config({ path: './config.env' });

const app = express();

//  Session middleware (stored in variable so Socket.io can share it) 
const sessionMiddleware = session({
  secret:            process.env.SECRET,
  resave:            false,
  saveUninitialized: false,
});

//  Middleware ─
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);  //  use the variable, not an inline call

//  API Routes ─
app.use('/api',          require('./routes/userRoutes'));
app.use('/api/listings',      require('./routes/listingRoutes'));
app.use('/api/tags',          require('./routes/tagRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/profile',       require('./routes/profileRoutes'));
app.use('/api/chats',         require('./routes/chatRoutes'));

//  Serve React build in production ─
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

//  HTTP server + Socket.io 
const httpServer = http.createServer(app);
initSocket(httpServer, sessionMiddleware);

//  DB + Start ─
async function connectDB() {
  try {
    await mongoose.connect(process.env.DB);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

function startServer() {
  const port     = process.env.PORT || 8000;
  const hostname = 'localhost';
  httpServer.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
}

connectDB().then(startServer);