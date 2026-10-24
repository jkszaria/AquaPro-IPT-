// ============================================
// AQUAPRO - Order Page JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = AquaStore.requireRole(['customer'], 'login.html');
    if (!user) return;
    setMinDate();
    document.querySelectorAll('.qty-btn').forEach(button => {
        button.addEventListener('click', function() {
            changeQuantity(this, Number(this.dataset.delta));
        });
    });
    document.querySelectorAll('.qty-input').forEach(input => input.addEventListener('input', updateOrderSummary));
    document.getElementById('place-order-btn').addEventListener('click', placeOrder);
    prefillReorder();
    updateOrderSummary();
});

// Set minimum delivery date (tomorrow)
function setMinDate() {
    const datePicker = document.getElementById('delivery-date');
    if (datePicker) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        datePicker.min = `${yyyy}-${mm}-${dd}`;
    }
}

// Quantity selector
function changeQuantity(button, change) {
    const input = button.parentElement.querySelector('.qty-input');
    let currentValue = parseInt(input.value) || 0;
    currentValue += change;
    
    if (currentValue < 0) currentValue = 0;
    if (currentValue > 10) currentValue = 10;
    input.value = currentValue;
    updateOrderSummary();
}

// Update order summary
function updateOrderSummary() {
    const summaryItems = document.getElementById('summary-items');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const placeOrderBtn = document.getElementById('place-order-btn');
    
    if (!summaryItems || !subtotalEl || !totalEl) return;
    
    const productCards = document.querySelectorAll('.product-card');
    let items = [];
    let subtotal = 0;
    
    productCards.forEach(card => {
        const name = card.querySelector('h3').textContent;
        const priceText = card.querySelector('.product-price').textContent;
        const price = parseFloat(priceText.replace(/[₱,]/g, ''));
        const quantity = parseInt(card.querySelector('.qty-input').value) || 0;
        
        if (quantity > 0) {
            items.push({ name, price, quantity, subtotal: price * quantity });
            subtotal += price * quantity;
        }
    });
    
    // Update summary items
    if (items.length === 0) {
        summaryItems.innerHTML = '<p class="empty-cart">No items selected yet</p>';
        placeOrderBtn.disabled = true;
    } else {
        summaryItems.innerHTML = items.map(item => `
            <div class="summary-item">
                <span class="item-name">${item.name} x${item.quantity}</span>
                <span class="item-price">₱${item.subtotal.toFixed(2)}</span>
            </div>
        `).join('');
        placeOrderBtn.disabled = false;
    }
    
    // Update totals
    const deliveryFee = items.length ? AquaStore.getDeliveryFee() : 0;
    subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById('delivery-fee').textContent = `₱${deliveryFee.toFixed(2)}`;
    totalEl.textContent = `₱${(subtotal + deliveryFee).toFixed(2)}`;
}

function placeOrder() {
    const user = AquaStore.getCurrentUser();
    const date = document.getElementById('delivery-date').value;
    const items = Array.from(document.querySelectorAll('.product-card')).map(card => ({
        name: card.querySelector('h3').textContent.trim(),
        price: Number(card.querySelector('.product-price').textContent.replace(/[₱,]/g, '')),
        quantity: Number(card.querySelector('.qty-input').value) || 0
    })).filter(item => item.quantity > 0);

    if (!items.length) {
        showToast('Select at least one product.', 'error');
        return;
    }
    if (!date || date < document.getElementById('delivery-date').min) {
        showToast('Choose a valid delivery date.', 'error');
        return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = AquaStore.createOrder({
        email: user.email,
        customer: user.name,
        phone: user.phone || '',
        barangay: user.barangay || '',
        address: user.address || '',
        items,
        subtotal,
        deliveryFee: AquaStore.getDeliveryFee(),
        total: subtotal + AquaStore.getDeliveryFee(),
        date,
        timeSlot: document.getElementById('time-slot').value,
        instructions: document.getElementById('instructions').value.trim(),
        status: 'pending',
        driverEmail: '',
        payment: 'Cash on Delivery',
        createdAt: new Date().toISOString()
    });

    window.location.href = `order-history.html?new=${order.id}`;
}

function prefillReorder() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('reorder');
    if (!orderId) return;
    const order = AquaStore.getOrders().find(item => String(item.id) === orderId);
    if (!order) {
        showToast('That order could not be found.', 'error');
        return;
    }
    const productIds = { 'Slim Container': 'slim', 'Round Container': 'round', '5-Gallon Bottle': 'bottle' };
    order.items.forEach(item => {
        const input = document.getElementById(`qty-${productIds[item.name]}`);
        if (input) input.value = Math.min(10, Number(item.quantity) || 0);
    });
    updateOrderSummary();
}

// Close modal
function closeModal() {
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}