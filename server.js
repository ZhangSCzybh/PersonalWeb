const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 初始化数据库
const db = new Database('vehicles.db');

// 创建车辆表
const createTable = `
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_plate TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    owner TEXT DEFAULT '未知车主',
    year INTEGER,
    color TEXT,
    mileage REAL DEFAULT 0,
    battery_capacity REAL DEFAULT 0,
    cltc_range INTEGER DEFAULT 0,
    purchase_date DATE,
    insurance_expiry DATE,
    last_service DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;

// 创建维修记录表
const createMaintenanceTable = `
CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    service_date DATE NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    cost REAL DEFAULT 0,
    mileage_at_service REAL,
    service_location TEXT,
    next_service_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
)
`;

// 创建充电记录表
const createChargingRecordsTable = `
CREATE TABLE IF NOT EXISTS charging_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    charging_date DATE NOT NULL,
    charging_location TEXT,
    previous_mileage REAL NOT NULL,
    current_mileage REAL NOT NULL,
    driven_mileage REAL NOT NULL,
    meter_charging_kwh REAL NOT NULL,
    charging_start_percentage INTEGER NOT NULL,
    charging_end_percentage INTEGER NOT NULL,
    car_charging_kwh REAL NOT NULL,
    energy_loss_kwh REAL NOT NULL,
    amount REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
)
`;

db.exec(createTable);
db.exec(createMaintenanceTable);
db.exec(createChargingRecordsTable);

// 获取所有车辆
app.get('/api/vehicles', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM vehicles ORDER BY created_at DESC');
        const vehicles = stmt.all();
        
        // 为每辆车计算总费用、维修记录数量和总行驶里程
        const vehiclesWithStats = vehicles.map(vehicle => {
            const costStmt = db.prepare('SELECT SUM(cost) as total_cost, COUNT(*) as maintenance_count FROM maintenance_records WHERE vehicle_id = ?');
            const costResult = costStmt.get(vehicle.id);
            
            // 计算该车辆的总行驶里程（所有充电记录的distance_driven之和）
            const mileageStmt = db.prepare('SELECT SUM(distance_driven) as total_mileage FROM charging_records WHERE vehicle_id = ?');
            const mileageResult = mileageStmt.get(vehicle.id);
            
            return {
                ...vehicle,
                total_cost: costResult.total_cost || 0,
                maintenance_count: costResult.maintenance_count || 0,
                mileage: mileageResult.total_mileage || 0  // 使用总行驶里程替代原来的里程字段
            };
        });
        
        res.json(vehiclesWithStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取单个车辆详情
app.get('/api/vehicles/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM vehicles WHERE id = ?');
        const vehicle = stmt.get(req.params.id);
        if (vehicle) {
            // 计算该车辆的总费用和维修记录数量
            const costStmt = db.prepare('SELECT SUM(cost) as total_cost, COUNT(*) as maintenance_count FROM maintenance_records WHERE vehicle_id = ?');
            const costResult = costStmt.get(req.params.id);
            
            // 计算该车辆的总行驶里程（所有充电记录的distance_driven之和）
            const mileageStmt = db.prepare('SELECT SUM(distance_driven) as total_mileage FROM charging_records WHERE vehicle_id = ?');
            const mileageResult = mileageStmt.get(req.params.id);
            
            res.json({
                ...vehicle,
                total_cost: costResult.total_cost || 0,
                maintenance_count: costResult.maintenance_count || 0,
                mileage: mileageResult.total_mileage || 0  // 使用总行驶里程替代原来的里程字段
            });
        } else {
            res.status(404).json({ error: 'Vehicle not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 创建新车辆
app.post('/api/vehicles', (req, res) => {
    try {
        const {
            license_plate, brand, model, owner, year, color, mileage,
            battery_capacity, cltc_range,
            purchase_date, insurance_expiry, last_service, notes
        } = req.body;

        const stmt = db.prepare(`
            INSERT INTO vehicles 
            (license_plate, brand, model, owner, year, color, mileage, battery_capacity, cltc_range, purchase_date, insurance_expiry, last_service, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            license_plate, brand, model, owner || '未知车主', year, color, mileage,
            battery_capacity || 0, cltc_range || 0,
            purchase_date, insurance_expiry, last_service, notes
        );

        res.status(201).json({ id: result.lastInsertRowid, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新车辆信息
app.put('/api/vehicles/:id', (req, res) => {
    try {
        const {
            license_plate, brand, model, owner, year, color, mileage,
            battery_capacity, cltc_range,
            purchase_date, insurance_expiry, last_service, notes
        } = req.body;

        const stmt = db.prepare(`
            UPDATE vehicles 
            SET license_plate = ?, brand = ?, model = ?, owner = ?, year = ?, color = ?, 
                mileage = ?, battery_capacity = ?, cltc_range = ?, purchase_date = ?, insurance_expiry = ?, 
                last_service = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        const result = stmt.run(
            license_plate, brand, model, owner || '未知车主', year, color, mileage,
            battery_capacity || 0, cltc_range || 0,
            purchase_date, insurance_expiry, last_service, notes, req.params.id
        );

        if (result.changes > 0) {
            res.json({ id: req.params.id, ...req.body });
        } else {
            res.status(404).json({ error: 'Vehicle not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除车辆
app.delete('/api/vehicles/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM vehicles WHERE id = ?');
        const result = stmt.run(req.params.id);

        if (result.changes > 0) {
            res.json({ message: 'Vehicle deleted successfully' });
        } else {
            res.status(404).json({ error: 'Vehicle not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取车辆的维修记录
app.get('/api/vehicles/:id/maintenance', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT * FROM maintenance_records 
            WHERE vehicle_id = ? 
            ORDER BY service_date DESC
        `);
        const records = stmt.all(req.params.id);
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 添加维修记录
app.post('/api/vehicles/:id/maintenance', (req, res) => {
    try {
        const {
            service_date, service_type, description, cost,
            mileage_at_service, service_location, next_service_date
        } = req.body;

        const stmt = db.prepare(`
            INSERT INTO maintenance_records 
            (vehicle_id, service_date, service_type, description, cost, mileage_at_service, service_location, next_service_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            req.params.id, service_date, service_type, description, cost,
            mileage_at_service, service_location, next_service_date
        );

        res.status(201).json({ id: result.lastInsertRowid, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取统计信息
app.get('/api/stats', (req, res) => {
    try {
        const totalVehicles = db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count;
        const totalMaintenance = db.prepare('SELECT COUNT(*) as count FROM maintenance_records').get().count;
        const totalCost = db.prepare('SELECT SUM(cost) as total FROM maintenance_records').get().total || 0;
        const avgMileage = db.prepare('SELECT AVG(mileage) as avg FROM vehicles').get().avg || 0;

        res.json({
            totalVehicles,
            totalMaintenance,
            totalCost: totalCost.toFixed(2),
            avgMileage: avgMileage.toFixed(2)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 搜索车辆
app.get('/api/vehicles/search', (req, res) => {
    try {
        const { q } = req.query;
        const stmt = db.prepare(`
            SELECT * FROM vehicles 
            WHERE license_plate LIKE ? OR brand LIKE ? OR model LIKE ?
            ORDER BY created_at DESC
        `);
        const vehicles = stmt.all(`%${q}%`, `%${q}%`, `%${q}%`);
        
        // 为每个车辆计算总行驶里程
        const vehiclesWithMileage = vehicles.map(vehicle => {
            const mileageStmt = db.prepare('SELECT SUM(distance_driven) as total_mileage FROM charging_records WHERE vehicle_id = ?');
            const mileageResult = mileageStmt.get(vehicle.id);
            return {
                ...vehicle,
                mileage: mileageResult.total_mileage || 0  // 使用总行驶里程替代原来的里程字段
            };
        });
        
        res.json(vehiclesWithMileage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取车辆的充电记录
app.get('/api/vehicles/:id/charging', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT * FROM charging_records 
            WHERE vehicle_id = ? 
            ORDER BY date DESC
        `);
        const records = stmt.all(req.params.id);
        
        // 将数据库字段名映射为前端使用的字段名
        const formattedRecords = records.map(record => ({
            id: record.id,
            vehicle_id: record.vehicle_id,
            charging_date: record.date,
            charging_location: record.location,
            previous_mileage: record.previous_mileage,
            current_mileage: record.current_mileage,
            driven_mileage: record.distance_driven,
            meter_charging_kwh: record.meter_kwh,
            charging_start_percentage: record.battery_before,
            charging_end_percentage: record.battery_after,
            car_charging_kwh: record.car_kwh,
            energy_loss_kwh: record.energy_loss,
            amount: record.amount,
            notes: record.notes,
            created_at: record.created_at,
            updated_at: record.updated_at
        }));
        
        res.json(formattedRecords);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 添加充电记录
app.post('/api/vehicles/:id/charging', (req, res) => {
    try {
        const {
            charging_date, charging_location, previous_mileage, current_mileage,
            driven_mileage, meter_charging_kwh, charging_start_percentage,
            charging_end_percentage, car_charging_kwh, energy_loss_kwh, amount, notes
        } = req.body;

        const stmt = db.prepare(`
            INSERT INTO charging_records 
            (vehicle_id, date, location, previous_mileage, current_mileage,
             distance_driven, meter_kwh, battery_before, battery_after,
             car_kwh, energy_loss, amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            req.params.id, charging_date, charging_location, previous_mileage, current_mileage,
            driven_mileage, meter_charging_kwh, charging_start_percentage, charging_end_percentage,
            car_charging_kwh, energy_loss_kwh, amount, notes
        );

        // 更新车辆总里程
        const updateMileageStmt = db.prepare(`
            UPDATE vehicles 
            SET mileage = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        updateMileageStmt.run(current_mileage, req.params.id);

        res.status(201).json({ id: result.lastInsertRowid, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新充电记录
app.put('/api/charging/:id', (req, res) => {
    try {
        const {
            charging_date, charging_location, previous_mileage, current_mileage,
            driven_mileage, meter_charging_kwh, charging_start_percentage,
            charging_end_percentage, car_charging_kwh, energy_loss_kwh, amount, notes
        } = req.body;

        const stmt = db.prepare(`
            UPDATE charging_records 
            SET date = ?, location = ?, previous_mileage = ?, 
                current_mileage = ?, distance_driven = ?, meter_kwh = ?,
                battery_before = ?, battery_after = ?, 
                car_kwh = ?, energy_loss = ?, amount = ?, notes = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            charging_date, charging_location, previous_mileage, current_mileage,
            driven_mileage, meter_charging_kwh, charging_start_percentage,
            charging_end_percentage, car_charging_kwh, energy_loss_kwh, amount, notes, req.params.id
        );

        if (result.changes > 0) {
            res.json({ id: req.params.id, ...req.body });
        } else {
            res.status(404).json({ error: 'Charging record not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除充电记录
app.delete('/api/charging/:id', (req, res) => {
    try {
        // 首先获取要删除的记录信息
        const getRecordStmt = db.prepare('SELECT vehicle_id, previous_mileage FROM charging_records WHERE id = ?');
        const record = getRecordStmt.get(req.params.id);
        
        if (!record) {
            return res.status(404).json({ error: 'Charging record not found' });
        }

        // 删除记录
        const deleteStmt = db.prepare('DELETE FROM charging_records WHERE id = ?');
        const result = deleteStmt.run(req.params.id);

        if (result.changes > 0) {
            // 恢复车辆总里程到该记录之前的数值
            const updateMileageStmt = db.prepare(`
                UPDATE vehicles 
                SET mileage = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateMileageStmt.run(record.previous_mileage, record.vehicle_id);
            
            res.json({ 
                message: 'Charging record deleted successfully',
                previous_mileage: record.previous_mileage,
                vehicle_id: record.vehicle_id
            });
        } else {
            res.status(404).json({ error: 'Charging record not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新单个车辆状态
app.put('/api/vehicles/:id/status', (req, res) => {
    try {
        const { status_flag } = req.body;
        const stmt = db.prepare(`
            UPDATE vehicles 
            SET status_flag = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        const result = stmt.run(status_flag, req.params.id);
        
        if (result.changes > 0) {
            res.json({ message: '状态更新成功' });
        } else {
            res.status(404).json({ error: 'Vehicle not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 将所有车辆设为未使用
app.put('/api/vehicles/status/unused', (req, res) => {
    try {
        const stmt = db.prepare(`
            UPDATE vehicles 
            SET status_flag = '未使用', updated_at = CURRENT_TIMESTAMP
            WHERE status_flag = '使用中'
        `);
        
        stmt.run();
        res.json({ message: '所有车辆已设为未使用' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚗 车辆管理服务器运行在端口 ${PORT}`);
    console.log(`📊 API文档: http://localhost:${PORT}/api`);
});

module.exports = app;