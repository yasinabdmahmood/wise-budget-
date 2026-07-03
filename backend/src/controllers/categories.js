const { getDb } = require('../db/database');

const VALID_TYPES = ['income', 'expense'];

// Build a nested tree from a flat list
function buildTree(flat) {
  const map = {};
  flat.forEach(c => { map[c.id] = { ...c, children: [] }; });
  const roots = [];
  flat.forEach(c => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  return roots;
}

// GET /api/categories?type=expense|income&flat=true
// Returns system defaults + user's own categories
// ?flat=true  → flat array (used by transaction form dropdowns)
// default     → nested tree grouped by parent
function list(req, res, next) {
  try {
    const db = getDb();
    const { type, flat } = req.query;

    let sql = `
      SELECT * FROM categories
      WHERE (user_id IS NULL OR user_id = ?)
    `;
    const params = [req.user.id];

    if (type && VALID_TYPES.includes(type)) {
      sql += ' AND type = ?';
      params.push(type);
    }
    sql += ' ORDER BY parent_id ASC, id ASC';

    const rows = db.prepare(sql).all(...params);

    if (flat === 'true') {
      return res.json({ categories: rows });
    }
    res.json({ categories: buildTree(rows) });
  } catch (err) { next(err); }
}

// GET /api/categories/:id
function getOne(req, res, next) {
  try {
    const db = getDb();
    const category = db.prepare(`
      SELECT * FROM categories
      WHERE id = ? AND (user_id IS NULL OR user_id = ?)
    `).get(req.params.id, req.user.id);

    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ category });
  } catch (err) { next(err); }
}

// POST /api/categories
function create(req, res, next) {
  try {
    const { name, logo, type, parent_id } = req.body;

    if (!name || !type)
      return res.status(400).json({ error: 'name and type are required' });
    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: 'type must be income or expense' });

    const db = getDb();

    // Validate parent exists and belongs to same type
    if (parent_id) {
      const parent = db.prepare(`
        SELECT * FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)
      `).get(parent_id, req.user.id);
      if (!parent) return res.status(400).json({ error: 'Parent category not found' });
      if (parent.type !== type)
        return res.status(400).json({ error: 'Child category type must match parent type' });
    }

    const result = db.prepare(
      'INSERT INTO categories (user_id, name, logo, type, parent_id) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, name.trim(), logo || '📦', type, parent_id || null);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ category });
  } catch (err) { next(err); }
}

// PUT /api/categories/:id  (only user-owned categories, not system defaults)
function update(req, res, next) {
  try {
    const db = getDb();
    const category = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!category) return res.status(404).json({ error: 'Category not found or cannot edit system category' });

    const name      = req.body.name      !== undefined ? req.body.name.trim() : category.name;
    const logo      = req.body.logo      !== undefined ? req.body.logo        : category.logo;
    const parent_id = req.body.parent_id !== undefined ? req.body.parent_id   : category.parent_id;

    db.prepare(
      'UPDATE categories SET name = ?, logo = ?, parent_id = ? WHERE id = ?'
    ).run(name, logo, parent_id || null, category.id);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(category.id);
    res.json({ category: updated });
  } catch (err) { next(err); }
}

// DELETE /api/categories/:id  (only user-owned)
function remove(req, res, next) {
  try {
    const db = getDb();
    const category = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!category) return res.status(404).json({ error: 'Category not found or cannot delete system category' });

    // Reassign children to this category's parent (or null) before deleting
    db.prepare(
      'UPDATE categories SET parent_id = ? WHERE parent_id = ?'
    ).run(category.parent_id || null, category.id);

    db.prepare('DELETE FROM categories WHERE id = ?').run(category.id);
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
