require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const inscriptionRoutes = require('./routes/inscriptions');
const adminRoutes       = require('./routes/admin');
const scanRoutes        = require('./routes/scan');

const app  = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

const missingVars = ['JWT_SECRET', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  .filter((name) => !process.env[name]);

if (missingVars.length) {
  console.error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
  process.exit(1);
}

if (isProduction && !process.env.CORS_ORIGIN) {
  console.error('CORS_ORIGIN est obligatoire en production.');
  process.exit(1);
}

// ── Middlewares ───────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Autorise les appels serveur-à-serveur et le même domaine.
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json());

// Limite : 10 inscriptions par IP par heure (anti-spam)
const inscriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives. Réessayez dans une heure.' }
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/inscriptions', inscriptionLimiter, inscriptionRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/scan',         scanRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📋 Mode : ${process.env.NODE_ENV}`);
  });
}

module.exports = app;
