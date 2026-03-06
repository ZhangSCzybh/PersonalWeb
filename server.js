const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3002;

const db = new Database(path.join(__dirname, 'data.db'));

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastLoginAt DATETIME
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT,
      clickCount INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT,
      clickCount INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      licensePlate TEXT,
      color TEXT,
      vin TEXT,
      purchaseDate TEXT,
      purchasePrice REAL,
      currentMileage REAL DEFAULT 0,
      batteryCapacity REAL,
      imageUrl TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      vehicleId INTEGER NOT NULL,
      maintenanceType TEXT NOT NULL,
      maintenanceDate TEXT,
      mileage REAL,
      description TEXT,
      cost REAL,
      shop TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS charging_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      vehicleId INTEGER NOT NULL,
      chargingDate TEXT,
      previousMileage REAL,
      currentMileage REAL,
      drivingMileage REAL,
      startBattery REAL,
      endBattery REAL,
      chargingDuration INTEGER,
      meterCharging REAL,
      vehicleCharging REAL,
      powerLoss REAL,
      cost REAL,
      location TEXT,
      chargerType TEXT DEFAULT 'slow',
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bill_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      sortOrder INTEGER DEFAULT 0,
      isDefault INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      categoryId INTEGER,
      date TEXT,
      description TEXT,
      paymentMethod TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoryId) REFERENCES bill_categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS site_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pv INTEGER DEFAULT 1257,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO site_stats (id, pv) VALUES (1, 1257);

    CREATE TABLE IF NOT EXISTS wardrobe_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_category TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wardrobe_clothes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      category_id INTEGER NOT NULL,
      sub_category TEXT,
      image_url TEXT NOT NULL,
      image_url_original TEXT,
      color TEXT,
      rating INTEGER DEFAULT 3,
      season TEXT,
      brand TEXT,
      fabric TEXT,
      size TEXT,
      tags TEXT,
      price REAL,
      purchase_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES wardrobe_categories(id)
    );

    CREATE TABLE IF NOT EXISTS wardrobe_outfits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      occasion TEXT,
      season TEXT,
      ai_image_url TEXT,
      ai_suggestion TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wardrobe_outfit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outfit_id INTEGER NOT NULL,
      clothes_id INTEGER NOT NULL,
      item_type TEXT,
      FOREIGN KEY (outfit_id) REFERENCES wardrobe_outfits(id),
      FOREIGN KEY (clothes_id) REFERENCES wardrobe_clothes(id)
    );
  `);

  const wardrobeCategoryCount = db.prepare('SELECT COUNT(*) as count FROM wardrobe_categories').get();
  if (wardrobeCategoryCount.count === 0) {
    const insertWardrobeCategory = db.prepare('INSERT INTO wardrobe_categories (name, parent_category, icon, sort_order) VALUES (?, ?, ?, ?)');
    const wardrobeCategories = [
      ['外套', null, 'fa-tshirt', 1],
      ['内搭', null, 'fa-tshirt', 2],
      ['下装', null, 'fa-tshirt', 3],
      ['鞋子', null, 'fa-shoe-prints', 4],
      ['包包', null, 'fa-shopping-bag', 5],
    ];
    wardrobeCategories.forEach(([name, parent, icon, order]) => {
      insertWardrobeCategory.run(name, parent, icon, order);
    });

    const subCategories = [
      ['大衣', '外套'], ['皮衣', '外套'], ['套装', '外套'], ['羽绒服', '外套'], ['开衫', '外套'], ['马甲', '外套'], ['其他外套', '外套'],
      ['T恤', '内搭'], ['衬衫', '内搭'], ['卫衣', '内搭'], ['毛衣', '内搭'], ['内衣', '内搭'], ['吊带', '内搭'], ['连衣裙', '内搭'],
      ['短裤', '下装'], ['西裤', '下装'], ['牛仔裤', '下装'], ['休闲裤', '下装'], ['运动裤', '下装'], ['长裤', '下装'], ['半裙', '下装'], ['背带裤', '下装'], ['短裙', '下装'],
      ['休闲鞋', '鞋子'], ['运动鞋', '鞋子'], ['凉鞋', '鞋子'], ['皮鞋', '鞋子'], ['高跟鞋', '鞋子'], ['靴子', '鞋子'], ['其他鞋子', '鞋子'],
      ['钱包', '包包'], ['单肩包', '包包'], ['手拎包', '包包'], ['背包', '包包'], ['其他包', '包包'],
    ];
    subCategories.forEach(([name, parent]) => {
      insertWardrobeCategory.run(name, parent, 'fa-tshirt', 0);
    });
  }

  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM bill_categories').get();
  if (categoryCount.count === 0) {
    const expenseCategories = [
      ['餐饮', 'expense', 'fa-utensils', '#FF5733', 1],
      ['购物', 'expense', 'fa-shopping-bag', '#C70039', 2],
      ['交通', 'expense', 'fa-car', '#900C3F', 3],
      ['住房', 'expense', 'fa-home', '#FAAD3D', 4],
      ['医疗', 'expense', 'fa-hospital', '#DAF7A6', 5],
      ['教育', 'expense', 'fa-graduation-cap', '#581845', 6],
      ['娱乐', 'expense', 'fa-gamepad', '#900C3F', 7],
      ['通讯', 'expense', 'fa-phone', '#2ECC71', 8],
      ['其他', 'expense', 'fa-ellipsis-h', '#95A5A6', 9]
    ];
    const incomeCategories = [
      ['工资', 'income', 'fa-money-bill-wave', '#27AE60', 1],
      ['奖金', 'income', 'fa-gift', '#2ECC71', 2],
      ['投资', 'income', 'fa-chart-line', '#3498DB', 3],
      ['兼职', 'income', 'fa-briefcase', '#9B59B6', 4],
      ['礼金', 'income', 'fa-envelope-open', '#E74C3C', 5],
      ['其他', 'income', 'fa-ellipsis-h', '#95A5A6', 6]
    ];
    
    expenseCategories.forEach(cat => insertCategory.run(...cat));
    incomeCategories.forEach(cat => insertCategory.run(...cat));
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('adminadmin', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
  }
}

initDatabase();

function migrateUserId() {
  const tables = ['bookmarks', 'vehicles', 'maintenance', 'charging_records', 'bill_categories', 'bills'];
  tables.forEach(table => {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN userId INTEGER DEFAULT 1`).run();
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        console.log(`Migration ${table}:`, e.message);
      }
    }
  });
  
  try {
    db.prepare('ALTER TABLE users ADD COLUMN lastLoginAt DATETIME').run();
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log('Migration users lastLoginAt:', e.message);
    }
  }
}
migrateUserId();

app.set('db', db);

app.use('/api/auth', require('./server/routes/auth')(db));
app.use('/api/bookmarks', require('./server/routes/bookmarks')(db));
app.use('/api/favorites', require('./server/routes/favorites')(db));
app.use('/api/vehicles', require('./server/routes/vehicles')(db));
app.use('/api/charging', require('./server/routes/charging')(db));
app.use('/api/bills', require('./server/routes/bills')(db));
app.use('/api/analytics', require('./server/routes/analytics')(db));
app.use('/api/settings', require('./server/routes/settings')(db));
app.use('/api/ai', require('./server/routes/ai')(db));
app.use('/api/wardrobe', require('./server/routes/wardrobe')(db));

app.get('/api/stats/pv', (req, res) => {
  const stats = db.prepare('SELECT pv FROM site_stats WHERE id = 1').get();
  res.json({ pv: stats.pv });
});

app.post('/api/stats/pv', (req, res) => {
  db.prepare('UPDATE site_stats SET pv = pv + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = 1').run();
  const stats = db.prepare('SELECT pv FROM site_stats WHERE id = 1').get();
  res.json({ pv: stats.pv });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = { app, db };
