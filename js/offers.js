import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function loadOffers() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const offers = await getOffers();
        const products = await getProducts();
        
        pageContent.innerHTML = `
            <div class="card mb-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">العروض والخصومات</h2>
                    <button onclick="openOfferModal()" class="btn-primary">
                        <i class="fas fa-plus ml-2"></i>إنشاء عرض جديد
                    </button>
                </div>
            </div>

            ${offers.length === 0 ? `
                <div class="card">
                    <div class="text-center py-12">
                        <i class="fas fa-percent text-6xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-600 mb-2">لا توجد عروض حالياً</h3>
                        <p class="text-gray-500 mb-6">ابدأ بإنشاء أول عرض لجذب المزيد من العملاء</p>
                        <button onclick="openOfferModal()" class="btn-primary">
                            <i class="fas fa-plus ml-2"></i>إنشاء أول عرض
                        </button>
                    </div>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${offers.map(offer => `
                        <div class="card offer-card ${offer.active ? 'has-discount' : 'opacity-60'}" style="position: relative;">
                            ${offer.active ? '<div class="discount-badge">خصم خاص</div>' : ''}
                            
                            ${offer.image ? `
                                <div class="mb-4">
                                    <img src="${offer.image}" alt="${offer.name}" 
                                         class="w-full h-48 object-cover rounded-lg"
                                         onerror="this.src='https://via.placeholder.com/300x200/e0e0e0/666666?text=No+Image'">
                                </div>
                            ` : ''}
                            
                            <div class="flex justify-between items-start mb-4">
                                <h3 class="text-xl font-bold text-gray-800">${offer.name}</h3>
                                <span class="badge badge-${offer.active ? 'success' : 'danger'}">
                                    ${offer.active ? 'نشط' : 'منتهي'}
                                </span>
                            </div>
                            
                            ${offer.description ? `
                                <p class="text-gray-600 mb-4 line-clamp-2">${offer.description}</p>
                            ` : ''}
                            
                            <div class="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg mb-4">
                                <div class="offer-price">
                                    ${offer.discountType === 'percentage' ? 
                                        `<span class="text-2xl font-bold text-orange-600">${offer.discountValue}%</span>
                                         <span class="text-gray-500">خصم</span>` :
                                        `<span class="text-2xl font-bold text-orange-600">${offer.discountValue}</span>
                                         <span class="text-gray-500">ج.م خصم</span>`
                                    }
                                </div>
                            </div>
                            
                            <div class="space-y-2 mb-4 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">نوع الخصم:</span>
                                    <span class="font-medium">
                                        ${offer.discountType === 'percentage' ? 
                                            '<span class="text-blue-600">نسبة مئوية</span>' : 
                                            '<span class="text-green-600">مبلغ ثابت</span>'
                                        }
                                    </span>
                                </div>
                                
                                <div class="flex justify-between">
                                    <span class="text-gray-500">قيمة الخصم:</span>
                                    <span class="font-bold text-orange-600">
                                        ${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ' ج.م'}
                                    </span>
                                </div>
                                
                                <div class="flex justify-between">
                                    <span class="text-gray-500">الفترة:</span>
                                    <span class="font-medium">
                                        ${offer.startDate?.toDate().toLocaleDateString('ar-SA') || 'غير محدد'} 
                                        - 
                                        ${offer.endDate?.toDate().toLocaleDateString('ar-SA') || 'غير محدد'}
                                    </span>
                                </div>
                                
                                <div class="flex justify-between">
                                    <span class="text-gray-500">المنتجات:</span>
                                    <span class="font-medium">
                                        ${offer.products && offer.products.length > 0 ? 
                                            `<span class="text-blue-600">${offer.products.length} منتج</span>` : 
                                            '<span class="text-green-600">جميع المنتجات</span>'
                                        }
                                    </span>
                                </div>
                                
                                ${offer.couponCode ? `
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">كود الكوبون:</span>
                                        <code class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-mono">
                                            ${offer.couponCode}
                                        </code>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="flex space-x-2 space-x-reverse mt-4">
                                <button onclick="editOffer('${offer.id}')" 
                                        class="btn-primary text-sm py-2 px-4 flex-1 hover:scale-105 transition-transform">
                                    <i class="fas fa-edit ml-1"></i> تعديل
                                </button>
                                <button onclick="deleteOffer('${offer.id}')" 
                                        class="btn-danger text-sm py-2 px-4 flex-1 hover:scale-105 transition-transform">
                                    <i class="fas fa-trash ml-1"></i> حذف
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;

        // Load products for select
        await loadProductsForSelect(products);
    } catch (error) {
        console.error('Error loading offers:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل العروض</p></div>';
    }
}

// Add modal HTML to the page
function addOfferModal() {
    const modalHTML = `
        <!-- Offer Modal -->
        <div id="offerModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeOfferModal()">&times;</span>
                <h2 class="text-2xl font-bold mb-6" id="offerModalTitle">إنشاء عرض جديد</h2>
                <form id="offerForm" onsubmit="saveOffer(event)">
                    <input type="hidden" id="offerId">
                    
                    <div class="form-group">
                        <label>اسم العرض *</label>
                        <input type="text" id="offerName" required>
                    </div>

                    <div class="form-group">
                        <label>الوصف</label>
                        <textarea id="offerDescription" rows="3"></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label>نوع الخصم *</label>
                            <select id="offerDiscountType" required onchange="toggleDiscountType()">
                                <option value="percentage">نسبة مئوية (%)</option>
                                <option value="fixed">مبلغ ثابت (ج.م)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>قيمة الخصم *</label>
                            <input type="number" id="offerDiscountValue" step="0.01" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label>تاريخ البداية *</label>
                            <input type="datetime-local" id="offerStartDate" required>
                        </div>

                        <div class="form-group">
                            <label>تاريخ النهاية *</label>
                            <input type="datetime-local" id="offerEndDate" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>كود الكوبون (اختياري)</label>
                        <input type="text" id="offerCouponCode" placeholder="مثال: SUMMER2024">
                    </div>

                    <div class="form-group">
                        <label>المنتجات</label>
                        <select id="offerProducts" multiple class="h-32">
                            <option value="">جميع المنتجات</option>
                        </select>
                        <small class="text-gray-500">اضغط Ctrl (أو Cmd على Mac) لاختيار عدة منتجات</small>
                    </div>

                    <div class="form-group">
                        <label>الحالة</label>
                        <select id="offerActive">
                            <option value="true">نشط</option>
                            <option value="false">غير نشط</option>
                        </select>
                    </div>

                    <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                        <button type="button" onclick="closeOfferModal()" 
                                class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            إلغاء
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save ml-2"></i>حفظ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to body if not exists
    if (!document.getElementById('offerModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

async function getOffers() {
    const snapshot = await getDocs(query(collection(db, 'offers'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getProducts() {
    const snapshot = await getDocs(collection(db, 'products'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadProductsForSelect(products) {
    const select = document.getElementById('offerProducts');
    if (select && products) {
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            select.appendChild(option);
        });
    }
}

window.openOfferModal = function() {
    addOfferModal(); // Ensure modal exists
    document.getElementById('offerModal').style.display = 'block';
    document.getElementById('offerModalTitle').textContent = 'إنشاء عرض جديد';
    document.getElementById('offerForm').reset();
    document.getElementById('offerId').value = '';
}

window.closeOfferModal = function() {
    const modal = document.getElementById('offerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.toggleDiscountType = function() {
    const type = document.getElementById('offerDiscountType').value;
    const valueInput = document.getElementById('offerDiscountValue');
    if (type === 'percentage') {
        valueInput.max = 100;
        valueInput.placeholder = '0-100';
    } else {
        valueInput.max = null;
        valueInput.placeholder = 'المبلغ بالجنيه';
    }
}

window.editOffer = async function(offerId) {
    try {
        const offerDoc = await getDoc(doc(db, 'offers', offerId));
        if (offerDoc.exists()) {
            const offer = { id: offerId, ...offerDoc.data() };
            
            document.getElementById('offerId').value = offer.id;
            document.getElementById('offerName').value = offer.name || '';
            document.getElementById('offerDescription').value = offer.description || '';
            document.getElementById('offerDiscountType').value = offer.discountType || 'percentage';
            document.getElementById('offerDiscountValue').value = offer.discountValue || '';
            document.getElementById('offerCouponCode').value = offer.couponCode || '';
            document.getElementById('offerActive').value = offer.active ? 'true' : 'false';
            
            // Set dates
            if (offer.startDate) {
                const startDate = offer.startDate.toDate();
                document.getElementById('offerStartDate').value = formatDateTimeLocal(startDate);
            }
            if (offer.endDate) {
                const endDate = offer.endDate.toDate();
                document.getElementById('offerEndDate').value = formatDateTimeLocal(endDate);
            }
            
            // Set products
            if (offer.products && offer.products.length > 0) {
                const select = document.getElementById('offerProducts');
                offer.products.forEach(productId => {
                    const option = Array.from(select.options).find(opt => opt.value === productId);
                    if (option) option.selected = true;
                });
            }
            
            document.getElementById('offerModalTitle').textContent = 'تعديل العرض';
            document.getElementById('offerModal').style.display = 'block';
            
            toggleDiscountType();
        }
    } catch (error) {
        console.error('Error loading offer:', error);
        alert('حدث خطأ أثناء تحميل العرض');
    }
}

window.deleteOffer = async function(offerId) {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    
    try {
        await deleteDoc(doc(db, 'offers', offerId));
        alert('تم حذف العرض بنجاح');
        loadOffers();
    } catch (error) {
        console.error('Error deleting offer:', error);
        alert('حدث خطأ أثناء حذف العرض');
    }
}

window.saveOffer = async function(event) {
    event.preventDefault();
    
    const offerId = document.getElementById('offerId').value;
    const name = document.getElementById('offerName').value;
    const description = document.getElementById('offerDescription').value;
    const discountType = document.getElementById('offerDiscountType').value;
    const discountValue = parseFloat(document.getElementById('offerDiscountValue').value);
    const startDate = new Date(document.getElementById('offerStartDate').value);
    const endDate = new Date(document.getElementById('offerEndDate').value);
    const couponCode = document.getElementById('offerCouponCode').value;
    const active = document.getElementById('offerActive').value === 'true';
    
    const productsSelect = document.getElementById('offerProducts');
    const selectedProducts = Array.from(productsSelect.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== '');
    
    try {
        const offerData = {
            name,
            description,
            discountType,
            discountValue,
            startDate,
            endDate,
            couponCode: couponCode || null,
            products: selectedProducts.length > 0 ? selectedProducts : null,
            active,
            updatedAt: new Date()
        };
        
        if (offerId) {
            await updateDoc(doc(db, 'offers', offerId), offerData);
            alert('تم تحديث العرض بنجاح');
        } else {
            offerData.createdAt = new Date();
            await addDoc(collection(db, 'offers'), offerData);
            alert('تم إنشاء العرض بنجاح');
        }
        
        closeOfferModal();
        loadOffers();
    } catch (error) {
        console.error('Error saving offer:', error);
        alert('حدث خطأ أثناء حفظ العرض');
    }
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

