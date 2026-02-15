import { collection, getDocs, query, where, orderBy, startAt, endAt } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function loadReports() {
    const pageContent = document.getElementById('pageContent');
    
    pageContent.innerHTML = `
        <div class="card mb-6">
            <h2 class="text-2xl font-bold mb-4">التقارير</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block mb-2">من تاريخ</label>
                    <input type="date" id="reportStartDate" class="w-full px-4 py-2 border rounded-lg">
                </div>
                <div>
                    <label class="block mb-2">إلى تاريخ</label>
                    <input type="date" id="reportEndDate" class="w-full px-4 py-2 border rounded-lg">
                </div>
                <div class="flex items-end">
                    <button onclick="generateReport()" class="btn-primary w-full">
                        <i class="fas fa-chart-bar ml-2"></i>إنشاء التقرير
                    </button>
                </div>
            </div>
        </div>

        <div id="reportContent" class="space-y-6">
            <div class="card">
                <p class="text-center text-gray-500">اختر الفترة الزمنية واضغط على "إنشاء التقرير"</p>
            </div>
        </div>
    `;
}

window.generateReport = async function() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!startDate || !endDate) {
        alert('يرجى اختيار تاريخ البداية والنهاية');
        return;
    }
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري إنشاء التقرير...</p></div>';
    
    try {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        console.log('جلب الطلبات من:', start, 'إلى:', end);
        
        // Get orders in date range
        const ordersSnapshot = await getDocs(query(
            collection(db, 'orders'),
            where('createdAt', '>=', start),
            where('createdAt', '<=', end),
            orderBy('createdAt', 'desc')
        ));
        
        const orders = ordersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // التأكد من وجود الحقول المطلوبة
                total: data.total || 0,
                status: data.status || 'unknown',
                items: data.items || [],
                createdAt: data.createdAt,
                customerName: data.customerName || data.userName || 'غير محدد'
            };
        });
        
        console.log(`تم جلب ${orders.length} طلب`);
        
        if (orders.length === 0) {
            reportContent.innerHTML = `
                <div class="card">
                    <div class="text-center py-8">
                        <i class="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-600 mb-2">لا توجد بيانات في الفترة المحددة</h3>
                        <p class="text-gray-500">يرجى اختيار فترة زمنية أخرى تحتوي على طلبات</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Calculate statistics
        const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        
        // Get top products
        const productsMap = new Map();
        orders.forEach(order => {
            (order.items || []).forEach(item => {
                const productKey = item.productId || item.name || 'منتج غير معروف';
                const current = productsMap.get(productKey) || { 
                    name: item.name || 'منتج غير معروف', 
                    quantity: 0, 
                    revenue: 0 
                };
                current.quantity += (item.quantity || 1);
                current.revenue += (item.price || 0) * (item.quantity || 1);
                productsMap.set(productKey, current);
            });
        });
        
        const topProducts = Array.from(productsMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        
        // Daily sales chart data
        const dailySales = {};
        orders.forEach(order => {
            let date = 'غير محدد';
            try {
                if (order.createdAt) {
                    date = order.createdAt.toDate().toLocaleDateString('ar-SA');
                }
            } catch (e) {
                console.warn('خطأ في تحويل التاريخ:', e);
            }
            dailySales[date] = (dailySales[date] || 0) + (order.total || 0);
        });
        
        console.log('إحصائيات التقرير:', {
            totalSales,
            totalOrders,
            completedOrders,
            cancelledOrders,
            pendingOrders,
            topProductsCount: topProducts.length,
            dailySalesCount: Object.keys(dailySales).length
        });
        
        reportContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <h3>إجمالي المبيعات</h3>
                    <div class="value">${totalSales.toFixed(2)} ج.م</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <h3>عدد الطلبات</h3>
                    <div class="value">${totalOrders}</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <h3>طلبات مكتملة</h3>
                    <div class="value">${completedOrders}</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <h3>متوسط قيمة الطلب</h3>
                    <div class="value">${totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0} ج.م</div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">المبيعات اليومية</h3>
                        <button onclick="exportToExcel('daily')" class="btn-primary text-sm">
                            <i class="fas fa-file-excel ml-2"></i>تصدير Excel
                        </button>
                    </div>
                    <canvas id="dailySalesChart" height="300"></canvas>
                </div>

                <div class="card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">المنتجات الأكثر مبيعًا</h3>
                        <button onclick="exportToExcel('products')" class="btn-primary text-sm">
                            <i class="fas fa-file-excel ml-2"></i>تصدير Excel
                        </button>
                    </div>
                    <div class="space-y-2">
                        ${topProducts.length > 0 ? topProducts.map((product, index) => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div class="flex items-center">
                                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold ml-3">${index + 1}</span>
                                    <div>
                                        <p class="font-semibold">${product.name}</p>
                                        <p class="text-sm text-gray-500">${product.quantity} قطعة</p>
                                    </div>
                                </div>
                                <span class="text-green-600 font-bold">${product.revenue.toFixed(2)} ج.م</span>
                            </div>
                        `).join('') : '<p class="text-center text-gray-500 py-4">لا توجد منتجات</p>'}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">تفاصيل الطلبات</h3>
                    <div>
                        <button onclick="exportToPDF()" class="btn-primary text-sm ml-2">
                            <i class="fas fa-file-pdf ml-2"></i>تصدير PDF
                        </button>
                        <button onclick="exportToExcel('orders')" class="btn-primary text-sm">
                            <i class="fas fa-file-excel ml-2"></i>تصدير Excel
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>رقم الطلب</th>
                                <th>التاريخ</th>
                                <th>العميل</th>
                                <th>المبلغ</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map(order => {
                                let orderDate = 'غير محدد';
                                try {
                                    if (order.createdAt) {
                                        orderDate = order.createdAt.toDate().toLocaleDateString('ar-SA');
                                    }
                                } catch (e) {
                                    console.warn('خطأ في عرض التاريخ:', e);
                                }
                                
                                return `
                                    <tr>
                                        <td>#${order.id.substring(0, 8)}</td>
                                        <td>${orderDate}</td>
                                        <td>${order.customerName}</td>
                                        <td>${order.total.toFixed(2)} ج.م</td>
                                        <td>
                                            <span class="badge badge-${getOrderStatusColor(order.status)}">
                                                ${getOrderStatusText(order.status)}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Load Chart.js and create chart
        try {
            await loadChartJS();
            createDailySalesChart(dailySales);
        } catch (chartError) {
            console.warn('خطأ في تحميل الرسم البياني:', chartError);
            // لا نوقف التقرير إذا فشل الرسم البياني
        }
        
        console.log('تم إنشاء التقرير بنجاح');
        
    } catch (error) {
        console.error('Error generating report:', error);
        reportContent.innerHTML = `
            <div class="card">
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-red-600 mb-2">حدث خطأ أثناء إنشاء التقرير</h3>
                    <p class="text-gray-600 mb-4">${error.message || 'خطأ غير معروف'}</p>
                    <button onclick="generateReport()" class="btn-primary">
                        <i class="fas fa-redo ml-2"></i>إعادة المحاولة
                    </button>
                </div>
            </div>
        `;
    }
}

function getOrderStatusColor(status) {
    const colors = {
        'new': 'info',
        'preparing': 'warning',
        'shipped': 'info',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'info';
}

function getOrderStatusText(status) {
    const texts = {
        'new': 'جديد',
        'preparing': 'جاري التحضير',
        'shipped': 'تم الشحن',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return texts[status] || status;
}

async function loadChartJS() {
    if (window.Chart) {
        console.log('Chart.js محمل بالفعل');
        return;
    }
    
    console.log('جاري تحميل Chart.js...');
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => {
            console.log('تم تحميل Chart.js بنجاح');
            resolve();
        };
        script.onerror = () => {
            console.error('فشل تحميل Chart.js');
            reject(new Error('فشل تحميل Chart.js'));
        };
        
        // إضافة timeout لمنع الانتظار الطويل
        setTimeout(() => {
            if (!window.Chart) {
                reject(new Error('انتهت مهلة تحميل Chart.js'));
            }
        }, 10000);
        
        document.head.appendChild(script);
    });
}

function createDailySalesChart(dailySales) {
    const ctx = document.getElementById('dailySalesChart');
    if (!ctx) {
        console.warn('عنصر الرسم البياني غير موجود');
        return;
    }
    
    try {
        const dates = Object.keys(dailySales).sort();
        const sales = dates.map(date => dailySales[date]);
        
        console.log('بيانات الرسم البياني:', { dates, sales });
        
        // التحقق من وجود Chart.js
        if (typeof Chart === 'undefined') {
            console.error('Chart.js غير محمل');
            return;
        }
        
        // تدمير الرسم البياني القديم إذا وجد
        if (window.dailySalesChartInstance) {
            window.dailySalesChartInstance.destroy();
        }
        
        window.dailySalesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'المبيعات (ج.م)',
                    data: sales,
                    borderColor: 'rgb(66, 153, 225)',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgb(66, 153, 225)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                family: 'Tajawal, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14,
                            family: 'Tajawal, sans-serif'
                        },
                        bodyFont: {
                            size: 13,
                            family: 'Tajawal, sans-serif'
                        },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `المبيعات: ${context.parsed.y.toFixed(2)} ج.م`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                family: 'Tajawal, sans-serif'
                            },
                            callback: function(value) {
                                return value + ' ج.م';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Tajawal, sans-serif'
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
        
        console.log('تم إنشاء الرسم البياني بنجاح');
        
    } catch (error) {
        console.error('خطأ في إنشاء الرسم البياني:', error);
        
        // عرض رسالة خطأ في مكان الرسم البياني
        const chartContainer = ctx.parentElement;
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-chart-line text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">تعذر عرض الرسم البياني</p>
                    <p class="text-sm text-gray-400 mt-2">${error.message}</p>
                </div>
            `;
        }
    }
}

window.exportToExcel = function(type) {
    // Simple CSV export (in production, use a library like xlsx)
    alert('في التطبيق الكامل، سيتم تصدير البيانات إلى Excel');
}

window.exportToPDF = function() {
    // In production, use a library like jsPDF or call a server function
    window.print();
}

