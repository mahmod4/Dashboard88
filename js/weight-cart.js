// ================================
// إدارة السلة مع دعم الوزن
// ================================

// متغيرات السلة
let cart = [];

// تحميل السلة من localStorage
function loadCart() {
    try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    } catch (error) {
        console.warn('خطأ في تحميل السلة:', error);
        cart = [];
    }
}

// حفظ السلة في localStorage
function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
    } catch (error) {
        console.warn('خطأ في حفظ السلة:', error);
    }
}

// إضافة منتج للسلة
function addToCart(product, quantity = 1, weight = null) {
    try {
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            if (weight !== null) {
                existingItem.weight = (existingItem.weight || 0) + weight;
            } else {
                existingItem.quantity = (existingItem.quantity || 0) + quantity;
            }
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: weight === null ? quantity : 0,
                weight: weight,
                unit: product.unit || 'قطعة',
                soldByWeight: product.soldByWeight || false
            });
        }
        
        saveCart();
        showNotification('تم إضافة المنتج للسلة', 'success');
        
    } catch (error) {
        console.error('خطأ في إضافة المنتج للسلة:', error);
        showNotification('خطأ في إضافة المنتج', 'error');
    }
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    try {
        cart = cart.filter(item => item.id !== productId);
        saveCart();
        showNotification('تم إزالة المنتج من السلة', 'success');
    } catch (error) {
        console.error('خطأ في إزالة المنتج:', error);
    }
}

// تحديث كمية المنتج في السلة
function updateCartItemQuantity(productId, quantity) {
    try {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(0, quantity);
            if (item.quantity === 0) {
                removeFromCart(productId);
            } else {
                saveCart();
            }
        }
    } catch (error) {
        console.error('خطأ في تحديث الكمية:', error);
    }
}

// تحديث وزن المنتج في السلة
function updateCartItemWeight(productId, weight) {
    try {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.weight = Math.max(0, weight);
            if (item.weight === 0) {
                removeFromCart(productId);
            } else {
                saveCart();
            }
        }
    } catch (error) {
        console.error('خطأ في تحديث الوزن:', error);
    }
}

// حساب الإجمالي
function calculateTotal() {
    try {
        return cart.reduce((total, item) => {
            if (item.soldByWeight && item.weight) {
                return total + (item.price * item.weight);
            } else {
                return total + (item.price * item.quantity);
            }
        }, 0);
    } catch (error) {
        console.error('خطأ في حساب الإجمالي:', error);
        return 0;
    }
}

// تحديث واجهة السلة
function updateCartUI() {
    try {
        const cartCount = document.getElementById('cart-count');
        const cartItems = document.getElementById('cart-items');
        const totalPrice = document.getElementById('total-price');
        
        // تحديث عداد السلة
        if (cartCount) {
            const totalItems = cart.reduce((count, item) => {
                return count + (item.soldByWeight ? 1 : item.quantity);
            }, 0);
            cartCount.textContent = totalItems;
        }
        
        // تحديث قائمة السلة
        if (cartItems) {
            if (cart.length === 0) {
                cartItems.innerHTML = '<p class="text-center">السلة فارغة</p>';
            } else {
                cartItems.innerHTML = cart.map(item => `
                    <div class="cart-item">
                        <img src="${item.image || '../images/default-logo.png'}" alt="${item.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <p class="price">${item.price} ${item.unit === 'كجم' ? 'ج.م/كجم' : 'ج.م'}</p>
                            ${item.soldByWeight ? `
                                <div class="weight-control">
                                    <input type="number" 
                                           value="${item.weight || 0}" 
                                           step="0.1" 
                                           min="0" 
                                           onchange="updateCartItemWeight('${item.id}', parseFloat(this.value))">
                                    <span>كجم</span>
                                </div>
                            ` : `
                                <div class="quantity-control">
                                    <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity - 1})">-</button>
                                    <span>${item.quantity}</span>
                                    <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1})">+</button>
                                </div>
                            `}
                        </div>
                        <button class="remove-btn" onclick="removeFromCart('${item.id}')">×</button>
                    </div>
                `).join('');
            }
        }
        
        // تحديث الإجمالي
        if (totalPrice) {
            totalPrice.textContent = calculateTotal().toFixed(2) + ' ج.م';
        }
        
    } catch (error) {
        console.error('خطأ في تحديث واجهة السلة:', error);
    }
}

// إظهار الإشعارات
function showNotification(message, type = 'info') {
    try {
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

// تهيئة السلة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    updateCartUI();
});

// تصدير الدوال
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.updateCartItemWeight = updateCartItemWeight;
window.calculateTotal = calculateTotal;
