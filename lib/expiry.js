/**
 * Módulo de expiração de bundles.
 * Links expiram após EXPIRY_MS. Use cleanupExpiredBundles() em um job/cron.
 */

const path = require('path');
const fs = require('fs');

// Tempo de expiração padrão: 24 horas (em ms)
// Pode ser sobrescrito via variável de ambiente EXPIRY_HOURS
const EXPIRY_HOURS = parseInt(process.env.EXPIRY_HOURS || '24', 10);
const EXPIRY_MS = EXPIRY_HOURS * 60 * 60 * 1000;

function getUploadDir() {
  return path.join(__dirname, '..', 'uploads');
}

/**
 * Verifica se um bundle está expirado.
 * @param {Object} bundle - Objeto bundle (deve ter createdAt)
 * @returns {boolean}
 */
function isBundleExpired(bundle) {
  const createdAt = bundle?.createdAt;
  if (!createdAt) return true; // Bundles antigos sem createdAt consideramos expirados para segurança
  return Date.now() - createdAt > EXPIRY_MS;
}

/**
 * Remove um bundle e seus arquivos do disco.
 * @param {string} bundleId
 * @param {Object} bundle - Objeto com bundle.files
 */
function deleteBundle(bundleId, bundle) {
  const UPLOAD_DIR = getUploadDir();
  try {
    const files = bundle?.files || [];
    for (const f of files) {
      const ext = path.extname(f.originalName) || '';
      const filePath = path.join(UPLOAD_DIR, `${f.id}${ext}`);
      const metaPath = path.join(UPLOAD_DIR, `${f.id}.meta.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    }
    const bundlePath = path.join(UPLOAD_DIR, `bundle.${bundleId}.json`);
    if (fs.existsSync(bundlePath)) fs.unlinkSync(bundlePath);
  } catch (e) {
    console.error('Erro ao remover bundle expirado:', e);
  }
}

/**
 * Percorre todos os bundles e remove os expirados.
 * Preparado para ser chamado por job/cron.
 * @returns {{ deleted: number, errors: number }}
 */
function cleanupExpiredBundles() {
  const UPLOAD_DIR = getUploadDir();
  if (!fs.existsSync(UPLOAD_DIR)) return { deleted: 0, errors: 0 };

  const files = fs.readdirSync(UPLOAD_DIR);
  const bundleFiles = files.filter(f => f.startsWith('bundle.') && f.endsWith('.json'));
  let deleted = 0;
  let errors = 0;

  for (const file of bundleFiles) {
    const bundlePath = path.join(UPLOAD_DIR, file);
    try {
      const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
      const bundleId = file.replace('bundle.', '').replace('.json', '');
      if (isBundleExpired(bundle)) {
        deleteBundle(bundleId, bundle);
        deleted++;
      }
    } catch (e) {
      console.error('Erro ao processar', file, e);
      errors++;
    }
  }

  if (deleted > 0) {
    console.log(`[Cleanup] ${deleted} bundle(s) expirado(s) removido(s)`);
  }
  return { deleted, errors };
}

module.exports = {
  EXPIRY_MS,
  EXPIRY_HOURS,
  isBundleExpired,
  deleteBundle,
  cleanupExpiredBundles
};
