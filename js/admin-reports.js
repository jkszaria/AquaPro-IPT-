// ============================================
// AQUAPRO - Admin Reports JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    if (!AquaStore.requireRole(['admin'], '../login.html')) return;
    const period = document.querySelector('.filter-select');
    period.value = 'last7';
    const start = document.getElementById('report-start-date');
    const end = document.getElementById('report-end-date');
    [start, end].forEach(input => input.addEventListener('change', () => renderReport()));
    initPeriodSelector();
    initExportButton();
    renderReport();
});

// Period selector change
function initPeriodSelector() {
    const periodSelect = document.querySelector('.filter-select');
    
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            const period = this.value;
            const isCustom = period === 'custom';
            document.getElementById('report-start-date').hidden = !isCustom;
            document.getElementById('report-end-date').hidden = !isCustom;
            renderReport();
        });
    }
}

// Export button
function initExportButton() {
    const exportBtn = document.querySelector('.header-actions .btn-primary');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            const period = document.querySelector('.filter-select').value;
            const orders = filterOrdersByPeriod(period);
            const csv = [['Order ID', 'Date', 'Customer', 'Status', 'Total'],
                ...orders.map(order => [order.id, order.date, order.customer, order.status, order.total])]
                .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `aquapro-report-${period || 'all'}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            AquaStore.toast('Report exported as CSV.', 'success');
        });
    }
}

function filterOrdersByPeriod(period) {
    const orders = AquaStore.getOrders();
    const now = new Date();
    const normalized = String(period || '').toLowerCase();
    if (normalized === 'custom') {
        const startValue = document.getElementById('report-start-date').value;
        const endValue = document.getElementById('report-end-date').value;
        if (!startValue || !endValue || startValue > endValue) return [];
        return orders.filter(order => order.date >= startValue && order.date <= endValue);
    }
    return orders.filter(order => {
        const date = new Date(`${order.date}T00:00:00`);
        if (normalized === 'last7') return date >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        if (normalized === 'last30') return date >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        if (normalized === 'thismonth') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        if (normalized === 'lastmonth') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
        }
        return true;
    });
}

function escapeReportText(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function renderReport(period) {
    const orders = filterOrdersByPeriod(period || document.querySelector('.filter-select')?.value || '');
    const customers = AquaStore.getUsers().filter(user => user.role === 'customer' && user.active !== false);
    const eligibleOrders = orders.filter(order => order.status !== 'cancelled');
    const delivered = eligibleOrders.filter(order => order.status === 'delivered').length;
    const values = document.querySelectorAll('.stat-cards .stat-value');
    if (values[0]) values[0].textContent = String(orders.length);
    if (values[1]) values[1].textContent = `₱${orders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total), 0).toFixed(2)}`;
    if (values[2]) values[2].textContent = String(customers.length);
    if (values[3]) values[3].textContent = eligibleOrders.length ? `${Math.round(delivered / eligibleOrders.length * 100)}%` : '0%';

    const totals = {};
    eligibleOrders.forEach(order => order.items.forEach(item => {
        totals[item.name] = totals[item.name] || { quantity: 0, revenue: 0 };
        totals[item.name].quantity += Number(item.quantity);
        totals[item.name].revenue += Number(item.quantity) * Number(item.price);
    }));
    const productBody = document.querySelectorAll('.reports-grid .data-table tbody')[0];
    if (productBody) productBody.innerHTML = Object.entries(totals).map(([name, item]) =>
        `<tr><td>${escapeReportText(name)}</td><td>${item.quantity}</td><td>₱${item.revenue.toFixed(2)}</td></tr>`).join('') ||
        '<tr><td colspan="3">No order data for this period.</td></tr>';
    const drivers = AquaStore.getUsers().filter(user => user.role === 'driver');
    const driverBody = document.querySelectorAll('.reports-grid .data-table tbody')[1];
    if (driverBody) driverBody.innerHTML = drivers.map(driver => {
        const assigned = eligibleOrders.filter(order => order.driverEmail === driver.email);
        const deliveredCount = assigned.filter(order => order.status === 'delivered').length;
        const rate = assigned.length ? Math.round(deliveredCount / assigned.length * 100) : 0;
        return `<tr><td>${escapeReportText(driver.name)}</td><td>${deliveredCount}/${assigned.length}</td><td>${rate}%</td></tr>`;
    }).join('') || '<tr><td colspan="3">No driver data.</td></tr>';

    const salesChart = document.querySelector('.reports-grid .bar-chart');
    if (salesChart) {
        const days = Array.from(new Set(orders.map(order => order.date))).sort().slice(-7).map(key => {
            const date = new Date(`${key}T00:00:00`);
            return {
                date,
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                total: orders.filter(order => order.date === key && order.status !== 'cancelled')
                    .reduce((sum, order) => sum + Number(order.total), 0)
            };
        });
        const maximum = Math.max(...days.map(day => day.total), 0);
        salesChart.innerHTML = days.map(day => `<div class="bar-group"><div class="bar" style="height:${maximum ? Math.max(4, day.total / maximum * 100) : 0}%"><span class="bar-value">₱${day.total.toFixed(2)}</span></div><span class="bar-label">${day.label}</span></div>`).join('');
    }
    const growthChart = document.querySelectorAll('.reports-grid .bar-chart')[1];
    if (growthChart) {
        const users = AquaStore.getUsers().filter(user => user.role === 'customer');
        const months = Array.from({ length: 4 }, (_, index) => new Date(new Date().getFullYear(), new Date().getMonth() - 3 + index, 1));
        const values = months.map(month => ({
            label: month.toLocaleDateString('en-US', { month: 'short' }),
            count: users.filter(user => {
                if (!user.createdAt) return false;
                const created = new Date(user.createdAt);
                return created.getFullYear() === month.getFullYear() && created.getMonth() === month.getMonth();
            }).length
        }));
        const maximum = Math.max(...values.map(value => value.count), 0);
        growthChart.innerHTML = values.map(value => `<div class="bar-group"><div class="bar" style="height:${maximum ? Math.max(4, value.count / maximum * 100) : 0}%"><span class="bar-value">${value.count}</span></div><span class="bar-label">${value.label}</span></div>`).join('');
    }
}