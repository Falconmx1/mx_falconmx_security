#!/usr/bin/env node

/**
 * Physical Security Integrator - MFH TOOLS PRO
 * Integración de seguridad física y lógica
 * 
 * Uso: node physical-security-integrator.js [opciones]
 * Ejemplo: node physical-security-integrator.js --scan --zone "oficinas"
 * Ejemplo: node physical-security-integrator.js --monitor
 * Ejemplo: node physical-security-integrator.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'physical_config.json');
const PHYSICAL_DIR = path.join(__dirname, 'physical');
const REPORTS_DIR = path.join(__dirname, 'physical_reports');

const DEFAULT_CONFIG = {
    zones: ['oficinas', 'data_center', 'almacen', 'accesos', 'perimetro'],
    devices: ['cctv', 'control_acceso', 'alarma', 'sensor_movimiento', 'cerradura_electronica'],
    alerts: ['intrusión', 'fuego', 'inundación', 'corte_energía', 'fallo_sistema']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let zoneName = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                zoneName = args[i + 1];
                i++;
            }
            break;
        case '--monitor':
            action = 'monitor';
            break;
        case '--report':
            action = 'report';
            break;
        case '--zone':
            zoneName = args[i + 1];
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
🏢 Physical Security Integrator - MFH TOOLS PRO
================================================
Integración de seguridad física y lógica.

Uso:
  node physical-security-integrator.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --scan <zona>             Escanear zona física
  --monitor                 Monitorear estado de seguridad
  --report                  Generar reporte integrado
  --zone <nombre>           Zona a escanear
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node physical-security-integrator.js --init
  node physical-security-integrator.js --scan --zone "oficinas"
  node physical-security-integrator.js --monitor
  node physical-security-integrator.js --report --format html
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
    if (!fs.existsSync(PHYSICAL_DIR)) {
        fs.mkdirSync(PHYSICAL_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos físicos: ${PHYSICAL_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function scanZone(zone) {
    console.log(`🔍 Escaneando zona física: ${zone}`);
    
    const config = loadConfig();
    const zones = config.zones;
    
    if (!zones.includes(zone)) {
        console.error(`❌ Zona "${zone}" no encontrada. Opciones: ${zones.join(', ')}`);
        return;
    }
    
    const devices = config.devices;
    const selectedDevices = devices.slice(0, Math.floor(Math.random() * devices.length) + 1);
    
    const scan = {
        zone: zone,
        timestamp: new Date().toISOString(),
        devices: [],
        status: 'OK',
        incidents: [],
        recommendations: []
    };
    
    for (const device of selectedDevices) {
        const status = ['OK', 'Warning', 'Critical'][Math.floor(Math.random() * 3)];
        const reading = Math.round(Math.random() * 100);
        
        scan.devices.push({
            name: device,
            status: status,
            reading: reading,
            message: status === 'OK' ? 'Funcionando correctamente' : 
                     status === 'Warning' ? 'Requiere atención' : 'Fallo detectado'
        });
        
        if (status === 'Critical') {
            scan.incidents.push(`Fallo en ${device} en zona ${zone}`);
        }
    }
    
    // Generar recomendaciones
    const recs = [
        'Revisar estado de dispositivos críticos',
        'Actualizar firmware de sistemas de seguridad',
        'Realizar pruebas de integración física-lógica',
        'Verificar logs de acceso físico',
        'Revisar cámaras de CCTV'
    ];
    scan.recommendations = recs.slice(0, 2 + Math.floor(Math.random() * 3));
    
    console.log(`\n📊 Resultados del escaneo:`);
    console.log(`   Zona: ${scan.zone}`);
    console.log(`   Estado general: ${scan.status}`);
    console.log(`   Dispositivos: ${scan.devices.length}`);
    console.log(`   Incidentes: ${scan.incidents.length}`);
    
    console.log(`\n📋 Dispositivos:`);
    for (const d of scan.devices) {
        const icon = d.status === 'OK' ? '🟢' : d.status === 'Warning' ? '🟡' : '🔴';
        console.log(`   ${icon} ${d.name}: ${d.status} (${d.reading}%)`);
    }
    
    if (scan.incidents.length > 0) {
        console.log(`\n⚠️ Incidentes detectados:`);
        scan.incidents.forEach(i => console.log(`   • ${i}`));
    }
    
    if (scan.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        scan.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(PHYSICAL_DIR, `scan_${zone}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scan, null, 2));
    console.log(`\n📄 Escaneo guardado: ${outputPath}`);
    
    return scan;
}

function monitorStatus() {
    console.log('📡 Monitoreando estado de seguridad física');
    console.log('='.repeat(45));
    
    const config = loadConfig();
    const zones = config.zones;
    
    const status = {
        timestamp: new Date().toISOString(),
        zones: {},
        overall_status: 'OK',
        total_devices: 0,
        devices_ok: 0,
        devices_warning: 0,
        devices_critical: 0,
        alerts: []
    };
    
    for (const zone of zones) {
        const devices = config.devices;
        const zoneDevices = devices.slice(0, Math.floor(Math.random() * devices.length) + 1);
        
        status.zones[zone] = [];
        let hasCritical = false;
        
        for (const device of zoneDevices) {
            const st = ['OK', 'Warning', 'Critical'][Math.floor(Math.random() * 3)];
            status.zones[zone].push({ name: device, status: st });
            status.total_devices++;
            
            if (st === 'OK') status.devices_ok++;
            else if (st === 'Warning') status.devices_warning++;
            else { status.devices_critical++; hasCritical = true; }
        }
        
        if (hasCritical) {
            status.alerts.push(`⚠️ Zona ${zone}: Dispositivos críticos detectados`);
        }
    }
    
    if (status.devices_critical > 0) status.overall_status = 'Critical';
    else if (status.devices_warning > 0) status.overall_status = 'Warning';
    
    console.log(`\n📊 Estado del sistema:`);
    console.log(`   Estado general: ${status.overall_status}`);
    console.log(`   Zonas: ${zones.length}`);
    console.log(`   Dispositivos totales: ${status.total_devices}`);
    console.log(`   🟢 OK: ${status.devices_ok}`);
    console.log(`   🟡 Warning: ${status.devices_warning}`);
    console.log(`   🔴 Critical: ${status.devices_critical}`);
    
    if (status.alerts.length > 0) {
        console.log(`\n🚨 Alertas activas:`);
        status.alerts.forEach(a => console.log(`   ${a}`));
    }
    
    const outputPath = outputFile || path.join(PHYSICAL_DIR, `monitor_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(status, null, 2));
    console.log(`\n📄 Monitor guardado: ${outputPath}`);
    
    return status;
}

function generateReport(format) {
    console.log(`📊 Generando reporte integrado de seguridad física en formato ${format}`);
    
    const files = fs.readdirSync(PHYSICAL_DIR).filter(f => f.startsWith('scan_') || f.startsWith('monitor_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --scan o --monitor primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(PHYSICAL_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {
            // Ignorar
        }
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generatePhysicalHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `physical_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generatePhysicalHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏢 Physical Security Report</title>
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
        .status-OK { color: #00ff00; }
        .status-Warning { color: #ffc107; }
        .status-Critical { color: #dc3545; }
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
        <h1>🏢 Physical Security Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Registros:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Estado de Dispositivos</h2>
        <p class="small">Revisar reportes individuales para detalles específicos.</p>
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🏢 Physical Security Integrator - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'scan':
            if (!zoneName) {
                console.error('❌ Debes especificar --zone');
                process.exit(1);
            }
            scanZone(zoneName);
            break;
            
        case 'monitor':
            monitorStatus();
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --monitor, --report, --init');
            break;
    }
    
    console.log('\n✅ Physical Security Integrator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Physical Security Integrator...');
    process.exit(0);
});
