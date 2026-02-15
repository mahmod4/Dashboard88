// ================================
// مزامنة الإعدادات مع المتجر
// ================================

// انتظار جاهزية Firebase مع تحسين الأداء
function waitForFirebase(timeout = 15000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function checkFirebase() {
            if (window.firebase && window.firebaseFirestore && window.firebase.auth) {
                console.log('✅ Firebase أصبح جاهزاً');
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                console.warn('⏰ Firebase لم يصبح جاهزاً في الوقت المحدد، استخدام الإعدادات المحلية');
                resolve(false); // نرجع false بدلاً من reject للتعامل معه بشكل أفضل
            } else {
                setTimeout(checkFirebase, 200); // تحقق كل 200ms بدلاً من 100ms
            }
        }
        
        checkFirebase();
    });
}

// جلب الإعدادات من Firestore
async function fetchSettingsFromFirestore() {
    try {
        const isReady = await waitForFirebase();
        if (!isReady) {
            console.warn('⚠️ Firebase ليس جاهزاً، استخدام الإعدادات المحلية');
            return {};
        }
        
        const docRef = window.firebaseFirestore.doc(window.firebase.db, 'settings', 'store');
        const docSnap = await window.firebaseFirestore.getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log('✅ تم جلب الإعدادات من Firestore');
            return docSnap.data();
        } else {
            console.log('ℹ️ لا توجد إعدادات محفوظة، استخدام الإعدادات الافتراضية');
            return {};
        }
    } catch (error) {
        console.warn('⚠️ خطأ في جلب الإعدادات من Firestore:', error);
        return {};
    }
}

// تطبيق الإعدادات على واجهة المتجر
async function syncStoreSettings() {
    try {
        const settings = await fetchSettingsFromFirestore();
        
        // تحديث اسم المتجر
        if (settings.storeName) {
            document.querySelectorAll('[data-store-name]').forEach(el => {
                el.textContent = settings.storeName;
            });
        }
        
        // تحديث الشعار
        if (settings.storeLogo) {
            document.querySelectorAll('[data-store-logo]').forEach(el => {
                el.src = settings.storeLogo;
                el.alt = settings.storeName || 'المتجر';
            });
        }
        
        // تحديث favicon
        if (settings.storeLogo) {
            document.querySelectorAll('[data-store-favicon]').forEach(el => {
                el.href = settings.storeLogo;
            });
        }
        
        // تحديث معلومات المتجر الأخرى
        if (settings.storePhone) {
            // تحديث روابط الواتساب
            document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(el => {
                const baseUrl = el.href.split('?')[0];
                el.href = `${baseUrl}?phone=${settings.storePhone.replace(/[^\d]/g, '')}&text=مرحباً من المتجر`;
            });
        }
        
        console.log('✅ تم مزامنة الإعدادات بنجاح');
        
    } catch (error) {
        console.warn('⚠️ خطأ في مزامنة الإعدادات:', error);
    }
}

// تهيئة المزامنة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تأخير المزامنة لضمان جاهزية كل العناصر
    setTimeout(syncStoreSettings, 2000);
});

// تصدير الدوال
window.syncStoreSettings = syncStoreSettings;
window.fetchSettingsFromFirestore = fetchSettingsFromFirestore;
