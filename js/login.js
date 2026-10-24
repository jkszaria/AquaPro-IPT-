// ============================================
// AQUAPRO - Login JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initFormToggle();
    initPasswordToggle();
    initDemoAccounts();
    initLoginForm();
    initRegisterForm();
});

// Toggle between Login and Register forms
function initFormToggle() {
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (showRegister) {
        showRegister.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        });
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', function(e) {
            e.preventDefault();
            registerForm.classList.remove('active');
            loginForm.classList.add('active');
        });
    }
}

// Password visibility toggle
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

// Demo account buttons
function initDemoAccounts() {
    const demoButtons = document.querySelectorAll('.demo-btn');
    const users = AquaStore.getUsers();
    users.forEach(user => {
        if (!user.createdAt) user.createdAt = new Date().toISOString();
        if (user.active === undefined) user.active = true;
    });

    demoButtons.forEach(button => {
        const email = button.getAttribute('data-email');
        if (!users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
            const role = email.startsWith('admin@') ? 'admin' : email.startsWith('driver@') ? 'driver' : 'customer';
            users.push({
                name: role === 'admin' ? 'AquaPro Administrator' : role === 'driver' ? 'Roberto Mendoza' : 'Juan Dela Cruz',
                email,
                password: button.getAttribute('data-password'),
                role,
                createdAt: new Date().toISOString(),
                phone: '0912-345-6789',
                barangay: 'Acacia',
                address: '#123 Main St., Brgy. Acacia, Catarman'
            });
        }

        button.addEventListener('click', function() {
            document.getElementById('login-email').value = this.getAttribute('data-email');
            document.getElementById('login-password').value = this.getAttribute('data-password');
            
            showToast(`Demo ${this.getAttribute('data-email')} filled! Click Sign In to continue.`, 'success');
        });
    });
    AquaStore.saveUsers(users);
}

// Login form submission
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            // Simple validation
            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            const button = this.querySelector('button[type="submit"]');
            button.textContent = 'Signing in...';
            button.disabled = true;
            const user = AquaStore.login(email, password);
            button.textContent = 'Sign In';
            button.disabled = false;

            if (!user) {
                showToast('Email or password is incorrect', 'error');
                return;
            }

            const destinations = { admin: 'admin/admin.html', driver: 'driver-mobile.html', customer: 'dashboard.html' };
            window.location.href = destinations[user.role];
        });
    }
}

// Register form submission
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fullname = document.getElementById('reg-fullname').value;
            const email = document.getElementById('reg-email').value;
            const phone = document.getElementById('reg-phone').value;
            const password = document.getElementById('reg-password').value;
            const barangay = document.getElementById('reg-barangay').value;
            const address = document.getElementById('reg-address').value;
            const terms = document.getElementById('terms').checked;
            
            // Validation
            if (!fullname || !email || !phone || !password || !barangay || !address) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            if (password.length < 8) {
                showToast('Password must be at least 8 characters', 'error');
                return;
            }
            
            if (!terms) {
                showToast('Please agree to the Terms & Conditions', 'error');
                return;
            }
            
            const button = this.querySelector('button[type="submit"]');
            button.textContent = 'Creating Account...';
            button.disabled = true;
            try {
                AquaStore.register({
                    name: fullname.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    phone: phone.trim(),
                    barangay,
                    address: address.trim(),
                    role: 'customer'
                });
                showToast('Account created. Sign in with your new credentials.', 'success');
                document.getElementById('login-form').classList.add('active');
                document.getElementById('register-form').classList.remove('active');
                document.getElementById('login-email').value = email;
                document.getElementById('login-password').value = '';
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                button.textContent = 'Create Account';
                button.disabled = false;
            }
        });
    }
}

// Show toast notification
function showToast(message, type) {
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