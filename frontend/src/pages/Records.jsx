import { useState, useEffect } from 'react';
import axios from 'axios';
import './Records.css';

export default function Records() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState({ vehicleId: '' });
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [form, setForm] = useState({
    vehicleId: '', chargingDate: '', previousMileage: '', currentMileage: '', drivingMileage: '',
    startBattery: '', endBattery: '', chargingDuration: '', meterCharging: '', vehicleCharging: '', powerLoss: '',
    cost: '', location: '', chargerType: 'slow', notes: ''
  });

  useEffect(() => {
    fetchVehicles();
    fetchRecords();
    fetchMonthlyStats();
  }, [filter]);

  const fetchVehicles = async () => {
    const res = await axios.get('/api/vehicles');
    setVehicles(res.data);
  };

  const fetchRecords = async () => {
    const res = await axios.get('/api/charging', { params: filter });
    setRecords(res.data.records);
  };

  const fetchMonthlyStats = async () => {
    const res = await axios.get('/api/charging/monthly-stats', { params: filter });
    setMonthlyStats(res.data);
  };

  const fetchLatestRecord = async (vehicleId) => {
    if (!vehicleId) return;
    const res = await axios.get('/api/charging', { params: { vehicleId, limit: 1 } });
    if (res.data.records.length > 0) {
      const latest = res.data.records[0];
      setForm(prev => ({
        ...prev,
        previousMileage: latest.currentMileage || ''
      }));
    } else {
      setForm(prev => ({
        ...prev,
        previousMileage: ''
      }));
    }
  };

  const handleVehicleChange = (vehicleId) => {
    setForm({ ...form, vehicleId, previousMileage: '', currentMileage: '', drivingMileage: '', startBattery: '', endBattery: '', meterCharging: '', vehicleCharging: '', powerLoss: '' });
    fetchLatestRecord(vehicleId);
  };

  const calculateAutoFields = (field, value) => {
    const newForm = { ...form, [field]: value };
    
    if (field === 'currentMileage' || field === 'previousMileage') {
      const current = field === 'currentMileage' ? parseFloat(value) : parseFloat(newForm.currentMileage);
      const previous = field === 'previousMileage' ? parseFloat(value) : parseFloat(newForm.previousMileage);
      if (!isNaN(current) && !isNaN(previous)) {
        newForm.drivingMileage = current - previous;
      }
    }
    
    if (field === 'meterCharging' || field === 'vehicleCharging' || field === 'startBattery' || field === 'endBattery') {
      const vehicle = vehicles.find(v => v.id === parseInt(newForm.vehicleId));
      const batteryCapacity = vehicle?.batteryCapacity || 0;
      const start = parseFloat(newForm.startBattery);
      const end = parseFloat(newForm.endBattery);
      
      if (!isNaN(start) && !isNaN(end) && batteryCapacity > 0) {
        newForm.vehicleCharging = (end - start) / 100 * batteryCapacity;
      }
      
      const meter = parseFloat(newForm.meterCharging);
      const vehicleChg = parseFloat(newForm.vehicleCharging);
      if (!isNaN(meter) && !isNaN(vehicleChg)) {
        newForm.powerLoss = meter - vehicleChg;
      }
    }
    
    setForm(newForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form };
    Object.keys(data).forEach(key => {
      if (data[key] === '') data[key] = null;
    });

    if (editing) {
      await axios.put(`/api/charging/${editing.id}`, data);
    } else {
      await axios.post('/api/charging', data);
    }
    setShowModal(false);
    resetForm();
    fetchRecords();
  };

  const handleDelete = async (id) => {
    try {
      if (confirm('确定删除该充电记录？')) {
        await axios.delete(`/api/charging/${id}`);
        fetchRecords();
      }
    } catch (err) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const resetForm = (vehicleId = null) => {
    const vid = vehicleId || vehicles[0]?.id || '';
    setForm({
      vehicleId: vid, chargingDate: '', previousMileage: '', currentMileage: '', drivingMileage: '',
      startBattery: '', endBattery: '', chargingDuration: '', meterCharging: '', vehicleCharging: '', powerLoss: '',
      cost: '', location: '', chargerType: 'slow', notes: ''
    });
    setEditing(null);
    if (vid) {
      fetchLatestRecord(vid);
    }
  };

  const getChargerTypeBadge = (type) => {
    const map = {
      slow: { class: 'badge-success', text: '慢充' },
      fast: { class: 'badge-warning', text: '快充' },
      super: { class: 'badge-danger', text: '超充' }
    };
    return map[type] || map.slow;
  };

  const isLatestRecord = (record, vehicleRecords) => {
    const sorted = [...vehicleRecords].sort((a, b) => new Date(b.chargingDate) - new Date(a.chargingDate));
    return sorted[0]?.id === record.id;
  };

  return (
    <div className="page">
      <div className="page-header flex-between">
        <h1 className="page-title">充电记录</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="fas fa-plus"></i> 添加记录
        </button>
      </div>

      <div className="toolbar">
        <select className="select" value={filter.vehicleId} onChange={e => setFilter({ ...filter, vehicleId: e.target.value })}>
          <option value="">全部车辆</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.brand} {v.model}</option>
          ))}
        </select>
      </div>

      {monthlyStats && (
        <div className="stats-grid mt-4">
          <div className="card stats-card">
            <div className="stats-value">{monthlyStats.current.totalDrivingMileage?.toFixed(0) || 0} km</div>
            <div className="stats-label">本月行驶里程</div>
            <div className={`stats-change ${monthlyStats.changes.drivingMileage >= 0 ? 'text-success' : 'text-danger'}`}>
              {monthlyStats.changes.drivingMileage >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.changes.drivingMileage || 0).toFixed(1)}%
            </div>
          </div>
          <div className="card stats-card">
            <div className="stats-value text-danger">¥{monthlyStats.current.totalCost?.toFixed(2) || 0}</div>
            <div className="stats-label">本月充电金额</div>
            <div className={`stats-change ${monthlyStats.changes.cost >= 0 ? 'text-danger' : 'text-success'}`}>
              {monthlyStats.changes.cost >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.changes.cost || 0).toFixed(1)}%
            </div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">{monthlyStats.current.totalMeterCharging?.toFixed(1) || 0} kWh</div>
            <div className="stats-label">本月电表充电量</div>
            <div className={`stats-change ${monthlyStats.changes.meterCharging >= 0 ? 'text-success' : 'text-danger'}`}>
              {monthlyStats.changes.meterCharging >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.changes.meterCharging || 0).toFixed(1)}%
            </div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">{monthlyStats.current.totalCharges || 0} 次</div>
            <div className="stats-label">本月充电次数</div>
            <div className={`stats-change ${monthlyStats.changes.charges >= 0 ? 'text-success' : 'text-danger'}`}>
              {monthlyStats.changes.charges >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.changes.charges || 0).toFixed(1)}%
            </div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">{monthlyStats.current.avgPowerConsumption?.toFixed(1) || 0} kWh/100km</div>
            <div className="stats-label">平均百公里电耗</div>
            <div className={`stats-change ${monthlyStats.changes.powerConsumption >= 0 ? 'text-danger' : 'text-success'}`}>
              {monthlyStats.changes.powerConsumption >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.changes.powerConsumption || 0).toFixed(1)}%
            </div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">¥{monthlyStats.current.avgCostPerKm?.toFixed(3) || 0}</div>
            <div className="stats-label">平均每公里花费</div>
            <div className={`stats-change ${monthlyStats.changes.costPerKm >= 0 ? 'text-danger' : 'text-success'}`}>
              {monthlyStats.changes.costPerKm >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.changes.costPerKm || 0).toFixed(1)}%
            </div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">¥{monthlyStats.current.avgPricePerKwh?.toFixed(2) || 0}</div>
            <div className="stats-label">平均电表电价</div>
            <div className={`stats-change ${monthlyStats.changes.pricePerKwh >= 0 ? 'text-danger' : 'text-success'}`}>
              {monthlyStats.changes.pricePerKwh >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.changes.pricePerKwh || 0).toFixed(1)}%
            </div>
          </div>
          <div className="card stats-card">
            <div className="stats-value">{monthlyStats.current.avgPowerLoss?.toFixed(2) || 0} kWh</div>
            <div className="stats-label">平均电量损耗</div>
            <div className={`stats-change ${monthlyStats.changes.powerLoss >= 0 ? 'text-danger' : 'text-success'}`}>
              {monthlyStats.changes.powerLoss >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.changes.powerLoss || 0).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="records-table">
        {records.length === 0 ? (
          <div className="empty">暂无充电记录</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>车辆</th>
                <th>上次总里程</th>
                <th>当前总里程</th>
                <th>行驶里程</th>
                <th>电表充电量</th>
                <th>车充电量</th>
                <th>电量损耗</th>
                <th>费用</th>
                <th>时长</th>
                <th>地点</th>
                <th>类型</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => {
                const vehicleRecords = records.filter(r => r.vehicleId === record.vehicleId);
                return (
                  <tr key={record.id}>
                    <td>{record.chargingDate?.replace('T', ' ').substring(0, 16)}</td>
                    <td>{record.brand} {record.model}</td>
                    <td>{record.previousMileage || '-'}</td>
                    <td>{record.currentMileage || '-'}</td>
                    <td>{record.drivingMileage || '-'}</td>
                    <td>{record.meterCharging || '-'}</td>
                    <td>{record.vehicleCharging?.toFixed(2) || '-'}</td>
                    <td>{record.powerLoss?.toFixed(2) || '-'}</td>
                    <td>¥{record.cost}</td>
                    <td>{record.chargingDuration}分钟</td>
                    <td>{record.location || '-'}</td>
                    <td><span className={`badge ${getChargerTypeBadge(record.chargerType).class}`}>{getChargerTypeBadge(record.chargerType).text}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(record); setForm(record); setShowModal(true); }}><i className="fas fa-edit"></i></button>
                      {isLatestRecord(record, vehicleRecords) && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(record.id)}><i className="fas fa-trash"></i></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? '编辑充电记录' : '添加充电记录'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">车辆 *</label>
                <select className="select" value={form.vehicleId} onChange={e => handleVehicleChange(e.target.value)} required disabled={editing}>
                  <option value="">选择车辆</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">充电日期</label>
                <input type="datetime-local" className="input" value={form.chargingDate} onChange={e => setForm({ ...form, chargingDate: e.target.value })} />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">上次总里程(km)</label>
                  <input type="number" className="input" value={form.previousMileage} onChange={e => calculateAutoFields('previousMileage', e.target.value)} readOnly={!!editing} />
                </div>
                <div className="form-group">
                  <label className="label">当前总里程(km)</label>
                  <input type="number" className="input" value={form.currentMileage} onChange={e => calculateAutoFields('currentMileage', e.target.value)} readOnly={!!editing} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">行驶里程(km)</label>
                  <input type="number" className="input" value={form.drivingMileage} readOnly />
                </div>
                <div className="form-group">
                  <label className="label">充电前电量(%)</label>
                  <input type="number" className="input" value={form.startBattery} onChange={e => calculateAutoFields('startBattery', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">充电后电量(%)</label>
                  <input type="number" className="input" value={form.endBattery} onChange={e => calculateAutoFields('endBattery', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">车充电量(kWh)</label>
                  <input type="number" className="input" value={form.vehicleCharging} readOnly />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">电表充电量(kWh)</label>
                  <input type="number" className="input" value={form.meterCharging} onChange={e => calculateAutoFields('meterCharging', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">电量损耗(kWh)</label>
                  <input type="number" className="input" value={form.powerLoss} readOnly />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">充电时长(分钟)</label>
                  <input type="number" className="input" value={form.chargingDuration} onChange={e => setForm({ ...form, chargingDuration: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">费用(元)</label>
                  <input type="number" className="input" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">充电桩类型</label>
                  <select className="select" value={form.chargerType} onChange={e => setForm({ ...form, chargerType: e.target.value })}>
                    <option value="slow">慢充</option>
                    <option value="fast">快充</option>
                    <option value="super">超充</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">充电地点</label>
                  <input type="text" className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
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
    </div>
  );
}
