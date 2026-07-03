PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  username   TEXT    NOT NULL,
  password   TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─────────────────────────────────────────
-- ACCOUNTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  type       TEXT    NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'cash')),
  currency   TEXT    NOT NULL DEFAULT 'USD',
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- ─────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system default
  name      TEXT    NOT NULL,
  logo      TEXT    NOT NULL DEFAULT '📦',
  type      TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_user   ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ─────────────────────────────────────────
-- TRANSACTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  account_id  INTEGER NOT NULL REFERENCES accounts(id)  ON DELETE CASCADE,
  category_id INTEGER          REFERENCES categories(id) ON DELETE SET NULL,
  type        TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
  amount      REAL    NOT NULL CHECK (amount > 0),
  note        TEXT,
  date        TEXT    NOT NULL,  -- ISO 8601: YYYY-MM-DD
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account  ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);

-- ─────────────────────────────────────────
-- TRANSFERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfers (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  source_account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  destination_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount                REAL    NOT NULL CHECK (amount > 0),
  note                  TEXT,
  date                  TEXT    NOT NULL,  -- ISO 8601: YYYY-MM-DD
  created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK (source_account_id != destination_account_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_user   ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_source ON transfers(source_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_dest   ON transfers(destination_account_id);
