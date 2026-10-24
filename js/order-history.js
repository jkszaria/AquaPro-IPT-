// ============================================
// AQUAPRO - Order History JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = AquaStore.requireRole(['customer'], 'login.html');
    if (!user) return;
    renderOrderRows(user);
    // Initialize search functionality
    initSearchFilter();
    
    // Initialize status filter
    initStatusFilter();
    
    // Initialize date filter
    initDateFilter();
    
    // Initialize star ratings
    initStarRatings();
    
    // Initialize user dropdown
    initUserDropdown();
});

// Search functionality
function initSearchFilter() {
    const searchInput = document.getElementById('search-orders');
    
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            applyHistoryFilters();
        });
    }
}

// Status filter
function initStatusFilter() {
    const statusFilter = document.getElementById('status-filter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            applyHistoryFilters();
        });
    }
}

// Date filter
function initDateFilter() {
    const dateFilter = document.getElementById('date-filter');
    
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            applyHistoryFilters();
        });
    }
}

function escapeHistoryText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function currentCustomerOrders() {
    const user = AquaStore.getCurrentUser();
    return user ? AquaStore.getOrders().filter(order => order.email === user.email) : [];
}

function renderOrderRows(user) {
    const body = document.querySelector('#orders-table tbody');
    if (!body) return;
    const orders = AquaStore.getOrders()
        .filter(order => order.email === user.email)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    body.innerHTML = orders.map(order => {
        const itemText = order.items.map(item => `${item.quantity} x ${item.name}`).join(', ');
        const status = order.status === 'delivering' ? 'Out for Delivery' :
            order.status.charAt(0).toUpperCase() + order.status.slice(1);
        const statusClass = order.status === 'delivering' ? 'status-delivering' :
            `status-${order.status}`;
        return `<tr data-order-id="${order.id}">
            <td><strong>#${order.id}</strong></td>
            <td>${escapeHistoryText(new Date(`${order.date}T00:00:00`).toLocaleDateString('en-US'))}</td>
            <td>${escapeHistoryText(itemText)}</td>
            <td>₱${Number(order.total).toFixed(2)}</td>
            <td><span class="status-badge ${statusClass}">${escapeHistoryText(status)}</span></td>
            <td>${escapeHistoryText(order.payment || 'Cash on Delivery')}</td>
            <td><div class="action-buttons">
                <button class="btn btn-sm btn-outline" onclick="viewOrderDetails(${order.id})" title="View Details"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-outline" onclick="downloadReceipt(${order.id})" title="Download Receipt"><i class="fas fa-download"></i></button>
                <button class="btn btn-sm btn-outline" onclick="reorderItems(${order.id})" title="Reorder"><i class="fas fa-redo"></i></button>
            </div></td>
        </tr>`;
    }).join('');
    const count = document.querySelector('.order-count');
    if (count) count.textContent = `Showing ${orders.length} orders`;
    const statValues = document.querySelectorAll('.history-stat-card .stat-value');
    if (statValues[0]) statValues[0].textContent = String(orders.length);
    if (statValues[2]) statValues[2].textContent = `₱${orders.reduce((sum, order) => sum + Number(order.total), 0).toFixed(2)}`;
}

function applyHistoryFilters() {
    const query = (document.getElementById('search-orders')?.value || '').toLowerCase();
    const status = (document.getElementById('status-filter')?.value || '').toLowerCase();
    const dateFilter = document.getElementById('date-filter')?.value || '';
    const now = new Date();
    document.querySelectorAll('#orders-table tbody tr').forEach(row => {
        const order = currentCustomerOrders().find(item => String(item.id) === row.dataset.orderId);
        if (!order) {
            row.style.display = 'none';
            return;
        }
        const days = Math.floor((now - new Date(`${order.date}T00:00:00`)) / 86400000);
        const queryMatch = row.textContent.toLowerCase().includes(query);
        const statusMatch = !status || order.status.toLowerCase() === status;
        const dateMatch = !dateFilter ||
            (dateFilter === '7days' && days >= 0 && days <= 7) ||
            (dateFilter === '30days' && days >= 0 && days <= 30) ||
            (dateFilter === '90days' && days >= 0 && days <= 90) ||
            (dateFilter === 'year' && new Date(`${order.date}T00:00:00`).getFullYear() === now.getFullYear());
        row.style.display = queryMatch && statusMatch && dateMatch ? '' : 'none';
    });
}

// View order details
function viewOrderDetails(orderId) {
    const modal = document.getElementById('order-details-modal');
    const content = document.getElementById('order-details-content');
    
    if (!modal || !content) return;
    
    const legacyOrderData = {
        1005: {
            id: '#1005',
            date: 'April 27, 2024',
            time: '10:30 AM',
            status: 'Delivered',
            items: [
                { name: '5-Gallon Bottle', qty: 2, price: 35, subtotal: 70 }
            ],
            subtotal: 70,
            deliveryFee: 20,
            total: 90,
            payment: 'Cash on Delivery',
            deliveryAddress: '#123 Main St., Brgy. Acacia, Catarman',
            driver: 'Roberto',
            deliveredAt: '11:30 AM, April 28, 2024'
        },
        1004: {
            id: '#1004',
            date: 'April 24, 2024',
            time: '2:00 PM',
            status: 'Delivered',
            items: [
                { name: 'Round Container', qty: 3, price: 30, subtotal: 90 }
            ],
            subtotal: 90,
            deliveryFee: 20,
            total: 110,
            payment: 'Cash on Delivery',
            deliveryAddress: '#123 Main St., Brgy. Acacia, Catarman',
            driver: 'Julius',
            deliveredAt: '3:15 PM, April 24, 2024'
        }
    };
    
    const order = currentCustomerOrders().find(item => String(item.id) === String(orderId)) || legacyOrderData[orderId];
    if (!order) {
        showToast('Order details are not available.', 'error');
        return;
    }
    const orderDate = order.date || '';
    const orderItems = order.items.map(item => ({
        name: item.name,
        qty: item.quantity || item.qty,
        price: item.price,
        subtotal: item.price * (item.quantity || item.qty)
    }));
    const orderSubtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * (item.quantity || item.qty), 0);
    const orderDeliveryFee = order.deliveryFee ?? 20;
    const orderTotal = order.total ?? orderSubtotal + orderDeliveryFee;
    const safe = escapeHistoryText;

    content.innerHTML = `
        <div class="order-detail-section">
            <h4>Order Information</h4>
            <div class="detail-row">
                <span class="label">Order ID</span>
                <span class="value">#${safe(order.id)}</span>
            </div>
            <div class="detail-row">
                <span class="label">Date</span>
                <span class="value">${safe(orderDate)} ${safe(order.time || order.timeSlot || '')}</span>
            </div>
            <div class="detail-row">
                <span class="label">Status</span>
                <span class="value"><span class="status-badge">${safe(order.status)}</span></span>
            </div>
            <div class="detail-row">
                <span class="label">Payment Method</span>
                <span class="value">${safe(order.payment || 'Cash on Delivery')}</span>
            </div>
        </div>
        
        <div class="order-detail-section">
            <h4>Items Ordered</h4>
            <table class="detail-items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderItems.map(item => `
                        <tr>
                            <td>${safe(item.name)}</td>
                            <td>${safe(item.qty)}</td>
                            <td>₱${item.price}.00</td>
                            <td>₱${item.subtotal}.00</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3">Subtotal</td>
                        <td>₱${Number(orderSubtotal).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="3">Delivery Fee</td>
                        <td>₱${Number(orderDeliveryFee).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="3"><strong>Total</strong></td>
                        <td><strong>₱${Number(orderTotal).toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="order-detail-section">
            <h4>Delivery Information</h4>
            <div class="detail-row">
                <span class="label">Address</span>
                <span class="value">${safe(order.deliveryAddress || order.address || '')}</span>
            </div>
            <div class="detail-row">
                <span class="label">Driver</span>
                <span class="value">${safe(order.driver || order.driverEmail || 'Not assigned')}</span>
            </div>
            <div class="detail-row">
                <span class="label">Delivered At</span>
                <span class="value">${safe(order.deliveredAt || '')}</span>
            </div>
        </div>
    `;
    
    // Set reorder button action
    document.getElementById('reorder-from-details').onclick = function() {
        reorderItems(orderId);
        closeOrderDetails();
    };
    
    modal.classList.add('active');
}

// Close order details modal
function closeOrderDetails() {
    const modal = document.getElementById('order-details-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Download receipt
function downloadReceipt(orderId) {
    const order = currentCustomerOrders().find(item => String(item.id) === String(orderId));
    if (!order) {
        showToast('Receipt is not available.', 'error');
        return;
    }
    const details = [
        `AquaPro receipt - Order #${order.id}`,
        `Customer: ${order.customer}`,
        `Date: ${order.date}`,
        ...order.items.map(item => `${item.quantity} x ${item.name} - PHP ${(item.quantity * item.price).toFixed(2)}`),
        `Subtotal: PHP ${Number(order.subtotal).toFixed(2)}`,
        `Delivery fee: PHP ${Number(order.deliveryFee).toFixed(2)}`,
        `Total: PHP ${Number(order.total).toFixed(2)}`,
        `Status: ${order.status}`
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([details], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `aquapro-order-${order.id}-receipt.txt`;
    link.click();
    URL.revokeObjectURL(url);
}

// Reorder items
function reorderItems(orderId) {
    if (confirm(`Add items from Order #${orderId} to cart?`)) {
        window.location.href = `order.html?reorder=${orderId}`;
    }
}

// Export history
function exportHistory() {
    const rows = currentCustomerOrders();
    const csv = [['Order ID', 'Date', 'Items', 'Total', 'Status'],
        ...rows.map(order => [order.id, order.date, order.items.map(item => `${item.quantity}x ${item.name}`).join('; '), order.total, order.status])]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aquapro-order-history.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Order history exported as CSV.', 'success');
}

// Star ratings
function initStarRatings() {
    const starRatings = document.querySelectorAll('.star-rating');
    const savedRatings = JSON.parse(localStorage.getItem('aquapro_ratings') || '{}');
    
    starRatings.forEach(rating => {
        const stars = rating.querySelectorAll('i');
        const card = rating.closest('.rating-card');
        const orderId = rating.dataset.order;
        const order = currentCustomerOrders().find(item => String(item.id) === String(orderId));
        if (card && (!order || order.status !== 'delivered')) {
            card.hidden = true;
            return;
        }
        if (savedRatings[orderId]) {
            stars.forEach((star, index) => {
                star.classList.toggle('fas', index < savedRatings[orderId].rating);
                star.classList.toggle('far', index >= savedRatings[orderId].rating);
                star.classList.toggle('active', index < savedRatings[orderId].rating);
            });
            card.querySelector('textarea').value = savedRatings[orderId].review || '';
            const submit = card.querySelector('.btn-primary');
            submit.disabled = true;
            submit.textContent = 'Rating Submitted';
        }
        
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const value = parseInt(this.getAttribute('data-rating'));
                
                // Remove active from all stars
                stars.forEach(s => {
                    s.classList.remove('fas');
                    s.classList.add('far');
                    s.classList.remove('active');
                });
                
                // Set active stars
                stars.forEach((s, index) => {
                    if (index < value) {
                        s.classList.remove('far');
                        s.classList.add('fas');
                        s.classList.add('active');
                    }
                });
            });
            
            star.addEventListener('mouseenter', function() {
                const value = parseInt(this.getAttribute('data-rating'));
                stars.forEach((s, index) => {
                    if (index < value) {
                        s.classList.remove('far');
                        s.classList.add('fas');
                    }
                });
            });
            
            star.addEventListener('mouseleave', function() {
                stars.forEach(s => {
                    if (!s.classList.contains('active')) {
                        s.classList.remove('fas');
                        s.classList.add('far');
                    }
                });
            });
        });
    });
    
    // Submit rating buttons
    document.querySelectorAll('.rating-card .btn-primary').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.rating-card');
            const rating = card.querySelectorAll('.star-rating .fas').length;
            
            if (rating === 0) {
                showToast('Please select a rating', 'error');
                return;
            }
            
            showToast(`Thank you for your ${rating}-star rating!`, 'success');
            const orderId = card.querySelector('.star-rating').dataset.order;
            const ratings = JSON.parse(localStorage.getItem('aquapro_ratings') || '{}');
            ratings[orderId] = { rating, review: card.querySelector('textarea').value.trim(), submittedAt: new Date().toISOString() };
            localStorage.setItem('aquapro_ratings', JSON.stringify(ratings));
            // Disable further rating
            card.querySelector('.star-rating').style.pointerEvents = 'none';
            this.disabled = true;
            this.textContent = 'Rating Submitted ✓';
        });
    });
}

// User dropdown toggle
function initUserDropdown() {
    window.toggleUserMenu = function() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    };
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
    });
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        AquaStore.logout();
        
        showToast('Logging out...', 'success');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.className = 'toast';
        newToast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span class="toast-message"></span>
        `;
        document.body.appendChild(newToast);
        setTimeout(() => showToast(message, type), 100);
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