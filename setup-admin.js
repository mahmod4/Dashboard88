// 🔐 Setup Admin Claims Script
// هذا السكريبت يقوم بإعداد admin claims للمستخدمين

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
});

const db = admin.firestore();
const auth = admin.auth();

// قائمة المستخدمين الذين سيتم تعيينهم كمسؤولين
const adminUsers = [
  'admin@example.com',
  'user@example.com',
  // أضف هنا بريد المستخدم الذي تريد جعله مسؤولاً
];

async function setupAdminClaims() {
  console.log('🚀 بدء إعداد admin claims...');
  
  try {
    for (const email of adminUsers) {
      try {
        // البحث عن المستخدم بالبريد الإلكتروني
        const userRecord = await auth.getUserByEmail(email);
        
        // تعيين admin claim
        await auth.setCustomUserClaims(userRecord.uid, { admin: true });
        
        console.log(`✅ تم تعيين ${email} كمسؤول بنجاح`);
        
        // تحديث بيانات المستخدم في Firestore
        await db.collection('users').doc(userRecord.uid).update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ تم تحديث دور المستخدم ${email} في Firestore`);
        
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`⚠️ المستخدم ${email} غير موجود`);
        } else {
          console.error(`❌ خطأ في تعيين ${email}:`, error);
        }
      }
    }
    
    console.log('🎉 اكتمل إعداد admin claims بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ عام:', error);
  }
}

// دالة للتحقق من admin claims
async function checkAdminClaims() {
  console.log('🔍 التحقق من admin claims...');
  
  try {
    for (const email of adminUsers) {
      try {
        const userRecord = await auth.getUserByEmail(email);
        const claims = userRecord.customClaims;
        
        console.log(`👤 ${email}:`);
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Admin: ${claims?.admin === true ? '✅' : '❌'}`);
        console.log(`   All Claims:`, claims);
        console.log('---');
        
      } catch (error) {
        console.error(`❌ خطأ في التحقق من ${email}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ خطأ عام:', error);
  }
}

// دالة لإزالة admin claims
async function removeAdminClaims() {
  console.log('🗑️ إزالة admin claims...');
  
  try {
    for (const email of adminUsers) {
      try {
        const userRecord = await auth.getUserByEmail(email);
        
        // إزالة admin claim
        await auth.setCustomUserClaims(userRecord.uid, { admin: false });
        
        console.log(`✅ تم إزالة admin claims من ${email}`);
        
        // تحديث بيانات المستخدم في Firestore
        await db.collection('users').doc(userRecord.uid).update({
          role: 'user',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
      } catch (error) {
        console.error(`❌ خطأ في إزالة admin claims من ${email}:`, error);
      }
    }
    
    console.log('🎉 اكتملت إزالة admin claims بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ عام:', error);
  }
}

// دالة لإنشاء مستخدم مسؤول جديد
async function createAdminUser(email, password, displayName) {
  try {
    console.log(`👤 إنشاء مستخدم مسؤول جديد: ${email}`);
    
    // إنشاء المستخدم
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName
    });
    
    // تعيين admin claim
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });
    
    // إنشاء مستند المستخدم في Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      role: 'admin',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ تم إنشاء المستخدم المسؤول ${email} بنجاح`);
    console.log(`   UID: ${userRecord.uid}`);
    
    return userRecord;
    
  } catch (error) {
    console.error(`❌ خطأ في إنشاء المستخدم المسؤول:`, error);
    throw error;
  }
}

// دالة لاختبار الصلاحيات
async function testPermissions() {
  console.log('🧪 اختبار الصلاحيات...');
  
  try {
    // اختبار قراءة المنتجات (يجب أن تعمل للجميع)
    const productsSnapshot = await db.collection('products').limit(1).get();
    console.log(`✅ قراءة المنتجات: ${productsSnapshot.empty ? 'لا توجد منتجات' : 'نجح'}`);
    
    // اختبار كتابة منتج (يجب أن تفشل بدون admin)
    try {
      await db.collection('products').add({
        name: 'Test Product',
        price: 100,
        test: true
      });
      console.log('⚠️ كتابة المنتجات: نجح (قد يكون هناك مشكلة في الصلاحيات)');
    } catch (error) {
      console.log('✅ كتابة المنتجات: فشل كما هو متوقع (يتطلب admin)');
    }
    
    // اختبار قراءة المستخدمين (يجب أن تفشل بدون مصادقة)
    try {
      const usersSnapshot = await db.collection('users').limit(1).get();
      console.log('⚠️ قراءة المستخدمين: نجح (قد يكون هناك مشكلة في الصلاحيات)');
    } catch (error) {
      console.log('✅ قراءة المستخدمين: فشل كما هو متوقع (يتطلب مصادقة)');
    }
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الصلاحيات:', error);
  }
}

// التنفيذ بناءً على المعاملات
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupAdminClaims();
    break;
  case 'check':
    checkAdminClaims();
    break;
  case 'remove':
    removeAdminClaims();
    break;
  case 'create':
    const email = process.argv[3];
    const password = process.argv[4];
    const displayName = process.argv[5];
    if (email && password && displayName) {
      createAdminUser(email, password, displayName);
    } else {
      console.log('❌ يرجى توفير: email password displayName');
    }
    break;
  case 'test':
    testPermissions();
    break;
  default:
    console.log('📋 الاستخدام:');
    console.log('  node setup-admin.js setup - إعداد admin claims');
    console.log('  node setup-admin.js check - التحقق من admin claims');
    console.log('  node setup-admin.js remove - إزالة admin claims');
    console.log('  node setup-admin.js create email password displayName - إنشاء مستخدم مسؤول جديد');
    console.log('  node setup-admin.js test - اختبار الصلاحيات');
}

module.exports = {
  setupAdminClaims,
  checkAdminClaims,
  removeAdminClaims,
  createAdminUser,
  testPermissions
};
