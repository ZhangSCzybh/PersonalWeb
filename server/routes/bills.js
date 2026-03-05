const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
  const router = express.Router();
  const SECRET_KEY = 'personalweb_secret_key_2024';

  const getUserId = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      return decoded.id;
    } catch {
      return null;
    }
  };

  router.get('/categories', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type } = req.query;
    let query = 'SELECT * FROM bill_categories WHERE userId = ?';
    const params = [userId];
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    query += ' ORDER BY sortOrder ASC';
    const categories = db.prepare(query).all(...params);
    res.json(categories);
  });

  router.post('/categories', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, icon, color } = req.body;
    const maxOrder = db.prepare('SELECT MAX(sortOrder) as max FROM bill_categories WHERE userId = ? AND type = ?').get(userId, type);
    const sortOrder = (maxOrder?.max || 0) + 1;
    const result = db.prepare('INSERT INTO bill_categories (userId, name, type, icon, color, sortOrder) VALUES (?, ?, ?, ?, ?, ?)').run(userId, name, type, icon || 'fa-tag', color || '#999999', sortOrder);
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/categories/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, icon, color, sortOrder } = req.body;
    db.prepare('UPDATE bill_categories SET name = ?, icon = ?, color = ?, sortOrder = ? WHERE id = ? AND userId = ?').run(name, icon, color, sortOrder, req.params.id, userId);
    res.json({ success: true });
  });

  router.delete('/categories/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM bill_categories WHERE id = ? AND userId = ? AND isDefault = 0').run(req.params.id, userId);
    res.json({ success: true });
  });

  router.get('/', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, categoryId, year, month, page = 1, limit = 10 } = req.query;
    let query = 'SELECT b.*, bc.name as categoryName, bc.icon as categoryIcon, bc.color as categoryColor FROM bills b LEFT JOIN bill_categories bc ON b.categoryId = bc.id WHERE b.userId = ?';
    const params = [userId];
    const conditions = [];

    if (type) {
      conditions.push('b.type = ?');
      params.push(type);
    }
    if (categoryId) {
      conditions.push('b.categoryId = ?');
      params.push(categoryId);
    }
    if (year) {
      conditions.push("strftime('%Y', b.date) = ?");
      params.push(year);
    }
    if (month) {
      conditions.push("strftime('%m', b.date) = ?");
      params.push(month);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    query += ' ORDER BY b.date DESC, b.createdAt DESC';

    const offset = (page - 1) * limit;
    query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const bills = db.prepare(query).all(...params);
    
    let countConditions = conditions.map(c => c.replace(/b\./g, ''));
    const countQuery = 'SELECT COUNT(*) as total FROM bills WHERE userId = ?' + (countConditions.length > 0 ? ' AND ' + countConditions.join(' AND ') : '');
    const total = db.prepare(countQuery).get(userId, ...params.slice(1));

    res.json({ bills, total: total.total, page: parseInt(page), totalPages: Math.ceil(total.total / limit) });
  });

  router.post('/', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, amount, categoryId, date, description, paymentMethod, notes } = req.body;
    const result = db.prepare('INSERT INTO bills (userId, type, amount, categoryId, date, description, paymentMethod, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(userId, type, amount, categoryId, date, description, paymentMethod, notes);
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, amount, categoryId, date, description, paymentMethod, notes } = req.body;
    db.prepare('UPDATE bills SET type = ?, amount = ?, categoryId = ?, date = ?, description = ?, paymentMethod = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?').run(type, amount, categoryId, date, description, paymentMethod, notes, req.params.id, userId);
    res.json({ success: true });
  });

  router.delete('/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM bills WHERE id = ? AND userId = ?').run(req.params.id, userId);
    res.json({ success: true });
  });

  router.get('/stats', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { year, type, categoryId, month } = req.query;
    let query = 'SELECT * FROM bills WHERE userId = ?';
    const params = [userId];
    if (year) {
      query += " AND strftime('%Y', date) = ?";
      params.push(year);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (categoryId) {
      query += ' AND categoryId = ?';
      params.push(categoryId);
    }
    if (month) {
      query += " AND strftime('%m', date) = ?";
      params.push(month.padStart(2, '0'));
    }

    const bills = db.prepare(query).all(...params);
    const income = bills.filter(b => b.type === 'income').reduce((sum, b) => sum + b.amount, 0);
    const expense = bills.filter(b => b.type === 'expense').reduce((sum, b) => sum + b.amount, 0);
    const balance = income - expense;

    const byCategory = {};
    bills.forEach(b => {
      const catId = b.categoryId || 'other';
      if (!byCategory[catId]) byCategory[catId] = 0;
      byCategory[catId] += b.amount;
    });

    const monthlyData = {};
    bills.forEach(b => {
      const month = b.date?.substring(0, 7);
      if (month) {
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        if (b.type === 'income') monthlyData[month].income += b.amount;
        else monthlyData[month].expense += b.amount;
      }
    });

    res.json({ income, expense, balance, byCategory, monthlyData, totalBills: bills.length });
  });

  return router;
};
