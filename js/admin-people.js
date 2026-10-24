// admin-customers.js
document.addEventListener('DOMContentLoaded', function() {
    if (!document.querySelector('.data-table tbody')) return;
    if (!AquaStore.requireRole(['admin'], '../login.html')) return;
    renderCustomers();
    document.querySelector('.filters-bar .search-bar input')?.addEventListener('input', applyCustomerFilters);
    document.querySelectorAll('.filters-bar .filter-select').forEach(select =>
        select.addEventListener('change', applyCustomerFilters));
});

function renderCustomers() {
    const body = document.querySelector('.data-table tbody');
    if (!body) return;
    const customers = AquaStore.getUsers().filter(user => user.role === 'customer');
    body.innerHTML = customers.map((user, index) => {
        const orders = AquaStore.getOrders().filter(order => order.email === user.email);
        const active = user.active !== false;
        return `<tr data-email="${escapeCustomer(user.email)}" data-barangay="${escapeCustomer(user.barangay || '')}">
            <td>#C${String(index + 1).padStart(3, '0')}</td>
            <td><strong>${escapeCustomer(user.name)}</strong></td>
            <td>${escapeCustomer(user.email)}</td><td>${escapeCustomer(user.phone || '')}</td>
            <td>${escapeCustomer(user.barangay || '')}</td><td>${orders.length}</td>
            <td><span class="status-badge">${AquaStore.getSubscriptions()[user.email]?.active ? 'Active' : 'None'}</span></td>
            <td><span class="status-badge ${active ? 'status-delivered' : 'status-cancelled'}">${active ? 'Active' : 'Inactive'}</span></td>
            <td><div class="action-btns">
                <button class="btn btn-sm btn-primary" data-customer-action="view" title="View"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-outline" data-customer-action="toggle" title="Toggle status"><i class="fas fa-user-edit"></i></button>
                <button class="btn btn-sm btn-outline" data-customer-action="history" title="Order History"><i class="fas fa-history"></i></button>
            </div></td></tr>`;
    }).join('');
    const count = document.querySelector('.table-pagination span');
    if (count) count.textContent = `Showing ${customers.length} customers`;
    body.onclick = event => {
        const button = event.target.closest('[data-customer-action]');
        if (!button) return;
        const user = AquaStore.getUsers().find(item => item.email === button.closest('tr').dataset.email);
        if (!user) return;
        const orders = AquaStore.getOrders().filter(order => order.email === user.email);
        if (button.dataset.customerAction === 'view') {
            alert(`${user.name}\n${user.email}\n${user.phone || ''}\n${user.address || ''}\nOrders: ${orders.length}`);
        } else if (button.dataset.customerAction === 'toggle') {
            const users = AquaStore.getUsers();
            const target = users.find(item => item.email === user.email);
            target.active = !(target.active !== false);
            AquaStore.saveUsers(users);
            renderCustomers();
        } else {
            alert(`${user.name}: ${orders.length} orders\n${orders.map(order => `#${order.id} ${order.date} ${order.status}`).join('\n')}`);
        }
    };
    applyCustomerFilters();
}

function applyCustomerFilters() {
    const query = (document.querySelector('.filters-bar .search-bar input')?.value || '').toLowerCase();
    const filters = document.querySelectorAll('.filters-bar .filter-select');
    const barangay = filters[0]?.value || '';
    const sort = filters[1]?.value || '';
    const body = document.querySelector('.data-table tbody');
    if (!body) return;
    const rows = Array.from(body.querySelectorAll('tr'));
    rows.sort((a, b) => {
        if (sort === 'name') return a.cells[1].textContent.localeCompare(b.cells[1].textContent);
        if (sort === 'orders') return Number(b.cells[5].textContent) - Number(a.cells[5].textContent);
        return 0;
    });
    rows.forEach(row => {
        body.appendChild(row);
        row.style.display = row.textContent.toLowerCase().includes(query) &&
            (!barangay || row.dataset.barangay === barangay) ? '' : 'none';
    });
}

function escapeCustomer(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

// admin-drivers.js
document.addEventListener('DOMContentLoaded', function() {
    if (!document.querySelector('.driver-profile-card')) return;
    if (!AquaStore.requireRole(['admin'], '../login.html')) return;
    document.querySelectorAll('.driver-profile-card').forEach(card => {
        const name = card.querySelector('h3')?.textContent.trim();
        const driver = AquaStore.getUsers().find(user => user.role === 'driver' && user.name === name);
        if (!driver) return;
        const orders = AquaStore.getOrders().filter(order => order.driverEmail === driver.email);
        const completed = orders.filter(order => order.status === 'delivered').length;
        const active = orders.filter(order => ['confirmed', 'delivering'].includes(order.status)).length;
        const stat = card.querySelector('.driver-stat .stat-value');
        if (stat) stat.textContent = `${completed}/${orders.length}`;
        const status = card.querySelector('.driver-status-badge');
        if (status) status.textContent = active ? 'On Route' : 'Available';
        card.querySelectorAll('.driver-actions .btn').forEach(button => {
            button.addEventListener('click', function() {
                if (this.textContent.toLowerCase().includes('route')) {
                    window.location.href = 'delivery-management.html';
                } else {
                    const history = orders.map(order => `#${order.id} ${order.date} — ${order.status}`).join('\n') || 'No deliveries assigned.';
                    alert(`${driver.name} delivery history\n${history}`);
                }
            });
        });
    });
});
