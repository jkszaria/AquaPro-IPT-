// ============================================
// AQUAPRO - Admin Settings JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    if (!AquaStore.requireRole(['admin'], '../login.html')) return;
    loadSettings();
    initSaveButtons();
});

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('aquapro_admin_settings') || '{}');
    document.querySelectorAll('.settings-container .card').forEach((card, index) => {
        (settings[index] || []).forEach((value, fieldIndex) => {
            const field = card.querySelectorAll('input, select, textarea')[fieldIndex];
            if (value === null) return;
            if (field && field.type === 'checkbox') field.checked = Boolean(value);
            else if (field && field.type !== 'password') field.value = value;
        });
    });
}

// Save buttons
function initSaveButtons() {
    const saveButtons = document.querySelectorAll('.settings-container .btn-primary');
    
    saveButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.card');
            const sectionName = card.querySelector('h3').textContent.trim();
            
            const fields = Array.from(card.querySelectorAll('input, select, textarea'))
                .map(field => field.type === 'password' ? null : field.type === 'checkbox' ? field.checked : field.value);
            const settings = JSON.parse(localStorage.getItem('aquapro_admin_settings') || '{}');
            const index = Array.from(document.querySelectorAll('.settings-container .card')).indexOf(card);
            settings[index] = fields;
            localStorage.setItem('aquapro_admin_settings', JSON.stringify(settings));
            this.textContent = 'Saving...';
            this.disabled = true;
            this.textContent = 'Saved!';
            AquaStore.toast(`${sectionName} settings saved in this browser.`, 'success');
            setTimeout(() => {
                this.textContent = 'Save Changes';
                this.disabled = false;
            }, 1200);
        });
    });
}