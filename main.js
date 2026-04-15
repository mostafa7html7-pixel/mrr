// --- Global Main Script ---

// --- 0. نظام التنظيف التلقائي للكاش (كل ساعة) ---
(function() {
    const CURRENT_VERSION = 'v50'; // يجب أن يطابق CACHE_NAME في sw.js
    const WIPE_KEY = 'platform_last_auto_wipe';
    const lastVersion = localStorage.getItem('platform_version');

    if (lastVersion !== CURRENT_VERSION) {
        console.log("جاري تحديث بيانات المنصة تلقائياً...");
        
        (async () => {
            if ('caches' in window) {
                const keys = await caches.keys();
                for (const key of keys) await caches.delete(key);
            }
            
            localStorage.removeItem('biology_contact_messages_v3');
            localStorage.setItem('platform_version', CURRENT_VERSION);
            
            console.log("تم تحديث الكاش بنجاح");
        })();
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // التأكد من معرفة رتبة المستخدم لتفعيل مميزات عبقرينو الخاصة
    window.isMaster = window.isMaster || (sessionStorage.getItem('biology_user_role') === 'master');

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
        const bar = document.getElementById(`bar-${id}`);
        const progress = document.getElementById(`progress-${id}`);
        
        if (!viewer) return;

        window.activeModelId = id;

        // 1. إظهار شريط التحميل وبدء جلب الملف
        if (bar) bar.style.display = 'block';
        viewer.src = viewer.dataset.src;
        if (card) card.classList.add('loaded');

        // 2. نظام الإظهار الذكي (Smart Reveal)
        viewer.addEventListener('progress', (event) => {
            const p = event.detail.totalProgress * 100;
            if (progress) progress.style.width = p + '%';
        }, { once: false });

        // الإظهار النهائي عند اكتمال التحميل أو وصول النسبة لـ 100%
        viewer.addEventListener('load', () => {
            setTimeout(() => {
                if (bar) bar.style.display = 'none';
                viewer.dismissPoster();
                viewer.cameraControls = true;
                viewer.focus();
                // إضافة فئة تخبر CSS أن المجسم جاهز تماماً
                if (card) card.classList.add('ready');
            }, 300);
        }, { once: true });
    };

    // --- نظام حفظ محادثة عبقرينو (Persistence System) ---
    const CHAT_HISTORY_KEY = 'abqarieno_chat_history';
    let abqarienoChatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');

    // Function to load chat history from localStorage
    function loadAbqarienoChatHistory() {
        const box = document.getElementById('ai-chat-box');
        if (!box) return;
        box.innerHTML = ''; 

        if (abqarienoChatHistory.length > 0) {
            abqarienoChatHistory.forEach((msg, idx) => {
                if (msg.role === 'user') {
                    box.innerHTML += `<div class="user-msg">${msg.content}</div>`;
                } else {
                    // Re-parse markdown for AI messages
                    const formattedText = typeof marked !== 'undefined' ? marked.parse(msg.content) : msg.content;
                    const msgId = 'ai-' + Date.now() + '-' + idx; // Generate a unique ID per message
                    box.innerHTML += `
                        <div class="ai-msg" style="position:relative; margin-bottom:30px;">
                            <div id="text-${msgId}">${formattedText}</div>
                            <button class="copy-btn-ai" onclick="copyAiResponse(this, 'text-${msgId}')">
                                <i class="fa-regular fa-copy"></i> نسخ الإجابة
                            </button>
                        </div>`;
                }
            });
        } else {
            // If no history, add the initial welcome message
            box.innerHTML = `
                <div class="ai-msg">
                    أهلاً بك يا بطل! أنا <strong>عبقرينو</strong>، مساعدك الذكي المطور بواسطة مصطفى أبو طالب. كيف يمكنني مساعدتك في رحلتك التعليمية اليوم؟ 🚀
                </div>
            `;
            abqarienoChatHistory = [{
                role: 'assistant',
                content: 'أهلاً بك يا بطل! أنا **عبقرينو**، مساعدك الذكي المطور بواسطة مصطفى أبو طالب. كيف يمكنني مساعدتك في رحلتك التعليمية اليوم؟ 🚀'
            }];
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(abqarienoChatHistory));
        }
        box.scrollTop = box.scrollHeight;
    }

    // تنفيذ التحميل الفوري عند تشغيل الموقع لضمان جاهزية البيانات
    loadAbqarienoChatHistory();

    // Function to save a message to history
    function saveMessageToHistory(role, content) {
        abqarienoChatHistory.push({ role, content });
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(abqarienoChatHistory));
    }

    // --- نظام شات عبقرينو المنبثق ---
    window.toggleAbqarienoChat = function(mode = 'side') {
        const win = document.getElementById('abqarienoWindow');
        if(!win) return;
        
        // تحديد وضعية الفتح
        if(mode === 'center') {
            win.classList.add('center-mode');
        } else {
            win.classList.remove('center-mode');
        }

        win.classList.toggle('active');
        if(win.classList.contains('active')) {
            loadAbqarienoChatHistory(); // Re-render messages when opening to ensure sync
            document.getElementById('ai-user-input').focus();
        }
    };

    // Function to clear chat history
    window.clearAbqarienoChatHistory = function() {
        if (confirm("هل أنت متأكد من مسح سجل المحادثة؟ لا يمكن التراجع عن هذا الإجراء.")) {
            localStorage.removeItem(CHAT_HISTORY_KEY);
            abqarienoChatHistory = [];
            const box = document.getElementById('ai-chat-box');
            box.innerHTML = `
                <div class="ai-msg">
                    أهلاً بك يا بطل! أنا <strong>عبقرينو</strong>، مساعدك الذكي المطور بواسطة مصطفى أبو طالب. كيف يمكنني مساعدتك في رحلتك التعليمية اليوم؟ 🚀
                </div>
            `;
            saveMessageToHistory('assistant', 'أهلاً بك يا بطل! أنا **عبقرينو**، مساعدك الذكي المطور بواسطة مصطفى أبو طالب. كيف يمكنني مساعدتك في رحلتك التعليمية اليوم؟ 🚀');
            box.scrollTop = box.scrollHeight;
            alert("تم مسح سجل المحادثة بنجاح!");
        }
    };

    // وظيفة نسخ الإجابة
    window.copyAiResponse = function(btn, textId) {
        const text = document.getElementById(textId).innerText;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
            btn.style.color = 'var(--neon-green)';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.color = '';
            }, 2000);
        });
    };

    window.sendAbqarienoMessage = async function() {
        const input = document.getElementById('ai-user-input');
        const box = document.getElementById('ai-chat-box');
        const text = input.value.trim();

        if(!text) return;

        // --- تأمين جلب المفتاح من Firebase إذا لم يكن موجوداً محلياً ---
        let apiKey = window.GROQ_API_KEY;
        if (!apiKey || apiKey === "PLACEHOLDER_KEY") {
            try {
                const { getDatabase, ref, get } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js");
                const db = getDatabase();
                const snap = await get(ref(db, 'system_config/groq_key'));
                if (snap.exists()) apiKey = snap.val();
                else throw new Error("Key not found in DB");
            } catch (e) {
                console.error("Security Fetch Error:", e);
            }
        }

        // إضافة رسالة المستخدم
        const userMsgHTML = `<div class="user-msg">${text}</div>`;
        box.insertAdjacentHTML('beforeend', userMsgHTML);
        saveMessageToHistory('user', text);
        input.value = '';
        box.scrollTop = box.scrollHeight;

        // إضافة حالة التحميل
        const msgId = 'ai-' + Date.now();
        const aiMsgWrapper = document.createElement('div');
        aiMsgWrapper.className = 'ai-msg thinking';
        aiMsgWrapper.id = msgId;
        aiMsgWrapper.innerHTML = `<div id="text-${msgId}"><i class="fa-solid fa-brain fa-fade" style="color:var(--neon-gold)"></i> عبقرينو يحلل سؤالك...</div>`;
        box.appendChild(aiMsgWrapper);
        box.scrollTop = box.scrollHeight;

        const messagesForApi = abqarienoChatHistory.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : msg.role,
            content: msg.content
        }));
        messagesForApi.push({ role: "user", content: text });

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    stream: true, // تفعيل البث المباشر كما في Gemini
                    messages: [
                        { role: "system", content: "أنت المساعد الذكي عبقرينو لمنصة الدكتور عبدالله. مطورك هو مصطفى أبو طالب (2009) من بني سويف، طالب متميز وخبير برمجة. أجب عن منهج العلوم المتكاملة بذكاء وفخر بمطورك." },
                        ...messagesForApi
                    ],
                    temperature: 0.7
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullAiText = "";
            const textContainer = document.getElementById(`text-${msgId}`);
            aiMsgWrapper.classList.remove('thinking');
            textContainer.innerHTML = ""; // مسح نص التحميل

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");
                const parsedLines = lines
                    .map(line => line.replace(/^data: /, "").trim())
                    .filter(line => line !== "" && line !== "[DONE]")
                    .map(line => JSON.parse(line));

                for (const parsedLine of parsedLines) {
                    const content = parsedLine.choices[0].delta.content;
                    if (content) {
                        fullAiText += content;
                        // عرض النص الخام أثناء الكتابة لسرعة الاستجابة
                        textContainer.innerText = fullAiText; 
                        box.scrollTop = box.scrollHeight;
                    }
                }
            }

            // بعد اكتمال البث، نقوم بتحويل الـ Markdown إلى HTML منسق
            const finalHTML = typeof marked !== 'undefined' ? marked.parse(fullAiText) : fullAiText;
            textContainer.innerHTML = finalHTML;
            
            // إضافة زر النسخ وتحديث السجل
            aiMsgWrapper.innerHTML += `
                <button class="copy-btn-ai" onclick="copyAiResponse(this, 'text-${msgId}')">
                    <i class="fa-regular fa-copy"></i> نسخ الإجابة
                </button>`;
            saveMessageToHistory('assistant', fullAiText);

        } catch (error) {
            aiMsgWrapper.innerHTML = `<span style="color:var(--neon-red)">خطأ في الاتصال بالدماغ. حاول ثانية!</span>`;
        }
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
            // إجبار السيرفس وركر على التحديث فوراً مع معالجة الأخطاء المحتملة
            reg.update().catch(err => console.warn("SW update skipped: ", err.message));
            
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