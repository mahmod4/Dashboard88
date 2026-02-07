import { doc, getDoc, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js';
import { db, storage } from './firebase-config.js';

export async function loadContent() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const content = await getContent();
        
        pageContent.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Banner Management -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">إدارة البانر</h2>
                    <form id="bannerForm" onsubmit="saveBanner(event)">
                        <div class="form-group">
                            <label>صورة البانر</label>
                            <input type="file" id="bannerImage" accept="image/*" onchange="previewBannerImage(event)">
                            <img id="bannerPreview" src="${content.bannerImage || ''}" 
                                 class="mt-3 max-w-full rounded ${content.bannerImage ? '' : 'hidden'}">
                        </div>
                        <div class="form-group">
                            <label>رابط البانر (اختياري)</label>
                            <input type="url" id="bannerLink" value="${content.bannerLink || ''}">
                        </div>
                        <div class="form-group">
                            <label>النص على البانر (اختياري)</label>
                            <input type="text" id="bannerText" value="${content.bannerText || ''}">
                        </div>
                        <button type="submit" class="btn-primary w-full">
                            <i class="fas fa-save ml-2"></i>حفظ البانر
                        </button>
                    </form>
                </div>

                <!-- Static Pages -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-4">الصفحات الثابتة</h2>
                    <div class="space-y-3">
                        <button onclick="openPageModal('privacy')" class="btn-primary w-full text-right">
                            <i class="fas fa-shield-alt ml-2"></i>سياسة الخصوصية
                        </button>
                        <button onclick="openPageModal('terms')" class="btn-primary w-full text-right">
                            <i class="fas fa-file-contract ml-2"></i>الشروط والأحكام
                        </button>
                        <button onclick="openPageModal('about')" class="btn-primary w-full text-right">
                            <i class="fas fa-info-circle ml-2"></i>من نحن
                        </button>
                    </div>
                </div>
            </div>

            <!-- Page Content Modal -->
            <div id="pageModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closePageModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6" id="pageModalTitle">تعديل الصفحة</h2>
                    <form id="pageForm" onsubmit="savePageContent(event)">
                        <input type="hidden" id="pageType">
                        <div class="form-group">
                            <label>عنوان الصفحة *</label>
                            <input type="text" id="pageTitle" required>
                        </div>
                        <div class="form-group">
                            <label>محتوى الصفحة *</label>
                            <textarea id="pageContent" rows="15" required class="font-normal"></textarea>
                            <small class="text-gray-500">يمكنك استخدام HTML للتنسيق</small>
                        </div>
                        <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                            <button type="button" onclick="closePageModal()" 
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
    } catch (error) {
        console.error('Error loading content:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل المحتوى</p></div>';
    }
}

async function getContent() {
    try {
        const docRef = doc(db, 'content', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (error) {
        console.error('Error getting content:', error);
    }
    return {
        bannerImage: '',
        bannerLink: '',
        bannerText: '',
        privacyPolicy: { title: 'سياسة الخصوصية', content: '' },
        termsAndConditions: { title: 'الشروط والأحكام', content: '' },
        aboutUs: { title: 'من نحن', content: '' }
    };
}

window.previewBannerImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('bannerPreview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

window.saveBanner = async function(event) {
    event.preventDefault();
    
    const bannerLink = document.getElementById('bannerLink').value;
    const bannerText = document.getElementById('bannerText').value;
    const imageFile = document.getElementById('bannerImage').files[0];
    
    try {
        let bannerImage = '';
        
        // Get current banner image
        const content = await getContent();
        bannerImage = content.bannerImage || '';
        
        // Upload new image if selected
        if (imageFile) {
            const imagePath = `banners/${Date.now()}_${imageFile.name}`;
            const imageRef = ref(storage, imagePath);
            
            // Delete old image if exists
            if (content.bannerImagePath) {
                try {
                    await deleteObject(ref(storage, content.bannerImagePath));
                } catch (error) {
                    console.error('Error deleting old banner:', error);
                }
            }
            
            await uploadBytes(imageRef, imageFile);
            bannerImage = await getDownloadURL(imageRef);
            
            const bannerData = {
                bannerImage,
                bannerImagePath: imagePath,
                bannerLink: bannerLink || null,
                bannerText: bannerText || null,
                updatedAt: new Date()
            };
            
            await setDoc(doc(db, 'content', 'main'), bannerData, { merge: true });
        } else {
            // Just update link and text
            const bannerData = {
                bannerLink: bannerLink || null,
                bannerText: bannerText || null,
                updatedAt: new Date()
            };
            
            await setDoc(doc(db, 'content', 'main'), bannerData, { merge: true });
        }
        
        alert('تم حفظ البانر بنجاح');
        loadContent();
    } catch (error) {
        console.error('Error saving banner:', error);
        alert('حدث خطأ أثناء حفظ البانر');
    }
}

window.openPageModal = async function(pageType) {
    const pageNames = {
        'privacy': 'سياسة الخصوصية',
        'terms': 'الشروط والأحكام',
        'about': 'من نحن'
    };
    
    document.getElementById('pageModalTitle').textContent = `تعديل ${pageNames[pageType]}`;
    document.getElementById('pageType').value = pageType;
    
    try {
        const content = await getContent();
        const pageData = content[pageType === 'privacy' ? 'privacyPolicy' : 
                            pageType === 'terms' ? 'termsAndConditions' : 'aboutUs'] || 
                        { title: pageNames[pageType], content: '' };
        
        document.getElementById('pageTitle').value = pageData.title || pageNames[pageType];
        document.getElementById('pageContent').value = pageData.content || '';
        
        document.getElementById('pageModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading page content:', error);
        alert('حدث خطأ أثناء تحميل المحتوى');
    }
}

window.closePageModal = function() {
    document.getElementById('pageModal').style.display = 'none';
}

window.savePageContent = async function(event) {
    event.preventDefault();
    
    const pageType = document.getElementById('pageType').value;
    const title = document.getElementById('pageTitle').value;
    const content = document.getElementById('pageContent').value;
    
    try {
        const contentRef = doc(db, 'content', 'main');
        const currentContent = await getContent();
        
        const fieldName = pageType === 'privacy' ? 'privacyPolicy' : 
                         pageType === 'terms' ? 'termsAndConditions' : 'aboutUs';
        
        const updateData = {
            [fieldName]: {
                title,
                content,
                updatedAt: new Date()
            },
            updatedAt: new Date()
        };
        
        await setDoc(contentRef, updateData, { merge: true });
        
        alert('تم حفظ المحتوى بنجاح');
        closePageModal();
    } catch (error) {
        console.error('Error saving page content:', error);
        alert('حدث خطأ أثناء حفظ المحتوى');
    }
}

