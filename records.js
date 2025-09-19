// 记录列表页面管理器
class RecordsManager {
    constructor() {
        this.apiUrl = 'http://150.230.57.188:3001/api';
        this.currentVehicle = null;
        this.records = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalRecords = 0;
        this.totalPages = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCurrentVehicle();
        this.setupVehicleSelectionListener();
    }

    bindEvents() {
        // 确保DOM元素存在再绑定事件
        const addBtn = document.getElementById('add-record-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddModal();
            });
        }

        const recordForm = document.getElementById('record-form');
        if (recordForm) {
            recordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveRecord();
            });
        }

        // 模态框关闭
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // 分页事件绑定
        const prevBtn = document.getElementById('prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }

        const nextBtn = document.getElementById('next-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }

        const pageSizeSelect = document.getElementById('page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.renderRecords();
            });
        }

        this.setupFormCalculations();
    }

    setupVehicleSelectionListener() {
        window.addEventListener('vehicleSelected', (e) => {
            this.currentVehicle = e.detail.vehicle;
            this.loadRecords();
            this.updateCurrentVehicleInfo();
        });
    }

    loadCurrentVehicle() {
        fetch(`${this.apiUrl}/vehicles`)
            .then(response => response.json())
            .then(vehicles => {
                const usingVehicle = vehicles.find(v => v.status_flag === '使用中');
                if (usingVehicle) {
                    this.currentVehicle = usingVehicle;
                    this.loadRecords();
                    this.updateCurrentVehicleInfo();
                }
            })
            .catch(error => console.error('加载车辆失败:', error));
    }

    updateCurrentVehicleInfo() {
        const vehicleInfo = document.getElementById('current-vehicle-info');
        if (vehicleInfo && this.currentVehicle) {
            vehicleInfo.innerHTML = `
                <div class="vehicle-info-card">
                    <div class="vehicle-header">
                        <div class="vehicle-info-left">
                            <div class="vehicle-avatar">
                                <i class="fas fa-car"></i>
                            </div>
                            <div class="vehicle-title">
                                <h3>${this.currentVehicle.brand} ${this.currentVehicle.model}</h3>
                                <span class="license-plate">${this.currentVehicle.license_plate}</span>
                            </div>
                        </div>
                        <div class="vehicle-specs">
                            <div class="spec-item">
                                <i class="fas fa-road"></i>
                                <span>${this.currentVehicle.cltc_range || 0} km</span>
                            </div>
                            <div class="spec-item">
                                <i class="fas fa-battery-full"></i>
                                <span>${this.currentVehicle.battery_capacity || 0} kWh</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async loadRecords() {
        if (!this.currentVehicle) return;

        try {
            const response = await fetch(`${this.apiUrl}/vehicles/${this.currentVehicle.id}/charging`);
            const data = await response.json();
            this.records = Array.isArray(data) ? data : [];
            this.renderRecords();
            this.updateStats();
        } catch (error) {
            console.error('加载记录失败:', error);
            this.records = [];
            this.renderRecords();
        }
    }

    renderRecords() {
        const container = document.getElementById('records-list');
        const emptyState = document.getElementById('empty-state');
        const paginationContainer = document.getElementById('pagination-container');

        if (!container || !emptyState || !paginationContainer) return;

        if (!this.records || this.records.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            paginationContainer.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';

        // 计算分页数据
        this.totalRecords = this.records.length;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.totalRecords);
        const paginatedRecords = this.records.slice(startIndex, endIndex);

        // 渲染当前页数据
        container.innerHTML = paginatedRecords.map(record => this.createRecordRow(record)).join('');

        // 更新分页控件
        this.updatePaginationControls(startIndex, endIndex);
    }

    createRecordRow(record) {
        // 格式化日期显示，精确到时分秒
        let formattedDate = '-';
        if (record.charging_date) {
            const date = new Date(record.charging_date);
            // 格式化为: YYYY-MM-DD HH:mm:ss
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${record.meter_charging_kwh || 0}</td>
                <td>¥${record.amount || 0}</td>
                <td>${record.driven_mileage || 0}</td>
                <td>${record.energy_loss_kwh || 0}</td>
                <td>${record.charging_location || '-'}</td>
                <td>
                    <div class="record-actions">
                        <button class="btn-edit" onclick="recordsManager.editRecord(${record.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="recordsManager.deleteRecord(${record.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    updateStats() {
        const totalRecords = this.records?.length || 0;
        const totalCharging = this.records?.reduce((sum, r) => sum + (r.meter_charging_kwh || 0), 0) || 0;
        const totalCarCharging = this.records?.reduce((sum, r) => sum + (r.car_charging_kwh || 0), 0) || 0;
        const totalAmount = this.records?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
        const totalMileage = this.records?.reduce((sum, r) => sum + (r.driven_mileage || 0), 0) || 0;
        const totalLoss = this.records?.reduce((sum, r) => sum + (r.energy_loss_kwh || 0), 0) || 0;

        // 平均百公里电耗 = ((总电表充电量(kWh)-总电量损耗(kWh)-最新一次的车充电量（kWh）) / 总行驶里程) × 100
        const latestCarCharging = this.records?.length > 0 ? (this.records[0].car_charging_kwh || 0) : 0;
        const avgConsumption = totalMileage > 0 ? ((totalCharging - totalLoss - latestCarCharging) / totalMileage * 100) : 0;
        // 平均每公里花费 = (总充电金额 - 最新一次的车充金额) / 总行驶里程
        const latestCarAmount = this.records?.length > 0 ? (this.records[0].amount || 0) : 0;
        const avgCost = totalMileage > 0 ? ((totalAmount - latestCarAmount) / totalMileage) : 0;
        const avgPrice = totalCharging > 0 ? (totalAmount / totalCharging) : 0;

        const elements = [
            'total-records', 'total-charging', 'total-car-charging', 'total-amount', 
            'total-mileage', 'total-loss', 'avg-consumption', 'avg-cost', 'avg-price'
        ];
        
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                switch(id) {
                    case 'total-records': el.textContent = `${totalRecords} 次`; break;
                    case 'total-charging': el.textContent = `${totalCharging.toFixed(2)} kWh`; break;
                    case 'total-car-charging': el.textContent = `${totalCarCharging.toFixed(2)} kWh`; break;
                    case 'total-amount': el.textContent = `¥${totalAmount.toFixed(2)} 元`; break;
                    case 'total-mileage': el.textContent = `${totalMileage} km`; break;
                    case 'total-loss': el.textContent = `${totalLoss.toFixed(2)} kWh`; break;
                    case 'avg-consumption': el.textContent = `${avgConsumption.toFixed(2)} kWh`; break;
                    case 'avg-cost': el.textContent = `¥${avgCost.toFixed(2)} 元`; break;
                    case 'avg-price': el.textContent = `¥${avgPrice.toFixed(2)} 元`; break;
                }
            }
        });

        // 更新环比数据
        this.updateMonthlyStats();
    }

    updatePaginationControls(startIndex, endIndex) {
        const paginationContainer = document.getElementById('pagination-container');
        const paginationInfo = document.getElementById('pagination-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const paginationNumbers = document.getElementById('pagination-numbers');

        if (!paginationContainer || !paginationInfo || !prevBtn || !nextBtn || !paginationNumbers) return;

        paginationContainer.style.display = 'flex';

        // 更新分页信息
        paginationInfo.textContent = `显示 ${startIndex + 1}-${endIndex} 条，共 ${this.totalRecords} 条记录`;

        // 更新按钮状态
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;

        // 生成页码
        paginationNumbers.innerHTML = '';
        
        const maxPages = 5; // 最多显示5个页码
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
        
        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        // 首页和省略号
        if (startPage > 1) {
            paginationNumbers.appendChild(this.createPageNumber(1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '8px 4px';
                paginationNumbers.appendChild(ellipsis);
            }
        }

        // 页码
        for (let i = startPage; i <= endPage; i++) {
            paginationNumbers.appendChild(this.createPageNumber(i));
        }s

        // 末页和省略号
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '8px 4px';
                paginationNumbers.appendChild(ellipsis);
            }
            paginationNumbers.appendChild(this.createPageNumber(this.totalPages));
        }
    }

    createPageNumber(page) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = page;
        pageBtn.className = 'page-number';
        if (page === this.currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.addEventListener('click', () => this.goToPage(page));
        return pageBtn;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderRecords();
    }

    updateMonthlyStats() {
        if (!this.records || this.records.length === 0) {
            this.setMonthlyStats(0, 0, 0, 0, 0, 0);
            return;
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // 计算本月数据
        const currentMonthRecords = this.records.filter(record => {
            const recordDate = new Date(record.date || record.charging_date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });

        // 计算上月数据
        const lastMonthRecords = this.records.filter(record => {
            const recordDate = new Date(record.date || record.charging_date);
            return recordDate.getMonth() === lastMonth && recordDate.getFullYear() === lastMonthYear;
        });

        const currentMonthRecordsCount = currentMonthRecords.length;
        const currentMonthMileage = currentMonthRecords.reduce((sum, r) => sum + (r.driven_mileage || 0), 0);
        const currentMonthAmount = currentMonthRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

        const lastMonthRecordsCount = lastMonthRecords.length;
        const lastMonthMileage = lastMonthRecords.reduce((sum, r) => sum + (r.driven_mileage || 0), 0);
        const lastMonthAmount = lastMonthRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

        // 计算环比
        const recordsChange = this.calculateChange(currentMonthRecordsCount, lastMonthRecordsCount);
        const mileageChange = this.calculateChange(currentMonthMileage, lastMonthMileage);
        const amountChange = this.calculateChange(currentMonthAmount, lastMonthAmount);

        this.setMonthlyStats(
            currentMonthRecordsCount,
            currentMonthMileage,
            currentMonthAmount,
            recordsChange,
            mileageChange,
            amountChange,
            lastMonthRecordsCount,
            lastMonthMileage,
            lastMonthAmount
        );
    }

    calculateChange(current, previous) {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return ((current - previous) / previous * 100);
    }

    setMonthlyStats(records, mileage, amount, recordsChange, mileageChange, amountChange, lastMonthRecords = 0, lastMonthMileage = 0, lastMonthAmount = 0) {
        const elements = [
            { id: 'monthly-records', value: `${records} 次` },
            { id: 'monthly-mileage', value: `${mileage.toFixed(2)} km` },
            { id: 'monthly-amount', value: `¥${amount.toFixed(2)} 元` }
        ];

        elements.forEach(item => {
            const el = document.getElementById(item.id);
            if (el) el.textContent = item.value;
        });

        // 更新趋势指示器
        this.updateTrendIndicator('records-trend', recordsChange, records, lastMonthRecords);
        this.updateTrendIndicator('mileage-trend', mileageChange, mileage, lastMonthMileage);
        this.updateTrendIndicator('amount-trend', amountChange, amount, lastMonthAmount);
    }

    updateTrendIndicator(elementId, change, currentValue = 0, previousValue = 0) {
        // 更新传统的趋势指示器
        const element = document.getElementById(elementId);
        if (element) {
            const icon = element.querySelector('i');
            const span = element.querySelector('span');

            if (change > 0) {
                icon.className = 'fas fa-arrow-up';
                element.className = 'trend-indicator trend-up';
                span.textContent = `+${change.toFixed(1)}%`;
            } else if (change < 0) {
                icon.className = 'fas fa-arrow-down';
                element.className = 'trend-indicator trend-down';
                span.textContent = `${change.toFixed(1)}%`;
            } else {
                icon.className = 'fas fa-minus';
                element.className = 'trend-indicator trend-neutral';
                span.textContent = '0%';
            }
        }

        // 更新内联趋势指示器（如果存在）
        const inlineElementId = elementId.replace('-trend', '-trend-inline');
        const inlineElement = document.getElementById(inlineElementId);
        if (inlineElement) {
            // 根据元素ID确定显示的单位和值
            let displayValue = 0;
            let unit = '';
            let diffValue = 0;
            
            if (elementId.includes('records')) {
                displayValue = currentValue;
                unit = '次';
                diffValue = currentValue - previousValue;
            } else if (elementId.includes('mileage')) {
                displayValue = currentValue;
                unit = 'km';
                diffValue = currentValue - previousValue;
            } else if (elementId.includes('amount')) {
                displayValue = currentValue;
                unit = '元';
                diffValue = currentValue - previousValue;
            }
            
            // 格式化显示值
            let formattedValue;
            if (elementId.includes('mileage') || elementId.includes('amount')) {
                formattedValue = displayValue.toFixed(2);
            } else {
                formattedValue = displayValue;
            }
            
            // 格式化差值
            let formattedDiff;
            if (diffValue > 0) {
                formattedDiff = `+${diffValue.toFixed(2)}`;
            } else {
                formattedDiff = `${diffValue.toFixed(2)}`;
            }
            
            // 根据差值设置图标和样式
            let iconHtml = '<i class="fas fa-minus"></i>';
            if (diffValue > 0) {
                inlineElement.className = 'trend-inline trend-up';
                iconHtml = '<i class="fas fa-arrow-up"></i>';
            } else if (diffValue < 0) {
                inlineElement.className = 'trend-inline trend-down';
                iconHtml = '<i class="fas fa-arrow-down"></i>';
            } else {
                inlineElement.className = 'trend-inline trend-neutral';
            }
            
            // 格式化环比值
            let formattedChange;
            if (change > 0) {
                formattedChange = `+${change.toFixed(2)}`;
            } else {
                formattedChange = `${change.toFixed(2)}`;
            }
            
            // 设置内联元素的HTML内容，同时显示差值和环比
            inlineElement.innerHTML = `${iconHtml} ${formattedDiff}${unit} (${formattedChange}%) 较上月`;
        }
    }

    setupFormCalculations() {
        const lastMileage = document.getElementById('last-mileage');
        const currentMileage = document.getElementById('current-mileage');
        const drivenMileage = document.getElementById('driven-mileage');
        const meterCharging = document.getElementById('meter-charging');
        const beforePercentage = document.getElementById('before-percentage');
        const afterPercentage = document.getElementById('after-percentage');
        const carCharging = document.getElementById('car-charging');
        const energyLoss = document.getElementById('energy-loss');

        if (!lastMileage || !currentMileage || !drivenMileage || 
            !meterCharging || !beforePercentage || !afterPercentage || 
            !carCharging || !energyLoss) return;

        const calculateDrivenMileage = () => {
            const last = parseFloat(lastMileage.value) || 0;
            const current = parseFloat(currentMileage.value) || 0;
            drivenMileage.value = Math.max(0, current - last).toFixed(1);
        };

        const calculateEnergyValues = () => {
            const meter = parseFloat(meterCharging.value) || 0;
            const before = parseFloat(beforePercentage.value) || 0;
            const after = parseFloat(afterPercentage.value) || 0;
            
            // 假设电池容量为60kWh（可以根据车辆实际容量调整）
            const batteryCapacity = this.currentVehicle?.battery_capacity || 60;
            const carCharge = ((after - before) / 100) * batteryCapacity;
            carCharging.value = carCharge.toFixed(2);
            energyLoss.value = Math.max(0, meter - carCharge).toFixed(2);
        };

        [currentMileage, lastMileage].forEach(input => {
            if (input) input.addEventListener('input', calculateDrivenMileage);
        });

        [meterCharging, beforePercentage, afterPercentage].forEach(input => {
            if (input) input.addEventListener('input', calculateEnergyValues);
        });
    }

    async showAddModal() {
        if (!this.currentVehicle) {
            alert('请先选择一辆车！');
            return;
        }

        // 重新获取最新的车辆信息，确保里程数是最新的
        try {
            const response = await fetch(`${this.apiUrl}/vehicles/${this.currentVehicle.id}`);
            if (response.ok) {
                const updatedVehicle = await response.json();
                this.currentVehicle = {...this.currentVehicle, ...updatedVehicle};
            }
        } catch (error) {
            console.error('获取最新车辆信息失败:', error);
        }

        document.getElementById('record-modal-title').textContent = '新增充电记录';
        document.getElementById('record-form').reset();
        
        // 设置默认值
        const now = new Date();
        // 格式化为 datetime-local 所需的格式: YYYY-MM-DDTHH:mm
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('charging-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('last-mileage').value = this.currentVehicle.mileage || 0;
        
        this.showModal('addRecordModal');
    }

    editRecord(id) {
        const record = this.records.find(r => r.id === id);
        if (!record) return;

        document.getElementById('record-modal-title').textContent = '编辑充电记录';
        
        // 填充表单数据
        // 将日期格式转换为 datetime-local 格式
        let chargingDateValue = '';
        if (record.charging_date) {
            const date = new Date(record.charging_date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            chargingDateValue = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        document.getElementById('charging-date').value = chargingDateValue;
        document.getElementById('charging-location').value = record.charging_location || '';
        document.getElementById('last-mileage').value = record.previous_mileage || 0;
        document.getElementById('current-mileage').value = record.current_mileage || 0;
        document.getElementById('driven-mileage').value = record.driven_mileage || 0;
        document.getElementById('meter-charging').value = record.meter_charging_kwh || 0;
        document.getElementById('before-percentage').value = record.charging_start_percentage || 0;
        document.getElementById('after-percentage').value = record.charging_end_percentage || 0;
        document.getElementById('car-charging').value = record.car_charging_kwh || 0;
        document.getElementById('energy-loss').value = record.energy_loss_kwh || 0;
        document.getElementById('charging-amount').value = record.amount || 0;
        document.getElementById('charging-notes').value = record.notes || '';

        // 设置编辑模式
        this.editingRecordId = id;
        this.showModal('addRecordModal');
    }

    async saveRecord() {
        const formData = new FormData(document.getElementById('record-form'));
        const record = {
            vehicle_id: this.currentVehicle.id,
            charging_date: formData.get('charging_date'),
            charging_location: formData.get('charging_location'),
            previous_mileage: parseFloat(formData.get('last_mileage')) || 0,
            current_mileage: parseFloat(formData.get('current_mileage')) || 0,
            driven_mileage: parseFloat(formData.get('driven_mileage')) || 0,
            meter_charging_kwh: parseFloat(formData.get('meter_charging')) || 0,
            charging_start_percentage: parseFloat(formData.get('before_percentage')) || 0,
            charging_end_percentage: parseFloat(formData.get('after_percentage')) || 0,
            car_charging_kwh: parseFloat(formData.get('car_charging')) || 0,
            energy_loss_kwh: parseFloat(formData.get('energy_loss')) || 0,
            amount: parseFloat(formData.get('charging_amount')) || 0,
            notes: formData.get('charging_notes')
        };

        try {
            let url = `${this.apiUrl}/vehicles/${this.currentVehicle.id}/charging`;
            let method = 'POST';

            if (this.editingRecordId) {
                url = `${this.apiUrl}/charging/${this.editingRecordId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(record)
            });

            if (response.ok) {
                // 更新车辆总里程
                await this.updateVehicleMileage(record.current_mileage);
                
                // 同步更新前端车辆对象的里程数
                if (this.currentVehicle) {
                    this.currentVehicle.mileage = record.current_mileage;
                }
                
                this.closeModal('addRecordModal');
                this.loadRecords();
                this.editingRecordId = null;
            } else {
                alert('保存记录失败');
            }
        } catch (error) {
            console.error('保存记录失败:', error);
            alert('保存记录失败');
        }
    }

    async updateVehicleMileage(mileage) {
        if (!this.currentVehicle) return;

        try {
            await fetch(`${this.apiUrl}/vehicles/${this.currentVehicle.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mileage: mileage })
            });
        } catch (error) {
            console.error('更新车辆里程失败:', error);
        }
    }

    async deleteRecord(id) {
        if (!confirm('确定要删除这条记录吗？')) return;

        try {
            const response = await fetch(`${this.apiUrl}/charging/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadRecords();
            } else {
                const errorData = await response.json();
                alert(`删除记录失败: ${errorData.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('删除记录失败:', error);
            alert('删除记录失败: 网络错误或服务器无响应');
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // 防止背景滚动
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // 恢复背景滚动
        }
    }
}

// 初始化记录管理器
let recordsManager;
document.addEventListener('DOMContentLoaded', () => {
    recordsManager = new RecordsManager();
    
    // 添加弹窗外部点击关闭功能
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('addRecordModal');
        if (e.target === modal) {
            recordsManager.closeModal('addRecordModal');
        }
    });
    
    // 添加ESC键关闭弹窗功能
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('addRecordModal');
            if (modal && modal.style.display === 'block') {
                recordsManager.closeModal('addRecordModal');
            }
        }
    });
});

// 全局函数
function closeRecordModal() {
    recordsManager.closeModal('addRecordModal');
}