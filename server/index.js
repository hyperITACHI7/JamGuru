require('dotenv').config();
const express = require('express');
const cors = require('cors');

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
const { scheduleMonthlyReset } = require('./jobs/monthlyReset');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL,
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
app.use('/api/profile/taste',   tasteRoutes);     // /api/profile/taste GET/PATCH/POST/refresh

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

scheduleMonthlyReset();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`JamGuru server running on http://localhost:${PORT}`));
