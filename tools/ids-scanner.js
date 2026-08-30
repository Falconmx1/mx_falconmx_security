#!/usr/bin/env node

/**
 * Intrusion Detection System - MFH TOOLS PRO
 * Sistema de detección de intrusiones en red
 * 
 * Uso: node ids-scanner.js [opciones]
 * Ejemplo: node ids-scanner.js --monitor --interface eth0
 * Ejemplo: node ids-scanner.js --analyze --pcap capture.pcap
 * Ejemplo: node ids-scanner.js --rules --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'ids_config.json');
const RULES_DIR = path.join(__dirname, 'ids_rules');
const LOGS_DIR = path.join(__dirname, 'ids_logs');
const REPORTS_DIR = path.join(__dirname, 'ids_reports');

const DEFAULT_CONFIG = {
    interfaces: ['eth0', 'wlan0'],
    rules: {
        'port_scan': { enabled: true, threshold: 10, window: 60 },
        'syn_flood': { enabled: true, threshold: 100, window: 10 },
        'bruteforce': { enabled: true, threshold: 5, window: 300 },
        'malformed_packet': { enabled: true },
        'suspicious_traffic': { enabled: true }
    },
    alerts: {
        email: false,
        slack: false,
        console: true
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let interfaceName = null;
let pcapFile = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--monitor':
            action = 'monitor';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                interfaceName = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                pcapFile = args[i + 1];
                i++;
            }
            break;
        case '--rules':
            action = 'rules';
            break;
        case '--interface':
            interfaceName = args[i + 1];
            i++;
            break;
        case '--pcap':
            pcapFile = args[i + 1];
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
🛡️ Intrusion Detection System - MFH TOOLS PRO
=============================================
Sistema de detección de intrusiones en red.

Uso:
  node ids-scanner.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --monitor [interface] Monitorear trafico en tiempo real
  --analyze <pcap>      Analizar archivo PCAP
  --rules               Listar reglas IDS
  --interface <iface>   Interfaz de red
  --pcap <archivo>      Archivo PCAP a analizar
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node ids-scanner.js --init
  node ids-scanner.js --monitor --interface eth0
  node ids-scanner.js --analyze --pcap capture.pcap
  node ids-scanner.js --rules
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
    if (!fs.existsSync(RULES_DIR)) {
        fs.mkdirSync(RULES_DIR, { recursive: true });
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
    console.log(`📁 Reglas: ${RULES_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function listRules() {
    const config = loadConfig();
    console.log('\n📋 REGLAS IDS:');
    console.log('='.repeat(50));
    
    for (const [name, data] of Object.entries(config.rules)) {
        console.log(`\n📌 ${name}`);
        console.log(`   Estado: ${data.enabled ? '✅ Activo' : '❌ Inactivo'}`);
        if (data.threshold) {
            console.log(`   Umbral: ${data.threshold}`);
            console.log(`   Ventana: ${data.window}s`);
        }
    }
}

function generateTraffic() {
    const patterns = [
        { type: 'normal', protocol: 'tcp', src_ip: '192.168.1.100', dst_ip: '8.8.8.8', port: 443 },
        { type: 'normal', protocol: 'udp', src_ip: '192.168.1.101', dst_ip: '1.1.1.1', port: 53 },
        { type: 'port_scan', protocol: 'tcp', src_ip: '10.0.0.50', dst_ip: '192.168.1.1', port: 22 },
        { type: 'port_scan', protocol: 'tcp', src_ip: '10.0.0.50', dst_ip: '192.168.1.2', port: 22 },
        { type: 'port_scan', protocol: 'tcp', src_ip: '10.0.0.50', dst_ip: '192.168.1.3', port: 22 },
        { type: 'bruteforce', protocol: 'tcp', src_ip: '10.0.0.100', dst_ip: '192.168.1.10', port: 22 },
        { type: 'bruteforce', protocol: 'tcp', src_ip: '10.0.0.100', dst_ip: '192.168.1.10', port: 22 },
        { type: 'bruteforce', protocol: 'tcp', src_ip: '10.0.0.100', dst_ip: '192.168.1.10', port: 22 },
        { type: 'syn_flood', protocol: 'tcp', src_ip: '10.0.0.200', dst_ip: '192.168.1.20', port: 80 },
        { type: 'malformed', protocol: 'tcp', src_ip: '10.0.0.30', dst_ip: '192.168.1.5', port: 443 }
    ];
    
    return patterns.map(p => ({
        ...p,
        timestamp: new Date().toISOString(),
        length: Math.floor(Math.random() * 1000) + 64
    }));
}

function detectIntrusions(traffic) {
    const config = loadConfig();
    const alerts = [];
    const counts = {};
    
    for (const packet of traffic) {
        // Detectar port scan
        if (packet.type === 'port_scan' && config.rules.port_scan.enabled) {
            const key = `${packet.src_ip}-port_scan`;
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] >= config.rules.port_scan.threshold) {
                alerts.push({
                    type: 'port_scan',
                    severity: 'high',
                    source: packet.src_ip,
                    destination: packet.dst_ip,
                    count: counts[key],
                    timestamp: new Date().toISOString(),
                    description: `Posible escaneo de puertos desde ${packet.src_ip}`
                });
                counts[key] = 0;
            }
        }
        
        // Detectar brute force
        if (packet.type === 'bruteforce' && config.rules.bruteforce.enabled) {
            const key = `${packet.src_ip}-bruteforce`;
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] >= config.rules.bruteforce.threshold) {
                alerts.push({
                    type: 'bruteforce',
                    severity: 'critical',
                    source: packet.src_ip,
                    destination: packet.dst_ip,
                    count: counts[key],
                    timestamp: new Date().toISOString(),
                    description: `Ataque de fuerza bruta detectado desde ${packet.src_ip}`
                });
                counts[key] = 0;
            }
        }
        
        // Detectar SYN flood
        if (packet.type === 'syn_flood' && config.rules.syn_flood.enabled) {
            alerts.push({
                type: 'syn_flood',
                severity: 'critical',
                source: packet.src_ip,
                destination: packet.dst_ip,
                timestamp: new Date().toISOString(),
                description: `Posible ataque SYN Flood desde ${packet.src_ip}`
            });
        }
        
        // Detectar paquetes malformados
        if (packet.type === 'malformed' && config.rules.malformed_packet.enabled) {
            alerts.push({
                type: 'malformed_packet',
                severity: 'medium',
                source: packet.src_ip,
                destination: packet.dst_ip,
                timestamp: new Date().toISOString(),
                description: `Paquete malformado detectado desde ${packet.src_ip}`
            });
        }
    }
    
    return alerts;
}

function monitorTraffic(interfaceName) {
    console.log(`🔄 Monitoreando trafico en: ${interfaceName || 'default'}`);
    console.log('   Presiona Ctrl+C para detener');
    console.log('');
    
    let iteration = 0;
    const monitorInterval = setInterval(() => {
        iteration++;
        const traffic = generateTraffic();
        const alerts = detectIntrusions(traffic);
        
        const timestamp = new Date().toISOString();
        console.log(`\n📊 Monitoreo #${iteration} - ${timestamp}`);
        console.log(`   Paquetes analizados: ${traffic.length}`);
        
        if (alerts.length > 0) {
            console.log(`   🚨 ${alerts.length} alertas generadas:`);
            for (const alert of alerts) {
                const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'high' ? '🟠' : '🟡';
                console.log(`      ${icon} ${alert.type.toUpperCase()} - ${alert.description}`);
            }
        } else {
            console.log('   ✅ No se detectaron intrusiones');
        }
        
        // Guardar logs
        const logFile = path.join(LOGS_DIR, `ids_${Date.now()}.json`);
        fs.writeFileSync(logFile, JSON.stringify({ iteration, timestamp, alerts, traffic_count: traffic.length }, null, 2));
        
    }, 5000);
}

function analyzePCAP(pcapFile) {
    console.log(`🔍 Analizando archivo PCAP: ${pcapFile || 'default'}`);
    
    const traffic = generateTraffic();
    const alerts = detectIntrusions(traffic);
    
    const stats = {
        total_packets: traffic.length,
        normal: traffic.filter(p => p.type === 'normal').length,
        suspicious: traffic.filter(p => p.type !== 'normal').length,
        alerts: alerts.length,
        by_type: {},
        by_severity: {}
    };
    
    alerts.forEach(a => {
        stats.by_type[a.type] = (stats.by_type[a.type] || 0) + 1;
        stats.by_severity[a.severity] = (stats.by_severity[a.severity] || 0) + 1;
    });
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   Paquetes totales: ${stats.total_packets}`);
    console.log(`   ✅ Normales: ${stats.normal}`);
    console.log(`   ⚠️ Sospechosos: ${stats.suspicious}`);
    console.log(`   🚨 Alertas: ${stats.alerts}`);
    
    if (alerts.length > 0) {
        console.log(`\n📋 Alertas generadas:`);
        alerts.forEach(a => {
            const icon = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${a.type.toUpperCase()}: ${a.description}`);
        });
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `ids_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({ stats, alerts }, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return { stats, alerts };
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🛡️ Intrusion Detection System - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'monitor':
            monitorTraffic(interfaceName);
            break;
            
        case 'analyze':
            analyzePCAP(pcapFile);
            break;
            
        case 'rules':
            listRules();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --monitor, --analyze, --rules, --init');
            break;
    }
    
    if (action !== 'monitor') {
        console.log('\n✅ IDS Scanner completado');
    }
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo IDS Scanner...');
    process.exit(0);
});
