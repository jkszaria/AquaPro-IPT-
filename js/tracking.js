// ============================================
// AQUAPRO - Delivery Tracking JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = AquaStore.requireRole(['customer'], 'login.html');
    if (!user) return;
    renderTrackedOrder(user);
    // Initialize contact station button
    initContactStation();
    
});

function renderTrackedOrder(user) {
    const order = AquaStore.getOrders()
        .filter(item => item.email === user.email && !['delivered', 'cancelled'].includes(item.status))
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const heading = document.querySelector('.tracking-header p, .header-left p');
    const values = document.querySelectorAll('.delivery-info-card .info-value');
    if (!order) {
        if (heading) heading.textContent = 'No active delivery. Place an order to start tracking.';
        return;
    }
    if (heading) heading.textContent = `Order #${order.id} · ${order.status.replace('-', ' ')}`;
    const driver = AquaStore.getUsers().find(item => item.email === order.driverEmail);
    if (values[0]) values[0].textContent = driver ? driver.name : 'Awaiting assignment';
    if (values[1]) values[1].textContent = `${new Date(`${order.date}T00:00:00`).toLocaleDateString()} · ${order.timeSlot}`;
    if (values[2]) values[2].textContent = order.address;
}

// Contact station button
function initContactStation() {
    const contactBtn = document.getElementById('contact-station');
    
    if (contactBtn) {
        contactBtn.addEventListener('click', function() {
            if (confirm('Call AquaPro Station at (055) 123-4567?')) {
                window.open('tel:0551234567');
            }
        });
    }
}

// Update estimated delivery time
function updateETA() {
    const user = AquaStore.getCurrentUser();
    if (user) renderTrackedOrder(user);
}