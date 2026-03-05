import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import './Bill.css';

const TAG_COLORS = [
  { bg: '#fee2e2', color: '#dc2626' },
  { bg: '#dbeafe', color: '#2563eb' },
  { bg: '#dcfce7', color: '#16a34a' },
  { bg: '#fef3c7', color: '#d97706' },
  { bg: '#f3e8ff', color: '#9333ea' },
  { bg: '#fee2e2', color: '#db2777' },
  { bg: '#e0e7ff', color: '#4f46e5' },
  { bg: '#ccfbf1', color: '#0d9488' },
  { bg: '#ffedd5', color: '#ea580c' },
  { bg: '#fce7f3', color: '#be185d' },
];

const getRandomColor = (index) => {
  return TAG_COLORS[index % TAG_COLORS.length];
};

export default function Bill() {
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState({ type: '', categoryId: '', year: new Date().getFullYear().toString(), month: '', page: 1 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [form, setForm] = useState({ type: 'expense', amount: '', categoryId: '', date: '', description: '', paymentMethod: '', notes: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense', icon: 'fa-tag', color: '#999999' });
  const [stats, setStats] = useState(null);
  const [billStats, setBillStats] = useState(null);

  const pieOptions = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { top: '5%', left: 'center', bottom: '5%', itemGap: 16 },
    series: [
      {
        name: '分类',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 0 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' } },
        labelLine: { show: false }
      }
    ]
  };

  const lineOptions = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入(元)', '支出(元)'], top: '5%' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], axisLine: { lineStyle: { color: '#e0e0e0' } }, axisLabel: { color: '#666' } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#e0e0e0' } }, axisLabel: { color: '#666' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      { name: '收入(元)', type: 'line', smooth: true, data: [], itemStyle: { color: '#5470c6' }, areaStyle: { color: 'rgba(84, 112, 198, 0.1)' } },
      { name: '支出(元)', type: 'line', smooth: true, data: [], itemStyle: { color: '#ee6666' }, areaStyle: { color: 'rgba(238, 102, 102, 0.1)' } }
    ]
  };

  const getMonthlyData = (data, field) => {
    if (!filter.year) {
      const allMonths = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      return allMonths.map(m => {
        const entries = Object.entries(data || {}).filter(([key]) => key.endsWith(`-${m}`));
        return entries.reduce((sum, [, value]) => sum + (value[field] || 0), 0);
      });
    }
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    return months.map(m => {
      const key = `${filter.year}-${m}`;
      return data?.[key]?.[field] || 0;
    });
  };

  const billMonthlyData = {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    datasets: [
      {
        label: '收入(元)',
        data: getMonthlyData(billStats?.monthlyData, 'income'),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: '支出(元)',
        data: getMonthlyData(billStats?.monthlyData, 'expense'),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const PIE_COLORS = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff8c00'
  ];

  const getPieOptions = () => {
    const categories = Object.keys(billStats?.byCategory || {});
    const values = Object.values(billStats?.byCategory || {});
    return {
      ...pieOptions,
      series: [{
        ...pieOptions.series[0],
        data: categories.map((name, index) => ({
          value: values[index],
          name,
          itemStyle: { 
            color: PIE_COLORS[index % PIE_COLORS.length],
            borderRadius: 6
          }
        }))
      }]
    };
  };

  const getLineOptions = () => {
    const incomeData = getMonthlyData(billStats?.monthlyData, 'income');
    const expenseData = getMonthlyData(billStats?.monthlyData, 'expense');
    return {
      ...lineOptions,
      xAxis: { ...lineOptions.xAxis, data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'] },
      series: [
        { ...lineOptions.series[0], data: incomeData },
        { ...lineOptions.series[1], data: expenseData }
      ]
    };
  };

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  const fetchCategories = async () => {
    const res = await axios.get('/api/bills/categories');
    setCategories(res.data);
    const colors = {};
    res.data.forEach((cat, index) => {
      colors[cat.id] = getRandomColor(index);
    });
    setCategoryColors(colors);
  };

  const fetchBills = async () => {
    const res = await axios.get('/api/bills', { params: { ...filter, page: filter.page } });
    setBills(res.data.bills);
    setPagination({ total: res.data.total, page: res.data.page, totalPages: res.data.totalPages });
  };

  useEffect(() => {
    fetchBills();
  }, [filter]);

  const handleFilterChange = (key, value) => {
    setFilter({ ...filter, [key]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setFilter({ ...filter, page: newPage });
  };

  const fetchStats = async () => {
    const res = await axios.get('/api/bills/stats', { params: filter });
    setStats(res.data);
  };

  const fetchBillStats = async () => {
    const res = await axios.get('/api/analytics/bill-stats', { params: filter });
    setBillStats(res.data);
  };

  useEffect(() => {
    fetchStats();
    fetchBillStats();
  }, [filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form };
    Object.keys(data).forEach(key => {
      if (data[key] === '') data[key] = null;
    });

    if (editing) {
      await axios.put(`/api/bills/${editing.id}`, data);
    } else {
      await axios.post('/api/bills', data);
    }
    setShowModal(false);
    resetForm();
    fetchBills();
    fetchStats();
  };

  const handleDelete = async (id) => {
    if (confirm('确定删除该账单？')) {
      await axios.delete(`/api/bills/${id}`);
      fetchBills();
      fetchStats();
    }
  };

  const resetForm = () => {
    setForm({ type: 'expense', amount: '', categoryId: '', date: '', description: '', paymentMethod: '', notes: '' });
    setEditing(null);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/bills/categories', categoryForm);
    setShowCategoryModal(false);
    setCategoryForm({ name: '', type: 'expense', icon: 'fa-tag', color: '#999999' });
    fetchCategories();
  };

  const handleDeleteCategory = async (id) => {
    if (confirm('确定删除该分类？')) {
      await axios.delete(`/api/bills/categories/${id}`);
      fetchCategories();
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <div className="page">
      <div className="page-header flex-between">
        <h1 className="page-title">账单管理</h1>
        <div className="flex-between" style={{ gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
            <i className="fas fa-folder"></i> 分类管理
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <i className="fas fa-plus"></i> 添加账单
          </button>
        </div>
      </div>

      <div className="toolbar mt-4">
        <select className="select" value={filter.year} onChange={e => handleFilterChange('year', e.target.value)}>
          <option value="">全部年份</option>
          {[2023, 2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <select className="select" value={filter.type} onChange={e => handleFilterChange('type', e.target.value)}>
          <option value="">全部类型</option>
          <option value="income">收入</option>
          <option value="expense">支出</option>
        </select>
        <select className="select" value={filter.categoryId} onChange={e => handleFilterChange('categoryId', e.target.value)}>
          <option value="">全部分类</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="select" value={filter.month} onChange={e => handleFilterChange('month', e.target.value)}>
          <option value="">全部月份</option>
          {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={() => setFilter({ type: '', categoryId: '', year: new Date().getFullYear().toString(), month: '', page: 1 })}>
          <i className="fas fa-redo"></i> 重置
        </button>
      </div>

      <div className="stats-grid mt-4">
        <div className="card stats-card">
          <div className="stats-value text-success">¥{stats?.income?.toFixed(2) || 0}</div>
          <div className="stats-label">收入</div>
        </div>
        <div className="card stats-card">
          <div className="stats-value text-danger">¥{stats?.expense?.toFixed(2) || 0}</div>
          <div className="stats-label">支出</div>
        </div>
        <div className="card stats-card">
          <div className="stats-value">¥{stats?.balance?.toFixed(2) || 0}</div>
          <div className="stats-label">结余</div>
        </div>
        <div className="card stats-card">
          <div className="stats-value">{stats?.totalBills || 0}</div>
          <div className="stats-label">账单总数</div>
        </div>
      </div>

      <div className="grid grid-2 mt-4">
        <div className="chart-wrapper">
          <h3 className="card-title">{filter.year ? `${filter.year}年` : '全部'}账单分类</h3>
          <div className="chart-container">
            <ReactECharts option={getPieOptions()} style={{ height: '280px' }} />
          </div>
        </div>
        <div className="chart-wrapper">
          <h3 className="card-title">{filter.year ? `${filter.year}年` : '全部'}收支趋势</h3>
          <div className="chart-container" style={{ height: '250px' }}>
            <ReactECharts option={getLineOptions()} style={{ height: '250px' }} />
          </div>
        </div>
      </div>

      <div className="bills-table">
        {bills.length === 0 ? (
          <div className="empty">暂无账单记录</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th>分类</th>
                <th>金额</th>
                <th>描述</th>
                <th>支付方式</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => (
                <tr key={bill.id}>
                  <td>{bill.date}</td>
                  <td>
                    <span className={`badge ${bill.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                      {bill.type === 'income' ? '收入' : '支出'}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const colorObj = categoryColors[bill.categoryId];
                      return colorObj ? (
                        <span className="category-tag" style={{ backgroundColor: colorObj.bg, color: colorObj.color }}>
                          <i className={`fas ${bill.categoryIcon}`}></i> {bill.categoryName}
                        </span>
                      ) : (
                        <span className="category-tag">
                          <i className={`fas ${bill.categoryIcon}`}></i> {bill.categoryName}
                        </span>
                      );
                    })()}
                  </td>
                  <td className={bill.type === 'income' ? 'text-success' : 'text-danger'}>
                    {bill.type === 'income' ? '+' : '-'}¥{bill.amount}
                  </td>
                  <td>{bill.description || '-'}</td>
                  <td>{bill.paymentMethod || '-'}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(bill); setForm(bill); setShowModal(true); }}><i className="fas fa-edit"></i></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(bill.id)}><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.total > 0 && (
        <div className="pagination">
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={pagination.page <= 1}
            onClick={() => handlePageChange(filter.page - 1)}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="pagination-info">
            第 {pagination.page} / {pagination.totalPages} 页 (共 {pagination.total} 条)
          </span>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => handlePageChange(filter.page + 1)}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? '编辑账单' : '添加账单'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">类型</label>
                <div className="type-toggle">
                  <button type="button" className={`type-btn ${form.type === 'expense' ? 'active expense' : ''}`} onClick={() => setForm({ ...form, type: 'expense' })}>支出</button>
                  <button type="button" className={`type-btn ${form.type === 'income' ? 'active income' : ''}`} onClick={() => setForm({ ...form, type: 'income' })}>收入</button>
                </div>
              </div>
              <div className="form-group">
                <label className="label">金额 *</label>
                <input type="number" step="0.01" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">分类</label>
                <select className="select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">选择分类</option>
                  {(form.type === 'expense' ? expenseCategories : incomeCategories).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">日期</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">描述</label>
                <input type="text" className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">支付方式</label>
                <select className="select" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="">选择支付方式</option>
                  <option value="cash">现金</option>
                  <option value="alipay">支付宝</option>
                  <option value="wechat">微信</option>
                  <option value="bankcard">银行卡</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">备注</label>
                <textarea className="input" rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">分类管理</h2>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCategorySubmit} className="category-form">
              <div className="grid grid-3" style={{ gap: '8px' }}>
                <input type="text" className="input" placeholder="分类名称" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
                <select className="select" value={categoryForm.type} onChange={e => setCategoryForm({ ...categoryForm, type: e.target.value })}>
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                </select>
                <button type="submit" className="btn btn-primary">添加</button>
              </div>
            </form>
            <div className="category-list">
              <h4>支出分类</h4>
              <div className="category-tags">
                {expenseCategories.map((c, idx) => {
                  const colorObj = categoryColors[c.id] || getRandomColor(idx);
                  return (
                    <span key={c.id} className="category-tag" style={{ backgroundColor: colorObj.bg, color: colorObj.color }}>
                      <i className={`fas ${c.icon}`}></i> {c.name}
                      {!c.isDefault && <i className="fas fa-times" onClick={() => handleDeleteCategory(c.id)}></i>}
                    </span>
                  );
                })}
              </div>
              <h4 className="mt-4">收入分类</h4>
              <div className="category-tags">
                {incomeCategories.map((c, idx) => {
                  const colorObj = categoryColors[c.id] || getRandomColor(idx + expenseCategories.length);
                  return (
                    <span key={c.id} className="category-tag" style={{ backgroundColor: colorObj.bg, color: colorObj.color }}>
                      <i className={`fas ${c.icon}`}></i> {c.name}
                      {!c.isDefault && <i className="fas fa-times" onClick={() => handleDeleteCategory(c.id)}></i>}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
