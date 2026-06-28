require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { addConnection, removeConnection } = require('./sse');

const authRoutes        = require('./routes/auth');
const spotifyAuthRoutes = require('./routes/spotifyAuth');
const userRoutes      = require('./routes/users');
const songRoutes      = require('./routes/songs');
const friendRoutes    = require('./routes/phase3/friends');
const recRoutes       = require('./routes/phase3/recommendations');
const p4LikeRoutes    = require('./routes/phase4/likes');
const p4JamGuruRoutes = require('./routes/phase4/jamguru');
const p5GroupRoutes   = require('./routes/phase5/groups');
const p6ResetRoutes   = require('./routes/phase6/reset');
const p7AiRoutes      = require('./routes/phase7/ai');
const tasteRoutes     = require('./routes/tasteProfile');
const playlistRoutes      = require('./routes/playlists');
const songRequestRoutes   = require('./routes/songRequests');
const notifRoutes         = require('./routes/notifications');
const { scheduleMonthlyReset } = require('./jobs/monthlyReset');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL,
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/auth',            authRoutes);
app.use('/api/auth/spotify',   spotifyAuthRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/songs',           songRoutes);
app.use('/api/friends',         friendRoutes);
app.use('/api/recommendations', recRoutes);
app.use('/api',                 p4LikeRoutes);   // /api/recommendations/:id/like, /api/likes/:id/feedback
app.use('/api',                 p4JamGuruRoutes); // /api/jamguru/*, /api/trust-rankings
app.use('/api/groups',          p5GroupRoutes);   // /api/groups/*
app.use('/api/phase6',          p6ResetRoutes);   // /api/phase6/reset
app.use('/api',                 p7AiRoutes);      // /api/ai/context/:id, /api/ai/suggest/:id
app.use('/api/profile/taste',   tasteRoutes);
app.use('/api/playlists',       playlistRoutes);
app.use('/api/song-requests',   songRequestRoutes);
app.use('/api/notifications',   notifRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// SSE endpoint — auth via ?token= query param (EventSource cannot set headers)
app.get('/api/events', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  addConnection(userId, res);

  const ping = setInterval(() => {
    try { res.write(':ping\n\n'); }
    catch (_) { clearInterval(ping); }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    removeConnection(userId, res);
  });
});

scheduleMonthlyReset();

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`JamGuru server running on http://localhost:${PORT}`));
