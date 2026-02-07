// 🔐 Setup Specific Admin User
// هذا السكريبت مخصص لإعداد المستخدم المحدد كمسؤول

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

// المستخدم المحدد
const targetUser = {
  uid: '3ECJzHJS0ETW0zYI0MnLrenqsRr1',
  email: 'admin@example.com', // قد تحتاج لتعديل هذا
  isAdmin: true
};

// المجموعات التي يسمح للمسؤول بالوصول إليها
const adminCollections = [
  'admins',
  'categories', 
  'offers',
  'orders',
  'products',
  'settings'
];

async function setupSpecificAdmin() {
  console.log('🚀 بدء إعداد المسؤول المحدد...');
  console.log(`👤 المستخدم: ${targetUser.uid}`);
  
  try {
    // الخطوة 1: تعيين admin claims
    console.log('📝 الخطوة 1: تعيين admin claims...');
    await auth.setCustomUserClaims(targetUser.uid, { 
      admin: true,
      accessLevel: 'full',
      collections: adminCollections
    });
    console.log('✅ تم تعيين admin claims بنجاح');
    
    // الخطوة 2: تحديث بيانات المستخدم في Firestore
    console.log('📝 الخطوة 2: تحديث بيانات المستخدم في Firestore...');
    await db.collection('users').doc(targetUser.uid).set({
      uid: targetUser.uid,
      email: targetUser.email,
      role: 'admin',
      isAdmin: true,
      accessLevel: 'full',
      permissions: {
        read: adminCollections,
        write: adminCollections,
        delete: adminCollections
      },
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ تم تحديث بيانات المستخدم في Firestore');
    
    // الخطوة 3: إضافة المستخدم إلى مجموعة admins
    console.log('📝 الخطوة 3: إضافة المستخدم إلى مجموعة admins...');
    await db.collection('admins').doc(targetUser.uid).set({
      uid: targetUser.uid,
      email: targetUser.email,
      role: 'super_admin',
      permissions: 'full',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ تم إضافة المستخدم إلى مجموعة admins');
    
    // الخطوة 4: التحقق من الإعدادات
    console.log('📝 الخطوة 4: التحقق من الإعدادات...');
    await verifyAdminSetup();
    
    console.log('🎉 اكتمل إعداد المسؤول بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إعداد المسؤول:', error);
  }
}

async function verifyAdminSetup() {
  console.log('🔍 التحقق من إعدادات المسؤول...');
  
  try {
    // التحقق من admin claims
    const userRecord = await auth.getUser(targetUser.uid);
    const claims = userRecord.customClaims;
    
    console.log('👤 معلومات المستخدم:');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Admin: ${claims?.admin === true ? '✅' : '❌'}`);
    console.log(`   Access Level: ${claims?.accessLevel || 'غير محدد'}`);
    console.log(`   Collections: ${JSON.stringify(claims?.collections || [])}`);
    
    // التحقق من بيانات Firestore
    const userDoc = await db.collection('users').doc(targetUser.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('📄 بيانات المستخدم في Firestore:');
      console.log(`   Role: ${userData.role}`);
      console.log(`   Is Admin: ${userData.isAdmin}`);
      console.log(`   Active: ${userData.active}`);
      console.log(`   Permissions: ${JSON.stringify(userData.permissions)}`);
    }
    
    // التحقق من مجموعة admins
    const adminDoc = await db.collection('admins').doc(targetUser.uid).get();
    if (adminDoc.exists) {
      const adminData = adminDoc.data();
      console.log('👔 بيانات المسؤول:');
      console.log(`   Role: ${adminData.role}`);
      console.log(`   Permissions: ${adminData.permissions}`);
      console.log(`   Active: ${adminData.active}`);
    }
    
    // اختبار الصلاحيات
    console.log('🧪 اختبار الصلاحيات...');
    await testAdminPermissions();
    
  } catch (error) {
    console.error('❌ خطأ في التحقق:', error);
  }
}

async function testAdminPermissions() {
  try {
    // اختبار الوصول لكل مجموعة
    for (const collectionName of adminCollections) {
      try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        console.log(`✅ ${collectionName}: الوصول مسموح (${snapshot.size} مستند)`);
      } catch (error) {
        console.log(`❌ ${collectionName}: الوصول مرفوض (${error.message})`);
      }
    }
    
    // اختبار الكتابة في كل مجموعة
    for (const collectionName of adminCollections) {
      try {
        const testDoc = {
          _test: true,
          _timestamp: admin.firestore.FieldValue.serverTimestamp(),
          _admin: targetUser.uid
        };
        
        const docRef = await db.collection(collectionName).add(testDoc);
        console.log(`✅ ${collectionName}: الكتابة مسموحة (${docRef.id})`);
        
        // حذف المستند التجريبي
        await docRef.delete();
        console.log(`✅ ${collectionName}: الحذف مسموح`);
        
      } catch (error) {
        console.log(`❌ ${collectionName}: الكتابة مرفوضة (${error.message})`);
      }
    }
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الصلاحيات:', error);
  }
}

async function removeAdminAccess() {
  console.log('🗑️ إزالة صلاحيات المسؤول...');
  
  try {
    // إزالة admin claims
    await auth.setCustomUserClaims(targetUser.uid, { 
      admin: false,
      accessLevel: 'user'
    });
    console.log('✅ تم إزالة admin claims');
    
    // تحديث بيانات المستخدم
    await db.collection('users').doc(targetUser.uid).update({
      role: 'user',
      isAdmin: false,
      accessLevel: 'user',
      permissions: {
        read: [],
        write: [],
        delete: []
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ تم تحديث بيانات المستخدم');
    
    // حذف من مجموعة admins
    await db.collection('admins').doc(targetUser.uid).delete();
    console.log('✅ تم حذف المستخدم من مجموعة admins');
    
    console.log('🎉 اكتملت إزالة الصلاحيات بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إزالة الصلاحيات:', error);
  }
}

async function createAdminCollections() {
  console.log('📁 إنشاء المجموعات الإدارية...');
  
  try {
    for (const collectionName of adminCollections) {
      // إنشاء مستند أولي لضمان وجود المجموعة
      const initDoc = {
        _init: true,
        _collection: collectionName,
        _createdAt: admin.firestore.FieldValue.serverTimestamp(),
        _createdBy: targetUser.uid
      };
      
      await db.collection(collectionName).add(initDoc);
      console.log(`✅ تم إنشاء مجموعة ${collectionName}`);
    }
    
    console.log('🎉 تم إنشاء جميع المجموعات بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء المجموعات:', error);
  }
}

// التنفيذ بناءً على المعاملات
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupSpecificAdmin();
    break;
  case 'verify':
    verifyAdminSetup();
    break;
  case 'remove':
    removeAdminAccess();
    break;
  case 'create-collections':
    createAdminCollections();
    break;
  case 'full-setup':
    await createAdminCollections();
    await setupSpecificAdmin();
    break;
  default:
    console.log('📋 الاستخدام:');
    console.log('  node setup-specific-admin.js setup - إعداد المسؤول المحدد');
    console.log('  node setup-specific-admin.js verify - التحقق من إعدادات المسؤول');
    console.log('  node setup-specific-admin.js remove - إزالة صلاحيات المسؤول');
    console.log('  node setup-specific-admin.js create-collections - إنشاء المجموعات الإدارية');
    console.log('  node setup-specific-admin.js full-setup - إعداد كامل (مجموعات + مسؤول)');
}

module.exports = {
  setupSpecificAdmin,
  verifyAdminSetup,
  removeAdminAccess,
  createAdminCollections
};
