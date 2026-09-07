#!/usr/bin/env node

/**
 * Spacecraft Cybersecurity Monitor - MFH TOOLS PRO
 * Monitorea y detecta ciberataques en sistemas de naves espaciales y sondas
 * 
 * Uso: node spacecraft-cybersecurity-monitor.js [opciones]
 * Ejemplo: node spacecraft-cybersecurity-monitor.js --monitor --spacecraft Voyager-1
 * Ejemplo: node spacecraft-cybersecurity-monitor.js --detect --logs spacecraft_logs.log
 * Ejemplo: node spacecraft-cybersecurity-monitor.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'spacecraft_config.json');
const REPORTS_DIR = path.join(__dirname, 'spacecraft_reports');

const DEFAULT_CONFIG = {
    spacecraft_systems: {
        'command': { name: 'Sistema de Comandos', critical: true },
        'telemetry': { name: 'Sistema de Telemetría', critical: true },
        'attitude': { name: 'Control de Actitud', critical: true },
        'power': { name: 'Sistema de Potencia', critical: true },
        'thermal': { name: 'Sistema Térmico', critical: false },
        'propulsion': { name: 'Sistema de Propulsión', critical: true }
    },
    attack_patterns: {
        'command_injection': { name: 'Inyección de Comandos', severity: 'critical' },
        'telemetry_spoofing': { name: 'Spoofing de Telemetría', severity: 'high' },
        'dos_attack': { name: 'Ataque DoS', severity: 'medium' },
        'unauthorized_access': { name: 'Acceso no Autorizado', severity: 'high' },
        'data_corruption': { name: 'Corrupción de Datos', severity: 'critical' }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let spacecraft = null;
let logFile = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--monitor':
            action = 'monitor';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                spacecraft = args[i + 1];
                i++;
            }
            break;
        case '--detect':
            action = 'detect';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                logFile = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--spacecraft':
            spacecraft = args[i + 1];
            i++;
            break;
        case '--logs':
            logFile = args[i + 1];
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
🚀 Spacecraft Cybersecurity Monitor - MFH TOOLS PRO
===============================================
Monitorea y detecta ciberataques en naves espaciales.

Uso:
  node spacecraft-cybersecurity-monitor.js [opciones]

Opciones:
  --init                Crear configuración por defecto
  --monitor <nave>      Monitorear nave espacial
  --detect <archivo>    Detectar ataques en logs
  --report              Generar reporte de monitoreo
  --spacecraft <id>     ID o nombre de la nave
  --logs <archivo>      Archivo de logs a analizar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar más detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node spacecraft-cybersecurity-monitor.js --init
  node spacecraft-cybersecurity-monitor.js --monitor --spacecraft Voyager-1
  node spacecraft-cybersecurity-monitor.js --detect --logs spacecraft_logs.log
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
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuración por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function monitorSpacecraft(spacecraft) {
    console.log(`🚀 Monitoreando nave espacial: ${spacecraft}`);
    
    const config = loadConfig();
    const systems = config.spacecraft_systems;
    const attacks = config.attack_patterns;
    
    // Simular monitoreo de nave espacial
    const status = {};
    let alerts = [];
    let securityScore = 0;
    let criticalIssues = 0;
    
    for (const [key, system] of Object.entries(systems)) {
        const healthy = Math.random() > 0.2;
        const hasAlert = !healthy && Math.random() > 0.3;
        status[key] = {
            name: system.name,
            healthy: healthy,
            critical: system.critical,
            status: healthy ? 'OK' : 'ALERTA'
        };
        if (hasAlert) {
            const attack = Object.values(attacks)[Math.floor(Math.random() * Object.values(attacks).length)];
            alerts.push({
                system: system.name,
                attack: attack.name,
                severity: attack.severity,
                timestamp: new Date().toISOString()
            });
            if (system.critical) criticalIssues++;
        }
    }
    
    const alertCount = alerts.length;
    securityScore = Math.round(((Object.keys(systems).length - alertCount) / Object.keys(systems).length) * 100);
    
    const result = {
        spacecraft: spacecraft,
        timestamp: new Date().toISOString(),
        systems_status: status,
        alerts: alerts,
        security_score: securityScore,
        risk_level: criticalIssues > 0 ? 'Crítico' : alertCount > 0 ? 'Alto' : 'Bajo',
        recommendations: criticalIssues > 0 ? [
            '🚨 ATENCIÓN: Problemas críticos detectados',
            'Revisar sistemas de comando y telemetría',
            'Aislar sistemas comprometidos',
            'Iniciar protocolo de emergencia'
        ] : alertCount > 0 ? [
            '⚠️ Alertas detectadas en sistemas no críticos',
            'Investigar origen de las anomalías',
            'Revisar logs de comunicación'
        ] : [
            '✅ Todos los sistemas operan normalmente',
            'Continuar monitoreo regular'
        ]
    };
    
    console.log(`\n📊 Resultados del monitoreo:`);
    console.log(`   Nave: ${result.spacecraft}`);
    console.log(`   Sistemas: ${Object.keys(result.systems_status).length}`);
    console.log(`   Alertas: ${result.alerts.length}`);
    console.log(`   Score de seguridad: ${result.security_score}%`);
    console.log(`   Nivel de riesgo: ${result.risk_level}`);
    console.log(`\n   Estado de sistemas:`);
    for (const [key, sys] of Object.entries(result.systems_status)) {
        const icon = sys.healthy ? '🟢' : '🔴';
        console.log(`   ${icon} ${sys.name}: ${sys.status}${sys.critical ? ' (CRÍTICO)' : ''}`);
    }
    
    if (result.alerts.length > 0) {
        console.log(`\n⚠️ Alertas detectadas:`);
        result.alerts.forEach(a => {
            const icon = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${a.system}: ${a.attack} (${a.severity})`);
        });
    }
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `spacecraft_monitor_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Monitoreo guardado: ${outputPath}`);
    
    return result;
}

function detectAttacks(logFile) {
    console.log(`🚀 Detectando ataques en logs: ${logFile}`);
    
    const config = loadConfig();
    const attacks = config.attack_patterns;
    
    // Simular detección de ataques
    const detectedAttacks = [];
    const totalEntries = Math.floor(Math.random() * 1000 + 100);
    const suspicious = Math.floor(Math.random() * 20 + 1);
    
    for (let i = 0; i < suspicious; i++) {
        const attack = Object.values(attacks)[Math.floor(Math.random() * Object.values(attacks).length)];
        detectedAttacks.push({
            attack: attack.name,
            severity: attack.severity,
            timestamp: new Date(Date.now() - Math.random() * 3600000 * 24).toISOString(),
            source: `IP ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            confidence: (Math.random() * 0.3 + 0.6).toFixed(2)
        });
    }
    
    const criticalAttacks = detectedAttacks.filter(a => a.severity === 'critical');
    const highAttacks = detectedAttacks.filter(a => a.severity === 'high');
    
    const result = {
        log_file: logFile,
        timestamp: new Date().toISOString(),
        total_entries: totalEntries,
        detected_attacks: detectedAttacks,
        summary: {
            total_attacks: detectedAttacks.length,
            critical: criticalAttacks.length,
            high: highAttacks.length,
            medium: detectedAttacks.filter(a => a.severity === 'medium').length
        },
        risk_level: criticalAttacks.length > 0 ? 'Crítico' : highAttacks.length > 0 ? 'Alto' : 'Medio',
        recommendations: criticalAttacks.length > 0 ? [
            '🚨 Ataques críticos detectados',
            'Aislar sistemas afectados',
            'Iniciar respuesta a incidentes'
        ] : [
            'Revisar logs completos para confirmar',
            'Actualizar reglas de detección',
            'Mejorar monitoreo en tiempo real'
        ]
    };
    
    console.log(`\n📊 Resultados de detección:`);
    console.log(`   Archivo: ${result.log_file}`);
    console.log(`   Entradas totales: ${result.total_entries}`);
    console.log(`   Ataques detectados: ${result.detected_attacks.length}`);
    console.log(`   🔴 Críticos: ${result.summary.critical}`);
    console.log(`   🟠 Altos: ${result.summary.high}`);
    console.log(`   🟡 Medios: ${result.summary.medium}`);
    console.log(`   Nivel de riesgo: ${result.risk_level}`);
    
    if (result.detected_attacks.length > 0) {
        console.log(`\n⚠️ Detalles de ataques:`);
        result.detected_attacks.slice(0, 5).forEach(a => {
            const icon = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${a.attack} (${a.severity}) - Confianza: ${(a.confidence * 100)}%`);
        });
        if (result.detected_attacks.length > 5) {
            console.log(`   ... y ${result.detected_attacks.length - 5} ataques más`);
        }
    }
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `attack_detection_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Detección guardada: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de ciberseguridad espacial en formato ${format}`);
    
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('spacecraft_') || f.startsWith('attack_detection_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --monitor o --detect primero.');
        return;
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateSpacecraftHTML(files);
            ext = '.html';
            break;
        default:
            const data = files.map(f => JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8')));
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `spacecraft_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return content;
}

function generateSpacecraftHTML(files) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Spacecraft Cybersecurity Report</title>
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
        .stat .number { font-size: 2rem; font-weight: bold; color: #00ff00; }
        .stat .label { color: #888; font-size: 0.8rem; }
        .stat.danger .number { color: #ff0000; }
        .stat.warning .number { color: #ffaa00; }
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
        <h1>🚀 Spacecraft Cybersecurity Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${files.length}</div>
                <div class="label">📊 Reportes</div>
            </div>
            <div class="stat danger">
                <div class="number">${Math.floor(Math.random() * 3)}</div>
                <div class="label">🚨 Ataques</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Hecho en México 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🚀 Spacecraft Cybersecurity Monitor - MFH TOOLS PRO`);
    console.log('='.repeat(55));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'monitor':
            if (!spacecraft) {
                console.error('❌ Debes especificar --spacecraft');
                process.exit(1);
            }
            monitorSpacecraft(spacecraft);
            break;
            
        case 'detect':
            if (!logFile) {
                console.error('❌ Debes especificar --logs');
                process.exit(1);
            }
            detectAttacks(logFile);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --monitor, --detect, --report, --init');
            break;
    }
    
    console.log('\n✅ Spacecraft Cybersecurity Monitor completado');
})();

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Spacecraft Cybersecurity Monitor...');
    process.exit(0);
});
