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
            emailSoporte: "mariofalcon030901@gmail.com"
        };
        
        this.ethicalDisclaimer = "🚫 <strong>Límites Éticos:</strong> Este asistente solo proporciona recomendaciones generales. No realiza hacking, no accede a sistemas sin autorización y no almacena datos sensibles.";
        
        this.init();
    }
    
    init() {
        this.createInterface();
        this.setupEventListeners();
        this.loadFAQ();
    }
    
    createInterface() {
        const chatHTML = `
        <div id="security-chatbot" style="display: none; position: fixed; bottom: 100px; right: 20px; width: 380px; background: #0f172a; border: 2px solid #06b6d4; border-radius: 12px; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: sans-serif; flex-direction: column; height: 500px;">
            <div class="chat-header" style="background: linear-gradient(135deg, #1e40af 0%, #0a192f 100%); color: white; padding: 15px; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 1.5rem;">🛡️</div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem;">${this.config.nombre}</h3>
                        <small style="color: #94a3b8;">Asistente Ético v${this.config.version}</small>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="chat-minimize" style="background: rgba(255,255,255,0.1); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">─</button>
                    <button class="close-chat" style="background: rgba(255,255,255,0.1); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;">×</button>
                </div>
            </div>
            
            <div class="chat-messages" style="flex: 1; overflow-y: auto; padding: 20px; background: #0f172a;">
                <div class="message bot" style="background: #1e293b; padding: 12px 15px; border-radius: 12px; margin: 10px 0; border-left: 4px solid #06b6d4;">
                    <p>¡Hola! Soy tu asistente de ciberseguridad ética de <strong>FalconMX Security</strong>.</p>
                    <p>Puedo ayudarte con:</p>
                    <ul>
                        <li>✅ Evaluación básica de seguridad</li>
                        <li>✅ Recomendaciones de mejores prácticas</li>
                        <li>✅ Herramientas interactivas</li>
                        <li>✅ Derivación a experto humano</li>
                    </ul>
                    <p><small>${this.ethicalDisclaimer}</small></p>
                </div>
            </div>
            
            <div class="chat-input-area" style="padding: 15px; background: #1e293b; border-top: 1px solid #334155;">
                <div class="quick-questions" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">
                    <button class="quick-btn" data-question="phishing" style="background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); padding: 6px 12px; border-radius: 20px; cursor: pointer;">¿Cómo identificar phishing?</button>
                    <button class="quick-btn" data-question="passwords" style="background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); padding: 6px 12px; border-radius: 20px; cursor: pointer;">Contraseñas seguras</button>
                </div>
                
                <div class="input-wrapper" style="display: flex; gap: 10px;">
                    <input type="text" placeholder="Escribe tu pregunta..." class="chat-input" style="flex: 1; padding: 12px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: white;">
                    <button class="send-btn" style="background: #06b6d4; color: white; border: none; width: 45px; border-radius: 8px; cursor: pointer;">➤</button>
                </div>
            </div>
            
            <div class="chat-tools" style="background: #1e293b; border-top: 1px solid #334155; padding: 15px;">
                <div class="tools-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <button class="tool-btn" data-tool="password" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 15px; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div>🔐</div>
                        <span>Generar Contraseña</span>
                    </button>
                    <button class="tool-btn" data-tool="checklist" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 15px; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div>📋</div>
                        <span>Checklist Seguridad</span>
                    </button>
                    <button class="tool-btn" data-tool="headers" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 15px; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div>🌐</div>
                        <span>Verificar Headers</span>
                    </button>
                    <button class="tool-btn" data-tool="call" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 15px; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div>📞</div>
                        <span>Llamar al Experto</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="chatbot-toggle" class="chatbot-toggle-btn" style="position: fixed; bottom: 30px; right: 30px; width: 70px; height: 70px; background: linear-gradient(135deg, #1e40af, #06b6d4); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 25px rgba(6,182,212,0.4); z-index: 9998; transition: all 0.3s;">
            <div style="font-size: 2rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">🛡️</div>
            <div class="pulse-dot" style="position: absolute; top: 10px; right: 10px; width: 12px; height: 12px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        this.addMessage("💡 <strong>Tip rápido:</strong> Siempre mantén actualizado tu software y usa autenticación de dos factores.");
        
        // Añadir animación de pulso
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        const toggleBtn = document.getElementById('chatbot-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleChat());
        }
        
        const closeBtn = document.querySelector('.close-chat');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeChat());
        }
        
        const minimizeBtn = document.querySelector('.chat-minimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.minimizeChat());
        }
        
        // Quick buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.dataset.question;
                this.handleQuickQuestion(question);
            });
        });
        
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.closest('.tool-btn').dataset.tool;
                this.handleTool(tool);
            });
        });
        
        // Chat input
        const input = document.querySelector('.chat-input');
        const sendBtn = document.querySelector('.send-btn');
        
        if (sendBtn && input) {
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
    }
    
    toggleChat() {
        const chat = document.getElementById('security-chatbot');
        const toggle = document.getElementById('chatbot-toggle');
        
        if (chat && toggle) {
            if (chat.style.display === 'none' || chat.style.display === '') {
                chat.style.display = 'flex';
                toggle.style.opacity = '0.5';
                
                // Google Analytics event
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'chatbot_open', {
                        'event_category': 'engagement',
                        'event_label': 'chatbot_interaction'
                    });
                }
            } else {
                this.minimizeChat();
            }
        }
    }
    
    closeChat() {
        const chat = document.getElementById('security-chatbot');
        const toggle = document.getElementById('chatbot-toggle');
        if (chat && toggle) {
            chat.style.display = 'none';
            toggle.style.opacity = '1';
        }
    }
    
    minimizeChat() {
        const chat = document.getElementById('security-chatbot');
        if (chat) {
            chat.style.height = chat.style.height === '60px' ? '500px' : '60px';
        }
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
                            <li><strong>Herramienta recomendada:</strong> Gestor de contraseñas como Bitwarden</li>
                          </ul>`
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
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px;">
                <input type="checkbox" id="check1" style="margin-right: 10px;">
                <label for="check1" style="color: #e2e8f0; font-size: 0.9rem;">
                    <strong>HTTPS</strong> implementado en todo el sitio
                </label>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px;">
                <input type="checkbox" id="check2" style="margin-right: 10px;">
                <label for="check2" style="color: #e2e8f0; font-size: 0.9rem;">
                    <strong>Backups regulares</strong> (regla 3-2-1)
                </label>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px;">
                <input type="checkbox" id="check3" style="margin-right: 10px;">
                <label for="check3" style="color: #e2e8f0; font-size: 0.9rem;">
                    <strong>Autenticación MFA/2FA</strong> activada
                </label>
            </div>
            
            <button id="calculate-score" style="margin-top: 15px; padding: 8px 15px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Calcular mi puntuación
            </button>
            
            <p style="margin-top: 15px; font-size: 0.9em;">
                ¿Necesitas ayuda? 
                <a href="https://wa.me/525561264662?text=Necesito%20ayuda%20con%20el%20checklist%20de%20seguridad" 
                   target="_blank" 
                   style="color: #06b6d4;">
                   📞 Contactar experto
                </a>
            </p>
        </div>
        `;
        
        this.addMessage(checklistHTML);
        
        // Agregar funcionalidad al botón de calcular
        setTimeout(() => {
            const calculateBtn = document.getElementById('calculate-score');
            if (calculateBtn) {
                calculateBtn.addEventListener('click', () => {
                    const checks = document.querySelectorAll('.security-checklist input[type="checkbox"]:checked');
                    const score = checks.length;
                    const total = 3;
                    const percentage = Math.round((score / total) * 100);
                    
                    let advice = "";
                    if (percentage >= 100) {
                        advice = "🎉 ¡Excelente! Tu postura de seguridad es sólida.";
                    } else if (percentage >= 66) {
                        advice = "👍 Buen comienzo. Te recomiendo implementar todos los puntos.";
                    } else {
                        advice = "⚠️ Necesitas mejorar. Prioriza HTTPS, backups y MFA.";
                    }
                    
                    this.addMessage(`📊 <strong>Tu puntuación:</strong> ${score}/${total} (${percentage}%)<br>${advice}`);
                });
            }
        }, 100);
    }
    
    checkSecurityHeaders() {
        this.addMessage(`🌐 <strong>Verificación de Headers de Seguridad (Modo Educativo)</strong>
                        
                        <p>Los headers de seguridad HTTP son cruciales para proteger tu sitio web:</p>
                        
                        <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin: 10px 0;">
                            <p><strong>🔒 Headers recomendados:</strong></p>
                            <ul>
                                <li><code>Content-Security-Policy</code>: Previene XSS</li>
                                <li><code>X-Frame-Options</code>: Previene clickjacking</li>
                                <li><code>Strict-Transport-Security</code>: Fuerza HTTPS</li>
                            </ul>
                        </div>
                        
                        <p><a href="#contacto" style="color: #06b6d4;">📞 Solicitar auditoría de seguridad completa</a></p>`);
    }
    
    initiateCall() {
        this.addMessage(`📞 <strong>Contactando a especialista...</strong>
                        <p>Serás redirigido para llamar a nuestro equipo de seguridad:</p>
                        <p><strong>Teléfono:</strong> +52 55 6126 4662</p>
                        
                        <div style="margin: 15px 0;">
                            <a href="tel:+525561264662" 
                               style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                               📞 Llamar ahora
                            </a>
                        </div>`);
        
        // Registrar evento de analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'chatbot_call_initiated', {
                'event_category': 'engagement',
                'event_label': 'expert_call'
            });
        }
    }
    
    handleUserMessage(message) {
        if (!message.trim()) return;
        
        // Mostrar mensaje del usuario
        this.addMessage(`<div style="text-align: right;"><strong>Tú:</strong> ${message}</div>`, 'user');
        
        // Respuesta inteligente básica
        setTimeout(() => {
            const lowerMsg = message.toLowerCase();
            let response = '';
            
            if (lowerMsg.includes('hack') || lowerMsg.includes('pirate')) {
                response = `🚫 <strong>Respuesta Ética:</strong> No proporcionamos servicios de hacking ilegal. 
                            Nuestro trabajo se enfoca en protección legal y ética mediante pentesting autorizado.`;
            } else if (lowerMsg.includes('precio') || lowerMsg.includes('costo')) {
                response = `💰 <strong>Precios:</strong>
                            <ul>
                              <li>Auditoría básica: Desde $8,000 MXN</li>
                              <li>Protección mensual: Desde $3,500 MXN/mes</li>
                              <li>Respuesta a incidentes: $15,000 MXN</li>
                            </ul>
                            <p><a href="#contacto" style="color: #06b6d4;">📞 Solicitar cotización</a></p>`;
            } else {
                response = `🤖 <strong>Asistente FalconMX:</strong> Para una respuesta más precisa, te recomiendo contactar directamente a nuestro equipo especializado al <strong>55 6126 4662</strong> o usar nuestro formulario de contacto.`;
            }
            
            this.addMessage(response);
        }, 800);
    }
    
    addMessage(content, type = 'bot') {
        const messagesDiv = document.querySelector('.chat-messages');
        if (!messagesDiv) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.style.cssText = type === 'user' 
            ? 'background: #1e40af; padding: 12px 15px; border-radius: 12px; margin: 10px 0; margin-left: auto; border-right: 4px solid #3b82f6; text-align: right; max-width: 85%;'
            : 'background: #1e293b; padding: 12px 15px; border-radius: 12px; margin: 10px 0; border-left: 4px solid #06b6d4; max-width: 85%;';
        
        messageDiv.innerHTML = content;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    loadFAQ() {
        this.faqs = {
            "phishing": "Correos fraudulentos que buscan datos sensibles.",
            "ransomware": "Malware que cifra archivos. Mantén backups."
        };
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.SecurityChatbot = new SecurityChatbot();
        }, 3000);
    });
} else {
    setTimeout(() => {
        window.SecurityChatbot = new SecurityChatbot();
    }, 3000);
}
