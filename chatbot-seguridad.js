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
                    <div
