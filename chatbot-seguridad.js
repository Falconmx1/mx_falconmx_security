// chatbot-seguridad.js - AGENTE IA ÉTICO PARA CIBERSEGURIDAD
class SecurityChatbot {
    constructor() {
        this.config = {
            nombre: "Falcon Assistant",
            version: "2.0",
            limites: {
                noHacking: true,
                soloRecomendaciones: true,
                sinDatosSensibles: true,
                maxAnalisis: "nivel_basico"
            },
            telefonoSoporte: "5561264662",
            emailSoporte: "contacto@falconmxsecurity.com"
        };
        
        this.ethicalDisclaimer = "🚫 **Límites Éticos:** Este asistente solo proporciona recomendaciones generales. No realiza hacking, no accede a sistemas sin autorización y no almacena datos sensibles.";
        
        this.init();
    }
    
    init() {
        // Crear interfaz del chatbot
        this.createInterface();
        this.setupEventListeners();
        this.loadFAQ();
        this.setupSecurityTools();
    }
    
    createInterface() {
        const chatHTML = `
        <div id="security-chatbot" style="display: none;">
            <div class="chat-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 1.5rem;">🛡️</div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem;">${this.config.nombre}</h3>
                        <small style="color: #94a3b8;">Asistente Ético v${this.config.version}</small>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="chat-minimize" title="Minimizar">─</button>
                    <button class="close-chat" title="Cerrar">×</button>
                </div>
            </div>
            
            <div class="chat-messages">
                <div class="message bot">
                    <p>¡Hola! Soy tu asistente de ciberseguridad ética de <strong>FalconMX Security</strong>.</p>
                    <p>Puedo ayudarte con:</p>
                    <ul>
                        <li>✅ Evaluación básica de postura de seguridad</li>
                        <li>✅ Recomendaciones de mejores prácticas</li>
                        <li>✅ Herramientas interactivas de seguridad</li>
                        <li>✅ Derivación a experto humano certificado</li>
                    </ul>
                    <p><small>${this.ethicalDisclaimer}</small></p>
                    <p><em>¿En qué puedo asistirte hoy?</em></p>
                </div>
            </div>
            
            <div class="chat-input-area">
                <div class="quick-questions">
                    <button class="quick-btn" data-question="phishing">¿Cómo identificar phishing?</button>
                    <button class="quick-btn" data-question="passwords">Requisitos contraseña segura</button>
                    <button class="quick-btn" data-question="auditoria">¿Qué incluye una auditoría?</button>
                </div>
                
                <div class="input-wrapper">
                    <input type="text" placeholder="Escribe tu pregunta sobre ciberseguridad..." class="chat-input">
                    <button class="send-btn">➤</button>
                </div>
            </div>
            
            <div class="chat-tools">
                <div class="tools-header">
                    <span>🔧 Herramientas de Seguridad</span>
                </div>
                <div class="tools-grid">
                    <button class="tool-btn" data-tool="password">
                        <div>🔐</div>
                        <span>Generar Contraseña</span>
                    </button>
                    <button class="tool-btn" data-tool="checklist">
                        <div>📋</div>
                        <span>Checklist Básico</span>
                    </button>
                    <button class="tool-btn" data-tool="headers">
                        <div>🌐</div>
                        <span>Verificar Headers</span>
                    </button>
                    <button class="tool-btn" data-tool="call">
                        <div>📞</div>
                        <span>Llamar al Experto</span>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Botón flotante para abrir chat -->
        <div id="chatbot-toggle" class="chatbot-toggle-btn">
            <div style="font-size: 1.5rem;">🛡️</div>
            <div class="pulse-dot"></div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        this.addMessage("💡 <strong>Tip rápido:</strong> Siempre mantén actualizado tu software y usa autenticación de dos factores.");
    }
    
    setupEventListeners() {
        // Botón toggle
        document.getElementById('chatbot-toggle').addEventListener('click', () => {
            this.toggleChat();
        });
        
        // Botones de cierre/minimizar
        document.querySelector('.close-chat').addEventListener('click', () => {
            this.closeChat();
        });
        
        document.querySelector('.chat-minimize').addEventListener('click', () => {
            this.minimizeChat();
        });
        
        // Botones rápidos
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.dataset.question;
                this.handleQuickQuestion(question);
            });
        });
        
        // Herramientas
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.closest('.tool-btn').dataset.tool;
                this.handleTool(tool);
            });
        });
        
        // Input de chat
        const input = document.querySelector('.chat-input');
        const sendBtn = document.querySelector('.send-btn');
        
        sendBtn.addEventListener('click', () => {
            this.handleUserMessage(input.value);
            input.value = '';
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserMessage(input.value);
                input.value = '';
            }
        });
    }
    
    toggleChat() {
        const chat = document.getElementById('security-chatbot');
        const toggle = document.getElementById('chatbot-toggle');
        
        if (chat.style.display === 'none' || chat.style.display === '') {
            chat.style.display = 'flex';
            toggle.style.opacity = '0.5';
            gtag('event', 'chatbot_open', {
                'event_category': 'engagement',
                'event_label': 'chatbot_interaction'
            });
        } else {
            this.minimizeChat();
        }
    }
    
    closeChat() {
        document.getElementById('security-chatbot').style.display = 'none';
        document.getElementById('chatbot-toggle').style.opacity = '1';
    }
    
    minimizeChat() {
        const chat = document.getElementById('security-chatbot');
        chat.classList.toggle('minimized');
    }
    
    handleQuickQuestion(question) {
        const responses = {
            'phishing': `🔍 <strong>Identificación de Phishing:</strong>
                         <ul>
                           <li>Verifica el remitente (correos falsos suelen tener dominios extraños)</li>
                           <li>No hagas clic en enlaces sospechosos</li>
                           <li>Busca errores gramaticales y ortográficos</li>
                           <li>Las empresas legítimas nunca piden datos sensibles por email</li>
                           <li>Usa filtros antispam y antivirus actualizados</li>
                         </ul>`,
            
            'passwords': `🔐 <strong>Contraseñas Seguras:</strong>
                          <ul>
                            <li>Mínimo 12 caracteres (recomendado 16+)</li>
                            <li>Mezcla mayúsculas, minúsculas, números y símbolos</li>
                            <li>No uses información personal (nombres, fechas)</li>
                            <li>Usa frases únicas en lugar de palabras simples</li>
                            <li><strong>Herramienta recomendada:</strong> Gestor de contraseñas como Bitwarden o 1Password</li>
                          </ul>`,
            
            'auditoria': `📊 <strong>Auditoría de Seguridad Profesional:</strong>
                          <ul>
                            <li>Análisis de vulnerabilidades OWASP Top 10</li>
                            <li>Pruebas de penetración éticas controladas</li>
                            <li>Revisión de configuración de servidores</li>
                            <li>Evaluación de políticas de seguridad</li>
                            <li>Reporte ejecutivo + técnico detallado</li>
                            <li>Plan de remediación paso a paso</li>
                          </ul>
                          <p><a href="#contacto" style="color: #06b6d4;">📞 Solicitar auditoría personalizada</a></p>`
        };
        
        this.addMessage(responses[question] || "Lo siento, no tengo información sobre ese tema específico.");
    }
    
    handleTool(tool) {
        switch(tool) {
            case 'password':
                this.generateSecurePassword();
                break;
            case 'checklist':
                this.showSecurityChecklist();
                break;
            case 'headers':
                this.checkSecurityHeaders();
                break;
            case 'call':
                this.initiateCall();
                break;
        }
    }
    
    generateSecurePassword() {
        const length = 16;
        const chars = {
            upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            lower: "abcdefghijklmnopqrstuvwxyz",
            numbers: "0123456789",
            symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?"
        };
        
        // Asegurar al menos un carácter de cada tipo
        let password = 
            chars.upper[Math.floor(Math.random() * chars.upper.length)] +
            chars.lower[Math.floor(Math.random() * chars.lower.length)] +
            chars.numbers[Math.floor(Math.random() * chars.numbers.length)] +
            chars.symbols[Math.floor(Math.random() * chars.symbols.length)];
        
        // Completar el resto
        const allChars = chars.upper + chars.lower + chars.numbers + chars.symbols;
        for (let i = 4; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        
        // Mezclar los caracteres
        password = password.split('').sort(() => Math.random() - 0.5).join('');
        
        this.addMessage(`🔐 <strong>Contraseña segura generada:</strong>
                        <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin: 10px 0; font-family: monospace; font-size: 1.2rem; letter-spacing: 2px;">
                          ${password}
                        </div>
                        <p><small>🔒 <strong>Recomendaciones:</strong></small></p>
                        <ul>
                          <li><small>Usa un gestor de contraseñas como Bitwarden (gratuito)</small></li>
                          <li><small>Cambia esta contraseña cada 90 días</small></li>
                          <li><small>No la reutilices en múltiples servicios</small></li>
                        </ul>`);
    }
    
    showSecurityChecklist() {
        const checklistHTML = `
        <div class="security-checklist">
            <h4>📋 Checklist Básico de Seguridad Digital</h4>
            <p><small>Marca los puntos que ya tienes implementados:</small></p>
            
            <div class="checklist-item">
                <input type="checkbox" id="check1">
                <label for="check1"><strong>HTTPS</strong> implementado en todo el sitio (certificado SSL válido)</label>
            </div>
            
            <div class="checklist-item">
                <input type="checkbox" id="check2">
                <label for="check2"><strong>Backups regulares</strong> (regla 3-2-1: 3 copias, 2 medios, 1 externa)</label>
            </div>
            
            <div class="checklist-item">
                <input type="checkbox" id="check3">
                <label for="check3"><strong>Autenticación MFA/2FA</strong> activada en todos los servicios críticos</label>
            </div>
            
            <div class="checklist-item">
                <input type="checkbox" id="check4">
                <label for="check4"><strong>Actualizaciones automáticas</strong> activadas para software y plugins</label>
            </div>
            
            <div class="checklist-item">
                <input type="checkbox" id="check5">
                <label for="check5"><strong>Política de contraseñas</strong> (mínimo 12 caracteres, complejidad)</label>
            </div>
            
            <div class="checklist-item">
                <input type="checkbox" id="check6">
                <label for="check6"><strong>Firewall/WAF</strong> configurado y monitoreando tráfico</label>
            </div>
            
            <div class="checklist-item">
                <input type="checkbox" id="check7">
                <label for="check7"><strong>Monitoreo de logs</strong> habilitado para detección temprana</label>
            </div>
            
            <div class="checklist-result" style="margin-top: 20px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; display: none;">
                <p style="margin: 0;"><strong>Resultado:</strong> <span id="checklist-score">0/7</span></p>
                <p style="margin: 10px 0 0 0; font-size: 0.9em;" id="checklist-advice"></p>
            </div>
            
            <button id="calculate-score" style="margin-top: 15px; padding: 8px 15px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Calcular mi puntuación
            </button>
            
            <p style="margin-top: 15px; font-size: 0.9em;">
                ¿Necesitas ayuda con algún punto? 
                <a href="https://wa.me/525561264662?text=Necesito%20ayuda%20con%20el%20checklist%20de%20seguridad" 
                   target="_blank" 
                   style="color: #06b6d4; text-decoration: none;">
                   📞 Contactar a un experto
                </a>
            </p>
        </div>
        `;
        
        this.addMessage(checklistHTML);
        
        // Agregar funcionalidad al botón de calcular
        setTimeout(() => {
            document.getElementById('calculate-score').addEventListener('click', () => {
                this.calculateChecklistScore();
            });
        }, 100);
    }
    
    calculateChecklistScore() {
        const checks = document.querySelectorAll('.security-checklist input[type="checkbox"]:checked');
        const score = checks.length;
        const total = 7;
        const percentage = Math.round((score / total) * 100);
        
        let advice = "";
        if (percentage >= 85) {
            advice = "🎉 ¡Excelente! Tu postura de seguridad es sólida. Considera auditorías periódicas para mantenerla.";
        } else if (percentage >= 60) {
            advice = "👍 Buen comienzo. Te recomiendo enfocarte en implementar MFA y backups regulares.";
        } else {
            advice = "⚠️ Necesitas mejorar. Prioriza HTTPS, backups y MFA. Considera una auditoría profesional.";
        }
        
        const resultDiv = document.querySelector('.checklist-result');
        resultDiv.style.display = 'block';
        document.getElementById('checklist-score').textContent = `${score}/${total} (${percentage}%)`;
        document.getElementById('checklist-advice').textContent = advice;
    }
    
    checkSecurityHeaders() {
        // Esta es una versión educativa que no realiza escaneo real
        this.addMessage(`🌐 <strong>Verificación de Headers de Seguridad (Modo Educativo)</strong>
                        
                        <p>Los headers de seguridad HTTP son cruciales para proteger tu sitio web:</p>
                        
                        <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin: 10px 0;">
                            <p><strong>🔒 Headers recomendados:</strong></p>
                            <ul>
                                <li><code>Content-Security-Policy</code>: Previene XSS</li>
                                <li><code>X-Frame-Options</code>: Previene clickjacking</li>
                                <li><code>X-Content-Type-Options</code>: Previene MIME sniffing</li>
                                <li><code>Referrer-Policy</code>: Controla información de referencia</li>
                                <li><code>Strict-Transport-Security</code>: Fuerza HTTPS</li>
                            </ul>
                        </div>
                        
                        <p><strong>📋 Para verificar tus headers:</strong></p>
                        <ol>
                            <li>Usa las herramientas de desarrollador de tu navegador (F12)</li>
                            <li>Ve a la pestaña "Network"</li>
                            <li>Recarga la página</li>
                            <li>Haz clic en cualquier archivo y busca "Response Headers"</li>
                        </ol>
                        
                        <p><small>⚠️ <strong>Nota ética:</strong> Este asistente no escanea sitios web externos. Para una auditoría completa de headers, contacta a nuestro equipo.</small></p>
                        
                        <p><a href="#contacto" style="color: #06b6d4;">📞 Solicitar auditoría de seguridad completa</a></p>`);
    }
    
    initiateCall() {
        this.addMessage(`📞 <strong>Contactando a especialista...</strong>
                        <p>Serás redirigido para llamar a nuestro equipo de seguridad:</p>
                        <p><strong>Teléfono:</strong> +52 55 6126 4662</p>
                        <p><strong>Horario:</strong> Lunes a Viernes 9:00 - 18:00</p>
                        <p><strong>Emergencias:</strong> Disponible 24/7 para incidentes críticos</p>
                        
                        <div style="margin: 15px 0;">
                            <a href="tel:+525561264662" 
                               style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                               📞 Llamar ahora
                            </a>
                            <a href="https://wa.me/525561264662" 
                               target="_blank"
                               style="display: inline-block; background: #25D366; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-left: 10px;">
                               💬 WhatsApp
                            </a>
                        </div>`);
        
        // Registrar evento de analytics
        gtag('event', 'chatbot_call_initiated', {
            'event_category': 'engagement',
            'event_label': 'expert_call'
        });
    }
    
    handleUserMessage(message) {
        if (!message.trim()) return;
        
        // Mostrar mensaje del usuario
        this.addMessage(`<div style="text-align: right;"><strong>Tú:</strong> ${message}</div>`, 'user');
        
        // Respuesta inteligente básica
        setTimeout(() => {
            const response = this.generateResponse(message);
            this.addMessage(response);
        }, 800);
    }
    
    generateResponse(message) {
        const lowerMsg = message.toLowerCase();
        
        // Respuestas predefinidas
        if (lowerMsg.includes('hack') || lowerMsg.includes('pirate')) {
            return `🚫 <strong>Respuesta Ética:</strong> No proporcionamos servicios de hacking ilegal. 
                    Nuestro trabajo se enfoca en protección legal y ética mediante:
                    <ul>
                      <li>Pentesting autorizado</li>
                      <li>Auditorías con consentimiento</li>
                      <li>Desarrollo seguro</li>
                      <li>Capacitación en seguridad</li>
                    </ul>
                    <p>Consulta nuestro <a href="etica.html" style="color: #06b6d4;">Código Ético</a> para más información.</p>`;
        }
        
        if (lowerMsg.includes('precio') || lowerMsg.includes('costo') || lowerMsg.includes('cuánto')) {
            return `💰 <strong>Precios de Servicios:</strong>
                    <ul>
                      <li><strong>Auditoría básica:</strong> Desde $8,000 MXN</li>
                      <li><strong>Protección activa mensual:</strong> Desde $3,500 MXN/mes</li>
                      <li><strong>Respuesta a incidentes:</strong> $15,000 MXN (emergencia)</li>
                      <li><strong>Capacitación:</strong> Desde $5,000 MXN/sesión</li>
                    </ul>
                    <p><em>Los precios varían según la complejidad del proyecto.</em></p>
                    <p><a href="#contacto" style="color: #06b6d4;">📞 Solicitar cotización personalizada</a></p>`;
        }
        
        if (lowerMsg.includes('owasp') || lowerMsg.includes('vulnerabilidad')) {
            return `🔍 <strong>OWASP Top 10 2023:</strong>
                    <ol>
                      <li>Inyección</li>
                      <li>Autenticación rota</li>
                      <li>Exposición de datos sensibles</li>
                      <li>Entidades externas XML (XXE)</li>
                      <li>Control de acceso roto</li>
                      <li>Configuración de seguridad incorrecta</li>
                      <li>Cross-Site Scripting (XSS)</li>
                      <li>Deserialización insegura</li>
                      <li>Componentes con vulnerabilidades conocidas</li>
                      <li>Registro y monitoreo insuficientes</li>
                    </ol>
                    <p><a href="https://owasp.org/www-project-top-ten/" target="_blank" style="color: #06b6d4;">📚 Ver más en OWASP.org</a></p>`;
        }
        
        // Respuesta por defecto
        return `🤖 <strong>Asistente FalconMX:</strong> Entiendo que preguntas sobre "${message}". 
                Para una respuesta más precisa y personalizada, te recomiendo:
                <ol>
                  <li>Contactar directamente a nuestro equipo especializado</li>
                  <li>Programar una consulta gratuita de 30 minutos</li>
                  <li>Revisar nuestro <a href="#servicios" style="color: #06b6d4;">portafolio de servicios</a></li>
                </ol>
                <p>¿Te gustaría que te conecte con un experto humano?</p>
                <button class="expert-contact" style="background: #06b6d4; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                  📞 Conectar con experto
                </button>`;
    }
    
    addMessage(content, type = 'bot') {
        const messagesDiv = document.querySelector('.chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = content;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Agregar event listeners a botones dinámicos
        setTimeout(() => {
            const expertBtn = messageDiv.querySelector('.expert-contact');
            if (expertBtn) {
                expertBtn.addEventListener('click', () => this.initiateCall());
            }
        }, 100);
    }
    
    loadFAQ() {
        this.faqs = {
            "phishing": "Correos fraudulentos que buscan datos sensibles. No hagas clic en enlaces sospechosos.",
            "ransomware": "Malware que cifra archivos. Mantén backups 3-2-1 y no pagues rescates.",
            "auditoria": "Proceso sistemático para identificar vulnerabilidades. Incluye reporte y plan de remediación."
        };
    }
    
    setupSecurityTools() {
        // Herramientas adicionales podrían cargarse aquí
        console.log('Herramientas de seguridad inicializadas correctamente.');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para no interferir con la carga de la página
    setTimeout(() => {
        window.SecurityChatbot = new SecurityChatbot();
        
        // Evento para analytics
        gtag('event', 'chatbot_loaded', {
            'event_category': 'engagement',
            'event_label': 'chatbot_initialization'
        });
    }, 2000);
});
