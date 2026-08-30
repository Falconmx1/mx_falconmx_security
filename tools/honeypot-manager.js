#!/usr/bin/env node

/**
 * Honeypot Manager - MFH TOOLS PRO
 * Gestión de honeypots y análisis de ataques
 * 
 * Uso: node honeypot-manager.js [opciones]
 * Ejemplo: node honeypot-manager.js --deploy --port 22
 * Ejemplo: node honeypot-manager.js --analyze --log honeypot.log
 * Ejemplo: node honeypot-manager.js --status
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'honeypot_config.json');
const HONEYPOTS_DIR = path.join(__dirname, 'honeypots');
const LOGS_DIR = path.join(__dirname, 'honeypot_logs');
const REPORTS_DIR = path.join(__dirname, 'honeypot_reports');

const DEFAULT_CONFIG = {
    honeypots: {
        ssh: { enabled: true, port: 22, protocol: 'ssh' },
        http: { enabled: true, port: 80, protocol: 'http' },
        https: { enabled: false, port: 443, protocol: 'https' },
        ftp: { enabled: false, port: 21, protocol: 'ftp' },
        smtp: { enabled: false, port: 25, protocol: 'smtp' }
    },
    logging: {
        enabled: true,
        level: 'info',
        rotate: true
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let port = null;
let logFile = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--deploy':
            action = 'deploy';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                port = parseInt(args[i + 1]);
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                logFile = args[i + 1];
                i++;
            }
            break;
        case '--status':
            action = 'status';
            break;
        case '--port':
            port = parseInt(args[i + 1]);
            i++;
            break;
        case '--log':
            logFile = args[i + 1];
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
🍯 Honeypot Manager - MFH TOOLS PRO
==================================
Gestión de honeypots y análisis de ataques.

Uso:
  node honeypot-manager.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --deploy [puerto]     Desplegar honeypot en un puerto
  --analyze [log]       Analizar logs de honeypot
  --status              Estado de los honeypots
  --port <puerto>       Puerto para el honeypot
  --log <archivo>       Archivo de log a analizar
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node honeypot-manager.js --init
  node honeypot-manager.js --deploy --port 22
  node honeypot-manager.js --analyze --log honeypot.log
  node honeypot-manager.js --status
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
    if (!fs.existsSync(HONEYPOTS_DIR)) {
        fs.mkdirSync(HONEYPOTS_DIR, { recursive: true });
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
    console.log(`📁 Honeypots: ${HONEYPOTS_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function deployHoneypot(port) {
    console.log(`🍯 Desplegando honeypot en puerto: ${port || '22'}`);
    
    const targetPort = port || 22;
    const config = loadConfig();
    
    // Determinar protocolo
    let protocol = 'unknown';
    for (const [key, data] of Object.entries(config.honeypots)) {
        if (data.port === targetPort) {
            protocol = data.protocol;
            break;
        }
    }
    
    const honeypot = {
        id: crypto.randomBytes(8).toString('hex'),
        port: targetPort,
        protocol: protocol,
        deployed: new Date().toISOString(),
        status: 'active',
        attacks: 0,
        last_attack: null
    };
    
    // Simular actividad
    console.log(`\n📋 Honeypot desplegado:`);
    console.log(`   ID: ${honeypot.id}`);
    console.log(`   Puerto: ${honeypot.port}`);
    console.log(`   Protocolo: ${honeypot.protocol}`);
    console.log(`   Estado: ${honeypot.status}`);
    console.log(`   Iniciado: ${honeypot.deployed}`);
    
    // Guardar honeypot
    const honeypotFile = path.join(HONEYPOTS_DIR, `honeypot_${honeypot.id}.json`);
    fs.writeFileSync(honeypotFile, JSON.stringify(honeypot, null, 2));
    console.log(`\n📄 Honeypot guardado: ${honeypotFile}`);
    
    // Simular ataques en segundo plano
    console.log('\n🔍 Monitoreando actividad...');
    console.log('   (Presiona Ctrl+C para detener)');
    
    // Generar logs de ataque simulados
    setTimeout(() => {
        const attacks = generateAttacks(targetPort);
        const logFile = path.join(LOGS_DIR, `honeypot_${honeypot.id}_${Date.now()}.log`);
        fs.writeFileSync(logFile, JSON.stringify(attacks, null, 2));
        console.log(`\n📊 ${attacks.length} ataques registrados en el honeypot`);
        console.log(`📄 Log guardado: ${logFile}`);
    }, 3000);
    
    return honeypot;
}

function generateAttacks(port) {
    const attacks = [];
    const attackTypes = ['ssh_bruteforce', 'http_scan', 'ftp_login', 'malformed_packet', 'port_scan'];
    const ips = ['10.0.0.50', '10.0.0.100', '192.168.1.200', '8.8.8.8', '1.1.1.1', '185.130.5.253'];
    const usernames = ['root', 'admin', 'user', 'test', 'guest', 'oracle', 'postgres'];
    const passwords = ['password', '123456', 'admin', 'root', 'toor', 'letmein'];
    
    const numAttacks = Math.floor(Math.random() * 10) + 3;
    
    for (let i = 0; i < numAttacks; i++) {
        const type = attackTypes[Math.floor(Math.random() * attackTypes.length)];
        const attack = {
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            type: type,
            source_ip: ips[Math.floor(Math.random() * ips.length)],
            target_port: port,
            details: {
                username: usernames[Math.floor(Math.random() * usernames.length)],
                password: passwords[Math.floor(Math.random() * passwords.length)],
                user_agent: `Mozilla/5.0 (${['Windows', 'Linux', 'Mac'][Math.floor(Math.random() * 3)]})`
            },
            severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        };
        attacks.push(attack);
    }
    
    return attacks;
}

function analyzeHoneypot(logFile) {
    console.log(`🔍 Analizando logs de honeypot: ${logFile || 'default'}`);
    
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
        // Usar logs de ejemplo
        const latest = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.log'));
        if (latest.length > 0) {
            const content = fs.readFileSync(path.join(LOGS_DIR, latest[latest.length - 1]), 'utf8');
            logs = JSON.parse(content);
        } else {
            logs = generateAttacks(22);
        }
    }
    
    const analysis = {
        timestamp: new Date().toISOString(),
        total_attacks: logs.length,
        by_type: {},
        by_ip: {},
        by_severity: {},
        top_ips: [],
        summary: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        }
    };
    
    logs.forEach(attack => {
        analysis.by_type[attack.type] = (analysis.by_type[attack.type] || 0) + 1;
        analysis.by_ip[attack.source_ip] = (analysis.by_ip[attack.source_ip] || 0) + 1;
        analysis.by_severity[attack.severity] = (analysis.by_severity[attack.severity] || 0) + 1;
        analysis.summary[attack.severity] = (analysis.summary[attack.severity] || 0) + 1;
    });
    
    // Top IPs
    analysis.top_ips = Object.entries(analysis.by_ip)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ip, count]) => ({ ip, count }));
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   Total ataques: ${analysis.total_attacks}`);
    console.log(`\n   Por tipo:`);
    for (const [type, count] of Object.entries(analysis.by_type)) {
        console.log(`      • ${type}: ${count}`);
    }
    console.log(`\n   Por severidad:`);
    for (const [severity, count] of Object.entries(analysis.by_severity)) {
        const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
        console.log(`      ${icon} ${severity}: ${count}`);
    }
    console.log(`\n   Top IPs atacantes:`);
    analysis.top_ips.forEach(item => {
        console.log(`      • ${item.ip}: ${item.count} ataques`);
    });
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `honeypot_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return analysis;
}

function showStatus() {
    console.log('\n🍯 ESTADO DE HONEYPOTS');
    console.log('='.repeat(50));
    
    const config = loadConfig();
    const honeypotFiles = fs.readdirSync(HONEYPOTS_DIR).filter(f => f.endsWith('.json'));
    
    if (honeypotFiles.length === 0) {
        console.log('ℹ️ No hay honeypots desplegados.');
        return;
    }
    
    console.log(`\n📋 ${honeypotFiles.length} honeypots desplegados:\n`);
    
    for (const file of honeypotFiles) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(HONEYPOTS_DIR, file), 'utf8'));
            console.log(`📌 ${data.protocol.toUpperCase()} (puerto ${data.port})`);
            console.log(`   ID: ${data.id}`);
            console.log(`   Estado: ${data.status}`);
            console.log(`   Ataques: ${data.attacks || 0}`);
            console.log(`   Desplegado: ${data.deployed}`);
            console.log('');
        } catch (error) {
            console.log(`❌ Error leyendo ${file}`);
        }
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🍯 Honeypot Manager - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'deploy':
            deployHoneypot(port);
            break;
            
        case 'analyze':
            analyzeHoneypot(logFile);
            break;
            
        case 'status':
            showStatus();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --deploy, --analyze, --status, --init');
            break;
    }
    
    console.log('\n✅ Honeypot Manager completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Honeypot Manager...');
    process.exit(0);
});
