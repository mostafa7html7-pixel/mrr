const CACHE_NAME = 'abqarieno-v29';
const ASSETS = [
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
    self.skipWaiting(); // إضافة: تفعيل التحديث فوراً دون انتظار إغلاق التبويب
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
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
        }).then(() => self.clients.claim()) // السيطرة على الصفحات المفتوحة فوراً
    );
});

// Network First, then Cache for HTML pages. Cache first for other assets.
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Ignore non-GET requests and requests to Firebase
    if (e.request.method !== 'GET' || url.origin.includes('firebase')) {
        return;
    }

    // Network First for HTML pages (to ensure auth logic runs)
    if (e.request.destination === 'document') {
        e.respondWith(
            fetch(e.request).then(networkResponse => {
                // Update cache with the new version
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
                return networkResponse;
            }).catch(() => {
                // If network fails, try to serve from cache
                return caches.match(e.request).then(response => {
                    // If page is in cache, return it. If not, return offline page.
                    return response || caches.match('./offline.html');
                });
            })
        );
    } else { // Cache First for other assets (CSS, JS, images)
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