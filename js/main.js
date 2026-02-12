import { onAuthStateChange, logout } from './auth.js';
import { loadDashboard } from './dashboard.js';
import { loadProducts } from './products.js';
import { loadCategories } from './categories.js';
import { loadOrders } from './orders.js';
import { loadUsers } from './users.js';
import { loadOffers } from './offers.js';
import { loadLoyalty } from './loyalty.js';
import { loadPayments } from './payments.js';
import { loadReports } from './reports.js';
import { loadNotifications } from './notifications.js';
import { loadContent } from './content.js';
import { loadSettings } from './settings.js';

// Page elements
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const pageTitle = document.getElementById('pageTitle');
const pageContent = document.getElementById('pageContent');
const userName = document.getElementById('userName');

// Current page
let currentPage = 'dashboard';

let adminInfo = { isAdmin: false, role: null };

function getAllowedPagesForRole(role) {
    if (role === 'super_admin') {
        return new Set(Object.keys(pageTitles));
    }
    if (role === 'admin') {
        return new Set(['dashboard', 'products', 'categories', 'orders', 'offers']);
    }
    return new Set();
}

function applyRoleToSidebar(role) {
    const allowed = getAllowedPagesForRole(role);
    document.querySelectorAll('.nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (!page) return;
        if (allowed.has(page)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Page titles
const pageTitles = {
    dashboard: 'الصفحة الرئيسية',
    products: 'إدارة المنتجات',
    categories: 'إدارة الأقسام',
    orders: 'إدارة الطلبات',
    users: 'إدارة المستخدمين',
    offers: 'العروض والخصومات',
    loyalty: 'نقاط الولاء',
    payments: 'الدفع الإلكتروني',
    reports: 'التقارير',
    notifications: 'الإشعارات',
    content: 'إدارة المحتوى',
    settings: 'الإعدادات'
};

// Page loaders
const pageLoaders = {
    dashboard: loadDashboard,
    products: loadProducts,
    categories: loadCategories,
    orders: loadOrders,
    users: loadUsers,
    offers: loadOffers,
    loyalty: loadLoyalty,
    payments: loadPayments,
    reports: loadReports,
    notifications: loadNotifications,
    content: loadContent,
    settings: loadSettings
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check auth state
    onAuthStateChange((user, info) => {
        adminInfo = info || { isAdmin: false, role: null };
        try {
            window.dashboardAdminInfo = adminInfo;
        } catch (e) {}

        if (user && adminInfo.isAdmin) {
            showDashboard();
            userName.textContent = user.email;
            applyRoleToSidebar(adminInfo.role);
        } else {
            showLogin();
        }
    });

    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const email = emailInput.value;
        const password = passwordInput.value;
        
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i>جاري تسجيل الدخول...';
        loginError.classList.add('hidden');
        
        try {
            const { login } = await import('./auth.js');
            await login(email, password);
            // Success - form will be reset by showDashboard
            loginError.classList.add('hidden');
        } catch (error) {
            // Don't reset form on error - keep email and password
            let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'البريد الإلكتروني غير مسجل';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'كلمة المرور غير صحيحة';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'البريد الإلكتروني غير صحيح';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'تم تجاوز عدد المحاولات. حاول مرة أخرى لاحقاً';
            } else if (error.message) {
                errorMessage = error.message;
            } else if (error.code) {
                errorMessage = `خطأ: ${error.code}`;
            }
            
            loginError.textContent = errorMessage;
            loginError.classList.remove('hidden');
            
            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Logout button
    logoutBtn.addEventListener('click', async () => {
        await logout();
        showLogin();
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            navigateToPage(page);
        });
    });
});

// Show login page
function showLogin() {
    loginPage.classList.remove('hidden');
    dashboardPage.classList.add('hidden');
    // Don't reset form automatically - only reset on successful login
}

// Show dashboard
function showDashboard() {
    loginPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    loginForm.reset(); // Reset form only on successful login
    loginError.classList.add('hidden');
    navigateToPage('dashboard');
}

// Navigate to page
export function navigateToPage(page) {
    const allowed = getAllowedPagesForRole(adminInfo && adminInfo.role);
    if (!allowed.has(page)) {
        page = 'dashboard';
    }
    currentPage = page;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });

    // Update page title
    pageTitle.textContent = pageTitles[page] || page;

    // Load page content
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    
    if (pageLoaders[page]) {
        pageLoaders[page]();
    } else {
        pageContent.innerHTML = '<div class="card"><p>الصفحة غير متوفرة</p></div>';
    }
}

// Expose helpers for non-module scripts (e.g. Reset button in index.html)
try {
    window.navigateToPage = navigateToPage;
    window.getDashboardCurrentPage = () => currentPage;
} catch (e) {}

