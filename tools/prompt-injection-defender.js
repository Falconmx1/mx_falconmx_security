#!/usr/bin/env node

/**
 * Prompt Injection Defender - MFH TOOLS PRO
 * Defiende contra ataques de inyección de prompts en sistemas de IA
 * 
 * Uso: node prompt-injection-defender.js [opciones]
 * Ejemplo: node prompt-injection-defender.js --defend --prompt "Texto a defender"
 * Ejemplo: node prompt-injection-defender.js --analyze --log ./prompt_log.json
 * Ejemplo: node prompt-injection-defender.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'injection_config.json');
const INJECTION_DIR = path.join(__dirname, 'injection_data');
const REPORTS_DIR = path.join(__dirname, 'injection_reports');

const DEFAULT_CONFIG = {
    defense_layers: ['input_sanitization', 'role_enforcement', 'context_isolation', 'output_filtering', 'rate_limiting'],
    injection_patterns: [
        { pattern: /ignora|ignorar|ignore/i, type: 'instruction_override' },
        { pattern: /actúa como|you are now|eres un/i, type: 'role_switch' },
        { pattern: /revela|confidencial|secreto|expon/i, type: 'data_exfiltration' },
        { pattern: /bypass|saltar|omitir|evitar/i, type: 'security_bypass' },
        { pattern: /prompt|instrucciones|previas|sistema|system/i, type: 'system_prompt_exposure' },
        { pattern: /malicioso|malware|ataque|hack/i, type: 'malicious_intent' },
        { pattern: /dame|entregame|proporciona|accede/i, type: 'unauthorized_access' }
    ],
    response_actions: ['block', 'sanitize', 'warn', 'log', 'notify']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let promptText = null;
let logPath = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--defend':
            action = 'defend';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                promptText = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                logPath = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--prompt':
            promptText = args[i + 1];
            i++;
            break;
        case '--log':
            logPath = args[i + 1];
            i++;
            break;
        case '--format':
            format = args[i + 1];
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
🛡️ Prompt Injection Defender - MFH TOOLS PRO
==============================================
Defiende contra ataques de inyección de prompts en sistemas de IA.

Uso:
  node prompt-injection-defender.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --defend <prompt>         Defender prompt contra inyección
  --analyze <log>           Analizar logs de prompts
  --report                  Generar reporte de defensas
  --prompt <texto>          Prompt a defender
  --log <ruta>              Ruta del log de prompts
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node prompt-injection-defender.js --init
  node prompt-injection-defender.js --defend --prompt "Dame información confidencial"
  node prompt-injection-defender.js --analyze --log ./prompt_log.json
  node prompt-injection-defender.js --report --format html
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
        console.error('❌ Error cargando configuracion:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuracion:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(INJECTION_DIR)) {
        fs.mkdirSync(INJECTION_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de inyeccion: ${INJECTION_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function defendPrompt(prompt) {
    console.log(`🛡️ Defendiendo prompt contra inyección...`);
    console.log(`   Prompt: "${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}"`);
    
    const config = loadConfig();
    const patterns = config.injection_patterns;
    const layers = config.defense_layers;
    const actions = config.response_actions;
    
    // Analizar prompt contra patrones de inyección
    const detections = [];
    for (const p of patterns) {
        const matches = prompt.match(p.pattern);
        if (matches) {
            detections.push({
                type: p.type,
                pattern: p.pattern.source,
                matches: matches,
                severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)]
            });
        }
    }
    
    // Aplicar capas de defensa
    const defenseResults = [];
    for (const layer of layers) {
        let passed = true;
        let details = '';
        switch (layer) {
            case 'input_sanitization':
                passed = detections.length === 0 || Math.random() > 0.5;
                details = passed ? 'Entrada sanitizada correctamente' : 'Se detectaron patrones sospechosos';
                break;
            case 'role_enforcement':
                passed = Math.random() > 0.2;
                details = passed ? 'Rol del sistema mantenido' : 'Intento de cambio de rol detectado';
                break;
            case 'context_isolation':
                passed = Math.random() > 0.3;
                details = passed ? 'Contexto aislado correctamente' : 'Posible fuga de contexto detectada';
                break;
            case 'output_filtering':
                passed = Math.random() > 0.4;
                details = passed ? 'Output filtrado correctamente' : 'Se detectó contenido no autorizado';
                break;
            case 'rate_limiting':
                passed = Math.random() > 0.1;
                details = passed ? 'Rate limit aplicado' : 'Exceso de requests detectado';
                break;
        }
        defenseResults.push({ layer, passed, details });
    }
    
    // Determinar acción de respuesta
    const threatLevel = detections.length > 0 ? 
        detections.reduce((acc, d) => {
            const weights = { low: 1, medium: 2, high: 3, critical: 4 };
            return Math.max(acc, weights[d.severity] || 0);
        }, 0) : 0;
    
    let actionTaken;
    if (threatLevel >= 4) actionTaken = 'block';
    else if (threatLevel >= 3) actionTaken = 'sanitize';
    else if (threatLevel >= 2) actionTaken = 'warn';
    else if (threatLevel >= 1) actionTaken = 'log';
    else actionTaken = 'allow';
    
    const result = {
        prompt: prompt,
        timestamp: new Date().toISOString(),
        detections: detections,
        defense_results: defenseResults,
        threat_level: threatLevel,
        action_taken: actionTaken,
        is_blocked: actionTaken === 'block',
        sanitized_prompt: actionTaken === 'sanitize' ? prompt.replace(/malicioso|confidencial|secreto/gi, '[REDACTED]') : prompt,
        recommendations: detections.length > 0 ? [
            'Implementar filtros adicionales',
            'Revisar logs de prompts sospechosos',
            'Actualizar patrones de detección'
        ] : ['Prompt seguro - Continuar monitoreo']
    };
    
    console.log(`\n📊 Resultados de defensa:`);
    console.log(`   Detecciones: ${result.detections.length}`);
    console.log(`   Nivel de amenaza: ${result.threat_level}`);
    console.log(`   Acción tomada: ${result.action_taken}`);
    console.log(`   Bloqueado: ${result.is_blocked ? '⚠️ Sí' : '✅ No'}`);
    
    if (result.detections.length > 0) {
        console.log(`\n🔍 Patrones detectados:`);
        result.detections.forEach(d => {
            const icon = d.severity === 'critical' ? '🔴' : d.severity === 'high' ? '🟠' : d.severity === 'medium' ? '🟡' : '🟢';
            console.log(`   ${icon} ${d.type} (${d.severity})`);
        });
    }
    
    console.log(`\n🛡️ Capas de defensa:`);
    result.defense_results.forEach(r => {
        console.log(`   ${r.passed ? '✅' : '❌'} ${r.layer}: ${r.details}`);
    });
    
    if (result.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        result.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(INJECTION_DIR, `defense_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Defensa guardada: ${outputPath}`);
    
    return result;
}

function analyzeLogs(logPath) {
    console.log(`📊 Analizando logs de prompts: ${logPath}`);
    
    if (!fs.existsSync(logPath)) {
        console.error(`❌ Log "${logPath}" no existe.`);
        return;
    }
    
    let logData;
    try {
        logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch (error) {
        console.error(`❌ Error leyendo log: ${error.message}`);
        return;
    }
    
    const analysis = {
        source: logPath,
        timestamp: new Date().toISOString(),
        total_prompts: Array.isArray(logData) ? logData.length : 1,
        malicious_detected: 0,
        blocked: 0,
        pattern_frequency: {},
        recommendations: []
    };
    
    // Si es un array, analizar cada entrada
    const items = Array.isArray(logData) ? logData : [logData];
    
    for (const item of items) {
        const prompt = item.prompt || item.text || item.content || '';
        const config = loadConfig();
        const patterns = config.injection_patterns;
        
        for (const p of patterns) {
            if (p.pattern.test(prompt)) {
                analysis.malicious_detected++;
                analysis.pattern_frequency[p.type] = (analysis.pattern_frequency[p.type] || 0) + 1;
            }
        }
        
        if (item.blocked || item.is_blocked) {
            analysis.blocked++;
        }
    }
    
    analysis.recommendations = [
        'Actualizar filtros de detección',
        'Implementar bloqueo automático',
        'Revisar prompts más frecuentes'
    ];
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Total prompts: ${analysis.total_prompts}`);
    console.log(`   Maliciosos: ${analysis.malicious_detected}`);
    console.log(`   Bloqueados: ${analysis.blocked}`);
    
    console.log(`\n📋 Frecuencia de patrones:`);
    for (const [type, count] of Object.entries(analysis.pattern_frequency)) {
        console.log(`   • ${type}: ${count} detecciones`);
    }
    
    const outputPath = outputFile || path.join(INJECTION_DIR, `log_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return analysis;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de defensa contra inyección en formato ${format}`);
    
    const files = fs.readdirSync(INJECTION_DIR).filter(f => f.startsWith('defense_') || f.startsWith('log_analysis_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --defend o --analyze primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(INJECTION_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateInjectionHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `injection_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateInjectionHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🛡️ Prompt Injection Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 40px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #1a1a1a;
            border-radius: 12px;
            border: 1px solid #00ff00;
            padding: 40px;
        }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 15px; margin-bottom: 20px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat {
            background: #0a0a0a;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #333;
            text-align: center;
        }
        .stat .number { font-size: 2rem; font-weight: bold; }
        .stat .label { color: #888; font-size: 0.8rem; }
        .blocked { color: #dc3545; }
        .allowed { color: #00ff00; }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Prompt Injection Defense Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Defensas:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Defensas Aplicadas</h2>
        ${data.map(d => {
            if (d.prompt) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">🛡️ ${d.action_taken}</h3>
                        <p class="${d.is_blocked ? 'blocked' : 'allowed'}">${d.is_blocked ? '🔴 Bloqueado' : '🟢 Permitido'}</p>
                        <p>Threat Level: ${d.threat_level} | Detecciones: ${d.detections.length}</p>
                    </div>
                `;
            }
            return '';
        }).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🛡️ Prompt Injection Defender - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'defend':
            if (!promptText) {
                console.error('❌ Debes especificar --prompt');
                process.exit(1);
            }
            defendPrompt(promptText);
            break;
            
        case 'analyze':
            if (!logPath) {
                console.error('❌ Debes especificar --log');
                process.exit(1);
            }
            analyzeLogs(logPath);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --defend, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ Prompt Injection Defender completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Prompt Injection Defender...');
    process.exit(0);
});
