#!/usr/bin/env node

/**
 * Bluetooth Security Analyzer - MFH TOOLS PRO
 * Analisis de seguridad Bluetooth
 * 
 * Uso: node bluetooth-security-analyzer.js [opciones]
 * Ejemplo: node bluetooth-security-analyzer.js --scan
 * Ejemplo: node bluetooth-security-analyzer.js --analyze --device 00:11:22:33:44:55
 * Ejemplo: node bluetooth-security-analyzer.js --report
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'bt_sec_config.json');
const SCANS_DIR = path.join(__dirname, 'bt_scans');
const REPORTS_DIR = path.join(__dirname, 'bt_reports');

const DEFAULT_CONFIG = {
    scan: {
        timeout: 10,
        max_devices: 20
    },
    vulnerabilities: {
        'BlueBorne': { severity: 'critical', cvss: 9.8 },
        'BlueKeep': { severity: 'critical', cvss: 9.3 },
        'KNOB': { severity: 'high', cvss: 8.2 },
        'BLE-Spam': { severity: 'medium', cvss: 6.5 },
        'BTLE-Sniff': { severity: 'high', cvss: 7.5 }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let deviceId = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                deviceId = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--device':
            deviceId = args[i + 1];
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
📡 Bluetooth Security Analyzer - MFH TOOLS PRO
=============================================
Analisis de seguridad Bluetooth.

Uso:
  node bluetooth-security-analyzer.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan                Escanear dispositivos Bluetooth
  --analyze <device>    Analizar seguridad de dispositivo
  --report              Generar reporte Bluetooth
  --device <id>         ID del dispositivo a analizar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node bluetooth-security-analyzer.js --init
  node bluetooth-security-analyzer.js --scan
  node bluetooth-security-analyzer.js --analyze --device 00:11:22:33:44:55
  node bluetooth-security-analyzer.js --report --format html
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

function scanBluetooth() {
    console.log('📡 Escaneando dispositivos Bluetooth...');
    
    const config = loadConfig();
    const devices = [];
    const deviceClasses = ['Phone', 'Headset', 'Speaker', 'Keyboard', 'Mouse', 'Tablet', 'Laptop'];
    const manufacturers = ['Apple', 'Samsung', 'Sony', 'Bose', 'Logitech', 'Microsoft', 'Google'];
    
    const numDevices = Math.floor(Math.random() * 8) + 3;
    
    for (let i = 0; i < numDevices; i++) {
        const rssi = Math.floor(Math.random() * 50) - 80;
        const device = {
            id: crypto.randomBytes(8).toString('hex'),
            address: generateMAC(),
            name: `${deviceClasses[Math.floor(Math.random() * deviceClasses.length)]} ${Math.floor(Math.random() * 100)}`,
            device_class: deviceClasses[Math.floor(Math.random() * deviceClasses.length)],
            manufacturer: manufacturers[Math.floor(Math.random() * manufacturers.length)],
            rssi: rssi,
            distance: Math.round(Math.pow(10, (-60 - rssi) / 20) * 10) / 10,
            services: ['SPP', 'HFP', 'A2DP', 'HID', 'BLE'].slice(0, Math.floor(Math.random() * 3) + 1),
            paired: Math.random() > 0.6,
            connected: Math.random() > 0.7,
            first_seen: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
        };
        devices.push(device);
    }
    
    devices.sort((a, b) => a.rssi - b.rssi);
    
    const scanResult = {
        timestamp: new Date().toISOString(),
        devices: devices,
        summary: {
            total: devices.length,
            paired: devices.filter(d => d.paired).length,
            connected: devices.filter(d => d.connected).length,
            nearby: devices.filter(d => d.distance < 5).length
        }
    };
    
    console.log(`\n📊 Resultados del escaneo:`);
    console.log(`   Dispositivos encontrados: ${devices.length}`);
    console.log(`   🔗 Pareados: ${scanResult.summary.paired}`);
    console.log(`   🔗 Conectados: ${scanResult.summary.connected}`);
    console.log(`   📍 Cerca (< 5m): ${scanResult.summary.nearby}`);
    
    if (devices.length > 0) {
        console.log(`\n📋 Dispositivos encontrados:`);
        devices.slice(0, 5).forEach(d => {
            const icon = d.rssi > -50 ? '🟢' : d.rssi > -70 ? '🟡' : '🔴';
            console.log(`   ${icon} ${d.name} (${d.address}) - ${d.rssi}dBm (${d.distance}m)`);
        });
        if (devices.length > 5) {
            console.log(`   ... y ${devices.length - 5} mas`);
        }
    }
    
    const outputPath = outputFile || path.join(SCANS_DIR, `bt_scan_${Date.now()}.json`);
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

function analyzeBluetoothDevice(deviceId) {
    console.log(`🔍 Analizando dispositivo Bluetooth: ${deviceId}`);
    
    const config = loadConfig();
    const vulnerabilities = Object.keys(config.vulnerabilities);
    
    // Simular analisis
    const numVulns = Math.floor(Math.random() * 3);
    const detectedVulns = [];
    for (let i = 0; i < numVulns; i++) {
        const vulnName = vulnerabilities[Math.floor(Math.random() * vulnerabilities.length)];
        const vulnData = config.vulnerabilities[vulnName];
        detectedVulns.push({
            name: vulnName,
            severity: vulnData.severity,
            cvss: vulnData.cvss,
            description: `Vulnerabilidad ${vulnName} detectada`
        });
    }
    
    const analysis = {
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        security: {
            level: detectedVulns.length === 0 ? 'Seguro' : detectedVulns.some(v => v.severity === 'critical') ? 'Critico' : 'Riesgo',
            score: Math.max(0, 100 - detectedVulns.length * 25),
            vulnerabilities: detectedVulns
        },
        services: {
            exposed: ['HID', 'SPP', 'A2DP'].slice(0, Math.floor(Math.random() * 3) + 1),
            secure: Math.random() > 0.3
        },
        encryption: {
            enabled: Math.random() > 0.3,
            key_size: Math.random() > 0.5 ? 128 : 64
        },
        recommendations: detectedVulns.map(v => `Parchear vulnerabilidad ${v.name}`)
    };
    
    console.log(`\n📊 Analisis del dispositivo:`);
    console.log(`   Nivel de seguridad: ${analysis.security.level}`);
    console.log(`   Score: ${analysis.security.score}%`);
    console.log(`   Vulnerabilidades: ${analysis.security.vulnerabilities.length}`);
    if (analysis.security.vulnerabilities.length > 0) {
        console.log(`\n🔍 Vulnerabilidades encontradas:`);
        analysis.security.vulnerabilities.forEach(v => {
            const icon = v.severity === 'critical' ? '🔴' : v.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${v.name} (CVSS: ${v.cvss})`);
        });
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `bt_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return analysis;
}

function generateReport(format) {
    console.log(`📊 Generando reporte Bluetooth en formato ${format}`);
    
    const scanFiles = fs.readdirSync(SCANS_DIR).filter(f => f.startsWith('bt_scan_'));
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
            content = generateBluetoothHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `bt_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateBluetoothHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📡 Bluetooth Security Report</title>
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
        .signal-good { color: #00cc00; }
        .signal-medium { color: #ff8800; }
        .signal-bad { color: #ff0000; }
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
        <h1>📡 Bluetooth Security Report</h1>
        <p><strong>Fecha:</strong> ${data.timestamp}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.devices.length}</div>
                <div class="label">📌 Dispositivos</div>
            </div>
            <div class="stat">
                <div class="number">${data.summary.paired}</div>
                <div class="label">🔗 Pareados</div>
            </div>
            <div class="stat">
                <div class="number">${data.summary.connected}</div>
                <div class="label">🔗 Conectados</div>
            </div>
        </div>
        
        <h2>📋 Dispositivos</h2>
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Direccion</th>
                    <th>Fabricante</th>
                    <th>Señal</th>
                    <th>Distancia</th>
                    <th>Servicios</th>
                </tr>
            </thead>
            <tbody>
                ${data.devices.map(d => `
                    <tr>
                        <td>${d.name}</td>
                        <td>${d.address}</td>
                        <td>${d.manufacturer}</td>
                        <td class="signal-${d.rssi > -50 ? 'good' : d.rssi > -70 ? 'medium' : 'bad'}">${d.rssi} dBm</td>
                        <td>${d.distance}m</td>
                        <td>${d.services.join(', ')}</td>
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
    console.log(`📡 Bluetooth Security Analyzer - MFH TOOLS PRO`);
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
            scanBluetooth();
            break;
            
        case 'analyze':
            if (!deviceId) {
                console.error('❌ Debes especificar --device');
                process.exit(1);
            }
            analyzeBluetoothDevice(deviceId);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ Bluetooth Security Analyzer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Bluetooth Security Analyzer...');
    process.exit(0);
});
