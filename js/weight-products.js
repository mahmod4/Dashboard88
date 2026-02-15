// ================================
// إدارة المنتجات مع دعم الوزن
// ================================

// انتظار جاهزية Firebase
function waitForFirebase(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function checkFirebase() {
            if (window.firebase && window.firebaseFirestore) {
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Firebase لم يصبح جاهزاً في الوقت المحدد'));
            } else {
                setTimeout(checkFirebase, 100);
            }
        }
        
        checkFirebase();
    });
}

// جلب المنتجات من Firestore
async function fetchWeightProductsFromFirestore() {
    try {
        await waitForFirebase();
        
        const colRef = window.firebaseFirestore.collection(window.firebase.db, 'products');
        const snap = await window.firebaseFirestore.getDocs(colRef);
        
        const products = snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                price: data.price || 0,
                image: data.image || '../images/default-logo.png',
                description: data.description || '',
                category: data.category || '',
                unit: data.unit || 'قطعة',
                soldByWeight: data.soldByWeight || data.hasWeightOptions || false,
                stock: data.stock || 0,
                isActive: data.isActive !== false
            };
        }).filter(product => product.isActive && product.name);
        
        console.log(`✅ تم تحميل ${products.length} منتج من Firestore`);
        return products;
        
    } catch (error) {
        console.warn('⚠️ خطأ في جلب المنتجات من Firestore:', error);
        return [];
    }
}

// عرض المنتجات في الواجهة
function displayWeightProducts(products) {
    try {
        const container = document.getElementById('product-container');
        if (!container) return;
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <h3>لا توجد منتجات حالياً</h3>
                    <p>يرجى التحقق لاحقاً</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="product-card" data-category="${product.category}" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" 
                         onerror="this.src='../images/default-logo.png'">
                    ${product.soldByWeight ? '<span class="weight-badge">بالوزن</span>' : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="description">${product.description}</p>
                    <div class="price-info">
                        <span class="price">${product.price}</span>
                        <span class="unit">${product.unit === 'كجم' ? 'ج.م/كجم' : 'ج.م'}</span>
                    </div>
                    ${product.stock <= 10 ? '<p class="low-stock">مخزون محدود</p>' : ''}
                </div>
                <div class="product-actions">
                    ${product.soldByWeight ? `
                        <div class="weight-input-group">
                            <input type="number" 
                                   id="weight-${product.id}" 
                                   placeholder="الوزن بالكجم" 
                                   step="0.1" 
                                   min="0.1">
                            <button onclick="addWeightProductToCart('${product.id}')">
                                <i class="fas fa-cart-plus"></i>
                                أضف للسلة
                            </button>
                        </div>
                    ` : `
                        <div class="quantity-input-group">
                            <input type="number" 
                                   id="quantity-${product.id}" 
                                   placeholder="الكمية" 
                                   min="1" 
                                   value="1">
                            <button onclick="addProductToCart('${product.id}')">
                                <i class="fas fa-cart-plus"></i>
                                أضف للسلة
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('خطأ في عرض المنتجات:', error);
    }
}

// إضافة منتج بالوزن للسلة
function addWeightProductToCart(productId) {
    try {
        const weightInput = document.getElementById(`weight-${productId}`);
        const weight = parseFloat(weightInput.value);
        
        if (!weight || weight <= 0) {
            showNotification('يرجى إدخال وزن صحيح', 'error');
            return;
        }
        
        // البحث عن المنتج في القائمة المعروضة
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (!productCard) {
            showNotification('المنتج غير موجود', 'error');
            return;
        }
        
        const product = {
            id: productId,
            name: productCard.querySelector('h3').textContent,
            price: parseFloat(productCard.querySelector('.price').textContent),
            image: productCard.querySelector('img').src,
            unit: 'كجم',
            soldByWeight: true
        };
        
        // استدعاء دالة إضافة للسلة من ملف weight-cart.js
        if (window.addToCart) {
            window.addToCart(product, 0, weight);
            weightInput.value = '';
        } else {
            console.error('دالة addToCart غير موجودة');
        }
        
    } catch (error) {
        console.error('خطأ في إضافة المنتج بالوزن:', error);
        showNotification('خطأ في إضافة المنتج', 'error');
    }
}

// إضافة منتج عادي للسلة
function addProductToCart(productId) {
    try {
        const quantityInput = document.getElementById(`quantity-${productId}`);
        const quantity = parseInt(quantityInput.value) || 1;
        
        // البحث عن المنتج في القائمة المعروضة
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (!productCard) {
            showNotification('المنتج غير موجود', 'error');
            return;
        }
        
        const product = {
            id: productId,
            name: productCard.querySelector('h3').textContent,
            price: parseFloat(productCard.querySelector('.price').textContent),
            image: productCard.querySelector('img').src,
            unit: 'قطعة',
            soldByWeight: false
        };
        
        // استدعاء دالة إضافة للسلة من ملف weight-cart.js
        if (window.addToCart) {
            window.addToCart(product, quantity, null);
            quantityInput.value = '1';
        } else {
            console.error('دالة addToCart غير موجودة');
        }
        
    } catch (error) {
        console.error('خطأ في إضافة المنتج:', error);
        showNotification('خطأ في إضافة المنتج', 'error');
    }
}

// تحميل المنتجات وعرضها
async function loadWeightProducts() {
    try {
        showLoading(true);
        const products = await fetchWeightProductsFromFirestore();
        displayWeightProducts(products);
    } catch (error) {
        console.error('خطأ في تحميل المنتجات:', error);
        showNotification('خطأ في تحميل المنتجات', 'error');
    } finally {
        showLoading(false);
    }
}

// إظهار/إخفاء حالة التحميل
function showLoading(show) {
    try {
        const container = document.getElementById('product-container');
        if (!container) return;
        
        if (show) {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p>جاري تحميل المنتجات...</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('خطأ في عرض حالة التحميل:', error);
    }
}

// إظهار الإشعارات
function showNotification(message, type = 'info') {
    try {
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
    } catch (error) {
        console.error('خطأ في إظهار الإشعار:', error);
    }
}

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تأخير تحميل المنتجات لضمان جاهزية Firebase
    setTimeout(loadWeightProducts, 3000);
});

// تصدير الدوال
window.addWeightProductToCart = addWeightProductToCart;
window.addProductToCart = addProductToCart;
window.loadWeightProducts = loadWeightProducts;
