const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/bookmarks');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const uploadIcon = multer({ 
  storage, 
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'));
    }
  }
});

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

  router.get('/', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { category, search } = req.query;
    let query = 'SELECT * FROM bookmarks WHERE userId = ?';
    const params = [userId];
    const conditions = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(title LIKE ? OR url LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    query += ' ORDER BY sortOrder ASC, createdAt DESC';

    const bookmarks = db.prepare(query).all(...params);
    res.json(bookmarks);
  });

  router.get('/categories', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const categories = db.prepare('SELECT DISTINCT category FROM bookmarks WHERE userId = ? ORDER BY category').all(userId);
    res.json(categories.map(c => c.category));
  });

  router.post('/', uploadIcon.single('icon'), (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, url, category, description } = req.body;
    const icon = req.file ? `/uploads/bookmarks/${req.file.filename}` : (req.body.icon || 'fa-link');
    const maxOrder = db.prepare('SELECT MAX(sortOrder) as max FROM bookmarks WHERE userId = ? AND category = ?').get(userId, category);
    const sortOrder = (maxOrder?.max || 0) + 1;

    const result = db.prepare('INSERT INTO bookmarks (userId, title, url, category, icon, sortOrder, description) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, title, url, category, icon, sortOrder, description || '');
    res.json({ id: result.lastInsertRowid, title, url, category, icon, sortOrder, description, userId });
  });

  router.put('/:id', uploadIcon.single('icon'), (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, url, category, sortOrder, description } = req.body;
    const icon = req.file ? `/uploads/bookmarks/${req.file.filename}` : req.body.icon;
    db.prepare('UPDATE bookmarks SET title = ?, url = ?, category = ?, icon = ?, sortOrder = ?, description = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?').run(title, url, category, icon, sortOrder, description || '', req.params.id, userId);
    res.json({ success: true });
  });

  router.delete('/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM bookmarks WHERE id = ? AND userId = ?').run(req.params.id, userId);
    res.json({ success: true });
  });

  router.post('/:id/click', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('UPDATE bookmarks SET clickCount = clickCount + 1 WHERE id = ? AND userId = ?').run(req.params.id, userId);
    const bookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ? AND userId = ?').get(req.params.id, userId);
    res.json(bookmark);
  });

  return router;
};
