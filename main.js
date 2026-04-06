// --- Global Main Script ---

// --- 0. نظام التنظيف التلقائي للكاش (كل ساعة) ---
(function() {
    const WIPE_INTERVAL = 0; // تم التعديل ليتم الفحص في كل فتح للمنصة
    const WIPE_KEY = 'platform_last_auto_wipe';
    const lastWipe = localStorage.getItem(WIPE_KEY);
    const now = Date.now();

    // التحقق من الجلسة الحالية (Session) لضمان التحديث عند كل فتح جديد
    if (!sessionStorage.getItem('opened_this_session')) {
        console.log("جاري تحديث بيانات المنصة تلقائياً...");
        
        (async () => {
            // حفظ التفضيلات الهامة قبل المسح
            const currentTheme = localStorage.getItem('theme');
            
            // مسح ملفات الـ Service Worker المخزنة
            if ('caches' in window) {
                const keys = await caches.keys();
                for (const key of keys) await caches.delete(key);
            }
            
            // مسح كاش الرسائل فقط لضمان السرعة مع تحديث البيانات
            localStorage.removeItem('biology_contact_messages_v3');
            
            // إعادة التوقيت الجديد والتفضيلات
            localStorage.setItem(WIPE_KEY, now.toString());
            sessionStorage.setItem('opened_this_session', 'true');
            if (currentTheme) localStorage.setItem('theme', currentTheme);
            
            console.log("تم تحديث الكاش بنجاح");
        })();
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // 1. Menu Toggle
    const menuBtn = document.querySelector('.menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuBtn.querySelector('i');
            if (icon) {
                // Toggling classes on the existing icon is more performant than re-writing innerHTML.
                if (navLinks.classList.contains('active')) {
                    icon.classList.replace('fa-bars', 'fa-xmark');
                } else {
                    icon.classList.replace('fa-xmark', 'fa-bars');
                }
            }
        });
    }

    // 2. PWA Install Button
    let deferredPrompt;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) { 
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            installBtn.style.display = 'flex'; 
        }  

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'flex';
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') installBtn.style.display = 'none';
                deferredPrompt = null;
            } else {
                alert('لتثبيت التطبيق، يرجى استخدام خيار "الإضافة إلى الشاشة الرئيسية" من إعدادات المتصفح.');
            }
        });
    }

    // 3. Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const body = document.body;
        const icon = themeToggle.querySelector('i');

        if (localStorage.getItem('theme') === 'light') {
            body.classList.add('light-mode');
            icon.classList.replace('fa-moon', 'fa-sun');
        } else if (localStorage.getItem('theme') === 'sepia') {
            body.classList.add('sepia-mode');
            icon.classList.replace('fa-moon', 'fa-eye');
        }

        themeToggle.addEventListener('click', () => {
            // Cycle: Dark -> Light -> Sepia -> Dark
            if (body.classList.contains('light-mode')) {
                // Light -> Sepia
                body.classList.remove('light-mode');
                body.classList.add('sepia-mode');
                icon.className = 'fa-solid fa-eye';
                localStorage.setItem('theme', 'sepia');
            } else if (body.classList.contains('sepia-mode')) {
                // Sepia -> Dark
                body.classList.remove('sepia-mode');
                icon.className = 'fa-solid fa-moon';
                localStorage.setItem('theme', 'dark');
            } else {
                // Dark -> Light
                body.classList.add('light-mode');
                icon.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // 4. Scroll Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach((el) => observer.observe(el));

    // 5. Smooth SPA Navigation (PJAX)
    const appContent = document.getElementById('app-content');
    const pageCache = new Map(); // ذاكرة تخزين ذكية لسرعة خرافية
    
    window.handleNavigation = async (url, pushState = true) => {
        if (!appContent) return;
        
        // بدء تأثير التلاشي للخروج
        appContent.classList.add('page-fade-out');

        // استرجاع الصفحة من الذاكرة إذا زارها المستخدم سابقاً في نفس الجلسة
        if (pageCache.has(url)) {
            renderPage(pageCache.get(url), url, pushState);
            return;
        }
        
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.getElementById('app-content').innerHTML;
            const newTitle = doc.querySelector('title')?.innerText || document.title;

            // تصفير حالة المجسمات النشطة عند الانتقال لصفحة جديدة لضمان استجابتها عند العودة
            window.activeModelId = null;

            const pageData = { content: newContent, title: newTitle };
            pageCache.set(url, pageData); // تخزين الصفحة للرجوع إليها فوراً
            renderPage(pageData, url, pushState);
            
            // تنفيذ السكربتات الموجودة في الصفحة المحملة (Crucial SPA Fix)
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(oldScript => {
                // Only execute non-module scripts to avoid re-initializing Firebase or other module-specific logic
                if (!oldScript.type || oldScript.type !== 'module') {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                    document.body.appendChild(newScript);
                    newScript.parentNode.removeChild(newScript);
                }
            });

        } catch (err) {
            console.error('Navigation failed:', err);
            window.location.href = url; 
        }
    };

    function renderPage(pageData, url, pushState) {
        window.activeModelId = null;
        setTimeout(() => {
            appContent.innerHTML = pageData.content;
            document.title = pageData.title;
            
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
                if (url.includes(link.getAttribute('href'))) link.classList.add('active');
            });

            if (pushState) history.pushState({ url }, '', url);
            
            const newAnimated = appContent.querySelectorAll('.scroll-animate');
            newAnimated.forEach((el) => observer.observe(el));
            
            if (navLinks) navLinks.classList.remove('active');
            if (menuBtn) {
                const icon = menuBtn.querySelector('i');
                if (icon) icon.classList.replace('fa-xmark', 'fa-bars');
            }

            appContent.classList.remove('page-fade-out');
            window.scrollTo(0, 0);
        }, 300);
    };

    // اعتراض جميع الضغطات على الروابط الداخلية
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && 
            link.href.origin === window.location.origin && 
            !link.href.startsWith('mailto:') && 
            !link.href.startsWith('tel:') &&
            !link.hasAttribute('download') &&
            !link.getAttribute('target') && 
            !link.href.includes('#')) {
            e.preventDefault();
            handleNavigation(link.href);
        }
    });

    // تقنية التحميل الاستباقي (Hover-to-Prefetch)
    document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a');
        if (link && 
            link.href.origin === window.location.origin && 
            !link.href.startsWith('mailto:') && 
            !link.href.startsWith('tel:') &&
            !link.hasAttribute('download') &&
            !link.getAttribute('target') && 
            !link.href.includes('#')) {
            const url = link.href;
            if (!window.prefetchedUrls) window.prefetchedUrls = new Set();
            if (!window.prefetchedUrls.has(url)) {
                const prefetchLink = document.createElement('link');
                prefetchLink.rel = 'prefetch';
                prefetchLink.href = url;
                document.head.appendChild(prefetchLink);
                window.prefetchedUrls.add(url);
            }
        }
    }, { passive: true });

    // 6. My Results Modal Logic
    // التعامل مع أزرار الرجوع والتقدم في المتصفح
    window.addEventListener('popstate', (e) => {
        window.activeModelId = null;
        if (e.state && e.state.url) {
            handleNavigation(e.state.url, false);
        }
    });

    // --- نظام تشغيل المجسمات 3D (Universal Loader) ---
    window.activeModelId = null; // تتبع المجسم النشط حالياً

    window.loadModel = function(id) {
        // التحقق: إذا كان هناك مجسم يعمل، قم بإيقافه وتفريغ ذاكرته فوراً
        if (window.activeModelId && window.activeModelId !== id) {
            const oldViewer = document.getElementById(`model-${window.activeModelId}`);
            const oldCard = document.getElementById(`card-${window.activeModelId}`);
            if (oldViewer) oldViewer.removeAttribute('src'); // حذف السورس تماماً لتحرير الذاكرة
            if (oldCard) oldCard.classList.remove('loaded'); // إعادة إظهار واجهة التشغيل
        }

        if (window.activeModelId === id && document.getElementById(`model-${id}`).src) return;

        const viewer = document.getElementById(`model-${id}`);
        const card = document.getElementById(`card-${id}`);
        if (!viewer) return;

        window.activeModelId = id;

        // 1. تعيين المصدر وإظهار الكارت
        viewer.src = viewer.dataset.src;
        if (card) card.classList.add('loaded');

        // 2. إعطاء أمر التشغيل وإعادة تفعيل التحكم مع مهلة لضمان استجابة المحرك
        setTimeout(() => {
            viewer.dismissPoster();
            viewer.cameraControls = true; // إجبار تفعيل التحكم باللمس والماوس
            viewer.focus();
        }, 150);
    };

}); 

// Toggle Features Modal
window.toggleFeaturesModal = function() {
    const overlay = document.getElementById('featuresOverlay');
    if (overlay) {
        overlay.classList.toggle('open');
        // إغلاق عند الضغط خارج النافذة
        overlay.onclick = (e) => { if(e.target === overlay) overlay.classList.remove('open'); };
    }
};

// --- نظام التحديث التلقائي للتطبيق (PWA Auto-Update) ---
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            // إجبار السيرفس وركر على التحديث فوراً عند الفتح
            reg.update();
            
            // مراقبة التحديثات
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // إذا تم تثبيت كود جديد، سيتم عمل ريفرش تلقائي لتطبيق التعديلات
                        window.location.reload();
                    }
                });
            });
        });
    });
}