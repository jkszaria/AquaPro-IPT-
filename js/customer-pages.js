// order-history.js
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('order-history-list')) return;
    const user = AquaStore.requireRole(['customer'], '../login.html');
    if (!user) return;
    renderSimpleHistory(user);
    ['status-filter', 'month-filter'].forEach(id => document.getElementById(id).addEventListener('change', applySimpleHistoryFilters));
    document.getElementById('search-history').addEventListener('input', applySimpleHistoryFilters);
    document.getElementById('clear-filters').addEventListener('click', function() {
        document.getElementById('status-filter').value = '';
        document.getElementById('month-filter').value = '';
        document.getElementById('search-history').value = '';
        applySimpleHistoryFilters();
    });
    document.getElementById('logout-link').addEventListener('click', () => AquaStore.logout());
});

function renderSimpleHistory(user) {
    const list = document.getElementById('order-history-list');
    const orders = AquaStore.getOrders().filter(order => order.email === user.email)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = orders.map(order => `<article class="card simple-history-order" data-id="${order.id}" data-status="${order.status}" data-month="${new Date(`${order.date}T00:00:00`).getMonth() + 1}">
        <div class="card-header"><h3>Order #${order.id}</h3><span class="status-badge">${order.status}</span></div>
        <div class="card-body"><p>${new Date(`${order.date}T00:00:00`).toLocaleDateString()}</p>
            <p>${order.items.map(item => `${item.quantity} x ${escapeSimple(orderText(item.name))}`).join(', ')}</p>
            <strong>₱${Number(order.total).toFixed(2)}</strong>
            <button class="btn btn-outline" type="button" data-reorder="${order.id}">Reorder</button></div></article>`).join('');
    list.querySelectorAll('[data-reorder]').forEach(button => button.addEventListener('click', function() {
        window.location.href = `../order.html?reorder=${this.dataset.reorder}`;
    }));
    document.getElementById('empty-history').style.display = orders.length ? 'none' : 'block';
    document.querySelectorAll('#pagination button').forEach(button => { button.disabled = true; });
    applySimpleHistoryFilters();
}

function applySimpleHistoryFilters() {
    const status = document.getElementById('status-filter').value;
    const month = document.getElementById('month-filter').value;
    const query = document.getElementById('search-history').value.toLowerCase();
    let visible = 0;
    document.querySelectorAll('.simple-history-order').forEach(card => {
        const show = (!status || card.dataset.status === status) &&
            (!month || card.dataset.month === month) && card.textContent.toLowerCase().includes(query);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    document.getElementById('empty-history').style.display = visible ? 'none' : 'block';
}

function orderText(value) { return String(value ?? ''); }
function escapeSimple(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

// profile.js
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('profile-initials')) return;
    const user = AquaStore.requireRole(['customer'], '../login.html');
    if (!user) return;
    renderSimpleProfile(user);
    document.getElementById('edit-profile-btn').addEventListener('click', openEditModal);
    document.getElementById('change-password-btn').addEventListener('click', () => setModal('change-password-modal', true));
    document.getElementById('profile-logout-btn').addEventListener('click', () => setModal('logout-modal', true));
    document.getElementById('notif-toggle').addEventListener('change', function() {
        AquaStore.updateCurrentUser({ notificationsEnabled: this.checked });
    });
    document.getElementById('logout-btn').addEventListener('click', () => AquaStore.logout());
});

function renderSimpleProfile(user) {
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value || '—';
    };
    const initials = user.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    setText('profile-initials', initials);
    setText('display-name', user.name);
    setText('display-email', user.email);
    setText('display-phone', user.phone);
    setText('detail-name', user.name);
    setText('detail-email', user.email);
    setText('detail-phone', user.phone);
    setText('detail-barangay', user.barangay);
    setText('detail-address', user.address);
    const notificationToggle = document.getElementById('notif-toggle');
    if (notificationToggle) notificationToggle.checked = user.notificationsEnabled !== false;
}

function openEditModal() {
    const user = AquaStore.getCurrentUser();
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-phone').value = user.phone || '';
    document.getElementById('edit-barangay').value = user.barangay || '';
    document.getElementById('edit-address').value = user.address || '';
    setModal('edit-profile-modal', true);
}

function saveProfile() {
    const values = {
        name: document.getElementById('edit-name').value.trim(),
        email: document.getElementById('edit-email').value.trim().toLowerCase(),
        phone: document.getElementById('edit-phone').value.trim(),
        barangay: document.getElementById('edit-barangay').value,
        address: document.getElementById('edit-address').value.trim()
    };
    if (!values.name || !values.email || !values.phone || !values.barangay || !values.address) {
        AquaStore.toast('Complete all profile fields before saving.', 'error');
        return;
    }
    try {
        const user = AquaStore.updateCurrentUser(values);
        renderSimpleProfile(user);
        closeEditModal();
        AquaStore.toast('Profile updated.', 'success');
    } catch (error) {
        AquaStore.toast(error.message, 'error');
    }
}

function changePassword() {
    const user = AquaStore.getCurrentUser();
    const current = document.getElementById('current-password').value;
    const next = document.getElementById('new-password').value;
    const confirmation = document.getElementById('confirm-password').value;
    if (current !== user.password) {
        AquaStore.toast('Current password is incorrect.', 'error');
        return;
    }
    if (next.length < 8 || next !== confirmation) {
        AquaStore.toast(next.length < 8 ? 'Password must be at least 8 characters.' : 'New passwords do not match.', 'error');
        return;
    }
    AquaStore.updateCurrentUser({ password: next });
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    closePasswordModal();
    AquaStore.toast('Password updated in this browser.', 'success');
}

function setModal(id, open) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = open ? 'flex' : 'none';
}
function closeEditModal() { setModal('edit-profile-modal', false); }
function closePasswordModal() { setModal('change-password-modal', false); }
function closeLogoutModal() { setModal('logout-modal', false); }
function confirmLogout() {
    AquaStore.logout();
    window.location.href = '../login.html';
}
