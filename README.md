# 🚗 个人车辆管理系统

一个现代化的全栈车辆管理系统，集车辆信息管理、费用记录、数据分析于一体。基于纯前端技术栈构建，支持本地数据存储和云端部署。

## ✨ 核心功能

### 🚙 车辆管理
- **车辆档案**: 品牌、型号、年份、车牌等完整信息管理
- **状态跟踪**: 实时查看车辆状态和基本信息
- **图片支持**: 支持车辆图片上传和展示

### 💰 费用记录
- **多类型记录**: 油费、维修、保养、保险、停车费等
- **详细记录**: 金额、日期、里程、备注信息
- **快速添加**: 一键记录日常费用支出

### 📊 数据分析
- **支出统计**: 按类型、时间段的费用分析
- **趋势图表**: 可视化展示费用变化趋势
- **年度报表**: 年度费用汇总和对比

### 🤖 AI智能助手
- **智能对话**: 集成AI聊天功能
- **数据洞察**: 智能分析费用数据
- **使用建议**: 基于数据的用车建议

## 🛠️ 技术栈

- **前端**: 纯HTML5 + CSS3 + JavaScript (无框架依赖)
- **后端**: Node.js + Express
- **数据库**: SQLite3 (本地文件存储)
- **部署**: PM2进程管理
- **样式**: 响应式设计，移动端友好

## 🚀 快速开始

### 本地开发环境

```bash
# 克隆项目
git clone https://github.com/ZhangSCzybh/PersonalWeb.git
cd PersonalWeb

# 安装依赖
npm install

# 启动开发服务器
npm start
# 或
node server.js

# 访问 http://localhost:3001
```

### 生产环境部署

#### 一键部署（推荐）
```bash
# 赋予脚本执行权限
chmod +x scripts/deploy-full.sh

# 运行部署脚本（替换为你的服务器信息）
./scripts/deploy-full.sh username your-server-ip

# js文件里的localhost需要替换成自己服务器
vehicles.js\analytics.js\records.js
```


#### 手动部署
```bash
# 1. 打包项目
tar --exclude='node_modules' --exclude='.git' --exclude='*.log' -czf personalweb-deploy.tar.gz .

# 2. 上传到服务器
scp personalweb-deploy.tar.gz username@your-server-ip:/home/username/

# 3. 登录服务器解压并启动
ssh username@your-server-ip
# 在服务器上执行
tar -xzf personalweb-deploy.tar.gz
cd PersonalWeb
npm install
pm2 start server.js --name "vehicle-manager"
```

## 📁 项目结构

```
PersonalWeb/
├── server.js              # Express服务器
├── vehicles.db           # SQLite数据库
├── package.json          # 项目配置
├── README.md            # 项目说明
├── index.html           # 首页
├── vehicles.html        # 车辆管理页面
├── records.html         # 费用记录页面
├── analytics.html       # 数据分析页面
├── dashboard.html       # 数据大盘
├── favorites.html       # 收藏夹
├── js/                  # JavaScript文件
│   ├── config.js        # 全局配置
│   ├── vehicles-safe.js # 车辆管理（安全版本）
│   ├── records-safe.js  # 记录管理（安全版本）
│   └── analytics.js     # 数据分析
├── css/                 # 样式文件
├── images/              # 图片资源
└── scripts/             # 部署脚本
    ├── deploy-full.sh   # 一键部署脚本
    └── check-db.sh      # 数据库检查脚本
```

## ⚙️ 环境要求

- **Node.js**: 14.0 或更高版本
- **npm**: 6.0 或更高版本
- **端口**: 3001 (可在环境变量中配置)
- **操作系统**: Linux/macOS/Windows

## 🔧 配置说明

### 环境变量
```bash
# 端口配置（可选，默认3001）
export PORT=3001

# 数据库路径（可选，默认vehicles.db）
export DB_PATH=./vehicles.db
```

### API端点
- **GET /api/vehicles** - 获取所有车辆
- **POST /api/vehicles** - 添加新车辆
- **PUT /api/vehicles/:id** - 更新车辆信息
- **DELETE /api/vehicles/:id** - 删除车辆
- **GET /api/vehicles/:id/records** - 获取车辆费用记录
- **POST /api/records** - 添加费用记录
- **PUT /api/records/:id** - 更新记录
- **DELETE /api/records/:id** - 删除记录

## 📱 移动端优化

- **响应式设计**: 完美适配手机和平板
- **触摸友好**: 优化的触摸交互体验
- **离线支持**: PWA支持（计划中）
- **性能优化**: 快速加载和流畅操作

## 🔍 常见问题

### Q: 部署后页面正常但无数据？
A: 确保数据库文件 `vehicles.db` 已正确上传到服务器，并且应用有读写权限。

### Q: 如何备份数据？
A: 直接备份 `vehicles.db` 文件即可，所有数据都存储在这个SQLite数据库中。

### Q: 如何修改默认端口？
A: 在启动前设置环境变量 `PORT=新端口号`，或修改 `server.js` 中的默认端口。

### Q: 如何添加新车辆？
A: 在 `vehicles.html` 页面点击"添加车辆"按钮，填写相关信息即可。

## 🚀 部署平台支持

### 推荐方案
- **Vercel**: 零配置部署，全球CDN
- **Netlify**: 持续集成，分支预览
- **阿里云ECS**: 国内访问优化
- **腾讯云CVM**: 稳定可靠

### Docker部署（可选）
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

## 🎯 使用指南

### 第一步：添加车辆
1. 访问 `vehicles.html`
2. 点击"添加车辆"
3. 填写车辆信息（品牌、型号、年份、车牌）
4. 保存后车辆将出现在列表中

### 第二步：记录费用
1. 点击车辆卡片上的"查看记录"
2. 在记录页面点击"添加记录"
3. 选择费用类型（油费、维修等）
4. 填写金额、日期、里程等信息
5. 保存后可在列表中查看

### 第三步：数据分析
1. 访问 `analytics.html`
2. 查看费用统计图表
3. 按时间段筛选数据
4. 导出分析报告

## 🔄 数据管理

### 数据备份
```bash
# 备份数据库
cp vehicles.db vehicles_backup_$(date +%Y%m%d).db

# 导出数据为SQL
sqlite3 vehicles.db .dump > backup.sql
```

### 数据恢复
```bash
# 恢复数据库
cp vehicles_backup.db vehicles.db

# 从SQL文件恢复
sqlite3 vehicles.db < backup.sql
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

### 开发规范
- 使用ES6+语法
- 遵循Airbnb代码规范
- 添加必要的注释
- 确保移动端兼容性

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- **设计灵感**: Apple官网、Material Design
- **技术栈**: Node.js、Express、SQLite3
- **图标**: Font Awesome
- **图表**: Chart.js

## 📞 联系方式

- **GitHub**: [ZhangSCzybh](https://github.com/ZhangSCzybh)
- **邮箱**: zhangshichao@example.com
- **微信**: zaiyebuhui_0618
---

<div align="center">
  <p><strong>⭐ 如果这个项目对你有帮助，请给个Star! ⭐</strong></p>
  <p><em>持续更新中，敬请期待更多功能...</em></p>
</div>
