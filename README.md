# TimTransfer

Simple, free, and secure file transfer. No account required.

**Site:** [timtransfer.com](https://timtransfer.com)

## Features

- **Free** — No limits, no registration
- **Simple** — 4-digit PIN, one shared link
- **Secure** — Files expire; password required for upload and download

## How it works

1. Create a 4-digit PIN
2. Upload up to 100MB total per session (multiple files allowed)
3. Share a single link with the recipient
4. Recipient enters the same PIN to download
5. Files are deleted after download or when they expire

## Tech stack

- **Node.js** + Express
- **Multer** for uploads
- **Archiver** for ZIP bundling
- **UUID** for share IDs
- **Tailwind CSS** (CDN) for UI

## Project structure

```
timtransfer/
├── lib/              # Shared utilities (expiry, etc.)
├── public/           # Static assets
│   ├── images/       # Logo, QR code PIX
│   ├── js/           # feedback.js, share.js
│   └── *.html        # Pages (index, app, share, 404)
├── scripts/          # Cleanup script
├── server.js         # Entry point
├── docker-compose.yml
├── Dockerfile
└── .env.example      # Copy to .env and configure
```

## Run locally

```bash
git clone https://github.com/renatoruis/timtransfer.git
cd timtransfer
cp .env.example .env   # Edit with your values
npm install
npm start
```

App runs on `http://localhost:9090` by default.

### Environment variables

| Variable              | Default | Description                              |
|-----------------------|---------|------------------------------------------|
| `PORT`                | 9090    | Server port                              |
| `EXPIRY_HOURS`        | 24      | Hours until files expire                 |
| `MAX_UPLOADS_DISK_MB` | 1024    | Max disk for uploads (MB). Ex: 1024=1GB  |
| `RECAPTCHA_SITE_KEY`  | —       | reCAPTCHA v3 site key (feedback)        |
| `RECAPTCHA_SECRET_KEY`| —       | reCAPTCHA v3 secret key (backend)       |
| `STATUS_SECRET`       | —       | Token para acessar /status (técnicos)   |

## Docker

```bash
docker build -t timtransfer .
docker run -p 9090:9090 -e EXPIRY_HOURS=24 timtransfer
```

Pre-built image (GitHub Container Registry):

```bash
docker pull ghcr.io/renatoruis/timtransfer:main
docker run -p 9090:9090 ghcr.io/renatoruis/timtransfer:main
```

## Routes

| Path             | Description              |
|------------------|--------------------------|
| `/`              | Landing page             |
| `/app`           | Upload page              |
| `/share/:id`     | Download page (share)     |
| `/upload`        | POST endpoint for uploads |
| `/api/share/:id` | Share metadata (JSON)     |
| `/api/verify/:id`| Verify PIN (JSON)        |
| `/download/:id`  | ZIP download             |
| `/status?token=` | Status (técnicos)        |

## License

MIT
