import { collection, updateDoc, doc, getDocs, getDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function loadUsers() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const users = await getUsers();
        
        pageContent.innerHTML = `
            <div class="card mb-6">
                <h2 class="text-2xl font-bold">المستخدمين</h2>
            </div>

            <div class="card">
                <div class="overflow-x-auto">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>الاسم</th>
                                <th>البريد الإلكتروني</th>
                                <th>رقم الهاتف</th>
                                <th>عدد الطلبات</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="usersTable">
                            ${users.map(user => `
                                <tr>
                                    <td>${user.name || 'غير محدد'}</td>
                                    <td>${user.email || 'غير محدد'}</td>
                                    <td>${user.phone || '-'}</td>
                                    <td>${user.ordersCount || 0}</td>
                                    <td>
                                        <span class="badge badge-${user.active ? 'success' : 'danger'}">
                                            ${user.active ? 'نشط' : 'محظور'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onclick="viewUserDetails('${user.id}')" 
                                                class="btn-primary text-sm py-1 px-3 ml-2">
                                            <i class="fas fa-eye"></i> تفاصيل
                                        </button>
                                        <button onclick="toggleUserStatus('${user.id}', ${!user.active})" 
                                                class="btn-${user.active ? 'danger' : 'success'} text-sm py-1 px-3">
                                            <i class="fas fa-${user.active ? 'ban' : 'check'}"></i> 
                                            ${user.active ? 'حظر' : 'تفعيل'}
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- User Details Modal -->
            <div id="userDetailsModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeUserDetailsModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6">تفاصيل المستخدم</h2>
                    <div id="userDetailsContent"></div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل المستخدمين</p></div>';
    }
}

async function getUsers() {
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get orders count for each user
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    
    return users.map(user => ({
        ...user,
        ordersCount: orders.filter(o => o.userId === user.id).length
    }));
}

window.viewUserDetails = async function(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const user = { id: userDoc.id, ...userDoc.data() };
            
            // Get user orders
            const ordersSnapshot = await getDocs(query(
                collection(db, 'orders'),
                orderBy('createdAt', 'desc')
            ));
            const userOrders = ordersSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(order => order.userId === userId);
            
            document.getElementById('userDetailsContent').innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-600">الاسم:</p>
                            <p class="font-bold">${user.name || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">البريد الإلكتروني:</p>
                            <p class="font-bold">${user.email || 'غير محدد'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">رقم الهاتف:</p>
                            <p class="font-bold">${user.phone || '-'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">تاريخ التسجيل:</p>
                            <p class="font-bold">${user.createdAt?.toDate().toLocaleDateString('ar-SA') || 'غير محدد'}</p>
                        </div>
                    </div>
                    
                    <div class="border-t pt-4">
                        <h3 class="font-bold mb-3">سجل الطلبات (${userOrders.length}):</h3>
                        <div class="space-y-2 max-h-64 overflow-y-auto">
                            ${userOrders.length > 0 ? userOrders.map(order => `
                                <div class="flex justify-between p-2 bg-gray-50 rounded">
                                    <div>
                                        <p class="font-semibold">طلب #${order.id.substring(0, 8)}</p>
                                        <p class="text-sm text-gray-500">${order.createdAt?.toDate().toLocaleDateString('ar-SA') || ''}</p>
                                    </div>
                                    <div class="text-left">
                                        <p class="font-bold">${order.total?.toFixed(2) || 0} ج.م</p>
                                        <span class="badge badge-${getOrderStatusColor(order.status)}">${getOrderStatusText(order.status)}</span>
                                    </div>
                                </div>
                            `).join('') : '<p class="text-gray-500">لا توجد طلبات</p>'}
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                        <button onclick="toggleUserStatus('${user.id}', ${!user.active})" 
                                class="btn-${user.active ? 'danger' : 'success'}">
                            <i class="fas fa-${user.active ? 'ban' : 'check'} ml-2"></i>
                            ${user.active ? 'حظر المستخدم' : 'تفعيل المستخدم'}
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('userDetailsModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        alert('حدث خطأ أثناء تحميل تفاصيل المستخدم');
    }
}

window.closeUserDetailsModal = function() {
    document.getElementById('userDetailsModal').style.display = 'none';
}

window.toggleUserStatus = async function(userId, newStatus) {
    try {
        await updateDoc(doc(db, 'users', userId), {
            active: newStatus,
            updatedAt: new Date()
        });
        alert(newStatus ? 'تم تفعيل المستخدم بنجاح' : 'تم حظر المستخدم بنجاح');
        loadUsers();
        closeUserDetailsModal();
    } catch (error) {
        console.error('Error updating user status:', error);
        alert('حدث خطأ أثناء تحديث حالة المستخدم');
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

