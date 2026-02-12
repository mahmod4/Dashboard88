import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

// ================================
// ملف المصادقة (Auth) للوحة التحكم
// المسؤول عن:
// - تسجيل الدخول بالإيميل/كلمة المرور
// - تسجيل الخروج
// - مراقبة حالة المستخدم
// - التأكد أن المستخدم أدمن عن طريق مستند داخل Firestore
//   المسار: admins/{uid} ويحتوي الحقل isAdmin = true
// ================================

// التحقق هل المستخدم أدمن أم لا
export async function checkAdminStatus(userId) {
    try {
        // نقرأ مستند الأدمن بنفس UID
        const userDoc = await getDoc(doc(db, 'admins', userId));
        console.log('Admin document exists:', userDoc.exists());
        if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('Admin document data:', data);
            console.log('isAdmin value:', data.isAdmin, 'Type:', typeof data.isAdmin);
            // لازم القيمة تكون boolean true (وليس string)
            return data.isAdmin === true;
        }
        return false;
    } catch (error) {
        // لو حصل خطأ في القراءة، نعتبره ليس أدمن لحماية اللوحة
        console.error('Error checking admin status:', error);
        return false;
    }
}

// تسجيل الدخول
export async function login(email, password) {
    try {
        // تسجيل الدخول عبر Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful, checking admin status for:', userCredential.user.uid);
        
        // بعد الدخول نتأكد من صلاحية الأدمن عبر Firestore
        const isAdmin = await checkAdminStatus(userCredential.user.uid);
        console.log('Admin status:', isAdmin);
        
        if (!isAdmin) {
            // لو ليس أدمن: نخرج المستخدم فورًا
            await signOut(auth);
            
            // رسالة خطأ مفصلة لتوجيهك لحل المشكلة (إنشاء مستند الأدمن أو تعديل الحقل)
            const userDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));
            let errorMessage = 'ليس لديك صلاحية للوصول إلى لوحة التحكم.\n\n';
            
            if (!userDoc.exists()) {
                errorMessage += `❌ المستند غير موجود في Firestore.\n\n`;
                errorMessage += `📋 خطوات الحل:\n`;
                errorMessage += `1. اذهب إلى Firestore Database\n`;
                errorMessage += `2. أنشئ Collection: admins\n`;
                errorMessage += `3. Document ID: ${userCredential.user.uid}\n`;
                errorMessage += `4. أضف Field: isAdmin (boolean) = true\n\n`;
                errorMessage += `User UID: ${userCredential.user.uid}`;
            } else {
                const data = userDoc.data();
                errorMessage += `⚠️ المستند موجود لكن:\n\n`;
                if (data.isAdmin === undefined) {
                    errorMessage += `❌ الحقل isAdmin غير موجود\n`;
                } else if (typeof data.isAdmin !== 'boolean') {
                    errorMessage += `❌ الحقل isAdmin من نوع ${typeof data.isAdmin} (يجب أن يكون boolean)\n`;
                    errorMessage += `القيمة الحالية: ${data.isAdmin}\n\n`;
                } else if (data.isAdmin === false) {
                    errorMessage += `❌ الحقل isAdmin = false (يجب أن يكون true)\n`;
                } else {
                    errorMessage += `❌ سبب غير معروف. تحقق من Console للمزيد من التفاصيل.`;
                }
                errorMessage += `\n\nUser UID: ${userCredential.user.uid}`;
            }
            
            // نرمي الخطأ ليظهر في واجهة تسجيل الدخول
            throw new Error(errorMessage);
        }
        
        return userCredential.user;
    } catch (error) {
        // أي خطأ: نرجعه كما هو إن كان فيه رسالة واضحة
        console.error('Login error:', error);
        // Preserve original error message if it exists
        if (error.message) {
            throw error;
        }
        // Otherwise create a user-friendly message
        throw new Error('حدث خطأ أثناء تسجيل الدخول. تحقق من البريد وكلمة المرور.');
    }
}

// تسجيل الخروج
export async function logout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// مراقبة حالة تسجيل الدخول (يستدعي callback مع user و isAdmin)
export function onAuthStateChange(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // إذا يوجد مستخدم: نتحقق من isAdmin ثم نبلغ main.js
            const isAdmin = await checkAdminStatus(user.uid);
            callback(user, isAdmin);
        } else {
            // غير مسجل دخول
            callback(null, false);
        }
    });
}

