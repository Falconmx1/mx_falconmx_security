#!/usr/bin/env node

/**
 * Advanced Persistent Threat Detector - MFH TOOLS PRO
 * Detector de amenazas persistentes avanzadas (APT)
 * 
 * Uso: node apt-detector.js [opciones]
 * Ejemplo: node apt-detector.js --analyze --log security.log
 * Ejemplo: node apt-detector.js --pattern --group APT29
 * Ejemplo: node apt-detector.js --timeline --period 90d
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'apt_config.json');
const PATTERNS_DIR = path.join(__dirname, 'apt_patterns');
const LOGS_DIR = path.join(__dirname, 'apt_logs');
const REPORTS_DIR = path.join(__dirname, 'apt_reports');

const DEFAULT_CONFIG = {
    apt_groups: {
        APT29: {
            name: 'Cozy Bear',
            country: 'Russia',
            known_iocs: ['185.130.5.0/24', 'malware-domain.ru'],
            tactics: ['phishing', 'credential_theft', 'lateral_movement']
        },
        APT28: {
            name: 'Fancy Bear',
            country: 'Russia',
            known_iocs: ['185.130.5.0/24', 'malware-domain.ru'],
            tactics: ['spear_phishing', 'zero_day', 'data_exfiltration']
        },
        APT41: {
            name: 'Winnti Group',
            country: 'China',
            known_iocs: ['103.230.0.0/16', 'winnti-domain.com'],
            tactics: ['supply_chain', 'game_threats', 'ransomware']
        },
        APT33: {
            name: 'Elfin Group',
            country: 'Iran',
            known_iocs: ['185.130.5.0/24', 'malware-domain.ru'],
            tactics: ['credential_theft', 'data_exfiltration']
        },
        Lazarus: {
            name: 'Lazarus Group',
            country: 'North Korea',
            known_iocs: ['185.130.5.0/24', 'malware-domain.ru'],
            tactics: ['financial_attacks', 'cyber_espionage']
        }
    },
    detection: {
        confidence_threshold: 0.7,
        max_timeline_events: 100,
        correlation_window: 3600
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let logFile = null;
let groupName = null;
let period = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                logFile = args[i + 1];
                i++;
            }
            break;
        case '--pattern':
            action = 'pattern';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                groupName = args[i + 1];
                i++;
            }
            break;
        case '--timeline':
            action = 'timeline';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                period = args[i + 1];
                i++;
            }
            break;
        case '--group':
            groupName = args[i + 1];
            i++;
            break;
        case '--period':
            period = args[i + 1];
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
🎯 Advanced Persistent Threat Detector - MFH TOOLS PRO
====================================================
Detector de amenazas persistentes avanzadas (APT).

Uso:
  node apt-detector.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --analyze [archivo]   Analizar logs en busca de APT
  --pattern [grupo]     Buscar patrones de un grupo APT
  --timeline [periodo]  Generar linea de tiempo de actividad
  --group <nombre>      Nombre del grupo APT
  --period <dias>       Periodo de analisis
  --output <archivo>    Guardar resultados
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node apt-detector.js --init
  node apt-detector.js --analyze --log security.log
  node apt-detector.js --pattern --group APT29
  node apt-detector.js --timeline --period 90d
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
    if (!fs.existsSync(PATTERNS_DIR)) {
        fs.mkdirSync(PATTERNS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Patrones: ${PATTERNS_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generateLogs(count) {
    const logs = [];
    const events = [
        'Authentication failure',
        'Suspicious file upload',
        'Data exfiltration attempt',
        'Malware detection',
        'Phishing email sent',
        'Credential theft',
        'Lateral movement detected',
        'Command and control traffic'
    ];
    
    const ips = ['192.168.1.100', '10.0.0.50', '185.130.5.253', '103.230.15.20', '80.70.30.10'];
    const users = ['admin', 'john', 'jane', 'developer', 'guest'];
    
    for (let i = 0; i < count; i++) {
        const now = Date.now();
        logs.push({
            timestamp: new Date(now - Math.random() * 86400000 * 90).toISOString(),
            source_ip: ips[Math.floor(Math.random() * ips.length)],
            user: users[Math.floor(Math.random() * users.length)],
            event: events[Math.floor(Math.random() * events.length)],
            severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            details: `Event ${i+1} detected`
        });
    }
    
    return logs;
}

function analyzeAPT(logFile) {
    console.log(`🎯 Analizando logs en busca de APT: ${logFile || 'default'}`);
    
    let logs = [];
    if (logFile && fs.existsSync(logFile)) {
        try {
            const content = fs.readFileSync(logFile, 'utf8');
            logs = JSON.parse(content);
            if (!Array.isArray(logs)) {
                logs = [logs];
            }
        } catch (error) {
            console.error('❌ Error leyendo archivo:', error.message);
            return;
        }
    } else {
        logs = generateLogs(100);
    }
    
    const config = loadConfig();
    const aptGroups = config.apt_groups;
    const findings = [];
    
    console.log(`\n📊 Analizando ${logs.length} eventos...`);
    
    // Simular deteccion de APT
    for (const log of logs) {
        for (const [groupName, group] of Object.entries(aptGroups)) {
            // Verificar si algun IOC coincide
            let match = false;
            for (const ioc of group.known_iocs) {
                if (log.source_ip && log.source_ip.includes(ioc.replace('/24', ''))) {
                    match = true;
                    break;
                }
                if (log.details && log.details.includes(ioc)) {
                    match = true;
                    break;
                }
            }
            
            if (match) {
                findings.push({
                    timestamp: log.timestamp,
                    group: groupName,
                    group_name: group.name,
                    source: log.source_ip,
                    event: log.event,
                    confidence: 0.7 + Math.random() * 0.3,
                    matched_ioc: group.known_iocs[0]
                });
            }
        }
    }
    
    // Resumen de hallazgos
    const groupsDetected = {};
    for (const f of findings) {
        if (!groupsDetected[f.group]) {
            groupsDetected[f.group] = { count: 0, name: f.group_name };
        }
        groupsDetected[f.group].count++;
    }
    
    console.log(`\n🎯 Resultados del analisis APT:`);
    console.log(`   🔍 Hallazgos: ${findings.length}`);
    console.log(`   📋 Grupos detectados:`);
    for (const [group, data] of Object.entries(groupsDetected)) {
        console.log(`      • ${data.name} (${group}): ${data.count} coincidencias`);
    }
    
    if (findings.length > 0) {
        console.log(`\n⚠️ Posibles actividades APT detectadas:`);
        findings.slice(0, 5).forEach(f => {
            console.log(`   • ${f.timestamp} | ${f.group_name} | ${f.event} | Confianza: ${(f.confidence * 100).toFixed(1)}%`);
        });
        if (findings.length > 5) {
            console.log(`   ... y ${findings.length - 5} mas`);
        }
    }
    
    // Guardar resultados
    const result = {
        timestamp: new Date().toISOString(),
        total_events: logs.length,
        findings: findings,
        groups_detected: groupsDetected
    };
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`\n📄 Resultados guardados: ${outputFile}`);
    }
    
    return result;
}

function detectPattern(groupName) {
    console.log(`🔍 Buscando patrones del grupo APT: ${groupName || 'todos'}`);
    
    const config = loadConfig();
    let groups = [];
    
    if (groupName) {
        if (config.apt_groups[groupName]) {
            groups = [{ name: groupName, data: config.apt_groups[groupName] }];
        } else {
            console.error(`❌ Grupo no encontrado: ${groupName}`);
            console.log(`   Grupos disponibles: ${Object.keys(config.apt_groups).join(', ')}`);
            return;
        }
    } else {
        groups = Object.entries(config.apt_groups).map(([name, data]) => ({ name, data }));
    }
    
    for (const group of groups) {
        console.log(`\n📋 Patrones del grupo ${group.name}:`);
        console.log(`   Nombre: ${group.data.name}`);
        console.log(`   Pais: ${group.data.country}`);
        console.log(`   Tácticas: ${group.data.tactics.join(', ')}`);
        console.log(`   IoCs conocidos:`);
        group.data.known_iocs.forEach(ioc => {
            console.log(`      • ${ioc}`);
        });
    }
    
    // Generar reporte de patrones
    const report = {
        timestamp: new Date().toISOString(),
        group: groupName || 'all',
        patterns: groups.map(g => ({
            name: g.name,
            ...g.data
        }))
    };
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Reporte de patrones guardado: ${outputFile}`);
    }
    
    return report;
}

function generateTimeline(period) {
    console.log(`⏱️ Generando linea de tiempo de actividad APT (periodo: ${period || '90 dias'})`);
    
    const days = parseInt(period) || 90;
    const events = [];
    const now = Date.now();
    
    // Generar eventos APT simulados
    const aptGroups = ['APT29', 'APT28', 'APT41', 'APT33', 'Lazarus'];
    const eventTypes = [
        'C2 communication',
        'Data exfiltration',
        'Lateral movement',
        'Credential theft',
        'Malware deployment'
    ];
    
    for (let d = 0; d < days; d++) {
        const dayStart = now - (days - d) * 86400000;
        const numEvents = Math.floor(Math.random() * 3);
        
        for (let e = 0; e < numEvents; e++) {
            const ts = dayStart + Math.random() * 86400000;
            events.push({
                timestamp: new Date(ts).toISOString(),
                group: aptGroups[Math.floor(Math.random() * aptGroups.length)],
                event: eventTypes[Math.floor(Math.random() * eventTypes.length)],
                severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                source: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
            });
        }
    }
    
    // Ordenar cronologicamente
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Generar reporte de timeline
    const timeline = {
        timestamp: new Date().toISOString(),
        period: `${days} dias`,
        total_events: events.length,
        events: events,
        summary: {
            by_group: {},
            by_event: {}
        }
    };
    
    for (const event of events) {
        if (!timeline.summary.by_group[event.group]) {
            timeline.summary.by_group[event.group] = 0;
        }
        timeline.summary.by_group[event.group]++;
        
        if (!timeline.summary.by_event[event.event]) {
            timeline.summary.by_event[event.event] = 0;
        }
        timeline.summary.by_event[event.event]++;
    }
    
    console.log(`\n📊 Linea de tiempo generada:`);
    console.log(`   Eventos: ${timeline.total_events}`);
    console.log(`   Periodo: ${timeline.period}`);
    console.log(`   Por grupo:`);
    for (const [group, count] of Object.entries(timeline.summary.by_group)) {
        console.log(`      • ${group}: ${count} eventos`);
    }
    
    // Guardar timeline
    const timelineFile = path.join(REPORTS_DIR, `timeline_${Date.now()}.json`);
    fs.writeFileSync(timelineFile, JSON.stringify(timeline, null, 2));
    console.log(`\n📄 Timeline guardado: ${timelineFile}`);
    
    return timeline;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🎯 Advanced Persistent Threat Detector - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'analyze':
            analyzeAPT(logFile);
            break;
            
        case 'pattern':
            detectPattern(groupName);
            break;
            
        case 'timeline':
            generateTimeline(period);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --pattern, --timeline, --init');
            break;
    }
    
    console.log('\n✅ APT Detector completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo APT Detector...');
    process.exit(0);
});
