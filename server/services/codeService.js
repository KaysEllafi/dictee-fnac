const { v4: uuidv4 } = require('uuid');

/**
 * Génère un code unique de type FNAC-2026-00042-A3X9
 * @param {number} index — numéro séquentiel de l'inscrit
 * @returns {string}
 */
function genererCode(index) {
  const seq  = String(index).padStart(5, '0');
  const salt = uuidv4().replace(/-/g, '').slice(0, 4).toUpperCase();
  return `FNAC-2026-${seq}-${salt}`;
}

module.exports = { genererCode };
