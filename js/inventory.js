document.addEventListener('DOMContentLoaded', function() {
    if (!AquaStore.requireRole(['admin'], '../login.html')) return;
    renderInventory();
    document.getElementById('log-new-bottle')?.addEventListener('click', addBottle);
    document.getElementById('record-return')?.addEventListener('click', recordReturn);
    document.querySelector('.table-toolbar .search-bar input')?.addEventListener('input', filterInventory);
    document.querySelectorAll('.table-toolbar .filter-select').forEach(select => select.addEventListener('change', filterInventory));
});

function renderInventory() {
    const body = document.querySelector('.data-table tbody');
    const items = AquaStore.getInventory();
    body.innerHTML = items.map(item => `<tr data-id="${escapeInventory(item.id)}" data-type="${escapeInventory(item.type.toLowerCase())}" data-status="${escapeInventory(item.status)}">
        <td><strong>${escapeInventory(item.id)}</strong></td>
        <td><code>QR-${escapeInventory(item.id)}</code></td>
        <td>${escapeInventory(item.type)}</td>
        <td><span class="status-badge status-${escapeInventory(item.status)}">${escapeInventory(item.status.replace('-', ' '))}</span></td>
        <td>${escapeInventory(item.lastMovement || 'Today')}</td>
        <td>${escapeInventory(item.associated || '—')}</td>
        <td><div class="action-btns"><button class="btn btn-sm btn-primary" data-inventory-action="view">View</button><button class="btn btn-sm btn-outline" data-inventory-action="status">Change Status</button></div></td>
    </tr>`).join('');
    const total = document.querySelectorAll('.inventory-dashboard .stat-card .stat-value');
    if (total[0]) total[0].textContent = String(items.length);
    if (total[1]) total[1].textContent = String(items.filter(item => item.status === 'returned').length);
    if (total[2]) total[2].textContent = String(items.filter(item => item.status === 'in-stock').length);
    if (total[3]) total[3].textContent = String(items.filter(item => item.status === 'damaged').length);
    const warning = document.getElementById('low-stock-warning');
    if (warning) warning.style.display = items.filter(item => item.status === 'in-stock').length < 10 ? 'flex' : 'none';

    body.onclick = event => {
        const button = event.target.closest('[data-inventory-action]');
        if (!button) return;
        const row = button.closest('tr');
        const inventory = AquaStore.getInventory();
        const item = inventory.find(entry => entry.id === row.dataset.id);
        if (!item) return;
        if (button.dataset.inventoryAction === 'view') {
            alert(`${item.id}\nType: ${item.type}\nStatus: ${item.status}\nAssociated: ${item.associated || 'None'}`);
            return;
        }
        const status = prompt('Set status: in-stock, with-customer, with-driver, damaged, returned', item.status);
        if (!['in-stock', 'with-customer', 'with-driver', 'damaged', 'returned'].includes((status || '').toLowerCase())) {
            if (status !== null) AquaStore.toast('Choose a valid inventory status.', 'error');
            return;
        }
        item.status = status.toLowerCase();
        item.lastMovement = new Date().toLocaleDateString();
        AquaStore.saveInventory(inventory);
        renderInventory();
    };
    filterInventory();
}

function addBottle() {
    const type = prompt('Bottle type: 5-Gallon Bottle, Round Container, or Slim Container');
    if (!type) return;
    const types = ['5-Gallon Bottle', 'Round Container', 'Slim Container'];
    const normalized = types.find(value => value.toLowerCase() === type.trim().toLowerCase());
    if (!normalized) {
        AquaStore.toast('Choose one of the listed bottle types.', 'error');
        return;
    }
    const inventory = AquaStore.getInventory();
    const id = `BTL-${String(Date.now()).slice(-6)}`;
    inventory.push({ id, type: normalized, status: 'in-stock', associated: '', lastMovement: new Date().toLocaleDateString() });
    AquaStore.saveInventory(inventory);
    renderInventory();
    AquaStore.toast(`Bottle ${id} added to inventory.`, 'success');
}

function recordReturn() {
    const id = prompt('Enter the Bottle ID being returned:');
    if (!id) return;
    const inventory = AquaStore.getInventory();
    const item = inventory.find(entry => entry.id.toLowerCase() === id.trim().toLowerCase());
    if (!item) {
        AquaStore.toast('Bottle ID was not found.', 'error');
        return;
    }
    item.status = 'returned';
    item.associated = '';
    item.lastMovement = new Date().toLocaleDateString();
    AquaStore.saveInventory(inventory);
    renderInventory();
    AquaStore.toast(`${item.id} return recorded.`, 'success');
}

function filterInventory() {
    const query = (document.querySelector('.table-toolbar .search-bar input')?.value || '').toLowerCase();
    const selects = document.querySelectorAll('.table-toolbar .filter-select');
    const status = selects[0]?.value || '';
    const type = selects[1]?.value || '';
    document.querySelectorAll('.data-table tbody tr').forEach(row => {
        const matches = row.textContent.toLowerCase().includes(query) &&
            (!status || row.dataset.status === status) &&
            (!type || row.dataset.type.includes(type));
        row.style.display = matches ? '' : 'none';
    });
}

function escapeInventory(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}
