(function() {
    const KEYS = {
        users: 'aquapro_users',
        session: 'aquapro_session',
        orders: 'aquapro_orders',
        subscriptions: 'aquapro_subscriptions',
        inventory: 'aquapro_inventory'
    };

    function read(key, fallback) {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    }

    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getUsers() {
        return read(KEYS.users, []);
    }

    function saveUsers(users) {
        write(KEYS.users, users);
    }

    function getOrders() {
        return read(KEYS.orders, []);
    }

    function saveOrders(orders) {
        write(KEYS.orders, orders);
    }

    function getSession() {
        return read(KEYS.session, null);
    }

    function getCurrentUser() {
        const session = getSession();
        if (!session) return null;

        const users = getUsers();
        for (let i = 0; i < users.length; i++) {
            if (users[i].email === session.email) return users[i];
        }
        return null;
    }

    function getInventory() {
        return read(KEYS.inventory, [
            { id: 'BTL-001', type: '5-Gallon Bottle', status: 'in-stock', associated: '' },
            { id: 'BTL-002', type: 'Round Container', status: 'with-customer', associated: 'Juan Dela Cruz' },
            { id: 'BTL-003', type: 'Slim Container', status: 'in-stock', associated: '' }
        ]);
    }

    if (localStorage.getItem(KEYS.orders) === null) {
        write(KEYS.orders, [
            {
                id: 1005, email: 'customer@aquapro.ph', customer: 'Juan Dela Cruz',
                phone: '0912-345-6789', barangay: 'Acacia', address: '#123 Main St., Brgy. Acacia, Catarman',
                items: [{ name: '5-Gallon Bottle', quantity: 2, price: 35 }],
                subtotal: 70, deliveryFee: 20, total: 90, date: '2026-10-23',
                timeSlot: 'morning', status: 'delivering', driverEmail: 'driver@aquapro.ph',
                payment: 'Cash on Delivery', instructions: ''
            },
            {
                id: 1004, email: 'customer@aquapro.ph', customer: 'Juan Dela Cruz',
                phone: '0912-345-6789', barangay: 'Acacia', address: '#123 Main St., Brgy. Acacia, Catarman',
                items: [{ name: 'Round Container', quantity: 3, price: 30 }],
                subtotal: 90, deliveryFee: 20, total: 110, date: '2026-10-22',
                timeSlot: 'afternoon', status: 'confirmed', driverEmail: '',
                payment: 'Cash on Delivery', instructions: ''
            }
        ]);
    }

    if (localStorage.getItem(KEYS.inventory) === null) {
        write(KEYS.inventory, getInventory());
    }

    window.AquaStore = {
        toast: function(message, type) {
            let toast = document.getElementById('toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast';
                toast.className = 'toast';
                toast.innerHTML = '<i></i><span class="toast-message"></span>';
                document.body.appendChild(toast);
            }
            toast.className = `toast ${type || 'success'} show`;
            toast.querySelector('.toast-message').textContent = message;
            toast.querySelector('i').className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
            setTimeout(() => toast.classList.remove('show'), 3000);
        },
        getUsers,
        saveUsers,
        getOrders,
        saveOrders,
        getSession,
        getCurrentUser,
        getInventory,
        saveInventory: function(items) {
            write(KEYS.inventory, items);
        },
        getSubscriptions: function() {
            return read(KEYS.subscriptions, {});
        },
        saveSubscriptions: function(items) {
            write(KEYS.subscriptions, items);
        },
        getDeliveryFee: function() {
            const settings = read('aquapro_admin_settings', {});
            const configured = Number(settings[1] && settings[1][0]);
            return Number.isFinite(configured) && configured >= 0 ? configured : 20;
        },
        register: function(user) {
            const users = getUsers();
            for (let i = 0; i < users.length; i++) {
                if (users[i].email.toLowerCase() === user.email.toLowerCase()) {
                    throw new Error('An account with this email already exists.');
                }
            }
            const newUser = {};
            const userFields = Object.keys(user);
            for (let i = 0; i < userFields.length; i++) {
                const key = userFields[i];
                newUser[key] = user[key];
            }
            newUser.createdAt = user.createdAt || new Date().toISOString();
            newUser.active = user.active !== false;
            users.push(newUser);
            saveUsers(users);
        },
        login: function(email, password) {
            const users = getUsers();
            let user = null;
            for (let i = 0; i < users.length; i++) {
                if (users[i].email.toLowerCase() === email.toLowerCase() && users[i].password === password) {
                    user = users[i];
                    break;
                }
            }
            if (!user || user.active === false) return null;
            write(KEYS.session, { email: user.email, role: user.role });
            localStorage.setItem('aquapro_user_name', user.name);
            localStorage.setItem('aquapro_user_email', user.email);
            localStorage.setItem('aquapro_user_role', user.role);
            localStorage.setItem('aquapro_is_logged_in', 'true');
            return user;
        },
        logout: function() {
            localStorage.removeItem(KEYS.session);
            localStorage.removeItem('aquapro_user_name');
            localStorage.removeItem('aquapro_user_email');
            localStorage.removeItem('aquapro_user_role');
            localStorage.removeItem('aquapro_is_logged_in');
        },
        requireRole: function(roles, loginPath) {
            const user = getCurrentUser();
            let allowed = false;
            for (let i = 0; i < roles.length; i++) {
                if (user && roles[i] === user.role) allowed = true;
            }
            if (!user || !allowed) {
                window.location.href = loginPath || 'login.html';
                return null;
            }
            return user;
        },
        createOrder: function(order) {
            const orders = getOrders();
            let highestId = 1000;
            for (let i = 0; i < orders.length; i++) {
                const orderId = Number(orders[i].id) || 0;
                if (orderId > highestId) highestId = orderId;
            }
            const created = {};
            const orderFields = Object.keys(order);
            for (let i = 0; i < orderFields.length; i++) {
                const key = orderFields[i];
                created[key] = order[key];
            }
            created.id = highestId + 1;
            orders.unshift(created);
            saveOrders(orders);
            return created;
        },
        updateOrder: function(id, changes) {
            const orders = getOrders();
            let index = -1;
            for (let i = 0; i < orders.length; i++) {
                if (String(orders[i].id) === String(id)) {
                    index = i;
                    break;
                }
            }
            if (index < 0) throw new Error(`Order #${id} was not found.`);
            const orderFields = Object.keys(changes);
            for (let i = 0; i < orderFields.length; i++) {
                const key = orderFields[i];
                orders[index][key] = changes[key];
            }
            saveOrders(orders);
            return orders[index];
        },
        updateCurrentUser: function(changes) {
            const current = getCurrentUser();
            if (!current) throw new Error('No signed-in user was found.');
            const users = getUsers();
            const email = changes.email ? changes.email.trim().toLowerCase() : current.email;
            for (let i = 0; i < users.length; i++) {
                if (users[i].email.toLowerCase() === email && users[i].email !== current.email) {
                    throw new Error('An account with this email already exists.');
                }
            }
            let index = -1;
            for (let i = 0; i < users.length; i++) {
                if (users[i].email === current.email) {
                    index = i;
                    break;
                }
            }
            if (index < 0) throw new Error('The signed-in account could not be found.');
            const changedFields = Object.keys(changes);
            for (let i = 0; i < changedFields.length; i++) {
                const key = changedFields[i];
                users[index][key] = changes[key];
            }
            users[index].email = email;
            saveUsers(users);
            write(KEYS.session, { email, role: users[index].role });
            localStorage.setItem('aquapro_user_name', users[index].name);
            localStorage.setItem('aquapro_user_email', email);
            return users[index];
        }
    };

    document.addEventListener('click', function(event) {
        const link = event.target.closest('a[href]');
        if (link && /(?:^|\/)login\.html(?:[?#]|$)/i.test(link.getAttribute('href'))) {
            window.AquaStore.logout();
        }
    });

    window.addEventListener('storage', function(event) {
        const changedKeys = [KEYS.users, KEYS.session, KEYS.orders, KEYS.subscriptions, KEYS.inventory];
        if (changedKeys.indexOf(event.key) !== -1) {
            window.location.reload();
        }
    });
})();
