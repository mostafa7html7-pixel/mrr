// --- Global Main Script ---

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
    
    window.handleNavigation = async (url, pushState = true) => {
        if (!appContent) return;
        
        // بدء تأثير التلاشي للخروج
        appContent.classList.add('page-fade-out');
        
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.getElementById('app-content').innerHTML;
            const newTitle = doc.querySelector('title').innerText;

            setTimeout(() => {
                appContent.innerHTML = newContent;
                document.title = newTitle;
                
                // تحديث الروابط النشطة في الهيدر الثابت
                document.querySelectorAll('.nav-links a').forEach(link => {
                    link.classList.remove('active');
                    if (url.includes(link.getAttribute('href'))) link.classList.add('active');
                });

                if (pushState) history.pushState({ url }, '', url);
                
                // إعادة تشغيل الأنيميشن والمراقبين للمحتوى الجديد
                const newAnimated = appContent.querySelectorAll('.scroll-animate');
                newAnimated.forEach((el) => observer.observe(el));
                
                // إخفاء القائمة في الموبايل إذا كانت مفتوحة
                navLinks.classList.remove('active');

                // إنهاء تأثير التلاشي للدخول
                appContent.classList.remove('page-fade-out');
                window.scrollTo(0, 0);
            }, 300);
        } catch (err) {
            console.error('Navigation failed:', err);
            window.location.href = url; // Fallback في حالة الخطأ
        }
    };

    // اعتراض جميع الضغطات على الروابط الداخلية
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href.origin === window.location.origin && 
            !link.getAttribute('target') && 
            !link.href.includes('#')) {
            e.preventDefault();
            handleNavigation(link.href);
        }
    });

    // 6. My Results Modal Logic
    // التعامل مع أزرار الرجوع والتقدم في المتصفح
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.url) {
            handleNavigation(e.state.url, false);
        }
    });

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