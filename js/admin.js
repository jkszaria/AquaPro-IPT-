// ============================================
// AQUAPRO - Admin Dashboard (Updated)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    if (!AquaStore.requireRole(['admin'], '../login.html')) return;
    updateDateTime();
    setInterval(updateDateTime, 60000);
    initNotificationBell();
    initMobileMenu();
    renderAdminDashboard();
    const search = document.querySelector('.admin-header .search-bar input');
    if (search) search.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        document.querySelectorAll('.recent-orders-card tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
        });
    });
    document.querySelectorAll('a[href="../login.html"]').forEach(link => {
        link.addEventListener('click', () => AquaStore.logout());
    });

    function renderAdminDashboard() {
        const orders = AquaStore.getOrders();
        const today = new Date().toISOString().slice(0, 10);
        const todayOrders = orders.filter(order => order.date === today);
        const pending = orders.filter(order => ['pending', 'confirmed', 'delivering'].includes(order.status)).length;
        const sales = todayOrders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total), 0);
        const inventory = AquaStore.getInventory();
        const stats = document.querySelectorAll('.admin-dashboard .stat-cards .stat-value');
        if (stats[0]) stats[0].textContent = String(todayOrders.length);
        if (stats[1]) stats[1].textContent = String(pending);
        if (stats[2]) stats[2].textContent = `₱${sales.toFixed(2)}`;
        if (stats[3]) stats[3].textContent = String(AquaStore.getUsers().filter(user => user.role === 'driver' && user.active !== false).length);
        if (stats[4]) stats[4].textContent = String(inventory.filter(item => item.status === 'in-stock').length);

        const body = document.querySelector('.recent-orders-card tbody');
        if (!body) return;
        body.innerHTML = orders.slice().sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5).map(order => {
            const status = order.status === 'delivering' ? 'Out for Delivery' : order.status[0].toUpperCase() + order.status.slice(1);
            return `<tr data-order-id="${order.id}"><td><strong>#${order.id}</strong></td><td>${escapeAdminDashboard(order.customer)}</td>
                <td>${escapeAdminDashboard(order.barangay)}</td><td>${escapeAdminDashboard(order.items.map(item => `${item.quantity} x ${item.name}`).join(', '))}</td>
                <td>₱${Number(order.total).toFixed(2)}</td><td><span class="status-badge">${escapeAdminDashboard(status)}</span></td>
                <td><div class="action-btns"><button class="btn btn-sm btn-primary" data-admin-action="view">View</button><button class="btn btn-sm btn-outline" data-admin-action="status">Update</button></div></td></tr>`;
        }).join('');
        body.onclick = event => {
            const button = event.target.closest('[data-admin-action]');
            if (!button) return;
            const order = AquaStore.getOrders().find(item => String(item.id) === button.closest('tr').dataset.orderId);
            if (!order) return;
            if (button.dataset.adminAction === 'view') {
                alert(`Order #${order.id}\n${order.customer}\n${order.address}\nTotal: ₱${Number(order.total).toFixed(2)}\nStatus: ${order.status}`);
            } else {
                const status = prompt('Set order status: pending, confirmed, delivering, delivered, cancelled', order.status);
                if (['pending', 'confirmed', 'delivering', 'delivered', 'cancelled'].includes((status || '').toLowerCase())) {
                    AquaStore.updateOrder(order.id, { status: status.toLowerCase() });
                    renderAdminDashboard();
                } else if (status !== null) showToast('Choose a valid order status.', 'error');
            }
        };
    }

    function escapeAdminDashboard(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }
});

// Update current date and time
function updateDateTime() {
    const dateTimeEl = document.getElementById('current-date-time');
    if (!dateTimeEl) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    dateTimeEl.textContent = now.toLocaleDateString('en-US', options);
}

// Notification bell toggle
function initNotificationBell() {
    const bell = document.querySelector('.notification-bell');
    
    if (bell) {
        bell.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    });
}

// Toggle notifications dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Mobile sidebar toggle
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (menuBtn) {
        menuBtn.addEventListener('click', toggleSidebar);
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// Toast notification
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="toast-message"></span>
        `;
        document.body.appendChild(toast);
    }
    
    const toastIcon = toast.querySelector('i');
    const toastMessage = toast.querySelector('.toast-message');
    
    toast.className = `toast ${type}`;
    
    if (type === 'success') {
        toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toastIcon.className = 'fas fa-exclamation-circle';
    } else {
        toastIcon.className = 'fas fa-info-circle';
    }
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}