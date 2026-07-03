const { getDb } = require('../db/database');

// GET /api/summary?month=6&year=2026
// GET /api/summary          → defaults to current month
function getSummary(req, res, next) {
  try {
    const db = getDb();
    const now   = new Date();
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    if (month < 1 || month > 12)
      return res.status(400).json({ error: 'month must be between 1 and 12' });

    const pad      = m => String(m).padStart(2, '0');
    const dateFrom = `${year}-${pad(month)}-01`;
    const dateTo   = `${year}-${pad(month)}-31`; // SQLite clamps to last valid day

    const uid = req.user.id;

    // ── 1. Total income & expenses for the month ──────────────────────────
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM transactions
      WHERE user_id = ? AND date BETWEEN ? AND ?
    `).get(uid, dateFrom, dateTo);

    // ── 2. Spending by category (expenses only) ───────────────────────────
    const byCategory = db.prepare(`
      SELECT
        c.id         AS category_id,
        c.name       AS category_name,
        c.logo       AS category_logo,
        COALESCE(p.name, c.name) AS parent_name,
        SUM(t.amount) AS total
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories p ON p.id = c.parent_id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.date BETWEEN ? AND ?
      GROUP BY c.id
      ORDER BY total DESC
    `).all(uid, dateFrom, dateTo);

    // ── 3. Income by category ─────────────────────────────────────────────
    const byIncomeCategory = db.prepare(`
      SELECT
        c.id          AS category_id,
        c.name        AS category_name,
        c.logo        AS category_logo,
        SUM(t.amount) AS total
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ? AND t.type = 'income' AND t.date BETWEEN ? AND ?
      GROUP BY c.id
      ORDER BY total DESC
    `).all(uid, dateFrom, dateTo);

    // ── 4. Daily cash flow (income - expense per day) ─────────────────────
    const dailyFlow = db.prepare(`
      SELECT
        date,
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC
    `).all(uid, dateFrom, dateTo);

    // ── 5. All account balances (total net worth snapshot) ───────────────
    const accounts = db.prepare('SELECT id, name, type, currency FROM accounts WHERE user_id = ?').all(uid);
    const accountBalances = accounts.map(a => {
      const txn = db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0) AS income,
          COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
        FROM transactions WHERE account_id = ?
      `).get(a.id);
      const tr = db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN destination_account_id=? THEN amount ELSE 0 END),0) AS incoming,
          COALESCE(SUM(CASE WHEN source_account_id=?      THEN amount ELSE 0 END),0) AS outgoing
        FROM transfers WHERE source_account_id=? OR destination_account_id=?
      `).get(a.id, a.id, a.id, a.id);
      return { ...a, balance: (txn.income - txn.expense) + (tr.incoming - tr.outgoing) };
    });

    // ── 6. Recent 5 transactions ──────────────────────────────────────────
    const recentTransactions = db.prepare(`
      SELECT t.*, c.name AS category_name, c.logo AS category_logo, a.name AS account_name
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts   a ON a.id = t.account_id
      WHERE t.user_id = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 5
    `).all(uid);

    res.json({
      period: { year, month, date_from: dateFrom, date_to: dateTo },
      totals: {
        income:  totals.total_income,
        expense: totals.total_expense,
        net:     totals.total_income - totals.total_expense,
      },
      by_expense_category:  byCategory,
      by_income_category:   byIncomeCategory,
      daily_flow:           dailyFlow,
      account_balances:     accountBalances,
      recent_transactions:  recentTransactions,
    });
  } catch (err) { next(err); }
}

module.exports = { getSummary };
