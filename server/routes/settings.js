const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  router.get('/:key', (req, res) => {
    const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
    res.json(setting ? setting.value : null);
  });

  router.post('/', (req, res) => {
    const { key, value } = req.body;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    res.json({ success: true });
  });

  router.delete('/:key', (req, res) => {
    db.prepare('DELETE FROM settings WHERE key = ?').run(req.params.key);
    res.json({ success: true });
  });

  return router;
};
