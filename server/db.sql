-- ============================================================
-- Dictée Fnac Tunisie — Schéma PostgreSQL
-- Exécuter une seule fois : psql -U postgres -d dictee_fnac -f db.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table principale des inscrits
CREATE TABLE IF NOT EXISTS inscriptions (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(30)  UNIQUE NOT NULL,
  prenom      VARCHAR(100) NOT NULL,
  nom         VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  telephone   VARCHAR(30),
  present     BOOLEAN      DEFAULT FALSE,
  scanned_at  TIMESTAMP,
  created_at  TIMESTAMP    DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_inscriptions_email ON inscriptions(email);
CREATE INDEX IF NOT EXISTS idx_inscriptions_code  ON inscriptions(code);

-- Table admin (un seul compte suffira)
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Vue pratique pour le dashboard
CREATE OR REPLACE VIEW stats AS
SELECT
  COUNT(*)                                   AS total,
  COUNT(*) FILTER (WHERE present = TRUE)     AS presents,
  COUNT(*) FILTER (WHERE present = FALSE)    AS en_attente,
  400 - COUNT(*)                             AS places_restantes
FROM inscriptions;
