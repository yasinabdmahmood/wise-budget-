const { getDb } = require('../db/database');
const { getBalance } = require('./accounts');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Helper: enrich transfer with account names
function withNames(db, transfer) {
  const src  = db.prepare('SELECT name, currency FROM accounts WHERE id = ?').get(transfer.source_account_id);
  const dest = db.prepare('SELECT name, currency FROM accounts WHERE id = ?').get(transfer.destination_account_id);
  return {
    ...transfer,
    source_account_name:      src  ? src.name  : null,
    source_currency:          src  ? src.currency : null,
    destination_account_name: dest ? dest.name : null,
    destination_currency:     dest ? dest.currency : null,
  };
}

// GET /api/transfers?account_id=&date_from=&date_to=&limit=&offset=
function list(req, res, next) {
  try {
    const db = getDb();
    const { account_id, date_from, date_to } = req.query;
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    let sql = 'SELECT * FROM transfers WHERE user_id = ?';
    const params = [req.user.id];

    if (account_id) {
      sql += ' AND (source_account_id = ? OR destination_account_id = ?)';
      params.push(account_id, account_id);
    }
    if (date_from && ISO_DATE.test(date_from)) { sql += ' AND date >= ?'; params.push(date_from); }
    if (date_to   && ISO_DATE.test(date_to))   { sql += ' AND date <= ?'; params.push(date_to); }

    sql += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params);

    // Count
    let countSql = 'SELECT COUNT(*) AS n FROM transfers WHERE user_id = ?';
    const countParams = [req.user.id];
    if (account_id) { countSql += ' AND (source_account_id = ? OR destination_account_id = ?)'; countParams.push(account_id, account_id); }
    if (date_from && ISO_DATE.test(date_from)) { countSql += ' AND date >= ?'; countParams.push(date_from); }
    if (date_to   && ISO_DATE.test(date_to))   { countSql += ' AND date <= ?'; countParams.push(date_to); }
    const { n: total } = db.prepare(countSql).get(...countParams);

    res.json({ transfers: rows.map(r => withNames(db, r)), total, limit, offset });
  } catch (err) { next(err); }
}

// GET /api/transfers/:id
function getOne(req, res, next) {
  try {
    const db = getDb();
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    res.json({ transfer: withNames(db, transfer) });
  } catch (err) { next(err); }
}

// POST /api/transfers
function create(req, res, next) {
  try {
    const { source_account_id, destination_account_id, amount, note, date } = req.body;

    if (!source_account_id || !destination_account_id || !amount || !date)
      return res.status(400).json({ error: 'source_account_id, destination_account_id, amount and date are required' });
    if (typeof amount !== 'number' || amount <= 0)
      return res.status(400).json({ error: 'amount must be a positive number' });
    if (!ISO_DATE.test(date))
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    if (Number(source_account_id) === Number(destination_account_id))
      return res.status(400).json({ error: 'source and destination accounts must be different' });

    const db = getDb();

    // Both accounts must belong to user
    const src  = db.prepare('SELECT id, name FROM accounts WHERE id = ? AND user_id = ?').get(source_account_id, req.user.id);
    const dest = db.prepare('SELECT id, name FROM accounts WHERE id = ? AND user_id = ?').get(destination_account_id, req.user.id);
    if (!src)  return res.status(400).json({ error: 'Source account not found' });
    if (!dest) return res.status(400).json({ error: 'Destination account not found' });

    // Reject if source account would go negative
    const srcBalance = getBalance(db, source_account_id);
    if (srcBalance - amount < 0)
      return res.status(422).json({
        error: `Insufficient balance in source account. Balance is ${srcBalance.toFixed(2)}, transfer amount is ${amount.toFixed(2)}.`
      });

    const result = db.prepare(`
      INSERT INTO transfers (user_id, source_account_id, destination_account_id, amount, note, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, source_account_id, destination_account_id, amount, note || null, date);

    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ transfer: withNames(db, transfer) });
  } catch (err) { next(err); }
}

// PUT /api/transfers/:id  (only note and date are editable; amounts changing accounts is too risky)
function update(req, res, next) {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM transfers WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Transfer not found' });

    const amount = req.body.amount !== undefined ? req.body.amount : existing.amount;
    const note   = req.body.note   !== undefined ? req.body.note   : existing.note;
    const date   = req.body.date   !== undefined ? req.body.date   : existing.date;

    if (typeof amount !== 'number' || amount <= 0)
      return res.status(400).json({ error: 'amount must be a positive number' });
    if (!ISO_DATE.test(date))
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });

    db.prepare('UPDATE transfers SET amount = ?, note = ?, date = ? WHERE id = ?')
      .run(amount, note || null, date, existing.id);

    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(existing.id);
    res.json({ transfer: withNames(db, transfer) });
  } catch (err) { next(err); }
}

// DELETE /api/transfers/:id
function remove(req, res, next) {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM transfers WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Transfer not found' });

    db.prepare('DELETE FROM transfers WHERE id = ?').run(existing.id);
    res.json({ message: 'Transfer deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
