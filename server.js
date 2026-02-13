require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const { isBundleExpired, deleteBundle, EXPIRY_HOURS, EXPIRY_MS } = require('./lib/expiry');
const { increment, getMetrics, toPrometheusFormat } = require('./lib/metrics');

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}
function verifyPassword(pwd, hash) {
  return hash && hash === hashPassword(pwd);
}

const app = express();
const PORT = process.env.PORT || 9090;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_SESSION_SIZE = 100 * 1024 * 1024; // 100MB por sessão (soma de todos os arquivos)
const MAX_UPLOADS_DISK_MB = parseInt(process.env.MAX_UPLOADS_DISK_MB || '1024', 10) || 1024;
const MAX_UPLOADS_DISK_BYTES = MAX_UPLOADS_DISK_MB * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.com', '.bat', '.cmd', '.msi', '.scr', '.vbs', '.ps1', '.pif', '.hta',
  '.cpl', '.msc', '.jar', '.dll', '.sys', '.reg', '.inf', '.wsf', '.vbe', '.jse'
].map(e => e.toLowerCase()));

function getUploadsDirSize() {
  let total = 0;
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    for (const f of files) {
      const fp = path.join(UPLOAD_DIR, f);
      const stat = fs.statSync(fp);
      if (stat.isFile()) total += stat.size;
    }
  } catch (e) {
    console.error('Erro ao medir uploads:', e);
  }
  return total;
}

function getBundleCount() {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    return files.filter(f => f.startsWith('bundle.') && f.endsWith('.json')).length;
  } catch (e) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h > 0) parts.push(h + 'h');
  if (m > 0) parts.push(m + 'min');
  parts.push(s + 's');
  return parts.join(' ');
}

function getFeedbackList() {
  const feedbackDir = path.join(__dirname, 'feedback');
  if (!fs.existsSync(feedbackDir)) return [];
  const files = fs.readdirSync(feedbackDir).filter(f => f.startsWith('feedback_') && f.endsWith('.json'));
  const list = [];
  for (const file of files.sort().reverse()) {
    try {
      const fp = path.join(feedbackDir, file);
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      list.push({ file, ...data });
    } catch (e) {
      list.push({ file, error: 'Erro ao ler' });
    }
  }
  return list;
}

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || '';
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SESSION_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(new Error('Tipo de arquivo não permitido: ' + (ext || '(sem extensão)')));
    }
    cb(null, true);
  }
}).array('file', 50);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.status(204).end());

const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || '';
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
const STATUS_SECRET = process.env.STATUS_SECRET || '';

app.get('/api/config', (req, res) => {
  res.json({ recaptchaSiteKey: RECAPTCHA_SITE_KEY });
});

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET_KEY, response: token })
    });
    const data = await r.json();
    return data.success && (data.score === undefined || data.score >= 0.5);
  } catch (e) {
    console.error('reCAPTCHA verify error:', e);
    return false;
  }
}

app.post('/api/feedback', express.json(), async (req, res) => {
  const { type, message, email, recaptchaToken } = req.body || {};
  const msg = (message || '').trim();
  if (!msg) {
    return res.status(400).json({ error: 'Mensagem é obrigatória.' });
  }
  const validTypes = ['sugestao', 'melhoria', 'critica', 'suporte'];
  const feedbackType = validTypes.includes(type) ? type : 'sugestao';

  const valid = await verifyRecaptcha(recaptchaToken);
  if (!valid) {
    return res.status(400).json({ error: 'Verificação de segurança falhou. Tente novamente.' });
  }

  const feedback = {
    type: feedbackType,
    message: msg,
    email: (email || '').trim(),
    createdAt: new Date().toISOString()
  };
  console.log('[Feedback]', JSON.stringify(feedback, null, 2));
  const feedbackDir = path.join(__dirname, 'feedback');
  if (!fs.existsSync(feedbackDir)) fs.mkdirSync(feedbackDir, { recursive: true });
  const filePath = path.join(feedbackDir, `feedback_${Date.now()}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(feedback, null, 2));
    increment('feedbacks_total');
  } catch (e) {
    console.error('Erro ao salvar feedback:', e);
  }
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/status', (req, res) => {
  const token = (req.query.token || '').trim();
  if (!STATUS_SECRET || token !== STATUS_SECRET) {
    return res.status(403).send('Acesso negado.');
  }
  const uploadsSize = getUploadsDirSize();
  const bundleCount = getBundleCount();
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const metrics = getMetrics();
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Status — TimTransfer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
  </style>
</head>
<body class="bg-[#f5f5f7] min-h-screen p-8 text-[#1d1d1f]">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold mb-6">Status do servidor</h1>
    <div class="space-y-4">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-[#d2d2d7]/50">
        <h2 class="text-sm font-medium text-[#86868b] mb-1">Disco (uploads)</h2>
        <p class="text-xl font-semibold">${formatBytes(uploadsSize)} / ${MAX_UPLOADS_DISK_MB} MB</p>
        <div class="mt-2 h-2 bg-[#e8e8ed] rounded-full overflow-hidden">
          <div class="h-full bg-[#0071e3] rounded-full transition-all" style="width: ${Math.min(100, (uploadsSize / MAX_UPLOADS_DISK_BYTES) * 100)}%"></div>
        </div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-[#d2d2d7]/50">
        <h2 class="text-sm font-medium text-[#86868b] mb-1">Bundles ativos</h2>
        <p class="text-xl font-semibold">${bundleCount}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-[#d2d2d7]/50">
        <h2 class="text-sm font-medium text-[#86868b] mb-1">Uptime</h2>
        <p class="text-xl font-semibold">${formatUptime(uptime)}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-[#d2d2d7]/50">
        <h2 class="text-sm font-medium text-[#86868b] mb-1">Memória (Node)</h2>
        <p class="text-base">RSS: ${formatBytes(mem.rss)} | Heap: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-[#d2d2d7]/50">
        <h2 class="text-sm font-medium text-[#86868b] mb-1">Config</h2>
        <p class="text-sm">Expiração: ${EXPIRY_HOURS}h | Limite disco: ${MAX_UPLOADS_DISK_MB} MB</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-[#d2d2d7]/50">
        <h2 class="text-sm font-medium text-[#86868b] mb-3">Métricas</h2>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-[#86868b]">Uploads:</span> <span class="font-semibold">${metrics.uploads_total || 0}</span></div>
          <div><span class="text-[#86868b]">Downloads:</span> <span class="font-semibold">${metrics.downloads_total || 0}</span></div>
          <div><span class="text-[#86868b]">Links visualizados:</span> <span class="font-semibold">${metrics.shares_viewed || 0}</span></div>
          <div><span class="text-[#86868b]">API share:</span> <span class="font-semibold">${metrics.api_share_requests || 0}</span></div>
          <div><span class="text-[#86868b]">Verificação senha:</span> <span class="font-semibold">${metrics.password_verify_attempts || 0}</span></div>
          <div><span class="text-[#86868b]">Feedbacks:</span> <span class="font-semibold">${metrics.feedbacks_total || 0}</span></div>
          <div><span class="text-[#86868b]">Erros upload:</span> <span class="font-semibold text-[#ff3b30]">${metrics.upload_errors || 0}</span></div>
          <div><span class="text-[#86868b]">Erros download:</span> <span class="font-semibold text-[#ff3b30]">${(metrics.download_errors_404 || 0) + (metrics.download_errors_auth || 0)}</span></div>
        </div>
        <div class="mt-3 pt-3 border-t border-[#d2d2d7]/50">
          <p class="text-xs text-[#86868b]">Dados enviados: ${formatBytes(metrics.bytes_uploaded || 0)} · Dados baixados: ${formatBytes(metrics.bytes_downloaded || 0)}</p>
          ${metrics.last_updated ? `<p class="text-xs text-[#86868b] mt-1">Última atualização: ${new Date(metrics.last_updated).toLocaleString('pt-BR')}</p>` : ''}
        </div>
      </div>
    </div>
    <p class="mt-6 text-sm text-[#86868b]">
      <a href="/status?token=${encodeURIComponent(token)}" class="text-[#0071e3] hover:underline">Atualizar</a>
      &nbsp;·&nbsp;
      <a href="/metrics?token=${encodeURIComponent(token)}" class="text-[#0071e3] hover:underline">Prometheus</a>
      &nbsp;·&nbsp;
      <a href="/feedback?token=${encodeURIComponent(token)}" class="text-[#0071e3] hover:underline">Feedbacks</a>
      &nbsp;·&nbsp;
      <a href="/" class="text-[#0071e3] hover:underline">Voltar</a>
    </p>
  </div>
</body>
</html>`;
  res.send(html);
});

app.get('/metrics', (req, res) => {
  const token = (req.query.token || '').trim();
  if (!STATUS_SECRET || token !== STATUS_SECRET) {
    return res.status(403).send('Acesso negado.');
  }
  const metrics = getMetrics();
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(toPrometheusFormat(metrics));
});

app.get('/feedback', (req, res) => {
  const token = (req.query.token || '').trim();
  if (!STATUS_SECRET || token !== STATUS_SECRET) {
    return res.status(403).send('Acesso negado.');
  }
  const feedbacks = getFeedbackList();
  const typeLabel = { sugestao: 'Sugestão', melhoria: 'Melhoria', critica: 'Crítica', suporte: 'Suporte' };
  const itemsHtml = feedbacks.map(f => {
    const type = typeLabel[f.type] || f.type || '-';
    const date = f.createdAt ? new Date(f.createdAt).toLocaleString('pt-BR') : '-';
    const email = escapeHtml(f.email || '(sem e-mail)');
    const msg = escapeHtml(f.message || '').replace(/\n/g, '<br>');
    if (f.error) {
      return `<div class="bg-white rounded-xl p-4 shadow-sm border border-[#d2d2d7]/50">
        <p class="text-[#ff3b30] text-sm">${escapeHtml(f.file)} — ${f.error}</p>
      </div>`;
    }
    return `<div class="bg-white rounded-xl p-4 shadow-sm border border-[#d2d2d7]/50">
      <div class="flex justify-between items-start gap-4 mb-2">
        <span class="text-xs font-medium px-2 py-0.5 rounded bg-[#0071e3]/10 text-[#0071e3]">${type}</span>
        <span class="text-[13px] text-[#86868b] shrink-0">${date}</span>
      </div>
      <p class="text-[15px] text-[#1d1d1f] mb-2">${msg}</p>
      <p class="text-[13px] text-[#86868b]">${email}</p>
    </div>`;
  }).join('\n');
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Feedbacks — TimTransfer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
  </style>
</head>
<body class="bg-[#f5f5f7] min-h-screen p-8 text-[#1d1d1f]">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold mb-2">Feedbacks</h1>
    <p class="text-[#86868b] text-sm mb-6">${feedbacks.length} registro(s)</p>
    <div class="space-y-4">
      ${itemsHtml || '<p class="text-[#86868b] text-sm">Nenhum feedback ainda.</p>'}
    </div>
    <p class="mt-6 text-sm text-[#86868b]">
      <a href="/feedback?token=${encodeURIComponent(token)}" class="text-[#0071e3] hover:underline">Atualizar</a>
      &nbsp;·&nbsp;
      <a href="/status?token=${encodeURIComponent(token)}" class="text-[#0071e3] hover:underline">Status</a>
      &nbsp;·&nbsp;
      <a href="/" class="text-[#0071e3] hover:underline">Voltar</a>
    </p>
  </div>
</body>
</html>`;
  res.send(html);
});

app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      increment('upload_errors');
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo individual maior que 100MB.' : (err.message || 'Erro no upload');
      return res.status(400).json({ error: msg });
    }
    const uploadsDirSize = getUploadsDirSize();
    if (uploadsDirSize > MAX_UPLOADS_DISK_BYTES) {
      increment('upload_errors');
      const files = req.files || [];
      for (const file of files) {
        const filePath = path.join(UPLOAD_DIR, file.filename);
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.error(e); }
      }
      return res.status(503).json({
        error: `Servidor cheio. Limite de ${MAX_UPLOADS_DISK_MB}MB atingido. Tente novamente mais tarde.`
      });
    }
    const password = (req.body?.password || '').trim();
    if (!/^\d{4}$/.test(password)) {
      increment('upload_errors');
      const files = req.files || [];
      for (const file of files) {
        const filePath = path.join(UPLOAD_DIR, file.filename);
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.error(e); }
      }
      return res.status(400).json({ error: 'Digite uma senha de 4 números.' });
    }
    const files = req.files || [];
    if (files.length === 0) {
      increment('upload_errors');
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_SESSION_SIZE) {
      increment('upload_errors');
      for (const file of files) {
        const filePath = path.join(UPLOAD_DIR, file.filename);
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.error(e); }
      }
      return res.status(400).json({
        error: `Limite da sessão: 100MB no total. Você enviou ${(totalSize / (1024 * 1024)).toFixed(1)}MB. Remova arquivos ou envie em mais de uma sessão.`
      });
    }

    const bundleId = uuidv4();
    const bundleMeta = { files: [] };

    for (const file of files) {
      const id = path.basename(file.filename, path.extname(file.filename));
      const ext = path.extname(file.originalname) || '';
      const metaPath = path.join(UPLOAD_DIR, `${id}.meta.json`);
      const meta = {
        originalName: file.originalname || 'arquivo',
        size: file.size,
        mimeType: file.mimetype
      };
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      bundleMeta.files.push({ id, originalName: meta.originalName, size: meta.size });
    }
    bundleMeta.passwordHash = hashPassword(password);
    bundleMeta.createdAt = Date.now();

    const bundlePath = path.join(UPLOAD_DIR, `bundle.${bundleId}.json`);
    fs.writeFileSync(bundlePath, JSON.stringify(bundleMeta, null, 2));

    const url = `${req.protocol}://${req.get('host')}/share/${bundleId}`;
    const fileList = bundleMeta.files.map(f => ({ name: f.originalName, size: f.size }));
    increment('uploads_total');
    increment('bytes_uploaded', totalSize);
    res.json({ url, bundleId, files: fileList });
  });
});

app.get('/share/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9-]/g, '');
  const bundlePath = path.join(UPLOAD_DIR, `bundle.${id}.json`);
  if (!fs.existsSync(bundlePath)) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  if (isBundleExpired(bundle)) {
    deleteBundle(id, bundle);
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
  increment('shares_viewed');
  res.sendFile(path.join(__dirname, 'public', 'share.html'), {
    headers: { 'Cache-Control': 'no-store' }
  }, (err) => {
    if (err) res.status(500).send('Erro ao carregar página');
  });
});

app.get('/api/share/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9-]/g, '');
  const bundlePath = path.join(UPLOAD_DIR, `bundle.${id}.json`);
  increment('api_share_requests');
  if (!fs.existsSync(bundlePath)) {
    return res.status(404).json({ error: 'Arquivos não encontrados ou já foram baixados' });
  }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  if (isBundleExpired(bundle)) {
    deleteBundle(id, bundle);
    return res.status(404).json({ error: 'Arquivos não encontrados ou já foram baixados' });
  }
  if (bundle.passwordHash) {
    const totalSize = (bundle.files || []).reduce((s, f) => s + f.size, 0);
    const expiresAt = (bundle.createdAt || 0) + EXPIRY_MS;
    return res.json({ requiresPassword: true, fileCount: bundle.files?.length || 0, totalSize, expiresAt });
  }
  const expiresAt = (bundle.createdAt || 0) + EXPIRY_MS;
  res.json({ files: bundle.files || [], expiresAt });
});

app.post('/api/verify/:id', express.json(), (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9-]/g, '');
  const bundlePath = path.join(UPLOAD_DIR, `bundle.${id}.json`);
  increment('password_verify_attempts');
  if (!fs.existsSync(bundlePath)) {
    return res.status(404).json({ error: 'Arquivos não encontrados ou já foram baixados' });
  }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  if (isBundleExpired(bundle)) {
    deleteBundle(id, bundle);
    return res.status(404).json({ error: 'Arquivos não encontrados ou já foram baixados' });
  }
  const password = (req.body?.password || '').trim();
  if (!verifyPassword(password, bundle.passwordHash)) {
    increment('password_verify_fail');
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  increment('password_verify_success');
  const expiresAt = (bundle.createdAt || 0) + EXPIRY_MS;
  res.json({ files: bundle.files || [], expiresAt });
});

function streamZip(res, bundlePath, bundle, files) {
  const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
  increment('downloads_total');
  increment('bytes_downloaded', totalBytes);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  let baseName = files.length === 1
    ? path.basename(files[0].originalName, path.extname(files[0].originalName))
    : 'arquivos';
  baseName = baseName.replace(/[\/\\:*?"<>|]/g, '-').slice(0, 80) || 'file-download';
  const zipFilename = `timtransfer-${dateStr}-${baseName}.zip`;
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
  res.setHeader('Content-Type', 'application/zip');
  const archive = archiver('zip', { zlib: { level: 1 } });
  archive.on('error', (err) => { console.error('Erro ao criar ZIP:', err); res.status(500).end(); });
  res.on('finish', () => {
    try {
      for (const f of files) {
        const ext = path.extname(f.originalName) || '';
        const filePath = path.join(UPLOAD_DIR, `${f.id}${ext}`);
        const metaPath = path.join(UPLOAD_DIR, `${f.id}.meta.json`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      }
      if (fs.existsSync(bundlePath)) fs.unlinkSync(bundlePath);
    } catch (e) { console.error('Erro ao remover arquivos:', e); }
  });
  archive.pipe(res);
  for (const f of files) {
    const ext = path.extname(f.originalName) || '';
    const filePath = path.join(UPLOAD_DIR, `${f.id}${ext}`);
    if (fs.existsSync(filePath)) archive.file(filePath, { name: f.originalName });
  }
  archive.finalize();
}

app.get('/download/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9-]/g, '');
  const bundlePath = path.join(UPLOAD_DIR, `bundle.${id}.json`);
  if (!fs.existsSync(bundlePath)) {
    increment('download_errors_404');
    return res.status(404).send('Arquivos não encontrados ou já foram baixados.');
  }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  if (isBundleExpired(bundle)) {
    deleteBundle(id, bundle);
    increment('download_errors_404');
    return res.status(404).send('Arquivos não encontrados ou já foram baixados.');
  }
  if (bundle.passwordHash) {
    increment('download_errors_auth');
    return res.status(401).send('Senha necessária. Use a página de compartilhamento.');
  }
  const files = bundle.files || [];
  if (files.length === 0) {
    increment('download_errors_404');
    return res.status(404).send('Nenhum arquivo no pacote.');
  }
  streamZip(res, bundlePath, bundle, files);
});

app.post('/download/:id', express.json(), (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9-]/g, '');
  const bundlePath = path.join(UPLOAD_DIR, `bundle.${id}.json`);
  if (!fs.existsSync(bundlePath)) {
    increment('download_errors_404');
    return res.status(404).json({ error: 'Arquivos não encontrados ou já foram baixados.' });
  }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  if (isBundleExpired(bundle)) {
    deleteBundle(id, bundle);
    increment('download_errors_404');
    return res.status(404).json({ error: 'Arquivos não encontrados ou já foram baixados.' });
  }
  const password = (req.body?.password || '').trim();
  if (!verifyPassword(password, bundle.passwordHash)) {
    increment('download_errors_auth');
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  const files = bundle.files || [];
  if (files.length === 0) {
    increment('download_errors_404');
    return res.status(404).json({ error: 'Nenhum arquivo no pacote.' });
  }
  streamZip(res, bundlePath, bundle, files);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Links expiram após ${EXPIRY_HOURS}h. Use pnpm run cleanup para remover expirados.`);
});
