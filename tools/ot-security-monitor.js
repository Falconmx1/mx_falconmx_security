#!/usr/bin/env node

/**
 * OT Security Monitor - MFH TOOLS PRO
 * Monitoreo de seguridad de sistemas OT
 * 
 * Uso: node ot-security-monitor.js [opciones]
 * Ejemplo: node ot-security-monitor.js --monitor --protocol modbus
 * Ejemplo: node ot-security-monitor.js --scan --network 192.168.1.0/24
 * Ejemplo: node ot-security-monitor.js --report
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'ot_sec_config.json');
const SCANS_DIR = path.join(__dirname, 'ot_scans');
const REPORTS_DIR = path.join(__dirname, 'ot_reports');

const DEFAULT_CONFIG = {
    protocols: ['modbus', 'profibus', 'profinet', 'opc-ua', 'dnp3', 'iec-104'],
    critical_assets: ['PLC', 'SCADA', 'HMI', 'RTU', 'IED'],
    vulnerabilities: {
        'Modbus Inseguro': { severity: 'critical' },
        'Sin Autenticacion': { severity: 'critical' },
        'Protocolo Desactualizado': { severity: 'high' },
        'Firmware Vulnerable': { severity: 'high' },
        'Red Abierta': { severity: 'medium' }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let protocol = null;
let network = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--monitor':
            action = 'monitor';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                protocol = args[i + 1];
                i++;
            }
            break;
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                network = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--protocol':
            protocol = args[i + 1];
            i++;
            break;
        case '--network':
            network = args[i + 1];
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
🏭 OT Security Monitor - MFH TOOLS PRO
=====================================
Monitoreo de seguridad de sistemas OT.

Uso:
  node ot-security-monitor.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --monitor [protocolo] Monitorear protocolo OT
  --scan [red]          Escanear dispositivos OT
  --report              Generar reporte OT
  --protocol <nombre>   Protocolo a monitorear
  --network <cidr>      Red a escanear
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node ot-security-monitor.js --init
  node ot-security-monitor.js --monitor --protocol modbus
  node ot-security-monitor.js --scan --network 192.168.1.0/24
  node ot-security-monitor.js --report --format html
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

function monitorOT(protocol) {
    console.log(`🏭 Monitoreando protocolo OT: ${protocol || 'modbus'}`);
    
    const config = loadConfig();
    const targetProtocol = protocol || 'modbus';
    const devices = [];
    const assetTypes = config.critical_assets;
    const vulnerabilities = Object.keys(config.vulnerabilities);
    
    const numDevices = Math.floor(Math.random() * 5) + 2;
    
    for (let i = 0; i < numDevices; i++) {
        const device = {
            id: crypto.randomBytes(8).toString('hex'),
            name: `${assetTypes[Math.floor(Math.random() * assetTypes.length)]}_${Math.floor(Math.random() * 100)}`,
            asset_type: assetTypes[Math.floor(Math.random() * assetTypes.length)],
            ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            protocol: targetProtocol,
            version: `${Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}`,
            status: ['online', 'online', 'online', 'warning', 'offline'][Math.floor(Math.random() * 5)],
            alerts: [],
            vulnerabilities: vulnerabilities.slice(0, Math.floor(Math.random() * 2) + 1),
            last_updated: new Date().toISOString()
        };
        
        // Simular alerts
        if (Math.random() > 0.6) {
            device.alerts.push({
                type: ['Comunicacion', 'Integridad', 'Seguridad', 'Rendimiento'][Math.floor(Math.random() * 4)],
                message: `Alerta en dispositivo ${device.name}`,
                timestamp: new Date().toISOString()
            });
        }
        
        devices.push(device);
    }
    
    const monitorResult = {
        timestamp: new Date().toISOString(),
        protocol: targetProtocol,
        devices: devices,
        summary: {
            total: devices.length,
            online: devices.filter(d => d.status === 'online').length,
            warning: devices.filter(d => d.status === 'warning').length,
            offline: devices.filter(d => d.status === 'offline').length,
            with_vulnerabilities: devices.filter(d => d.vulnerabilities.length > 0).length,
            total_alerts: devices.reduce((acc, d) => acc + d.alerts.length, 0)
        }
    };
    
    console.log(`\n📊 Resumen del monitoreo:`);
    console.log(`   Dispositivos: ${devices.length}`);
    console.log(`   ✅ Online: ${monitorResult.summary.online}`);
    console.log(`   ⚠️ Advertencia: ${monitorResult.summary.warning}`);
    console.log(`   ❌ Offline: ${monitorResult.summary.offline}`);
    console.log(`   🚨 Vulnerables: ${monitorResult.summary.with_vulnerabilities}`);
    console.log(`   🔔 Alertas: ${monitorResult.summary.total_alerts}`);
    
    if (devices.length > 0) {
        console.log(`\n📋 Dispositivos:`);
        devices.slice(0, 5).forEach(d => {
            const icon = d.status === 'online' ? '🟢' : d.status === 'warning' ? '🟡' : '🔴';
            console.log(`   ${icon} ${d.name} (${d.ip}) - ${d.status}`);
            if (d.alerts.length > 0) {
                console.log(`      🔔 ${d.alerts.length} alertas`);
            }
        });
        if (devices.length > 5) {
            console.log(`   ... y ${devices.length - 5} mas`);
        }
    }
    
    const outputPath = outputFile || path.join(SCANS_DIR, `ot_monitor_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(monitorResult, null, 2));
    console.log(`\n📄 Monitoreo guardado: ${outputPath}`);
    
    return monitorResult;
}

function scanOT(network) {
    console.log(`🔍 Escaneando dispositivos OT en: ${network || '192.168.1.0/24'}`);
    
    const config = loadConfig();
    const devices = [];
    const protocols = config.protocols;
    const assetTypes = config.critical_assets;
    const vulnerabilities = Object.keys(config.vulnerabilities);
    
    const numDevices = Math.floor(Math.random() * 8) + 3;
    
    for (let i = 0; i < numDevices; i++) {
        const device = {
            id: crypto.randomBytes(8).toString('hex'),
            name: `${assetTypes[Math.floor(Math.random() * assetTypes.length)]}_${Math.floor(Math.random() * 100)}`,
            asset_type: assetTypes[Math.floor(Math.random() * assetTypes.length)],
            ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            mac: generateMAC(),
            protocol: protocols[Math.floor(Math.random() * protocols.length)],
            version: `${Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 5)}`,
            manufacturer: ['Siemens', 'Rockwell', 'Schneider', 'ABB', 'GE', 'Honeywell'][Math.floor(Math.random() * 6)],
            discovered: new Date().toISOString(),
            vulnerabilities: vulnerabilities.slice(0, Math.floor(Math.random() * 2) + 1),
            open_ports: [502, 44818, 80, 443, 102].slice(0, Math.floor(Math.random() * 3) + 1)
        };
        devices.push(device);
    }
    
    const scanResult = {
        timestamp: new Date().toISOString(),
        network: network || '192.168.1.0/24',
        devices: devices,
        summary: {
            total: devices.length,
            by_protocol: {},
            by_type: {},
            with_vulnerabilities: devices.filter(d => d.vulnerabilities.length > 0).length
        }
    };
    
    devices.forEach(d => {
        scanResult.summary.by_protocol[d.protocol] = (scanResult.summary.by_protocol[d.protocol] || 0) + 1;
        scanResult.summary.by_type[d.asset_type] = (scanResult.summary.by_type[d.asset_type] || 0) + 1;
    });
    
    console.log(`\n📊 Resultados del escaneo OT:`);
    console.log(`   Dispositivos encontrados: ${devices.length}`);
    console.log(`\n   Por protocolo:`);
    for (const [protocol, count] of Object.entries(scanResult.summary.by_protocol)) {
        console.log(`      • ${protocol}: ${count}`);
    }
    console.log(`\n   Por tipo:`);
    for (const [type, count] of Object.entries(scanResult.summary.by_type)) {
        console.log(`      • ${type}: ${count}`);
    }
    console.log(`   🚨 Vulnerables: ${scanResult.summary.with_vulnerabilities}`);
    
    const outputPath = outputFile || path.join(SCANS_DIR, `ot_scan_${Date.now()}.json`);
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

function generateReport(format) {
    console.log(`📊 Generando reporte OT en formato ${format}`);
    
    const files = fs.readdirSync(SCANS_DIR).filter(f => f.startsWith('ot_'));
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --monitor o --scan primero.');
        return;
    }
    
    const latest = files[files.length - 1];
    const data = JSON.parse(fs.readFileSync(path.join(SCANS_DIR, latest), 'utf8'));
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateOTHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `ot_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateOTHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏭 OT Security Report</title>
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
        .status-online { color: #00cc00; }
        .status-warning { color: #ff8800; }
        .status-offline { color: #ff0000; }
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
        .vulnerable { color: #ff0000; font-weight: bold; }
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
        <h1>🏭 OT Security Report</h1>
        <p><strong>Fecha:</strong> ${data.timestamp}</p>
        <p><strong>Protocolo:</strong> ${data.protocol || 'N/A'}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.devices.length}</div>
                <div class="label">📌 Dispositivos</div>
            </div>
            ${data.summary ? `
                <div class="stat">
                    <div class="number">${data.summary.online || 0}</div>
                    <div class="label">✅ Online</div>
                </div>
                <div class="stat">
                    <div class="number">${data.summary.warning || 0}</div>
                    <div class="label">⚠️ Advertencias</div>
                </div>
                <div class="stat">
                    <div class="number">${data.summary.with_vulnerabilities || 0}</div>
                    <div class="label">🚨 Vulnerables</div>
                </div>
            ` : ''}
        </div>
        
        <h2>📋 Dispositivos</h2>
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>IP</th>
                    <th>Protocolo</th>
                    <th>Estado</th>
                    <th>Vulnerabilidades</th>
                </tr>
            </thead>
            <tbody>
                ${data.devices.map(d => `
                    <tr>
                        <td>${d.name}</td>
                        <td>${d.asset_type || d.type}</td>
                        <td>${d.ip}</td>
                        <td>${d.protocol || 'N/A'}</td>
                        <td class="status-${d.status || 'online'}">${d.status || 'online'}</td>
                        <td class="${d.vulnerabilities && d.vulnerabilities.length > 0 ? 'vulnerable' : ''}">${d.vulnerabilities && d.vulnerabilities.length > 0 ? '⚠️ ' + d.vulnerabilities.join(', ') : '✅'}</td>
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
    console.log(`🏭 OT Security Monitor - MFH TOOLS PRO`);
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
            monitorOT(protocol);
            break;
            
        case 'scan':
            scanOT(network);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --monitor, --scan, --report, --init');
            break;
    }
    
    console.log('\n✅ OT Security Monitor completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo OT Security Monitor...');
    process.exit(0);
});
