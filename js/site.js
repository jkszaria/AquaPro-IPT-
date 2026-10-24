// main.js
// ============================================
// AQUAPRO - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize hamburger menu
    initHamburgerMenu();
    
    // Initialize smooth scrolling
    initSmoothScroll();
    
    // Initialize navbar scroll effect
    initNavbarScroll();
});

// Hamburger Menu Toggle
function initHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
}

// Smooth Scrolling
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close mobile menu
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu) navMenu.classList.remove('active');
            }
        });
    });
}

// Navbar Scroll Effect
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            } else {
                navbar.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }
        });
    }
}

// Toast Notification
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

// Format Currency
function formatCurrency(amount) {
    return '₱' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Get current time greeting
function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

// water-quality.js
document.addEventListener('DOMContentLoaded', function() {
    const button = document.querySelector('.lab-actions .btn-primary');
    if (!button) return;
    button.addEventListener('click', function() {
        const tableRows = document.querySelectorAll('.lab-table tr');
        const rows = ['AquaPro Water Quality Laboratory Report'];
        for (let i = 0; i < tableRows.length; i++) {
            const cells = [];
            for (let j = 0; j < tableRows[i].cells.length; j++) {
                cells.push(tableRows[i].cells[j].textContent.trim());
            }
            rows.push(cells.join(' | '));
        }
        const report = rows.join('\r\n');
        const url = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'aquapro-water-quality-report.txt';
        link.click();
        URL.revokeObjectURL(url);
    });
});
