import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// تهيئة Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Cloud Function لإرسال إشعارات Push عند إنشاء موعد جديد
 * 
 * ملاحظة: هذه الوظيفة اختيارية وقد تحتاج إلى ترقية خطة Firebase
 * من Spark إلى Blaze حسب استخدامك
 */
export const onAppointmentCreated = functions.firestore
  .document('appointments/{appointmentId}')
  .onCreate(async (snap, context) => {
    try {
      const appointmentData = snap.data();
      const appointmentId = context.params.appointmentId;

      console.log(`تم إنشاء موعد جديد: ${appointmentId}`);

      // جلب بيانات رئيس البلدية المخصص له الموعد
      const mayorUid = appointmentData.assignedToUid;
      if (!mayorUid) {
        console.log('لم يتم تحديد رئيس بلدية للموعد');
        return null;
      }

      // جلب بيانات رئيس البلدية
      const mayorDoc = await db.collection('users').doc(mayorUid).get();
      if (!mayorDoc.exists) {
        console.log(`لم يتم العثور على رئيس البلدية: ${mayorUid}`);
        return null;
      }

      const mayorData = mayorDoc.data();
      const mayorName = mayorData?.displayName || 'رئيس البلدية';

      // جلب توكنات الإشعارات لرئيس البلدية
      const tokenDocs = await db
        .collection('deviceTokens')
        .where('uid', '==', mayorUid)
        .get();

      if (tokenDocs.empty) {
        console.log(`لا توجد توكنات إشعارات لرئيس البلدية: ${mayorUid}`);
        return null;
      }

      const tokens: string[] = [];
      tokenDocs.forEach(doc => {
        const tokenData = doc.data();
        if (tokenData.token) {
          tokens.push(tokenData.token);
        }
      });

      if (tokens.length === 0) {
        console.log('لا توجد توكنات صالحة');
        return null;
      }

      // إعداد رسالة الإشعار
      const message = {
        notification: {
          title: 'موعد جديد',
          body: `تم إضافة موعد جديد: ${appointmentData.title}`,
        },
        data: {
          appointmentId: appointmentId,
          type: 'new_appointment',
          title: appointmentData.title,
          when: appointmentData.when.toDate().toISOString(),
        },
        tokens: tokens,
      };

      // إرسال الإشعار
      const response = await messaging.sendMulticast(message);
      
      console.log(`تم إرسال ${response.successCount} إشعار من أصل ${tokens.length}`);

      // حذف التوكنات غير الصالحة
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });

        // حذف التوكنات الفاشلة من Firestore
        for (const failedToken of failedTokens) {
          const failedTokenDocs = await db
            .collection('deviceTokens')
            .where('token', '==', failedToken)
            .get();

          failedTokenDocs.forEach(doc => {
            doc.ref.delete();
          });
        }

        console.log(`تم حذف ${failedTokens.length} توكن غير صالح`);
      }

      return { success: true, sentCount: response.successCount };
    } catch (error) {
      console.error('خطأ في إرسال الإشعار:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Cloud Function لإرسال إشعارات Push عند تحديث حالة الموعد
 */
export const onAppointmentStatusUpdated = functions.firestore
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

      const tokens: string[] = [];
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
    } catch (error) {
      console.error('خطأ في إرسال إشعار تحديث الحالة:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * دالة مساعدة لتحويل حالة الموعد إلى نص مقروء
 */
function getStatusText(status: string): string {
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
export const testNotification = functions.https.onCall(async (data, context) => {
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

    const tokens: string[] = [];
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
  } catch (error) {
    console.error('خطأ في إرسال الإشعار التجريبي:', error);
    throw new functions.https.HttpsError('internal', 'فشل في إرسال الإشعار');
  }
});
