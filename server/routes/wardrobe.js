const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const router = express.Router();

const SECRET_KEY = 'personalweb_secret_key_2024';

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = (db) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads/wardrobe');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + path.extname(file.originalname));
    }
  });

  const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new Error('Only images are allowed'));
    }
  });

  router.get('/categories', authenticateToken, (req, res) => {
    try {
      const categories = db.prepare(`
        SELECT id, name, parent_category, icon, sort_order 
        FROM wardrobe_categories 
        ORDER BY sort_order, id
      `).all();
      
      const mainCategories = categories.filter(c => !c.parent_category);
      const subCategories = categories.filter(c => c.parent_category);
      
      const result = mainCategories.map(main => ({
        ...main,
        subCategories: subCategories
          .filter(sub => sub.parent_category === main.name)
          .map(sub => ({ id: sub.id, name: sub.name }))
      }));
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  router.post('/categories', authenticateToken, (req, res) => {
    try {
      const { name, parent_category, icon } = req.body;
      const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM wardrobe_categories').get();
      const sort_order = (maxOrder?.max || 0) + 1;
      
      const result = db.prepare(`
        INSERT INTO wardrobe_categories (name, parent_category, icon, sort_order)
        VALUES (?, ?, ?, ?)
      `).run(name, parent_category || null, icon || 'fa-tshirt', sort_order);
      
      res.json({ id: result.lastInsertRowid, name, parent_category, icon, sort_order });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  router.delete('/categories/:id', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM wardrobe_categories WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  router.get('/clothes', authenticateToken, (req, res) => {
    try {
      const { category_id, color, season, rating, search } = req.query;
      const userId = req.user.id;
      
      let query = `
        SELECT c.*, cat.name as category_name, cat.parent_category
        FROM wardrobe_clothes c
        LEFT JOIN wardrobe_categories cat ON c.category_id = cat.id
        WHERE c.user_id = ?
      `;
      const params = [userId];
      
      if (category_id) {
        query += ' AND (c.category_id = ? OR cat.parent_category = (SELECT name FROM wardrobe_categories WHERE id = ?))';
        params.push(category_id, category_id);
      }
      if (color) {
        query += ' AND c.color = ?';
        params.push(color);
      }
      if (season) {
        query += ' AND c.season LIKE ?';
        params.push(`%${season}%`);
      }
      if (rating) {
        query += ' AND c.rating >= ?';
        params.push(parseInt(rating));
      }
      if (search) {
        query += ' AND (c.brand LIKE ? OR c.tags LIKE ? OR c.notes LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      query += ' ORDER BY c.created_at DESC';
      
      const clothes = db.prepare(query).all(...params);
      res.json(clothes);
    } catch (error) {
      console.error('Error fetching clothes:', error);
      res.status(500).json({ error: 'Failed to fetch clothes' });
    }
  });

  router.get('/clothes/:id', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const clothes = db.prepare(`
        SELECT c.*, cat.name as category_name, cat.parent_category
        FROM wardrobe_clothes c
        LEFT JOIN wardrobe_categories cat ON c.category_id = cat.id
        WHERE c.id = ? AND c.user_id = ?
      `).get(id, userId);
      
      if (!clothes) {
        return res.status(404).json({ error: 'Clothing not found' });
      }
      
      res.json(clothes);
    } catch (error) {
      console.error('Error fetching clothing:', error);
      res.status(500).json({ error: 'Failed to fetch clothing' });
    }
  });

  router.post('/clothes', authenticateToken, upload.single('image'), (req, res) => {
    try {
      const { category_id, sub_category, color, rating, season, brand, fabric, size, tags, price, purchase_date, notes } = req.body;
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
      }
      
      const image_url = `/uploads/wardrobe/${req.file.filename}`;
      const seasonArray = Array.isArray(season) ? season : season ? [season] : [];
      
      const result = db.prepare(`
        INSERT INTO wardrobe_clothes (
          user_id, category_id, sub_category, image_url, color, rating, season,
          brand, fabric, size, tags, price, purchase_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId, category_id, sub_category || null, image_url, color || 'gray',
        parseInt(rating) || 3, seasonArray.join(','),
        brand || null, fabric || null, size || null, tags || null,
        price ? parseFloat(price) : null, purchase_date || null, notes || null
      );
      
      res.json({
        id: result.lastInsertRowid,
        category_id,
        sub_category,
        image_url,
        color,
        rating: parseInt(rating) || 3,
        season: seasonArray.join(','),
        brand,
        fabric,
        size,
        tags,
        price,
        purchase_date,
        notes
      });
    } catch (error) {
      console.error('Error creating clothing:', error);
      res.status(500).json({ error: 'Failed to create clothing' });
    }
  });

  router.put('/clothes/:id', authenticateToken, upload.single('image'), (req, res) => {
    try {
      const { id } = req.params;
      const { category_id, sub_category, color, rating, season, brand, fabric, size, tags, price, purchase_date, notes } = req.body;
      const userId = req.user.id;
      
      const existing = db.prepare('SELECT * FROM wardrobe_clothes WHERE id = ? AND user_id = ?').get(id, userId);
      if (!existing) {
        return res.status(404).json({ error: 'Clothing not found' });
      }
      
      let image_url = existing.image_url;
      if (req.file) {
        image_url = `/uploads/wardrobe/${req.file.filename}`;
      }
      
      db.prepare(`
        UPDATE wardrobe_clothes SET
          category_id = ?, sub_category = ?, image_url = ?, color = ?, rating = ?,
          season = ?, brand = ?, fabric = ?, size = ?, tags = ?, price = ?,
          purchase_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        category_id ? parseInt(category_id) : existing.category_id,
        sub_category !== undefined ? sub_category : existing.sub_category,
        image_url,
        color !== undefined ? color : existing.color,
        rating !== undefined ? parseInt(rating) : existing.rating,
        season !== undefined ? season : existing.season,
        brand !== undefined ? brand : existing.brand,
        fabric !== undefined ? fabric : existing.fabric,
        size !== undefined ? size : existing.size,
        tags !== undefined ? tags : existing.tags,
        price !== undefined && price !== '' ? parseFloat(price) : existing.price,
        purchase_date !== undefined ? purchase_date : existing.purchase_date,
        notes !== undefined ? notes : existing.notes,
        id
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating clothing:', error);
      res.status(500).json({ error: 'Failed to update clothing' });
    }
  });

  router.delete('/clothes/:id', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const clothing = db.prepare('SELECT image_url FROM wardrobe_clothes WHERE id = ? AND user_id = ?').get(id, userId);
      if (!clothing) {
        return res.status(404).json({ error: 'Clothing not found' });
      }
      
      if (clothing.image_url) {
        const filePath = path.join(__dirname, '../../', clothing.image_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      db.prepare('DELETE FROM wardrobe_clothes WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting clothing:', error);
      res.status(500).json({ error: 'Failed to delete clothing' });
    }
  });

  router.get('/outfits', authenticateToken, (req, res) => {
    try {
      const userId = req.user.id;
      const outfits = db.prepare(`
        SELECT o.*, 
          GROUP_CONCAT(JSON_OBJECT('clothes_id', oi.clothes_id, 'item_type', oi.item_type, 'image_url', wc.image_url)) as items
        FROM wardrobe_outfits o
        LEFT JOIN wardrobe_outfit_items oi ON o.id = oi.outfit_id
        LEFT JOIN wardrobe_clothes wc ON oi.clothes_id = wc.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `).all(userId);
      
      const result = outfits.map(outfit => ({
        ...outfit,
        items: outfit.items ? JSON.parse(`[${outfit.items}]`) : []
      }));
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching outfits:', error);
      res.status(500).json({ error: 'Failed to fetch outfits' });
    }
  });

  router.post('/outfits', authenticateToken, (req, res) => {
    try {
      const userId = req.user.id;
      const { name, occasion, season, ai_image_url, ai_suggestion, items } = req.body;
      
      const result = db.prepare(`
        INSERT INTO wardrobe_outfits (user_id, name, occasion, season, ai_image_url, ai_suggestion)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, name, occasion, season, ai_image_url || null, ai_suggestion || null);
      
      const outfitId = result.lastInsertRowid;
      
      if (items && items.length > 0) {
        const insertItem = db.prepare(`
          INSERT INTO wardrobe_outfit_items (outfit_id, clothes_id, item_type)
          VALUES (?, ?, ?)
        `);
        
        items.forEach(item => {
          insertItem.run(outfitId, item.clothes_id, item.type);
        });
      }
      
      res.json({ id: outfitId, name, occasion, season, ai_image_url, ai_suggestion, items });
    } catch (error) {
      console.error('Error creating outfit:', error);
      res.status(500).json({ error: 'Failed to create outfit' });
    }
  });

  router.delete('/outfits/:id', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const existing = db.prepare('SELECT id FROM wardrobe_outfits WHERE id = ? AND user_id = ?').get(id, userId);
      if (!existing) {
        return res.status(404).json({ error: 'Outfit not found' });
      }
      
      db.prepare('DELETE FROM wardrobe_outfit_items WHERE outfit_id = ?').run(id);
      db.prepare('DELETE FROM wardrobe_outfits WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting outfit:', error);
      res.status(500).json({ error: 'Failed to delete outfit' });
    }
  });

  router.post('/outfits/:id/favorite', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { is_favorite } = req.body;
      
      const existing = db.prepare('SELECT id FROM wardrobe_outfits WHERE id = ? AND user_id = ?').get(id, userId);
      if (!existing) {
        return res.status(404).json({ error: 'Outfit not found' });
      }
      
      db.prepare('UPDATE wardrobe_outfits SET is_favorite = ? WHERE id = ?').run(is_favorite ? 1 : 0, id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  router.get('/stats', authenticateToken, (req, res) => {
    try {
      const userId = req.user.id;
      const totalClothes = db.prepare('SELECT COUNT(*) as count FROM wardrobe_clothes WHERE user_id = ?').get(userId);
      const byCategory = db.prepare(`
        SELECT cat.name, cat.parent_category, COUNT(c.id) as count
        FROM wardrobe_categories cat
        LEFT JOIN wardrobe_clothes c ON c.category_id = cat.id AND c.user_id = ?
        WHERE cat.parent_category IS NULL
        GROUP BY cat.id
      `).all(userId);
      
      const bySeason = db.prepare(`
        SELECT season, COUNT(*) as count
        FROM wardrobe_clothes
        WHERE user_id = ? AND season IS NOT NULL AND season != ''
        GROUP BY season
      `).all(userId);
      
      res.json({
        totalClothes: totalClothes.count,
        byCategory,
        bySeason
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  return router;
};
