#!/usr/bin/env node

/**
 * AI-Powered Security Assistant - MFH TOOLS PRO
 * Asistente de seguridad con IA para consultas y recomendaciones
 * 
 * Uso: node ai-security-assistant.js [opciones]
 * Ejemplo: node ai-security-assistant.js --query "¿Cómo mitigar un ataque DDoS?"
 * Ejemplo: node ai-security-assistant.js --interactive
 * Ejemplo: node ai-security-assistant.js --analyze-log auth.log
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'ai_assistant_config.json');
const HISTORY_FILE = path.join(__dirname, 'ai_assistant_history.json');

const DEFAULT_CONFIG = {
    provider: 'local', // local, openai, mock
    apiKey: '',
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.7,
    useCache: true
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let query = null;
let analyzeLog = null;
let interactive = false;
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
        case '--analyze-log':
        case '-a':
            analyzeLog = args[i + 1];
            i++;
            break;
        case '--interactive':
        case '-i':
            interactive = true;
            break;
        case '--output':
        case '-o':
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
🔍 AI-Powered Security Assistant - MFH TOOLS PRO
=================================================
Asistente de seguridad con IA para consultas y recomendaciones.

Uso:
  node ai-security-assistant.js [opciones]

Opciones:
  --init                   Crear configuración por defecto
  --query, -q <consulta>   Consulta de seguridad
  --analyze-log, -a <archivo> Analizar archivo de log
  --interactive, -i        Modo interactivo
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node ai-security-assistant.js --init
  node ai-security-assistant.js --query "¿Cómo mitigar un ataque DDoS?"
  node ai-security-assistant.js --analyze-log auth.log
  node ai-security-assistant.js --interactive
`);
            process.exit(0);
    }
}

// ==================== CONFIGURACIÓN ====================
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
    config.provider = 'local';
    saveConfig(config);
    console.log('✅ Configuración por defecto creada.');
    console.log('📝 Edita el archivo para configurar OpenAI API key.');
    console.log(`   Archivo: ${CONFIG_FILE}`);
}

// ==================== BASE DE CONOCIMIENTO LOCAL ====================
const KNOWLEDGE_BASE = {
    'ddos': {
        patterns: ['ddos', 'ataque de denegación', 'denegación de servicio', 'distributed denial'],
        response: `🔒 MITIGACIÓN DE ATAQUES DDoS:

1. **Identificación**: Monitorear tráfico anormal, picos de ancho de banda.
2. **Mitigación en capa de red**: 
   - Blackhole routing (null routing)
   - Rate limiting en routers
   - Filtrado de tráfico malicioso
3. **Mitigación en capa de aplicación**:
   - WAF (Web Application Firewall)
   - Captcha para peticiones sospechosas
   - Limitación de conexiones por IP
4. **Servicios de protección**:
   - Cloudflare, Akamai, AWS Shield
5. **Plan de respuesta**:
   - Equipo de respuesta a incidentes
   - Comunicación con proveedores
   - Post-mortem después del ataque

📊 **Recomendación**: Implementar un WAF y rate limiting antes del ataque.`
    },
    'ransomware': {
        patterns: ['ransomware', 'secuestro de datos', 'rescate', 'cryptolocker'],
        response: `🔒 RESPUESTA A RANSOMWARE:

1. **Aislamiento inmediato**:
   - Desconectar el sistema infectado de la red
   - Bloquear accesos a backups
2. **Evaluación**:
   - Identificar el tipo de ransomware
   - Determinar si hay backups disponibles
3. **Restauración**:
   - Restaurar desde backups si es posible
   - No pagar el rescate (no garantiza recuperación)
4. **Investigación**:
   - Analizar vector de entrada
   - Identificar datos comprometidos
   - Notificar a autoridades si aplica
5. **Prevención**:
   - Implementar backups 3-2-1
   - Actualizar parches de seguridad
   - Capacitar a usuarios en phishing

📊 **Recomendación**: Mantener backups offline y probar restauraciones regularmente.`
    },
    'phishing': {
        patterns: ['phishing', 'suplantación', 'correo falso', 'estafa'],
        response: `🔒 PREVENCIÓN Y RESPUESTA A PHISHING:

1. **Detección**:
   - Verificar remitente del correo
   - Revisar URLs sospechosas
   - Buscar errores gramaticales
2. **Bloqueo**:
   - Reportar como phishing al proveedor de correo
   - Bloquear dominio remitente
   - Eliminar correo de todos los usuarios
3. **Educación**:
   - Capacitar a empleados en reconocimiento
   - Realizar simulaciones de phishing
4. **Tecnología**:
   - Implementar SPF, DKIM, DMARC
   - Usar filtros antiphishing
   - Autenticación de dos factores

📊 **Recomendación**: Capacitar a usuarios y realizar simulaciones mensuales.`
    },
    'firewall': {
        patterns: ['firewall', 'cortafuegos', 'reglas', 'politicas'],
        response: `🔒 CONFIGURACIÓN DE FIREWALL:

1. **Reglas por defecto**:
   - Denegar todo el tráfico entrante
   - Permitir tráfico saliente necesario
2. **Reglas específicas**:
   - HTTP/HTTPS (80, 443)
   - DNS (53)
   - SSH (22) solo desde IPs autorizadas
3. **Logging**:
   - Habilitar logs de conexiones
   - Configurar alertas para intentos fallidos
4. **Mantenimiento**:
   - Revisar reglas periódicamente
   - Eliminar reglas obsoletas
   - Auditar accesos

📊 **Recomendación**: Implementar principio de mínimo privilegio.`
    },
    'malware': {
        patterns: ['malware', 'virus', 'troiano', 'spyware', 'rootkit'],
        response: `🔒 DETECCIÓN Y REMOCIÓN DE MALWARE:

1. **Detección**:
   - Antivirus actualizado
   - Análisis de comportamiento
   - Monitoreo de procesos sospechosos
2. **Contención**:
   - Aislar sistemas infectados
   - Bloquear comunicaciones salientes
3. **Remoción**:
   - Escanear con múltiples herramientas
   - Modo seguro o live CD
4. **Verificación**:
   - Revisar archivos modificados
   - Verificar integridad del sistema
5. **Prevención**:
   - Mantener software actualizado
   - Principio de mínimo privilegio
   - No descargar archivos sospechosos

📊 **Recomendación**: Usar herramientas como Malwarebytes y Windows Defender.`
    },
    'password': {
        patterns: ['password', 'contraseña', 'clave', 'autenticación'],
        response: `🔒 BUENAS PRÁCTICAS DE CONTRASEÑAS:

1. **Complejidad**:
   - Mínimo 12 caracteres
   - Mayúsculas, minúsculas, números, símbolos
2. **Únicas**:
   - Contraseña diferente por servicio
   - No reutilizar contraseñas
3. **Gestión**:
   - Usar gestor de contraseñas (Bitwarden, 1Password)
   - Habilitar 2FA siempre que sea posible
4. **Políticas**:
   - Cambiar contraseñas periódicamente
   - No compartir contraseñas
   - No almacenar en texto plano

📊 **Recomendación**: Implementar autenticación multifactor (MFA/2FA).`
    }
};

// ==================== FUNCIONES ====================
function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        }
    } catch (error) {
        // Ignorar error
    }
    return { conversations: [] };
}

function saveHistory(history) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (error) {
        // Ignorar error
    }
}

function findBestMatch(query) {
    const queryLower = query.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
        let score = 0;
        for (const pattern of entry.patterns) {
            if (queryLower.includes(pattern)) {
                score += 2;
            }
            if (pattern.includes(queryLower) || queryLower.includes(pattern)) {
                score += 1;
            }
        }
        // Buscar coincidencias parciales
        const words = queryLower.split(/\s+/);
        for (const word of words) {
            if (word.length > 3) {
                for (const pattern of entry.patterns) {
                    if (pattern.includes(word) || word.includes(pattern)) {
                        score += 0.5;
                    }
                }
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = { key, entry, score };
        }
    }

    return bestMatch;
}

function generateLocalResponse(query) {
    const match = findBestMatch(query);
    
    if (match && match.score > 1) {
        return {
            success: true,
            response: match.entry.response,
            match: match.key,
            confidence: Math.min(match.score / 5, 1)
        };
    }

    // Respuesta genérica
    return {
        success: true,
        response: `🔍 No tengo información específica sobre "${query}" en mi base de conocimiento local.

📋 Temas que puedo consultar:
• DDoS (ataques de denegación de servicio)
• Ransomware (secuestro de datos)
• Phishing (suplantación de identidad)
• Firewall (configuración y políticas)
• Malware (virus, troyanos, spyware)
• Password (contraseñas y autenticación)

💡 Recomendación: Usa términos más específicos como "Cómo detectar phishing" o "Mitigar ransomware".

📌 Para más información, puedes ejecutar:
   node ai-security-assistant.js --interactive
   node ai-security-assistant.js --query "tu consulta"`,
        confidence: 0.3,
        match: 'general'
    };
}

function analyzeLogFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return { error: `Archivo no encontrado: ${filePath}` };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        
        const analysis = {
            file: filePath,
            totalLines: lines.length,
            errors: 0,
            warnings: 0,
            suspicious: 0,
            ips: [],
            users: [],
            patterns: []
        };

        const ipPattern = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
        const userPattern = /user\s+([a-zA-Z0-9_]+)/gi;
        const errorPatterns = ['error', 'failed', 'invalid', 'denied', 'rejected', 'refused'];
        const warningPatterns = ['warning', 'timeout', 'retry', 'slow'];

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            // Errores
            if (errorPatterns.some(p => lowerLine.includes(p))) {
                analysis.errors++;
            }
            if (warningPatterns.some(p => lowerLine.includes(p))) {
                analysis.warnings++;
            }

            // IPs
            const ips = line.match(ipPattern) || [];
            for (const ip of ips) {
                if (!analysis.ips.includes(ip)) {
                    analysis.ips.push(ip);
                }
            }

            // Usuarios
            const users = line.match(userPattern) || [];
            for (const user of users) {
                const cleanUser = user.replace(/user\s+/i, '').trim();
                if (cleanUser && !analysis.users.includes(cleanUser)) {
                    analysis.users.push(cleanUser);
                }
            }

            // Patrones sospechosos
            if (lowerLine.includes('failed password') || 
                lowerLine.includes('brute') || 
                lowerLine.includes('attack') ||
                lowerLine.includes('exploit')) {
                analysis.suspicious++;
            }
        }

        // Generar resumen
        let summary = `📊 ANÁLISIS DE LOG: ${path.basename(filePath)}\n`;
        summary += '='.repeat(50) + '\n';
        summary += `📋 Total líneas: ${analysis.totalLines}\n`;
        summary += `❌ Errores: ${analysis.errors}\n`;
        summary += `⚠️ Advertencias: ${analysis.warnings}\n`;
        summary += `🔴 Eventos sospechosos: ${analysis.suspicious}\n`;
        
        if (analysis.ips.length > 0) {
            summary += `🌐 IPs encontradas: ${analysis.ips.join(', ')}\n`;
        }
        if (analysis.users.length > 0) {
            summary += `👤 Usuarios encontrados: ${analysis.users.join(', ')}\n`;
        }

        if (analysis.suspicious > 0) {
            summary += `\n⚠️ Actividad sospechosa detectada. Revisa los logs para más detalles.\n`;
        } else {
            summary += `\n✅ No se detectó actividad sospechosa significativa.\n`;
        }

        return {
            success: true,
            analysis,
            summary
        };
    } catch (error) {
        return { error: error.message };
    }
}

function formatResponse(result) {
    let output = '';
    output += `🔍 AI-Powered Security Assistant - MFH TOOLS PRO\n`;
    output += '='.split(50).join('=') + '\n\n';

    if (result.error) {
        output += `❌ Error: ${result.error}\n`;
        return output;
    }

    if (result.summary) {
        output += result.summary;
        return output;
    }

    output += result.response || 'No se generó respuesta.';
    output += '\n\n';
    if (result.confidence !== undefined) {
        output += `🎯 Confianza: ${Math.round(result.confidence * 100)}%\n`;
    }
    if (result.match) {
        output += `📋 Categoría: ${result.match}\n`;
    }

    return output;
}

function interactiveMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n🤖 AI-Powered Security Assistant - Modo Interactivo');
    console.log('='.repeat(50));
    console.log('📋 Comandos:');
    console.log('  help              - Mostrar ayuda');
    console.log('  topics            - Listar temas disponibles');
    console.log('  analyze <archivo> - Analizar archivo de log');
    console.log('  history           - Ver historial de consultas');
    console.log('  clear             - Limpiar pantalla');
    console.log('  exit              - Salir');
    console.log('='.split(50).join('='));

    const history = loadHistory();
    let currentConversation = [];

    function prompt() {
        rl.question('\n🔒 Consulta > ', (input) => {
            const trimmed = input.trim();
            if (!trimmed) { prompt(); return; }

            const parts = trimmed.split(' ');
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);

            switch (cmd) {
                case 'exit':
                case 'quit':
                    console.log('👋 Saliendo...');
                    rl.close();
                    return;

                case 'help':
                    console.log('\n📋 Comandos disponibles:');
                    console.log('  help              - Mostrar ayuda');
                    console.log('  topics            - Listar temas disponibles');
                    console.log('  analyze <archivo> - Analizar archivo de log');
                    console.log('  history           - Ver historial de consultas');
                    console.log('  clear             - Limpiar pantalla');
                    console.log('  exit              - Salir');
                    break;

                case 'topics':
                    console.log('\n📋 Temas disponibles:');
                    for (const [key] of Object.entries(KNOWLEDGE_BASE)) {
                        console.log(`  • ${key}`);
                    }
                    console.log('\n💡 También puedes hacer consultas libres.');
                    break;

                case 'analyze':
                    if (args.length === 0) {
                        console.log('❌ Especifica un archivo: analyze auth.log');
                    } else {
                        const result = analyzeLogFile(args[0]);
                        console.log(formatResponse(result));
                    }
                    break;

                case 'history':
                    const conv = loadHistory();
                    if (conv.conversations.length === 0) {
                        console.log('📭 No hay historial de conversaciones.');
                    } else {
                        console.log(`\n📋 Historial (${conv.conversations.length} consultas):`);
                        const last = conv.conversations.slice(-10);
                        for (const item of last) {
                            console.log(`   📌 ${item.query.substring(0, 50)}... (${new Date(item.timestamp).toLocaleString()})`);
                        }
                    }
                    break;

                case 'clear':
                    console.clear();
                    break;

                default:
                    // Consulta normal
                    console.log('🔍 Procesando consulta...');
                    const result = generateLocalResponse(trimmed);
                    console.log(formatResponse(result));

                    // Guardar historial
                    const hist = loadHistory();
                    hist.conversations.push({
                        timestamp: new Date().toISOString(),
                        query: trimmed,
                        response: result.response,
                        confidence: result.confidence,
                        match: result.match
                    });
                    if (hist.conversations.length > 100) {
                        hist.conversations = hist.conversations.slice(-100);
                    }
                    saveHistory(hist);
                    break;
            }

            prompt();
        });
    }

    prompt();
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 AI-Powered Security Assistant - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    if (init) {
        initConfig();
        process.exit(0);
    }

    if (interactive) {
        interactiveMode();
        return;
    }

    let result = null;

    if (analyzeLog) {
        result = analyzeLogFile(analyzeLog);
        if (result.error) {
            console.error(`❌ ${result.error}`);
            process.exit(1);
        }
    } else if (query) {
        result = generateLocalResponse(query);
    } else {
        console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
        console.log('💡 Opciones: --query, --analyze-log, --interactive, --init');
        console.log('💡 Ejemplo: --query "¿Cómo mitigar un ataque DDoS?"');
        process.exit(0);
    }

    console.log(formatResponse(result));

    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Asistente completado');
})();
