// 车辆管理功能
class VehicleManager {
    constructor() {
        this.apiUrl = 'http://150.230.57.188:3001/api';
        this.vehicles = [];
        this.currentVehicle = null;
        this.init();
    }

   async init() {
        await this.loadVehicles();
        this.bindEvents();
        this.setupRealTimeSearch();
        this.updateStats();
    }

    bindEvents() {
        // 添加车辆按钮
        const addBtn = document.getElementById('add-vehicle-btn') || document.getElementById('addVehicleBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddModal();
            });
        }

        // 搜索功能
        const searchBtn = document.querySelector('.search-bar button') || document.getElementById('searchBtn');
        const searchInput = document.getElementById('search-input') || document.getElementById('searchInput');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchVehicles();
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchVehicles();
                }
            });
        }

        // 表单提交
        const vehicleForm = document.getElementById('vehicle-form') || document.getElementById('vehicleForm');
        const maintenanceForm = document.getElementById('maintenance-form') || document.getElementById('maintenanceForm');
        
        if (vehicleForm) {
            vehicleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveVehicle();
            });
        }
        
        if (maintenanceForm) {
            maintenanceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMaintenance();
            });
        }

        // 模态框关闭
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // 车辆选择事件
        const vehiclesList = document.getElementById('vehicles-list') || document.getElementById('vehiclesList');
        if (vehiclesList) {
            vehiclesList.addEventListener('click', (e) => {
                const card = e.target.closest('.vehicle-card');
                if (card && !e.target.closest('.vehicle-actions')) {
                    const vehicleId = card.dataset.id;
                    this.selectVehicle(vehicleId);
                }
            });
        }
    }

    async loadVehicles() {
        try {
            const response = await fetch(`${this.apiUrl}/vehicles`);
            this.vehicles = await response.json();
            this.renderVehicles();
            this.updateStats();
        } catch (error) {
            console.error('加载车辆数据失败:', error);
            this.showEmptyState();
        }
    }

    renderVehicles() {
        const container = document.getElementById('vehicles-list') || document.getElementById('vehiclesList');
        const emptyState = document.getElementById('empty-state') || document.getElementById('emptyState');

        if (!container || !emptyState) {
            console.error('找不到容器元素');
            return;
        }

        if (this.vehicles.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = this.vehicles.map(vehicle => this.createVehicleCard(vehicle)).join('');
    }

    createVehicleCard(vehicle) {
        const isActive = vehicle.status_flag === '使用中';
        const statusClass = isActive ? 'using' : 'unused';
        const statusText = isActive ? '使用中' : '未使用';
        
        return `
            <div class="vehicle-card ${isActive ? 'active' : ''}" data-id="${vehicle.id}" onclick="vehicleManager.selectVehicle(${vehicle.id})">
                <div class="vehicle-header">
                    <div>
                        <h3 class="vehicle-license">${vehicle.license_plate}</h3>
                        <p class="vehicle-brand-model">${vehicle.brand} ${vehicle.model}</p>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="vehicle-info">
                    <div class="info-item">
                        <span class="info-label">车主:</span>
                        <span class="info-value">${vehicle.owner}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">年份:</span>
                        <span class="info-value">${vehicle.year || '-'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">里程:</span>
                        <span class="info-value">${vehicle.mileage.toLocaleString()} km</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">电池容量:</span>
                        <span class="info-value">${vehicle.battery_capacity || '-'} kWh</span>
                    </div>
                </div>
                <div class="vehicle-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-secondary" onclick="vehicleManager.viewVehicle(${vehicle.id})">
                        <i class="fas fa-eye"></i> 详情
                    </button>
                    <button class="btn btn-primary" onclick="vehicleManager.editVehicle(${vehicle.id})">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn btn-secondary" onclick="vehicleManager.showMaintenanceModal(${vehicle.id})">
                        <i class="fas fa-wrench"></i> 维修
                    </button>
                    <button class="btn btn-danger" onclick="vehicleManager.deleteVehicle(${vehicle.id})">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalVehicles = this.vehicles.length;
        const totalMaintenance = this.vehicles.reduce((sum, v) => sum + (v.maintenance_count || 0), 0);
        const totalCost = this.vehicles.reduce((sum, v) => sum + (v.total_cost || 0), 0);
        const totalMileage = this.vehicles.reduce((sum, v) => sum + v.mileage, 0);

        const totalVehiclesEl = document.getElementById('total-vehicles') || document.getElementById('totalVehicles');
        const totalMaintenanceEl = document.getElementById('total-maintenance') || document.getElementById('totalMaintenance');
        const totalCostEl = document.getElementById('total-cost') || document.getElementById('totalCost');
        const totalMileageEl = document.getElementById('avg-mileage') || document.getElementById('totalMileage');

        if (totalVehiclesEl) totalVehiclesEl.textContent = totalVehicles;
        if (totalMaintenanceEl) totalMaintenanceEl.textContent = totalMaintenance;
        if (totalCostEl) totalCostEl.textContent = `¥${totalCost.toLocaleString()}`;
        if (totalMileageEl) totalMileageEl.textContent = `${totalMileage.toLocaleString()} km`;
    }

    showAddModal() {
        const modalTitle = document.getElementById('modal-title') || document.getElementById('vehicleModalTitle');
        const vehicleForm = document.getElementById('vehicle-form') || document.getElementById('vehicleForm');
        const vehicleId = document.getElementById('vehicle-id') || document.getElementById('vehicleId');
        const mileageInput = document.getElementById('mileage');
        
        if (modalTitle) modalTitle.textContent = '添加车辆';
        if (vehicleForm) vehicleForm.reset();
        if (vehicleId) vehicleId.value = '';
        if (mileageInput) mileageInput.value = '0'; // 新车辆默认里程为0
        this.openModal('vehicle-modal');
    }

    editVehicle(id) {
        const vehicle = this.vehicles.find(v => v.id === id);
        if (!vehicle) return;

        const modalTitle = document.getElementById('modal-title') || document.getElementById('vehicleModalTitle');
        const vehicleId = document.getElementById('vehicle-id') || document.getElementById('vehicleId');
        const licensePlate = document.getElementById('license-plate') || document.getElementById('licensePlate');
        const brand = document.getElementById('brand') || document.getElementById('brand');
        const model = document.getElementById('model') || document.getElementById('model');
        const owner = document.getElementById('owner') || document.getElementById('owner');
        const year = document.getElementById('year') || document.getElementById('year');
        const color = document.getElementById('color') || document.getElementById('color');
        const mileage = document.getElementById('mileage') || document.getElementById('mileage');
        const batteryCapacity = document.getElementById('battery-capacity') || document.getElementById('batteryCapacity');
        const cltcRange = document.getElementById('cltc-range') || document.getElementById('cltcRange');
        const status = document.getElementById('status') || document.getElementById('status');
        const notes = document.getElementById('notes') || document.getElementById('notes');

        if (modalTitle) modalTitle.textContent = '编辑车辆';
        if (vehicleId) vehicleId.value = vehicle.id;
        if (licensePlate) licensePlate.value = vehicle.license_plate;
        if (brand) brand.value = vehicle.brand;
        if (model) model.value = vehicle.model;
        if (year) year.value = vehicle.year;
        if (owner) owner.value = vehicle.owner;
        if (mileage) mileage.value = vehicle.mileage;
        if (batteryCapacity) batteryCapacity.value = vehicle.battery_capacity || '';
        if (cltcRange) cltcRange.value = vehicle.cltc_range || '';
        if (status) status.value = vehicle.status;
        if (notes) notes.value = vehicle.notes || '';

        this.openModal('vehicle-modal');
    }

    async saveVehicle(event) {
        if (event) {
            event.preventDefault();
        }
        
        // 表单验证
        const licensePlate = document.getElementById('license-plate').value.trim();
        if (!licensePlate) {
            alert('请输入车牌号');
            return;
        }
        
        const brand = document.getElementById('brand').value.trim();
        if (!brand) {
            alert('请输入品牌');
            return;
        }
        
        const model = document.getElementById('model').value.trim();
        if (!model) {
            alert('请输入型号');
            return;
        }

        const vehicleData = {
            license_plate: licensePlate,
            brand: brand,
            model: model,
            owner: document.getElementById('owner').value.trim() || '未知车主',
            year: parseInt(document.getElementById('year').value || 0),
            color: document.getElementById('color').value,
            mileage: parseFloat(document.getElementById('mileage').value || 0),
            battery_capacity: parseFloat(document.getElementById('battery-capacity').value || 0),
            cltc_range: parseInt(document.getElementById('cltc-range').value || 0),
            purchase_date: document.getElementById('purchase-date').value,
            insurance_expiry: document.getElementById('insurance-expiry').value,
            last_service: document.getElementById('last-service').value,
            notes: document.getElementById('notes').value || ''
        };

        const vehicleId = document.getElementById('vehicle-id');
        const id = vehicleId ? vehicleId.value : '';
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${this.apiUrl}/vehicles/${id}` : `${this.apiUrl}/vehicles`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicleData)
            });

            if (response.ok) {
                this.closeModal('vehicle-modal');
                this.loadVehicles();
            } else {
                const error = await response.json();
                let errorMessage = '保存失败';
                if (error.error && error.error.includes('UNIQUE constraint failed')) {
                    errorMessage = '保存失败：车牌号已存在，请使用其他车牌号';
                } else if (error.error) {
                    errorMessage = '保存失败：' + error.error;
                } else {
                    errorMessage = '保存失败，请检查输入信息';
                }
                alert(errorMessage);
            }
        } catch (error) {
            console.error('保存车辆失败:', error);
            alert('网络错误，请检查连接');
        }
    }

    async deleteVehicle(id) {
        if (!confirm('确定要删除这辆车吗？此操作将同时删除该车辆的所有维修记录和充电记录，且不可恢复。')) return;

        try {
            const response = await fetch(`${this.apiUrl}/vehicles/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadVehicles();
                alert('车辆删除成功！');
            } else {
                const error = await response.json();
                alert('删除失败：' + (error.error || '未知错误'));
            }
        } catch (error) {
            console.error('删除车辆失败:', error);
            alert('网络错误：' + error.message);
        }
    }

    async viewVehicle(id) {
        try {
            // 获取车辆基本信息
            const vehicleResponse = await fetch(`${this.apiUrl}/vehicles/${id}`);
            const vehicle = await vehicleResponse.json();
            
            if (!vehicle || vehicle.error) {
                alert('车辆不存在');
                return;
            }

            // 获取车辆维修记录
            const maintenanceResponse = await fetch(`${this.apiUrl}/vehicles/${id}/maintenance`);
            const maintenanceRecords = await maintenanceResponse.json();
            
            // 合并数据
            vehicle.maintenance_records = maintenanceRecords;
            this.currentVehicle = vehicle;
            this.showVehicleDetails(vehicle);
        } catch (error) {
            console.error('获取车辆详情失败:', error);
            alert('获取车辆详情失败，请稍后重试');
        }
    }

    showVehicleDetails(vehicle) {
        const modal = document.getElementById('vehicleDetailsModal');
        
        document.getElementById('detailLicense').textContent = vehicle.license_plate;
        document.getElementById('detailBrandModel').textContent = `${vehicle.brand} ${vehicle.model}`;
        document.getElementById('detailOwner').textContent = vehicle.owner;
        document.getElementById('detailYear').textContent = vehicle.year;
        document.getElementById('detailMileage').textContent = `${vehicle.mileage.toLocaleString()} km`;
        document.getElementById('detailBattery').textContent = vehicle.battery_capacity ? `${vehicle.battery_capacity} kWh` : '无';
        document.getElementById('detailCLTC').textContent = vehicle.cltc_range ? `${vehicle.cltc_range} km` : '无';
        document.getElementById('detailStatus').textContent = vehicle.status;
        document.getElementById('detailNotes').textContent = vehicle.notes || '无';

        this.renderMaintenanceRecords(vehicle.maintenance_records || []);
        this.openModal('vehicleDetailsModal');
    }

    renderMaintenanceRecords(records) {
        const container = document.getElementById('maintenance-records');
        
        if (records.length === 0) {
            container.innerHTML = '<p class="no-records">暂无维修记录</p>';
            return;
        }

        container.innerHTML = records.map(record => `
            <div class="maintenance-record">
                <div class="record-header">
                    <span class="service-type">${record.service_type || record.type || '维修'}</span>
                    <span class="service-date">${record.service_date || record.date || ''}</span>
                </div>
                <div class="record-details">
                    <p class="description">${record.description || ''}</p>
                    <div class="record-info">
                        <span class="cost">费用: ¥${(record.cost || 0).toLocaleString()}</span>
                        ${record.mileage_at_service ? `<span class="mileage">里程: ${record.mileage_at_service.toLocaleString()} km</span>` : ''}
                        ${record.service_location ? `<span class="location">地点: ${record.service_location}</span>` : ''}
                    </div>
                    ${record.next_service_date ? `<div class="next-service">下次保养: ${record.next_service_date}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    showMaintenanceModal(vehicleId) {
        this.currentVehicle = this.vehicles.find(v => v.id === vehicleId);
        document.getElementById('maintenance-vehicle-id').value = vehicleId;
        document.getElementById('maintenance-form').reset();
        this.openModal('maintenance-modal');
    }

    async saveMaintenance(event) {
        if (event) {
            event.preventDefault();
        }

        const vehicleId = document.getElementById('maintenance-vehicle-id')?.value;
        const serviceDate = document.getElementById('service-date')?.value;
        const serviceType = document.getElementById('service-type')?.value;
        const cost = document.getElementById('cost')?.value;
        const mileageAtService = document.getElementById('mileage-at-service')?.value;
        const serviceLocation = document.getElementById('service-location')?.value;
        const description = document.getElementById('description')?.value;
        const nextServiceDate = document.getElementById('next-service-date')?.value;

        const maintenanceData = {
            service_date: serviceDate,
            service_type: serviceType,
            cost: parseFloat(cost || 0),
            mileage_at_service: mileageAtService ? parseFloat(mileageAtService) : null,
            service_location: serviceLocation,
            description: description,
            next_service_date: nextServiceDate
        };

        try {
            const response = await fetch(`${this.apiUrl}/vehicles/${vehicleId}/maintenance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(maintenanceData)
            });

            if (response.ok) {
                this.closeModal('maintenance-modal');
                alert('维修记录添加成功！');
                this.loadVehicles();
            } else {
                const error = await response.json();
                alert('添加失败：' + (error.error || '请检查输入信息'));
            }
        } catch (error) {
            console.error('添加维修记录失败:', error);
            alert('网络错误');
        }
    }

    searchVehicles() {
        const searchInput = document.getElementById('search-input') || document.getElementById('searchInput');
        const clearBtn = document.getElementById('clear-search');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        // 显示/隐藏清除按钮
        if (clearBtn) {
            clearBtn.style.display = searchTerm ? 'inline-block' : 'none';
        }
        
        if (!searchTerm) {
            // 如果搜索框为空，显示所有车辆
            this.renderFilteredVehicles(this.vehicles);
            return;
        }
        
        const filteredVehicles = this.vehicles.filter(vehicle => {
            const searchFields = [
                vehicle.license_plate,
                vehicle.brand,
                vehicle.model,
                vehicle.owner,
                vehicle.color,
                vehicle.status,
                vehicle.year?.toString(),
                vehicle.notes
            ].filter(Boolean).map(field => field.toString().toLowerCase());
            
            return searchFields.some(field => field.includes(searchTerm));
        });
        
        this.renderFilteredVehicles(filteredVehicles);
    }

    clearSearch() {
        const searchInput = document.getElementById('search-input') || document.getElementById('searchInput');
        const clearBtn = document.getElementById('clear-search');
        
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        
        // 重新显示所有车辆
        this.renderFilteredVehicles(this.vehicles);
    }

    // 添加实时搜索功能
    setupRealTimeSearch() {
        const searchInput = document.getElementById('search-input') || document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.searchVehicles();
            });
        }
    }

    renderFilteredVehicles(vehicles) {
        const container = document.getElementById('vehicles-list') || document.getElementById('vehiclesList');
        const emptyState = document.getElementById('empty-state') || document.getElementById('emptyState');
        
        if (!container || !emptyState) return;

        if (vehicles.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">没有找到匹配的车辆</p>';
            emptyState.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = vehicles.map(vehicle => this.createVehicleCard(vehicle)).join('');
    }

    showEmptyState() {
        const vehiclesList = document.getElementById('vehicles-list') || document.getElementById('vehiclesList');
        const emptyState = document.getElementById('empty-state') || document.getElementById('emptyState');
        
        if (vehiclesList) vehiclesList.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 车辆选择功能
    async selectVehicle(id) {
        const vehicle = this.vehicles.find(v => v.id === id);
        if (!vehicle) return;

        try {
            // 先更新数据库：将所有车辆设为未使用
            await fetch(`${this.apiUrl}/vehicles/status/unused`, {
                method: 'PUT'
            });

            // 再将选中的车辆设为使用中
            const response = await fetch(`${this.apiUrl}/vehicles/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_flag: '使用中' })
            });

            if (!response.ok) {
                throw new Error('状态更新失败');
            }

            // 更新本地数据
            this.vehicles.forEach(v => {
                v.status_flag = v.id === id ? '使用中' : '未使用';
            });

            // 移除之前的选中状态
            document.querySelectorAll('.vehicle-card').forEach(card => {
                card.classList.remove('selected');
            });

            // 添加新的选中状态
            const card = document.querySelector(`[data-id="${id}"]`);
            if (card) {
                card.classList.add('selected');
            }

            // 更新当前选中车辆
            this.currentVehicle = vehicle;
            
            // 重新渲染车辆列表以更新状态显示
            this.renderVehicles();
            
            // 触发全局事件，通知其他页面更新
            window.dispatchEvent(new CustomEvent('vehicleSelected', {
                detail: { vehicle: vehicle }
            }));

        } catch (error) {
            console.error('选择车辆失败:', error);
            alert('选择车辆失败，请重试');
        }
    }

    // 兼容HTML中的onclick函数
    closeVehicleModal() {
        this.closeModal('vehicle-modal');
    }

    closeDetailModal() {
        this.closeModal('vehicleDetailsModal');
    }

    closeMaintenanceModal() {
        this.closeModal('maintenance-modal');
    }

    // 移除重复的searchVehicles方法
}

// 全局函数供HTML调用
function closeModal() {
    if (window.vehicleManager) {
        window.vehicleManager.closeVehicleModal();
    }
}

function closeDetailModal() {
    if (window.vehicleManager) {
        window.vehicleManager.closeModal('detail-modal');
    }
}

function closeMaintenanceModal() {
    if (window.vehicleManager) {
        window.vehicleManager.closeModal('maintenance-modal');
    }
}

function searchVehicles() {
    if (window.vehicleManager) {
        window.vehicleManager.searchVehicles();
    }
}

// 初始化车辆管理器
let vehicleManager;

// 在现有的DOMContentLoaded事件后执行
function initVehicleManager() {
    vehicleManager = new VehicleManager();
    window.vehicleManager = vehicleManager; // 设为全局变量
}

// 确保在页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVehicleManager);
} else {
    initVehicleManager();
}