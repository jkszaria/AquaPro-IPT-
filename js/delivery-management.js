document.addEventListener('DOMContentLoaded', function() {
    if (!AquaStore.requireRole(['admin'], '../login.html')) return;
    renderDeliveryLists();
});

function renderDeliveryLists() {
    const pendingBody = document.querySelector('.pending-deliveries .card-body');
    const assignedBody = document.querySelector('.assigned-deliveries .card-body');
    if (!pendingBody || !assignedBody) return;

    const drivers = AquaStore.getUsers().filter(user => user.role === 'driver');
    const orders = AquaStore.getOrders();
    const pending = orders.filter(order => ['pending', 'confirmed'].includes(order.status) && !order.driverEmail);
    const assigned = orders.filter(order => order.driverEmail && ['confirmed', 'delivering'].includes(order.status));

    pendingBody.innerHTML = pending.length ? pending.map(order => `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-info">
                <strong>${escapeDelivery(order.customer)}</strong>
                <span class="address"><i class="fas fa-map-marker-alt"></i> ${escapeDelivery(order.address)}</span>
                <span class="items"><i class="fas fa-box"></i> ${escapeDelivery(order.items.map(item => `${item.quantity} x ${item.name}`).join(', '))}</span>
                <span class="time"><i class="fas fa-clock"></i> ${escapeDelivery(order.date)} · ${escapeDelivery(order.timeSlot)}</span>
            </div>
            <div class="assign-driver">
                <select class="driver-select"><option value="">Assign Driver...</option>
                    ${drivers.map(driver => `<option value="${escapeDelivery(driver.email)}">${escapeDelivery(driver.name)}</option>`).join('')}
                </select>
                <button class="btn btn-primary btn-sm" data-assign-order="${order.id}">Assign</button>
            </div>
        </div>`).join('') : '<p>No unassigned deliveries.</p>';

    assignedBody.innerHTML = assigned.length ? assigned.map(order => {
        const driver = drivers.find(user => user.email === order.driverEmail);
        return `<div class="assigned-order">
            <span class="driver-name">${escapeDelivery(driver?.name || 'Driver')}</span>
            <div class="assigned-info">
                <strong>#${order.id} · ${escapeDelivery(order.customer)}</strong>
                <span>${escapeDelivery(order.address)}</span>
                <span>${escapeDelivery(order.items.map(item => `${item.quantity} x ${item.name}`).join(', '))}</span>
                <span class="eta">${order.status === 'delivering' ? 'Out for delivery' : 'Assigned'}</span>
            </div>
        </div>`;
    }).join('') : '<p>No assigned deliveries yet.</p>';

    const count = document.querySelector('.pending-deliveries .count-badge');
    if (count) count.textContent = String(pending.length);
    pendingBody.querySelectorAll('[data-assign-order]').forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.order-card');
            const driverEmail = card.querySelector('.driver-select').value;
            if (!driverEmail) {
                showDeliveryToast('Select a driver before assigning this delivery.', 'error');
                return;
            }
            AquaStore.updateOrder(this.dataset.assignOrder, { driverEmail, status: 'confirmed' });
            renderDeliveryLists();
            showDeliveryToast('Delivery assigned to driver.', 'success');
        });
    });
}

function escapeDelivery(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function showDeliveryToast(message, type) {
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
