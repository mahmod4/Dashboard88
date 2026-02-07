// Cloudinary Configuration - إعدادات Cloudinary
// إعدادات API للرفع الصور
const cloudinaryConfig = {
    cloudName: 'djqf5kqyq', // Cloud name
    apiKey: '915513453848396', // API Key
    apiSecret: 'gwwRDcbDIKPdu1-f6jSyLsCu2yk', // API Secret
    uploadPreset: 'products_upload', // Upload preset للمنتجات
    folder: 'products' // مجلد المنتجات
};

// دالة لإنشاء توقيع التحميل
function generateSignature(dataToSign) {
    const crypto = require('crypto');
    return crypto.createHash('sha1').update(dataToSign + cloudinaryConfig.apiSecret).digest('hex');
}

// دالة لتحميل الصورة إلى Cloudinary
async function uploadImageToCloudinary(file, productId = null) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', cloudinaryConfig.apiKey);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        
        // إضافة مجلد المنتج إذا كان productId موجود
        if (productId) {
            formData.append('folder', `${cloudinaryConfig.folder}/${productId}`);
        } else {
            formData.append('folder', cloudinaryConfig.folder);
        }

        // تحويلات الصورة
        formData.append('transformation', JSON.stringify({
            quality: 'auto:good',
            fetch_format: 'auto',
            crop: 'limit',
            width: 800,
            height: 800
        }));

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message);
        }

        return {
            url: result.secure_url,
            publicId: result.public_id,
            thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_150,h_150/'),
            mediumUrl: result.secure_url.replace('/upload/', '/upload/w_400,h_400/'),
            originalUrl: result.secure_url
        };

    } catch (error) {
        console.error('Error uploading image to Cloudinary:', error);
        throw error;
    }
}

// دالة لحذف الصورة من Cloudinary
async function deleteImageFromCloudinary(publicId) {
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = generateSignature(`public_id=${publicId}&timestamp=${timestamp}`);

        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('api_key', cloudinaryConfig.apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/destroy`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message);
        }

        return result.result === 'ok';

    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
}

// دالة لمعاينة الصورة قبل الرفع
function previewImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(file);
}

// دالة للتحقق من نوع الملف
function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        throw new Error('نوع الملف غير مدعوم. يرجى استخدام JPG, PNG, GIF, أو WebP');
    }

    if (file.size > maxSize) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى هو 5MB');
    }

    return true;
}

// دالة لضغط الصورة قبل الرفع
function compressImage(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(function(blob) {
                resolve(new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                }));
            }, 'image/jpeg', quality);
        };

        img.onerror = function() {
            reject(new Error('فشل تحميل الصورة'));
        };

        img.src = URL.createObjectURL(file);
    });
}

// دالة لإنشاء معاينة متعددة الأحجام
function generateImageThumbnails(imageUrl) {
    return {
        thumbnail: imageUrl.replace('/upload/', '/upload/w_150,h_150,c_fill/'),
        medium: imageUrl.replace('/upload/', '/upload/w_400,h_400,c_fill/'),
        large: imageUrl.replace('/upload/', '/upload/w_800,h_800,c_fill/'),
        original: imageUrl
    };
}

// دالة لتحميل صور متعددة
async function uploadMultipleImages(files, productId = null) {
    const uploadPromises = [];
    const results = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            validateImageFile(file);
            
            // ضغط الصورة إذا كانت كبيرة
            let processedFile = file;
            if (file.size > 1024 * 1024) { // أكبر من 1MB
                processedFile = await compressImage(file, 0.7);
            }

            const result = await uploadImageToCloudinary(processedFile, productId);
            results.push({
                file: file.name,
                success: true,
                ...result
            });

        } catch (error) {
            results.push({
                file: file.name,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

// دالة لعرض شريط التقدم
function showUploadProgress(progress, status) {
    const progressBar = document.getElementById('uploadProgress');
    const progressText = document.getElementById('uploadProgressText');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
    }
    
    if (progressText) {
        progressText.textContent = status;
    }
}

// دالة رئيسية لرفع الصورة مع واجهة مستخدم
async function uploadImageWithUI(fileInput, productId = null, onProgress = null) {
    const file = fileInput.files[0];
    
    if (!file) {
        throw new Error('يرجى اختيار صورة');
    }

    try {
        // التحقق من الصورة
        validateImageFile(file);

        // عرض المعاينة
        previewImage(file, (previewUrl) => {
            const preview = document.getElementById('imagePreview');
            if (preview) {
                preview.src = previewUrl;
                preview.style.display = 'block';
            }
        });

        // بدء التحميل
        if (onProgress) {
            onProgress(0, 'جاري تحميل الصورة...');
        }

        // تحميل الصورة
        const result = await uploadImageToCloudinary(file, productId);

        if (onProgress) {
            onProgress(100, 'تم تحميل الصورة بنجاح');
        }

        return result;

    } catch (error) {
        if (onProgress) {
            onProgress(0, `خطأ: ${error.message}`);
        }
        throw error;
    }
}

// تصدير الدوال للاستخدام في ملفات أخرى
export {
    cloudinaryConfig,
    uploadImageToCloudinary,
    deleteImageFromCloudinary,
    previewImage,
    validateImageFile,
    compressImage,
    generateImageThumbnails,
    uploadMultipleImages,
    uploadImageWithUI,
    showUploadProgress
};
