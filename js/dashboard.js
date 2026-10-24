// ============================================
// AQUAPRO - Customer Dashboard JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = AquaStore.requireRole(['customer'], 'login.html');
    if (!user) return;
    // Set customer name
    setCustomerName();
    
    // Initialize notification bell
    initNotificationBell();
    
    // Initialize current date
    updateDateTime();
    renderCustomerOrders(user);
});

// Set customer name from localStorage or default
function setCustomerName() {
    const customerName = document.getElementById('customer-name');
    if (customerName) {
        const name = AquaStore.getCurrentUser().name.split(/\s+/)[0];
        customerName.textContent = name;
    }
}

function renderCustomerOrders(user) {
    const orders = AquaStore.getOrders()
        .filter(order => order.email === user.email)
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    const latest = orders[0];
    const nextDeliveryCard = document.querySelector('.next-delivery-card');
    const trackerCard = document.querySelector('.order-tracker-card');
    if (latest) {
        if (nextDeliveryCard) nextDeliveryCard.hidden = ['delivered', 'cancelled'].includes(latest.status);
        const orderNumber = document.querySelector('.order-number');
        if (orderNumber) orderNumber.textContent = `Order #${latest.id}`;
        const statusText = {
            pending: 'Pending',
            confirmed: 'Confirmed',
            delivering: 'Out for Delivery',
            delivered: 'Delivered',
            cancelled: 'Cancelled'
        }[latest.status] || latest.status;
        const currentStatus = document.querySelector('.tracker-info strong');
        if (currentStatus) currentStatus.textContent = statusText;
        const trackerInfo = document.querySelector('.tracker-info p');
        if (trackerInfo) trackerInfo.textContent = `Your order is ${statusText}`;
        const steps = document.querySelectorAll('.progress-step');
        const stages = ['pending', 'confirmed', 'delivering', 'delivered'];
        const activeIndex = stages.indexOf(latest.status);
        steps.forEach((step, index) => {
            step.classList.toggle('completed', activeIndex > index);
            step.classList.toggle('active', activeIndex === index);
        });
        const dateElement = document.querySelector('.delivery-date');
        if (dateElement) dateElement.textContent = new Date(`${latest.date}T00:00:00`).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const itemElement = document.querySelector('.delivery-items');
        if (itemElement) itemElement.textContent = latest.items.map(item => `${item.quantity} x ${item.name}`).join(', ');
    } else {
        if (nextDeliveryCard) nextDeliveryCard.hidden = true;
        if (trackerCard) trackerCard.hidden = true;
    }
    const stats = document.querySelectorAll('.quick-stats .stat-value');
    const now = new Date();
    if (stats[0]) stats[0].textContent = String(orders.filter(order => {
        const date = new Date(`${order.date}T00:00:00`);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length);
    if (stats[1]) stats[1].textContent = AquaStore.getSubscriptions()[user.email]?.active ? 'Active' : 'None';
    if (stats[2]) stats[2].textContent = '—';
}

// Notification bell toggle
function initNotificationBell() {
    const bell = document.querySelector('.notification-bell');
    
    if (bell) {
        bell.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = this.querySelector('.notification-dropdown');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        const dropdowns = document.querySelectorAll('.notification-dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    });
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    
    const deliveryDate = document.querySelector('.delivery-date');
    if (deliveryDate && deliveryDate.textContent === '') {
        // Set next delivery date (3 days from now)
        const nextDelivery = new Date(now);
        nextDelivery.setDate(nextDelivery.getDate() + 3);
        deliveryDate.textContent = nextDelivery.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}
// Add this function to dashboard.js
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        AquaStore.logout();
        
        showToast('Logging out...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        // Create toast if it doesn't exist
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.className = 'toast';
        newToast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span class="toast-message"></span>
        `;
        document.body.appendChild(newToast);
        showToast(message, type);
        return;
    }
    
    const toastIcon = toast.querySelector('i');
    const toastMessage = toast.querySelector('.toast-message');
    
    toast.className = `toast ${type}`;
    toastIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}