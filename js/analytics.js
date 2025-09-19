// 统计分析页面管理器
class AnalyticsManager {
    constructor() {
        this.apiUrl = 'http://150.230.57.188:3001/api';
        this.currentVehicle = null;
        this.vehicles = [];
        this.chargingChart = null;
        this.init();
    }

    init() {
        this.loadVehicles();
        this.bindEvents();
    }

    bindEvents() {
        const vehicleSelect = document.getElementById('vehicle-select');
        if (vehicleSelect) {
            vehicleSelect.addEventListener('change', (e) => {
                const selectedVehicleId = parseInt(e.target.value);
                this.currentVehicle = this.vehicles.find(v => v.id === selectedVehicleId);
                this.loadChargingData();
            });
        }
    }

    async loadVehicles() {
        try {
            const response = await fetch(`${this.apiUrl}/vehicles`);
            const data = await response.json();
            this.vehicles = Array.isArray(data) ? data : [];
            this.populateVehicleSelector();
            
            // 默认选择使用中的车辆
            const usingVehicle = this.vehicles.find(v => v.status_flag === '使用中');
            if (usingVehicle) {
                this.currentVehicle = usingVehicle;
                document.getElementById('vehicle-select').value = usingVehicle.id;
                this.loadChargingData();
            }
        } catch (error) {
            console.error('加载车辆失败:', error);
            this.showError('加载车辆数据失败');
        }
    }

    populateVehicleSelector() {
        const vehicleSelect = document.getElementById('vehicle-select');
        if (!vehicleSelect) return;

        vehicleSelect.innerHTML = '';
        
        if (this.vehicles.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '暂无车辆';
            vehicleSelect.appendChild(option);
            return;
        }

        this.vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.id;
            option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.license_plate})`;
            vehicleSelect.appendChild(option);
        });
    }

    async loadChargingData() {
        if (!this.currentVehicle) return;

        try {
            const response = await fetch(`${this.apiUrl}/vehicles/${this.currentVehicle.id}/charging`);
            const data = await response.json();
            const records = Array.isArray(data) ? data : [];
            
            this.updateAnalyticsStats(records);
            this.renderChargingLocationChart(records);
            this.renderMonthlyMileageChart(records);
            this.renderMonthlyAmountChart(records);
            this.renderMonthlyCountChart(records);
        } catch (error) {
            console.error('加载充电数据失败:', error);
            this.showError('加载充电数据失败');
        }
    }


    updateAnalyticsStats(records) {
        // 总充电次数
        const totalRecords = records.length;
        document.getElementById('total-records-analytics').textContent = totalRecords;

        // 总行驶里程 - 使用正确的字段名
        const totalMileage = records.reduce((sum, record) => {
            return sum + (parseFloat(record.driven_mileage) || parseFloat(record.distance_driven) || 0);
        }, 0);
        document.getElementById('total-mileage-analytics').textContent = totalMileage.toFixed(1);

        // 总充电金额 - 使用正确的字段名
        const totalAmount = records.reduce((sum, record) => {
            return sum + (parseFloat(record.amount) || 0);
        }, 0);
        document.getElementById('total-amount-analytics').textContent = `¥${totalAmount.toFixed(2)}`;

        // 充电地点数量 - 过滤有效地点
        const uniqueLocations = [...new Set(records.map(record => 
            record.charging_location || record.location
        ).filter(location => location && location !== '未知地点'))];
        document.getElementById('total-locations').textContent = uniqueLocations.length;
    }

    renderChargingLocationChart(records) {
        // 统计充电地点分布
        const locationStats = {};
        records.forEach(record => {
            const location = record.charging_location || record.location || '未知地点';
            if (location && location !== '未知地点') {
                locationStats[location] = (locationStats[location] || 0) + 1;
            }
        });

        const locations = Object.keys(locationStats);
        const counts = Object.values(locationStats);
        
        // 更新统计摘要
        document.getElementById('total-locations').textContent = locations.length;

        // 生成颜色
        const colors = this.generateColors(locations.length);

        // 销毁现有图表
        if (this.chargingChart) {
            this.chargingChart.destroy();
        }

        // 创建新图表
        const ctx = document.getElementById('charging-location-chart').getContext('2d');
        this.chargingChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: locations,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderColor: colors.map(color => this.adjustBrightness(color, -20)),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // 使用自定义图例
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value}次 (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // 渲染自定义图例
        this.renderLegend(locations, counts, colors);
    }

    renderLegend(locations, counts, colors) {
        const legendContainer = document.getElementById('location-legend');
        if (!legendContainer) return;

        const total = counts.reduce((a, b) => a + b, 0);
        
        legendContainer.innerHTML = '';
        locations.forEach((location, index) => {
            const count = counts[index];
            const percentage = ((count / total) * 100).toFixed(1);
            
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${colors[index]}"></div>
                <span>${location}: ${count}次 (${percentage}%)</span>
            `;
            legendContainer.appendChild(legendItem);
        });
    }

    generateColors(count) {
        const baseColors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
            '#00f2fe', '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f',
            '#a8edea', '#fed6e3', '#ff8a80', '#ea6100', '#64b5f6',
            '#ba68c8', '#4caf50', '#ff9800', '#f44336', '#9c27b0'
        ];

        if (count <= baseColors.length) {
            return baseColors.slice(0, count);
        }

        // 如果需要更多颜色，生成随机颜色
        const colors = [...baseColors];
        for (let i = baseColors.length; i < count; i++) {
            colors.push(`#${Math.floor(Math.random()*16777215).toString(16)}`);
        }
        return colors;
    }

    adjustBrightness(color, amount) {
        const usePound = color[0] === '#';
        const col = usePound ? color.slice(1) : color;
        const num = parseInt(col, 16);
        let r = (num >> 16) + amount;
        let g = (num >> 8 & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;
        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }

    renderMonthlyMileageChart(records) {
        // 按月份统计行驶里程 - 使用充电记录中的实际行驶里程数据
        const monthlyStats = {};
        
        records.forEach(record => {
            // 优先使用charging_date，回退到date字段
            const dateStr = record.charging_date || record.date || record.date;
            if (!dateStr) return;
            
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return;
            
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            // 使用充电记录中的行驶里程字段，按优先级选择
            const distance = parseFloat(record.driven_mileage) || 
                           parseFloat(record.distance_driven) || 
                           parseFloat(record.driven_mileage) || 0;
            
            if (distance > 0) {
                monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + distance;
            }
        });

        // 确保包含最近12个月的数据，即使某些月份没有记录也显示
        const currentDate = new Date();
        const allMonths = [];
        for (let i = 11; i >= 0; i--) {
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
            allMonths.push(monthKey);
            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = 0; // 确保没有数据的月份显示为0
            }
        }

        // 排序月份并获取数据
        const sortedMonths = Object.keys(monthlyStats).sort();
        const monthlyData = sortedMonths.map(month => monthlyStats[month]);
        
        // 计算统计摘要（排除0值的月份）
        const validData = monthlyData.filter(d => d > 0);
        const totalMileage = validData.reduce((sum, mileage) => sum + mileage, 0);
        const avgMonthlyMileage = validData.length > 0 ? totalMileage / validData.length : 0;
        const maxMileage = Math.max(...monthlyData);

        // 销毁现有图表
        if (this.mileageChart) {
            this.mileageChart.destroy();
        }

        // 创建优化后的图表
        const ctx = document.getElementById('monthly-mileage-chart').getContext('2d');
        this.mileageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedMonths.map(month => {
                    const [year, monthNum] = month.split('-');
                    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
                }),
                datasets: [{
                    label: '月度行驶里程',
                    data: monthlyData,
                    borderColor: '#667eea',
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
                        gradient.addColorStop(1, 'rgba(102, 126, 234, 0.0)');
                        return gradient;
                    },
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: monthlyData.map(value => value > 0 ? '#667eea' : '#ccc'),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: monthlyData.map(value => value > 0 ? 6 : 4),
                    pointHoverRadius: 8,
                    segment: {
                        borderColor: ctx => ctx.p0.parsed.y === 0 || ctx.p1.parsed.y === 0 ? '#ddd' : '#667eea'
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                const value = context.parsed.y;
                                if (value === 0) return '无行驶记录';
                                return `行驶里程: ${value.toFixed(1)} km`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        beginAtZero: true,
                        max: maxMileage * 1.1, // 给顶部留出一些空间
                        title: {
                            display: true,
                            text: '行驶里程 (公里)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                if (value === 0) return '0';
                                return value >= 1000 ? (value/1000).toFixed(1) + 'k' : value.toFixed(0);
                            },
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '时间 (月份)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        });

        // 渲染优化的月度图例
        this.renderMileageLegend(sortedMonths, monthlyData, totalMileage, avgMonthlyMileage, maxMileage);
    }

    renderMileageLegend(months, data, total, avg, max) {
        const legendContainer = document.getElementById('mileage-legend');
        if (!legendContainer) return;

        // 计算有效数据月份和趋势
        const validData = data.filter(d => d > 0);
        const validMonths = validData.length;
        
        // 计算趋势 - 基于有效数据的线性趋势
        let trend = 0;
        let trendText = '';
        if (validData.length >= 3) {
            const firstValid = data.findIndex(d => d > 0);
            const lastValid = data.findIndex((d, idx) => idx > firstValid && d > 0);
            if (firstValid !== -1 && lastValid !== -1 && firstValid !== lastValid) {
                const firstVal = data[firstValid];
                const lastVal = data[lastValid];
                const monthsDiff = lastValid - firstValid;
                if (monthsDiff > 0) {
                    trend = (lastVal - firstVal) / monthsDiff;
                    trendText = `${trend > 0 ? '↗' : '↘'} ${Math.abs(trend).toFixed(0)} km/月`;
                }
            }
        }
        
        legendContainer.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background-color: #667eea"></div>
                <span>总里程: ${total.toFixed(0)} km</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #764ba2"></div>
                <span>平均月里程: ${avg.toFixed(0)} km</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #f093fb"></div>
                <span>最高月里程: ${max.toFixed(0)} km</span>
            </div>
            <div class="legend-item">
                <span>有效月份: ${validMonths}/${months.length}</span>
            </div>
            ${trendText ? `
            <div class="legend-item">
                <span>趋势: ${trendText}</span>
            </div>` : ''}
        `;
    }

    renderMonthlyAmountChart(records) {
        // 按月份统计充电金额
        const monthlyAmountStats = {};
        records.forEach(record => {
            const dateStr = record.charging_date || record.date;
            if (!dateStr) return;
            
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return;
            
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const amount = parseFloat(record.amount) || 0;
            
            if (amount > 0) {
                monthlyAmountStats[monthKey] = (monthlyAmountStats[monthKey] || 0) + amount;
            }
        });

        // 排序月份
        const sortedMonths = Object.keys(monthlyAmountStats).sort();
        const monthlyAmountData = sortedMonths.map(month => monthlyAmountStats[month]);
        
        // 更新月度金额统计摘要
        const totalAmount = monthlyAmountData.reduce((sum, amount) => sum + amount, 0);
        const avgMonthlyAmount = monthlyAmountData.length > 0 ? totalAmount / monthlyAmountData.length : 0;

        // 销毁现有图表
        if (this.amountChart) {
            this.amountChart.destroy();
        }

        // 创建新图表
        const ctx = document.getElementById('monthly-amount-chart').getContext('2d');
        this.amountChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedMonths.map(month => {
                    const [year, monthNum] = month.split('-');
                    return `${year}年${monthNum}月`;
                }),
                datasets: [{
                    label: '月度充电金额',
                    data: monthlyAmountData,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // 使用自定义图例
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `充电金额: ¥${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '充电金额 (¥)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '¥' + value.toFixed(0);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '月份'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        // 渲染月度金额图例
        this.renderAmountLegend(sortedMonths, monthlyAmountData, totalAmount, avgMonthlyAmount);
    }

    renderAmountLegend(months, data, total, avg) {
        const legendContainer = document.getElementById('amount-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background-color: #667eea"></div>
                <span>总金额: ¥${total.toFixed(2)}</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #764ba2"></div>
                <span>平均月金额: ¥${avg.toFixed(2)}</span>
            </div>
            <div class="legend-item">
                <span>数据月份: ${months.length}个月</span>
            </div>
        `;
    }

    renderMonthlyCountChart(records) {
        // 按月份统计充电次数
        const monthlyCountStats = {};
        records.forEach(record => {
            const dateStr = record.charging_date || record.date;
            if (!dateStr) return;
            
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return;
            
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyCountStats[monthKey] = (monthlyCountStats[monthKey] || 0) + 1;
        });

        // 排序月份
        const sortedMonths = Object.keys(monthlyCountStats).sort();
        const monthlyCountData = sortedMonths.map(month => monthlyCountStats[month]);
        
        // 更新月度次数统计摘要
        const totalCount = monthlyCountData.reduce((sum, count) => sum + count, 0);
        const avgMonthlyCount = monthlyCountData.length > 0 ? totalCount / monthlyCountData.length : 0;

        // 销毁现有图表
        if (this.countChart) {
            this.countChart.destroy();
        }

        // 创建新图表
        const ctx = document.getElementById('monthly-count-chart').getContext('2d');
        this.countChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedMonths.map(month => {
                    const [year, monthNum] = month.split('-');
                    return `${year}年${monthNum}月`;
                }),
                datasets: [{
                    label: '月度充电次数',
                    data: monthlyCountData,
                    borderColor: '#f093fb',
                    backgroundColor: 'rgba(240, 147, 251, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f093fb',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // 使用自定义图例
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `充电次数: ${context.parsed.y}次`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '充电次数'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '次';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '月份'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        // 渲染月度次数图例
        this.renderCountLegend(sortedMonths, monthlyCountData, totalCount, avgMonthlyCount);
    }

    renderCountLegend(months, data, total, avg) {
        const legendContainer = document.getElementById('count-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background-color: #f093fb"></div>
                <span>总次数: ${total}次</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #764ba2"></div>
                <span>平均月次数: ${avg.toFixed(1)}次</span>
            </div>
            <div class="legend-item">
                <span>数据月份: ${months.length}个月</span>
            </div>
        `;
    }

    showError(message) {
        const container = document.querySelector('.charts-grid');
        if (container) {
            container.innerHTML = `
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>错误</h3>
                    </div>
                    <div style="text-align: center; color: #f44336; padding: 2rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>${message}</p>
                    </div>
                </div>
            `;
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsManager = new AnalyticsManager();
});

// 监听车辆选择事件（与其他页面保持一致）
document.addEventListener('vehicleSelected', (e) => {
    if (window.analyticsManager && e.detail.vehicle) {
        const vehicleSelect = document.getElementById('vehicle-select');
        if (vehicleSelect) {
            vehicleSelect.value = e.detail.vehicle.id;
            window.analyticsManager.currentVehicle = e.detail.vehicle;
            window.analyticsManager.loadChargingData();
        }
    }
});

