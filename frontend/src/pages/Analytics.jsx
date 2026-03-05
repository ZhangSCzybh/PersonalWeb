import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import './Analytics.css';

const PIE_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff8c00'
];

const pieOptions = {
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { top: '5%', left: 'center', bottom: '5%', itemGap: 16 },
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 0 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' } },
    labelLine: { show: false }
  }]
};

const barOptions = {
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], axisLine: { lineStyle: { color: '#e0e0e0' } }, axisLabel: { color: '#666' } },
  yAxis: { type: 'value', axisLine: { lineStyle: { color: '#e0e0e0' } }, axisLabel: { color: '#666' }, splitLine: { lineStyle: { color: '#f0f0f0' } } }
};

const doughnutOptions = {
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { top: '5%', left: 'center', bottom: '5%', itemGap: 16 },
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 0 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' } },
    labelLine: { show: false }
  }]
};

export default function Analytics() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [chargingStats, setChargingStats] = useState(null);
  const [maintenanceStats, setMaintenanceStats] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [year, vehicleId]);

  const fetchVehicles = async () => {
    const res = await axios.get('/api/vehicles');
    setVehicles(res.data);
  };

  const fetchStats = async () => {
    const params = { year };
    if (vehicleId) params.vehicleId = vehicleId;

    const [charging, maintenance] = await Promise.all([
      axios.get('/api/analytics/vehicle-stats', { params }),
      axios.get('/api/analytics/maintenance-stats', { params })
    ]);

    setChargingStats(charging.data);
    setMaintenanceStats(maintenance.data);
  };

  const getMonthlyData = (data, field) => {
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    return months.map(m => {
      const key = `${year}-${m}`;
      return data?.[key]?.[field] || 0;
    });
  };

  const getLocationPieOptions = () => {
    const locations = Object.keys(chargingStats?.byLocation || {});
    const values = Object.values(chargingStats?.byLocation || {});
    return {
      ...pieOptions,
      series: [{
        ...pieOptions.series[0],
        data: locations.map((name, index) => ({
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

  const getChargerTypePieOptions = () => {
    const data = [
      { name: '慢充', value: chargingStats?.byChargerType?.slow || 0 },
      { name: '快充', value: chargingStats?.byChargerType?.fast || 0 },
      { name: '超充', value: chargingStats?.byChargerType?.super || 0 }
    ];
    return {
      ...doughnutOptions,
      series: [{
        ...doughnutOptions.series[0],
        data: data.map((d, index) => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: PIE_COLORS[index % PIE_COLORS.length], borderRadius: 6 }
        }))
      }]
    };
  };

  const getChargingBarOptions = () => ({
    ...barOptions,
    legend: { data: ['充电费用(元)', '充电度数(kWh)'], top: '5%' },
    series: [
      { name: '充电费用(元)', type: 'bar', data: getMonthlyData(chargingStats?.byMonth, 'cost'), itemStyle: { color: '#4f46e5' }, barWidth: '30%' },
      { name: '充电度数(kWh)', type: 'bar', data: getMonthlyData(chargingStats?.byMonth, 'electricity'), itemStyle: { color: '#10b981' }, barWidth: '30%' }
    ]
  });

  const getMileageBarOptions = () => ({
    ...barOptions,
    legend: { data: ['行驶里程(km)'], top: '5%' },
    series: [
      { name: '行驶里程(km)', type: 'bar', data: getMonthlyData(chargingStats?.byMonth, 'mileage'), itemStyle: { color: '#4f46e5' }, barWidth: '50%', borderRadius: [6, 6, 0, 0] }
    ]
  });

  const getMaintenanceBarOptions = () => ({
    ...barOptions,
    legend: { data: ['维修费用(元)'], top: '5%' },
    series: [
      { name: '维修费用(元)', type: 'bar', data: getMonthlyData(maintenanceStats?.byMonth, 'cost'), itemStyle: { color: '#ef4444' }, barWidth: '50%', borderRadius: [6, 6, 0, 0] }
    ]
  });

  return (
    <div className="page">
      <div className="page-header flex-between">
        <h1 className="page-title">数据分析</h1>
        <div className="flex gap-2">
          <select className="select" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            <option value="">全部车辆</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
          </select>
          <select className="select" value={year} onChange={e => setYear(e.target.value)}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-2 mt-4">
        <div className="chart-wrapper">
          <h3 className="card-title">{year}年充电统计</h3>
          <ReactECharts option={getChargingBarOptions()} style={{ height: '280px' }} />
        </div>
        <div className="chart-wrapper">
          <h3 className="card-title">{year}年行驶里程</h3>
          <ReactECharts option={getMileageBarOptions()} style={{ height: '280px' }} />
        </div>
      </div>

      <div className="grid grid-2 mt-4">
        <div className="chart-wrapper">
          <h3 className="card-title">充电位置分布</h3>
          <ReactECharts option={getLocationPieOptions()} style={{ height: '280px' }} />
        </div>
        <div className="chart-wrapper">
          <h3 className="card-title">充电类型分布</h3>
          <ReactECharts option={getChargerTypePieOptions()} style={{ height: '280px' }} />
        </div>
      </div>

      <div className="grid grid-2 mt-4">
        <div className="chart-wrapper">
          <h3 className="card-title">{year}年充电次数</h3>
          <ReactECharts option={{
            ...barOptions,
            series: [{ type: 'bar', data: getMonthlyData(chargingStats?.byMonth, 'count'), itemStyle: { color: '#8b5cf6' }, barWidth: '50%', borderRadius: [6, 6, 0, 0] }]
          }} style={{ height: '280px' }} />
        </div>
        <div className="chart-wrapper">
          <h3 className="card-title">{year}年维修费用</h3>
          <ReactECharts option={getMaintenanceBarOptions()} style={{ height: '280px' }} />
        </div>
      </div>
    </div>
  );
}
