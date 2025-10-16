# 🚗 个人车辆管理系统

一个现代化的全栈车辆管理系统，集车辆信息管理、充电记录、费用统计和数据分析于一体。基于纯前端技术栈构建，支持本地数据存储和云端部署。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0-brightgreen.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue.svg)]()

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [API接口](#api接口)
- [部署指南](#部署指南)
- [使用指南](#使用指南)
- [数据管理](#数据管理)
- [移动端优化](#移动端优化)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [致谢](#致谢)

## ✨ 功能特性

### 🚙 车辆管理
- **车辆档案**: 品牌、型号、年份、车牌等完整信息管理
- **状态跟踪**: 实时查看车辆状态和基本信息
- **图片支持**: 支持车辆图片上传和展示

### ⚡ 充电记录管理
- **充电记录**: 详细记录每次充电的时间、地点、电量、费用等信息
- **自动计算**: 自动计算行驶里程、电量损耗等数据
- **数据统计**: 按月统计充电次数、行驶里程、充电费用

### 📊 数据分析与可视化
- **支出统计**: 按类型、时间段的费用分析
- **趋势图表**: 可视化展示费用变化趋势
- **年度报表**: 年度费用汇总和对比
- **环比分析**: 月度数据环比增长分析

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

## 📁 项目结构

```
PersonalWeb/
├── server.js              # Express服务器
├── vehicles.db           # SQLite数据库
├── package.json          # 项目配置
├── README.md            # 项目说明
├── index.html           # 首页
├── vehicles.html        # 车辆管理页面
├── records.html         # 充电记录页面
├── analytics.html       # 数据分析页面
├── dashboard.html       # 数据大盘
├── favorites.html       # 收藏夹
├── bill.html            # 账单页面
├── js/                  # JavaScript文件
│   ├── vehicles.js      # 车辆管理
│   ├── records.js       # 记录管理
│   ├── analytics.js     # 数据分析
│   └── bill.js          # 账单管理
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

## 🔧 API接口

### 车辆管理接口
- `GET /api/vehicles` - 获取所有车辆
- `POST /api/vehicles` - 添加新车辆
- `PUT /api/vehicles/:id` - 更新车辆信息
- `DELETE /api/vehicles/:id` - 删除车辆

### 记录管理接口
- `GET /api/vehicles/:id/records` - 获取车辆充电记录
- `POST /api/records` - 添加充电记录
- `PUT /api/records/:id` - 更新记录
- `DELETE /api/records/:id` - 删除记录

## 🚀 部署指南

### 一键部署（推荐）
```bash
# 赋予脚本执行权限
chmod +x scripts/deploy-full.sh

# 运行部署脚本（替换为你的服务器信息）
./scripts/deploy-full.sh username your-server-ip

# 注意：需要将js文件中的localhost替换为你的服务器地址
# 涉及文件：vehicles.js, analytics.js, records.js
```

### 手动部署
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

### 第二步：记录充电
1. 点击车辆卡片上的"查看记录"
2. 在记录页面点击"添加记录"
3. 填写充电信息（时间、地点、电量、费用等）
4. 系统会自动计算行驶里程和电量损耗
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

## 📱 移动端优化

- **响应式设计**: 完美适配手机和平板
- **触摸友好**: 优化的触摸交互体验
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
- **邮箱**: 17858803001@163.com
- **微信**: zaiyebuhui_0618

---

<div align="center">
  <p><strong>⭐ 如果这个项目对你有帮助，请给个Star! ⭐</strong></p>
  <p><em>持续更新中，敬请期待更多功能...</em></p>
</div>
