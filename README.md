# PersonalWeb 个人数据中心

基于 Node.js + Express + SQLite3 + React 构建的现代化全栈个人网站系统。

## 功能特性

- **首页** (`/home`) - 3D卡片效果、AI对话助手、社交媒体链接、音乐/小说推荐
- **资源导航** (`/dashboard`) - 书签管理、分类搜索、点击统计、描述字段
- **收藏管理** (`/favorites`) - 收藏链接管理、描述字段
- **衣橱管理** (`/wardrobe`) - 服装分类管理、AI自动识别、橱窗穿搭生成、AI穿搭推荐
- **车辆管理** (`/vehicles`) - 车辆档案、维修记录、图片上传
- **充电记录** (`/records`) - 电动车充电记录、筛选统计、月度分析
- **数据分析** (`/analytics`) - Chart.js 可视化分析、充电/维修费用趋势、年份筛选
- **账单管理** (`/bill`) - 收支记录、分类管理、年度统计分析、滚动标签图表

## 技术栈

- **后端**: Node.js + Express + SQLite3 (better-sqlite3)
- **前端**: React 18 + Vite + React Router
- **图表**: Chart.js + ECharts + echarts-for-react
- **AI**: MiniMax API + 通义千问 (Qwen VL/Image)
- **认证**: JWT + bcryptjs

## 项目结构

```
Personal0303/
├── server.js              # 后端入口
├── package.json           # 后端依赖
├── data.db               # SQLite数据库(自动创建)
├── server/
│   └── routes/           # API路由
│       ├── auth.js       # 认证
│       ├── bookmarks.js  # 书签管理
│       ├── vehicles.js   # 车辆管理
│       ├── charging.js   # 充电记录
│       ├── bills.js      # 账单管理
│       ├── analytics.js  # 数据分析
│       └── settings.js   # 设置
├── uploads/              # 上传文件目录
├── frontend/             # 前端项目
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 公共组件
│   │   ├── context/     # React Context
│   │   └── App.jsx      # 主应用
│   └── package.json
└── prd.md               # 产品需求文档
```

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd /Users/zhangshichao/Documents/Workspace/Cursor/Personal0303
npm install

# 安装前端依赖
cd frontend
npm install
```

### 2. 本地启动服务

**终端1 - 启动后端服务器:**
```bash
cd /Users/zhangshichao/Documents/Workspace/Cursor/Personal0303
node server.js
```
服务运行在 http://localhost:3002

**终端2 - 启动前端开发服务器:**
```bash
cd /Users/zhangshichao/Documents/Workspace/Cursor/Personal0303/frontend
npm run dev
```
服务运行在 http://localhost:5173

### 3. 访问应用

打开浏览器访问 http://localhost:5173

## API 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/bookmarks` | GET/POST | 书签列表/添加 |
| `/api/favorites` | GET/POST | 收藏列表/添加 |
| `/api/vehicles` | GET/POST | 车辆列表/添加 |
| `/api/charging` | GET/POST | 充电记录列表/添加 |
| `/api/charging/monthly-stats` | GET | 月度充电统计 |
| `/api/bills` | GET/POST | 账单列表/添加 |
| `/api/wardrobe/*` | GET/POST | 衣橱管理 API |
| `/api/ai/*` | POST | AI 功能 API |
| `/api/analytics/*` | GET | 各类统计数据 |

## 生产环境部署

项目路径：`/www/wwwroot/zybh_jparm/Personal0303`

### 1. 上传项目

将本地 `Personal0303` 文件夹上传到服务器 `/www/wwwroot/zybh_jparm/`

### 2. 安装依赖

```bash
cd /www/wwwroot/zybh_jparm/Personal0303

# 安装后端依赖并重新编译 better-sqlite3
npm install && npm rebuild better-sqlite3

# 安装前端依赖
cd frontend && npm install
```

### 3. 构建前端

```bash
cd /www/wwwroot/zybh_jparm/Personal0303/frontend
npm run build
```

### 4. 配置网站目录

使用宝塔面板添加网站：
1. 宝塔面板 → 网站 → 添加站点
2. 填写域名或使用 IP
3. 网站目录填写：`/www/wwwroot/zybh_jparm`
4. 勾选"防跨站攻击"

### 5. 配置 Nginx

网站 → 设置 → 配置文件，替换为：

```nginx
server {
    listen 80;
    server_name _;

    root /www/wwwroot/zybh_jparm;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads {
        alias /www/wwwroot/zybh_jparm/uploads;
    }
}
```

保存后重载 Nginx

### 6. 复制静态文件

```bash
# 创建目录
mkdir -p /www/wwwroot/zybh_jparm/uploads

# 复制前端构建文件
cp -r /www/wwwroot/zybh_jparm/Personal0303/frontend/dist/* /www/wwwroot/zybh_jparm/

# 复制上传文件夹
cp -r /www/wwwroot/zybh_jparm/Personal0303/uploads/* /www/wwwroot/zybh_jparm/uploads/

# 修复权限
chown -R www:www /www/wwwroot/zybh_jparm
chmod -R 755 /www/wwwroot/zybh_jparm
```

### 7. 启动后端服务

**方式一：使用 PM2**
```bash
cd /www/wwwroot/zybh_jparm/Personal0303
pm2 start server.js --name personalweb
pm2 save
```

**方式二：使用宝塔 Node 项目**
1. 宝塔面板 → Node项目 → 添加 Node 项目
2. 配置：
   - 启动文件：`/www/wwwroot/zybh_jparm/Personal0303/server.js`
   - 端口：`3002`
   - 运行目录：`/www/wwwroot/zybh_jparm/Personal0303`

### 8. 开放端口

宝塔面板 → 安全 → 防火墙端口 → 添加端口：
- 80 (HTTP)
- 3002 (后端API)

### 9. 访问网站

打开浏览器访问：`http://你的服务器IP`

---

## 代码更新

```bash
cd /www/wwwroot/zybh_jparm/Personal0303

# 更新依赖
npm install && npm rebuild better-sqlite3

# 重新构建前端
cd frontend && npm run build

# 重启后端
pm2 restart personalweb
```

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 403 Forbidden | `chown -R www:www /www/wwwroot/zybh_jparm` |
| 502 Bad Gateway | 检查 PM2 状态：`pm2 status` |
| 空白页 | 按 F12 查看控制台错误 |

## 许可证

MIT License
