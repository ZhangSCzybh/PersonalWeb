import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import './Analytics.css';

const PIE_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff8c00'
];

const pieOptions = {
  tooltip: { trigger: 'item', formatter: (params) => `${params.name}: ${params.value?.toFixed(2) || '0.00'} (${params.percent?.toFixed(1) || 0}%)` },
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
  tooltip: { trigger: 'item', formatter: (params) => `${params.name}: ${params.value?.toFixed(2) || '0.00'} (${params.percent?.toFixed(1) || 0}%)` },
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
  const [chargingStats, setChargingStats] = useState({});
  const [maintenanceStats, setMaintenanceStats] = useState({});
  const [totalStats, setTotalStats] = useState({});

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
    try {
      const params = { year };
      if (vehicleId) params.vehicleId = vehicleId;

      const [charging, maintenance, total] = await Promise.all([
        axios.get('/api/analytics/vehicle-stats', { params }),
        axios.get('/api/analytics/maintenance-stats', { params }).catch(() => ({ data: {} })),
        axios.get('/api/charging/stats', { params }).catch(() => ({ data: {} }))
      ]);

      setChargingStats(charging.data);
      setMaintenanceStats(maintenance.data);
      setTotalStats(total.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
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
      legend: { top: '5%', left: 'center', type: 'scroll', orient: 'horizontal', textStyle: { fontSize: 11 } },
      series: [{
        ...pieOptions.series[0],
        radius: ['40%', '65%'],
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
    tooltip: { 
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      textStyle: { color: '#333' },
      formatter: (params) => {
        let result = params[0].name + '<br/>';
        params.forEach(param => {
          const value = param.value !== undefined ? param.value.toFixed(2) : '0.00';
          result += param.marker + param.seriesName + ': ' + value + '<br/>';
        });
        return result;
      }
    },
    legend: { data: ['充电费用(元)', '充电度数(kWh)'], top: '5%', textStyle: { color: '#666' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], 
      axisLine: { lineStyle: { color: '#e0e0e0' } }, 
      axisLabel: { color: '#666' } 
    },
    yAxis: { 
      type: 'value', 
      axisLine: { lineStyle: { color: '#e0e0e0' } }, 
      axisLabel: { color: '#666' }, 
      splitLine: { lineStyle: { color: '#f0f0f0' } } 
    },
    series: [
      { 
        name: '充电费用(元)', 
        type: 'line', 
        data: getMonthlyData(chargingStats?.byMonth, 'cost'), 
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#818cf8', width: 3 },
        itemStyle: { color: '#818cf8' },
        areaStyle: { color: 'rgba(129, 140, 248, 0.15)' }
      },
      { 
        name: '充电度数(kWh)', 
        type: 'line', 
        data: getMonthlyData(chargingStats?.byMonth, 'electricity'), 
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#34d399', width: 3 },
        itemStyle: { color: '#34d399' },
        areaStyle: { color: 'rgba(52, 211, 153, 0.15)' }
      }
    ]
  });

  const getMileageBarOptions = () => ({
    tooltip: { 
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      textStyle: { color: '#333' }
    },
    legend: { data: ['行驶里程(km)'], top: '5%', textStyle: { color: '#666' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], 
      axisLine: { lineStyle: { color: '#e0e0e0' } }, 
      axisLabel: { color: '#666' } 
    },
    yAxis: { 
      type: 'value', 
      axisLine: { lineStyle: { color: '#e0e0e0' } }, 
      axisLabel: { color: '#666' }, 
      splitLine: { lineStyle: { color: '#f0f0f0' } } 
    },
    series: [
      { 
        name: '行驶里程(km)', 
        type: 'line', 
        data: getMonthlyData(chargingStats?.byMonth, 'mileage'), 
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { color: '#a78bfa', width: 3 },
        itemStyle: { color: '#a78bfa' },
        areaStyle: { color: 'rgba(167, 139, 250, 0.2)' }
      }
    ]
  });

  const getMaintenanceBarOptions = () => ({
    ...barOptions,
    legend: { data: ['维修费用(元)'], top: '5%' },
    series: [
      { name: '维修费用(元)', type: 'bar', data: getMonthlyData(maintenanceStats?.byMonth, 'cost'), itemStyle: { color: '#f87171' }, barWidth: '50%', borderRadius: [6, 6, 0, 0] }
    ]
  });

  return (
    <div className="page">
      <div className="page-header flex-between">
        <h1 className="page-title">数据分析</h1>
        <div className="flex gap-2">
          <select className="select" value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={{ borderRadius: '50px', width: 'auto' }}>
            <option value="">全部车辆</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
          </select>
          <select className="select" value={year} onChange={e => setYear(e.target.value)} style={{ borderRadius: '50px', width: 'auto' }}>
            <option value="">全部年份</option>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
        </div>
      </div>

        <div className="stats-grid mt-4">
          <div className="card stats-card">
            <div className="stats-value">{totalStats?.totalMileage?.toFixed(0) || 0} km</div>
            <div className="stats-label">总行驶里程</div>
          </div>
          <div className="card stats-card">
            <div className="stats-value text-danger">¥{totalStats?.totalCost?.toFixed(2) || 0}</div>
            <div className="stats-label">总充电金额</div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">{totalStats?.totalElectricity?.toFixed(1) || 0} kWh</div>
            <div className="stats-label">总电表充电量</div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">{totalStats?.totalCharges || 0} 次</div>
            <div className="stats-label">总充电次数</div>
          </div>
        </div>

        <div className="grid grid-2 mt-4">
          <div className="chart-wrapper">
            <h3 className="card-title">{year}年充电统计</h3>
            <ReactECharts option={getChargingBarOptions()} style={{ height: '280px' }} />
          </div>
          <div className="chart-wrapper">
            <h3 className="card-title">充电位置分布</h3>
            <ReactECharts option={getLocationPieOptions()} style={{ height: '280px' }} />
          </div>
        </div>

        <div className="grid grid-2 mt-4">
          <div className="chart-wrapper">
            <h3 className="card-title">{year}年充电次数</h3>
            <ReactECharts option={{
              ...barOptions,
              series: [{ type: 'bar', data: getMonthlyData(chargingStats?.byMonth, 'count'), itemStyle: { color: '#fbbf24' }, barWidth: '50%', borderRadius: [6, 6, 0, 0] }]
            }} style={{ height: '280px' }} />
          </div>
          <div className="chart-wrapper">
            <h3 className="card-title">{year}年行驶里程</h3>
            <ReactECharts option={getMileageBarOptions()} style={{ height: '280px' }} />
          </div>

        </div>
        <div className="grid grid-2 mt-4">
          <div className="chart-wrapper">
            <h3 className="card-title">充电类型分布</h3>
            <ReactECharts option={getChargerTypePieOptions()} style={{ height: '280px' }} />
          </div>
          <div className="chart-wrapper">
            <h3 className="card-title">{year}年维修费用</h3>
            <ReactECharts option={getMaintenanceBarOptions()} style={{ height: '280px' }} />
          </div>
        </div>
    </div>
  );
}
