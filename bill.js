class BillManager {
    constructor() {
        // 检查是否在本地开发环境
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '[::1]';
        
        // 根据环境设置 API URL
        this.apiUrl = isLocalhost ? 'http://localhost:3001/api' : 'http://150.230.57.188:3001/api';
        this.bills = [];
        this.categories = [
            { id: 1, name: '餐饮', type: 'expense', color: '#FF6B6B' },
            { id: 2, name: '交通', type: 'expense', color: '#4ECDC4' },
            { id: 3, name: '购物', type: 'expense', color: '#45B7D1' },
            { id: 4, name: '娱乐', type: 'expense', color: '#96CEB4' },
            { id: 5, name: '工资', type: 'income', color: '#FFEAA7' },
            { id: 6, name: '奖金', type: 'income', color: '#DDA0DD' }
        ];
        this.currentFilter = {
            startDate: null,
            endDate: null,
            category: null,
            minAmount: null,
            maxAmount: null
        };
        this.currentPage = 1;
        this.pageSize = 20;
        this.filteredBills = []; // 初始化filteredBills数组
        this.monthlyStats = null; // 初始化月度统计数据
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadCategories();  // 先加载分类数据
        await this.loadBills();
        await this.loadMonthlyStats(); // 加载月度统计数据
        this.renderBills();
        this.renderCategories();
        this.renderCharts();
    }

    bindEvents() {
        // 快速记账表单提交
        const billForm = document.getElementById('bill-form');
        if (billForm) {
            billForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // 搜索筛选
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        // 重置筛选
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }

        // 添加分类按钮
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.showAddCategoryModal());
        }

        // 分类表单提交
        const categoryForm = document.getElementById('category-form');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadBills();
            });
        }

        // 新增账单按钮
        const addBillBtn = document.getElementById('add-bill-btn');
        if (addBillBtn) {
            addBillBtn.addEventListener('click', () => {
                // 显示新增账单模态框
                document.getElementById('add-bill-modal').style.display = 'block';
                // 设置默认日期为今天
                document.getElementById('date').value = new Date().toISOString().split('T')[0];
            });
        }

        // 关闭模态框
        const closeButtons = document.querySelectorAll('.modal .close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.modal').style.display = 'none';
            });
        });

        // 点击模态框外部关闭
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // 每页显示数量改变
        const pageSizeSelect = document.getElementById('page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.renderBills();
                this.renderCharts(); // 更新图表
            });
        }
    }

    async loadBills() {
        try {
            const response = await fetch(`${this.apiUrl}/bills`);
            if (response.ok) {
                this.bills = await response.json();
            } else {
                console.error('Failed to load bills');
            }
        } catch (error) {
            console.error('Error loading bills:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.apiUrl}/categories`);
            if (response.ok) {
                this.categories = await response.json();
                console.log('Categories loaded from server:', this.categories);
            } else {
                console.error('Failed to load categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadMonthlyStats() {
        try {
            const response = await fetch(`${this.apiUrl}/bills/stats/monthly`);
            if (response.ok) {
                this.monthlyStats = await response.json();
                this.renderMonthlyStats();
            } else {
                console.error('Failed to load monthly stats');
            }
        } catch (error) {
            console.error('Error loading monthly stats:', error);
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        console.log('Form submit event triggered');
        const form = e.target;
        const formData = new FormData(form);
        
        // 调试日志
        console.log('Form data entries:');
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }
        
        const bill = {
            amount: parseFloat(formData.get('amount')),
            category_id: parseInt(formData.get('category')),
            date: formData.get('date'),
            notes: formData.get('notes')
        };

        console.log('Bill object to be sent:', bill);

        // 验证数据
        if (isNaN(bill.amount) || !bill.category_id || !bill.date) {
            console.error('Invalid bill data:', bill);
            alert('请确保填写了所有必填字段且数据格式正确');
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/bills`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bill)
            });

            console.log('Response status:', response.status);
            if (response.ok) {
                const newBill = await response.json();
                console.log('New bill created:', newBill);
                this.bills.push(newBill);
                form.reset();
                // 关闭模态框
                document.getElementById('add-bill-modal').style.display = 'none';
                // 重新渲染账单列表和更新统计数据
                this.renderBills();
                this.loadMonthlyStats(); // 更新月度统计数据
                this.renderCharts(); // 更新图表
                
                alert('账单添加成功！');
            } else {
                console.error('Failed to add bill, status:', response.status);
                const errorText = await response.text();
                console.error('Error details:', errorText);
            }
        } catch (error) {
            console.error('Error adding bill:', error);
        }
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        const category = {
            name: formData.get('category-name'),
            type: formData.get('category-type'),
            color: formData.get('category-color') || this.generateRandomColor()
        };

        try {
            const response = await fetch(`${this.apiUrl}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(category)
            });

            if (response.ok) {
                const newCategory = await response.json();
                this.categories.push(newCategory);
                form.reset();
                this.renderCategories();
                // 关闭模态框
                document.getElementById('add-category-modal').style.display = 'none';
            } else {
                console.error('Failed to add category');
            }
        } catch (error) {
            console.error('Error adding category:', error);
        }
    }

    async deleteBill(id) {
        if (!confirm('确定要删除这条记录吗？')) return;

        try {
            console.log('Deleting bill with id:', id);
            const response = await fetch(`${this.apiUrl}/bills/${id}`, {
                method: 'DELETE'
                });

            if (response.ok) {
                console.log('Bill deleted successfully from server');
                this.bills = this.bills.filter(bill => bill.id !== id);
                console.log('Bill removed from local array');
                // 重置到第一页以确保分页正确
                this.currentPage = 1;
                console.log('Rendering bills...');
                this.renderBills();
                console.log('Loading monthly stats...');
                await this.loadMonthlyStats(); // 更新月度统计数据
                console.log('Rendering charts...');
                this.renderCharts();
                console.log('Rendering stats...');
                this.renderStats(); // 确保统计卡片也更新
                console.log('All updates completed');
            } else {
                console.error('Failed to delete bill');
                alert('删除账单失败，请重试');
            }
        } catch (error) {
            console.error('Error deleting bill:', error);
            alert('删除账单时发生错误，请重试');
        }
    }

    async deleteCategory(id) {
        if (!confirm('确定要删除这个分类吗？这将影响所有使用该分类的账单记录。')) return;

        try {
            const response = await fetch(`${this.apiUrl}/categories/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.categories = this.categories.filter(category => category.id !== id);
                this.renderCategories();
                this.renderBills(); // 重新渲染账单列表以更新分类显示
                this.renderCharts(); // 重新渲染图表以更新分类数据
            } else {
                console.error('Failed to delete category');
                alert('删除分类失败，请重试');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('删除分类时发生错误，请重试');
        }
    }

    async editBill(id) {
        console.log('editBill called with id:', id);
        console.log('Current bills in memory:', this.bills);
        
        // 首先尝试在内存中查找账单
        let bill = this.bills.find(b => b.id === id);
        
        // 如果在内存中找不到，尝试从服务器获取最新数据
        if (!bill) {
            console.warn('Bill not found in memory, trying to fetch from server');
            try {
                const response = await fetch(`${this.apiUrl}/bills/${id}`);
                if (response.ok) {
                    bill = await response.json();
                    console.log('Bill fetched from server:', bill);
                } else {
                    console.error('Failed to fetch bill from server, status:', response.status);
                }
            } catch (error) {
                console.error('Error fetching bill from server:', error);
            }
        }
        
        if (!bill) {
            console.error('Bill not found with id:', id);
            alert('未找到该账单记录，请刷新页面后重试');
            return;
        }

        try {
            // 填充编辑表单
            const editBillId = document.getElementById('edit-bill-id');
            const editAmount = document.getElementById('edit-amount');
            const editCategory = document.getElementById('edit-category');
            const editDate = document.getElementById('edit-date');
            const editNotes = document.getElementById('edit-notes');
            const editModal = document.getElementById('edit-bill-modal');

            if (!editBillId || !editAmount || !editCategory || !editDate || !editNotes || !editModal) {
                console.error('Some edit form elements not found');
                alert('页面元素加载不完整，请刷新页面后重试');
                return;
            }

            editBillId.value = bill.id;
            editAmount.value = bill.amount;
            editCategory.value = bill.category_id;
            editDate.value = bill.date;
            editNotes.value = bill.notes || '';

            // 显示编辑模态框
            editModal.style.display = 'block';
            console.log('Edit modal displayed for bill:', bill);
        } catch (error) {
            console.error('Error in editBill:', error);
            alert('编辑账单时发生错误，请重试');
        }
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        console.log('handleEditSubmit called');
        
        try {
            const form = e.target;
            const formData = new FormData(form);
            
            // 打印表单数据以调试
            console.log('Form data:');
            for (let [key, value] of formData.entries()) {
                console.log(key, value);
            }
            
            const bill = {
                id: parseInt(formData.get('id')),
                amount: parseFloat(formData.get('amount')),
                category_id: parseInt(formData.get('category')),
                date: formData.get('date'),
                notes: formData.get('notes')
            };
            
            console.log('Bill object to update:', bill);
            
            // 验证必填字段
            if (isNaN(bill.amount) || !bill.category_id || !bill.date) {
                console.error('Invalid bill data:', bill);
                alert('请确保填写了所有必填字段且数据格式正确');
                return;
            }
            
            const response = await fetch(`${this.apiUrl}/bills/${bill.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bill)
            });

            if (response.ok) {
                const updatedBill = await response.json();
                console.log('Bill updated:', updatedBill);
                
                // 更新本地账单列表
                const index = this.bills.findIndex(b => b.id === bill.id);
                if (index !== -1) {
                    this.bills[index] = updatedBill;
                } else {
                    // 如果账单不在本地列表中，添加到列表
                    this.bills.push(updatedBill);
                }
                
                // 重新渲染账单列表和图表
                this.renderBills();
                this.loadMonthlyStats(); // 更新月度统计数据
                this.renderCharts();
                
                // 关闭编辑模态框
                const editModal = document.getElementById('edit-bill-modal');
                if (editModal) {
                    editModal.style.display = 'none';
                }
                
                alert('账单更新成功！');
            } else {
                console.error('Failed to update bill, status:', response.status);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                alert('更新账单失败，请重试');
            }
        } catch (error) {
            console.error('Error updating bill:', error);
            alert('更新账单时发生错误，请重试');
        }
    }

    handleSearch() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const category = document.getElementById('filter-category').value;
        const minAmount = document.getElementById('min-amount').value;
        const maxAmount = document.getElementById('max-amount').value;
        const notes = document.getElementById('filter-notes').value;

        this.currentFilter = {
            startDate: startDate || null,
            endDate: endDate || null,
            category: category ? parseInt(category) : null,
            minAmount: minAmount ? parseFloat(minAmount) : null,
            maxAmount: maxAmount ? parseFloat(maxAmount) : null,
            notes: notes || null
        };

        this.renderBills();
        this.loadMonthlyStats(); // 更新月度统计数据
        this.renderCharts(); // 更新图表
    }

    handleReset() {
        // 清空所有筛选条件输入框
        document.getElementById('start-date').value = '';
        document.getElementById('end-date').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('min-amount').value = '';
        document.getElementById('max-amount').value = '';
        document.getElementById('filter-notes').value = '';

        // 重置筛选条件
        this.currentFilter = {
            startDate: null,
            endDate: null,
            category: null,
            minAmount: null,
            maxAmount: null,
            notes: null
        };

        // 重新渲染账单列表和图表
        this.renderBills();
        this.loadMonthlyStats(); // 更新月度统计数据
        this.renderCharts(); // 更新图表
    }

    showAddCategoryModal() {
        document.getElementById('add-category-modal').style.display = 'block';
        this.renderCategories(); // 渲染现有分类
    }

    filterBills() {
        // 更新filteredBills以反映当前筛选条件
        this.filteredBills = this.bills.filter(bill => {
            // 日期筛选
            if (this.currentFilter.startDate && bill.date < this.currentFilter.startDate) {
                return false;
            }
            if (this.currentFilter.endDate && bill.date > this.currentFilter.endDate) {
                return false;
            }

            // 分类筛选
            if (this.currentFilter.category && bill.category_id !== this.currentFilter.category) {
                return false;
            }

            // 金额区间筛选
            if (this.currentFilter.minAmount !== null && bill.amount < this.currentFilter.minAmount) {
                return false;
            }
            if (this.currentFilter.maxAmount !== null && bill.amount > this.currentFilter.maxAmount) {
                return false;
            }

            // 备注筛选
            if (this.currentFilter.notes && bill.notes) {
                // 不区分大小写的模糊匹配
                const notesLower = bill.notes.toLowerCase();
                const filterNotesLower = this.currentFilter.notes.toLowerCase();
                if (!notesLower.includes(filterNotesLower)) {
                    return false;
                }
            } else if (this.currentFilter.notes && !bill.notes) {
                // 如果筛选条件有备注但账单没有备注，则不匹配
                return false;
            }

            return true;
        });
        
        return this.filteredBills;
    }

    renderBills() {
        const billsList = document.getElementById('bills-list');
        const emptyState = document.getElementById('bills-empty-state');
        const paginationContainer = document.getElementById('pagination-container');
        
        if (!billsList || !emptyState || !paginationContainer) return;

        // 确保filteredBills已更新
        const filteredBills = this.filterBills();
        
        if (filteredBills.length === 0) {
            billsList.innerHTML = '';
            emptyState.style.display = 'block';
            paginationContainer.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';

        // 按日期排序（最新的在前面）
        const sortedBills = [...filteredBills].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        // 计算分页数据
        const totalPages = Math.ceil(sortedBills.length / this.pageSize);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, sortedBills.length);
        const currentBills = sortedBills.slice(startIndex, endIndex);

        // 渲染账单列表
        const billRows = currentBills.map(bill => {
            const billDate = new Date(bill.date);
            const formattedDate = billDate.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            // 获取分类信息以确定类型
            const category = this.categories.find(c => c.id === bill.category_id);
            const isIncome = category && category.type === 'income';
            const typeText = isIncome ? '收入' : '支出';
            const typeClass = isIncome ? 'income' : 'expense';

            return `
                <tr data-id="${bill.id}">
                    <td>
                        <span class="bill-type ${typeClass}">${typeText}</span>
                    </td>
                    <td>
                        <span class="bill-amount-value ${typeClass}">¥${bill.amount.toFixed(2)}</span>
                    </td>
                    <td>${category ? category.name : '未知分类'}</td>
                    <td class="bill-notes-cell">${bill.notes || '-'}</td>
                    <td class="bill-date-cell">${formattedDate}</td>
                    <td class="bill-actions">
                        <button class="edit-btn" onclick="billManager.editBill('${bill.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="billManager.deleteBill('${bill.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        billsList.innerHTML = billRows;

        // 显示分页控件
        paginationContainer.style.display = 'flex';
        this.updatePaginationControls(totalPages, sortedBills.length);
    }

    updatePaginationControls(totalPages, totalItems) {
        const paginationInfo = document.getElementById('pagination-info');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const paginationNumbers = document.getElementById('pagination-numbers');

        if (!paginationInfo || !prevPageBtn || !nextPageBtn || !paginationNumbers) return;

        // 更新分页信息
        const startIndex = (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(startIndex + this.pageSize - 1, totalItems);
        paginationInfo.textContent = `显示 ${startIndex}-${endIndex} 条，共 ${totalItems} 条记录`;

        // 更新上一页/下一页按钮状态
        prevPageBtn.disabled = this.currentPage === 1;
        nextPageBtn.disabled = this.currentPage === totalPages;

        // 生成页码按钮
        paginationNumbers.innerHTML = '';
        
        // 最多显示5个页码按钮
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        // 添加页码按钮
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => this.goToPage(i);
            paginationNumbers.appendChild(pageBtn);
        }

        // 更新每页显示数量选择器
        const pageSizeSelect = document.getElementById('page-size');
        if (pageSizeSelect) {
            pageSizeSelect.value = this.pageSize;
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredBills.length / this.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderBills();
            this.renderCharts(); // 更新图表
        }
    }

    renderCategories() {
        console.log('Rendering categories, categories count:', this.categories.length);
        const categorySelect = document.getElementById('bill-category');
        const filterCategorySelect = document.getElementById('filter-category');
        const editCategorySelect = document.getElementById('edit-category');
        const categoriesContainer = document.getElementById('categories-container');
        
        console.log('Category select elements found:', {
            billCategory: !!categorySelect,
            filterCategory: !!filterCategorySelect,
            editCategory: !!editCategorySelect,
            categoriesContainer: !!categoriesContainer
        });

        // 渲染下拉选择框
        if (categorySelect || filterCategorySelect || editCategorySelect) {
            const options = this.categories.map(category => 
                `<option value="${category.id}" style="color: ${category.color}">${category.name}</option>`
            ).join('');

            console.log('Generated options:', options);

            if (categorySelect) {
                categorySelect.innerHTML = `
                    <option value="">请选择分类</option>
                    ${options}
                `;
            }

            if (filterCategorySelect) {
                filterCategorySelect.innerHTML = `
                    <option value="">全部分类</option>
                    ${options}
                `;
            }

            if (editCategorySelect) {
                editCategorySelect.innerHTML = `
                    <option value="">请选择分类</option>
                    ${options}
                `;
            }
        }

        // 渲染现有分类列表
        if (categoriesContainer) {
            const categoryItems = this.categories.map(category => 
                `<li class="category-item">
                    <div class="category-color" style="background-color: ${category.color}"></div>
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        <div class="category-type">${category.type === 'income' ? '收入' : '支出'}</div>
                    </div>
                    <button class="delete-category-btn" onclick="billManager.deleteCategory(${category.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </li>`
            ).join('');

            categoriesContainer.innerHTML = categoryItems;
        }
    }

    renderCharts() {
        // 渲染统计卡片
        this.renderStats();
        
        // 渲染图表
        this.renderMonthlyChart();
        this.renderCategoryChart();
    }

    renderStats() {
        const filteredBills = this.filterBills();
        
        // 计算总收入和支出
        let totalIncome = 0;
        let totalExpense = 0;
        
        filteredBills.forEach(bill => {
            const category = this.categories.find(c => c.id === bill.category_id);
            if (category && category.type === 'income') {
                totalIncome += bill.amount;
            } else {
                totalExpense += bill.amount;
            }
        });
        
        const netIncome = totalIncome - totalExpense;
        
        // 更新统计卡片
        document.getElementById('total-income').textContent = `¥${totalIncome.toFixed(2)}`;
        document.getElementById('total-expense').textContent = `¥${totalExpense.toFixed(2)}`;
        document.getElementById('net-income').textContent = `¥${netIncome.toFixed(2)}`;
        document.getElementById('net-income').className = netIncome >= 0 ? 'positive' : 'negative';
    }

    renderMonthlyStats() {
        if (!this.monthlyStats) return;

        // 创建新的统计卡片HTML
        const monthlyStatsHTML = `
            <div class="stat-card">
                <div class="stat-icon income">
                    <i class="fas fa-arrow-down"></i>
                </div>
                <div class="stat-content">
                    <h3>本月收入</h3>
                    <p id="monthly-income">¥${this.monthlyStats.current.income.toFixed(2)}</p>
                    <div class="stat-change ${this.monthlyStats.change.income >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${this.monthlyStats.change.income >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(this.monthlyStats.change.income).toFixed(2)}%
                    </div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon expense">
                    <i class="fas fa-arrow-up"></i>
                </div>
                <div class="stat-content">
                    <h3>本月支出</h3>
                    <p id="monthly-expense">¥${this.monthlyStats.current.expense.toFixed(2)}</p>
                    <div class="stat-change ${this.monthlyStats.change.expense >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${this.monthlyStats.change.expense >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(this.monthlyStats.change.expense).toFixed(2)}%
                    </div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon net">
                    <i class="fas fa-wallet"></i>
                </div>
                <div class="stat-content">
                    <h3>本月净收入</h3>
                    <p id="monthly-net" class="${this.monthlyStats.current.net >= 0 ? 'positive' : 'negative'}">¥${this.monthlyStats.current.net.toFixed(2)}</p>
                    <div class="stat-change ${this.monthlyStats.change.net >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${this.monthlyStats.change.net >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(this.monthlyStats.change.net).toFixed(2)}%
                    </div>
                </div>
            </div>
        `;

        // 插入到现有的统计网格中
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid) {
            // 移除现有的月度统计卡片（如果存在）
            const existingMonthlyCards = statsGrid.querySelectorAll('.stat-card:not(#total-income-card):not(#total-expense-card):not(#net-income-card)');
            existingMonthlyCards.forEach(card => card.remove());
            
            // 将新的月度统计卡片添加到统计网格的开头
            statsGrid.insertAdjacentHTML('afterbegin', monthlyStatsHTML);
        }
    }

    renderMonthlyChart() {
        const filteredBills = this.filterBills();
        
        // 按月份分组数据
        const monthlyData = {};
        
        filteredBills.forEach(bill => {
            const month = bill.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0 };
            }
            
            const category = this.categories.find(c => c.id === bill.category_id);
            if (category && category.type === 'income') {
                monthlyData[month].income += bill.amount;
            } else {
                monthlyData[month].expense += bill.amount;
            }
        });
        
        // 准备图表数据
        const months = Object.keys(monthlyData).sort();
        const incomeData = months.map(month => monthlyData[month].income);
        const expenseData = months.map(month => monthlyData[month].expense);
        
        // 计算统计摘要
        const totalIncome = incomeData.reduce((sum, amount) => sum + amount, 0);
        const totalExpense = expenseData.reduce((sum, amount) => sum + amount, 0);
        const avgIncome = incomeData.length > 0 ? totalIncome / incomeData.length : 0;
        const avgExpense = expenseData.length > 0 ? totalExpense / expenseData.length : 0;
        
        // 渲染折线图
        const ctx = document.getElementById('monthly-chart');
        if (!ctx) return;
        
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }
        
        this.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months.map(month => {
                    const [year, monthNum] = month.split('-');
                    return `${year}年${monthNum}月`;
                }),
                datasets: [
                    {
                        label: '收入',
                        data: incomeData,
                        borderColor: '#4ECDC4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#4ECDC4',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: '支出',
                        data: expenseData,
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#FF6B6B',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
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
                                return `${context.dataset.label}: ¥${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '金额 (¥)'
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
        
        // 渲染自定义图例
        renderMonthlyLegend(months, incomeData, expenseData, totalIncome, totalExpense, avgIncome, avgExpense);
    }

    renderCategoryChart() {
        const filteredBills = this.filterBills();
        
        // 按分类分组数据
        const categoryData = {};
        
        filteredBills.forEach(bill => {
            const category = this.categories.find(c => c.id === bill.category_id);
            if (!category) return;
            
            const key = `${category.name}-${category.type}`;
            if (!categoryData[key]) {
                categoryData[key] = {
                    name: category.name,
                    type: category.type,
                    color: category.color,
                    amount: 0
                };
            }
            
            categoryData[key].amount += bill.amount;
        });
        
        // 准备图表数据
        const categories = Object.values(categoryData);
        const labels = categories.map(cat => cat.name);
        const data = categories.map(cat => cat.amount);
        const backgroundColors = categories.map(cat => cat.color);
        
        // 渲染饼图
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;
        
        if (this.categoryChart) {
            this.categoryChart.destroy();
        }
        
        this.categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => this.adjustBrightness(color, -20)),
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
                    title: {
                        display: false // 标题已在HTML中定义
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ¥${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        // 渲染自定义图例
        this.renderCategoryLegend(categories, data, backgroundColors);
    }
    
    renderCategoryLegend(categories, data, colors) {
        const legendContainer = document.getElementById('category-legend');
        if (!legendContainer) return;

        const total = data.reduce((a, b) => a + b, 0);
        
        legendContainer.innerHTML = '';
        categories.forEach((category, index) => {
            const amount = data[index];
            const percentage = ((amount / total) * 100).toFixed(1);
            
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${colors[index]}"></div>
                <span>${category.name}: ¥${amount.toFixed(2)} (${percentage}%)</span>
            `;
            legendContainer.appendChild(legendItem);
        });
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

    

    formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    generateRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// 初始化账单管理器
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing BillManager');
    window.billManager = new BillManager();
    
    // 绑定编辑表单提交事件
    const editForm = document.getElementById('edit-bill-form');
    if (editForm) {
        console.log('Edit form found, binding submit event');
        editForm.addEventListener('submit', (e) => {
            console.log('Edit form submitted');
            billManager.handleEditSubmit(e);
        });
    } else {
        console.error('Edit form not found');
    }
    
    // 确保模态框关闭按钮正常工作
    const editModal = document.getElementById('edit-bill-modal');
    if (editModal) {
        const closeButtons = editModal.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                editModal.style.display = 'none';
            });
        });
    }
});

// 渲染自定义图例
function renderMonthlyLegend(months, incomeData, expenseData, totalIncome, totalExpense, avgIncome, avgExpense) {
    const legendContainer = document.getElementById('monthly-legend');
    if (!legendContainer) return;
    
    const startDate = months[0];
    const endDate = months[months.length - 1];
    const monthCount = months.length;
    
    legendContainer.innerHTML = `
        <div class="legend-item">
            <div class="legend-title">收入统计</div>
            <div class="legend-value">总计: ¥${totalIncome.toFixed(2)}</div>
            <div class="legend-value">月均: ¥${avgIncome.toFixed(2)}</div>
        </div>
        <div class="legend-item">
            <div class="legend-title">支出统计</div>
            <div class="legend-value">总计: ¥${totalExpense.toFixed(2)}</div>
            <div class="legend-value">月均: ¥${avgExpense.toFixed(2)}</div>
        </div>
        <div class="legend-item">
            <div class="legend-title">数据范围</div>
            <div class="legend-value">${startDate} 至 ${endDate}</div>
            <div class="legend-value">共 ${monthCount} 个月</div>
        </div>
    `;
}