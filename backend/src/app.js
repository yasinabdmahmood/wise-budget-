require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { getDb } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Security & parsing ────────────────────────────
app.use(helmet({
  contentSecurityPolicy: isProd ? undefined : false   // relax CSP in dev
}));
if (!isProd) app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────
getDb();

// ── API routes ────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/accounts',     require('./routes/accounts'));
app.use('/api/categories',   require('./routes/categories'));
app.use('/api/transactions',  require('./routes/transactions'));
app.use('/api/transfers',    require('./routes/transfers'));
app.use('/api/summary',      require('./routes/summary'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ── Serve Angular SPA in production ───────────────
const distPath = path.join(__dirname, '../../frontend/dist/wise-budget/browser');
if (isProd && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // All non-API routes → index.html (Angular router handles them)
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else if (isProd) {
  console.warn('⚠️  No Angular build found at', distPath, '— run: npm run build in /frontend');
}

// ── Error handlers ────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Wise Budget running on http://localhost:${PORT}  [${isProd ? 'production' : 'development'}]`);
});

module.exports = app;
