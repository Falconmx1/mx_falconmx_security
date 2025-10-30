// Chat functionality
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex';
}

function sendMessage() {
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');
    
    if (userInput.value.trim() === '') return;
    
    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'message user-message';
    userMessage.style.background = '#00d4ff';
    userMessage.style.color = 'white';
    userMessage.style.marginLeft = 'auto';
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
        'hola': '¡Hola! Soy tu asistente de MxFalcon Security. ¿En qué puedo ayudarte con tu seguridad digital?',
        'servicios': 'Ofrecemos: Auditoría de Seguridad, Pentesting y Consultoría 24/7. ¿Te interesa alguno en específico?',
        'precio': 'Los precios varían según el servicio y complejidad. ¿Qué servicio te interesa para darte un presupuesto?',
        'contacto': 'Puedes contactarnos a través del formulario en nuestra página o escribirnos directamente aquí.',
        'default': 'Entiendo. Como asistente de seguridad, puedo ayudarte con información sobre nuestros servicios, precios, o conectarte con nuestro equipo especializado.'
    };
    
    input = input.toLowerCase();
    
    for (let key in responses) {
        if (input.includes(key)) {
            return responses[key];
        }
    }
    
    return responses['default'];
}

// Enter key support for chat
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
