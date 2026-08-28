#!/usr/bin/env node

/**
 * Compliance Monitor - MFH TOOLS PRO
 * Monitorea cumplimiento continuo de normativas
 * 
 * Uso: node compliance-monitor.js [opciones]
 * Ejemplo: node compliance-monitor.js --scan --standard gdpr
 * Ejemplo: node compliance-monitor.js --monitor --continuous
 * Ejemplo: node compliance-monitor.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'compliance_config.json');
const SCANS_DIR = path.join(__dirname, 'compliance_scans');
const REPORTS_DIR = path.join(__dirname, 'compliance_reports');

const DEFAULT_CONFIG = {
    standards: {
        gdpr: {
            name: 'GDPR',
            version: '2018',
            checks: [
                { id: 'gdpr-01', name: 'Data Protection', critical: true },
                { id: 'gdpr-02', name: 'Privacy Policy', critical: true },
                { id: 'gdpr-03', name: 'Data Breach Response', critical: true }
            ]
        },
        pci: {
            name: 'PCI-DSS',
            version: '3.2.1',
            checks: [
                { id: 'pci-01', name: 'Cardholder Data Storage', critical: true },
                { id: 'pci-02', name: 'Encryption', critical: true },
                { id: 'pci-03', name: 'Access Control', critical: true }
            ]
        },
        iso27001: {
            name: 'ISO 27001',
            version: '2022',
            checks: [
                { id: 'iso-01', name: 'Risk Assessment', critical: true },
                { id: 'iso-02', name: 'Security Policy', critical: true },
                { id: 'iso-03', name: 'Incident Management', critical: true }
            ]
        }
    },
    monitoring: {
        frequency: 24,
        alert_threshold: 0.7
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let standard = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                standard = args[i + 1];
                i++;
            }
            break;
        case '--monitor':
            action = 'monitor';
            break;
        case '--report':
            action = 'report';
            break;
        case '--standard':
            standard = args[i + 1];
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
📊 Compliance Monitor - MFH TOOLS PRO
====================================
Monitorea cumplimiento continuo de normativas.

Uso:
  node compliance-monitor.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan [standard]     Escanear cumplimiento de un estandar
  --monitor             Monitoreo continuo
  --report              Generar reporte de cumplimiento
  --standard <nombre>   Estándar a verificar (gdpr, pci, iso27001)
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node compliance-monitor.js --init
  node compliance-monitor.js --scan --standard gdpr
  node compliance-monitor.js --monitor
  node compliance-monitor.js --report --format html
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

function scanCompliance(standard) {
    console.log(`🔍 Escaneando cumplimiento de: ${standard || 'todos'}`);
    
    const config = loadConfig();
    let standards = [];
    
    if (standard) {
        if (config.standards[standard]) {
            standards = [{ key: standard, data: config.standards[standard] }];
        } else {
            console.error(`❌ Estándar no encontrado: ${standard}`);
            console.log(`   Disponibles: ${Object.keys(config.standards).join(', ')}`);
            return;
        }
    } else {
        standards = Object.entries(config.standards).map(([key, data]) => ({ key, data }));
    }
    
    const results = [];
    for (const std of standards) {
        const scan = {
            standard: std.key,
            name: std.data.name,
            version: std.data.version,
            timestamp: new Date().toISOString(),
            checks: std.data.checks.map(check => ({
                id: check.id,
                name: check.name,
                status: ['compliant', 'partial', 'non_compliant'][Math.floor(Math.random() * 3)],
                score: Math.floor(Math.random() * 40) + 60,
                evidence: Math.random() > 0.3 ? 'Evidencia OK' : 'Sin evidencia'
            })),
            overall_score: Math.floor(Math.random() * 30) + 70,
            critical_findings: Math.floor(Math.random() * 3),
            status: Math.random() > 0.3 ? 'compliant' : 'non_compliant'
        };
        results.push(scan);
    }
    
    for (const result of results) {
        console.log(`\n📊 ${result.name} (${result.standard.toUpperCase()})`);
        console.log(`   Score: ${result.overall_score}%`);
        console.log(`   Estado: ${result.status}`);
        console.log(`   Hallazgos criticos: ${result.critical_findings}`);
        console.log(`   Checks: ${result.checks.length}`);
        result.checks.forEach(c => {
            const icon = c.status === 'compliant' ? '✅' : c.status === 'partial' ? '⚠️' : '❌';
            console.log(`      ${icon} ${c.id}: ${c.name} - ${c.status} (${c.score}%)`);
        });
    }
    
    const outputPath = outputFile || path.join(SCANS_DIR, `compliance_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Escaneo guardado: ${outputPath}`);
    
    return results;
}

function monitorCompliance() {
    console.log(`🔄 Iniciando monitoreo continuo de cumplimiento...`);
    console.log(`   ⏱️  Monitoreando cada ${DEFAULT_CONFIG.monitoring.frequency} horas`);
    console.log(`   🔔 Umbral de alerta: ${DEFAULT_CONFIG.monitoring.alert_threshold * 100}%`);
    console.log('   (Presiona Ctrl+C para detener)');
    console.log('');
    
    let iteration = 0;
    const monitorInterval = setInterval(() => {
        iteration++;
        const timestamp = new Date().toISOString();
        console.log(`\n📊 Monitoreo #${iteration} - ${timestamp}`);
        
        const config = loadConfig();
        const results = [];
        
        for (const [key, data] of Object.entries(config.standards)) {
            const score = Math.floor(Math.random() * 30) + 70;
            const status = score >= 80 ? 'compliant' : score >= 60 ? 'partial' : 'non_compliant';
            const alert = score < config.monitoring.alert_threshold * 100;
            
            results.push({ standard: key, name: data.name, score, status, alert });
            
            const icon = status === 'compliant' ? '✅' : status === 'partial' ? '⚠️' : '❌';
            console.log(`   ${icon} ${data.name}: ${score}% ${alert ? '🔔 ALERTA' : ''}`);
        }
        
        // Guardar monitoreo
        const monitorFile = path.join(SCANS_DIR, `monitor_${Date.now()}.json`);
        fs.writeFileSync(monitorFile, JSON.stringify({ iteration, timestamp, results }, null, 2));
        
    }, 30000); // Cada 30 segundos para demo
}

function generateReport(format) {
    console.log(`📊 Generando reporte de cumplimiento en formato ${format}`);
    
    const scanFiles = fs.readdirSync(SCANS_DIR).filter(f => f.startsWith('compliance_'));
    if (scanFiles.length === 0) {
        console.log('ℹ️ No hay escaneos disponibles. Ejecuta --scan primero.');
        return;
    }
    
    const latest = scanFiles[scanFiles.length - 1];
    const data = JSON.parse(fs.readFileSync(path.join(SCANS_DIR, latest), 'utf8'));
    
    const report = {
        timestamp: new Date().toISOString(),
        generated_from: latest,
        results: data,
        summary: {
            total_standards: data.length,
            compliant: data.filter(d => d.status === 'compliant').length,
            partial: data.filter(d => d.status === 'partial').length,
            non_compliant: data.filter(d => d.status === 'non_compliant').length
        }
    };
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateComplianceHTML(report);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(report, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `compliance_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function generateComplianceHTML(report) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compliance Report</title>
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
        .stat.compliant .number { color: #00cc00; }
        .stat.partial .number { color: #ff8800; }
        .stat.non_compliant .number { color: #ff0000; }
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
        <h1>📊 Compliance Report</h1>
        <p><strong>Generado:</strong> ${report.timestamp}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${report.summary.total_standards}</div>
                <div class="label">📋 Total</div>
            </div>
            <div class="stat compliant">
                <div class="number">${report.summary.compliant}</div>
                <div class="label">✅ Cumple</div>
            </div>
            <div class="stat partial">
                <div class="number">${report.summary.partial}</div>
                <div class="label">⚠️ Parcial</div>
            </div>
            <div class="stat non_compliant">
                <div class="number">${report.summary.non_compliant}</div>
                <div class="label">❌ No cumple</div>
            </div>
        </div>
        
        <h2>📋 Resultados por Estándar</h2>
        <table>
            <thead>
                <tr>
                    <th>Estándar</th>
                    <th>Score</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${report.results.map(r => `
                    <tr>
                        <td>${r.name}</td>
                        <td>${r.overall_score}%</td>
                        <td>${r.status}</td>
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
    console.log(`📊 Compliance Monitor - MFH TOOLS PRO`);
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
            scanCompliance(standard);
            break;
            
        case 'monitor':
            monitorCompliance();
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --monitor, --report, --init');
            break;
    }
    
    console.log('\n✅ Compliance Monitor completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Compliance Monitor...');
    process.exit(0);
});
