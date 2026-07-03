const { getDb } = require('../db/database');
const { getBalance } = require('./accounts');

const VALID_TYPES = ['income', 'expense'];
const ISO_DATE    = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/transactions
// Query filters: type, account_id, category_id, date_from, date_to, limit, offset
function list(req, res, next) {
  try {
    const db = getDb();
    const { type, account_id, category_id, date_from, date_to } = req.query;
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    let sql = `
      SELECT
        t.*,
        c.name  AS category_name,
        c.logo  AS category_logo,
        a.name  AS account_name,
        a.currency AS currency
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts   a ON a.id = t.account_id
      WHERE t.user_id = ?
    `;
    const params = [req.user.id];

    if (type && VALID_TYPES.includes(type))       { sql += ' AND t.type = ?';        params.push(type); }
    if (account_id)                                { sql += ' AND t.account_id = ?';  params.push(account_id); }
    if (category_id)                               { sql += ' AND t.category_id = ?'; params.push(category_id); }
    if (date_from && ISO_DATE.test(date_from))     { sql += ' AND t.date >= ?';       params.push(date_from); }
    if (date_to   && ISO_DATE.test(date_to))       { sql += ' AND t.date <= ?';       params.push(date_to); }

    sql += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = db.prepare(sql).all(...params);

    // Total count for pagination
    let countSql = 'SELECT COUNT(*) AS n FROM transactions t WHERE t.user_id = ?';
    const countParams = [req.user.id];
    if (type && VALID_TYPES.includes(type))       { countSql += ' AND t.type = ?';        countParams.push(type); }
    if (account_id)                                { countSql += ' AND t.account_id = ?';  countParams.push(account_id); }
    if (category_id)                               { countSql += ' AND t.category_id = ?'; countParams.push(category_id); }
    if (date_from && ISO_DATE.test(date_from))     { countSql += ' AND t.date >= ?';       countParams.push(date_from); }
    if (date_to   && ISO_DATE.test(date_to))       { countSql += ' AND t.date <= ?';       countParams.push(date_to); }

    const { n: total } = db.prepare(countSql).get(...countParams);

    res.json({ transactions, total, limit, offset });
  } catch (err) { next(err); }
}

// GET /api/transactions/:id
function getOne(req, res, next) {
  try {
    const db = getDb();
    const transaction = db.prepare(`
      SELECT t.*, c.name AS category_name, c.logo AS category_logo,
             a.name AS account_name, a.currency AS currency
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts   a ON a.id = t.account_id
      WHERE t.id = ? AND t.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ transaction });
  } catch (err) { next(err); }
}

// POST /api/transactions
function create(req, res, next) {
  try {
    const { account_id, category_id, type, amount, note, date } = req.body;

    if (!account_id || !type || !amount || !date)
      return res.status(400).json({ error: 'account_id, type, amount and date are required' });
    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: 'type must be income or expense' });
    if (typeof amount !== 'number' || amount <= 0)
      return res.status(400).json({ error: 'amount must be a positive number' });
    if (!ISO_DATE.test(date))
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });

    const db = getDb();

    // Verify account belongs to user
    const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
      .get(account_id, req.user.id);
    if (!account) return res.status(400).json({ error: 'Account not found' });

    // Verify category exists and is accessible (if provided)
    if (category_id) {
      const cat = db.prepare('SELECT id, type FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)')
        .get(category_id, req.user.id);
      if (!cat) return res.status(400).json({ error: 'Category not found' });
      if (cat.type !== type) return res.status(400).json({ error: 'Category type must match transaction type' });
    }

    // Reject expense if it would make the account go negative
    if (type === 'expense') {
      const currentBalance = getBalance(db, account_id);
      if (currentBalance - amount < 0)
        return res.status(422).json({
          error: `Insufficient balance. Account balance is ${currentBalance.toFixed(2)}, expense amount is ${amount.toFixed(2)}.`
        });
    }

    const result = db.prepare(`
      INSERT INTO transactions (user_id, account_id, category_id, type, amount, note, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, account_id, category_id || null, type, amount, note || null, date);

    const transaction = db.prepare(`
      SELECT t.*, c.name AS category_name, c.logo AS category_logo,
             a.name AS account_name, a.currency AS currency
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts   a ON a.id = t.account_id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ transaction });
  } catch (err) { next(err); }
}

// PUT /api/transactions/:id
function update(req, res, next) {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    const account_id  = req.body.account_id  !== undefined ? req.body.account_id  : existing.account_id;
    const category_id = req.body.category_id !== undefined ? req.body.category_id : existing.category_id;
    const type        = req.body.type        !== undefined ? req.body.type        : existing.type;
    const amount      = req.body.amount      !== undefined ? req.body.amount      : existing.amount;
    const note        = req.body.note        !== undefined ? req.body.note        : existing.note;
    const date        = req.body.date        !== undefined ? req.body.date        : existing.date;

    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: 'type must be income or expense' });
    if (typeof amount !== 'number' || amount <= 0)
      return res.status(400).json({ error: 'amount must be a positive number' });
    if (!ISO_DATE.test(date))
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });

    // Verify account ownership if changed
    if (account_id !== existing.account_id) {
      const acc = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(account_id, req.user.id);
      if (!acc) return res.status(400).json({ error: 'Account not found' });
    }

    // Reject if update would make account go negative.
    // Simulate: remove old transaction effect, apply new one.
    if (type === 'expense') {
      const currentBalance = getBalance(db, account_id);
      // If old transaction was an expense on same account, add it back before checking
      const oldCredit = (existing.type === 'expense' && existing.account_id === account_id) ? existing.amount : 0;
      const oldDebit  = (existing.type === 'income'  && existing.account_id === account_id) ? existing.amount : 0;
      const simulated = currentBalance + oldCredit - oldDebit - amount;
      if (simulated < 0)
        return res.status(422).json({
          error: `Insufficient balance. Effective balance would be ${simulated.toFixed(2)}.`
        });
    }

    db.prepare(`
      UPDATE transactions
      SET account_id = ?, category_id = ?, type = ?, amount = ?, note = ?, date = ?
      WHERE id = ?
    `).run(account_id, category_id || null, type, amount, note || null, date, existing.id);

    const transaction = db.prepare(`
      SELECT t.*, c.name AS category_name, c.logo AS category_logo,
             a.name AS account_name, a.currency AS currency
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts   a ON a.id = t.account_id
      WHERE t.id = ?
    `).get(existing.id);

    res.json({ transaction });
  } catch (err) { next(err); }
}

// DELETE /api/transactions/:id
function remove(req, res, next) {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    db.prepare('DELETE FROM transactions WHERE id = ?').run(existing.id);
    res.json({ message: 'Transaction deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
