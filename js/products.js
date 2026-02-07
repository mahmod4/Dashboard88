import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js';
import { db, storage } from './firebase-config.js';

export async function loadProducts() {
    const pageContent = document.getElementById('pageContent');
    
    try {
        const products = await getProducts();
        
        pageContent.innerHTML = `
            <div class="card mb-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">المنتجات</h2>
                    <div class="flex space-x-2 space-x-reverse">
                        <button onclick="openImportModal()" class="btn-success">
                            <i class="fas fa-file-import ml-2"></i>استيراد منتجات
                        </button>
                        <button onclick="openProductModal()" class="btn-primary">
                            <i class="fas fa-plus ml-2"></i>إضافة منتج جديد
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="overflow-x-auto">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>الصورة</th>
                                <th>الاسم</th>
                                <th>القسم</th>
                                <th>السعر</th>
                                <th>السعر بعد الخصم</th>
                                <th>المخزون</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="productsTable">
                            ${products.map(product => `
                                <tr>
                                    <td>
                                        <img src="${product.image || 'https://via.placeholder.com/50'}" 
                                             alt="${product.name}" 
                                             class="w-12 h-12 object-cover rounded">
                                    </td>
                                    <td>${product.name}</td>
                                    <td>${product.category || 'غير محدد'}</td>
                                    <td>${product.price?.toFixed(2) || 0} ج.م</td>
                                    <td>${product.discountPrice ? product.discountPrice.toFixed(2) + ' ج.م' : '-'}</td>
                                    <td>${product.stock || 0}</td>
                                    <td>
                                        <span class="badge badge-${product.available ? 'success' : 'danger'}">
                                            ${product.available ? 'متوفر' : 'غير متوفر'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onclick="editProduct('${product.id}')" 
                                                class="btn-primary text-sm py-1 px-3 ml-2">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="deleteProduct('${product.id}')" 
                                                class="btn-danger text-sm py-1 px-3">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Import Products Modal -->
            <div id="importModal" class="modal">
                <div class="modal-content" style="max-width: 700px;">
                    <span class="close" onclick="closeImportModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6">استيراد منتجات من ملف</h2>
                    <div class="mb-4 p-4 bg-blue-50 border-r-4 border-blue-500 rounded">
                        <h3 class="font-bold mb-2">📋 تنسيق الملف المطلوب:</h3>
                        <p class="text-sm mb-2">الملف يجب أن يكون CSV (فاصلة أو فاصلة منقوطة)</p>
                        <p class="text-sm mb-2"><strong>الأعمدة المطلوبة:</strong></p>
                        <ul class="text-sm list-disc list-inside space-y-1">
                            <li><code>name</code> - اسم المنتج (مطلوب)</li>
                            <li><code>price</code> - السعر (مطلوب)</li>
                            <li><code>description</code> - الوصف (اختياري)</li>
                            <li><code>stock</code> - المخزون (افتراضي: 0)</li>
                            <li><code>category</code> - اسم القسم (اختياري)</li>
                            <li><code>available</code> - متوفر (true/false، افتراضي: true)</li>
                            <li><code>discountPrice</code> - السعر بعد الخصم (اختياري)</li>
                        </ul>
                        <p class="text-sm mt-2"><strong>مثال:</strong></p>
                        <pre class="text-xs bg-white p-2 rounded mt-2 overflow-x-auto">name,price,description,stock,category,available
منتج 1,100.00,وصف المنتج,50,إلكترونيات,true
منتج 2,200.00,وصف آخر,30,ملابس,true</pre>
                    </div>
                    <form id="importForm" onsubmit="importProducts(event)">
                        <div class="form-group">
                            <label>اختر ملف CSV *</label>
                            <input type="file" id="importFile" accept=".csv,.txt" required>
                            <small class="text-gray-500">الملفات المدعومة: CSV, TXT</small>
                        </div>
                        <div class="form-group">
                            <label>فاصل الأعمدة</label>
                            <select id="importDelimiter">
                                <option value=",">فاصلة (,)</option>
                                <option value=";">فاصلة منقوطة (;)</option>
                                <option value="\t">Tab</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="importSkipHeader" checked>
                                تخطي السطر الأول (رأس الجدول)
                            </label>
                        </div>
                        <div id="importPreview" class="hidden mb-4">
                            <h3 class="font-bold mb-2">معاينة البيانات:</h3>
                            <div class="max-h-48 overflow-auto border rounded p-2 bg-gray-50">
                                <table class="table text-sm" id="previewTable"></table>
                            </div>
                            <p class="text-sm mt-2" id="previewCount"></p>
                        </div>
                        <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                            <button type="button" onclick="closeImportModal()" 
                                    class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                إلغاء
                            </button>
                            <button type="submit" class="btn-primary" id="importBtn">
                                <i class="fas fa-file-import ml-2"></i>استيراد المنتجات
                            </button>
                        </div>
                    </form>
                    <div id="importProgress" class="hidden mt-4">
                        <div class="bg-blue-50 p-4 rounded">
                            <p class="font-semibold mb-2">جاري الاستيراد...</p>
                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                <div id="importProgressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                            </div>
                            <p id="importStatus" class="text-sm mt-2"></p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Product Modal -->
            <div id="productModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeProductModal()">&times;</span>
                    <h2 class="text-2xl font-bold mb-6" id="modalTitle">إضافة منتج جديد</h2>
                    <form id="productForm" onsubmit="saveProduct(event)">
                        <input type="hidden" id="productId">
                        
                        <div class="form-group">
                            <label>اسم المنتج *</label>
                            <input type="text" id="productName" required>
                        </div>

                        <div class="form-group">
                            <label>الوصف</label>
                            <textarea id="productDescription" rows="4"></textarea>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label>السعر (ج.م) *</label>
                                <input type="number" id="productPrice" step="0.01" required>
                            </div>

                            <div class="form-group">
                                <label>السعر بعد الخصم (ج.م)</label>
                                <input type="number" id="productDiscountPrice" step="0.01">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label>القسم</label>
                                <select id="productCategory">
                                    <option value="">اختر القسم</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>المخزون</label>
                                <input type="number" id="productStock" min="0" value="0">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>الحالة</label>
                            <select id="productAvailable">
                                <option value="true">متوفر</option>
                                <option value="false">غير متوفر</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>صورة المنتج</label>
                            <input type="file" id="productImage" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onchange="previewImage(event)">
                            <small class="text-gray-500">الأنواع المدعومة: JPG, PNG, GIF, WebP (حد أقصى 5MB)</small>
                            <div id="imageUploadProgress" class="hidden mt-2">
                                <div class="w-full bg-gray-200 rounded-full h-2.5">
                                    <div id="imageProgressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                                </div>
                                <p id="imageProgressText" class="text-sm mt-1"></p>
                            </div>
                            <img id="imagePreview" class="mt-3 max-w-xs hidden rounded">
                        </div>

                        <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                            <button type="button" onclick="closeProductModal()" 
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

        // Load categories
        await loadCategoriesForSelect();
    } catch (error) {
        console.error('Error loading products:', error);
        pageContent.innerHTML = '<div class="card"><p class="text-red-600">حدث خطأ أثناء تحميل المنتجات</p></div>';
    }
}

async function getProducts() {
    const snapshot = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadCategoriesForSelect() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const select = document.getElementById('productCategory');
        if (select) {
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

window.openProductModal = function() {
    document.getElementById('productModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
}

window.closeProductModal = function() {
    document.getElementById('productModal').style.display = 'none';
}

window.previewImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

window.editProduct = async function(productId) {
    try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
            const product = { id: productDoc.id, ...productDoc.data() };
            
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productDiscountPrice').value = product.discountPrice || '';
            document.getElementById('productCategory').value = product.categoryId || '';
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productAvailable').value = product.available ? 'true' : 'false';
            
            if (product.image) {
                const preview = document.getElementById('imagePreview');
                preview.src = product.image;
                preview.classList.remove('hidden');
            }
            
            document.getElementById('modalTitle').textContent = 'تعديل المنتج';
            document.getElementById('productModal').style.display = 'block';
            
            await loadCategoriesForSelect();
        }
    } catch (error) {
        console.error('Error loading product:', error);
        alert('حدث خطأ أثناء تحميل المنتج');
    }
}

window.deleteProduct = async function(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    try {
        // Delete image from storage if exists
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
            const product = productDoc.data();
            if (product.imagePath) {
                try {
                    await deleteObject(ref(storage, product.imagePath));
                } catch (error) {
                    console.error('Error deleting image:', error);
                }
            }
        }
        
        await deleteDoc(doc(db, 'products', productId));
        alert('تم حذف المنتج بنجاح');
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('حدث خطأ أثناء حذف المنتج');
    }
}

// Import Products Functions
window.openImportModal = function() {
    document.getElementById('importModal').style.display = 'block';
    document.getElementById('importForm').reset();
    document.getElementById('importPreview').classList.add('hidden');
    document.getElementById('importProgress').classList.add('hidden');
    
    // Add event listener for file preview
    const importFileInput = document.getElementById('importFile');
    if (importFileInput) {
        // Remove old listener if exists
        importFileInput.removeEventListener('change', window.previewImportFile);
        // Add new listener
        importFileInput.addEventListener('change', window.previewImportFile);
    }
}

window.closeImportModal = function() {
    document.getElementById('importModal').style.display = 'none';
}

window.previewImportFile = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const delimiter = document.getElementById('importDelimiter').value;
    const skipHeader = document.getElementById('importSkipHeader').checked;
    
    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            alert('الملف فارغ');
            return;
        }
        
        const startIndex = skipHeader ? 1 : 0;
        const previewLines = lines.slice(startIndex, Math.min(startIndex + 10, lines.length));
        
        // Parse CSV
        const rows = previewLines.map(line => {
            const cols = line.split(delimiter).map(col => col.trim().replace(/^"|"$/g, ''));
            return cols;
        });
        
        if (rows.length === 0) {
            alert('لا توجد بيانات في الملف');
            return;
        }
        
        // Show preview
        const previewTable = document.getElementById('previewTable');
        previewTable.innerHTML = '';
        
        // Header
        const headerRow = document.createElement('tr');
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        previewTable.appendChild(headerRow);
        
        // Data rows
        rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell || '-';
                tr.appendChild(td);
            });
            previewTable.appendChild(tr);
        });
        
        document.getElementById('previewCount').textContent = 
            `سيتم استيراد ${lines.length - startIndex} منتج (يعرض أول 10 صفوف)`;
        document.getElementById('importPreview').classList.remove('hidden');
    } catch (error) {
        console.error('Error previewing file:', error);
        alert('حدث خطأ أثناء قراءة الملف');
    }
}

window.importProducts = async function(event) {
    event.preventDefault();
    
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        alert('يرجى اختيار ملف');
        return;
    }
    
    const delimiter = document.getElementById('importDelimiter').value;
    const skipHeader = document.getElementById('importSkipHeader').checked;
    const importBtn = document.getElementById('importBtn');
    const progressDiv = document.getElementById('importProgress');
    const progressBar = document.getElementById('importProgressBar');
    const statusText = document.getElementById('importStatus');
    
    // Show progress
    progressDiv.classList.remove('hidden');
    importBtn.disabled = true;
    importBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i>جاري الاستيراد...';
    
    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('الملف فارغ');
        }
        
        const startIndex = skipHeader ? 1 : 0;
        const dataLines = lines.slice(startIndex);
        
        if (dataLines.length === 0) {
            throw new Error('لا توجد بيانات للاستيراد');
        }
        
        // Get headers
        const headerLine = skipHeader ? lines[0] : null;
        const headers = headerLine ? 
            headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/^"|"$/g, '')) : 
            ['name', 'price', 'description', 'stock', 'category', 'available', 'discountprice'];
        
        // Get categories for mapping
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat.id]));
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Process each line
        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            const cols = line.split(delimiter).map(col => col.trim().replace(/^"|"$/g, ''));
            
            try {
                // Map columns to data
                const productData = {};
                
                headers.forEach((header, index) => {
                    const value = cols[index] || '';
                    
                    switch(header) {
                        case 'name':
                            productData.name = value;
                            break;
                        case 'price':
                            productData.price = parseFloat(value) || 0;
                            break;
                        case 'description':
                            productData.description = value;
                            break;
                        case 'stock':
                            productData.stock = parseInt(value) || 0;
                            break;
                        case 'category':
                            if (value) {
                                const categoryId = categoryMap.get(value.toLowerCase());
                                if (categoryId) {
                                    productData.categoryId = categoryId;
                                } else {
                                    // Try to find by partial match
                                    const found = categories.find(cat => 
                                        cat.name.toLowerCase().includes(value.toLowerCase()) ||
                                        value.toLowerCase().includes(cat.name.toLowerCase())
                                    );
                                    if (found) {
                                        productData.categoryId = found.id;
                                    }
                                }
                            }
                            break;
                        case 'available':
                            productData.available = value.toLowerCase() === 'true' || value === '1' || value === '';
                            break;
                        case 'discountprice':
                            if (value) {
                                productData.discountPrice = parseFloat(value);
                            }
                            break;
                    }
                });
                
                // Validate required fields
                if (!productData.name || !productData.price) {
                    throw new Error('اسم المنتج والسعر مطلوبان');
                }
                
                // Set defaults
                productData.stock = productData.stock || 0;
                productData.available = productData.available !== undefined ? productData.available : true;
                productData.createdAt = new Date();
                productData.updatedAt = new Date();
                
                // Add to Firestore
                await addDoc(collection(db, 'products'), productData);
                successCount++;
                
            } catch (error) {
                errorCount++;
                errors.push(`السطر ${i + 1 + startIndex}: ${error.message || 'خطأ غير معروف'}`);
            }
            
            // Update progress
            const progress = ((i + 1) / dataLines.length) * 100;
            progressBar.style.width = progress + '%';
            statusText.textContent = `تم معالجة ${i + 1} من ${dataLines.length} منتج`;
        }
        
        // Show results
        let message = `تم استيراد ${successCount} منتج بنجاح`;
        if (errorCount > 0) {
            message += `\nفشل استيراد ${errorCount} منتج`;
            console.error('Import errors:', errors);
        }
        
        alert(message);
        
        // Reset
        closeImportModal();
        loadProducts();
        
    } catch (error) {
        console.error('Error importing products:', error);
        alert(`حدث خطأ أثناء الاستيراد: ${error.message || 'خطأ غير معروف'}`);
    } finally {
        importBtn.disabled = false;
        importBtn.innerHTML = '<i class="fas fa-file-import ml-2"></i>استيراد المنتجات';
        progressDiv.classList.add('hidden');
    }
}


window.saveProduct = async function(event) {
    event.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDescription').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const discountPrice = document.getElementById('productDiscountPrice').value ? 
                         parseFloat(document.getElementById('productDiscountPrice').value) : null;
    const categoryId = document.getElementById('productCategory').value;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const available = document.getElementById('productAvailable').value === 'true';
    const imageFile = document.getElementById('productImage').files[0];
    
    try {
        let imageUrl = '';
        let imagePath = '';
        
        // Upload image if new file selected
        if (imageFile) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(imageFile.type)) {
                throw new Error('نوع الملف غير مدعوم. يرجى اختيار صورة (JPG, PNG, GIF, WebP)');
            }
            
            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (imageFile.size > maxSize) {
                throw new Error('حجم الصورة كبير جداً. الحد الأقصى 5MB');
            }
            
            try {
                imagePath = `products/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const imageRef = ref(storage, imagePath);
                
                // Show upload progress
                console.log('بدء رفع الصورة:', imageFile.name);
                
                await uploadBytes(imageRef, imageFile);
                console.log('تم رفع الصورة بنجاح');
                
                imageUrl = await getDownloadURL(imageRef);
                console.log('تم الحصول على رابط الصورة:', imageUrl);
            } catch (uploadError) {
                console.error('خطأ في رفع الصورة:', uploadError);
                throw new Error(`فشل رفع الصورة: ${uploadError.message || 'تحقق من قواعد Storage'}`);
            }
        } else if (productId) {
            // Keep existing image if editing and no new image
            const productDoc = await getDoc(doc(db, 'products', productId));
            if (productDoc.exists()) {
                imageUrl = productDoc.data().image || '';
                imagePath = productDoc.data().imagePath || '';
            }
        }
        
        const productData = {
            name,
            description,
            price,
            discountPrice,
            categoryId,
            stock,
            available,
            image: imageUrl,
            imagePath: imagePath,
            updatedAt: new Date()
        };
        
        if (productId) {
            // Update existing product
            await updateDoc(doc(db, 'products', productId), productData);
            alert('تم تحديث المنتج بنجاح');
        } else {
            // Add new product
            productData.createdAt = new Date();
            await addDoc(collection(db, 'products'), productData);
            alert('تم إضافة المنتج بنجاح');
        }
        
        closeProductModal();
        loadProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        let errorMessage = 'حدث خطأ أثناء حفظ المنتج';
        
        if (error.message) {
            errorMessage = error.message;
        } else if (error.code) {
            if (error.code === 'storage/unauthorized') {
                errorMessage = 'ليس لديك صلاحية لرفع الصور. تحقق من قواعد Storage';
            } else if (error.code === 'storage/canceled') {
                errorMessage = 'تم إلغاء رفع الصورة';
            } else if (error.code === 'storage/unknown') {
                errorMessage = 'حدث خطأ غير معروف أثناء رفع الصورة';
            }
        }
        
        alert(errorMessage);
    }
}

