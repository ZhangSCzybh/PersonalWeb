# PersonalWeb 产品需求文档 (PRD)

## 目录

1. [产品概述](#1-产品概述)
2. [功能需求](#2-功能需求)
3. [用户界面设计](#3-用户界面设计)
4. [技术架构](#4-技术架构)
5. [数据模型设计](#5-数据模型设计)
6. [API 接口详细规格](#6-api-接口详细规格)
7. [非功能需求](#7-非功能需求)
8. [用户角色与权限](#8-用户角色与权限)
9. [验收标准](#9-验收标准)
10. [项目里程碑](#10-项目里程碑)

---

## 1. 产品概述

### 1.1 产品简介

PersonalWeb 是一个基于 Node.js + Express + SQLite3 构建的现代化全栈个人网站系统。该系统集成了车辆信息管理、充电记录、车辆数据分析和个人记账、资源导航等多个功能模块，为用户提供一站式个人数据管理解决方案。

### 1.2 产品定位

| 维度 | 描述 |
|------|------|
| **目标用户** | 个人用户，需要管理车辆信息、个人财务、收藏资源等数据 |
| **使用场景** | 本地部署的家庭服务器或个人云服务器 |
| **核心价值** | 统一管理个人数据，提供可视化分析和便捷的访问入口 |
| **部署方式** | 本地部署，支持 Docker 和 PM2 |

### 1.3 产品愿景

打造一个轻量级、功能全面、易于部署的个人数据中心，让用户能够轻松管理各种个人数据，并通过现代化的前端界面获得良好的使用体验。

### 1.4 核心用户流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户访问流程                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐          │
│   │  访问首页  │────▶│ 选择功能  │────▶│  登录验证  │────▶│ 使用功能  │          │
│   │  /home   │     │          │     │ (可选)    │     │          │          │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘          │
│        │                                                            │       │
│        │              ┌──────────────────────────────────────────┘       │
│        │              │                                                    │
│        ▼              ▼                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                        功能模块入口                              │      │
│   ├──────────┬──────────┬──────────┬──────────┬───────────────────┤      │
│   │  资源导航  │  车辆管理  │  充电记录  │  数据分析  │    账单管理      │      │
│   │ /dashboard│ /vehicles │ /records │ /analytics│    /bill        │      │
│   └──────────┴──────────┴──────────┴──────────┴───────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 功能需求

### 2.1 核心功能模块

#### 2.1.1 个人首页 (/home)

| 功能点 | 描述 | 优先级 | 详细规格 |
|--------|------|--------|----------|
| 3D卡片效果 | 现代化视觉设计 | P1 | 使用 CSS 3D transform 实现卡片翻转效果，支持 hover 动画 |
| AI对话功能 | 内置AI聊天助手 | P1 | 集成 ChatGPT API 接口，支持流式响应，可配置 API Key |
| 社交媒体链接 | 抖音、微信、Telegram、GitHub链接 | P0 | 使用 Font Awesome 图标，点击跳转外部链接 |
| 音乐推荐 | 喜欢的歌曲展示 | P2 | 展示 5 首推荐歌曲，点击跳转网易云音乐 |
| 小说链接 | 收藏的小说推荐 | P2 | 展示 3-5 本小说封皮和名称，点击跳转阅读页面 |

**页面布局规格：**
- 顶部：顶部导航栏（固定定位）
- 主体：3D 卡片网格（2-3列），卡片内包含功能入口
- 底部：社交媒体图标链接区域

#### 2.1.2 资源导航中心 (/dashboard)

| 功能点 | 描述 | 优先级 | 详细规格 |
|--------|------|--------|----------|
| 快速链接 | 分类管理常用网站链接 | P0 | 支持多分类，每分类最多20个书签 |
| 搜索功能 | 快速搜索书签 | P1 | 实时搜索，支持标题和URL模糊匹配 |
| 点击统计 | 书签使用频率统计 | P2 | 记录点击次数，按热度排序显示 |
| 拖拽排序 | 自定义链接顺序 | P2 | 使用 HTML5 Drag and Drop API 实现 |

**分类管理规格：**
```
分类结构：
├── 常用网站
│   ├── Google
│   ├── GitHub
│   └── Stack Overflow
├── 开发工具
│   ├── VS Code
│   └── Docker Hub
└── 娱乐
    ├── YouTube
    └── Netflix
```

**书签数据模型：**
```javascript
{
  id: Number,
  title: String,        // 必填，最大50字符
  url: String,          // 必填，有效URL
  category: String,     // 必填，分类名称
  icon: String,         // 可选，Font Awesome图标类名
  clickCount: Number,   // 默认0
  sortOrder: Number,    // 排序权重
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.1.3 车辆管理页面 (/vehicles)

| 功能点 | 描述 | 优先级 | 详细规格 |
|--------|------|--------|----------|
| 车辆档案管理 | 品牌、型号、年份、车牌等完整信息 | P0 | CRUD 操作，必填字段：品牌、型号 |
| 状态跟踪 | 实时查看车辆状态和基本信息 | P0 | 显示当前里程、电池电量、最后更新时间 |
| 图片支持 | 车辆图片上传和展示 | P1 | 支持本地存储，限制 2MB，支持 jpg/png/webp |
| 维修记录 | 维修时间、类型、费用 | P1 | 维修类型：保养/维修/保险/检车/其他 |
| 充电记录 | 充电时间、地点、电量、费用 | P1 | 详细字段见数据模型章节 |
| 自动计算 | 行驶里程、电量损耗 | P2 | 基于充电记录自动计算 |

**车辆档案字段：**
```javascript
{
  id: Number,
  brand: String,          // 必填，车辆品牌
  model: String,           // 必填，车型
  year: Number,           // 必填，年份
  licensePlate: String,   // 车牌号
  color: String,          // 颜色
  vin: String,            // 车架号
  purchaseDate: Date,     // 购买日期
  purchasePrice: Number,  // 购买价格
  currentMileage: Number, // 当前里程（公里）
  batteryCapacity: Number,// 电池容量（kWh）
  imageUrl: String,       // 车辆图片路径
  status: String,         // 状态：active/inactive/maintenance/unused/sold
  notes: String,          // 备注
  createdAt: Date,
  updatedAt: Date
}
```

**维修记录字段：**
```javascript
{
  id: Number,
  vehicleId: Number,      // 外键
  maintenanceType: String,// 保养/维修/保险/检车/其他
  maintenanceDate: Date,  // 维修日期
  mileage: Number,        // 送修时里程
  description: String,    // 维修描述
  cost: Number,           // 费用（元）
  shop: String,           // 维修店
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.1.4 充电记录页面 (/records)

| 功能点 | 描述 | 优先级 | 详细规格 |
|--------|------|--------|----------|
| 充电记录列表 | 所有充电记录展示 | P0 | 分页展示，每页20条 |
| 添加充电记录 | 新增充电记录 | P0 | 表单验证必填字段 |
| 编辑充电记录 | 修改充电信息 | P1 | 预填充原数据 |
| 删除充电记录 | 删除单条记录 | P1 | 二次确认弹窗 |
| 筛选功能 | 按车辆/时间筛选 | P2 | 日期范围选择器 |

**充电记录字段：**
```javascript
{
  id: Number,
  vehicleId: Number,      // 外键，关联车辆
  chargingDate: Date,    // 充电日期时间
  startMileage: Number,   // 充电起始里程
  endMileage: Number,     // 充电结束里程
  startBattery: Number,  // 充电前电量（%）
  endBattery: Number,    // 充电后电量（%）
  chargingDuration: Number, // 充电时长（分钟）
  electricityUsed: Number,   // 用电量（kWh）
  cost: Number,           // 充电费用（元）
  location: String,       // 充电地点
  chargerType: String,    // 充电桩类型：slow/fast/super
  notes: String,         // 备注
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.1.5 数据分析与可视化页面 (/analytics)

| 功能点 | 描述 | 优先级 | 详细规格 |
|--------|------|--------|----------|
| 支出统计 | 按类型、时间段费用分析 | P1 | 饼图+柱状图组合 |
| 趋势图表 | 费用变化趋势 | P1 | 折线图，支持月/季度/年度视图 |
| 年度报表 | 年度费用汇总对比 | P2 | 表格+图表双视图 |
| 充电分析 | 充电数据统计分析 | P2 | 充电频次、费用、里程统计 |

**图表规格：**
- 使用 Chart.js 库
- 配色方案：主色 #4F46E5，辅助色 #10B981
- 响应式尺寸，保持 16:9 比例
- 支持导出为 PNG

**统计指标：**
```
月度支出 = Σ(维修费用) + Σ(充电费用)
平均月支出 = 月度支出 / 月数
充电频次 = 充电次数 / 月数
百公里电耗 = 充电电量 / (结束里程 - 开始里程) * 100
```

#### 2.1.6 个人记账系统页面 (/bill)

| 功能点 | 描述 | 优先级 | 详细规格 |
|--------|------|--------|----------|
| 账单记录 | 收入支出详细记录 | P0 | 支持添加、编辑、删除 |
| 分类管理 | 自定义账单分类 | P0 | 收入分类、支出分类独立管理 |
| 年度统计 | 按年份账单汇总 | P1 | 年度收支对比 |
| 密码保护 | 账单页面密码访问 | P1 | SHA256 加密存储 |
| 环比分析 | 月度数据环比增长 | P2 | 百分比显示增长/下降 |

**账单字段：**
```javascript
{
  id: Number,
  type: String,           // income/expense
  amount: Number,         // 金额（元），精确到分
  categoryId: Number,     // 外键，关联分类
  date: Date,             // 账单日期
  description: String,    // 描述
  paymentMethod: String,  // 支付方式：cash/alipay/wechat/bankcard/other
  notes: String,          // 备注
  createdAt: Date,
  updatedAt: Date
}
```

**分类字段：**
```javascript
{
  id: Number,
  name: String,           // 分类名称
  type: String,          // income/expense
  icon: String,          // Font Awesome 图标
  color: String,         // 颜色代码，如 #FF5733
  sortOrder: Number,     // 排序
  isDefault: Boolean,    // 是否默认分类
  createdAt: Date
}
```

**默认分类：**
```
支出分类：餐饮、购物、交通、住房、医疗、教育、娱乐、通讯、其他
收入分类：工资、奖金、投资、兼职、礼金、其他
```

#### 2.1.7 用户认证系统

| 功能点 | 描述 | 优先级 | 详细规格 |
|--------|------|--------|----------|
| 多角色权限 | 支持多个用户角色 | P1 | 角色：admin/dashboard/vehicles |
| 页面访问控制 | 基于角色访问限制 | P1 | 前端路由守卫+后端中间件 |
| 本地存储 | localStorage 登录状态 | P1 | 7天有效期 |

**认证流程：**
```
1. 用户访问受保护页面
2. 检查 localStorage 中的 token 和 role
3. 验证角色权限
4. 允许访问或重定向到首页
5. token 过期时提示重新登录
```

### 2.2 页面结构与路由

| 页面 | 路由 | 描述 | 访问权限 | 开发组件 |
|------|------|------|----------|----------|
| 首页 | /home | 个人首页 | 公开 | Header, HeroSection, SocialLinks, AIChat, BookmarkCards |
| 资源库 | /dashboard | 资源导航中心 | dashboard/admin | CategoryTabs, BookmarkGrid, SearchBar, AddBookmarkModal |
| 车辆管理 | /vehicles | 车辆列表与详情 | vehicles/admin | VehicleList, VehicleCard, AddVehicleModal, VehicleDetail |
| 充电记录 | /records | 充电记录列表 | vehicles/admin | ChargingTable, ChargingForm, FilterBar |
| 数据分析 | /analytics | 数据可视化 | vehicles/admin | ChartPanel, DateRangePicker, StatsCards |
| 账单管理 | /bill | 个人记账 | admin | BillTable, BillForm, CategoryManager, StatsPanel |

### 2.3 功能模块依赖关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            功能模块依赖图                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌──────────┐                                   │
│                              │   首页    │                                   │
│                              │  /home   │                                   │
│                              └────┬─────┘                                   │
│                                   │                                          │
│           ┌──────────────────────┼──────────────────────┐                  │
│           │                      │                      │                  │
│           ▼                      ▼                      ▼                  │
│    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐            │
│    │  资源导航    │       │  车辆管理    │       │  账单管理    │            │
│    │ /dashboard  │       │ /vehicles   │       │    /bill   │            │
│    └──────┬──────┘       └──────┬──────┘       └──────┬──────┘            │
│           │                    │                      │                    │
│           │              ┌─────┴─────┐                │                    │
│           │              │            │                │                    │
│           │              ▼            ▼                │                    │
│           │       ┌──────────┐ ┌──────────┐            │                    │
│           │       │ 充电记录  │ │ 数据分析  │            │                    │
│           │       │ /records │ │/analytics │            │                    │
│           │       └──────────┘ └──────────┘            │                    │
│           │                                            │                    │
│           └────────────────────────────────────────────┘                    │
│                              │                                              │
│                              ▼                                              │
│                       ┌─────────────┐                                       │
│                       │   用户认证   │                                       │
│                       │  Auth System│                                       │
│                       └─────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 用户界面设计

### 3.1 设计规范

#### 3.1.1 色彩系统

| 用途 | 颜色代码 | 使用场景 |
|------|----------|----------|
| 主色 | #4F46E5 | 按钮、链接、强调元素 |
| 主色浅 | #818CF8 | hover 状态、背景 |
| 主色深 | #3730A3 | active 状态 |
| 辅助色 | #10B981 | 成功状态、收入 |
| 警告色 | #F59E0B | 警告状态 |
| 错误色 | #EF4444 | 错误状态、支出 |
| 背景色 | #F9FAFB | 页面背景 |
| 卡片背景 | #FFFFFF | 卡片、模态框 |
| 文字主色 | #111827 | 标题、正文 |
| 文字次色 | #6B7280 | 描述、辅助信息 |
| 边框色 | #E5E7EB | 分隔线、输入框边框 |

#### 3.1.2 字体系统

| 用途 | 字体 | 大小 | 字重 |
|------|------|------|------|
| 标题 H1 | Inter | 32px | 700 |
| 标题 H2 | Inter | 24px | 600 |
| 标题 H3 | Inter | 20px | 600 |
| 正文 | Inter | 16px | 400 |
| 辅助文字 | Inter | 14px | 400 |
| 小字 | Inter | 12px | 400 |
| 代码 | Fira Code | 14px | 400 |

#### 3.1.3 间距系统

```
基础单位：4px
xs: 4px    - 紧凑间距
sm: 8px    - 组件内部间距
md: 16px   - 组件间距
lg: 24px   - 区块间距
xl: 32px   - 页面间距
2xl: 48px  - 大区块间距
```

#### 3.1.4 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| sm | < 640px | 单列布局 |
| md | 640px - 1024px | 双列布局 |
| lg | > 1024px | 多列布局 |

### 3.2 组件规格

#### 3.2.1 导航栏

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PersonalWeb                              [首页] [资源库] [车辆] [账单]   │
│  Logo                                      Nav Links              Avatar   │
└─────────────────────────────────────────────────────────────────────────────┘
高度：64px
背景：#FFFFFF
阴影：0 1px 3px rgba(0,0,0,0.1)
Logo：左侧 24px 边距
导航链接：右侧，间距 24px
移动端：汉堡菜单，点击展开下拉列表
```

#### 3.2.2 卡片组件

```
┌──────────────────────────────────┐
│  ┌──────────┐                    │
│  │          │    标题文字        │
│  │   图标    │    描述内容        │
│  │          │    2024-01-01      │
│  └──────────┘                    │
└──────────────────────────────────┘
圆角：12px
阴影：0 4px 6px rgba(0,0,0,0.1)
Padding：16px
Hover：上移 4px，阴影加深
```

#### 3.2.3 表格组件

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  搜索框                      [+ 添加按钮]                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  #    名称        日期        金额      操作                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  1    午餐支出   2024-01-01   ¥25.00   [编辑] [删除]                       │
│  2    工资收入   2024-01-01   ¥5000    [编辑] [删除]                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  <<  1  2  3  4  5  >>    显示 1-10 条，共 100 条                         │
└─────────────────────────────────────────────────────────────────────────────┘
表头背景：#F3F4F6
斑马纹：奇数行 #FFFFFF，偶数行 #F9FAFB
行高：48px
操作按钮：文字按钮，hover 显示
分页：底部固定，每页 10/20/50 条可选
```

#### 3.2.4 表单组件

```
┌─────────────────────────────────────────────────────────────┐
│  字段标签                                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 输入框占位符                                      [图标]│  │
│  └───────────────────────────────────────────────────────┘  │
│  辅助说明文字                                                │
└─────────────────────────────────────────────────────────────┘
输入框高度：40px
边框：1px solid #E5E7EB
Focus：边框变为 #4F46E5
错误状态：边框变为 #EF4444，显示错误信息
必填标记：标签前红色 * 号
```

#### 3.2.5 模态框

```
┌─────────────────────────────────────────────────────────────────┐
│                                     × (右上角关闭)              │
│                                                                 │
│                     模态框标题                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │                    表单内容区域                         │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                     [取消]              [确定]                 │
└─────────────────────────────────────────────────────────────────┘
宽度：500px（最大宽度 90vw）
背景遮罩：rgba(0,0,0,0.5)
圆角：16px
动画：淡入 + 缩放
```

### 3.3 页面布局

#### 3.3.1 首页布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              顶部导航栏                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌─────────────────────┐                              │
│                        │                     │                              │
│                        │     3D 卡片区域      │                              │
│                        │                     │                              │
│                        │   [资源库] [车辆]   │                              │
│                        │                     │                              │
│                        │   [账单] [数据分析] │                              │
│                        │                     │                              │
│                        └─────────────────────┘                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │    AI 对话助手       │  │    社交媒体链接       │                        │
│  │                      │  │  [抖音] [微信] [GitHub]│                        │
│  │   对话区域           │  │                      │                        │
│  │                      │  │    音乐/小说推荐      │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                              页脚                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 数据分析页面布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              顶部导航栏                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  数据分析                                            年份选择：[2024 ▼]    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │  总支出           │  │  总收入          │  │  充电次数        │           │
│  │  ¥12,345         │  │  ¥60,000         │  │  48 次           │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
├─────────────────────────────────────────────────────────────────────────────┤
│                    ┌──────────────────────────────┐                          │
│                    │                              │                          │
│                    │        支出趋势图表          │                          │
│                    │        （折线图）            │                          │
│                    │                              │                          │
│                    └──────────────────────────────┘                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐       │
│  │       支出分类饼图          │  │        充电记录趋势             │       │
│  │   餐饮 ████ 30%            │  │        （柱状图）                │       │
│  │   交通 ████ 25%            │  │                                 │       │
│  │   购物 ████ 20%           │  │                                 │       │
│  └─────────────────────────────┘  └─────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 技术架构

### 4.1 技术栈详情

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端 | HTML5 | - | 页面结构 |
| 前端 | CSS3 | - | 样式与动画 |
| 前端 | JavaScript | ES6+ | 交互逻辑 |
| 前端图表 | Chart.js | ^4.0 | 数据可视化 |
| 前端图标 | Font Awesome | ^6.4 | 图标库 |
| 前端字体 | Google Fonts (Inter) | - | 字体 |
| 后端 | Node.js | ^18.0 | 运行时 |
| 后端 | Express | ^4.18 | Web 框架 |
| 数据库 | SQLite3 | - | 轻量级数据库 |
| 数据库驱动 | better-sqlite3 | ^9.0 | 高性能驱动 |
| 中间件 | CORS | ^2.8 | 跨域资源共享 |
| 开发工具 | Nodemon | ^2.0 | 热重载 |
| 部署 | PM2 | ^5.0 | 进程管理 |
| 部署 | Docker | - | 容器化 |

### 4.2 项目目录结构

```
PersonalWeb/
├── server/
│   ├── index.js              # 入口文件
│   ├── database.js          # 数据库初始化
│   ├── routes/
│   │   ├── vehicles.js      # 车辆路由
│   │   ├── charging.js      # 充电记录路由
│   │   ├── maintenance.js   # 维修记录路由
│   │   ├── bills.js         # 账单路由
│   │   ├── categories.js    # 分类路由
│   │   ├── bookmarks.js     # 书签路由
│   │   └── stats.js         # 统计路由
│   ├── middleware/
│   │   └── auth.js          # 认证中间件
│   └── uploads/             # 上传文件目录
├── public/
│   ├── index.html           # 首页
│   ├── css/
│   │   ├── style.css        # 主样式
│   │   └── components.css   # 组件样式
│   ├── js/
│   │   ├── app.js           # 主逻辑
│   │   ├── api.js           # API 调用
│   │   ├── auth.js          # 认证逻辑
│   │   └── charts.js        # 图表逻辑
│   ├── images/              # 图片资源
│   └── icons/               # 图标资源
├── data/                    # SQLite 数据库文件
├── Dockerfile               # Docker 配置
├── docker-compose.yml       # Docker Compose 配置
├── ecosystem.config.js      # PM2 配置
└── package.json             # 依赖配置
```

### 4.3 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              系统架构图                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │                           客户端                                 │      │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐ │      │
│   │  │  Chrome │  │ Firefox │  │ Safari  │  │  Edge  │  │ 移动端 │ │      │
│   │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └───┬───┘ │      │
│   └───────┼───────────┼───────────┼───────────┼─────────────┼─────┘      │
│           │           │           │           │             │            │
│           └───────────┴───────────┴───────────┴─────────────┘            │
│                                       │                                    │
│                                       ▼                                    │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │                        Node.js + Express                         │      │
│   │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │      │
│   │  │  路由层     │  │ 中间件层   │  │  控制器层  │  │  认证层    │  │      │
│   │  │  Routes    │  │ Middleware │  │ Controllers│  │  Auth      │  │      │
│   │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │      │
│   └─────────────────────────┬──────────────────────────────────────────┘      │
│                             │                                                │
│                             ▼                                                │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │                      better-sqlite3                              │      │
│   │  ┌─────────────────────────────────────────────────────────┐    │      │
│   │  │                    SQLite3 数据库                        │    │      │
│   │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │    │      │
│   │  │  │ vehicles│ │ charging│ │ bills  │ │categories│ │bookmarks│ │    │      │
│   │  │  └────────┘ └────────┘ └────────┘ └────────┘ └───────┘ │    │      │
│   │  └─────────────────────────────────────────────────────────┘    │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 数据模型设计

### 5.1 车辆表 (vehicles)

| 字段 | 类型 | 必填 | 默认值 | 约束 | 描述 |
|------|------|------|--------|------|------|
| id | INTEGER | 是 | 自增 | PRIMARY KEY | 主键 |
| brand | TEXT | 是 | - | NOT NULL | 车辆品牌 |
| model | TEXT | 是 | - | NOT NULL | 车型 |
| year | INTEGER | 是 | - | NOT NULL | 出厂年份 |
| license_plate | TEXT | 否 | - | - | 车牌号 |
| color | TEXT | 否 | - | - | 车辆颜色 |
| vin | TEXT | 否 | - | - | 车架号 (17位) |
| purchase_date | TEXT | 否 | - | - | 购买日期 (YYYY-MM-DD) |
| purchase_price | REAL | 否 | - | - | 购买价格 (元) |
| current_mileage | INTEGER | 否 | 0 | - | 当前里程 (公里) |
| battery_capacity | REAL | 否 | - | - | 电池容量 (kWh) |
| image_url | TEXT | 否 | - | - | 车辆图片路径 |
| status | TEXT | 否 | 'active' | CHECK(status IN ('active','inactive','maintenance','unused','sold')) | 车辆状态 |
| notes | TEXT | 否 | - | - | 备注信息 |
| created_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 创建时间 |
| updated_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 更新时间 |

**索引：**
```sql
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_brand ON vehicles(brand);
```

---

### 5.2 维修记录表 (maintenance)

| 字段 | 类型 | 必填 | 默认值 | 约束 | 描述 |
|------|------|------|--------|------|------|
| id | INTEGER | 是 | 自增 | PRIMARY KEY | 主键 |
| vehicle_id | INTEGER | 是 | - | FOREIGN KEY | 关联车辆ID |
| date | TEXT | 是 | - | NOT NULL | 维修日期 |
| type | TEXT | 是 | - | NOT NULL, CHECK(type IN ('maintenance','repair','insurance','inspection','other')) | 维修类型 |
| description | TEXT | 否 | - | - | 维修描述 |
| cost | REAL | 否 | 0 | - | 维修费用 (元) |
| mileage | INTEGER | 否 | - | - | 维修时里程 |
| shop | TEXT | 否 | - | - | 维修店/4S店 |
| created_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 创建时间 |
| updated_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 更新时间 |

**维修类型说明：**
| 类型 | 中文名 | 说明 |
|------|--------|------|
| maintenance | 保养 | 常规保养、更换机油等 |
| repair | 维修 | 故障维修、更换配件 |
| insurance | 保险 | 车险、理赔 |
| inspection | 检车 | 年检、验车 |
| other | 其他 | 其他相关支出 |

**索引：**
```sql
CREATE INDEX idx_maintenance_vehicle ON maintenance(vehicle_id);
CREATE INDEX idx_maintenance_date ON maintenance(date);
CREATE INDEX idx_maintenance_type ON maintenance(type);
```

---

### 5.3 充电记录表 (charging)

| 字段 | 类型 | 必填 | 默认值 | 约束 | 描述 |
|------|------|------|--------|------|------|
| id | INTEGER | 是 | 自增 | PRIMARY KEY | 主键 |
| vehicle_id | INTEGER | 是 | - | FOREIGN KEY | 关联车辆ID |
| date | TEXT | 是 | - | NOT NULL | 充电日期时间 |
| start_mileage | INTEGER | 否 | - | - | 充电前里程 |
| end_mileage | INTEGER | 否 | - | - | 充电后里程 |
| start_battery | INTEGER | 否 | - | CHECK(start_battery >= 0 AND start_battery <= 100) | 充电前电量 (%) |
| end_battery | INTEGER | 否 | - | CHECK(end_battery >= 0 AND end_battery <= 100) | 充电后电量 (%) |
| electricity_used | REAL | 否 | - | - | 用电量 (kWh) |
| duration | INTEGER | 否 | - | - | 充电时长 (分钟) |
| cost | REAL | 否 | 0 | - | 充电费用 (元) |
| location | TEXT | 否 | - | - | 充电地点 |
| charger_type | TEXT | 否 | 'slow' | CHECK(charger_type IN ('slow','fast','super')) | 充电桩类型 |
| notes | TEXT | 否 | - | - | 备注信息 |
| created_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 创建时间 |
| updated_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 更新时间 |

**充电桩类型说明：**
| 类型 | 中文名 | 功率范围 |
|------|--------|----------|
| slow | 慢充 | 7kW 以下 |
| fast | 快充 | 7-60kW |
| super | 超充 | 60kW 以上 |

**计算字段：**
- 充电电量 = 电池容量 × (end_battery - start_battery) / 100
- 百公里电耗 = electricity_used / (end_mileage - start_mileage) × 100

**索引：**
```sql
CREATE INDEX idx_charging_vehicle ON charging(vehicle_id);
CREATE INDEX idx_charging_date ON charging(date);
CREATE INDEX idx_charging_location ON charging(location);
```

---

### 5.4 账单表 (bills)

| 字段 | 类型 | 必填 | 默认值 | 约束 | 描述 |
|------|------|------|--------|------|------|
| id | INTEGER | 是 | 自增 | PRIMARY KEY | 主键 |
| date | TEXT | 是 | - | NOT NULL | 账单日期 (YYYY-MM-DD) |
| amount | REAL | 是 | - | NOT NULL | 金额 (元)，支持小数 |
| type | TEXT | 是 | - | NOT NULL, CHECK(type IN ('income','expense')) | 账单类型 |
| category_id | INTEGER | 是 | - | FOREIGN KEY | 关联分类ID |
| category_name | TEXT | 否 | - | - | 分类名称 (冗余存储) |
| description | TEXT | 否 | - | - | 账单描述 |
| payment_method | TEXT | 否 | 'cash' | CHECK(payment_method IN ('cash','alipay','wechat','bankcard','other')) | 支付方式 |
| notes | TEXT | 否 | - | - | 备注信息 |
| created_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 创建时间 |
| updated_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 更新时间 |

**支付方式说明：**
| 类型 | 中文名 |
|------|--------|
| cash | 现金 |
| alipay | 支付宝 |
| wechat | 微信支付 |
| bankcard | 银行卡 |
| other | 其他 |

**索引：**
```sql
CREATE INDEX idx_bills_type ON bills(type);
CREATE INDEX idx_bills_date ON bills(date);
CREATE INDEX idx_bills_category ON bills(category_id);
CREATE INDEX idx_bills_amount ON bills(amount);
```

---

### 5.5 分类表 (categories)

| 字段 | 类型 | 必填 | 默认值 | 约束 | 描述 |
|------|------|------|--------|------|------|
| id | INTEGER | 是 | 自增 | PRIMARY KEY | 主键 |
| name | TEXT | 是 | - | NOT NULL, UNIQUE | 分类名称 |
| type | TEXT | 是 | - | NOT NULL, CHECK(type IN ('income','expense')) | 分类类型 |
| icon | TEXT | 否 | 'fa-folder' | - | Font Awesome 图标 |
| color | TEXT | 否 | '#6B7280' | - | 分类颜色 (HEX) |
| sort_order | INTEGER | 否 | 0 | - | 排序权重 |
| is_default | INTEGER | 否 | 0 | - | 是否默认分类 (0/1) |
| created_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 创建时间 |

**默认分类数据：**

*支出分类：*
| name | icon | color |
|------|------|-------|
| 餐饮 | fa-utensils | #EF4444 |
| 购物 | fa-shopping-bag | #F59E0B |
| 交通 | fa-car | #10B981 |
| 住房 | fa-home | #3B82F6 |
| 医疗 | fa-hospital | #8B5CF6 |
| 教育 | fa-graduation-cap | #EC4899 |
| 娱乐 | fa-gamepad | #6366F1 |
| 通讯 | fa-mobile | #14B8A6 |
| 其他 | fa-ellipsis-h | #6B7280 |

*收入分类：*
| name | icon | color |
|------|------|-------|
| 工资 | fa-money-bill | #10B981 |
| 奖金 | fa-gift | #F59E0B |
| 投资 | fa-chart-line | #3B82F6 |
| 兼职 | fa-briefcase | #8B5CF6 |
| 礼金 | fa-hand-holding-heart | #EC4899 |
| 其他 | fa-ellipsis-h | #6B7280 |

**索引：**
```sql
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_sort ON categories(sort_order);
```

---

### 5.6 书签表 (bookmarks)

| 字段 | 类型 | 必填 | 默认值 | 约束 | 描述 |
|------|------|------|--------|------|------|
| id | INTEGER | 是 | 自增 | PRIMARY KEY | 主键 |
| title | TEXT | 是 | - | NOT NULL, MAX(50) | 书签标题 |
| url | TEXT | 是 | - | NOT NULL | 链接地址 |
| category | TEXT | 是 | - | NOT NULL | 分类名称 |
| icon | TEXT | 否 | 'fa-link' | - | Font Awesome 图标 |
| description | TEXT | 否 | - | - | 书签描述 |
| click_count | INTEGER | 否 | 0 | - | 点击次数 |
| sort_order | INTEGER | 否 | 0 | - | 排序权重 |
| created_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 创建时间 |
| updated_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 更新时间 |

**预置分类：**
- 常用网站
- 开发工具
- 娱乐
- 购物
- 视频
- 音乐
- 新闻
- 工具

**索引：**
```sql
CREATE INDEX idx_bookmarks_category ON bookmarks(category);
CREATE INDEX idx_bookmarks_click ON bookmarks(click_count DESC);
CREATE INDEX idx_bookmarks_sort ON bookmarks(sort_order);
```

---

### 5.7 系统配置表 (settings)

| 字段 | 类型 | 必填 | 默认值 | 约束 | 描述 |
|------|------|------|--------|------|------|
| key | TEXT | 是 | - | PRIMARY KEY | 配置键 |
| value | TEXT | 否 | - | - | 配置值 |
| updated_at | TEXT | 是 | CURRENT_TIMESTAMP | - | 更新时间 |

**预设配置：**
| key | value | 描述 |
|-----|-------|------|
| bill_password_hash | - | 账单页面密码 (SHA256) |
| ai_api_key | - | AI 对话 API Key |
| ai_model | gpt-3.5-turbo | AI 模型版本 |
| total_visits | 0 | 网站访问次数 |
| theme | light | 主题设置 |

---

### 5.8 数据模型 ER 图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ER 关系图                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐         ┌──────────────────┐         ┌───────────────┐  │
│   │             │         │                  │         │               │  │
│   │  vehicles   │────────▶│    maintenance   │         │   charging    │  │
│   │             │  1:N    │                  │         │               │  │
│   │  id (PK)    │         │  id (PK)         │         │  id (PK)      │  │
│   │  brand      │         │  vehicle_id (FK)  │         │  vehicle_id   │  │
│   │  model      │         │  date            │         │  (FK)         │  │
│   │  year       │         │  type            │         │  date         │  │
│   │  mileage    │         │  cost            │         │  cost         │  │
│   │  status     │         │  mileage         │         │  duration     │  │
│   └─────────────┘         └──────────────────┘         └───────────────┘  │
│                                                                    │       │
│                                                                    │       │
│   ┌─────────────┐         ┌──────────────────┐                    │       │
│   │             │         │                  │                    │       │
│   │ categories  │◀────────│      bills       │────────────────────┘       │
│   │             │  1:N    │                  │                            │
│   │  id (PK)    │         │  id (PK)         │                            │
│   │  name       │         │  date            │                            │
│   │  type       │         │  amount          │                            │
│   │  icon       │         │  type            │                            │
│   │  color      │         │  category_id(FK) │                            │
│   └─────────────┘         └──────────────────┘                            │
│                                    │                                       │
│                                    │                                       │
│                                    ▼                                       │
│                         ┌──────────────────┐                               │
│                         │                  │                               │
│                         │    bookmarks     │                               │
│                         │                  │                               │
│                         │  id (PK)         │                               │
│                         │  title           │                               │
│                         │  url             │                               │
│                         │  category       │                               │
│                         │  click_count     │                               │
│                         └──────────────────┘                               │
│                                    │                                       │
│                                    │                                       │
│                                    ▼                                       │
│                         ┌──────────────────┐                               │
│                         │    settings      │                               │
│                         │                  │                               │
│                         │  key (PK)        │                               │
│                         │  value           │                               │
│                         └──────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.9 表之间关系说明

| 关系 | 父表 | 子表 | 关系类型 | 说明 |
|------|------|------|----------|------|
| 车辆-维修 | vehicles | maintenance | 1:N | 一辆车可有多条维修记录 |
| 车辆-充电 | vehicles | charging | 1:N | 一辆车可有多条充电记录 |
| 分类-账单 | categories | bills | 1:N | 一个分类可有多条账单 |

---

### 5.10 数据库初始化 SQL

```sql
-- 车辆表
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    license_plate TEXT,
    color TEXT,
    vin TEXT,
    purchase_date TEXT,
    purchase_price REAL,
    current_mileage INTEGER DEFAULT 0,
    battery_capacity REAL,
    image_url TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','maintenance','unused','sold')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 维修记录表
CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('maintenance','repair','insurance','inspection','other')),
    description TEXT,
    cost REAL DEFAULT 0,
    mileage INTEGER,
    shop TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 充电记录表
CREATE TABLE IF NOT EXISTS charging (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_mileage INTEGER,
    end_mileage INTEGER,
    start_battery INTEGER CHECK(start_battery >= 0 AND start_battery <= 100),
    end_battery INTEGER CHECK(end_battery >= 0 AND end_battery <= 100),
    electricity_used REAL,
    duration INTEGER,
    cost REAL DEFAULT 0,
    location TEXT,
    charger_type TEXT DEFAULT 'slow' CHECK(charger_type IN ('slow','fast','super')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    icon TEXT DEFAULT 'fa-folder',
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 账单表
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    category_id INTEGER NOT NULL,
    category_name TEXT,
    description TEXT,
    payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash','alipay','wechat','bankcard','other')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 书签表
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT DEFAULT 'fa-link',
    description TEXT,
    click_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance(date);
CREATE INDEX IF NOT EXISTS idx_charging_vehicle ON charging(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_charging_date ON charging(date);
CREATE INDEX IF NOT EXISTS idx_bills_type ON bills(type);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_category ON bills(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);

-- 插入默认分类数据
INSERT INTO categories (name, type, icon, color, sort_order, is_default) VALUES 
-- 支出分类
('餐饮', 'expense', 'fa-utensils', '#EF4444', 1, 1),
('购物', 'expense', 'fa-shopping-bag', '#F59E0B', 2, 1),
('交通', 'expense', 'fa-car', '#10B981', 3, 1),
('住房', 'expense', 'fa-home', '#3B82F6', 4, 1),
('医疗', 'expense', 'fa-hospital', '#8B5CF6', 5, 1),
('教育', 'expense', 'fa-graduation-cap', '#EC4899', 6, 1),
('娱乐', 'expense', 'fa-gamepad', '#6366F1', 7, 1),
('通讯', 'expense', 'fa-mobile', '#14B8A6', 8, 1),
('其他', 'expense', 'fa-ellipsis-h', '#6B7280', 9, 1),
-- 收入分类
('工资', 'income', 'fa-money-bill', '#10B981', 1, 1),
('奖金', 'income', 'fa-gift', '#F59E0B', 2, 1),
('投资', 'income', 'fa-chart-line', '#3B82F6', 3, 1),
('兼职', 'income', 'fa-briefcase', '#8B5CF6', 4, 1),
('礼金', 'income', 'fa-hand-holding-heart', '#EC4899', 5, 1),
('其他', 'income', 'fa-ellipsis-h', '#6B7280', 6, 1);

-- 插入默认系统配置
INSERT INTO settings (key, value) VALUES 
('total_visits', '0'),
('theme', 'light');
```

---

## 6. API 接口详细规格

### 6.1 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "错误描述"
  }
}
```

#### 分页响应
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### 6.2 车辆相关 API

#### 6.2.1 获取车辆列表

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/vehicles |
| **认证** | 无 |
| **Query 参数** | `status?: string` (active/inactive/sold) |

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "brand": "特斯拉",
      "model": "Model 3",
      "year": 2023,
      "license_plate": "京A12345",
      "color": "白色",
      "current_mileage": 15000,
      "status": "active",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
}
```

#### 6.2.2 获取单个车辆详情

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/vehicles/:id |
| **认证** | 无 |

#### 6.2.3 添加新车辆

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **路径** | /api/vehicles |
| **认证** | 无 |
| **Content-Type** | multipart/form-data |

**请求参数：**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| brand | string | 是 | 品牌 |
| model | string | 是 | 型号 |
| year | number | 是 | 年份 |
| license_plate | string | 否 | 车牌号 |
| color | string | 否 | 颜色 |
| vin | string | 否 | 车架号 |
| purchase_date | string | 否 | 购买日期 (YYYY-MM-DD) |
| purchase_price | number | 否 | 购买价格 |
| current_mileage | number | 否 | 当前里程 |
| battery_capacity | number | 否 | 电池容量 |
| image | file | 否 | 车辆图片 (max 2MB) |
| status | string | 否 | 状态 (默认 active) |
| notes | string | 否 | 备注 |

#### 6.2.4 更新车辆信息

| 项目 | 内容 |
|------|------|
| **方法** | PUT |
| **路径** | /api/vehicles/:id |
| **认证** | 无 |
| **Content-Type** | multipart/form-data |

#### 6.2.5 删除车辆

| 项目 | 内容 |
|------|------|
| **方法** | DELETE |
| **路径** | /api/vehicles/:id |
| **认证** | 无 |

#### 6.2.6 获取车辆维修记录

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/vehicles/:id/maintenance |
| **认证** | 无 |
| **Query 参数** | `page?: number, pageSize?: number` |

#### 6.2.7 添加维修记录

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **路径** | /api/vehicles/:id/maintenance |
| **认证** | 无 |

**请求参数：**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| maintenance_type | string | 是 | 保养/维修/保险/检车/其他 |
| maintenance_date | string | 是 | 维修日期 |
| mileage | number | 否 | 送修时里程 |
| description | string | 否 | 维修描述 |
| cost | number | 否 | 费用 |
| shop | string | 否 | 维修店 |

#### 6.2.8 获取车辆充电记录

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/vehicles/:id/charging |
| **认证** | 无 |
| **Query 参数** | `page?: number, pageSize?: number, startDate?: string, endDate?: string` |

#### 6.2.9 添加充电记录

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **路径** | /api/vehicles/:id/charging |
| **认证** | 无 |

**请求参数：**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| charging_date | string | 是 | 充电日期时间 |
| start_mileage | number | 否 | 起始里程 |
| end_mileage | number | 否 | 结束里程 |
| start_battery | number | 否 | 充电前电量 (0-100) |
| end_battery | number | 否 | 充电后电量 (0-100) |
| charging_duration | number | 否 | 充电时长（分钟） |
| electricity_used | number | 否 | 用电量 (kWh) |
| cost | number | 否 | 费用 |
| location | string | 否 | 充电地点 |
| charger_type | string | 否 | 充电桩类型 (slow/fast/super) |
| notes | string | 否 | 备注 |

#### 6.2.10 更新充电记录

| 项目 | 内容 |
|------|------|
| **方法** | PUT |
| **路径** | /api/charging/:id |
| **认证** | 无 |

#### 6.2.11 删除充电记录

| 项目 | 内容 |
|------|------|
| **方法** | DELETE |
| **路径** | /api/charging/:id |
| **认证** | 无 |

#### 6.2.12 更新车辆状态

| 项目 | 内容 |
|------|------|
| **方法** | PUT |
| **路径** | /api/vehicles/:id/status |
| **认证** | 无 |

**请求参数：**
```json
{
  "current_mileage": 15000,
  "status": "active"
}
```

#### 6.2.13 搜索车辆

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/vehicles/search |
| **认证** | 无 |
| **Query 参数** | `q: string` (搜索关键词) |

---

### 6.3 账单相关 API

#### 6.3.1 获取账单列表

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/bills |
| **认证** | 无 |
| **Query 参数** | `type?: income/expense, categoryId?: number, year?: number, month?: number, page?: number, pageSize?: number` |

#### 6.3.2 获取账单详情

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/bills/:id |
| **认证** | 无 |

#### 6.3.3 添加账单

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **路径** | /api/bills |
| **认证** | 无 |

**请求参数：**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| type | string | 是 | income/expense |
| amount | number | 是 | 金额 |
| category_id | number | 是 | 分类ID |
| date | string | 是 | 账单日期 |
| description | string | 否 | 描述 |
| payment_method | string | 否 | 支付方式 |
| notes | string | 否 | 备注 |

#### 6.3.4 更新账单

| 项目 | 内容 |
|------|------|
| **方法** | PUT |
| **路径** | /api/bills/:id |
| **认证** | 无 |

#### 6.3.5 删除账单

| 项目 | 内容 |
|------|------|
| **方法** | DELETE |
| **路径** | /api/bills/:id |
| **认证** | 无 |

#### 6.3.6 获取月度统计

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/bills/stats/monthly |
| **认证** | 无 |
| **Query 参数** | `year?: number, month?: number` |

#### 6.3.7 获取分类列表

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/categories |
| **认证** | 无 |
| **Query 参数** | `type?: income/expense` |

#### 6.3.8 添加分类

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **路径** | /api/categories |
| **认证** | 无 |

**请求参数：**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| name | string | 是 | 分类名称 |
| type | string | 是 | income/expense |
| icon | string | 否 | Font Awesome 图标 |
| color | string | 否 | 颜色代码 |

#### 6.3.9 更新分类

| 项目 | 内容 |
|------|------|
| **方法** | PUT |
| **路径** | /api/categories/:id |
| **认证** | 无 |

#### 6.3.10 删除分类

| 项目 | 内容 |
|------|------|
| **方法** | DELETE |
| **路径** | /api/categories/:id |
| **认证** | 无 |

#### 6.3.11 验证账单密码

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **路径** | /api/verify-bill-password |
| **认证** | 无 |

**请求参数：**
```json
{
  "password": "your_password"
}
```

---

### 6.4 书签相关 API

#### 6.4.1 获取书签列表

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/bookmarks |
| **认证** | 无 |
| **Query 参数** | `category?: string, search?: string` |

#### 6.4.2 添加书签

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **路径** | /api/bookmarks |
| **认证** | 无 |

**请求参数：**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| title | string | 是 | 标题 (max 50) |
| url | string | 是 | 链接 |
| category | string | 是 | 分类 |
| icon | string | 否 | Font Awesome 图标 |

#### 6.4.3 更新书签

| 项目 | 内容 |
|------|------|
| **方法** | PUT |
| **路径** | /api/bookmarks/:id |
| **认证** | 无 |

#### 6.4.4 删除书签

| 项目 | 内容 |
|------|------|
| **方法** | DELETE |
| **路径** | /api/bookmarks/:id |
| **认证** | 无 |

#### 6.4.5 重新排序书签

| 项目 | 内容 |
|------|------|
| **方法** | POST |
| **路径** | /api/bookmarks/reorder |
| **认证** | 无 |

**请求参数：**
```json
{
  "order": [1, 3, 2, 5, 4]
}
```

#### 6.4.6 更新点击统计

| 项目 | 内容 |
|------|------|
| **方法** | PUT |
| **路径** | /api/bookmarks/:id/click |
| **认证** | 无 |

---

### 6.5 统计相关 API

#### 6.5.1 获取总访问量

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/stats/total-visits |
| **认证** | 无 |

#### 6.5.2 获取统计数据

| 项目 | 内容 |
|------|------|
| **方法** | GET |
| **路径** | /api/stats |
| **认证** | 无 |
| **Query 参数** | `type?: vehicle/bill, year?: number` |

---

## 7. 非功能需求

### 7.1 性能需求

| 指标 | 目标值 | 备注 |
|------|--------|------|
| 页面首次加载时间 | ≤ 3 秒 | 不含首屏图片 |
| API 响应时间 | ≤ 500ms | 单次查询 |
| 并发用户数 | ≤ 10 | 个人使用场景 |
| 数据库连接池 | 5 | 避免连接泄漏 |

### 7.2 兼容性需求

| 平台 | 版本要求 |
|------|----------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13+ |
| Edge | 80+ |
| iOS | 12+ |
| Android | 8+ |

### 7.3 安全需求

| 项目 | 规格 |
|------|------|
| 账单密码 | SHA256 加密存储 |
| 密码验证 | 登录成功后生成 token |
| Token 有效期 | 7 天 |
| 文件上传 | 限制 2MB，仅允许 jpg/png/webp |
| SQL 注入 | 使用参数化查询 |
| XSS | 输出转义处理 |

### 7.4 部署需求

| 项目 | 规格 |
|------|------|
| Node.js 版本 | 18.x 或更高 |
| PM2 进程数 | 1 |
| Docker 镜像 | 基于 alpine 精简镜像 |
| 数据持久化 | 挂载 volume 到 /data |

### 7.5 监控与日志

| 项目 | 规格 |
|------|------|
| 日志级别 | error, warn, info, debug |
| 日志位置 | stdout (PM2) |
| 错误捕获 | 全局未捕获异常处理 |
| 进程守护 | PM2 自动重启 |

---

## 8. 用户角色与权限

### 8.1 角色定义

| 角色 | 描述 | 访问页面 |
|------|------|----------|
| admin | 管理员 | 全部页面 |
| dashboard | 资源库账号 | /dashboard |
| vehicles | 车辆账号 | /vehicles, /records, /analytics |
| guest | 普通用户/访客 | /home |

### 8.2 权限矩阵

| 页面 | admin | dashboard | vehicles | guest |
|------|-------|-----------|----------|-------|
| /home | ✓ | ✓ | ✓ | ✓ |
| /dashboard | ✓ | ✓ | ✗ | ✗ |
| /vehicles | ✓ | ✗ | ✓ | ✗ |
| /records | ✓ | ✗ | ✓ | ✗ |
| /analytics | ✓ | ✗ | ✓ | ✗ |
| /bill | ✓ | ✗ | ✗ | ✗ |

### 8.3 认证流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              认证流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   用户访问                                                          用户访问  │
│   受保护页面 ──▶ 检查 token ──▶ 验证角色 ──▶ 允许/拒绝访问     首页      │
│       │               │               │               │          │        │
│       │               │               │               │          │        │
│       ▼               ▼               ▼               ▼          ▼        │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌───────┐    │
│   │ 页面权限 │   │ token   │   │ 角色权限 │   │ 跳转    │   │ 渲染  │    │
│   │ 检查    │   │ 存在？  │   │ 匹配？  │   │ 正确    │   │ 页面  │    │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └───────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. 验收标准

### 9.1 首页 (/home)

- [ ] 页面加载时间 ≤ 3 秒
- [ ] 3D 卡片效果正常显示，hover 有动画
- [ ] AI 对话功能可正常发送和接收消息
- [ ] 社交媒体链接点击跳转正确
- [ ] 音乐和小说推荐点击可跳转
- [ ] 移动端响应式布局正常

### 9.2 资源导航 (/dashboard)

- [ ] 可添加、编辑、删除书签
- [ ] 搜索功能实时生效
- [ ] 拖拽排序功能正常
- [ ] 点击统计正确记录
- [ ] 分类管理功能正常

### 9.3 车辆管理 (/vehicles)

- [ ] 可添加、编辑、删除车辆
- [ ] 车辆图片上传功能正常
- [ ] 维修记录 CRUD 正常
- [ ] 车辆状态实时更新

### 9.4 充电记录 (/records)

- [ ] 充电记录列表分页正常
- [ ] 可添加、编辑、删除充电记录
- [ ] 筛选功能正常工作
- [ ] 数据计算正确

### 9.5 数据分析 (/analytics)

- [ ] Chart.js 图表正常渲染
- [ ] 月度/年度统计数据正确
- [ ] 饼图、折线图显示正常
- [ ] 数据导出功能正常

### 9.6 账单管理 (/bill)

- [ ] 账单 CRUD 功能正常
- [ ] 分类管理功能正常
- [ ] 密码保护功能正常
- [ ] 年度统计正确
- [ ] 环比分析数据正确

### 9.7 技术验收

- [ ] 项目可正常启动
- [ ] 数据库初始化成功
- [ ] API 接口响应正常
- [ ] 前端页面无控制台错误
- [ ] PM2 部署配置正确
- [ ] Docker 容器构建成功

---

## 10. 项目里程碑

### 10.1 开发阶段

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| Phase 1 | 项目初始化、环境搭建 | 1 天 |
| Phase 2 | 数据库设计与初始化 | 1 天 |
| Phase 3 | 后端 API 开发 | 3 天 |
| Phase 4 | 前端页面开发 | 5 天 |
| Phase 5 | 认证与权限系统 | 1 天 |
| Phase 6 | 测试与调试 | 2 天 |
| Phase 7 | 部署配置 | 1 天 |

### 10.2 交付物清单

- [ ] 完整的源代码
- [ ] 数据库初始化脚本
- [ ] PM2 配置文件
- [ ] Docker 配置文件
- [ ] 部署文档
- [ ] 本 PRD 文档

---

**文档版本**: v1.0
**最后更新**: 2024
**作者**: PersonalWeb Team
