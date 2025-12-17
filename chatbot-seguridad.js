// chatbot-seguridad.js - AGENTE IA ÉTICO PARA CIBERSEGURIDAD
class SecurityChatbot {
    constructor() {
        this.config = {
            nombre: "Falcon Assistant",
            version: "2.1", // Actualizada versión
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
        <div id="security-chatbot" style="display: none; position: fixed; bottom: 100px; right: 20px; width: 350px; background: #0f172a; border: 2px solid #06b6d4; border-radius: 12px; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: sans-serif; flex-direction: column; height: 500px;">
            <div class="chat-header" style="background: linear-gradient(135deg, #1e40af 0%, #0a192f 100%); color: white; padding: 15px; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 1.5rem;">🛡️</div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem;">${this.config.nombre}</h3>
                        <small style="color: #94a3b8;">Asistente Ético v${this.config.version}</small>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="chat-minimize" style="background: rgba(255,255,255,0.1); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">─</button>
                    <button class="close-chat" style="background: rgba(255,255,255,0.1); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;">×</button>
                </div>
            </div>
            
            <div class="chat-messages" style="flex: 1; overflow-y: auto; padding: 20px; background: #0f172a;">
                <div class="message bot" style="background: #1e293b; padding: 12px 15px; border-radius: 12px; margin: 10px 0; border-left: 4px solid #06b6d4; max-width: 85%;">
                    <p>¡Hola! Soy tu asistente de ciberseguridad ética de <strong>FalconMX Security</strong>.</p>
                    <p>Puedo ayudarte con:</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
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
                    <button class="quick-btn" data-question="phishing" style="background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;">¿Cómo identificar phishing?</button>
                    <button class="quick-btn" data-question="passwords" style="background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;">Contraseñas seguras</button>
                    <button class="quick-btn" data-question="ransomware" style="background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;">Protección ransomware</button>
                </div>
                
                <div class="input-wrapper" style="display: flex; gap: 10px;">
                    <input type="text" placeholder="Escribe tu pregunta..." class="chat-input" style="flex: 1; padding: 12px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: white; font-size: 0.9rem;">
                    <button class="send-btn" style="background: #06b6d4; color: white; border: none; width: 45px; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: background 0.2s;">➤</button>
                </div>
            </div>
            
            <div class="chat-tools" style="background: #1e293b; border-top: 1px solid #334155; padding: 15px;">
                <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">🔧 Herramientas de seguridad</div>
                <div class="tools-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <button class="tool-btn" data-tool="password" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 8px; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; transition: all 0.2s;">
                        <div style="font-size: 1.5rem;">🔐</div>
                        <span style="font-size: 0.8rem; text-align: center;">Generar Contraseña</span>
                    </button>
                    <button class="tool-btn" data-tool="checklist" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 8px; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; transition: all 0.2s;">
                        <div style="font-size: 1.5rem;">📋</div>
                        <span style="font-size: 0.8rem; text-align: center;">Checklist Seguridad</span>
                    </button>
                    <button class="tool-btn" data-tool="headers" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 8px; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; transition: all 0.2s;">
                        <div style="font-size: 1.5rem;">🌐</div>
                        <span style="font-size: 0.8rem; text-align: center;">Verificar Headers</span>
                    </button>
                    <button class="tool-btn" data-tool="call" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 8px; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; transition: all 0.2s;">
                        <div style="font-size: 1.5rem;">📞</div>
                        <span style="font-size: 0.8rem; text-align: center;">Llamar al Experto</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="chatbot-toggle" class="chatbot-toggle-btn" style="position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: linear-gradient(135deg, #1e40af, #06b6d4); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 6px 20px rgba(6,182,212,0.4); z-index: 9998; transition: all 0.3s;">
            <div style="font-size: 1.8rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">🛡️</div>
            <div class="pulse-dot" style="position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        
        // Añadir animación de pulso
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            
            .quick-btn:hover, .tool-btn:hover, .send-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            
            .quick-btn:hover {
                background: rgba(6,182,212,0.25) !important;
            }
            
            .tool-btn:hover {
                border-color: #06b6d4 !important;
                background: #1e293b !important;
            }
            
            .send-btn:hover {
                background: #0891b2 !important;
            }
            
            #chatbot-toggle:hover {
                transform: scale(1.1) rotate(5deg);
                box-shadow: 0 8px 25px rgba(6,182,212,0.5);
            }
        `;
        document.head.appendChild(style);
        
        // Mensaje de bienvenida con delay
        setTimeout(() => {
            this.addMessage("💡 <strong>Tip rápido:</strong> Siempre mantén actualizado tu software y usa autenticación de dos factores.");
        }, 500);
    }
    
    setupEventListeners() {
        // Toggle button
        const toggleBtn = document.getElementById('chatbot-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleChat());
        }
        
        // Close button
        const closeBtn = document.querySelector('.close-chat');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeChat());
        }
        
        // Minimize button
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
                if (input.value.trim()) {
                    this.handleUserMessage(input.value);
                    input.value = '';
                }
            });
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
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
            const isMinimized = chat.style.height === '60px';
            chat.style.height = isMinimized ? '500px' : '60px';
            
            // Ocultar/mostrar secciones cuando está minimizado
            const sections = ['chat-input-area', 'chat-tools', 'chat-messages'];
            sections.forEach(section => {
                const el = chat.querySelector(`.${section}`);
                if (el) {
                    el.style.display = isMinimized ? 'block' : 'none';
                }
            });
        }
    }
    
    handleQuickQuestion(question) {
        const responses = {
            'phishing': `🔍 <strong>Identificación de Phishing:</strong>
                         <ul style="margin: 10px 0; padding-left: 20px;">
                           <li>Verifica el remitente (correos falsos suelen tener dominios extraños)</li>
                           <li>No hagas clic en enlaces sospechosos</li>
                           <li>Busca errores gramaticales y ortográficos</li>
                           <li>Las empresas legítimas nunca piden datos sensibles por email</li>
                           <li>Usa filtros antispam y antivirus actualizados</li>
                         </ul>
                         <p><small>🔒 <strong>Próximo paso:</strong> Considera implementar simulaciones de phishing para tu equipo.</small></p>`,
            
            'passwords': `🔐 <strong>Contraseñas Seguras:</strong>
                          <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Mínimo 12 caracteres (recomendado 16+)</li>
                            <li>Mezcla mayúsculas, minúsculas, números y símbolos</li>
                            <li>No uses información personal (nombres, fechas)</li>
                            <li>Usa frases únicas en lugar de palabras simples</li>
                            <li><strong>Herramienta recomendada:</strong> Gestor de contraseñas como Bitwarden</li>
                          </ul>
                          <button class="tool-btn" data-tool="password" style="background: rgba(6,182,212,0.2); color: #06b6d4; border: 1px solid #06b6d4; padding: 8px 15px; border-radius: 6px; cursor: pointer; margin-top: 10px;">
                            🛠️ Generar contraseña segura ahora
                          </button>`,
            
            'ransomware': `🦠 <strong>Protección contra Ransomware:</strong>
                           <ul style="margin: 10px 0; padding-left: 20px;">
                             <li><strong>Backups 3-2-1:</strong> 3 copias, 2 medios diferentes, 1 externa</li>
                             <li>Actualiza siempre tu software y sistemas</li>
                             <li>Usa antivirus/antimalware actualizado</li>
                             <li>Capacita a tu equipo para identificar amenazas</li>
                             <li><strong>NO PAGUES RESCATES</strong> - Contacta a expertos inmediatamente</li>
                           </ul>
                           <p><small>📞 <strong>Emergencia:</strong> Si estás siendo atacado, llama al <a href="tel:+525561264662" style="color: #06b6d4;">55 6126 4662</a> inmediatamente.</small></p>`
        };
        
        this.addMessage(responses[question] || "🤔 <strong>Pregunta no reconocida:</strong> Por favor, formula tu pregunta de manera diferente o contacta a nuestro equipo especializado.");
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
                        <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 1.1rem; letter-spacing: 1px; word-break: break-all;">
                          ${password}
                        </div>
                        <div style="background: rgba(6,182,212,0.1); padding: 10px; border-radius: 6px; margin: 10px 0;">
                          <p style="margin: 0; font-size: 0.9rem;"><strong>🔒 Recomendaciones:</strong></p>
                          <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 0.85rem;">
                            <li>Usa un gestor de contraseñas como Bitwarden (gratuito)</li>
                            <li>Cambia esta contraseña cada 90 días</li>
                            <li>No la reutilices en múltiples servicios</li>
                            <li>Habilita autenticación de dos factores donde sea posible</li>
                          </ul>
                        </div>`);
    }
    
    showSecurityChecklist() {
        const checklistHTML = `
        <div class="security-checklist">
            <h4 style="margin: 0 0 10px 0;">📋 Checklist Básico de Seguridad Digital</h4>
            <p style="margin: 0 0 15px 0; font-size: 0.9rem; color: #94a3b8;">Marca los puntos que ya tienes implementados:</p>
            
            <div style="margin: 8px 0; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; display: flex; align-items: center;">
                <input type="checkbox" id="check1" style="margin-right: 10px; accent-color: #06b6d4;">
                <label for="check1" style="color: #e2e8f0; font-size: 0.9rem; flex: 1;">
                    <strong>HTTPS</strong> implementado en todo el sitio (SSL/TLS)
                </label>
            </div>
            
            <div style="margin: 8px 0; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; display: flex; align-items: center;">
                <input type="checkbox" id="check2" style="margin-right: 10px; accent-color: #06b6d4;">
                <label for="check2" style="color: #e2e8f0; font-size: 0.9rem; flex: 1;">
                    <strong>Backups regulares</strong> (regla 3-2-1: 3 copias, 2 medios, 1 externa)
                </label>
            </div>
            
            <div style="margin: 8px 0; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; display: flex; align-items: center;">
                <input type="checkbox" id="check3" style="margin-right: 10px; accent-color: #06b6d4;">
                <label for="check3" style="color: #e2e8f0; font-size: 0.9rem; flex: 1;">
                    <strong>Autenticación MFA/2FA</strong> activada en servicios críticos
                </label>
            </div>
            
            <div style="margin: 8px 0; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; display: flex; align-items: center;">
                <input type="checkbox" id="check4" style="margin-right: 10px; accent-color: #06b6d4;">
                <label for="check4" style="color: #e2e8f0; font-size: 0.9rem; flex: 1;">
                    <strong>Actualizaciones automáticas</strong> habilitadas
                </label>
            </div>
            
            <div style="margin: 8px 0; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; display: flex; align-items: center;">
                <input type="checkbox" id="check5" style="margin-right: 10px; accent-color: #06b6d4;">
                <label for="check5" style="color: #e2e8f0; font-size: 0.9rem; flex: 1;">
                    <strong>Firewall/WAF</strong> configurado y activo
                </label>
            </div>
            
            <button id="calculate-score" style="margin-top: 15px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; transition: background 0.2s;">
                📊 Calcular mi puntuación de seguridad
            </button>
            
            <div id="checklist-result" style="margin-top: 15px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; display: none;">
                <p style="margin: 0; font-weight: 600;" id="checklist-score">Puntuación: 0/5</p>
                <p style="margin: 10px 0 0 0; font-size: 0.9em;" id="checklist-advice"></p>
            </div>
            
            <p style="margin-top: 15px; font-size: 0.85em; color: #94a3b8;">
                ¿Necesitas ayuda con algún punto? 
                <a href="https://wa.me/525561264662?text=Necesito%20ayuda%20con%20el%20checklist%20de%20seguridad%20-%20Puntuación%3A%20" 
                   target="_blank" 
                   style="color: #06b6d4; text-decoration: none; font-weight: 600;">
                   📞 Contactar a un experto
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
                    this.calculateChecklistScore();
                });
            }
        }, 100);
    }
    
    calculateChecklistScore() {
        const checks = document.querySelectorAll('.security-checklist input[type="checkbox"]:checked');
        const score = checks.length;
        const total = 5;
        const percentage = Math.round((score / total) * 100);
        
        let advice = "";
        let adviceColor = "";
        
        if (percentage >= 90) {
            advice = "🎉 <strong>¡Excelente!</strong> Tu postura de seguridad es sólida. Considera auditorías periódicas para mantenerla.";
            adviceColor = "#10b981";
        } else if (percentage >= 70) {
            advice = "👍 <strong>Buen trabajo.</strong> Te falta poco para tener una seguridad robusta. Enfócate en los puntos pendientes.";
            adviceColor = "#3b82f6";
        } else if (percentage >= 50) {
            advice = "⚠️ <strong>Necesitas mejorar.</strong> Prioriza la implementación de los puntos críticos como backups y MFA.";
            adviceColor = "#f59e0b";
        } else {
            advice = "🚨 <strong>Urgente mejorar.</strong> Tu seguridad está comprometida. Contacta a un experto inmediatamente.";
            adviceColor = "#ef4444";
        }
        
        const resultDiv = document.getElementById('checklist-result');
        const scoreElement = document.getElementById('checklist-score');
        const adviceElement = document.getElementById('checklist-advice');
        
        if (resultDiv && scoreElement && adviceElement) {
            resultDiv.style.display = 'block';
            scoreElement.innerHTML = `📊 <strong>Puntuación:</strong> ${score}/${total} (${percentage}%)`;
            scoreElement.style.color = adviceColor;
            adviceElement.innerHTML = advice;
            adviceElement.style.color = adviceColor;
            
            // Actualizar enlace de WhatsApp con la puntuación
            const whatsappLink = document.querySelector('.security-checklist a[href*="whatsapp"]');
            if (whatsappLink) {
                const currentHref = whatsappLink.getAttribute('href');
                const newHref = currentHref.replace(/-%20Puntuación%3A%20$/, `- Puntuación: ${score}/${total} (${percentage}%)`);
                whatsappLink.setAttribute('href', newHref);
            }
        }
    }
    
    checkSecurityHeaders() {
        this.addMessage(`🌐 <strong>Verificación de Headers de Seguridad (Modo Educativo)</strong>
                        
                        <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin: 10px 0;">
                            <p style="margin: 0 0 10px 0;"><strong>🔒 Headers de seguridad HTTP recomendados:</strong></p>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li><code style="background: #0f172a; padding: 2px 6px; border-radius: 4px;">Content-Security-Policy</code>: Previene ataques XSS</li>
                                <li><code style="background: #0f172a; padding: 2px 6px; border-radius: 4px;">X-Frame-Options</code>: Previene clickjacking</li>
                                <li><code style="background: #0f172a; padding: 2px 6px; border-radius: 4px;">Strict-Transport-Security</code>: Fuerza conexiones HTTPS</li>
                                <li><code style="background: #0f172a; padding: 2px 6px; border-radius: 4px;">X-Content-Type-Options</code>: Previene MIME sniffing</li>
                                <li><code style="background: #0f172a; padding: 2px 6px; border-radius: 4px;">Referrer-Policy</code>: Controla información de referencia</li>
                            </ul>
                        </div>
                        
                        <p style="font-size: 0.9rem;"><strong>📋 Para verificar tus headers:</strong></p>
                        <ol style="margin: 10px 0; padding-left: 20px; font-size: 0.9rem;">
                            <li>Abre las herramientas de desarrollador (F12)</li>
                            <li>Ve a la pestaña "Network"</li>
                            <li>Recarga la página</li>
                            <li>Haz clic en cualquier archivo y busca "Response Headers"</li>
                        </ol>
                        
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
                            <p style="margin: 0; font-size: 0.85rem;"><strong>⚠️ Nota ética importante:</strong></p>
                            <p style="margin: 5px 0 0 0; font-size: 0.8rem;">Este asistente no escanea sitios web externos sin autorización. Para una auditoría completa de headers y seguridad, contacta a nuestro equipo para un servicio profesional autorizado.</p>
                        </div>
                        
                        <p style="margin-top: 15px;">
                            <a href="#contacto" style="background: linear-gradient(135deg, #06b6d4, #1e40af); color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                                📞 Solicitar auditoría de seguridad completa
                            </a>
                        </p>`);
    }
    
    initiateCall() {
        this.addMessage(`📞 <strong>Contactando a especialista...</strong>
                        
                        <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #10b981;">
                            <p style="margin: 0 0 10px 0;"><strong>Información de contacto:</strong></p>
                            <p style="margin: 5px 0;"><strong>📞 Teléfono:</strong> <a href="tel:+525561264662" style="color: #06b6d4; text-decoration: none;">+52 55 6126 4662</a></p>
                            <p style="margin: 5px 0;"><strong>✉️ Email:</strong> <a href="mailto:mariofalcon030901@gmail.com" style="color: #06b6d4; text-decoration: none;">mariofalcon030901@gmail.com</a></p>
                            <p style="margin: 5px 0;"><strong>🕐 Horario:</strong> Lunes a Viernes 9:00 - 18:00</p>
                            <p style="margin: 5px 0;"><strong>🚨 Emergencias:</strong> Disponible 24/7 para incidentes críticos</p>
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap;">
                            <a href="tel:+525561264662" 
                               style="flex: 1; background: #10b981; color: white; padding: 12px; border-radius: 6px; text-decoration: none; font-weight: 600; text-align: center; min-width: 120px;">
                               📞 Llamar ahora
                            </a>
                            <a href="https://wa.me/525561264662" 
                               target="_blank"
                               style="flex: 1; background: #25D366; color: white; padding: 12px; border-radius: 6px; text-decoration: none; font-weight: 600; text-align: center; min-width: 120px;">
                               💬 WhatsApp
                            </a>
                        </div>
                        
                        <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 10px;">
                            <strong>💡 Tip:</strong> Para emergencias, menciona "INCIDENTE DE SEGURIDAD" para atención prioritaria.
                        </p>`);
        
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
        this.addMessage(`<div style="text-align: right;">
                            <div style="background: #1e40af; padding: 10px 15px; border-radius: 12px; display: inline-block; max-width: 90%; border-right: 4px solid #3b82f6;">
                                <strong style="display: block; font-size: 0.85rem; margin-bottom: 3px;">Tú:</strong>
                                <span>${this.escapeHtml(message)}</span>
                            </div>
                         </div>`, 'user');
        
        // Respuesta inteligente básica con delay
        setTimeout(() => {
            this.generateAIResponse(message);
        }, 800);
    }
    
    generateAIResponse(message) {
        const lowerMsg = message.toLowerCase();
        let response = '';
        
        if (lowerMsg.includes('hola') || lowerMsg.includes('buenos') || lowerMsg.includes('hello')) {
            response = `👋 <strong>¡Hola!</strong> Soy el asistente de FalconMX Security. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre seguridad, usar las herramientas o contactar a un experto humano.`;
            
        } else if (lowerMsg.includes('hack') || lowerMsg.includes('pirate') || lowerMsg.includes('ilegal')) {
            response = `🚫 <strong>Respuesta Ética:</strong> En FalconMX Security operamos estrictamente dentro del marco legal y ético. 
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px; margin: 10px 0;">
                            <p style="margin: 0; font-size: 0.9rem;"><strong>Nuestros servicios legítimos incluyen:</strong></p>
                            <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 0.85rem;">
                                <li>Pentesting ético con autorización por escrito</li>
                                <li>Auditorías de seguridad autorizadas</li>
                                <li>Desarrollo seguro (DevSecOps)</li>
                                <li>Capacitación en ciberseguridad</li>
                                <li>Respuesta a incidentes legítimos</li>
                            </ul>
                        </div>
                        <p><small>Consulta nuestro <a href="etica.html" style="color: #06b6d4;">Código Ético</a> para más información.</small></p>`;
            
        } else if (lowerMsg.includes('precio') || lowerMsg.includes('costo') || lowerMsg.includes('cuánto') || lowerMsg.includes('tarifa')) {
            response = `💰 <strong>Información de Precios:</strong>
                        <div style="background: rgba(6, 182, 212, 0.1); padding: 12px; border-radius: 8px; margin: 10px 0;">
                            <p style="margin: 0 0 8px 0;"><strong>Servicios principales:</strong></p>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li><strong>Auditoría básica:</strong> Desde $8,000 MXN</li>
                                <li><strong>Protección activa mensual:</strong> Desde $3,500 MXN/mes</li>
                                <li><strong>Respuesta a incidentes:</strong> $15,000 MXN (emergencia)</li>
                                <li><strong>Capacitación:</strong> Desde $5,000 MXN/sesión</li>
                                <li><strong>Desarrollo seguro:</strong> Desde $12,000 MXN/mes</li>
                            </ul>
                            <p style="margin: 10px 0 0 0; font-size: 0.9rem;"><em>※ Los precios varían según complejidad y alcance.</em></p>
                        </div>
                        <p>
                            <a href="#contacto" style="background: linear-gradient(135deg, #06b6d4, #1e40af); color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 5px;">
                                📋 Solicitar cotización personalizada
                            </a>
                        </p>`;
            
        } else if (lowerMsg.includes('auditor') || lowerMsg.includes('pentest') || lowerMsg.includes('vulnerabilid')) {
            response = `🔍 <strong>Auditorías de Seguridad Profesionales:</strong>
                        <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin: 10px 0;">
                            <p style="margin: 0 0 10px 0;"><strong>Nuestro proceso incluye:</strong></p>
                            <ol style="margin: 0; padding-left: 20px;">
                                <li>Evaluación inicial y alcance</li>
                                <li>Análisis de vulnerabilidades OWASP Top 10</li>
                                <li>Pruebas de penetración éticas</li>
                                <li>Revisión de configuración y hardening</li>
                                <li>Reporte ejecutivo + técnico detallado</li>
                                <li>Plan de remediación paso a paso</li>
                            </ol>
                        </div>
                        <p><strong>📞 ¿Te interesa una auditoría?</strong> Contacta a nuestro equipo para una consulta gratuita de 30 minutos.</p>
                        <button class="tool-btn" data-tool="call" style="background: rgba(6,182,212,0.2); color: #06b6d4; border: 1px solid #06b6d4; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-top: 10px;">
                            📞 Contactar para auditoría
                        </button>`;
            
        } else if (lowerMsg.includes('gracias') || lowerMsg.includes('thank')) {
            response = `🙏 <strong>¡De nada!</strong> Estoy aquí para ayudar. Recuerda que siempre puedes contactar a nuestro equipo humano para consultas más específicas o emergencias. ¡Que tengas un día seguro!`;
            
        } else {
            // Respuesta por defecto con sugerencias
            response = `🤖 <strong>Asistente FalconMX:</strong> Entiendo que preguntas sobre <em>"${this.escapeHtml(message.substring(0, 50))}..."</em>
                        
                        <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px; margin: 10px 0;">
                            <p style="margin: 0 0 8px 0; font-weight: 600;">💡 Te sugiero:</p>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li>Contactar directamente a nuestro equipo especializado</li>
                                <li>Usar nuestro formulario de contacto para una respuesta detallada</li>
                                <li>Probar nuestras herramientas interactivas de seguridad</li>
                                <li>Revisar nuestro portafolio de servicios</li>
                            </ul>
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                            <button class="tool-btn" data-tool="call" style="flex: 1; background: rgba(6,182,212,0.2); color: #06b6d4; border: 1px solid #06b6d4; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; min-width: 140px;">
                                📞 Contactar experto
                            </button>
                            <button class="quick-btn" data-question="phishing" style="flex: 1; background: rgba(6,182,212,0.2); color: #06b6d4; border: 1px solid #06b6d4; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; min-width: 140px;">
                                🔍 Ver phishing FAQ
                            </button>
                        </div>`;
        }
        
        this.addMessage(response);
    }
    
    addMessage(content, type = 'bot') {
        const messagesDiv = document.querySelector('.chat-messages');
        if (!messagesDiv) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        if (type === 'user') {
            messageDiv.style.cssText = 'margin: 10px 0; text-align: right;';
            messageDiv.innerHTML = content;
        } else {
            messageDiv.style.cssText = 'background: #1e293b; padding: 12px 15px; border-radius: 12px; margin: 10px 0; border-left: 4px solid #06b6d4; max-width: 85%;';
            messageDiv.innerHTML = content;
            
            // Re-bind event listeners for any new buttons
            setTimeout(() => {
                this.rebindEventListeners(messageDiv);
            }, 50);
        }
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Smooth scroll animation
        messagesDiv.style.scrollBehavior = 'smooth';
    }
    
    rebindEventListeners(element) {
        // Re-bind buttons in the new message
        element.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.closest('.tool-btn').dataset.tool;
                this.handleTool(tool);
            });
        });
        
        element.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.closest('.quick-btn').dataset.question;
                this.handleQuickQuestion(question);
            });
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    loadFAQ() {
        this.faqs = {
            "phishing": "Correos fraudulentos que buscan datos sensibles.",
            "ransomware": "Malware que cifra archivos. Mantén backups 3-2-1.",
            "auditoria": "Proceso sistemático para identificar vulnerabilidades."
        };
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.SecurityChatbot = new SecurityChatbot();
            console.log('✅ Chatbot FalconMX Security inicializado correctamente');
        }, 2000);
    });
} else {
    setTimeout(() => {
        window.SecurityChatbot = new SecurityChatbot();
        console.log('✅ Chatbot FalconMX Security inicializado correctamente');
    }, 2000);
}

// Polyfill para navegadores antiguos
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || 
                                Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        var el = this;
        if (!document.documentElement.contains(el)) return null;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1); 
        return null;
    };
}
