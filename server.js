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

// 创建书签表
const createBookmarksTable = `
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    notes TEXT,
    favicon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;

db.exec(createTable);
db.exec(createMaintenanceTable);
db.exec(createChargingRecordsTable);
db.exec(createBookmarksTable);

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
        const vehicleId = req.params.id;
        
        // 开始事务
        db.prepare('BEGIN TRANSACTION').run();
        
        try {
            // 先删除相关的充电记录
            db.prepare('DELETE FROM charging_records WHERE vehicle_id = ?').run(vehicleId);
            
            // 再删除相关的维修记录
            db.prepare('DELETE FROM maintenance_records WHERE vehicle_id = ?').run(vehicleId);
            
            // 最后删除车辆
            const stmt = db.prepare('DELETE FROM vehicles WHERE id = ?');
            const result = stmt.run(vehicleId);
            
            if (result.changes > 0) {
                // 提交事务
                db.prepare('COMMIT').run();
                res.json({ message: 'Vehicle deleted successfully' });
            } else {
                // 回滚事务
                db.prepare('ROLLBACK').run();
                res.status(404).json({ error: 'Vehicle not found' });
            }
        } catch (error) {
            // 回滚事务
            db.prepare('ROLLBACK').run();
            throw error;
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

// 书签相关API

// 获取所有书签
app.get('/api/bookmarks', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM bookmarks ORDER BY created_at DESC');
        const bookmarks = stmt.all();
        res.json(bookmarks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 创建新书签
app.post('/api/bookmarks', (req, res) => {
    try {
        const { url, notes, favicon } = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO bookmarks (url, notes, favicon)
            VALUES (?, ?, ?)
        `);
        
        const result = stmt.run(url, notes || '', favicon || '');
        
        const newBookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newBookmark);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新书签
app.put('/api/bookmarks/:id', (req, res) => {
    try {
        const { url, notes, favicon } = req.body;
        
        const stmt = db.prepare(`
            UPDATE bookmarks 
            SET url = ?, notes = ?, favicon = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        const result = stmt.run(url, notes || '', favicon || '', req.params.id);
        
        if (result.changes > 0) {
            const updatedBookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id);
            res.json(updatedBookmark);
        } else {
            res.status(404).json({ error: 'Bookmark not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除书签
app.delete('/api/bookmarks/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM bookmarks WHERE id = ?');
        const result = stmt.run(req.params.id);
        
        if (result.changes > 0) {
            res.json({ message: 'Bookmark deleted successfully' });
        } else {
            res.status(404).json({ error: 'Bookmark not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 批量更新书签排序
app.post('/api/bookmarks/reorder', (req, res) => {
    try {
        const { bookmarks } = req.body;
        
        const stmt = db.prepare(`
            UPDATE bookmarks 
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        // 使用事务确保数据一致性
        const transaction = db.transaction((items) => {
            for (const item of items) {
                stmt.run(item.id);
            }
        });
        
        transaction(bookmarks);
        res.json({ message: 'Bookmarks reordered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 账单相关API

// 获取所有账单
app.get('/api/bills', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color
            FROM bills b
            LEFT JOIN categories c ON b.category_id = c.id
            ORDER BY b.date DESC
        `);
        const bills = stmt.all();
        res.json(bills);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取本月账单统计（包括环比数据）
app.get('/api/bills/stats/monthly', (req, res) => {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
        const currentMonthStart = `${currentYear}-${currentMonth}-01`;
        const currentMonthEnd = `${currentYear}-${currentMonth}-${new Date(currentYear, currentDate.getMonth() + 1, 0).getDate()}`;

        // 获取本月数据
        const currentMonthStmt = db.prepare(`
            SELECT 
                SUM(CASE WHEN c.type = 'income' THEN b.amount ELSE 0 END) as income,
                SUM(CASE WHEN c.type = 'expense' THEN b.amount ELSE 0 END) as expense
            FROM bills b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.date >= ? AND b.date <= ?
        `);
        const currentMonthData = currentMonthStmt.get(currentMonthStart, currentMonthEnd);

        // 获取上月数据
        const lastMonthDate = new Date(currentYear, currentDate.getMonth() - 1, 1);
        const lastMonthYear = lastMonthDate.getFullYear();
        const lastMonth = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
        const lastMonthStart = `${lastMonthYear}-${lastMonth}-01`;
        const lastMonthEnd = `${lastMonthYear}-${lastMonth}-${new Date(lastMonthYear, lastMonthDate.getMonth() + 1, 0).getDate()}`;

        const lastMonthStmt = db.prepare(`
            SELECT 
                SUM(CASE WHEN c.type = 'income' THEN b.amount ELSE 0 END) as income,
                SUM(CASE WHEN c.type = 'expense' THEN b.amount ELSE 0 END) as expense
            FROM bills b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.date >= ? AND b.date <= ?
        `);
        const lastMonthData = lastMonthStmt.get(lastMonthStart, lastMonthEnd);

        // 计算环比变化
        const calculateChange = (current, previous) => {
            if (!previous || previous === 0) return 0;
            return ((current - previous) / previous) * 100;
        };

        const currentIncome = currentMonthData?.income || 0;
        const currentExpense = currentMonthData?.expense || 0;
        const currentNet = currentIncome - currentExpense;

        const lastIncome = lastMonthData?.income || 0;
        const lastExpense = lastMonthData?.expense || 0;
        const lastNet = lastIncome - lastExpense;

        const incomeChange = calculateChange(currentIncome, lastIncome);
        const expenseChange = calculateChange(currentExpense, lastExpense);
        const netChange = calculateChange(currentNet, lastNet);

        res.json({
            current: {
                income: parseFloat(currentIncome.toFixed(2)),
                expense: parseFloat(currentExpense.toFixed(2)),
                net: parseFloat(currentNet.toFixed(2))
            },
            previous: {
                income: parseFloat(lastIncome.toFixed(2)),
                expense: parseFloat(lastExpense.toFixed(2)),
                net: parseFloat(lastNet.toFixed(2))
            },
            change: {
                income: parseFloat(incomeChange.toFixed(2)),
                expense: parseFloat(expenseChange.toFixed(2)),
                net: parseFloat(netChange.toFixed(2))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取单个账单
app.get('/api/bills/:id', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color
            FROM bills b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.id = ?
        `);
        const bill = stmt.get(req.params.id);
        
        if (bill) {
            res.json(bill);
        } else {
            res.status(404).json({ error: 'Bill not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 添加新账单
app.post('/api/bills', (req, res) => {
    try {
        const { amount, category_id, date, notes } = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO bills (amount, category_id, date, notes)
            VALUES (?, ?, ?, ?)
        `);
        
        const result = stmt.run(amount, category_id, date, notes || '');
        
        const newBill = db.prepare(`
            SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color
            FROM bills b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.id = ?
        `).get(result.lastInsertRowid);
        
        res.status(201).json(newBill);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新账单
app.put('/api/bills/:id', (req, res) => {
    try {
        const { amount, category_id, date, notes } = req.body;
        
        const stmt = db.prepare(`
            UPDATE bills 
            SET amount = ?, category_id = ?, date = ?, notes = ?
            WHERE id = ?
        `);
        
        const result = stmt.run(amount, category_id, date, notes || '', req.params.id);
        
        if (result.changes > 0) {
            const updatedBill = db.prepare(`
                SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color
                FROM bills b
                LEFT JOIN categories c ON b.category_id = c.id
                WHERE b.id = ?
            `).get(req.params.id);
            
            res.json(updatedBill);
        } else {
            res.status(404).json({ error: 'Bill not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除账单
app.delete('/api/bills/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM bills WHERE id = ?');
        const result = stmt.run(req.params.id);
        
        if (result.changes > 0) {
            res.json({ message: 'Bill deleted successfully' });
        } else {
            res.status(404).json({ error: 'Bill not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 分类相关API

// 获取所有分类
app.get('/api/categories', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM categories ORDER BY name');
        const categories = stmt.all();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 添加新分类
app.post('/api/categories', (req, res) => {
    try {
        const { name, type, color } = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO categories (name, type, color)
            VALUES (?, ?, ?)
        `);
        
        const result = stmt.run(name, type, color);
        
        const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新分类
app.put('/api/categories/:id', (req, res) => {
    try {
        const { name, type, color } = req.body;
        
        const stmt = db.prepare(`
            UPDATE categories 
            SET name = ?, type = ?, color = ?
            WHERE id = ?
        `);
        
        const result = stmt.run(name, type, color, req.params.id);
        
        if (result.changes > 0) {
            const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
            res.json(updatedCategory);
        } else {
            res.status(404).json({ error: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除分类
app.delete('/api/categories/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
        const result = stmt.run(req.params.id);
        
        if (result.changes > 0) {
            res.json({ message: 'Category deleted successfully' });
        } else {
            res.status(404).json({ error: 'Category not found' });
        }
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