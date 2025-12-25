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
    title TEXT,
    notes TEXT,
    favicon TEXT,
    category TEXT,
    click_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;

// 添加迁移逻辑，如果title列不存在则添加
try {
    db.exec(`ALTER TABLE bookmarks ADD COLUMN title TEXT`);
} catch (err) {
    // 列可能已经存在，忽略错误
}

// 添加迁移逻辑，如果click_count列不存在则添加
try {
    db.exec(`ALTER TABLE bookmarks ADD COLUMN click_count INTEGER DEFAULT 0`);
} catch (err) {
    // 列可能已经存在，忽略错误
}

// 创建统计表
const createStatsTable = `
CREATE TABLE IF NOT EXISTS site_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visits_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;

// 添加迁移逻辑，初始化统计数据
try {
    db.exec(createStatsTable);
    
    // 检查是否已有统计数据，如果没有则初始化
    const statsCheck = db.prepare('SELECT COUNT(*) as count FROM site_stats').get();
    if (statsCheck.count === 0) {
        db.prepare('INSERT INTO site_stats (visits_count) VALUES (0)').run();
    }
} catch (err) {
    console.error('统计表创建失败:', err);
}

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

        // 参数验证
        if (!license_plate || !brand || !model) {
            return res.status(400).json({ error: '车牌号、品牌和型号是必填项' });
        }

        // 检查车牌号是否已存在
        const checkStmt = db.prepare('SELECT id FROM vehicles WHERE license_plate = ?');
        const existingVehicle = checkStmt.get(license_plate);
        
        if (existingVehicle) {
            return res.status(400).json({ error: '车牌号已存在，请使用其他车牌号' });
        }

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
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: '车牌号已存在，请使用其他车牌号' });
        } else {
            res.status(500).json({ error: error.message });
        }
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

        // 参数验证
        if (!license_plate || !brand || !model) {
            return res.status(400).json({ error: '车牌号、品牌和型号是必填项' });
        }

        // 检查要更新的车牌号是否已存在（排除当前车辆）
        const checkStmt = db.prepare('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?');
        const existingVehicle = checkStmt.get(license_plate, req.params.id);
        
        if (existingVehicle) {
            return res.status(400).json({ error: '车牌号已存在，请使用其他车牌号' });
        }

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
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: '车牌号已存在，请使用其他车牌号' });
        } else {
            res.status(500).json({ error: error.message });
        }
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

// 获取站点总访问量
app.get('/api/stats/total-visits', (req, res) => {
    try {
        // 增加一次访问量计数
        db.prepare('UPDATE site_stats SET visits_count = visits_count + 1, updated_at = CURRENT_TIMESTAMP').run();
        
        // 获取总访问量
        const stats = db.prepare('SELECT visits_count FROM site_stats LIMIT 1').get();
        
        res.json({
            totalVisits: stats.visits_count
        });
    } catch (error) {
        console.error('获取访问量统计失败:', error);
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
            charger_charging_kwh: record.charger_charging_kwh || 0,
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
            driven_mileage, meter_charging_kwh, charger_charging_kwh, charging_start_percentage,
            charging_end_percentage, car_charging_kwh, energy_loss_kwh, amount, notes
        } = req.body;

        const stmt = db.prepare(`
            INSERT INTO charging_records 
            (vehicle_id, date, location, previous_mileage, current_mileage,
             distance_driven, meter_kwh, charger_charging_kwh, battery_before, battery_after,
             car_kwh, energy_loss, amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            req.params.id, charging_date, charging_location, previous_mileage, current_mileage,
            driven_mileage, meter_charging_kwh, charger_charging_kwh || 0, charging_start_percentage, charging_end_percentage,
            car_charging_kwh, energy_loss_kwh, amount, notes
        );

        // 不再直接更新车辆总里程，让前端通过API获取计算后的总里程
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
            driven_mileage, meter_charging_kwh, charger_charging_kwh, charging_start_percentage,
            charging_end_percentage, car_charging_kwh, energy_loss_kwh, amount, notes
        } = req.body;

        const stmt = db.prepare(`
            UPDATE charging_records 
            SET date = ?, location = ?, previous_mileage = ?, 
                current_mileage = ?, distance_driven = ?, meter_kwh = ?,
                charger_charging_kwh = ?, battery_before = ?, battery_after = ?, 
                car_kwh = ?, energy_loss = ?, amount = ?, notes = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            charging_date, charging_location, previous_mileage, current_mileage,
            driven_mileage, meter_charging_kwh, charger_charging_kwh || 0, charging_start_percentage,
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
        const getRecordStmt = db.prepare('SELECT vehicle_id FROM charging_records WHERE id = ?');
        const record = getRecordStmt.get(req.params.id);
        
        if (!record) {
            return res.status(404).json({ error: 'Charging record not found' });
        }

        // 删除记录
        const deleteStmt = db.prepare('DELETE FROM charging_records WHERE id = ?');
        const result = deleteStmt.run(req.params.id);

        if (result.changes > 0) {
            // 不再直接更新车辆总里程，让前端通过API获取计算后的总里程
            res.json({ 
                message: 'Charging record deleted successfully',
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
        const { url, title, notes, favicon, category } = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO bookmarks (url, title, notes, favicon, category, click_count)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(url, title || '', notes || '', favicon || '', category || '', 0);
        
        const newBookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newBookmark);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新书签
app.put('/api/bookmarks/:id', (req, res) => {
    try {
        const { url, title, notes, favicon, category } = req.body;
        
        const stmt = db.prepare(`
            UPDATE bookmarks 
            SET url = ?, title = ?, notes = ?, favicon = ?, category = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        const result = stmt.run(url, title || '', notes || '', favicon || '', category || '', req.params.id);
        
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

// 增加书签点击次数
app.put('/api/bookmarks/:id/click', (req, res) => {
    try {
        const stmt = db.prepare(`
            UPDATE bookmarks 
            SET click_count = click_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        const result = stmt.run(req.params.id);
        
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

// 账单相关API

// 获取所有账单
app.get('/api/bills', (req, res) => {
    try {
        // 如果提供了年份参数，则按年份筛选
        if (req.query.year) {
            const year = req.query.year;
            const stmt = db.prepare(`
                SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color
                FROM bills b
                LEFT JOIN categories c ON b.category_id = c.id
                WHERE strftime('%Y', b.date) = ?
                ORDER BY b.date DESC
            `);
            const bills = stmt.all(year);
            res.json(bills);
        } else {
            // 如果没有提供年份参数，则返回所有账单
            const stmt = db.prepare(`
                SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color
                FROM bills b
                LEFT JOIN categories c ON b.category_id = c.id
                ORDER BY b.date DESC
            `);
            const bills = stmt.all();
            res.json(bills);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取本月账单统计（包括环比数据）
app.get('/api/bills/stats/monthly', (req, res) => {
    try {
        const targetYear = req.query.year || new Date().getFullYear();
        const currentDate = new Date();
        const currentYear = parseInt(targetYear);
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


// 更新维修记录
app.put('/api/maintenance/:id', (req, res) => {
    try {
        const {
            service_date, service_type, description, cost,
            mileage_at_service, service_location, next_service_date
        } = req.body;

        const stmt = db.prepare(`
            UPDATE maintenance_records 
            SET service_date = ?, service_type = ?, description = ?, cost = ?, 
                mileage_at_service = ?, service_location = ?, next_service_date = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            service_date, service_type, description, cost,
            mileage_at_service, service_location, next_service_date, req.params.id
        );

        if (result.changes > 0) {
            res.json({ id: req.params.id, ...req.body });
        } else {
            res.status(404).json({ error: 'Maintenance record not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取单个维修记录
app.get('/api/maintenance/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM maintenance_records WHERE id = ?');
        const record = stmt.get(req.params.id);
        if (record) {
            res.json(record);
        } else {
            res.status(404).json({ error: 'Maintenance record not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新维修记录
app.put('/api/maintenance/:id', (req, res) => {
    try {
        const {
            service_date, service_type, description, cost,
            mileage_at_service, service_location, next_service_date
        } = req.body;

        const stmt = db.prepare(`
            UPDATE maintenance_records 
            SET service_date = ?, service_type = ?, description = ?, cost = ?, 
                mileage_at_service = ?, service_location = ?, next_service_date = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            service_date, service_type, description, cost,
            mileage_at_service, service_location, next_service_date, req.params.id
        );

        if (result.changes > 0) {
            res.json({ id: req.params.id, ...req.body });
        } else {
            res.status(404).json({ error: 'Maintenance record not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除维修记录
app.delete('/api/maintenance/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM maintenance_records WHERE id = ?');
        const result = stmt.run(req.params.id);
        
        if (result.changes > 0) {
            res.json({ message: 'Maintenance record deleted successfully' });
        } else {
            res.status(404).json({ error: 'Maintenance record not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 账单页面密码验证API
app.post('/api/verify-bill-password', (req, res) => {
    try {
        const { password } = req.body;
        
        // 这里应该连接到数据库验证密码，暂时使用硬编码密码
        // 在实际应用中，您可能想要：
        // 1. 创建一个专门的密码表
        // 2. 使用加密存储密码（如bcrypt）
        // 3. 或者使用其他身份验证机制
        
        // 简单的密码验证（替换为您的实际密码）
        const isValidPassword = password === 'housebills';
        
        if (isValidPassword) {
            res.json({ success: true, message: '密码验证成功' });
        } else {
            res.status(401).json({ success: false, message: '密码错误' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 添加静态页面路由 - 将 /favorites 映射到 favorites.html
app.get('/favorites', (req, res) => {
    res.sendFile(path.join(__dirname, 'favorites.html'));
});

// 添加其他静态页面路由（如果需要）
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'analytics.html'));
});

app.get('/records', (req, res) => {
    res.sendFile(path.join(__dirname, 'records.html'));
});

app.get('/vehicles', (req, res) => {
    res.sendFile(path.join(__dirname, 'vehicles.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/bill', (req, res) => {
    res.sendFile(path.join(__dirname, 'bill.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚗 车辆管理服务器运行在端口 ${PORT}`);
    console.log(`📊 API文档: http://localhost:${PORT}/api`);
});

module.exports = app;