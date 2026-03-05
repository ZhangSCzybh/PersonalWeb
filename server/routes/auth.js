const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
  const router = express.Router();
  const SECRET_KEY = 'personalweb_secret_key_2024';

  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  router.post('/register', (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    try {
      const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, role || 'user');
      res.json({ id: result.lastInsertRowid, username, role: role || 'user' });
    } catch (err) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      res.json({ valid: true, user: decoded });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  router.post('/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
      
      if (!bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(400).json({ error: 'Old password is incorrect' });
      }
      
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, decoded.id);
      res.json({ success: true });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  router.get('/users', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const users = db.prepare('SELECT id, username, role, createdAt FROM users ORDER BY id').all();
      res.json(users);
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  router.delete('/users/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const userId = parseInt(req.params.id);
      if (userId === decoded.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
      }
      
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      res.json({ success: true });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
};
