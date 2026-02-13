#!/usr/bin/env node
/**
 * Script de limpeza de bundles expirados.
 *
 * Para rodar manualmente:
 *   pnpm run cleanup
 *   node scripts/cleanup.js
 *
 * Para agendar via cron (ex.: a cada hora):
 *   0 * * * * cd /path/to/transferfiles && node scripts/cleanup.js
 *
 * Ou usando setInterval no server.js no futuro:
 *   const { cleanupExpiredBundles } = require('./lib/expiry');
 *   setInterval(cleanupExpiredBundles, 60 * 60 * 1000); // a cada hora
 */

const path = require('path');

// Garante que carregamos a partir da raiz do projeto
process.chdir(path.join(__dirname, '..'));
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { cleanupExpiredBundles, EXPIRY_HOURS } = require('../lib/expiry');

console.log(`[Cleanup] Iniciando. Links expiram após ${EXPIRY_HOURS}h.`);
const result = cleanupExpiredBundles();
console.log(`[Cleanup] Concluído. Removidos: ${result.deleted}, Erros: ${result.errors}`);
