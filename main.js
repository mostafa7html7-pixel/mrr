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