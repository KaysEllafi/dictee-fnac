const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { genererCode }    = require('../services/codeService');
const { envoyerEmail }   = require('../services/emailService');

const MAX = parseInt(process.env.MAX_INSCRIPTIONS || '400');

// POST /api/inscriptions — créer une nouvelle inscription
router.post('/', async (req, res) => {
  const body = req.body || {};

  // Compat ancien format (1 inscription) :
  // { prenom, nom, email, telephone }
  // Nouveau format :
  // { email, participants: [{ prenom, nom, telephone }] }
  const email = body.email;
  let participants = body.participants;
  if (!Array.isArray(participants)) {
    participants = [
      {
        prenom: body.prenom,
        nom: body.nom,
        telephone: body.telephone
      }
    ];
  }

  if (!email) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (email).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  }

  participants = participants
    .filter(Boolean)
    .slice(0, 3);

  if (!participants.length) {
    return res.status(400).json({ error: 'Aucun participant fourni.' });
  }

  const invalidParticipant = participants.some(p => !p?.prenom || !p?.nom);
  if (invalidParticipant) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (prenom, nom pour chaque inscrit).' });
  }

  try {
    // Vérifier le compteur
    const { rows: countRows } = await pool.query('SELECT COUNT(*) AS n FROM inscriptions');
    const current = parseInt(countRows[0].n);
    const remainingAfter = current + participants.length;
    if (remainingAfter > MAX) {
      return res.status(409).json({ error: 'Désolé, la dictée affiche complet (places insuffisantes).' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Insérer tous les participants
    const inscriptions = [];
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const code = genererCode(current + i + 1);
      const { rows } = await pool.query(
        `INSERT INTO inscriptions (code, prenom, nom, email, telephone)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [code, p.prenom.trim(), p.nom.trim(), normalizedEmail, p.telephone?.trim() || null]
      );
      inscriptions.push(rows[0]);
    }

    // Envoyer l'e-mail de confirmation (async, on ne bloque pas la réponse)
    envoyerEmail(inscriptions).catch(err =>
      console.error('Erreur envoi e-mail:', err.message)
    );

    return res.status(201).json({
      message: 'Inscription confirmée !',
      inscriptions: inscriptions.map((ins) => ({
        id: ins.id,
        code: ins.code,
        prenom: ins.prenom,
        nom: ins.nom,
        email: ins.email,
      }))
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
