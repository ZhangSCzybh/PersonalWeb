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

  router.get('/vehicle-stats', (req, res) => {
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
      query += " AND strftime('%Y', chargingDate) = ?";
      params.push(year);
    }
    query += ' ORDER BY chargingDate DESC';
    const records = db.prepare(query).all(...params);

    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalElectricity = records.reduce((sum, r) => sum + (r.meterCharging || 0), 0);
    const totalMileage = records.reduce((sum, r) => sum + (r.drivingMileage || 0), 0);
    const totalDuration = records.reduce((sum, r) => sum + (r.chargingDuration || 0), 0);
    const avgCostPerCharge = records.length > 0 ? totalCost / records.length : 0;
    const avgCostPerKwh = totalElectricity > 0 ? totalCost / totalElectricity : 0;
    const avgMileagePerCharge = records.length > 0 ? totalMileage / records.length : 0;
    const avgDurationPerCharge = records.length > 0 ? totalDuration / records.length : 0;
    const avgElectricityPerCharge = records.length > 0 ? totalElectricity / records.length : 0;
    const avgPower = totalDuration > 0 ? (totalElectricity / totalDuration) * 60 : 0;

    const byMonth = {};
    const byChargerType = { slow: 0, fast: 0, super: 0 };
    const byLocation = {};
    records.forEach(r => {
      const month = r.chargingDate?.substring(0, 7);
      if (month) {
        if (!byMonth[month]) byMonth[month] = { cost: 0, electricity: 0, mileage: 0, count: 0 };
        byMonth[month].cost += r.cost || 0;
        byMonth[month].electricity += r.meterCharging || 0;
        byMonth[month].mileage += r.drivingMileage || 0;
        byMonth[month].count += 1;
      }
      if (r.chargerType && byChargerType[r.chargerType] !== undefined) {
        byChargerType[r.chargerType] += r.cost || 0;
      }
      const location = r.location || '未标注';
      if (!byLocation[location]) byLocation[location] = 0;
      byLocation[location] += r.cost || 0;
    });

    res.json({
      totalCost, totalElectricity, totalMileage, totalDuration,
      avgCostPerCharge, avgCostPerKwh, avgMileagePerCharge, avgDurationPerCharge, avgElectricityPerCharge, avgPower,
      byMonth, byChargerType, byLocation, totalCharges: records.length
    });
  });

  router.get('/maintenance-stats', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { vehicleId, year } = req.query;
    let query = 'SELECT * FROM maintenance WHERE userId = ?';
    const params = [userId];
    if (vehicleId) {
      query += ' AND vehicleId = ?';
      params.push(vehicleId);
    }
    if (year) {
      query += " AND strftime('%Y', maintenanceDate) = ?";
      params.push(year);
    }
    query += ' ORDER BY maintenanceDate DESC';
    const records = db.prepare(query).all(...params);

    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    const byType = {};
    records.forEach(r => {
      if (!byType[r.maintenanceType]) byType[r.maintenanceType] = 0;
      byType[r.maintenanceType] += r.cost || 0;
    });
    const byMonth = {};
    records.forEach(r => {
      const month = r.maintenanceDate?.substring(0, 7);
      if (month) {
        if (!byMonth[month]) byMonth[month] = { cost: 0, count: 0 };
        byMonth[month].cost += r.cost || 0;
        byMonth[month].count += 1;
      }
    });

    res.json({ totalCost, byType, byMonth, totalRecords: records.length });
  });

  router.get('/bill-stats', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { year, type, categoryId, month } = req.query;
    let query = 'SELECT b.*, bc.name as categoryName, bc.type as categoryType FROM bills b LEFT JOIN bill_categories bc ON b.categoryId = bc.id WHERE b.userId = ?';
    const params = [userId];
    if (year) {
      query += " AND strftime('%Y', b.date) = ?";
      params.push(year);
    }
    if (type) {
      query += ' AND b.type = ?';
      params.push(type);
    }
    if (categoryId) {
      query += ' AND b.categoryId = ?';
      params.push(categoryId);
    }
    if (month) {
      query += " AND strftime('%m', b.date) = ?";
      params.push(month.padStart(2, '0'));
    }
    const bills = db.prepare(query).all(...params);

    const income = bills.filter(b => b.type === 'income' || b.categoryType === 'income').reduce((sum, b) => sum + b.amount, 0);
    const expense = bills.filter(b => b.type === 'expense' || b.categoryType === 'expense').reduce((sum, b) => sum + b.amount, 0);
    const balance = income - expense;

    const byCategory = {};
    bills.forEach(b => {
      const catName = b.categoryName || '其他';
      if (!byCategory[catName]) byCategory[catName] = 0;
      byCategory[catName] += b.amount;
    });

    const monthlyData = {};
    bills.forEach(b => {
      const month = b.date?.substring(0, 7);
      if (month) {
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        if (b.type === 'income' || b.categoryType === 'income') monthlyData[month].income += b.amount;
        else monthlyData[month].expense += b.amount;
      }
    });

    res.json({ income, expense, balance, byCategory, monthlyData, totalBills: bills.length });
  });

  return router;
};
