#!/bin/bash

echo "🐳 بدء عملية Docker للإنتاج..."

# بناء الصورة
echo "🏗️ بناء صورة Docker..."
docker build -t mayor-appointments-app:latest .

# إيقاف الحاويات القديمة
echo "🛑 إيقاف الحاويات القديمة..."
docker stop mayor-appointments-app 2>/dev/null || true
docker rm mayor-appointments-app 2>/dev/null || true

# تشغيل الحاوية الجديدة
echo "🚀 تشغيل الحاوية الجديدة..."
docker run -d \
  --name mayor-appointments-app \
  --restart unless-stopped \
  -p 80:80 \
  mayor-appointments-app:latest

# التحقق من الحالة
echo "🔍 التحقق من حالة الحاوية..."
sleep 5
docker ps | grep mayor-appointments-app

# اختبار التطبيق
echo "🧪 اختبار التطبيق..."
curl -f http://localhost/health || echo "❌ فشل في اختبار التطبيق"

echo "✅ تم تشغيل التطبيق على http://localhost"
echo "📊 لعرض السجلات: docker logs mayor-appointments-app"
echo "🛑 لإيقاف التطبيق: docker stop mayor-appointments-app"
