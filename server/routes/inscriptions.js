const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { genererCode }    = require('../services/codeService');
const { envoyerEmail }   = require('../services/emailService');

const MAX = parseInt(process.env.MAX_INSCRIPTIONS || '400');

// POST /api/inscriptions — créer une nouvelle inscription
router.post('/', async (req, res) => {
  const { prenom, nom, email, telephone } = req.body;

  if (!prenom || !nom || !email) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (prenom, nom, email).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  }

  try {
    // Vérifier le compteur
    const { rows: countRows } = await pool.query('SELECT COUNT(*) AS n FROM inscriptions');
    if (parseInt(countRows[0].n) >= MAX) {
      return res.status(409).json({ error: 'Désolé, la dictée affiche complet (400/400 places).' });
    }

    // Vérifier doublon email
    const { rows: existing } = await pool.query(
      'SELECT id FROM inscriptions WHERE email = $1', [email.toLowerCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Cette adresse e-mail est déjà inscrite.' });
    }

    // Générer le code unique
    const code = genererCode(parseInt(countRows[0].n) + 1);

    // Insérer en base
    const { rows } = await pool.query(
      `INSERT INTO inscriptions (code, prenom, nom, email, telephone)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, prenom.trim(), nom.trim(), email.toLowerCase().trim(), telephone?.trim() || null]
    );
    const inscription = rows[0];

    // Envoyer l'e-mail de confirmation (async, on ne bloque pas la réponse)
    envoyerEmail(inscription).catch(err =>
      console.error('Erreur envoi e-mail:', err.message)
    );

    return res.status(201).json({
      message: 'Inscription confirmée !',
      inscription: {
        id:    inscription.id,
        code:  inscription.code,
        prenom: inscription.prenom,
        nom:   inscription.nom,
        email: inscription.email,
      }
    });

  } catch (err) {
    console.error('Erreur inscription:', err.message);
    return res.status(500).json({ error: 'Erreur serveur. Réessayez.' });
  }
});

// GET /api/inscriptions/count — compteur public (pour la barre de progression)
router.get('/count', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM inscriptions');
    res.json({ count: parseInt(rows[0].n), max: MAX });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
