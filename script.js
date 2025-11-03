// Efecto de escritura tipo terminal
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            element.classList.add('typing-effect');
        }
    }
    type();
}

// Scroll suave
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Efectos de scroll y animaciones
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
        }
    });
}, observerOptions);

// Inicializar cuando cargue la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando efectos...');
    
    // Efecto de escritura en el título
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = "Mario Alberto Falcón Hernández";
        console.log('🎯 Activando efecto typing...');
        typeWriter(heroTitle, originalText, 80);
    } else {
        console.log('❌ No se encontró .hero-title');
    }
    
    // Configurar elementos para animaciones de scroll
    const animatedElements = document.querySelectorAll('.service-card, .testimonial-card, .about-content');
    console.log(`🎯 Encontrados ${animatedElements.length} elementos para animar`);
    
    animatedElements.forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
        el.style.transition = "all 0.6s ease-out";
        observer.observe(el);
    });

    // Formulario de contacto MEJORADO
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            // Envío REAL por email
            const mailtoLink = `mailto:mariofalcon030901@gmail.com?subject=Consulta de ${name}&body=Nombre: ${name}%0AEmail: ${email}%0A%0AMensaje:%0A${message}`;
            
            window.location.href = mailtoLink;
            
            console.log('📧 Email enviado:', { name, email, message });
            
            // Mensaje de confirmación
            setTimeout(() => {
                alert('✅ Mensaje listo para enviar. Revisa tu cliente de email.');
                this.reset();
            }, 1000);
        });
    }

    // Efecto de glitch aleatorio en títulos
    setInterval(() => {
        const titles = document.querySelectorAll('.section-title, .hero-title');
        titles.forEach(title => {
            if (Math.random() > 0.8) {
                title.style.textShadow = '0 0 20px #ff0000';
                setTimeout(() => {
                    title.style.textShadow = '0 0 20px #00ff41';
                }, 100);
            }
        });
    }, 3000);

    // Contador de estadísticas
    const stats = document.querySelectorAll('.stat-number');
    console.log(`📊 Animando ${stats.length} estadísticas`);
    
    stats.forEach(stat => {
        const originalText = stat.textContent;
        const target = parseInt(originalText.replace('+', ''));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                stat.textContent = originalText;
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(current) + (originalText.includes('+') ? '+' : '');
            }
        }, 16);
    });

    // Inicializar partículas Matrix
    createMatrixParticles();
});

// Efecto de partículas Matrix
function createMatrixParticles() {
    const matrixBg = document.querySelector('.matrix-bg');
    if (!matrixBg) {
        console.log('❌ No se encontró .matrix-bg');
        return;
    }

    console.log('🌌 Creando partículas Matrix...');
    
    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.width = '2px';
        particle.style.height = Math.random() * 30 + 10 + 'px';
        particle.style.background = 'linear-gradient(transparent, #00ff41, transparent)';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = '-50px';
        particle.style.opacity = '0';
        particle.style.zIndex = '-1';
        particle.style.borderRadius = '1px';
        matrixBg.appendChild(particle);

        // Animación
        animateParticle(particle);
    }
}

function animateParticle(particle) {
    const speed = Math.random() * 3 + 2;
    const delay = Math.random() * 8000;
    
    setTimeout(() => {
        particle.style.opacity = Math.random() * 0.5 + 0.3;
        particle.style.transition = `top ${speed}s linear, opacity ${speed}s linear`;
        particle.style.top = '100vh';
        
        setTimeout(() => {
            particle.style.opacity = '0';
            particle.style.top = '-50px';
            setTimeout(() => animateParticle(particle), Math.random() * 2000 + 1000);
        }, speed * 1000);
    }, delay);
}

// Efecto de sonido al hacer hover en botones
document.querySelectorAll('.btn, .service-card, .whatsapp-btn').forEach(element => {
    element.addEventListener('mouseenter', function() {
        // Crear sonido de terminal (beep)
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.frequency.value = 600 + Math.random() * 400;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.05;
            
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
            }, 50);
        } catch (error) {
            console.log('🔇 Audio no soportado');
        }
    });
});

// Tracking de clicks en servicios
document.querySelectorAll('.service-card .btn, .whatsapp-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        let serviceName = 'General';
        
        if (this.classList.contains('whatsapp-btn')) {
            serviceName = 'WhatsApp Consulta';
        } else {
            const serviceCard = this.closest('.service-card');
            if (serviceCard) {
                serviceName = serviceCard.querySelector('h3').textContent;
            }
        }
        
        console.log(`📊 Servicio clickeado: ${serviceName}`);
        
        // Google Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'service_click', {
                'event_category': 'engagement',
                'event_label': serviceName,
                'value': 1
            });
        }
    });
});

// Efecto de parpadeo en consola
console.log(`%c
╔══════════════════════════════════╗
║    FALCONMX SECURITY ACTIVADO    ║
║                                  ║
║    🚀 Sistemas: ONLINE           ║
║    🔒 Seguridad: ACTIVADA        ║
║    📊 Analytics: CONECTADO       ║
║    💰 Pagos: LISTOS              ║
╚══════════════════════════════════╝
`, 'color: #00ff41; font-family: Courier; font-weight: bold;');
