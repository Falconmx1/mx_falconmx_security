#!/usr/bin/env node

/**
 * Security Chatbot - MFH TOOLS PRO
 * Chatbot interactivo para consultas de seguridad
 * 
 * Uso: node security-chatbot.js [opciones]
 * Ejemplo: node security-chatbot.js --interactive
 * Ejemplo: node security-chatbot.js --query "¿Qué es un firewall?"
 * Ejemplo: node security-chatbot.js --web --port 3000
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const http = require('http');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'chatbot_config.json');
const KNOWLEDGE_FILE = path.join(__dirname, 'chatbot_knowledge.json');

const DEFAULT_CONFIG = {
    mode: 'local',
    port: 3000,
    maxHistory: 50,
    knowledgeBase: 'knowledge.json'
};

// ==================== BASE DE CONOCIMIENTO ====================
const KNOWLEDGE_BASE = {
    'firewall': {
        question: '¿Qué es un firewall?',
        answer: 'Un firewall es un sistema de seguridad que controla el tráfico de red basado en reglas predefinidas. Actúa como una barrera entre redes de confianza y no confianza.',
        related: ['seguridad', 'red', 'protección']
    },
    'waf': {
        question: '¿Qué es un WAF?',
        answer: 'Un WAF (Web Application Firewall) es un firewall específico para aplicaciones web. Protege contra ataques como SQL Injection, XSS y CSRF.',
        related: ['firewall', 'web', 'ataques']
    },
    'ddos': {
        question: '¿Cómo protegerse de ataques DDoS?',
        answer: 'Para protegerse de DDoS, implementa: 1) Rate limiting, 2) WAF, 3) CDN con protección DDoS, 4) Monitoreo de tráfico, 5) Plan de respuesta.',
        related: ['ataque', 'denegación', 'servicio']
    },
    'phishing': {
        question: '¿Cómo detectar phishing?',
        answer: 'Para detectar phishing: 1) Revisar remitente, 2) Verificar URLs, 3) Buscar errores gramaticales, 4) No hacer clic en enlaces sospechosos, 5) Usar autenticación 2FA.',
        related: ['correo', 'estafa', 'seguridad']
    },
    'ransomware': {
        question: '¿Cómo prevenir ransomware?',
        answer: 'Prevención de ransomware: 1) Backups regulares, 2) Actualizaciones de seguridad, 3) No abrir archivos sospechosos, 4) Usar antivirus, 5) Capacitación de usuarios.',
        related: ['malware', 'virus', 'rescate']
    },
    'password': {
        question: '¿Cómo crear una contraseña segura?',
        answer: 'Una contraseña segura debe: 1) Tener al menos 12 caracteres, 2) Incluir mayúsculas, minúsculas, números y símbolos, 3) Ser única por servicio, 4) No incluir información personal.',
        related: ['clave', 'autenticación', 'seguridad']
    },
    '2fa': {
        question: '¿Qué es la autenticación 2FA?',
        answer: '2FA (Two-Factor Authentication) es un método de autenticación que requiere dos factores: 1) Algo que sabes (contraseña), 2) Algo que tienes (token, SMS, app). Aumenta significativamente la seguridad.',
        related: ['autenticación', 'seguridad', 'MFA']
    },
    'mfa': {
        question: '¿Qué es MFA?',
        answer: 'MFA (Multi-Factor Authentication) es similar a 2FA pero puede incluir más factores: conocimiento, posesión e inherencia (biometría). Es el estándar actual de seguridad.',
        related: ['2fa', 'autenticación', 'seguridad']
    },
    'sql injection': {
        question: '¿Qué es SQL Injection?',
        answer: 'SQL Injection es un ataque donde se insertan comandos SQL maliciosos en una consulta. Para prevenir: 1) Usar consultas parametrizadas, 2) Validar entradas, 3) Usar WAF, 4) Principio de mínimo privilegio.',
        related: ['ataque', 'base de datos', 'web']
    },
    'xss': {
        question: '¿Qué es XSS?',
        answer: 'XSS (Cross-Site Scripting) es un ataque donde se inyectan scripts maliciosos en sitios web. Prevención: 1) Escapar salidas, 2) Validar entradas, 3) CSP (Content Security Policy), 4) Usar WAF.',
        related: ['ataque', 'web', 'script']
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let query = null;
let interactive = false;
let web = false;
let port = DEFAULT_CONFIG.port;
let outputFile = null;
let verbose = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--query':
        case '-q':
            query = args[i + 1];
            i++;
            break;
        case '--interactive':
        case '-i':
            interactive = true;
            break;
        case '--web':
            web = true;
            break;
        case '--port':
            port = parseInt(args[i + 1]);
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--init':
            init = true;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Security Chatbot - MFH TOOLS PRO
====================================
Chatbot interactivo para consultas de seguridad.

Uso:
  node security-chatbot.js [opciones]

Opciones:
  --init                   Crear configuración por defecto
  --query, -q <consulta>   Consulta de seguridad
  --interactive, -i        Modo interactivo
  --web                    Modo servidor web
  --port <puerto>          Puerto para modo web (default: 3000)
  --output <archivo>       Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node security-chatbot.js --init
  node security-chatbot.js --query "¿Qué es un firewall?"
  node security-chatbot.js --interactive
  node security-chatbot.js --web --port 8080
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`✅ Configuración guardada en: ${CONFIG_FILE}`);
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    const config = { ...DEFAULT_CONFIG };
    config.mode = 'local';
    saveConfig(config);
    console.log('✅ Configuración por defecto creada.');
    console.log(`📝 Archivo: ${CONFIG_FILE}`);
}

function findBestMatch(query) {
    const queryLower = query.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
        let score = 0;
        // Coincidencia en pregunta
        if (entry.question.toLowerCase().includes(queryLower) || queryLower.includes(entry.question.toLowerCase())) {
            score += 3;
        }
        // Coincidencia en palabras clave
        for (const related of entry.related) {
            if (queryLower.includes(related)) {
                score += 2;
            }
            if (related.includes(queryLower) || queryLower.includes(related)) {
                score += 1;
            }
        }
        // Coincidencia en respuesta
        if (entry.answer.toLowerCase().includes(queryLower)) {
            score += 1;
        }
        // Coincidencia en key
        if (key.includes(queryLower) || queryLower.includes(key)) {
            score += 2;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = { key, entry, score };
        }
    }

    return bestMatch;
}

function getResponse(query) {
    const match = findBestMatch(query);
    
    if (match && match.score > 1) {
        return {
            success: true,
            question: match.entry.question,
            answer: match.entry.answer,
            related: match.entry.related,
            confidence: Math.min(match.score / 5, 1),
            match: match.key
        };
    }

    // Respuesta genérica
    const topics = Object.keys(KNOWLEDGE_BASE).join(', ');
    return {
        success: true,
        answer: `🤖 No tengo información específica sobre "${query}" en mi base de conocimiento.

📋 Temas que puedo consultar:
• ${topics}

💡 Recomendación: Sé más específico en tu consulta.

🔍 Ejemplos de consultas:
• "¿Qué es un firewall?"
• "¿Cómo prevenir ransomware?"
• "¿Qué es SQL Injection?"`,
        confidence: 0.2,
        match: 'general'
    };
}

function formatResponse(result) {
    let output = '';
    output += `🔍 Security Chatbot - MFH TOOLS PRO\n`;
    output += '='.split(50).join('=') + '\n\n';

    if (result.question) {
        output += `📌 ${result.question}\n\n`;
    }

    output += `${result.answer}\n\n`;

    if (result.related && result.related.length > 0) {
        output += `📋 Temas relacionados: ${result.related.join(', ')}\n`;
    }

    if (result.confidence !== undefined) {
        output += `🎯 Confianza: ${Math.round(result.confidence * 100)}%\n`;
    }

    return output;
}

function interactiveMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n🤖 Security Chatbot - Modo Interactivo');
    console.log('='.split(50).join('='));
    console.log('📋 Comandos:');
    console.log('  help      - Mostrar temas disponibles');
    console.log('  topics    - Listar temas disponibles');
    console.log('  clear     - Limpiar pantalla');
    console.log('  exit      - Salir');
    console.log('='.split(50).join('='));
    console.log('💡 Haz una pregunta sobre seguridad.\n');

    function prompt() {
        rl.question('🔒 Tú > ', (input) => {
            const trimmed = input.trim();
            if (!trimmed) { prompt(); return; }

            const cmd = trimmed.toLowerCase();

            switch (cmd) {
                case 'exit':
                case 'quit':
                    console.log('👋 Saliendo...');
                    rl.close();
                    return;

                case 'help':
                case 'topics':
                    console.log('\n📋 Temas disponibles:');
                    for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
                        console.log(`  • ${entry.question}`);
                    }
                    console.log('\n💡 Haz una pregunta sobre cualquiera de estos temas.\n');
                    break;

                case 'clear':
                    console.clear();
                    break;

                default:
                    console.log('🤖 Pensando...');
                    const result = getResponse(trimmed);
                    console.log('\n' + formatResponse(result) + '\n');
                    break;
            }

            prompt();
        });
    }

    prompt();
}

function startWebServer(port) {
    const config = loadConfig();
    
    const server = http.createServer((req, res) => {
        const parsedUrl = new URL(req.url, `http://localhost:${port}`);
        const path = parsedUrl.pathname;

        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (path === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Security Chatbot - MFH TOOLS PRO</title>
                    <style>
                        body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; padding: 20px; }
                        .container { max-width: 800px; margin: 0 auto; }
                        h1 { color: #00ff00; text-shadow: 0 0 10px rgba(0,255,0,0.3); }
                        .chat-box { background: #1a1a1a; border: 1px solid #00ff00; border-radius: 10px; padding: 20px; height: 400px; overflow-y: auto; margin: 20px 0; }
                        .user-msg { color: #00ff00; margin: 5px 0; }
                        .bot-msg { color: #ffff00; margin: 5px 0; }
                        .input-area { display: flex; gap: 10px; }
                        input { flex: 1; background: #1a1a1a; border: 1px solid #00ff00; color: #00ff00; padding: 10px; border-radius: 5px; }
                        button { background: #00ff00; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; }
                        button:hover { background: #00cc00; }
                        .topics { color: #666; font-size: 0.8rem; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🔒 Security Chatbot</h1>
                        <div class="chat-box" id="chatBox">
                            <div class="bot-msg">🤖 ¡Hola! Soy tu asistente de seguridad. Pregúntame sobre firewalls, ransomware, phishing y más.</div>
                        </div>
                        <div class="input-area">
                            <input type="text" id="userInput" placeholder="Escribe tu pregunta..." onkeypress="if(event.key==='Enter') sendMessage()">
                            <button onclick="sendMessage()">Enviar</button>
                        </div>
                        <div class="topics">💡 Temas: firewall, ransomware, phishing, SQL Injection, XSS, 2FA, MFA, DDoS</div>
                    </div>
                    <script>
                        function sendMessage() {
                            const input = document.getElementById('userInput');
                            const msg = input.value.trim();
                            if (!msg) return;
                            
                            const chatBox = document.getElementById('chatBox');
                            chatBox.innerHTML += '<div class="user-msg">🔒 Tú: ' + msg + '</div>';
                            chatBox.scrollTop = chatBox.scrollHeight;
                            input.value = '';
                            
                            fetch('/api/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message: msg })
                            })
                            .then(res => res.json())
                            .then(data => {
                                chatBox.innerHTML += '<div class="bot-msg">🤖 ' + data.response + '</div>';
                                chatBox.scrollTop = chatBox.scrollHeight;
                            })
                            .catch(err => {
                                chatBox.innerHTML += '<div class="bot-msg">❌ Error: ' + err.message + '</div>';
                            });
                        }
                    </script>
                </body>
                </html>
            `);
            return;
        }

        if (path === '/api/chat' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const message = data.message || '';
                    const result = getResponse(message);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        response: result.answer,
                        confidence: Math.round(result.confidence * 100),
                        match: result.match
                    }));
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        res.writeHead(404);
        res.end('Not Found');
    });

    server.listen(port, () => {
        console.log(`✅ Security Chatbot web iniciado en http://localhost:${port}`);
        console.log('📋 Presiona Ctrl+C para detener.');
    });

    return server;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Security Chatbot - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    if (init) {
        initConfig();
        process.exit(0);
    }

    if (web) {
        startWebServer(port);
        return;
    }

    if (interactive) {
        interactiveMode();
        return;
    }

    if (query) {
        const result = getResponse(query);
        console.log(formatResponse(result));
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }
        process.exit(0);
    }

    console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
    console.log('💡 Opciones: --query, --interactive, --web, --init');
    process.exit(0);
})();
