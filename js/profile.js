// ============================================
// AQUAPRO - Profile Page JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = AquaStore.requireRole(['customer'], 'login.html');
    if (!user) return;
    // Initialize tabs
    initProfileTabs();
    
    // Initialize toggle switches
    initToggles();
    
    // Initialize password visibility toggle
    initPasswordToggle();
    
    // Initialize delete confirmation input
    initDeleteConfirm();
    initAddressManagement();
    
    // Load user data
    loadUserData();
});

// ============================================
// PROFILE TABS
// ============================================

function initProfileTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Remove active from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active to clicked button and corresponding panel
            this.classList.add('active');
            const panel = document.getElementById(`${tabName}-tab`);
            if (panel) {
                panel.classList.add('active');
            }
        });
    });
}

// ============================================
// TOGGLE SWITCHES
// ============================================

function initToggles() {
    // 2FA Toggle
    const twoFAToggle = document.getElementById('2fa-toggle');
    if (twoFAToggle) {
        twoFAToggle.addEventListener('change', function() {
            this.checked = false;
            showToast('Two-factor authentication requires a server and is not available in this prototype.', 'error');
        });
    }
    
    // Login Notification Toggle
    const loginNotifyToggle = document.getElementById('login-notify-toggle');
    if (loginNotifyToggle) {
        loginNotifyToggle.addEventListener('change', function() {
            if (this.checked) {
                showToast('Login notifications enabled', 'success');
            } else {
                showToast('Login notifications disabled', 'error');
            }
        });
    }
    
    // Notification toggles
    document.querySelectorAll('.notification-option .switch input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const label = this.closest('.notification-option').querySelector('strong').textContent;
            if (this.checked) {
                    saveNotificationPreference(label, true);
            } else {
                    saveNotificationPreference(label, false);
            }
        });
    });
}

function saveNotificationPreference(label, enabled) {
    const user = AquaStore.getCurrentUser();
    const notifications = { ...(user.notifications || {}), [label]: enabled };
    AquaStore.updateCurrentUser({ notifications });
    showToast(`${label} ${enabled ? 'enabled' : 'disabled'} for this prototype account.`, 'success');
}

// ============================================
// PASSWORD TOGGLE
// ============================================

function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type');
            
            if (type === 'password') {
                input.setAttribute('type', 'text');
                this.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.setAttribute('type', 'password');
                this.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
}

// ============================================
// PROFILE FORM EDIT
// ============================================

function enableEdit(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input:not([type="checkbox"])');
    const formActions = form.querySelector('.form-actions');
    const editBtn = form.closest('.card').querySelector('.edit-btn');
    
    // Enable inputs
    inputs.forEach(input => {
        input.dataset.originalValue = input.value;
        input.removeAttribute('disabled');
    });
    
    // Show form actions
    if (formActions) {
        formActions.style.display = 'flex';
    }
    
    // Hide edit button
    if (editBtn) {
        editBtn.style.display = 'none';
    }
}

function cancelEdit(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input:not([type="checkbox"])');
    const formActions = form.querySelector('.form-actions');
    const editBtn = form.closest('.card').querySelector('.edit-btn');
    
    // Disable inputs
    inputs.forEach(input => {
        if (input.dataset.originalValue !== undefined) input.value = input.dataset.originalValue;
        input.setAttribute('disabled', '');
    });
    
    // Hide form actions
    if (formActions) {
        formActions.style.display = 'none';
    }
    
    // Show edit button
    if (editBtn) {
        editBtn.style.display = '';
    }
}

// ============================================
// ADDRESS MANAGEMENT
// ============================================

function initAddressManagement() {
    const addButton = document.querySelector('.add-address-btn');
    if (addButton) addButton.addEventListener('click', addAddress);
    renderAddresses();
}

function getSavedAddresses() {
    const user = AquaStore.getCurrentUser();
    if (!user) return [];
    return user.addresses || [{
        label: 'Home',
        address: user.address || '',
        barangay: user.barangay || '',
        phone: user.phone || '',
        isDefault: true
    }];
}

function renderAddresses() {
    const container = document.querySelector('.address-cards');
    if (!container) return;
    const addresses = getSavedAddresses();
    container.innerHTML = addresses.map((address, index) => `
        <div class="address-card ${address.isDefault ? 'default' : ''}" data-address-index="${index}">
            ${address.isDefault ? '<div class="address-badge">Default</div>' : ''}
            <div class="address-icon"><i class="fas fa-home"></i></div>
            <div class="address-details"><strong>${escapeProfile(address.label || 'Address')}</strong>
                <p>${escapeProfile(AquaStore.getCurrentUser().name)}</p>
                <p>${escapeProfile(address.address)}</p><p>Barangay ${escapeProfile(address.barangay)}</p>
                <p>Catarman, Northern Samar</p><p>Phone: ${escapeProfile(address.phone)}</p>
            </div>
            <div class="address-actions">
                <button class="btn btn-sm btn-outline" data-address-action="edit">Edit</button>
                <button class="btn btn-sm btn-outline" data-address-action="default">Set Default</button>
                <button class="btn btn-sm btn-outline" data-address-action="delete">Delete</button>
            </div>
        </div>`).join('') || '<p>No saved addresses. Add a delivery address to get started.</p>';
    container.onclick = event => {
        const button = event.target.closest('[data-address-action]');
        if (!button) return;
        const index = Number(button.closest('[data-address-index]').dataset.addressIndex);
        if (button.dataset.addressAction === 'edit') editAddress(index);
        if (button.dataset.addressAction === 'default') setDefaultAddress(index);
        if (button.dataset.addressAction === 'delete') deleteAddress(index);
    };
}

function addAddress() {
    const label = prompt('Address label (e.g., Home, Office):');
    if (!label) return;
    const address = prompt('Street and house number:');
    const barangay = prompt('Barangay:');
    if (!address || !barangay) {
        showToast('Address and barangay are required.', 'error');
        return;
    }
    const user = AquaStore.getCurrentUser();
    const addresses = getSavedAddresses();
    addresses.push({ label: label.trim(), address: address.trim(), barangay: barangay.trim(), phone: user.phone || '', isDefault: addresses.length === 0 });
    AquaStore.updateCurrentUser({ addresses });
    renderAddresses();
}

function editAddress(addressId) {
    const addresses = getSavedAddresses();
    const address = addresses[addressId];
    if (!address) return;
    const nextAddress = prompt('Update street and house number:', address.address);
    if (nextAddress === null) return;
    const nextBarangay = prompt('Update barangay:', address.barangay);
    if (!nextBarangay) {
        showToast('Barangay is required.', 'error');
        return;
    }
    addresses[addressId] = { ...address, address: nextAddress.trim(), barangay: nextBarangay.trim() };
    AquaStore.updateCurrentUser({ addresses });
    renderAddresses();
    showToast('Address updated.', 'success');
}

function setDefaultAddress(addressId) {
    const addresses = getSavedAddresses();
    if (!addresses[addressId]) return;
    addresses.forEach((address, index) => { address.isDefault = index === addressId; });
    AquaStore.updateCurrentUser({
        addresses,
        address: addresses[addressId].address,
        barangay: addresses[addressId].barangay
    });
    renderAddresses();
    showToast('Default address updated.', 'success');
}

function deleteAddress(addressId) {
    const addresses = getSavedAddresses();
    if (addresses.length <= 1 || !confirm('Delete this saved address?')) {
        if (addresses.length <= 1) showToast('Keep at least one delivery address on your account.', 'error');
        return;
    }
    addresses.splice(addressId, 1);
    if (!addresses.some(address => address.isDefault)) addresses[0].isDefault = true;
    const primary = addresses.find(address => address.isDefault);
    AquaStore.updateCurrentUser({ addresses, address: primary.address, barangay: primary.barangay });
    renderAddresses();
    showToast('Address deleted.', 'success');
}

function escapeProfile(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

// ============================================
// DANGER ZONE ACTIONS
// ============================================

function deleteAccount() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('delete-confirm').value = '';
        document.getElementById('confirm-delete-btn').disabled = true;
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function initDeleteConfirm() {
    const confirmInput = document.getElementById('delete-confirm');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    if (confirmInput && confirmBtn) {
        confirmInput.addEventListener('input', function() {
            if (this.value === 'DELETE') {
                confirmBtn.removeAttribute('disabled');
            } else {
                confirmBtn.setAttribute('disabled', '');
            }
        });
    }
}

function confirmDeleteAccount() {
    if (document.getElementById('delete-confirm').value !== 'DELETE') {
        showToast('Type DELETE to confirm account removal.', 'error');
        return;
    }
    const user = AquaStore.getCurrentUser();
    AquaStore.saveUsers(AquaStore.getUsers().filter(entry => entry.email !== user.email));
    AquaStore.saveOrders(AquaStore.getOrders().filter(order => order.email !== user.email));
    const subscriptions = AquaStore.getSubscriptions();
    delete subscriptions[user.email];
    AquaStore.saveSubscriptions(subscriptions);
    AquaStore.logout();
    closeDeleteModal();
    window.location.href = 'index.html';
}

function deactivateAccount() {
    if (confirm('Deactivate your account? Contact an administrator to restore access.')) {
        AquaStore.updateCurrentUser({ active: false });
        AquaStore.logout();
        window.location.href = 'index.html';
    }
}

// ============================================
// LOGOUT FUNCTIONALITY
// ============================================

function handleLogout() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmLogout() {
    AquaStore.logout();
    
    showToast('Logging out... Goodbye!', 'success');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ============================================
// LOAD USER DATA
// ============================================

function loadUserData() {
    const user = AquaStore.getCurrentUser();
    if (!user) return;
    const userData = {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        initials: user.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
    };
    
    // Update display name
    const displayName = document.getElementById('display-name');
    if (displayName) {
        displayName.textContent = userData.name;
    }
    const email = document.getElementById('display-email');
    if (email) email.textContent = userData.email;
    const phone = document.getElementById('display-phone');
    if (phone) phone.textContent = userData.phone;
    const form = document.getElementById('personal-form');
    if (form) {
        const nameInput = form.querySelector('input[type="text"]');
        const emailInput = form.querySelector('input[type="email"]');
        const phoneInput = form.querySelector('input[type="tel"]');
        if (nameInput) nameInput.value = userData.name;
        if (emailInput) emailInput.value = userData.email;
        if (phoneInput) phoneInput.value = userData.phone;
    }
    
    // Update avatar initials
    const avatarInitials = document.getElementById('avatar-initials');
    if (avatarInitials) {
        avatarInitials.textContent = userData.initials;
    }
    
    // Update header avatar
    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar) {
        const initials = headerAvatar.querySelector('span');
        if (initials) initials.textContent = userData.initials;
    }
    if (user.profilePhoto) {
        [document.getElementById('profile-avatar'), headerAvatar].forEach(avatar => {
            if (!avatar) return;
            avatar.style.backgroundImage = `url("${user.profilePhoto}")`;
            avatar.style.backgroundSize = 'cover';
            const initials = avatar.querySelector('span');
            if (initials) initials.style.visibility = 'hidden';
        });
    }
    const orders = AquaStore.getOrders().filter(order => order.email === user.email);
    const stats = document.querySelectorAll('.profile-stat .stat-value');
    const subscription = AquaStore.getSubscriptions()[user.email];
    if (stats[0]) stats[0].textContent = String(orders.length);
    if (stats[1]) stats[1].textContent = subscription?.active ? 'Active' : 'None';
    if (stats[2]) stats[2].textContent = String(orders.filter(order => order.status === 'delivered').length);
    if (stats[3]) stats[3].textContent = `₱${orders.reduce((sum, order) => sum + Number(order.total), 0).toFixed(2)}`;
    const activity = document.querySelector('.activity-list');
    if (activity) {
        activity.innerHTML = orders.slice().sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 4).map(order =>
            `<div class="activity-item"><div class="activity-icon blue"><i class="fas fa-${order.status === 'delivered' ? 'check-circle' : 'truck'}"></i></div><div class="activity-info"><strong>Order #${order.id} ${escapeProfile(order.status)}</strong><span>${escapeProfile(order.items.map(item => `${item.quantity} x ${item.name}`).join(', '))}</span><small>${escapeProfile(order.date)}</small></div></div>`
        ).join('') || '<p>No recent activity.</p>';
    }
}

// ============================================
// AVATAR CHANGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const changeAvatarBtn = document.querySelector('.change-avatar-btn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
                        showToast('Choose an image smaller than 1 MB.', 'error');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = function() {
                        try {
                            AquaStore.updateCurrentUser({ profilePhoto: reader.result });
                            loadUserData();
                            showToast('Profile photo saved in this browser.', 'success');
                        } catch (error) {
                            showToast(error.message, 'error');
                        }
                    };
                    reader.onerror = function() {
                        showToast('The selected image could not be read.', 'error');
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            input.click();
        });
    }
});

// ============================================
// PASSWORD FORM SUBMISSION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const currentPassword = this.querySelector('input[placeholder="Enter current password"]').value;
            const newPassword = this.querySelector('input[placeholder="Enter new password"]').value;
            const confirmPassword = this.querySelector('input[placeholder="Confirm new password"]').value;
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast('Please fill in all password fields', 'error');
                return;
            }
            
            if (newPassword.length < 8) {
                showToast('Password must be at least 8 characters', 'error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            const user = AquaStore.getCurrentUser();
            if (!user || user.password !== currentPassword) {
                showToast('Current password is incorrect', 'error');
                return;
            }
            AquaStore.updateCurrentUser({ password: newPassword });
            showToast('Password updated successfully!', 'success');
            this.reset();
        });
    }
});

// ============================================
// PERSONAL INFO FORM SUBMISSION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const personalForm = document.getElementById('personal-form');
    if (personalForm) {
        personalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get updated values
            const name = this.querySelector('input[type="text"]').value;
            const email = this.querySelector('input[type="email"]').value;
            const phone = this.querySelector('input[type="tel"]').value;
            
            try {
                AquaStore.updateCurrentUser({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() });
                loadUserData();
                cancelEdit('personal-form');
                showToast('Profile updated successfully!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
});

// ============================================
// TOAST NOTIFICATION
// ============================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const icon = toast.querySelector('i');
    const messageSpan = toast.querySelector('.toast-message');
    
    toast.className = `toast ${type}`;
    
    if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else {
        icon.className = 'fas fa-exclamation-circle';
    }
    
    messageSpan.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}