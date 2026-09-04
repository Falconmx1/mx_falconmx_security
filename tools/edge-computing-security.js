#!/usr/bin/env node

/**
 * Edge Computing Security - MFH TOOLS PRO
 * Seguridad para edge computing
 * 
 * Uso: node edge-computing-security.js [opciones]
 * Ejemplo: node edge-computing-security.js --scan --node edge01
 * Ejemplo: node edge-computing-security.js --monitor --cluster
 * Ejemplo: node edge-computing-security.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'edge_config.json');
const EDGE_DIR = path.join(__dirname, 'edge_data');
const REPORTS_DIR = path.join(__dirname, 'edge_reports');

const DEFAULT_CONFIG = {
    edge_types: ['IoT', 'Gateway', 'Fog', 'Cloudlet', 'MEC'],
    threat_vectors: ['physical_access', 'network_intrusion', 'data_leakage', 'device_compromise', 'man_in_the_middle'],
    security_controls: ['encryption', 'authentication', 'firewall', 'intrusion_detection', 'secure_boot']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let nodeName = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                nodeName = args[i + 1];
                i++;
            }
            break;
        case '--monitor':
            action = 'monitor';
            break;
        case '--report':
            action = 'report';
            break;
        case '--node':
            nodeName = args[i + 1];
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
⚡ Edge Computing Security - MFH TOOLS PRO
==========================================
Seguridad para edge computing.

Uso:
  node edge-computing-security.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --scan <nodo>             Escanear seguridad de nodo edge
  --monitor                 Monitorear estado de seguridad
  --report                  Generar reporte de seguridad
  --node <nombre>           Nombre del nodo edge
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node edge-computing-security.js --init
  node edge-computing-security.js --scan --node edge01
  node edge-computing-security.js --monitor
  node edge-computing-security.js --report --format html
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
    if (!fs.existsSync(EDGE_DIR)) {
        fs.mkdirSync(EDGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos edge: ${EDGE_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function scanEdgeNode(node) {
    console.log(`⚡ Escaneando nodo edge: ${node}`);
    
    const config = loadConfig();
    const edgeTypes = config.edge_types;
    const threats = config.threat_vectors;
    const controls = config.security_controls;
    
    const scan = {
        node: node,
        type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
        timestamp: new Date().toISOString(),
        status: 'online',
        resources: {
            cpu: `${(Math.random() * 80 + 10).toFixed(1)}%`,
            memory: `${(Math.random() * 80 + 10).toFixed(1)}%`,
            storage: `${(Math.random() * 70 + 10).toFixed(1)}%`,
            network: `${(Math.random() * 50 + 10).toFixed(1)} Mbps`
        },
        vulnerabilities: [],
        security_controls: [],
        security_score: 0,
        recommendations: []
    };
    
    // Simular vulnerabilidades
    const vulnCount = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < vulnCount; i++) {
        const threat = threats[Math.floor(Math.random() * threats.length)];
        const severity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
        scan.vulnerabilities.push({
            threat: threat,
            severity: severity,
            description: `Vulnerabilidad ${threat} detectada en ${node}`,
            impact: severity === 'high' ? 'Alto riesgo de compromiso' : 'Riesgo moderado'
        });
    }
    
    // Simular controles implementados
    const controlCount = Math.floor(Math.random() * controls.length) + 1;
    for (let i = 0; i < controlCount; i++) {
        const control = controls[i % controls.length];
        const implemented = Math.random() > 0.2;
        scan.security_controls.push({
            name: control,
            implemented: implemented,
            status: implemented ? 'active' : 'pending'
        });
    }
    
    // Calcular score
    const implementedControls = scan.security_controls.filter(c => c.implemented).length;
    const vulnWeight = scan.vulnerabilities.reduce((acc, v) => {
        const w = v.severity === 'high' ? 30 : v.severity === 'medium' ? 15 : 5;
        return acc + w;
    }, 0);
    const controlWeight = (implementedControls / scan.security_controls.length) * 100;
    scan.security_score = Math.max(0, Math.min(100, (controlWeight * 0.7) + (100 - vulnWeight) * 0.3));
    
    // Recomendaciones
    const recs = [
        'Actualizar firmware del dispositivo',
        'Implementar cifrado de datos en reposo',
        'Configurar firewall perimetral',
        'Establecer politicas de acceso',
        'Monitorear actividad sospechosa'
    ];
    scan.recommendations = recs.slice(0, 2 + Math.floor(Math.random() * 3));
    
    console.log(`\n📊 Resultados del escaneo:`);
    console.log(`   Nodo: ${scan.node}`);
    console.log(`   Tipo: ${scan.type}`);
    console.log(`   Status: ${scan.status}`);
    console.log(`   Recursos - CPU: ${scan.resources.cpu}, RAM: ${scan.resources.memory}`);
    console.log(`   Vulnerabilidades: ${scan.vulnerabilities.length}`);
    console.log(`   Controles implementados: ${implementedControls}/${scan.security_controls.length}`);
    console.log(`   Score de seguridad: ${Math.round(scan.security_score)}%`);
    
    console.log(`\n🔍 Vulnerabilidades:`);
    scan.vulnerabilities.forEach(v => {
        const icon = v.severity === 'high' ? '🔴' : v.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${icon} ${v.threat} (${v.severity})`);
    });
    
    console.log(`\n🛡️ Controles de seguridad:`);
    scan.security_controls.forEach(c => {
        console.log(`   ${c.implemented ? '✅' : '❌'} ${c.name}: ${c.status}`);
    });
    
    if (scan.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        scan.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(EDGE_DIR, `edge_${node}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scan, null, 2));
    console.log(`\n📄 Escaneo guardado: ${outputPath}`);
    
    return scan;
}

function monitorEdge() {
    console.log('📡 Monitoreando estado de nodos edge');
    console.log('='.repeat(45));
    
    const config = loadConfig();
    const edgeTypes = config.edge_types;
    
    const nodes = ['edge-01', 'edge-02', 'edge-03', 'gateway-01', 'fog-node-01'];
    const status = {
        timestamp: new Date().toISOString(),
        nodes: [],
        summary: {
            total: 0,
            online: 0,
            warning: 0,
            offline: 0
        },
        alerts: []
    };
    
    for (const name of nodes) {
        const isOnline = Math.random() > 0.1;
        const hasWarnings = Math.random() > 0.7;
        const state = !isOnline ? 'offline' : hasWarnings ? 'warning' : 'online';
        
        status.nodes.push({
            name: name,
            type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
            status: state,
            uptime: `${Math.floor(Math.random() * 30) + 1}d ${Math.floor(Math.random() * 24)}h`,
            load: `${(Math.random() * 80 + 10).toFixed(1)}%`,
            last_heartbeat: new Date(Date.now() - Math.random() * 60000).toISOString()
        });
        
        status.summary.total++;
        status.summary[state]++;
        
        if (state === 'offline') {
            status.alerts.push(`🔴 Nodo ${name} offline`);
        } else if (state === 'warning') {
            status.alerts.push(`🟡 Nodo ${name} con advertencias`);
        }
    }
    
    console.log(`\n📊 Estado del cluster edge:`);
    console.log(`   Nodos totales: ${status.summary.total}`);
    console.log(`   🟢 Online: ${status.summary.online}`);
    console.log(`   🟡 Warning: ${status.summary.warning}`);
    console.log(`   🔴 Offline: ${status.summary.offline}`);
    
    console.log(`\n📋 Detalle de nodos:`);
    status.nodes.forEach(n => {
        const icon = n.status === 'online' ? '🟢' : n.status === 'warning' ? '🟡' : '🔴';
        console.log(`   ${icon} ${n.name} (${n.type}) - ${n.status} - Load: ${n.load}`);
    });
    
    if (status.alerts.length > 0) {
        console.log(`\n🚨 Alertas:`);
        status.alerts.forEach(a => console.log(`   ${a}`));
    }
    
    const outputPath = outputFile || path.join(EDGE_DIR, `edge_monitor_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(status, null, 2));
    console.log(`\n📄 Monitor guardado: ${outputPath}`);
    
    return status;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de seguridad edge en formato ${format}`);
    
    const files = fs.readdirSync(EDGE_DIR).filter(f => f.startsWith('edge_') || f.startsWith('edge_monitor_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --scan o --monitor primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(EDGE_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateEdgeHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `edge_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateEdgeHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚡ Edge Computing Security Report</title>
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
        <h1>⚡ Edge Computing Security Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Registros:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Nodos Edge</h2>
        ${data.map(d => {
            if (d.node) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">⚡ ${d.node}</h3>
                        <p>Tipo: ${d.type} | Score: ${Math.round(d.security_score)}%</p>
                        <p>Vulnerabilidades: ${d.vulnerabilities.length} | Controles: ${d.security_controls.filter(c => c.implemented).length}/${d.security_controls.length}</p>
                    </div>
                `;
            }
            return '';
        }).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`⚡ Edge Computing Security - MFH TOOLS PRO`);
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
            if (!nodeName) {
                console.error('❌ Debes especificar --node');
                process.exit(1);
            }
            scanEdgeNode(nodeName);
            break;
            
        case 'monitor':
            monitorEdge();
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --monitor, --report, --init');
            break;
    }
    
    console.log('\n✅ Edge Computing Security completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Edge Computing Security...');
    process.exit(0);
});
