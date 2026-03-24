# KOM Memorial 🏆

> Honour every segment you ever ruled. Log your KOM achievements, and when someone steals your crown, give it the funeral it deserves.

A self-hosted web app for cyclists. No Strava API. No OAuth. No data leaves your server.

---

## Features

- **User accounts** — email/password registration, private dashboards
- **Log active KOMs** — segment name, date achieved, optional Strava link & notes
- **Memorialize lost KOMs** — date lost, new holder, auto-generated (editable) obituary
- **Days held counter** — exact days calculated for every active and memorialized KOM
- **Shareable 1080×1080 PNG** — memorial image ready for Instagram or your group chat
- **Zero Strava API** — fully compliant, all data is user-entered

---

## Quick Start

### 1. Clone / Download the project

```bash
cd "KOM Memorial"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=replace-with-a-long-random-string
DB_PATH=./data/kom_memorial.json
APP_NAME=KOM Memorial
```

Generate a strong session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run the app

```bash
npm start
# or for auto-reload during development:
npm run dev
```

Visit **http://localhost:3000**

---

## Project Structure

```
KOM Memorial/
├── server.js              # Express app entry point
├── .env.example           # Environment variable template
├── db/
│   └── database.js        # lowdb JSON database helpers
├── middleware/
│   └── auth.js            # requireAuth / redirectIfAuth
├── routes/
│   ├── auth.js            # Register, login, logout
│   ├── dashboard.js       # Main dashboard
│   └── koms.js            # Add, memorialize, view, delete KOMs
├── utils/
│   ├── obituary.js        # 5 funny obituary templates
│   └── imageGen.js        # 1080×1080 PNG generation via @napi-rs/canvas
├── views/
│   ├── partials/          # header.ejs, footer.ejs
│   ├── index.ejs          # Landing page
│   ├── login.ejs
│   ├── register.ejs
│   ├── dashboard.ejs
│   ├── add-kom.ejs
│   ├── memorialize.ejs
│   └── memorial.ejs
├── public/
│   ├── css/style.css      # Dark cycling theme
│   ├── js/main.js
│   └── images/generated/  # Auto-created; stores memorial PNGs
└── data/                  # Auto-created; stores DB + sessions
    ├── kom_memorial.json
    └── sessions/
```

---

## Data Storage

- **Database**: `data/kom_memorial.json` — a plain JSON file managed by [lowdb](https://github.com/typicode/lowdb)
- **Sessions**: `data/sessions/` — JSON files via [session-file-store](https://github.com/valery-barysok/session-file-store)
- **Images**: `public/images/generated/` — PNG files served statically

All data is local to your machine. Back up the `data/` folder to preserve your KOM history.

---

## Deployment (Production)

### On any Linux VPS (e.g. DigitalOcean, Hetzner)

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone your project
git clone <your-repo> /var/www/kom-memorial
cd /var/www/kom-memorial
npm install --omit=dev

# Set production environment
cp .env.example .env
# Edit .env: set NODE_ENV=production, strong SESSION_SECRET, PORT=3000

# Run with PM2
npm install -g pm2
pm2 start server.js --name kom-memorial
pm2 save
pm2 startup
```

### Nginx reverse proxy (optional)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /images/generated/ {
        alias /var/www/kom-memorial/public/images/generated/;
        expires 7d;
    }
}
```

Add SSL with: `sudo certbot --nginx -d yourdomain.com`

---

## Environment Variables

| Variable         | Default                   | Description                        |
|------------------|---------------------------|------------------------------------|
| `PORT`           | `3000`                    | HTTP port                          |
| `NODE_ENV`       | `development`             | `production` enables secure cookies|
| `SESSION_SECRET` | *(insecure default)*      | Long random string — **change it** |
| `DB_PATH`        | `./data/kom_memorial.json`| Path to JSON database file         |
| `APP_NAME`       | `KOM Memorial`            | Branding shown in nav + images     |

---

## Strava API Compliance

This app **does not use the Strava API**. It never makes requests to Strava endpoints. All data (segment names, dates, notes) is entered manually by the user. The optional "Strava segment link" field is just a plain URL — it is never fetched or processed by the server.

---

## Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Server     | Node.js + Express           |
| Views      | EJS templates               |
| Database   | lowdb (JSON file)           |
| Sessions   | express-session + file store|
| Auth       | bcryptjs (password hashing) |
| Images     | @napi-rs/canvas (PNG gen)   |
| Styles     | Custom CSS (dark theme)     |
