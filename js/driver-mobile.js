document.addEventListener('DOMContentLoaded', function() {
    const user = AquaStore.requireRole(['driver'], 'login.html');
    if (!user) return;
    const greeting = document.querySelector('.driver-greeting h1');
    if (greeting) greeting.textContent = `${getTimeGreeting()}, ${user.name}`;
    const actions = document.querySelector('.driver-header .header-actions');
    if (actions) {
        actions.innerHTML = '<button class="icon-btn" id="driver-notifications" aria-label="Notifications"><i class="fas fa-bell"></i></button><button class="icon-btn" id="driver-logout" aria-label="Log out"><i class="fas fa-sign-out-alt"></i></button>';
        document.getElementById('driver-notifications').addEventListener('click', () => showDriverToast('You are viewing your assigned deliveries.', 'success'));
        document.getElementById('driver-logout').addEventListener('click', () => {
            AquaStore.logout();
            window.location.href = 'login.html';
        });
    }
    initCompletedToggle();
    renderDriverDeliveries(user);
});

function getTimeGreeting() {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function initCompletedToggle() {
    const toggle = document.querySelector('.section-toggle');
    const list = document.getElementById('completed-list');
    if (list) list.style.display = 'none';
    if (toggle) toggle.addEventListener('click', toggleCompleted);
}

function toggleCompleted() {
    const list = document.getElementById('completed-list');
    const icon = document.querySelector('.section-toggle .fa-chevron-down, .section-toggle .fa-chevron-up');
    if (!list) return;
    list.style.display = list.style.display === 'none' ? 'block' : 'none';
    if (icon) icon.classList.toggle('fa-chevron-down', list.style.display === 'none');
    if (icon) icon.classList.toggle('fa-chevron-up', list.style.display !== 'none');
}

function renderDriverDeliveries(user) {
    const container = document.querySelector('.deliveries-container');
    const heading = container?.querySelector('h2');
    if (!container || !heading) return;
    container.querySelectorAll('.delivery-card, .completed-section, .empty-deliveries').forEach(item => item.remove());
    const orders = AquaStore.getOrders().filter(order => order.driverEmail === user.email);
    const active = orders.filter(order => ['confirmed', 'delivering'].includes(order.status));
    const completed = orders.filter(order => order.status === 'delivered');
    const status = document.querySelector('.driver-status-text');
    if (status) status.textContent = `On Duty · ${completed.length} completed · ${active.length} remaining`;
    const summary = document.querySelectorAll('.route-summary .route-stat');
    if (summary[1]) summary[1].querySelector('span').textContent = `${active.length} stops`;
    if (!active.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-deliveries';
        empty.textContent = 'No assigned deliveries right now.';
        heading.after(empty);
    }

    active.forEach((order, index) => {
        const card = document.createElement('article');
        card.className = `delivery-card ${order.status === 'delivering' ? 'active' : 'upcoming'}`;
        const itemText = order.items.map(item => `${item.quantity} x ${item.name}`).join(', ');
        const phone = (order.phone || '').replace(/[^\d+]/g, '');
        card.innerHTML = `
            <div class="delivery-header"><span class="stop-number">Stop ${index + 1} of ${active.length}</span>
                <span class="delivery-status ${order.status === 'delivering' ? 'status-active' : 'status-upcoming'}">${order.status === 'delivering' ? 'In Progress' : 'Upcoming'}</span></div>
            <div class="delivery-body"><h3>${escapeDriver(order.customer)}</h3>
                <p class="address"><i class="fas fa-map-marker-alt"></i> ${escapeDriver(order.address)}</p>
                <div class="items"><span class="item-tag">${escapeDriver(itemText)}</span></div>
                ${phone ? `<div class="customer-contact"><a href="tel:${escapeDriver(phone)}" class="call-btn"><i class="fas fa-phone"></i> Call Customer</a></div>` : ''}
                <p>Order #${order.id} · ${escapeDriver(order.date)} · ${escapeDriver(order.timeSlot)}</p></div>
            <div class="delivery-actions">
                ${order.status === 'confirmed' ? `<button class="start-delivery-btn" data-start="${order.id}"><i class="fas fa-play"></i> Start Delivery</button>` : ''}
                ${order.status === 'delivering' ? `<button class="action-btn" data-photo="${order.id}"><i class="fas fa-camera"></i> Add Delivery Photo</button><button class="action-btn delivered-btn" data-delivered="${order.id}"><i class="fas fa-check-circle"></i> Mark as Delivered</button><button class="action-btn unavailable-btn" data-unavailable="${order.id}"><i class="fas fa-user-times"></i> Customer Not Available</button>` : ''}
            </div>`;
        container.insertBefore(card, container.querySelector('.completed-section'));
    });

    const section = document.createElement('section');
    section.className = 'completed-section';
    section.innerHTML = `<h3 class="section-toggle"><i class="fas fa-check-double"></i> Completed (${completed.length}) <i class="fas fa-chevron-down"></i></h3><div class="completed-list" id="completed-list" style="display:none;">${completed.map(order => `<div class="delivery-card completed"><div class="delivery-header"><span class="stop-number">Order #${order.id}</span><span class="delivery-status status-completed">Completed</span></div><div class="delivery-body"><h3>${escapeDriver(order.customer)}</h3><p class="address">${escapeDriver(order.address)}</p><p class="completed-time">${order.deliveredAt ? `Delivered ${escapeDriver(order.deliveredAt)}` : 'Delivered'}</p></div></div>`).join('')}</div>`;
    container.appendChild(section);
    section.querySelector('.section-toggle').addEventListener('click', function() {
        const list = section.querySelector('.completed-list');
        const icon = this.querySelector('.fa-chevron-down, .fa-chevron-up');
        list.style.display = list.style.display === 'none' ? 'block' : 'none';
        icon.classList.toggle('fa-chevron-down', list.style.display === 'none');
        icon.classList.toggle('fa-chevron-up', list.style.display !== 'none');
    });

    container.querySelectorAll('[data-start]').forEach(button => button.addEventListener('click', function() {
        AquaStore.updateOrder(this.dataset.start, { status: 'delivering' });
        renderDriverDeliveries(user);
    }));
    container.querySelectorAll('[data-delivered]').forEach(button => button.addEventListener('click', function() {
        const order = AquaStore.getOrders().find(item => String(item.id) === this.dataset.delivered);
        if (!order || !confirm(`Mark order #${order.id} as delivered?`)) return;
        AquaStore.updateOrder(order.id, { status: 'delivered', deliveredAt: new Date().toLocaleString() });
        renderDriverDeliveries(user);
        showDriverToast('Delivery completed and order history updated.', 'success');
    }));
    container.querySelectorAll('[data-unavailable]').forEach(button => button.addEventListener('click', function() {
        if (!confirm('Mark the customer unavailable and return this order to the unassigned queue?')) return;
        AquaStore.updateOrder(this.dataset.unavailable, { status: 'pending', driverEmail: '' });
        renderDriverDeliveries(user);
        showDriverToast('Order returned to the admin assignment queue.', 'success');
    }));
    container.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', function() {
        const orderId = this.dataset.photo;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
                showDriverToast('Choose an image smaller than 1 MB.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = function() {
                const current = AquaStore.getOrders().find(item => String(item.id) === orderId);
                if (!current) return;
                AquaStore.updateOrder(orderId, { deliveryPhoto: reader.result });
                showDriverToast('Delivery photo saved with the order.', 'success');
            };
            reader.onerror = () => showDriverToast('The selected photo could not be read.', 'error');
            reader.readAsDataURL(file);
        });
        input.click();
    }));
}

function escapeDriver(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function showDriverToast(message, type) {
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
