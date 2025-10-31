// Navegación suave
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Chat functionality
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex';
}

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');
    
    if (userInput.value.trim() === '') return;
    
    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'message user-message';
    userMessage.textContent = userInput.value;
    chatMessages.appendChild(userMessage);
    
    // Simulate bot response
    setTimeout(() => {
        const botMessage = document.createElement('div');
        botMessage.className = 'message bot-message';
        botMessage.textContent = getBotResponse(userInput.value);
        chatMessages.appendChild(botMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
    
    userInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getBotResponse(input) {
    const responses = {
        'hola': '¡Hola! Soy el asistente de MxFalcon Security. ¿Necesitas ayuda con auditoría de seguridad, pentesting o consultoría?',
        'servicio': '🔒 Ofrecemos: \n• Auditoría de Seguridad\n• Pentesting\n• Consultoría 24/7\n\n¿Cuál servicio te interesa?',
        'precio': '💵 Los precios son personalizados según tus necesidades. ¿Qué servicio específico necesitas para darte un presupuesto exacto?',
        'contacto': '📧 Contacto:\n• Email: contacto@mxfalcon.com\n• Tel: +52 55 1234 5678\n• Ubicación: CDMX, México',
        'emergencia': '🚨 PARA EMERGENCIAS:\nLlama al: +52 55 9999 8888\nSoporte 24/7 disponible',
        'auditoria': '🔍 AUDITORÍA DE SEGURIDAD:\nEvaluamos vulnerabilidades en:\n• Redes y sistemas\n• Aplicaciones web\n• Configuraciones de seguridad\n\n¿Te interesa este servicio?',
        'pentesting': '🛡️ PENTESTING:\nPruebas de intrusión para:\n• Aplicaciones web/móviles\n• Infraestructura de red\n• Dispositivos IoT\n\n¿Para qué tipo de sistema?',
        'default': '🤖 Entiendo. Como asistente de seguridad, puedo ayudarte con:\n• Información de servicios\n• Presupuestos\n• Contacto con especialistas\n• Emergencias de seguridad\n\n¿En qué más puedo ayudarte?'
    };
    
    input = input.toLowerCase();
    
    for (let key in responses) {
        if (input.includes(key)) {
            return responses[key];
        }
    }
    
    return responses['default'];
}

// Cerrar chat al hacer click fuera
document.addEventListener('click', function(e) {
    const chatWindow = document.getElementById('chatWindow');
    const chatToggle = document.querySelector('.chat-toggle');
    
    if (chatWindow.style.display === 'flex' && 
        !chatWindow.contains(e.target) && 
        !chatToggle.contains(e.target)) {
        chatWindow.style.display = 'none';
    }
});
