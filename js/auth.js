import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

// Check if user is admin
export async function checkAdminStatus(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'admins', userId));
        console.log('Admin document exists:', userDoc.exists());
        if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('Admin document data:', data);
            console.log('isAdmin value:', data.isAdmin, 'Type:', typeof data.isAdmin);
            const isAdmin = data.isAdmin === true && data.active !== false;
            if (!isAdmin) {
                return { isAdmin: false, role: null };
            }
            const role = (data.role === 'super_admin' || data.role === 'admin') ? data.role : 'admin';
            return { isAdmin: true, role };
        }
        return { isAdmin: false, role: null };
    } catch (error) {
        console.error('Error checking admin status:', error);
        return { isAdmin: false, role: null };
    }
}

// Login function
export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful, checking admin status for:', userCredential.user.uid);
        
        const adminInfo = await checkAdminStatus(userCredential.user.uid);
        console.log('Admin status:', adminInfo);
        
        if (!adminInfo.isAdmin) {
            await signOut(auth);
            
            // رسالة خطأ مفصلة
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
            
            throw new Error(errorMessage);
        }
        
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        // Preserve original error message if it exists
        if (error.message) {
            throw error;
        }
        // Otherwise create a user-friendly message
        throw new Error('حدث خطأ أثناء تسجيل الدخول. تحقق من البريد وكلمة المرور.');
    }
}

// Logout function
export async function logout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Auth state observer
export function onAuthStateChange(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const adminInfo = await checkAdminStatus(user.uid);
            callback(user, adminInfo);
        } else {
            callback(null, { isAdmin: false, role: null });
        }
    });
}

