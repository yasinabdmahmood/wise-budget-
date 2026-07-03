# Wise Budget

A lightweight, mobile-first personal finance app — Angular frontend + Node.js/Express backend + SQLite database. Zero native dependencies.

---

## Requirements

- **Node.js 22+** (uses the built-in `node:sqlite` module)
- npm

---

## Development

### 1. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example backend/.env
# Edit backend/.env — set JWT_SECRET to a long random string
```

### 3. Run dev servers (two terminals)

```bash
# Terminal 1 — API on :3000
cd backend && npm run dev

# Terminal 2 — Angular on :4200 (proxies /api to :3000 automatically)
cd frontend && npm start
```

Open **http://localhost:4200**

---

## Production Build

### 1. Build the Angular app

```bash
cd frontend && npm run build:prod
# Output → frontend/dist/wise-budget/browser/
```

### 2. Start the single Node process

```bash
# From project root
NODE_ENV=production node --experimental-sqlite backend/src/app.js
```

The Express server serves both the API (`/api/*`) and the Angular SPA on **http://localhost:3000**.

### Quick start (from root `package.json`)

```bash
npm run build    # builds Angular
npm start        # starts Express in production mode
```

---

## Environment variables (`backend/.env`)

| Variable     | Default                   | Description                        |
|--------------|---------------------------|------------------------------------|
| `PORT`       | `3000`                    | HTTP port                          |
| `NODE_ENV`   | `development`             | `production` enables SPA serving   |
| `JWT_SECRET` | *(must set)*              | Secret for signing JWT tokens      |
| `DB_PATH`    | `./wise_budget.db`        | Path to SQLite database file       |

---

## Project structure

```
wise-budget/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express entry point
│   │   ├── db/
│   │   │   ├── database.js     # DB connection (node:sqlite)
│   │   │   ├── schema.sql      # Table definitions
│   │   │   └── seeds.sql       # Default categories
│   │   ├── middleware/auth.js  # JWT guard
│   │   ├── controllers/        # auth, accounts, categories,
│   │   │                       # transactions, transfers, summary
│   │   └── routes/             # Express routers
│   └── package.json
├── frontend/
│   └── src/app/
│       ├── core/               # models, services, guards, interceptors
│       ├── shell/              # header + bottom nav
│       └── features/           # dashboard, transactions, accounts,
│                               # categories, settings, auth
└── README.md
```

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT |
| GET/PUT | `/api/auth/me` | Profile |
| GET/POST/PUT/DELETE | `/api/accounts/:id` | Accounts |
| GET/POST/PUT/DELETE | `/api/categories/:id` | Categories |
| GET/POST/PUT/DELETE | `/api/transactions/:id` | Transactions |
| GET/POST/PUT/DELETE | `/api/transfers/:id` | Transfers |
| GET | `/api/summary` | Dashboard summary |
| GET | `/api/health` | Health check |
