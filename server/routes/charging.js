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

  router.get('/', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { vehicleId, page = 1, limit = 20 } = req.query;
    let query = 'SELECT cr.*, v.brand, v.model, v.batteryCapacity FROM charging_records cr LEFT JOIN vehicles v ON cr.vehicleId = v.id WHERE cr.userId = ?';
    const params = [userId];
    const conditions = [];

    if (vehicleId) {
      conditions.push('cr.vehicleId = ?');
      params.push(vehicleId);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    query += ' ORDER BY cr.chargingDate DESC';

    const offset = (page - 1) * limit;
    query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const records = db.prepare(query).all(...params);
    
    let countConditions = conditions.map(c => c.replace(/cr\./g, ''));
    const countQuery = 'SELECT COUNT(*) as total FROM charging_records WHERE userId = ?' + (countConditions.length > 0 ? ' AND ' + countConditions.join(' AND ') : '');
    const total = db.prepare(countQuery).get(userId, ...params.slice(1));

    res.json({ records, total: total.total, page: parseInt(page), totalPages: Math.ceil(total.total / limit) });
  });

  router.get('/stats', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { vehicleId, year } = req.query;
    let query = 'SELECT * FROM charging_records WHERE userId = ?';
    const params = [userId];

    if (vehicleId) {
      query += ' AND vehicleId = ?';
      params.push(vehicleId);
    }
    if (year) {
      query += ' AND chargingDate LIKE ?';
      params.push(year + '%');
    }

    const records = db.prepare(query).all(...params);
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalElectricity = records.reduce((sum, r) => sum + (r.meterCharging || 0), 0);
    const totalMileage = records.reduce((sum, r) => sum + (r.drivingMileage || 0), 0);
    const avgCostPerCharge = records.length > 0 ? totalCost / records.length : 0;

    res.json({ totalCost, totalElectricity, totalMileage, avgCostPerCharge, totalCharges: records.length });
  });

  router.get('/monthly-stats', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { vehicleId } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const getMonthRange = (year, month) => {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = month === 12 
        ? `${year + 1}-01-01` 
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;
      return { start, end };
    };

    const currentMonthRange = getMonthRange(currentYear, currentMonth);
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthRange = getMonthRange(prevYear, prevMonth);

    let baseQuery = 'SELECT * FROM charging_records WHERE userId = ?';
    const baseParams = [userId];

    if (vehicleId) {
      baseQuery += ' AND vehicleId = ?';
      baseParams.push(vehicleId);
    }

    const currentRecords = db.prepare(baseQuery + ' AND chargingDate >= ? AND chargingDate < ?').all(...baseParams, currentMonthRange.start, currentMonthRange.end);
    const prevRecords = db.prepare(baseQuery + ' AND chargingDate >= ? AND chargingDate < ?').all(...baseParams, prevMonthRange.start, prevMonthRange.end);

    const calcStats = (records) => {
      const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
      const totalMeterCharging = records.reduce((sum, r) => sum + (r.meterCharging || 0), 0);
      const totalDrivingMileage = records.reduce((sum, r) => sum + (r.drivingMileage || 0), 0);
      const totalCharges = records.length;
      return { totalCost, totalMeterCharging, totalDrivingMileage, totalCharges };
    };

    const currentStats = calcStats(currentRecords);
    const prevStats = calcStats(prevRecords);

    const getChange = (current, prev) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    res.json({
      current: currentStats,
      previous: prevStats,
      changes: {
        drivingMileage: getChange(currentStats.totalDrivingMileage, prevStats.totalDrivingMileage),
        cost: getChange(currentStats.totalCost, prevStats.totalCost),
        meterCharging: getChange(currentStats.totalMeterCharging, prevStats.totalMeterCharging),
        charges: getChange(currentStats.totalCharges, prevStats.totalCharges)
      }
    });
  });

  router.get('/all-stats', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { vehicleId } = req.query;
    let query = 'SELECT * FROM charging_records WHERE userId = ?';
    const params = [userId];

    if (vehicleId) {
      query += ' AND vehicleId = ?';
      params.push(vehicleId);
    }

    const records = db.prepare(query).all(...params);
    
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalMeterCharging = records.reduce((sum, r) => sum + (r.meterCharging || 0), 0);
    const totalDrivingMileage = records.reduce((sum, r) => sum + (r.drivingMileage || 0), 0);
    const totalPowerLoss = records.reduce((sum, r) => sum + (r.powerLoss || 0), 0);
    const totalCharges = records.length;

    res.json({
      avgPowerConsumption: totalDrivingMileage > 0 ? (totalMeterCharging / totalDrivingMileage) * 100 : 0,
      avgCostPerKm: totalDrivingMileage > 0 ? totalCost / totalDrivingMileage : 0,
      avgPricePerKwh: totalMeterCharging > 0 ? totalCost / totalMeterCharging : 0,
      avgPowerLoss: totalCharges > 0 ? totalPowerLoss / totalCharges : 0
    });
  });

  router.post('/', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { vehicleId, chargingDate, previousMileage, currentMileage, drivingMileage, startBattery, endBattery, chargingDuration, meterCharging, vehicleCharging, powerLoss, cost, location, chargerType, notes } = req.body;
    
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ? AND userId = ?').get(vehicleId, userId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const result = db.prepare(`INSERT INTO charging_records (userId, vehicleId, chargingDate, previousMileage, currentMileage, drivingMileage, startBattery, endBattery, chargingDuration, meterCharging, vehicleCharging, powerLoss, cost, location, chargerType, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(userId, vehicleId, chargingDate, previousMileage, currentMileage, drivingMileage, startBattery, endBattery, chargingDuration, meterCharging, vehicleCharging, powerLoss, cost, location, chargerType || 'slow', notes);
    res.json({ id: result.lastInsertRowid });
  });

  router.put('/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { vehicleId, chargingDate, previousMileage, currentMileage, drivingMileage, startBattery, endBattery, chargingDuration, meterCharging, vehicleCharging, powerLoss, cost, location, chargerType, notes } = req.body;
    
    const record = db.prepare('SELECT * FROM charging_records WHERE id = ? AND userId = ?').get(req.params.id, userId);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    db.prepare(`UPDATE charging_records SET vehicleId = ?, chargingDate = ?, previousMileage = ?, currentMileage = ?, drivingMileage = ?, startBattery = ?, endBattery = ?, chargingDuration = ?, meterCharging = ?, vehicleCharging = ?, powerLoss = ?, cost = ?, location = ?, chargerType = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`)
      .run(vehicleId, chargingDate, previousMileage, currentMileage, drivingMileage, startBattery, endBattery, chargingDuration, meterCharging, vehicleCharging, powerLoss, cost, location, chargerType, notes, req.params.id, userId);
    res.json({ success: true });
  });

  router.delete('/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id;
    const record = db.prepare('SELECT vehicleId, chargingDate FROM charging_records WHERE id = ? AND userId = ?').get(id, userId);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    const latestRecord = db.prepare('SELECT id FROM charging_records WHERE vehicleId = ? AND userId = ? ORDER BY chargingDate DESC LIMIT 1').get(record.vehicleId, userId);
    if (latestRecord && latestRecord.id !== parseInt(id)) {
      return res.status(400).json({ error: '只能删除该车辆最新的充电记录' });
    }
    db.prepare('DELETE FROM charging_records WHERE id = ? AND userId = ?').run(id, userId);
    res.json({ success: true });
  });

  return router;
};
