#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 بدء عملية البناء للإنتاج...\n');

// التحقق من وجود ملف env.production
if (!fs.existsSync('env.production')) {
  console.error('❌ ملف env.production غير موجود!');
  console.log('يرجى إنشاء الملف أولاً.');
  process.exit(1);
}

try {
  // تنظيف مجلد dist
  console.log('🧹 تنظيف مجلد dist...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // فحص TypeScript
  console.log('🔍 فحص TypeScript...');
  execSync('npm run type-check', { stdio: 'inherit' });

  // فحص ESLint
  console.log('🔍 فحص ESLint...');
  execSync('npm run lint:fix', { stdio: 'inherit' });

  // بناء التطبيق
  console.log('🏗️ بناء التطبيق...');
  execSync('npm run build:prod', { stdio: 'inherit' });

  // التحقق من وجود مجلد dist
  if (!fs.existsSync('dist')) {
    throw new Error('فشل في إنشاء مجلد dist');
  }

  // نسخ ملفات إضافية
  console.log('📁 نسخ الملفات الإضافية...');
  
  // نسخ robots.txt
  if (fs.existsSync('public/robots.txt')) {
    fs.copyFileSync('public/robots.txt', 'dist/robots.txt');
  }
  
  // نسخ sitemap.xml
  if (fs.existsSync('public/sitemap.xml')) {
    fs.copyFileSync('public/sitemap.xml', 'dist/sitemap.xml');
  }

  // عرض حجم الملفات
  const distPath = path.join(process.cwd(), 'dist');
  const totalSize = getDirectorySize(distPath);
  
  console.log('\n✅ تم البناء بنجاح!');
  console.log(`📊 حجم الملفات: ${formatBytes(totalSize)}`);
  console.log('\n📁 محتويات مجلد dist:');
  listDirectoryContents(distPath);

  console.log('\n🚀 جاهز للنشر! استخدم الأمر التالي:');
  console.log('npm run deploy');

} catch (error) {
  console.error('\n❌ فشل في البناء:', error.message);
  process.exit(1);
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  if (fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  }
  
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function listDirectoryContents(dirPath, indent = '') {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      console.log(`${indent}📁 ${item}/`);
      listDirectoryContents(itemPath, indent + '  ');
    } else {
      const size = formatBytes(stats.size);
      console.log(`${indent}📄 ${item} (${size})`);
    }
  }
}
