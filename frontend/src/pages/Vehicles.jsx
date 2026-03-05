import { useState, useEffect } from 'react';
import axios from 'axios';
import './Vehicles.css';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceType: '', maintenanceDate: '', mileage: '', cost: '', shop: '', description: ''
  });
  const [form, setForm] = useState({
    brand: '', model: '', year: '', licensePlate: '', color: '', vin: '',
    purchaseDate: '', purchasePrice: '', currentMileage: '', batteryCapacity: '', status: 'active', notes: ''
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const res = await axios.get('/api/vehicles');
    setVehicles(res.data);
  };

  const fetchMaintenance = async (vehicleId) => {
    const res = await axios.get(`/api/vehicles/${vehicleId}/maintenance`);
    setMaintenance(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(form).forEach(key => {
      if (form[key]) data.append(key, form[key]);
    });

    if (editing) {
      await axios.put(`/api/vehicles/${editing.id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    } else {
      await axios.post('/api/vehicles', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    setShowModal(false);
    resetForm();
    fetchVehicles();
  };

  const handleDelete = async (id) => {
    if (confirm('确定删除车辆？')) {
      await axios.delete(`/api/vehicles/${id}`);
      fetchVehicles();
    }
  };

  const resetForm = () => {
    setForm({
      brand: '', model: '', year: '', licensePlate: '', color: '', vin: '',
      purchaseDate: '', purchasePrice: '', currentMileage: '', batteryCapacity: '', status: 'active', notes: ''
    });
    setEditing(null);
  };

  const openDetail = async (vehicle) => {
    setShowDetail(vehicle);
    await fetchMaintenance(vehicle.id);
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    await axios.post(`/api/vehicles/${showDetail.id}/maintenance`, maintenanceForm);
    setShowMaintenanceModal(false);
    setMaintenanceForm({ maintenanceType: '', maintenanceDate: '', mileage: '', cost: '', shop: '', description: '' });
    fetchMaintenance(showDetail.id);
  };

  const getMaintenanceTypeBadge = (type) => {
    const map = {
      '维修': { class: 'badge-danger', text: '维修' },
      '保养': { class: 'badge-success', text: '保养' },
      '路费': { class: 'badge-warning', text: '路费' },
      '停车': { class: 'badge-info', text: '停车' },
      '保险': { class: 'badge-primary', text: '保险' }
    };
    return map[type] || { class: 'badge-secondary', text: type };
  };

  const getStatusBadge = (status) => {
    const map = {
      active: { class: 'badge-success', text: '在使用' },
      inactive: { class: 'badge-warning', text: '闲置' },
      maintenance: { class: 'badge-danger', text: '维修中' },
      unused: { class: 'badge-warning', text: '未使用' },
      sold: { class: 'badge-danger', text: '已出售' }
    };
    return map[status] || map.active;
  };

  return (
    <div className="page">
      <div className="page-header flex-between">
        <h1 className="page-title">车辆管理</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="fas fa-plus"></i> 添加车辆
        </button>
      </div>

      <div className="vehicles-grid">
        {vehicles.length === 0 ? (
          <div className="empty">暂无车辆，点击添加</div>
        ) : (
          vehicles.map(vehicle => (
            <div key={vehicle.id} className="vehicle-card" onClick={() => openDetail(vehicle)}>
              <div className="vehicle-image">
                {vehicle.imageUrl ? (
                  <img src={vehicle.imageUrl} alt={vehicle.model} />
                ) : (
                  <div className="vehicle-placeholder"><i className="fas fa-car"></i></div>
                )}
              </div>
              <div className="vehicle-info">
                <h3>{vehicle.brand} {vehicle.model}</h3>
                <p>{vehicle.year}年 {vehicle.licensePlate || '未上牌'}</p>
                <span className={`badge ${getStatusBadge(vehicle.status).class}`}>
                  {getStatusBadge(vehicle.status).text}
                </span>
                <div className="vehicle-mileage">
                  <i className="fas fa-tachometer-alt"></i> {vehicle.currentMileage || 0} km
                </div>
              </div>
              <div className="vehicle-actions" onClick={e => e.stopPropagation()}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(vehicle); setForm(vehicle); setShowModal(true); }}>
                  <i className="fas fa-edit"></i>
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(vehicle.id)}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? '编辑车辆' : '添加车辆'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">品牌 *</label>
                  <input type="text" className="input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="label">车型 *</label>
                  <input type="text" className="input" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">年份</label>
                  <input type="number" className="input" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">车牌</label>
                  <input type="text" className="input" value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">颜色</label>
                  <input type="text" className="input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">车架号</label>
                  <input type="text" className="input" value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">购买日期</label>
                  <input type="date" className="input" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">购买价格</label>
                  <input type="number" className="input" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">当前里程</label>
                  <input type="number" className="input" value={form.currentMileage} onChange={e => setForm({ ...form, currentMileage: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">电池容量(kWh)</label>
                  <input type="number" className="input" value={form.batteryCapacity} onChange={e => setForm({ ...form, batteryCapacity: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">状态</label>
                  <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">在使用</option>
                    <option value="inactive">闲置</option>
                    <option value="maintenance">维修中</option>
                    <option value="unused">未使用</option>
                    <option value="sold">已出售</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">图片</label>
                  <input type="file" className="input" accept="image/*" onChange={e => setForm({ ...form, image: e.target.files[0] })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">备注</label>
                <textarea className="input" rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{showDetail.brand} {showDetail.model}</h2>
              <button className="modal-close" onClick={() => setShowDetail(null)}>&times;</button>
            </div>
            <div className="vehicle-detail">
              <div className="detail-info">
                <p><strong>年份：</strong>{showDetail.year}</p>
                <p><strong>车牌：</strong>{showDetail.licensePlate || '-'}</p>
                <p><strong>颜色：</strong>{showDetail.color || '-'}</p>
                <p><strong>车架号：</strong>{showDetail.vin || '-'}</p>
                <p><strong>购买日期：</strong>{showDetail.purchaseDate || '-'}</p>
                <p><strong>购买价格：</strong>{showDetail.purchasePrice ? `¥${showDetail.purchasePrice}` : '-'}</p>
                <p><strong>当前里程：</strong>{showDetail.currentMileage} km</p>
                <p><strong>电池容量：</strong>{showDetail.batteryCapacity ? `${showDetail.batteryCapacity} kWh` : '-'}</p>
                <p><strong>状态：</strong><span className={`badge ${getStatusBadge(showDetail.status).class}`}>{getStatusBadge(showDetail.status).text}</span></p>
                {showDetail.notes && <p><strong>备注：</strong>{showDetail.notes}</p>}
              </div>
              <div className="maintenance-section">
                <div className="flex-between" style={{ marginBottom: '12px' }}>
                  <h3>维修记录</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowMaintenanceModal(true)}>
                    <i className="fas fa-plus"></i> 添加记录
                  </button>
                </div>
                {maintenance.length === 0 ? (
                  <p className="text-secondary">暂无维修记录</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>类型</th>
                        <th>里程</th>
                        <th>费用</th>
                        <th>地点</th>
                        <th>描述</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenance.map(m => (
                        <tr key={m.id}>
                          <td>{m.maintenanceDate}</td>
                          <td><span className={`badge ${getMaintenanceTypeBadge(m.maintenanceType).class}`}>{getMaintenanceTypeBadge(m.maintenanceType).text}</span></td>
                          <td>{m.mileage} km</td>
                          <td>¥{m.cost}</td>
                          <td>{m.shop || '-'}</td>
                          <td>{m.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showMaintenanceModal && (
        <div className="modal-overlay" onClick={() => setShowMaintenanceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">添加维修记录</h2>
              <button className="modal-close" onClick={() => setShowMaintenanceModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleMaintenanceSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">日期 *</label>
                  <input type="date" className="input" value={maintenanceForm.maintenanceDate} onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenanceDate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="label">类型 *</label>
                  <select className="select" value={maintenanceForm.maintenanceType} onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenanceType: e.target.value })} required>
                    <option value="">请选择</option>
                    <option value="维修">维修</option>
                    <option value="保养">保养</option>
                    <option value="路费">路费</option>
                    <option value="停车">停车</option>
                    <option value="保险">保险</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="label">费用(元) *</label>
                  <input type="number" className="input" value={maintenanceForm.cost} onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} required step="0.01" />
                </div>
                <div className="form-group">
                  <label className="label">当前里程(km)</label>
                  <input type="number" className="input" value={maintenanceForm.mileage} onChange={e => setMaintenanceForm({ ...maintenanceForm, mileage: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">地点</label>
                <input type="text" className="input" value={maintenanceForm.shop} onChange={e => setMaintenanceForm({ ...maintenanceForm, shop: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">描述</label>
                <textarea className="input" rows="3" value={maintenanceForm.description} onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMaintenanceModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
