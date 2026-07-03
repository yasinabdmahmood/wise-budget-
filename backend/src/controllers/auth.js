const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getDb } = require('../db/database');

const SALT_ROUNDS = 10;
const TOKEN_TTL   = '7d';

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password)
      return res.status(400).json({ error: 'email, username and password are required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing)
      return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db.prepare(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)'
    ).run(email.toLowerCase().trim(), username.trim(), hash);

    const user = { id: Number(result.lastInsertRowid), email: email.toLowerCase().trim(), username: username.trim() };
    res.status(201).json({ user, token: makeToken(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const db   = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password' });

    const safe = { id: user.id, email: user.email, username: user.username };
    res.json({ user: safe, token: makeToken(safe) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (requires auth middleware)
function me(req, res) {
  const db   = getDb();
  const user = db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}

// PUT /api/auth/me  (change username or password)
async function updateMe(req, res, next) {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const db   = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (username && username.trim()) {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), user.id);
    }

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ error: 'currentPassword is required to set a new password' });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match)
        return res.status(401).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 6)
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
    }

    const updated = db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?').get(user.id);
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, updateMe };
