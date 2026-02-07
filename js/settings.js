import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js';
import { db, storage } from './firebase-config.js';

export async function loadSettings() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const settings = await getSettings();
        
        pageContent.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- General Settings -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">الإعدادات العامة</h2>
                    <form id="generalSettingsForm" onsubmit="saveGeneralSettings(event)">
                        <div class="form-group">
                            <label>اسم المتجر *</label>
                            <input type="text" id="storeName" value="${settings.storeName || ''}" required>
                        </div>

                        <div class="form-group">
                            <label>البريد الإلكتروني</label>
                            <input type="email" id="storeEmail" value="${settings.storeEmail || ''}">
                        </div>

                        <div class="form-group">
                            <label>رقم الهاتف</label>
                            <input type="tel" id="storePhone" value="${settings.storePhone || ''}">
                        </div>

                        <div class="form-group">
                            <label>العنوان</label>
                            <textarea id="storeAddress" rows="3">${settings.storeAddress || ''}</textarea>
                        </div>

                        <div class="form-group">
                            <label>شعار المتجر</label>
                            <input type="file" id="storeLogo" accept="image/*" onchange="previewLogo(event)">
                            <img id="logoPreview" src="${settings.storeLogo || ''}" 
                                 class="mt-3 max-w-xs rounded ${settings.storeLogo ? '' : 'hidden'}">
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <!-- Shipping Settings -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">إعدادات الشحن</h2>
                    <form id="shippingSettingsForm" onsubmit="saveShippingSettings(event)">
                        <div class="form-group">
                            <label>تكلفة الشحن الأساسية (ج.م)</label>
                            <input type="number" id="shippingBaseCost" step="0.01" 
                                   value="${settings.shippingBaseCost || 0}" min="0">
                        </div>

                        <div class="form-group">
                            <label>الشحن المجاني عند الشراء بقيمة (ج.م)</label>
                            <input type="number" id="shippingFreeThreshold" step="0.01" 
                                   value="${settings.shippingFreeThreshold || 0}" min="0">
                            <small class="text-gray-500">اتركه 0 لإلغاء الشحن المجاني</small>
                        </div>

                        <div class="form-group">
                            <label>مدة التوصيل المتوقعة (أيام)</label>
                            <input type="number" id="shippingDays" 
                                   value="${settings.shippingDays || 3}" min="1">
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <!-- Payment Settings -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">إعدادات الدفع</h2>
                    <form id="paymentSettingsForm" onsubmit="savePaymentSettings(event)">
                        <div class="form-group">
                            <label>تفعيل الدفع بالبطاقة</label>
                            <select id="paymentCardEnabled">
                                <option value="true" ${settings.paymentCardEnabled ? 'selected' : ''}>مفعل</option>
                                <option value="false" ${!settings.paymentCardEnabled ? 'selected' : ''}>معطل</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>مفتاح API للدفع الإلكتروني</label>
                            <input type="text" id="paymentApiKey" value="${settings.paymentApiKey || ''}" 
                                   placeholder="أدخل مفتاح API">
                            <small class="text-gray-500">احتفظ بهذا المفتاح سرياً</small>
                        </div>

                        <div class="form-group">
                            <label>تفعيل الدفع عند الاستلام</label>
                            <select id="paymentCashOnDeliveryEnabled">
                                <option value="true" ${settings.paymentCashOnDeliveryEnabled ? 'selected' : ''}>مفعل</option>
                                <option value="false" ${!settings.paymentCashOnDeliveryEnabled ? 'selected' : ''}>معطل</option>
                            </select>
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>

                <!-- Social Media -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">وسائل التواصل</h2>
                    <form id="socialSettingsForm" onsubmit="saveSocialSettings(event)">
                        <div class="form-group">
                            <label>فيسبوك</label>
                            <input type="url" id="socialFacebook" value="${settings.socialFacebook || ''}" 
                                   placeholder="https://facebook.com/...">
                        </div>

                        <div class="form-group">
                            <label>تويتر</label>
                            <input type="url" id="socialTwitter" value="${settings.socialTwitter || ''}" 
                                   placeholder="https://twitter.com/...">
                        </div>

                        <div class="form-group">
                            <label>إنستغرام</label>
                            <input type="url" id="socialInstagram" value="${settings.socialInstagram || ''}" 
                                   placeholder="https://instagram.com/...">
                        </div>

                        <div class="form-group">
                            <label>واتساب</label>
                            <input type="text" id="socialWhatsapp" value="${settings.socialWhatsapp || ''}" 
                                   placeholder="رقم الواتساب">
                        </div>

                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ الإعدادات
                        </button>
                    </form>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading settings:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل الإعدادات</p></div>';
    }
}

async function getSettings() {
    try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (error) {
        console.error('Error getting settings:', error);
    }
    return {};
}

window.previewLogo = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('logoPreview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

window.saveGeneralSettings = async function(event) {
    event.preventDefault();
    
    const storeName = document.getElementById('storeName').value;
    const storeEmail = document.getElementById('storeEmail').value;
    const storePhone = document.getElementById('storePhone').value;
    const storeAddress = document.getElementById('storeAddress').value;
    const logoFile = document.getElementById('storeLogo').files[0];
    
    try {
        let storeLogo = '';
        const currentSettings = await getSettings();
        storeLogo = currentSettings.storeLogo || '';
        
        if (logoFile) {
            const logoPath = `logos/${Date.now()}_${logoFile.name}`;
            const logoRef = ref(storage, logoPath);
            await uploadBytes(logoRef, logoFile);
            storeLogo = await getDownloadURL(logoRef);
        }
        
        const settingsData = {
            storeName,
            storeEmail: storeEmail || null,
            storePhone: storePhone || null,
            storeAddress: storeAddress || null,
            storeLogo,
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ الإعدادات العامة بنجاح');
    } catch (error) {
        console.error('Error saving general settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

window.saveShippingSettings = async function(event) {
    event.preventDefault();
    
    const shippingBaseCost = parseFloat(document.getElementById('shippingBaseCost').value) || 0;
    const shippingFreeThreshold = parseFloat(document.getElementById('shippingFreeThreshold').value) || 0;
    const shippingDays = parseInt(document.getElementById('shippingDays').value) || 3;
    
    try {
        const settingsData = {
            shippingBaseCost,
            shippingFreeThreshold,
            shippingDays,
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ إعدادات الشحن بنجاح');
    } catch (error) {
        console.error('Error saving shipping settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

window.savePaymentSettings = async function(event) {
    event.preventDefault();
    
    const paymentCardEnabled = document.getElementById('paymentCardEnabled').value === 'true';
    const paymentApiKey = document.getElementById('paymentApiKey').value;
    const paymentCashOnDeliveryEnabled = document.getElementById('paymentCashOnDeliveryEnabled').value === 'true';
    
    try {
        const settingsData = {
            paymentCardEnabled,
            paymentApiKey: paymentApiKey || null,
            paymentCashOnDeliveryEnabled,
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ إعدادات الدفع بنجاح');
    } catch (error) {
        console.error('Error saving payment settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

window.saveSocialSettings = async function(event) {
    event.preventDefault();
    
    const socialFacebook = document.getElementById('socialFacebook').value;
    const socialTwitter = document.getElementById('socialTwitter').value;
    const socialInstagram = document.getElementById('socialInstagram').value;
    const socialWhatsapp = document.getElementById('socialWhatsapp').value;
    
    try {
        const settingsData = {
            socialFacebook: socialFacebook || null,
            socialTwitter: socialTwitter || null,
            socialInstagram: socialInstagram || null,
            socialWhatsapp: socialWhatsapp || null,
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'settings', 'general'), settingsData, { merge: true });
        alert('تم حفظ إعدادات وسائل التواصل بنجاح');
    } catch (error) {
        console.error('Error saving social settings:', error);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
}

