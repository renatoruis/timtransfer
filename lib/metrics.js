const fs = require('fs');
const path = require('path');

const METRICS_DIR = path.join(__dirname, '..', 'metrics');
const METRICS_FILE = path.join(METRICS_DIR, 'metrics.json');

const DEFAULT_METRICS = {
  uploads_total: 0,
  downloads_total: 0,
  shares_viewed: 0,
  api_share_requests: 0,
  password_verify_attempts: 0,
  password_verify_success: 0,
  password_verify_fail: 0,
  feedbacks_total: 0,
  upload_errors: 0,
  download_errors_404: 0,
  download_errors_auth: 0,
  bytes_uploaded: 0,
  bytes_downloaded: 0,
  last_updated: null
};

function ensureMetricsDir() {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }
}

function loadMetrics() {
  ensureMetricsDir();
  try {
    const data = fs.readFileSync(METRICS_FILE, 'utf8');
    return { ...DEFAULT_METRICS, ...JSON.parse(data) };
  } catch (e) {
    return { ...DEFAULT_METRICS };
  }
}

function saveMetrics(data) {
  ensureMetricsDir();
  data.last_updated = new Date().toISOString();
  fs.writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function increment(name, amount = 1) {
  try {
    const m = loadMetrics();
    if (typeof m[name] === 'number') {
      m[name] += amount;
    } else {
      m[name] = (m[name] || 0) + amount;
    }
    saveMetrics(m);
  } catch (e) {
    console.error('[Metrics] Erro ao incrementar', name, e);
  }
}

function getMetrics() {
  return loadMetrics();
}

function toPrometheusFormat(metrics) {
  const lines = [];
  for (const [key, value] of Object.entries(metrics)) {
    if (key === 'last_updated') continue;
    const num = typeof value === 'number' ? value : 0;
    const name = `timtransfer_${key}`;
    lines.push(`# HELP ${name} TimTransfer metric ${key}`);
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${num}`);
  }
  return lines.join('\n') + '\n';
}

module.exports = {
  increment,
  getMetrics,
  toPrometheusFormat,
  loadMetrics
};
