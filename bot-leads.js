// Bot para encontrar leads vulnerables
const vulnerableCompanies = [
    // Empresas con sitios desactualizados
    "restaurantes",
    "pequeñas empresas", 
    "consultorios médicos",
    "estudios contables",
    "inmobiliarias",
    "escuelas particulares"
];

const messages = {
    urgent: "🔴 URGENTE: Detectamos vulnerabilidades críticas en su sitio web que podrían permitir acceso no autorizado a datos sensibles. ¿Podemos ayudarle a solucionarlo?",
    preventive: "🛡️ Nuestro escaneo detectó posibles vulnerabilidades de seguridad en su sitio. Ofrecemos auditoría gratuita para prevenir ataques.",
    emergency: "🚨 ALERTA: Su sitio podría ser vulnerable a ataques recientes. Ofrecemos solución inmediata en menos de 4 horas."
};

// Simulación de envío de mensajes
function sendAutomatedMessage(company, messageType) {
    const message = messages[messageType];
    console.log(`📤 Enviando a ${company}: ${message}`);
    
    // Aquí integrarías con API de WhatsApp o email
    return true;
}

// Encontrar leads automáticamente
function findAndContactLeads() {
    vulnerableCompanies.forEach(company => {
        // Lógica para encontrar empresas específicas
        sendAutomatedMessage(company, 'urgent');
    });
}

// Ejecutar búsqueda cada 6 horas
setInterval(findAndContactLeads, 6 * 60 * 60 * 1000);
