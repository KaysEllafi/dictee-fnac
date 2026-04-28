# 📖 Dictée Fnac Tunisie 2025 — Application d'inscription

Application complète : formulaire d'inscription public → e-mail automatique avec QR code → dashboard admin → scanner jour J.

---

## Architecture

```
dictee-fnac/
├── server/                  ← API Node.js + Express
│   ├── index.js             ← Point d'entrée du serveur (port 4000)
│   ├── db.js                ← Connexion PostgreSQL (pool)
│   ├── db.sql               ← Schéma SQL à exécuter une fois
│   ├── .env.example         ← Copier en .env et remplir
│   ├── package.json
│   ├── routes/
│   │   ├── inscriptions.js  ← POST /api/inscriptions, GET /count
│   │   ├── admin.js         ← Auth JWT, liste, stats
│   │   └── scan.js          ← POST /api/scan (jour J)
│   └── services/
│       ├── codeService.js   ← Génération code unique FNAC-2025-XXXXX-YYYY
│       └── emailService.js  ← Envoi e-mail + QR code via Nodemailer
│
└── client/                  ← Frontend React (port 3000)
    ├── package.json
    ├── public/index.html
    └── src/
        ├── App.js            ← Routing React Router v6
        ├── App.css           ← Styles globaux
        ├── index.js
        └── pages/
            ├── InscriptionPage.js  ← Formulaire public
            ├── AdminPage.js        ← Dashboard liste + stats
            ├── ScannerPage.js      ← Scanner QR code jour J
            └── LoginPage.js        ← Connexion admin
```

---

## Prérequis

| Outil | Version minimum | Téléchargement |
|-------|-----------------|----------------|
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://www.postgresql.org/download/windows/ |
| VS Code | toute version | https://code.visualstudio.com |

### Extensions VS Code recommandées
- **ESLint** — linting JavaScript
- **Prettier** — formatage
- **REST Client** — tester les API directement dans VS Code

---

## Installation pas à pas

### 1. Cloner / ouvrir le projet dans VS Code

```
Fichier → Ouvrir le dossier → sélectionner dictee-fnac/
```

### 2. Créer la base de données PostgreSQL

Ouvrir pgAdmin ou le terminal :

```sql
-- Dans psql ou pgAdmin :
CREATE DATABASE dictee_fnac;
\c dictee_fnac
-- Puis exécuter le contenu de server/db.sql
```

Ou en une commande depuis le terminal VS Code (Ctrl+`) :

```bash
psql -U postgres -c "CREATE DATABASE dictee_fnac;"
psql -U postgres -d dictee_fnac -f server/db.sql
```

### 3. Configurer le serveur

```bash
cd server
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux
```

Ouvrir `.env` et remplir :

```env
DB_PASSWORD=ton_mot_de_passe_postgres
SMTP_USER=ton.email@gmail.com
SMTP_PASS=xxxx_xxxx_xxxx_xxxx   # App Password Gmail (pas ton vrai mot de passe)
JWT_SECRET=une_chaine_longue_et_aleatoire_ici
```

> **Gmail → App Password** : compte Google → Sécurité → Validation en 2 étapes → Mots de passe des applications → Créer pour "Mail"

### 4. Installer les dépendances

Ouvrir **2 terminaux** dans VS Code (icône `+` dans le terminal) :

**Terminal 1 — Serveur :**
```bash
cd server
npm install
```

**Terminal 2 — Client :**
```bash
cd client
npm install
```

### 5. Créer le compte administrateur

Après `npm install` côté serveur, démarrer le serveur une première fois :

```bash
# Terminal 1
cd server
npm run dev
```

Puis dans un 3e terminal (ou avec curl / REST Client) :

```bash
curl -X POST http://localhost:4000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"admin\", \"password\": \"Admin2025!\"}"
```

> ⚠️ Cette route est bloquée après la première utilisation.

### 6. Lancer le projet

**Terminal 1 — Serveur (port 4000) :**
```bash
cd server
npm run dev
```

**Terminal 2 — Client React (port 3000) :**
```bash
cd client
npm start
```

Le navigateur s'ouvre automatiquement sur `http://localhost:3000`.

---

## Utilisation

### Page d'inscription (publique)
`http://localhost:3000/`

Les participants remplissent le formulaire. L'application :
- Vérifie que les 400 places ne sont pas dépassées
- Vérifie que l'e-mail n'est pas déjà inscrit
- Génère un code unique `FNAC-2025-XXXXX-YYYY`
- Envoie automatiquement un e-mail avec le QR code

### Dashboard admin
`http://localhost:3000/login` → identifiants créés à l'étape 5

- Vue de tous les inscrits avec recherche
- Statistiques en temps réel
- Export CSV (compatible Excel avec séparateur `;`)

### Scanner — Jour J
`http://localhost:3000/scanner`

- Compatible avec toute **douchette USB** (mode HID clavier) — elle envoie le code + Entrée
- Compatible avec les **scanners Bluetooth**
- Saisie manuelle possible
- Résultat immédiat : vert (présence confirmée), orange (déjà scanné), rouge (inconnu)

---

## API — Routes disponibles

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/health` | — | Vérifier que le serveur tourne |
| GET | `/api/inscriptions/count` | — | Compteur public |
| POST | `/api/inscriptions` | — | Créer une inscription |
| POST | `/api/admin/login` | — | Obtenir un token JWT |
| POST | `/api/admin/setup` | — | Créer le compte admin (1 fois) |
| GET | `/api/admin/inscrits` | JWT | Liste des inscrits |
| GET | `/api/admin/stats` | JWT | Statistiques |
| POST | `/api/scan` | JWT | Scanner un code |

---

## Déploiement en production

### Option A — VPS simple (recommandé)
1. Louer un VPS Ubuntu (OVH, DigitalOcean, Hetzner)
2. Installer Node.js, PostgreSQL, PM2
3. `pm2 start server/index.js --name dictee-api`
4. `npm run build` dans `client/`, servir avec Nginx

### Option B — GitHub + Vercel (frontend + API ensemble)
Le fichier `vercel.json` est déjà prêt pour :
- Builder le frontend React (`client/`)
- Exposer l'API Express via `/api/*` (`server/index.js`)

Étapes :
1. Pousser le projet sur GitHub.
2. Dans Vercel : **New Project** → importer le repo GitHub.
3. Garder les paramètres auto-détectés (Vercel lit `vercel.json`).
4. Ajouter les variables d'environnement dans Vercel :
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - `JWT_SECRET`
   - `CORS_ORIGIN` (ex: `https://ton-projet.vercel.app`)
   - `ADMIN_SETUP_ENABLED=false` (recommandé en production)
5. Lancer le déploiement.

> ℹ️ En production, la base PostgreSQL doit être hébergée (Supabase, Neon, Railway, etc.), pas en local.

---

## Dépannage fréquent

| Problème | Solution |
|----------|----------|
| `ECONNREFUSED 5432` | PostgreSQL n'est pas démarré. Services Windows → démarrer "postgresql-x64-XX" |
| `Invalid login: 534-5.7.9` (Gmail) | Utiliser un App Password, pas le vrai mot de passe |
| Port 3000 déjà utilisé | `set PORT=3001 && npm start` (Windows) |
| Token JWT expiré | Se reconnecter sur `/login` (durée : 8h) |
| E-mail non reçu | Vérifier les spams. Tester avec Mailjet (moins filtré que Gmail) |

---

## Variables d'environnement complètes

```env
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dictee_fnac
DB_USER=postgres
DB_PASSWORD=CHANGER_MOI

# Serveur
PORT=4000
NODE_ENV=development

# SMTP Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ton@gmail.com
SMTP_PASS=xxxx_xxxx_xxxx_xxxx

# Sécurité
JWT_SECRET=chaine_aleatoire_longue_32_caracteres_minimum
ADMIN_PASSWORD=Admin2025!

# Limites
MAX_INSCRIPTIONS=400
```

---

*Culturetech SA / Fnac Tunisie — Usage interne*
