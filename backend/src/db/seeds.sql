-- ─────────────────────────────────────────
-- DEFAULT CATEGORIES (user_id = NULL → system-wide, visible to all users)
-- ─────────────────────────────────────────

-- ── EXPENSE: top-level ──
INSERT OR IGNORE INTO categories (id, user_id, name, logo, type, parent_id) VALUES
  (1,  NULL, 'Food & Drink',      '🍔', 'expense', NULL),
  (2,  NULL, 'Housing',           '🏠', 'expense', NULL),
  (3,  NULL, 'Transport',         '🚗', 'expense', NULL),
  (4,  NULL, 'Health',            '🏥', 'expense', NULL),
  (5,  NULL, 'Education',         '📚', 'expense', NULL),
  (6,  NULL, 'Shopping',          '🛍️', 'expense', NULL),
  (7,  NULL, 'Entertainment',     '🎬', 'expense', NULL),
  (8,  NULL, 'Personal Care',     '💈', 'expense', NULL),
  (9,  NULL, 'Utilities',         '💡', 'expense', NULL),
  (10, NULL, 'Other Expense',     '📦', 'expense', NULL);

-- ── EXPENSE: children ──
INSERT OR IGNORE INTO categories (id, user_id, name, logo, type, parent_id) VALUES
  -- Food & Drink
  (11, NULL, 'Groceries',         '🛒', 'expense', 1),
  (12, NULL, 'Restaurants',       '🍽️', 'expense', 1),
  (13, NULL, 'Coffee & Cafes',    '☕', 'expense', 1),
  -- Housing
  (14, NULL, 'Rent',              '🏡', 'expense', 2),
  (15, NULL, 'Maintenance',       '🔧', 'expense', 2),
  (16, NULL, 'Furniture',         '🛋️', 'expense', 2),
  -- Transport
  (17, NULL, 'Fuel',              '⛽', 'expense', 3),
  (18, NULL, 'Public Transit',    '🚌', 'expense', 3),
  (19, NULL, 'Taxi & Rideshare',  '🚕', 'expense', 3),
  (20, NULL, 'Car Maintenance',   '🔩', 'expense', 3),
  -- Health
  (21, NULL, 'Doctor',            '👨‍⚕️', 'expense', 4),
  (22, NULL, 'Pharmacy',          '💊', 'expense', 4),
  (23, NULL, 'Gym',               '🏋️', 'expense', 4),
  -- Education
  (24, NULL, 'Tuition',           '🎓', 'expense', 5),
  (25, NULL, 'Books & Supplies',  '📖', 'expense', 5),
  (26, NULL, 'Online Courses',    '💻', 'expense', 5),
  -- Shopping
  (27, NULL, 'Clothing',          '👗', 'expense', 6),
  (28, NULL, 'Electronics',       '📱', 'expense', 6),
  -- Entertainment
  (29, NULL, 'Subscriptions',     '📺', 'expense', 7),
  (30, NULL, 'Games',             '🎮', 'expense', 7),
  (31, NULL, 'Travel',            '✈️', 'expense', 7),
  -- Utilities
  (32, NULL, 'Electricity',       '⚡', 'expense', 9),
  (33, NULL, 'Water',             '💧', 'expense', 9),
  (34, NULL, 'Internet',          '📡', 'expense', 9),
  (35, NULL, 'Mobile Plan',       '📞', 'expense', 9);

-- ── INCOME: top-level ──
INSERT OR IGNORE INTO categories (id, user_id, name, logo, type, parent_id) VALUES
  (50, NULL, 'Salary',            '💼', 'income', NULL),
  (51, NULL, 'Freelance',         '🖥️', 'income', NULL),
  (52, NULL, 'Business',          '🏢', 'income', NULL),
  (53, NULL, 'Investment',        '📈', 'income', NULL),
  (54, NULL, 'Gift',              '🎁', 'income', NULL),
  (55, NULL, 'Other Income',      '💰', 'income', NULL);

-- ── INCOME: children ──
INSERT OR IGNORE INTO categories (id, user_id, name, logo, type, parent_id) VALUES
  (56, NULL, 'Monthly Salary',    '📅', 'income', 50),
  (57, NULL, 'Bonus',             '🎉', 'income', 50),
  (58, NULL, 'Dividends',         '💹', 'income', 53),
  (59, NULL, 'Rental Income',     '🏘️', 'income', 53);
