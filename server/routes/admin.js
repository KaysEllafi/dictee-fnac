const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');

const SECRET = process.env.JWT_SECRET;

// Middleware auth JWT
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé.' });
  try {
    req.user = jwt.verify(header.split(' ')[1], SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identifiants manquants.' });

  try {
    const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Identifiants incorrects.' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects.' });

    const token = jwt.sign({ id: rows[0].id, username }, SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/admin/inscrits — liste complète
router.get('/inscrits', auth, async (req, res) => {
  const { q } = req.query;
  try {
    let query = 'SELECT id, code, prenom, nom, email, telephone, present, scanned_at, created_at FROM inscriptions';
    const params = [];
    if (q) {
      query += ' WHERE LOWER(nom || \' \' || prenom || \' \' || email) LIKE $1';
      params.push(`%${q.toLowerCase()}%`);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/admin/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stats');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/admin/setup — créer le compte admin (à appeler une seule fois)
router.post('/setup', async (req, res) => {
  if (process.env.ADMIN_SETUP_ENABLED !== 'true') {
    return res.status(403).json({ error: 'Route désactivée.' });
  }

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username et password requis.' });

  try {
    const { rows: existing } = await pool.query('SELECT COUNT(*) AS n FROM admins');
    if (parseInt(existing[0].n) > 0) {
      return res.status(409).json({ error: 'Un compte admin existe déjà.' });
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [username, hash]);
    res.json({ message: 'Compte admin créé.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
