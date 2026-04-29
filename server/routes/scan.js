const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const pool    = require('../db');

const SECRET = process.env.JWT_SECRET;

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

// POST /api/scan — scanner un code-barres
router.post('/', auth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code manquant.' });

  try {
    const rawCode = code.trim().toUpperCase();
    const normalizedCode = rawCode.replace(/[^A-Z0-9]/g, '');

    const { rows } = await pool.query(
      `SELECT * FROM inscriptions
       WHERE UPPER(code) = $1
          OR REGEXP_REPLACE(UPPER(code), '[^A-Z0-9]', '', 'g') = $2`,
      [rawCode, normalizedCode]
    );

    if (!rows.length) {
      return res.status(404).json({ statut: 'inconnu', message: 'Code non reconnu.' });
    }

    const inscrit = rows[0];

    if (inscrit.present) {
      return res.status(200).json({
        statut: 'deja_scanne',
        message: `${inscrit.prenom} ${inscrit.nom} est déjà enregistré comme présent.`,
        inscrit: { prenom: inscrit.prenom, nom: inscrit.nom, email: inscrit.email }
      });
    }

    // Marquer présent
    await pool.query(
      'UPDATE inscriptions SET present = TRUE, scanned_at = NOW() WHERE id = $1',
      [inscrit.id]
    );

    return res.json({
      statut: 'ok',
      message: `Présence confirmée.`,
      inscrit: { prenom: inscrit.prenom, nom: inscrit.nom, email: inscrit.email }
    });

  } catch (err) {
    console.error('Erreur scan:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
