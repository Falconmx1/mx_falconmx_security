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
    // Efecto de escritura en el título
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = "Mario Alberto Falcón Hernández";
        typeWriter(heroTitle, originalText, 80);
    }
    
    // Configurar elementos para animaciones de scroll
    document.querySelectorAll('.service-card, .testimonial-card, .about-content').forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
        el.style.transition = "all 0.6s ease-out";
        observer.observe(el);
    });

    // Formulario de contacto
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simular envío
            alert('✅ Mensaje enviado. Te contactaré en menos de 24 horas.');
            this.reset();
        });
    }

    // Efecto de glitch aleatorio en el título
    setInterval(() => {
        const titles = document.querySelectorAll('.section-title, .hero-title');
        titles.forEach(title => {
            if (Math.random() > 0.7) {
                title.style.textShadow = '0 0 20px #ff0000';
                setTimeout(() => {
                    title.style.textShadow = '0 0 20px #00ff41';
                }, 100);
            }
        });
    }, 3000);

    // Contador de estadísticas
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
        const target = parseInt(stat.textContent);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                stat.textContent = target + (stat.textContent.includes('+') ? '+' : '');
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(current) + (stat.textContent.includes('+') ? '+' : '');
            }
        }, 16);
    });
});

// Efecto de partículas Matrix (simple)
function createMatrixParticles() {
    const matrixBg = document.querySelector('.matrix-bg');
    if (!matrixBg) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.width = '2px';
        particle.style.height = '20px';
        particle.style.background = 'linear-gradient(transparent, #00ff41, transparent)';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = '-30px';
        particle.style.opacity = '0';
        particle.style.zIndex = '-1';
        matrixBg.appendChild(particle);

        // Animación
        animateParticle(particle);
    }
}

function animateParticle(particle) {
    const speed = Math.random() * 3 + 1;
    const delay = Math.random() * 5000;
    
    setTimeout(() => {
        particle.style.opacity = '0.7';
        particle.style.transition = `top ${speed}s linear`;
        particle.style.top = '100vh';
        
        setTimeout(() => {
            particle.style.opacity = '0';
            particle.style.top = '-30px';
            setTimeout(() => animateParticle(particle), 1000);
        }, speed * 1000);
    }, delay);
}

// Iniciar partículas cuando la página cargue
document.addEventListener('DOMContentLoaded', createMatrixParticles);

// Efecto de sonido al hacer hover en botones (opcional)
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        // Simular sonido de terminal (podrías agregar un audio real después)
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 100);
    });
});

// Detectar clicks en servicios y registrar en Analytics
document.querySelectorAll('.service-card .btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const service = this.closest('.service-card').querySelector('h3').textContent;
        console.log(`📊 Servicio clickeado: ${service}`);
        // Aquí integrarías Google Analytics
        // gtag('event', 'service_click', { 'service_name': service });
    });
});
