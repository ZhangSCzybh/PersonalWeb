const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/vehicles');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype || !file.originalname) {
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

    const vehicles = db.prepare('SELECT * FROM vehicles WHERE userId = ? ORDER BY createdAt DESC').all(userId);
    const vehiclesWithMileage = vehicles.map(v => {
      const latestCharging = db.prepare('SELECT currentMileage FROM charging_records WHERE vehicleId = ? ORDER BY chargingDate DESC LIMIT 1').get(v.id);
      return {
        ...v,
        currentMileage: latestCharging?.currentMileage || v.currentMileage || 0
      };
    });
    res.json(vehiclesWithMileage);
  });

  router.get('/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ? AND userId = ?').get(req.params.id, userId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  });

  router.post('/', upload.single('image'), (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { brand, model, year, licensePlate, color, vin, purchaseDate, purchasePrice, currentMileage, batteryCapacity, status, notes } = req.body;
    const imageUrl = req.file ? `/uploads/vehicles/${req.file.filename}` : null;

    const result = db.prepare(`INSERT INTO vehicles (userId, brand, model, year, licensePlate, color, vin, purchaseDate, purchasePrice, currentMileage, batteryCapacity, imageUrl, status, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(userId, brand, model, year, licensePlate, color, vin, purchaseDate, purchasePrice, currentMileage || 0, batteryCapacity, imageUrl, status || 'active', notes);
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/:id', upload.single('image'), (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { brand, model, year, licensePlate, color, vin, purchaseDate, purchasePrice, currentMileage, batteryCapacity, status, notes } = req.body;
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ? AND userId = ?').get(req.params.id, userId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    
    const imageUrl = req.file ? `/uploads/vehicles/${req.file.filename}` : vehicle.imageUrl;

    db.prepare(`UPDATE vehicles SET brand = ?, model = ?, year = ?, licensePlate = ?, color = ?, vin = ?, purchaseDate = ?, purchasePrice = ?, currentMileage = ?, batteryCapacity = ?, imageUrl = ?, status = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`)
      .run(brand, model, year, licensePlate, color, vin, purchaseDate, purchasePrice, currentMileage, batteryCapacity, imageUrl, status, notes, req.params.id, userId);
    res.json({ success: true });
  });

  router.delete('/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM vehicles WHERE id = ? AND userId = ?').run(req.params.id, userId);
    res.json({ success: true });
  });

  router.get('/:id/maintenance', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ? AND userId = ?').get(req.params.id, userId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const records = db.prepare('SELECT * FROM maintenance WHERE vehicleId = ? ORDER BY maintenanceDate DESC').all(req.params.id);
    res.json(records);
  });

  router.post('/:id/maintenance', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ? AND userId = ?').get(req.params.id, userId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const { maintenanceType, maintenanceDate, mileage, description, cost, shop } = req.body;
    const result = db.prepare('INSERT INTO maintenance (userId, vehicleId, maintenanceType, maintenanceDate, mileage, description, cost, shop) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(userId, req.params.id, maintenanceType, maintenanceDate, mileage, description, cost, shop);
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/maintenance/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { maintenanceType, maintenanceDate, mileage, description, cost, shop } = req.body;
    db.prepare('UPDATE maintenance SET maintenanceType = ?, maintenanceDate = ?, mileage = ?, description = ?, cost = ?, shop = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?')
      .run(maintenanceType, maintenanceDate, mileage, description, cost, shop, req.params.id, userId);
    res.json({ success: true });
  });

  router.delete('/maintenance/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM maintenance WHERE id = ? AND userId = ?').run(req.params.id, userId);
    res.json({ success: true });
  });

  return router;
};
