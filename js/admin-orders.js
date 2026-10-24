document.addEventListener('DOMContentLoaded', function() {
    if (!AquaStore.requireRole(['admin'], '../login.html')) return;
    renderOrders();
    populateCustomers();
    initFilters();
    initOrderActions();
    initSelectAll();

    const createButton = document.querySelector('#new-order-modal .modal-footer .btn-primary');
    if (createButton) createButton.addEventListener('click', createAdminOrder);
    const exportButton = document.querySelector('.header-actions .btn-outline');
    if (exportButton) exportButton.addEventListener('click', exportOrders);
    const dateInput = document.querySelector('#new-order-modal input[type="date"]');
    if (dateInput) {
        dateInput.min = new Date().toISOString().slice(0, 10);
        dateInput.value = dateInput.min;
    }
});

function escapeAdmin(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function renderOrders() {
    const body = document.querySelector('.data-table tbody');
    if (!body) return;
    const orders = AquaStore.getOrders().sort((a, b) => Number(b.id) - Number(a.id));
    body.innerHTML = orders.map(order => {
        const statusLabel = order.status === 'delivering' ? 'Out for Delivery' :
            order.status.charAt(0).toUpperCase() + order.status.slice(1);
        const statusClass = order.status === 'delivering' ? 'status-delivering' : `status-${order.status}`;
        return `<tr data-order-id="${order.id}">
            <td><input type="checkbox" class="order-check"></td>
            <td><strong>#${order.id}</strong></td>
            <td>${escapeAdmin(order.customer)}</td>
            <td>${escapeAdmin(order.phone)}</td>
            <td>${escapeAdmin(order.barangay)}</td>
            <td>${escapeAdmin(order.items.map(item => `${item.quantity} x ${item.name}`).join(', '))}</td>
            <td>₱${Number(order.total).toFixed(2)}</td>
            <td>${escapeAdmin(order.date)}</td>
            <td><span class="status-badge ${statusClass}">${escapeAdmin(statusLabel)}</span></td>
            <td><div class="action-btns">
                <button class="btn btn-sm btn-primary" data-action="view" title="View Details"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-outline" data-action="status" title="Update Status"><i class="fas fa-check"></i></button>
                <button class="btn btn-sm btn-outline" data-action="print" title="Print Receipt"><i class="fas fa-print"></i></button>
            </div></td>
        </tr>`;
    }).join('');
    applyOrderFilters();
}

function populateCustomers() {
    const select = document.querySelector('#new-order-modal select');
    if (!select) return;
    select.innerHTML = '<option value="">Select customer...</option>' +
        AquaStore.getUsers().filter(user => user.role === 'customer')
            .map(user => `<option value="${escapeAdmin(user.email)}">${escapeAdmin(user.name)}</option>`).join('');
}

function initSelectAll() {
    const selectAll = document.getElementById('select-all');
    if (selectAll) selectAll.addEventListener('change', function() {
        document.querySelectorAll('.order-check').forEach(box => { box.checked = this.checked; });
        updateBulkActions();
    });
    document.addEventListener('change', event => {
        if (event.target.matches('.order-check')) updateBulkActions();
    });
    const bulkButtons = document.querySelectorAll('.bulk-actions .btn');
    if (bulkButtons[0]) bulkButtons[0].addEventListener('click', bulkUpdateStatus);
    if (bulkButtons[1]) bulkButtons[1].addEventListener('click', bulkPrint);
}

function updateBulkActions() {
    const count = document.querySelectorAll('.order-check:checked').length;
    document.querySelectorAll('.bulk-actions .btn').forEach(button => { button.disabled = count === 0; });
}

function initFilters() {
    const search = document.querySelector('.filters-bar .search-bar input');
    if (search) search.addEventListener('input', applyOrderFilters);
    document.querySelectorAll('.filters-bar .filter-select').forEach(select =>
        select.addEventListener('change', applyOrderFilters));
}

function applyOrderFilters() {
    const search = (document.querySelector('.filters-bar .search-bar input')?.value || '').toLowerCase();
    const filters = document.querySelectorAll('.filters-bar .filter-select');
    const status = filters[0]?.value || '';
    const dateFilter = filters[1]?.value || '';
    document.querySelectorAll('.data-table tbody tr').forEach(row => {
        const order = AquaStore.getOrders().find(item => String(item.id) === row.dataset.orderId);
        if (!order) return;
        const searchable = `${order.id} ${order.customer} ${order.email} ${order.address} ${order.items.map(item => item.name).join(' ')}`.toLowerCase();
        const statusMatch = !status || order.status === status;
        const days = Math.floor((Date.now() - new Date(`${order.date}T00:00:00`).getTime()) / 86400000);
        const dateMatch = !dateFilter ||
            (dateFilter === 'today' && days === 0) ||
            (dateFilter === 'yesterday' && days === 1) ||
            (dateFilter === 'week' && days >= 0 && days <= 7) ||
            (dateFilter === 'month' && new Date(`${order.date}T00:00:00`).getMonth() === new Date().getMonth());
        row.style.display = searchable.includes(search) && statusMatch && dateMatch ? '' : 'none';
    });
}

function initOrderActions() {
    document.querySelector('.data-table tbody').addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const row = button.closest('tr');
        const order = AquaStore.getOrders().find(item => String(item.id) === row.dataset.orderId);
        if (!order) return;
        if (button.dataset.action === 'view') {
            alert(`Order #${order.id}\nCustomer: ${order.customer}\nAddress: ${order.address}\nItems: ${order.items.map(item => `${item.quantity} x ${item.name}`).join(', ')}\nTotal: ₱${Number(order.total).toFixed(2)}\nStatus: ${order.status}`);
        } else if (button.dataset.action === 'status') {
            const next = prompt('Set status: pending, confirmed, delivering, delivered, cancelled', order.status);
            if (['pending', 'confirmed', 'delivering', 'delivered', 'cancelled'].includes((next || '').toLowerCase())) {
                AquaStore.updateOrder(order.id, { status: next.toLowerCase() });
                renderOrders();
            } else if (next !== null) {
                showAdminToast('Choose a valid order status.', 'error');
            }
        } else if (button.dataset.action === 'print') {
            printOrder(order);
        }
    });
}

function createAdminOrder() {
    const modal = document.getElementById('new-order-modal');
    const controls = modal.querySelectorAll('select, input');
    const email = controls[0].value;
    const date = controls[1].value;
    const product = controls[2].value;
    const quantity = Number(controls[3].value);
    const customer = AquaStore.getUsers().find(user => user.email === email);
    if (!customer || !date || quantity < 1 || quantity > 10) {
        showAdminToast('Select a customer, delivery date, and quantity from 1 to 10.', 'error');
        return;
    }
    const price = { '5-Gallon Bottle': 35, 'Round Container': 30, 'Slim Container': 25 }[product];
    AquaStore.createOrder({
        email, customer: customer.name, phone: customer.phone || '', barangay: customer.barangay || '',
        address: customer.address || '', items: [{ name: product, quantity, price }],
        subtotal: price * quantity, deliveryFee: AquaStore.getDeliveryFee(),
        total: price * quantity + AquaStore.getDeliveryFee(), date,
        timeSlot: 'morning', instructions: '', status: 'pending', driverEmail: '',
        payment: 'Cash on Delivery', createdAt: new Date().toISOString()
    });
    closeNewOrderModal();
    renderOrders();
    showAdminToast('Order created.', 'success');
}

function bulkUpdateStatus() {
    const status = prompt('Set status for selected orders: pending, confirmed, delivering, delivered, cancelled');
    if (!['pending', 'confirmed', 'delivering', 'delivered', 'cancelled'].includes((status || '').toLowerCase())) {
        if (status !== null) showAdminToast('Choose a valid order status.', 'error');
        return;
    }
    document.querySelectorAll('.order-check:checked').forEach(box => {
        AquaStore.updateOrder(box.closest('tr').dataset.orderId, { status: status.toLowerCase() });
    });
    renderOrders();
}

function bulkPrint() {
    const selected = Array.from(document.querySelectorAll('.order-check:checked'))
        .map(box => AquaStore.getOrders().find(order => String(order.id) === box.closest('tr').dataset.orderId))
        .filter(Boolean);
    if (selected.length) window.print();
}

function printOrder(order) {
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
        showAdminToast('Allow pop-ups to print the receipt.', 'error');
        return;
    }
    printWindow.document.write(`<title>AquaPro Order #${order.id}</title><h1>AquaPro Receipt</h1><p>Order #${order.id}</p><p>${escapeAdmin(order.customer)} — ${escapeAdmin(order.date)}</p><ul>${order.items.map(item => `<li>${item.quantity} x ${escapeAdmin(item.name)} — ₱${(item.quantity * item.price).toFixed(2)}</li>`).join('')}</ul><p>Total: ₱${Number(order.total).toFixed(2)}</p>`);
    printWindow.document.close();
    printWindow.print();
}

function exportOrders() {
    const rows = AquaStore.getOrders().map(order =>
        [order.id, order.customer, order.email, order.date, order.status, order.total]);
    const csv = [['Order ID', 'Customer', 'Email', 'Date', 'Status', 'Total'], ...rows]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aquapro-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
}

function openNewOrderModal() {
    populateCustomers();
    document.getElementById('new-order-modal')?.classList.add('active');
}

function closeNewOrderModal() {
    document.getElementById('new-order-modal')?.classList.remove('active');
}

function showAdminToast(message, type) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.innerHTML = '<i></i><span class="toast-message"></span>';
        document.body.appendChild(toast);
    }
    toast.className = `toast ${type} show`;
    toast.querySelector('.toast-message').textContent = message;
    toast.querySelector('i').className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    setTimeout(() => toast.classList.remove('show'), 3000);
}
