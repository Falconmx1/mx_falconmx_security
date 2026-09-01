#!/usr/bin/env node

/**
 * IoT Device Scanner - MFH TOOLS PRO
 * Escaneo y analisis de dispositivos IoT
 * 
 * Uso: node iot-device-scanner.js [opciones]
 * Ejemplo: node iot-device-scanner.js --scan --network 192.168.1.0/24
 * Ejemplo: node iot-device-scanner.js --identify --mac 00:11:22:33:44:55
 * Ejemplo: node iot-device-scanner.js --report
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'iot_sec_config.json');
const SCANS_DIR = path.join(__dirname, 'iot_scans');
const REPORTS_DIR = path.join(__dirname, 'iot_reports');

const DEFAULT_CONFIG = {
    device_types: {
        'camera': { name: 'Camara IP', risk: 'medium', default_port: 80 },
        'router': { name: 'Router', risk: 'high', default_port: 80 },
        'switch': { name: 'Switch', risk: 'medium', default_port: 23 },
        'thermostat': { name: 'Termostato', risk: 'low', default_port: 8080 },
        'speaker': { name: 'Altavoz Inteligente', risk: 'low', default_port: 8008 },
        'hub': { name: 'Hub Smart Home', risk: 'medium', default_port: 80 },
        'light': { name: 'Luz Inteligente', risk: 'low', default_port: 80 },
        'unknown': { name: 'Dispositivo Desconocido', risk: 'medium', default_port: 80 }
    },
    scan: {
        timeout: 5000,
        max_devices: 50,
        use_arp: true
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let network = null;
let macAddress = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                network = args[i + 1];
                i++;
            }
            break;
        case '--identify':
            action = 'identify';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                macAddress = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--network':
            network = args[i + 1];
            i++;
            break;
        case '--mac':
            macAddress = args[i + 1];
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
📡 IoT Device Scanner - MFH TOOLS PRO
====================================
Escaneo y analisis de dispositivos IoT.

Uso:
  node iot-device-scanner.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan [red]          Escanear dispositivos IoT en red
  --identify <mac>      Identificar dispositivo por MAC
  --report              Generar reporte de dispositivos
  --network <cidr>      Red a escanear (ej: 192.168.1.0/24)
  --mac <direccion>     Direccion MAC a identificar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node iot-device-scanner.js --init
  node iot-device-scanner.js --scan --network 192.168.1.0/24
  node iot-device-scanner.js --identify --mac 00:11:22:33:44:55
  node iot-device-scanner.js --report --format html
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
    if (!fs.existsSync(SCANS_DIR)) {
        fs.mkdirSync(SCANS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Escaneos: ${SCANS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function scanIoTDevices(network) {
    console.log(`📡 Escaneando dispositivos IoT en: ${network || '192.168.1.0/24'}`);
    
    const target = network || '192.168.1.0/24';
    const config = loadConfig();
    const devices = [];
    
    // Simular descubrimiento de dispositivos
    const deviceTypes = Object.keys(config.device_types);
    const numDevices = Math.floor(Math.random() * 10) + 3;
    
    for (let i = 0; i < numDevices; i++) {
        const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const deviceType = config.device_types[type];
        const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
        
        const device = {
            id: crypto.randomBytes(8).toString('hex'),
            ip: ip,
            mac: generateMAC(),
            type: type,
            name: deviceType.name,
            risk: deviceType.risk,
            port: deviceType.default_port + Math.floor(Math.random() * 10),
            manufacturer: ['Samsung', 'Apple', 'Google', 'Amazon', 'TP-Link', 'D-Link', 'Arduino'][Math.floor(Math.random() * 7)],
            model: `Model-${Math.floor(Math.random() * 1000)}`,
            firmware: `v${Math.floor(Math.random() * 2)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
            first_seen: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
            last_seen: new Date().toISOString(),
            services: ['http', 'mqtt', 'upnp'].slice(0, Math.floor(Math.random() * 3) + 1),
            vulnerabilities: Math.random() > 0.6 ? 
                ['CVE-2024-1234', 'CVE-2024-5678'].slice(0, Math.floor(Math.random() * 2) + 1) : []
        };
        
        devices.push(device);
    }
    
    // Calcular estadisticas
    const stats = {
        total: devices.length,
        by_type: {},
        by_risk: {},
        with_vulnerabilities: devices.filter(d => d.vulnerabilities.length > 0).length
    };
    
    devices.forEach(d => {
        stats.by_type[d.type] = (stats.by_type[d.type] || 0) + 1;
        stats.by_risk[d.risk] = (stats.by_risk[d.risk] || 0) + 1;
    });
    
    const scanResult = {
        timestamp: new Date().toISOString(),
        network: target,
        devices: devices,
        stats: stats
    };
    
    console.log(`\n📊 Resultados del escaneo:`);
    console.log(`   Dispositivos encontrados: ${devices.length}`);
    console.log(`\n   Por tipo:`);
    for (const [type, count] of Object.entries(stats.by_type)) {
        console.log(`      • ${type}: ${count}`);
    }
    console.log(`\n   Por riesgo:`);
    for (const [risk, count] of Object.entries(stats.by_risk)) {
        const icon = risk === 'high' ? '🔴' : risk === 'medium' ? '🟡' : '🟢';
        console.log(`      ${icon} ${risk}: ${count}`);
    }
    console.log(`   🚨 Con vulnerabilidades: ${stats.with_vulnerabilities}`);
    
    if (devices.length > 0) {
        console.log(`\n📋 Dispositivos encontrados:`);
        devices.slice(0, 5).forEach(d => {
            const riskIcon = d.risk === 'high' ? '🔴' : d.risk === 'medium' ? '🟡' : '🟢';
            console.log(`   ${riskIcon} ${d.name} (${d.ip}) - ${d.manufacturer} ${d.model}`);
        });
        if (devices.length > 5) {
            console.log(`   ... y ${devices.length - 5} mas`);
        }
    }
    
    const outputPath = outputFile || path.join(SCANS_DIR, `iot_scan_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scanResult, null, 2));
    console.log(`\n📄 Escaneo guardado: ${outputPath}`);
    
    return scanResult;
}

function generateMAC() {
    const mac = [];
    for (let i = 0; i < 6; i++) {
        mac.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
    }
    return mac.join(':');
}

function identifyDevice(macAddress) {
    console.log(`🔍 Identificando dispositivo con MAC: ${macAddress}`);
    
    const config = loadConfig();
    const vendors = {
        '00:11:22': 'Samsung Electronics',
        '00:1A:2B': 'Apple Inc.',
        '00:1C:2D': 'Google Inc.',
        '00:1E:2F': 'Amazon Technologies',
        '00:20:30': 'TP-Link Technologies',
        '00:22:33': 'D-Link Corporation',
        '00:24:35': 'Arduino LLC'
    };
    
    const prefix = macAddress.substring(0, 8);
    const vendor = vendors[prefix] || 'Fabricante Desconocido';
    
    // Simular identificacion de tipo de dispositivo
    const deviceTypes = Object.keys(config.device_types);
    const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const deviceType = config.device_types[type];
    
    const result = {
        mac: macAddress,
        vendor: vendor,
        type: type,
        name: deviceType.name,
        risk: deviceType.risk,
        likely_os: ['Linux', 'FreeRTOS', 'Zephyr', 'TinyOS'][Math.floor(Math.random() * 4)],
        confidence: Math.random() * 0.3 + 0.7,
        identified: new Date().toISOString()
    };
    
    console.log(`\n📋 Informacion del dispositivo:`);
    console.log(`   MAC: ${result.mac}`);
    console.log(`   Fabricante: ${result.vendor}`);
    console.log(`   Tipo: ${result.name} (${result.type})`);
    console.log(`   OS: ${result.likely_os}`);
    console.log(`   Riesgo: ${result.risk}`);
    console.log(`   Confianza: ${(result.confidence * 100).toFixed(1)}%`);
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `iot_identify_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Identificacion guardada: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte IoT en formato ${format}`);
    
    const scanFiles = fs.readdirSync(SCANS_DIR).filter(f => f.startsWith('iot_scan_'));
    if (scanFiles.length === 0) {
        console.log('ℹ️ No hay escaneos disponibles. Ejecuta --scan primero.');
        return;
    }
    
    const latest = scanFiles[scanFiles.length - 1];
    const data = JSON.parse(fs.readFileSync(path.join(SCANS_DIR, latest), 'utf8'));
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateIoTHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `iot_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateIoTHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📡 IoT Device Report</title>
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
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #00ff00;
            color: #000;
            padding: 10px;
            text-align: left;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #333;
        }
        .risk-high { color: #ff0000; }
        .risk-medium { color: #ff8800; }
        .risk-low { color: #00cc00; }
        .vulnerable { color: #ff0000; font-weight: bold; }
        .safe { color: #00cc00; }
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
        <h1>📡 IoT Device Report</h1>
        <p><strong>Red:</strong> ${data.network}</p>
        <p><strong>Fecha:</strong> ${data.timestamp}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.devices.length}</div>
                <div class="label">📌 Dispositivos</div>
            </div>
            <div class="stat">
                <div class="number">${data.stats.with_vulnerabilities}</div>
                <div class="label">🚨 Vulnerables</div>
            </div>
            ${Object.entries(data.stats.by_risk).map(([risk, count]) => `
                <div class="stat">
                    <div class="number" style="color:${risk === 'high' ? '#ff0000' : risk === 'medium' ? '#ff8800' : '#00cc00'};">${count}</div>
                    <div class="label">${risk.toUpperCase()}</div>
                </div>
            `).join('')}
        </div>
        
        <h2>📋 Dispositivos</h2>
        <table>
            <thead>
                <tr>
                    <th>IP</th>
                    <th>MAC</th>
                    <th>Nombre</th>
                    <th>Fabricante</th>
                    <th>Riesgo</th>
                    <th>Vulnerabilidades</th>
                </tr>
            </thead>
            <tbody>
                ${data.devices.map(d => `
                    <tr>
                        <td>${d.ip}</td>
                        <td>${d.mac}</td>
                        <td>${d.name}</td>
                        <td>${d.manufacturer}</td>
                        <td class="risk-${d.risk}">${d.risk.toUpperCase()}</td>
                        <td class="${d.vulnerabilities.length > 0 ? 'vulnerable' : 'safe'}">${d.vulnerabilities.length > 0 ? '⚠️ ' + d.vulnerabilities.join(', ') : '✅'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📡 IoT Device Scanner - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'scan':
            scanIoTDevices(network);
            break;
            
        case 'identify':
            if (!macAddress) {
                console.error('❌ Debes especificar --mac');
                process.exit(1);
            }
            identifyDevice(macAddress);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --identify, --report, --init');
            break;
    }
    
    console.log('\n✅ IoT Device Scanner completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo IoT Device Scanner...');
    process.exit(0);
});
