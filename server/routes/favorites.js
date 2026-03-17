const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/favorites');
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

  router.post('/', uploadIcon.single('icon'), (req, res) => {
    const role = getUserRole(req);
    if (role !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以添加收藏' });
    }

    const { title, url, category, description } = req.body;
    const icon = req.file ? `/uploads/favorites/${req.file.filename}` : (req.body.icon || 'fa-link');
    if (!title || !url || !category) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const maxOrder = db.prepare('SELECT MAX(sortOrder) as max FROM favorites WHERE category = ?').get(category);
    const sortOrder = (maxOrder?.max || 0) + 1;

    const result = db.prepare('INSERT INTO favorites (title, url, category, icon, sortOrder, description) VALUES (?, ?, ?, ?, ?, ?)').run(title, url, category, icon, sortOrder, description || '');
    res.json({ id: result.lastInsertRowid, title, url, category, icon, sortOrder, description });
  });

  router.put('/:id', uploadIcon.single('icon'), (req, res) => {
    const role = getUserRole(req);
    if (role !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以编辑收藏' });
    }

    const { title, url, category, sortOrder, description } = req.body;
    const icon = req.file ? `/uploads/favorites/${req.file.filename}` : req.body.icon;
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
