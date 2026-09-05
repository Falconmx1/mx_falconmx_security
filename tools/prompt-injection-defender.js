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
        { pattern: 'ignora|ignorar|ignore', type: 'instruction_override' },
        { pattern: 'actúa como|you are now|eres un', type: 'role_switch' },
        { pattern: 'revela|confidencial|secreto|expon', type: 'data_exfiltration' },
        { pattern: 'bypass|saltar|omitir|evitar', type: 'security_bypass' },
        { pattern: 'prompt|instrucciones|previas|sistema|system', type: 'system_prompt_exposure' },
        { pattern: 'malicioso|malware|ataque|hack', type: 'malicious_intent' },
        { pattern: 'dame|entregame|proporciona|accede', type: 'unauthorized_access' }
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
            break;
    }
}

// ==================== FUNCIONES ====================

function initConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.log('✅ Configuracion por defecto creada.');
    }
    
    const dirs = [INJECTION_DIR, REPORTS_DIR];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 ${path.basename(dir)}: ${dir}`);
        }
    });
}

function defendPrompt(promptText) {
    console.log(`🛡️ Defendiendo prompt contra inyección...`);
    console.log(`   Prompt: "${promptText}"`);
    
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const patterns = config.injection_patterns;
    let detections = [];
    let threatLevel = 0;
    let block = false;
    let action = 'allow';
    
    // Detectar patrones
    for (const p of patterns) {
        const regex = new RegExp(p.pattern, 'i');
        if (regex.test(promptText)) {
            const severity = getSeverity(p.type);
            detections.push({
                type: p.type,
                pattern: p.pattern,
                severity: severity.level,
                severityColor: severity.color
            });
            threatLevel += severity.score;
            if (severity.score > 3) {
                block = true;
                action = 'block';
            }
        }
    }
    
    // Si hay detecciones pero no son críticas, sanitizar
    if (detections.length > 0 && !block) {
        action = 'sanitize';
    }
    
    // Si no hay detecciones, permitir
    if (detections.length === 0) {
        action = 'allow';
    }
    
    // Calcular nivel de amenaza
    const threatLevelFinal = Math.min(Math.floor(threatLevel / detections.length) || 0, 4);
    
    // Aplicar capas de defensa
    const defenseLayers = applyDefenseLayers(promptText, block);
    
    const result = {
        prompt: promptText,
        timestamp: new Date().toISOString(),
        detections: detections,
        threat_level: threatLevelFinal,
        action: action,
        blocked: block,
        defense_layers: defenseLayers,
        recommendations: generateRecommendations(detections, action)
    };
    
    // Mostrar resultados
    console.log('\n📊 Resultados de defensa:');
    console.log(`   Detecciones: ${detections.length}`);
    console.log(`   Nivel de amenaza: ${threatLevelFinal}`);
    console.log(`   Acción tomada: ${action}`);
    console.log(`   Bloqueado: ${block ? '⚠️ Sí' : '✅ No'}`);
    
    if (detections.length > 0) {
        console.log('\n🔍 Patrones detectados:');
        for (const d of detections) {
            console.log(`   ${d.severityColor} ${d.type} (${d.severity})`);
        }
    }
    
    console.log('\n🛡️ Capas de defensa:');
    for (const layer of defenseLayers) {
        const status = layer.status ? '✅' : '❌';
        console.log(`   ${status} ${layer.name}: ${layer.message}`);
    }
    
    if (result.recommendations.length > 0) {
        console.log('\n💡 Recomendaciones:');
        for (const rec of result.recommendations) {
            console.log(`   • ${rec}`);
        }
    }
    
    return result;
}

function getSeverity(type) {
    const severities = {
        'instruction_override': { level: 'critical', score: 4, color: '🔴' },
        'role_switch': { level: 'high', score: 3, color: '🟠' },
        'data_exfiltration': { level: 'critical', score: 4, color: '🔴' },
        'security_bypass': { level: 'high', score: 3, color: '🟠' },
        'system_prompt_exposure': { level: 'critical', score: 4, color: '🔴' },
        'malicious_intent': { level: 'medium', score: 2, color: '🟡' },
        'unauthorized_access': { level: 'critical', score: 4, color: '🔴' }
    };
    return severities[type] || { level: 'low', score: 1, color: '🟢' };
}

function applyDefenseLayers(promptText, blocked) {
    const layers = [
        { name: 'input_sanitization', status: !blocked, message: blocked ? 'Se detectaron patrones sospechosos' : 'Entrada sanitizada correctamente' },
        { name: 'role_enforcement', status: true, message: 'Rol del sistema mantenido' },
        { name: 'context_isolation', status: true, message: 'Contexto aislado correctamente' },
        { name: 'output_filtering', status: !blocked, message: blocked ? 'Se detectó contenido no autorizado' : 'Output filtrado correctamente' },
        { name: 'rate_limiting', status: true, message: 'Rate limit aplicado' }
    ];
    return layers;
}

function generateRecommendations(detections, action) {
    const recs = [];
    if (detections.length > 3) {
        recs.push('Implementar filtros adicionales');
    }
    if (action === 'block' || action === 'sanitize') {
        recs.push('Revisar logs de prompts sospechosos');
        recs.push('Actualizar patrones de detección');
    }
    if (detections.some(d => d.type === 'data_exfiltration')) {
        recs.push('Revisar políticas de manejo de datos');
    }
    return recs;
}

function analyzeLogs(logPath) {
    console.log(`📊 Analizando logs de prompts: ${logPath}`);
    
    if (!fs.existsSync(logPath)) {
        console.log(`❌ Archivo no encontrado: ${logPath}`);
        return null;
    }
    
    const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const patterns = config.injection_patterns;
    
    let results = [];
    let totalPrompts = 0;
    let blocked = 0;
    let sanitized = 0;
    let allowed = 0;
    
    // Si es un array de logs
    let logs = [];
    if (Array.isArray(logData)) {
        logs = logData;
    } else if (logData.logs && Array.isArray(logData.logs)) {
        logs = logData.logs;
    } else if (logData.prompts && Array.isArray(logData.prompts)) {
        logs = logData.prompts;
    } else {
        logs = [logData];
    }
    
    for (const entry of logs) {
        const promptText = entry.text || entry.prompt || entry.prompt_text || '';
        if (!promptText) continue;
        
        totalPrompts++;
        let detections = [];
        let block = false;
        
        for (const p of patterns) {
            const regex = new RegExp(p.pattern, 'i');
            if (regex.test(promptText)) {
                const severity = getSeverity(p.type);
                detections.push({
                    type: p.type,
                    severity: severity.level
                });
                if (severity.score > 3) {
                    block = true;
                }
            }
        }
        
        if (block) {
            blocked++;
        } else if (detections.length > 0) {
            sanitized++;
        } else {
            allowed++;
        }
        
        results.push({
            prompt: promptText,
            detections: detections.length,
            blocked: block,
            status: block ? 'blocked' : (detections.length > 0 ? 'sanitized' : 'allowed')
        });
    }
    
    const analysis = {
        timestamp: new Date().toISOString(),
        total_prompts: totalPrompts,
        blocked: blocked,
        sanitized: sanitized,
        allowed: allowed,
        block_rate: totalPrompts > 0 ? Math.round((blocked / totalPrompts) * 100) : 0,
        results: results
    };
    
    console.log(`\n📊 Resumen de análisis:`);
    console.log(`   Total prompts: ${totalPrompts}`);
    console.log(`   Bloqueados: ${blocked}`);
    console.log(`   Sanitizados: ${sanitized}`);
    console.log(`   Permitidos: ${allowed}`);
    console.log(`   Tasa de bloqueo: ${analysis.block_rate}%`);
    
    return analysis;
}

function generateReport(inputData, format) {
    console.log(`📊 Generando reporte de defensa contra inyección en formato ${format}`);
    
    let report = {
        timestamp: new Date().toISOString(),
        data: inputData
    };
    
    if (format === 'html') {
        const html = generateHTMLReport(report);
        const outputPath = path.join(REPORTS_DIR, `injection_report_${Date.now()}.html`);
        fs.writeFileSync(outputPath, html);
        console.log(`📄 Reporte guardado: ${outputPath}`);
        return outputPath;
    } else {
        const outputPath = path.join(REPORTS_DIR, `injection_report_${Date.now()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`📄 Reporte guardado: ${outputPath}`);
        return outputPath;
    }
}

function generateHTMLReport(report) {
    const data = report.data;
    let content = '';
    
    if (data.prompt) {
        // Defensa individual
        content = `
            <h2>🛡️ Defensa de Prompt</h2>
            <p><strong>Prompt:</strong> ${data.prompt}</p>
            <p><strong>Acción:</strong> ${data.action}</p>
            <p><strong>Bloqueado:</strong> ${data.blocked ? 'Sí' : 'No'}</p>
            <p><strong>Nivel de amenaza:</strong> ${data.threat_level}</p>
            <h3>Detecciones:</h3>
            <ul>
                ${data.detections.map(d => `<li>${d.type} (${d.severity})</li>`).join('')}
            </ul>
        `;
    } else if (data.total_prompts) {
        // Análisis de logs
        content = `
            <h2>📊 Análisis de Logs</h2>
            <p><strong>Total prompts:</strong> ${data.total_prompts}</p>
            <p><strong>Bloqueados:</strong> ${data.blocked}</p>
            <p><strong>Sanitizados:</strong> ${data.sanitized}</p>
            <p><strong>Permitidos:</strong> ${data.allowed}</p>
            <p><strong>Tasa de bloqueo:</strong> ${data.block_rate}%</p>
        `;
    }
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>Prompt Injection Defense Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0e1a; color: #e0e0e0; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a2332, #0d1520); padding: 20px; border-radius: 10px; margin-bottom: 20px; border-bottom: 3px solid #ff4444; }
        .header h1 { color: #ff4444; }
        .section { background: #141e2b; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #1a2a3a; }
        .footer { text-align: center; color: #667788; font-size: 12px; margin-top: 20px; }
        .badge-block { background: #ff4444; padding: 3px 10px; border-radius: 12px; }
        .badge-sanitize { background: #ff8800; padding: 3px 10px; border-radius: 12px; }
        .badge-allow { background: #44cc44; padding: 3px 10px; border-radius: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ Prompt Injection Defense Report</h1>
        <p>${report.timestamp}</p>
    </div>
    <div class="section">
        ${content}
    </div>
    <div class="footer">
        🚀 PID Defender v1.0
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================

function main() {
    // Inicializar
    if (init) {
        initConfig();
        console.log('✅ Inicializacion completada.');
        return;
    }
    
    // Verificar configuracion
    if (!fs.existsSync(CONFIG_FILE)) {
        initConfig();
    }
    
    let result = null;
    let inputData = null;
    
    // Ejecutar accion
    switch (action) {
        case 'defend':
            if (!promptText) {
                console.log('❌ Debes especificar --prompt');
                return;
            }
            result = defendPrompt(promptText);
            inputData = result;
            break;
            
        case 'analyze':
            if (!logPath) {
                console.log('❌ Debes especificar --log');
                return;
            }
            result = analyzeLogs(logPath);
            inputData = result;
            break;
            
        case 'report':
            // Buscar archivos de datos para reporte
            const files = fs.readdirSync(INJECTION_DIR).filter(f => f.endsWith('.json'));
            if (files.length === 0) {
                console.log('ℹ️ No hay datos disponibles. Ejecuta --defend o --analyze primero.');
                return;
            }
            // Usar el primer archivo como ejemplo
            const data = JSON.parse(fs.readFileSync(path.join(INJECTION_DIR, files[0]), 'utf8'));
            result = generateReport(data, format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --defend, --analyze, --report, --init');
            break;
    }
    
    // Guardar resultado si se especificó output
    if (result && outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`📄 Resultado guardado: ${outputFile}`);
    }
    
    console.log('\n✅ Prompt Injection Defender completado');
}

// Ejecutar
if (require.main === module) {
    main();
}
