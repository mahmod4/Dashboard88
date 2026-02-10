import { collection, query, where, getDocs, getCountFromServer, orderBy, limit } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function loadDashboard() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        // Get statistics
        const stats = await getDashboardStats();
        
        pageContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <h3><i class="fas fa-dollar-sign ml-2"></i>مبيعات اليوم</h3>
                    <div class="value">${stats.todaySales.toFixed(2)} ج.م</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <h3><i class="fas fa-calendar ml-2"></i>مبيعات الشهر</h3>
                    <div class="value">${stats.monthSales.toFixed(2)} ج.م</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <h3><i class="fas fa-shopping-cart ml-2"></i>عدد الطلبات</h3>
                    <div class="value">${stats.totalOrders}</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <h3><i class="fas fa-users ml-2"></i>عدد المستخدمين</h3>
                    <div class="value">${stats.totalUsers}</div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">المنتجات الأكثر مبيعًا</h2>
                    <div id="topProducts" class="space-y-3">
                        ${stats.topProducts.map((product, index) => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div class="flex items-center">
                                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold ml-3">${index + 1}</span>
                                    <div>
                                        <p class="font-semibold">${product.name}</p>
                                        <p class="text-sm text-gray-500">${product.sales} عملية بيع</p>
                                    </div>
                                </div>
                                <span class="text-green-600 font-bold">${product.revenue.toFixed(2)} ج.م</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">الطلبات الأخيرة</h2>
                    <div id="recentOrders" class="space-y-3">
                        ${stats.recentOrders.map(order => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p class="font-semibold">طلب #${order.id}</p>
                                    <p class="text-sm text-gray-500">${order.date}</p>
                                </div>
                                <div class="text-left">
                                    <p class="font-bold text-green-600">${order.total.toFixed(2)} ج.م</p>
                                    <span class="badge badge-${getStatusColor(order.status)}">${getStatusText(order.status)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="card mt-6">
                <h2 class="text-2xl font-bold mb-4">إشعارات سريعة</h2>
                <div id="notifications" class="space-y-2">
                    ${stats.notifications.map(notif => `
                        <div class="p-3 bg-${notif.type === 'warning' ? 'yellow' : notif.type === 'danger' ? 'red' : 'blue'}-50 border-r-4 border-${notif.type === 'warning' ? 'yellow' : notif.type === 'danger' ? 'red' : 'blue'}-500 rounded">
                            <p class="font-semibold">${notif.title}</p>
                            <p class="text-sm text-gray-600">${notif.message}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        const msg = (error && (error.message || error.code)) ? `${error.code ? error.code + ': ' : ''}${error.message || ''}` : 'خطأ غير معروف';
        pageContent.innerHTML = `<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل البيانات</p><pre style="white-space:pre-wrap;direction:ltr;text-align:left;" class="mt-2 text-xs">${msg}</pre></div>`;
    }
}

async function getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get orders
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate today's sales
    const todayOrders = orders.filter(order => {
        const orderDate = order.createdAt?.toDate();
        return orderDate && orderDate >= today;
    });
    const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Calculate month's sales
    const monthOrders = orders.filter(order => {
        const orderDate = order.createdAt?.toDate();
        return orderDate && orderDate >= monthStart;
    });
    const monthSales = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Get users count
    const usersSnapshot = await getCountFromServer(collection(db, 'users'));
    const totalUsers = usersSnapshot.data().count;

    // Get top products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate product sales (simplified - in real app, track sales per product)
    const topProducts = products
        .map(product => ({
            name: product.name || 'منتج',
            sales: product.salesCount || Math.floor(Math.random() * 100),
            revenue: (product.salesCount || 0) * (product.price || 0)
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

    // Recent orders
    const recentOrders = orders
        .sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return dateB - dateA;
        })
        .slice(0, 5)
        .map(order => ({
            id: order.id,
            total: order.total || 0,
            status: order.status || 'pending',
            date: order.createdAt?.toDate().toLocaleDateString('ar-SA') || 'غير محدد'
        }));

    // Notifications
    const notifications = [
        {
            type: 'info',
            title: 'طلبات جديدة',
            message: `لديك ${orders.filter(o => o.status === 'new').length} طلب جديد`
        },
        {
            type: 'warning',
            title: 'منتجات قليلة المخزون',
            message: `${products.filter(p => (p.stock || 0) < 10).length} منتج يحتاج إعادة تخزين`
        }
    ];

    return {
        todaySales,
        monthSales,
        totalOrders: orders.length,
        totalUsers,
        topProducts,
        recentOrders,
        notifications
    };
}

function getStatusColor(status) {
    const colors = {
        'new': 'info',
        'preparing': 'warning',
        'shipped': 'info',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'info';
}

function getStatusText(status) {
    const texts = {
        'new': 'جديد',
        'preparing': 'جاري التحضير',
        'shipped': 'تم الشحن',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return texts[status] || status;
}

