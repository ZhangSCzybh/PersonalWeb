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

  const getUserRole = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      return decoded.role;
    } catch {
      return null;
    }
  };

  router.get('/', (req, res) => {
    const query = 'SELECT * FROM favorites ORDER BY category, sortOrder, id';
    const favorites = db.prepare(query).all();
    res.json(favorites);
  });

  router.get('/categories', (req, res) => {
    const query = 'SELECT DISTINCT category FROM favorites ORDER BY category';
    const categories = db.prepare(query).all();
    res.json(categories.map(c => c.category));
  });

  router.post('/', (req, res) => {
    const role = getUserRole(req);
    if (role !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以添加收藏' });
    }

    const { title, url, category, icon, description } = req.body;
    if (!title || !url || !category) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const maxOrder = db.prepare('SELECT MAX(sortOrder) as max FROM favorites WHERE category = ?').get(category);
    const sortOrder = (maxOrder?.max || 0) + 1;

    const result = db.prepare('INSERT INTO favorites (title, url, category, icon, sortOrder, description) VALUES (?, ?, ?, ?, ?, ?)').run(title, url, category, icon || 'fa-link', sortOrder, description || '');
    res.json({ id: result.lastInsertRowid, title, url, category, icon: icon || 'fa-link', sortOrder, description });
  });

  router.put('/:id', (req, res) => {
    const role = getUserRole(req);
    if (role !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以编辑收藏' });
    }

    const { title, url, category, icon, sortOrder, description } = req.body;
    db.prepare('UPDATE favorites SET title = ?, url = ?, category = ?, icon = ?, sortOrder = ?, description = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(title, url, category, icon, sortOrder, description || '', req.params.id);
    res.json({ success: true });
  });

  router.delete('/:id', (req, res) => {
    const role = getUserRole(req);
    if (role !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以删除收藏' });
    }

    db.prepare('DELETE FROM favorites WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  router.post('/:id/click', (req, res) => {
    db.prepare('UPDATE favorites SET clickCount = clickCount + 1 WHERE id = ?').run(req.params.id);
    const favorite = db.prepare('SELECT * FROM favorites WHERE id = ?').get(req.params.id);
    res.json(favorite);
  });

  return router;
};
