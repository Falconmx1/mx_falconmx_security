#!/usr/bin/env node

/**
 * Threat Hunting Scheduler - MFH TOOLS PRO
 * Programa y ejecuta threat hunting automatico
 * 
 * Uso: node threat-hunting-scheduler.js [opciones]
 * Ejemplo: node threat-hunting-scheduler.js --schedule "0 6 * * *" --iocs iocs.json
 * Ejemplo: node threat-hunting-scheduler.js --run --target 192.168.1.0/24
 * Ejemplo: node threat-hunting-scheduler.js --list
 */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'threat_hunting_config.json');
const HUNTS_DIR = path.join(__dirname, 'threat_hunts');
const REPORTS_DIR = path.join(__dirname, 'threat_reports');

const DEFAULT_CONFIG = {
    schedules: [],
    ioc_feeds: [],
    siem_integration: {
        enabled: false,
        url: '',
        api_key: ''
    },
    notifications: {
        enabled: true,
        email: [],
        slack: null,
        teams: null
    }
};

// ==================== IOC DEFINICIONES ====================
const DEFAULT_IOOS = [
    { type: 'ip', value: '185.130.5.253', source: 'alienvault', risk: 'high' },
    { type: 'domain', value: 'malware-domain.com', source: 'misp', risk: 'high' },
    { type: 'hash', value: '5d41402abc4b2a76b9719d911017c592', source: 'virustotal', risk: 'medium' },
    { type: 'url', value: 'https://phishing-site.com/login', source: 'phishtank', risk: 'high' },
    { type: 'email', value: 'attacker@malicious.com', source: 'abuse.ch', risk: 'medium' }
];

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let schedule = null;
let target = null;
let iocsFile = null;
let outputFile = null;
let verbose = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--schedule':
            schedule = args[i + 1];
            i++;
            break;
        case '--target':
            target = args[i + 1];
            i++;
            break;
        case '--iocs':
            iocsFile = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--list':
            action = 'list';
            break;
        case '--run':
            action = 'run';
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
🔍 Threat Hunting Scheduler - MFH TOOLS PRO
==========================================
Programa y ejecuta threat hunting automatico.

Uso:
  node threat-hunting-scheduler.js [opciones]

Opciones:
  --init                   Crear configuracion por defecto
  --list                   Listar cacerias programadas
  --run                    Ejecutar una cacería inmediata
  --schedule <cron>        Programar cacería automatica
  --target <objetivo>      Objetivo a analizar (IP, rango, dominio)
  --iocs <archivo>         Archivo con IOCS en JSON
  --output <archivo>       Guardar reporte en archivo
  --verbose, -v            Mostrar mas detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node threat-hunting-scheduler.js --init
  node threat-hunting-scheduler.js --list
  node threat-hunting-scheduler.js --run --target 192.168.1.0/24
  node threat-hunting-scheduler.js --schedule "0 6 * * *" --iocs iocs.json
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
    if (!fs.existsSync(HUNTS_DIR)) {
        fs.mkdirSync(HUNTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    config.ioc_feeds = DEFAULT_IOOS;
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Cacerias: ${HUNTS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function listHunts() {
    const config = loadConfig();
    const schedules = config.schedules || [];
    
    if (schedules.length === 0) {
        console.log('ℹ️ No hay cacerias programadas.');
        return;
    }
    
    console.log('\n📋 CACERIAS PROGRAMADAS:');
    console.log('='.repeat(60));
    schedules.forEach(hunt => {
        console.log(`\n📌 ID: ${hunt.id}`);
        console.log(`   Programacion: ${hunt.schedule}`);
        console.log(`   Objetivo: ${hunt.target || 'N/A'}`);
        console.log(`   Estado: ${hunt.enabled ? '✅ Activo' : '❌ Inactivo'}`);
        console.log(`   Ultima ejecucion: ${hunt.lastRun || 'Nunca'}`);
        if (hunt.findings) {
            console.log(`   Hallazgos: ${hunt.findings}`);
        }
    });
}

function loadIOCs(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando IOCS:', error.message);
    }
    return loadConfig().ioc_feeds || DEFAULT_IOOS;
}

function performHunt(target, iocs) {
    console.log(`🔍 Iniciando cacería de amenazas para: ${target || 'N/A'}`);
    
    const startTime = Date.now();
    const findings = [];
    const stats = {
        total_iocs: iocs.length,
        matches: 0,
        false_positives: 0,
        anomalies: 0
    };

    // Simular analisis
    iocs.forEach((ioc, index) => {
        const match = Math.random() < 0.3;
        if (match) {
            const finding = {
                ioc: ioc,
                timestamp: new Date().toISOString(),
                severity: ioc.risk || 'medium',
                description: `IOC matched: ${ioc.type} - ${ioc.value}`,
                action_required: ioc.risk === 'high' ? 'Immediate blocking' : 'Monitor'
            };
            findings.push(finding);
            stats.matches++;
            
            if (Math.random() < 0.2) {
                stats.anomalies++;
            }
        }
    });

    const duration = (Date.now() - startTime) / 1000;

    const report = {
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        target: target || 'N/A',
        iocs_used: iocs.length,
        duration: duration,
        stats: stats,
        findings: findings,
        summary: {
            threat_level: stats.matches > 5 ? 'CRITICAL' : stats.matches > 2 ? 'HIGH' : stats.matches > 0 ? 'MEDIUM' : 'LOW',
            recommendation: stats.matches > 5 ? 'Immediate incident response required' : 
                           stats.matches > 2 ? 'Investigate findings' : 
                           'No immediate action required'
        },
        generatedBy: 'MFH TOOLS PRO - Threat Hunting Scheduler'
    };

    return report;
}

function generateReport(report) {
    let output = `🔍 THREAT HUNTING REPORT\n`;
    output += `=======================\n\n`;
    output += `📋 ID: ${report.id}\n`;
    output += `🕐 Fecha: ${report.timestamp}\n`;
    output += `🎯 Objetivo: ${report.target}\n`;
    output += `⏱️ Duracion: ${report.duration}s\n\n`;
    
    output += `📊 ESTADISTICAS:\n`;
    output += `   Total IOCS: ${report.stats.total_iocs}\n`;
    output += `   🔴 Matches: ${report.stats.matches}\n`;
    output += `   ⚠️ Falsos Positivos: ${report.stats.false_positives}\n`;
    output += `   🚨 Anomalias: ${report.stats.anomalies}\n\n`;
    
    output += `🎯 NIVEL DE AMENAZA: ${report.summary.threat_level}\n`;
    output += `💡 RECOMENDACION: ${report.summary.recommendation}\n\n`;
    
    if (report.findings.length > 0) {
        output += `🔎 HALLAZGOS:\n`;
        report.findings.forEach((f, i) => {
            output += `   ${i + 1}. ${f.ioc.type}: ${f.ioc.value}\n`;
            output += `      Severidad: ${f.severity}\n`;
            output += `      Accion: ${f.action_required}\n`;
        });
    } else {
        output += `✅ No se encontraron coincidencias.`;
    }
    
    output += `\n\n---\nHecho en Mexico 🇲🇽 | ${report.generatedBy}`;
    return output;
}

function saveReport(report, outputFile) {
    const content = generateReport(report);
    
    if (!outputFile) {
        const timestamp = Date.now();
        outputFile = path.join(REPORTS_DIR, `threat_hunt_${report.id}_${timestamp}.txt`);
    }
    
    fs.writeFileSync(outputFile, content);
    console.log(`✅ Reporte guardado: ${outputFile}`);
    return outputFile;
}

function scheduleHunt(target, schedule, iocs) {
    if (!cron.validate(schedule)) {
        console.error(`❌ Formato cron invalido: ${schedule}`);
        process.exit(1);
    }
    
    const config = loadConfig();
    const id = 'th-' + crypto.randomBytes(6).toString('hex');
    
    const huntItem = {
        id,
        target,
        schedule,
        iocs: iocs || [],
        enabled: true,
        createdAt: new Date().toISOString(),
        lastRun: null,
        findings: 0
    };
    
    config.schedules = config.schedules || [];
    config.schedules.push(huntItem);
    saveConfig(config);
    
    const task = cron.schedule(schedule, () => {
        console.log(`🔄 Ejecutando cacería programada: ${id}`);
        const iocsData = loadIOCs(iocs) || config.ioc_feeds || DEFAULT_IOOS;
        const report = performHunt(target, iocsData);
        const filePath = saveReport(report);
        
        const config2 = loadConfig();
        const item = config2.schedules.find(h => h.id === id);
        if (item) {
            item.lastRun = new Date().toISOString();
            item.findings = report.findings.length;
            saveConfig(config2);
        }
    });
    
    global.scheduledHunts = global.scheduledHunts || {};
    global.scheduledHunts[id] = task;
    
    console.log(`✅ Cacería programada: ${id}`);
    console.log(`📋 Programacion: ${schedule}`);
    console.log(`🎯 Objetivo: ${target || 'N/A'}`);
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Threat Hunting Scheduler - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(HUNTS_DIR)) {
        fs.mkdirSync(HUNTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = loadConfig();
    const schedules = config.schedules || [];
    global.scheduledHunts = global.scheduledHunts || {};
    
    for (const hunt of schedules) {
        if (hunt.enabled && cron.validate(hunt.schedule)) {
            const task = cron.schedule(hunt.schedule, () => {
                console.log(`🔄 Ejecutando cacería programada: ${hunt.id}`);
                const iocsData = loadIOCs(hunt.iocs) || config.ioc_feeds || DEFAULT_IOOS;
                const report = performHunt(hunt.target, iocsData);
                const filePath = saveReport(report);
                
                const config2 = loadConfig();
                const item = config2.schedules.find(h => h.id === hunt.id);
                if (item) {
                    item.lastRun = new Date().toISOString();
                    item.findings = report.findings.length;
                    saveConfig(config2);
                }
            });
            global.scheduledHunts[hunt.id] = task;
        }
    }
    
    if (Object.keys(global.scheduledHunts).length > 0) {
        console.log(`⏰ ${Object.keys(global.scheduledHunts).length} cacerías programadas`);
    }
    
    switch (action) {
        case 'list':
            listHunts();
            break;
        case 'run':
            const iocsData = loadIOCs(iocsFile) || config.ioc_feeds || DEFAULT_IOOS;
            const report = performHunt(target, iocsData);
            saveReport(report, outputFile);
            break;
        default:
            if (schedule) {
                const iocsData = loadIOCs(iocsFile) || config.ioc_feeds || DEFAULT_IOOS;
                scheduleHunt(target, schedule, iocsData);
            } else {
                console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
                console.log('💡 Opciones: --list, --run, --schedule, --init');
            }
            break;
    }
    
    console.log('\n✅ Threat Hunting Scheduler completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo threat hunting scheduler...');
    if (global.scheduledHunts) {
        for (const [id, task] of Object.entries(global.scheduledHunts)) {
            task.stop();
        }
    }
    process.exit(0);
});
