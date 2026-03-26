const CACHE_NAME = 'abqarieno-v33'; // تحديث جديد لإظهار التعديلات على الموبايل
const ASSETS = [ // تأكد من تحديث هذه القائمة لتشمل جميع الملفات الجديدة أو المعدلة
    './',
    './index.html',
    './offline.html',
    './manifest.json',
    './library.html',
    './videos.html',
    './profile.html',
    './lab.html',
    './subscription.html',
    './auth.html',
    './complete-profile.html', // إضافة صفحة إكمال البيانات
    './scientific-books.html', // إضافة صفحة الكتب العلمية
    './schedule.html',
    './quizzes.html', // إضافة صفحة الاختبارات الرئيسية
    './reviews.html',
    './contact.html',
    './admin.html', // إضافة صفحة الأدمن الرئيسية
    './admin-quizzes.html', // إضافة صفحة إدارة الاختبارات
    './admin-scores.html', // إضافة صفحة نتائج الطلاب
    './admin-payments.html', // إضافة صفحة طلبات الدفع
    './quiz-player.html', // إضافة صفحة الاختبار
    './style.css',
    './main.js',
    './12.jpg', // صورة كتاب
    './13.jpg', // صورة كتاب
    './14.png', // صورة كتاب
    './232.png', // صورة كتاب
    './6.jpeg',
    './212.png' 
];
 
// تثبيت Service Worker
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)) 
    ).then(() => self.skipWaiting()); // تفعيل التحديث فوراً بعد التثبيت
});

// تفعيل Service Worker وحذف الكاش القديم
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
            if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim()) // السيطرة على الصفحات المفتوحة فوراً بعد حذف الكاش القديم
    );
});

// Network First, then Cache for HTML pages. Cache first for other assets.
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // تجاهل طلبات POST وطلبات Firebase و Google Analytics
    if (e.request.method !== 'GET' || url.origin.includes('firebase') || url.hostname === 'www.googletagmanager.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com') {
        return;
    }

    // استراتيجية Network First للصفحات (لضمان الحصول على أحدث HTML)
    if (e.request.destination === 'document') {
        e.respondWith(
            fetch(e.request).then(networkResponse => {
                // تحديث الكاش بالنسخة الجديدة
                if (networkResponse.ok) { // تأكد أن الاستجابة صالحة قبل التخزين
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
                }
                return networkResponse;
            }).catch(() => {
                // إذا فشلت الشبكة، حاول الخدمة من الكاش
                return caches.match(e.request).then(response => {
                    // إذا كانت الصفحة في الكاش، أعدها. وإلا، أعد صفحة عدم الاتصال.
                    return response || caches.match('./offline.html');
                });
            })
        );
    } else { // استراتيجية Cache First للموارد الأخرى (CSS, JS, صور)
        e.respondWith(
            caches.match(e.request).then(response => {
                return response || fetch(e.request).then(networkResponse => {
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
                    return networkResponse;
                });
            })
        );
    }
});