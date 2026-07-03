const { getDb } = require('../db/database');

const VALID_TYPES = ['checking', 'savings', 'credit', 'cash'];

// Compute live balance for one account:
//   balance = sum(income transactions) - sum(expense transactions)
//           + sum(incoming transfers)  - sum(outgoing transfers)
function getBalance(db, accountId) {
  const txn = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
    FROM transactions WHERE account_id = ?
  `).get(accountId);

  const tr = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN destination_account_id = ? THEN amount ELSE 0 END), 0) AS incoming,
      COALESCE(SUM(CASE WHEN source_account_id      = ? THEN amount ELSE 0 END), 0) AS outgoing
    FROM transfers WHERE source_account_id = ? OR destination_account_id = ?
  `).get(accountId, accountId, accountId, accountId);

  return (txn.income - txn.expense) + (tr.incoming - tr.outgoing);
}

// GET /api/accounts
function list(req, res, next) {
  try {
    const db = getDb();
    const accounts = db.prepare(
      'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC'
    ).all(req.user.id);

    const result = accounts.map(a => ({ ...a, balance: getBalance(db, a.id) }));
    res.json({ accounts: result });
  } catch (err) { next(err); }
}

// GET /api/accounts/:id
function getOne(req, res, next) {
  try {
    const db = getDb();
    const account = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ account: { ...account, balance: getBalance(db, account.id) } });
  } catch (err) { next(err); }
}

// POST /api/accounts
function create(req, res, next) {
  try {
    const { name, type, currency } = req.body;

    if (!name || !type)
      return res.status(400).json({ error: 'name and type are required' });
    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: 'type must be one of: ' + VALID_TYPES.join(', ') });

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO accounts (user_id, name, type, currency) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, name.trim(), type, (currency || 'USD').toUpperCase().trim());

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ account: { ...account, balance: 0 } });
  } catch (err) { next(err); }
}

// PUT /api/accounts/:id
function update(req, res, next) {
  try {
    const db = getDb();
    const account = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!account) return res.status(404).json({ error: 'Account not found' });

    const name     = req.body.name     !== undefined ? req.body.name.trim()               : account.name;
    const type     = req.body.type     !== undefined ? req.body.type                       : account.type;
    const currency = req.body.currency !== undefined ? req.body.currency.toUpperCase().trim() : account.currency;

    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: 'type must be one of: ' + VALID_TYPES.join(', ') });

    db.prepare(
      'UPDATE accounts SET name = ?, type = ?, currency = ? WHERE id = ?'
    ).run(name, type, currency, account.id);

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id);
    res.json({ account: { ...updated, balance: getBalance(db, account.id) } });
  } catch (err) { next(err); }
}

// DELETE /api/accounts/:id
function remove(req, res, next) {
  try {
    const db = getDb();
    const account = db.prepare(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!account) return res.status(404).json({ error: 'Account not found' });

    db.prepare('DELETE FROM accounts WHERE id = ?').run(account.id);
    res.json({ message: 'Account deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove, getBalance };
