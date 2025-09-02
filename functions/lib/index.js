"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testNotification = exports.onAppointmentStatusUpdated = exports.onAppointmentCreated = exports.sendScheduledNotifications = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// تهيئة Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
// إرسال الإشعارات المجدولة
// ملاحظة: تم تعطيل وظيفة الجدولة للحفاظ على الخطة المجانية (Spark)
// كانت الوظيفة تستخدم Cloud Scheduler الذي يتطلب خطة Blaze عند الاستدعاء المتكرر.
// إذا لزم الأمر لاحقاً، يمكن استبدالها بـ onWrite trigger أو تنفيذ يدوي عبر HTTPS Callable.
exports.sendScheduledNotifications = functions.https.onRequest((_req, res) => {
    res.status(200).send('Scheduled notifications disabled on free plan.');
});
// إرسال إشعار عند إنشاء موعد جديد
exports.onAppointmentCreated = functions.firestore
    .document('appointments/{appointmentId}')
    .onCreate(async (snap, context) => {
    try {
        const appointmentData = snap.data();
        const appointmentId = context.params.appointmentId;
        // البحث عن بيانات المستخدم المعين
        const userDoc = await db.collection('users').doc(appointmentData.assignedToUid).get();
        if (!userDoc.exists) {
            console.log('المستخدم غير موجود');
            return null;
        }
        // const userData = userDoc.data(); // غير مستخدم حالياً
        // إرسال إشعار فوري
        await db.collection('notifications').add({
            userId: appointmentData.assignedToUid,
            title: 'موعد جديد',
            message: `تم إنشاء موعد جديد: "${appointmentData.title}" في ${appointmentData.when.toDate().toLocaleString('ar-SA-u-ca-gregory')}`,
            type: 'appointment_created',
            appointmentId: appointmentId,
            isRead: false,
            createdAt: admin.firestore.Timestamp.now()
        });
        // إرسال إشعار FCM للهاتف
        try {
            const userTokensRef = db.collection('deviceTokens');
            const userTokensSnapshot = await userTokensRef
                .where('uid', '==', appointmentData.assignedToUid)
                .get();
            if (!userTokensSnapshot.empty) {
                const tokens = userTokensSnapshot.docs.map(doc => doc.data().token);
                // إرسال إشعار FCM
                const fcmMessage = {
                    notification: {
                        title: 'موعد جديد',
                        body: `تم إنشاء موعد جديد: "${appointmentData.title}" في ${appointmentData.when.toDate().toLocaleString('ar-SA-u-ca-gregory')}`
                    },
                    data: {
                        appointmentId: appointmentId,
                        type: 'appointment_created'
                    },
                    tokens: tokens
                };
                const response = await messaging.sendMulticast(fcmMessage);
                console.log('تم إرسال إشعار FCM:', response.successCount, 'من', response.responses.length);
            }
        }
        catch (error) {
            console.error('فشل في إرسال إشعار FCM:', error);
        }
        // جدولة تنبيه قبل الموعد بساعة
        const appointmentTime = appointmentData.when.toDate();
        const reminderTime = new Date(appointmentTime.getTime() - 60 * 60 * 1000); // قبل ساعة
        if (reminderTime > new Date()) {
            await db.collection('scheduledNotifications').add({
                userId: appointmentData.assignedToUid,
                title: 'تذكير بالموعد',
                message: `موعدك القادم: "${appointmentData.title}" في الساعة ${appointmentTime.toLocaleTimeString('ar-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' })}`,
                type: 'appointment_reminder',
                appointmentId: appointmentId,
                isRead: false,
                createdAt: admin.firestore.Timestamp.now(),
                scheduledFor: admin.firestore.Timestamp.fromDate(reminderTime),
                isSent: false
            });
        }
        console.log('تم إرسال إشعارات الموعد الجديد');
        return null;
    }
    catch (error) {
        console.error('فشل في إرسال إشعارات الموعد:', error);
        return null;
    }
});
/**
 * Cloud Function لإرسال إشعارات Push عند تحديث حالة الموعد
 */
exports.onAppointmentStatusUpdated = functions.firestore
    .document('appointments/{appointmentId}')
    .onUpdate(async (change, context) => {
    try {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        const appointmentId = context.params.appointmentId;
        // التحقق من تغيير الحالة فقط
        if (beforeData.status === afterData.status) {
            return null;
        }
        console.log(`تم تحديث حالة الموعد: ${appointmentId} من ${beforeData.status} إلى ${afterData.status}`);
        // جلب بيانات رئيس البلدية
        const mayorUid = afterData.assignedToUid;
        if (!mayorUid) {
            return null;
        }
        // جلب توكنات الإشعارات
        const tokenDocs = await db
            .collection('deviceTokens')
            .where('uid', '==', mayorUid)
            .get();
        if (tokenDocs.empty) {
            return null;
        }
        const tokens = [];
        tokenDocs.forEach(doc => {
            const tokenData = doc.data();
            if (tokenData.token) {
                tokens.push(tokenData.token);
            }
        });
        if (tokens.length === 0) {
            return null;
        }
        // إعداد رسالة الإشعار
        const statusText = getStatusText(afterData.status);
        const message = {
            notification: {
                title: 'تحديث حالة الموعد',
                body: `تم تحديث حالة الموعد "${afterData.title}" إلى: ${statusText}`,
            },
            data: {
                appointmentId: appointmentId,
                type: 'status_update',
                status: afterData.status,
                title: afterData.title,
            },
            tokens: tokens,
        };
        // إرسال الإشعار
        const response = await messaging.sendMulticast(message);
        console.log(`تم إرسال ${response.successCount} إشعار تحديث الحالة`);
        return { success: true, sentCount: response.successCount };
    }
    catch (error) {
        console.error('خطأ في إرسال إشعار تحديث الحالة:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
/**
 * دالة مساعدة لتحويل حالة الموعد إلى نص مقروء
 */
function getStatusText(status) {
    switch (status) {
        case 'pending':
            return 'في الانتظار';
        case 'done':
            return 'مكتمل';
        case 'cancelled':
            return 'ملغي';
        default:
            return status;
    }
}
/**
 * Cloud Function لاختبار الإشعارات (اختياري)
 */
exports.testNotification = functions.https.onCall(async (data, context) => {
    // التحقق من المصادقة
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'يجب تسجيل الدخول');
    }
    try {
        const { uid, message } = data;
        // جلب توكنات المستخدم
        const tokenDocs = await db
            .collection('deviceTokens')
            .where('uid', '==', uid)
            .get();
        if (tokenDocs.empty) {
            throw new functions.https.HttpsError('not-found', 'لا توجد توكنات إشعارات');
        }
        const tokens = [];
        tokenDocs.forEach(doc => {
            const tokenData = doc.data();
            if (tokenData.token) {
                tokens.push(tokenData.token);
            }
        });
        // إرسال إشعار تجريبي
        const testMessage = {
            notification: {
                title: 'إشعار تجريبي',
                body: message || 'هذا إشعار تجريبي لاختبار النظام',
            },
            data: {
                type: 'test',
                timestamp: new Date().toISOString(),
            },
            tokens: tokens,
        };
        const response = await messaging.sendMulticast(testMessage);
        return {
            success: true,
            sentCount: response.successCount,
            totalTokens: tokens.length,
        };
    }
    catch (error) {
        console.error('خطأ في إرسال الإشعار التجريبي:', error);
        throw new functions.https.HttpsError('internal', 'فشل في إرسال الإشعار');
    }
});
//# sourceMappingURL=index.js.map