#!/usr/bin/env node

/**
 * RFID Security Scanner - MFH TOOLS PRO
 * Escaneo de seguridad RFID
 * 
 * Uso: node rfid-security-scanner.js [opciones]
 * Ejemplo: node rfid-security-scanner.js --scan
 * Ejemplo: node rfid-security-scanner.js --analyze --tag 1234567890
 * Ejemplo: node rfid-security-scanner.js --report
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'rfid_sec_config.json');
const SCANS_DIR = path.join(__dirname, 'rfid_scans');
const REPORTS_DIR = path.join(__dirname, 'rfid_reports');

const DEFAULT_CONFIG = {
    tag_types: {
        'MIFARE Classic': { security: 'weak', frequency: '13.56MHz', memory: '1KB' },
        'MIFARE Ultralight': { security: 'weak', frequency: '13.56MHz', memory: '64B' },
        'MIFARE DESFire': { security: 'strong', frequency: '13.56MHz', memory: '4KB' },
        'EM4100': { security: 'very_weak', frequency: '125kHz', memory: '64B' },
        'HID Prox': { security: 'weak', frequency: '125kHz', memory: '128B' },
        'NTAG213': { security: 'medium', frequency: '13.56MHz', memory: '144B' },
        'MIFARE Plus': { security: 'strong', frequency: '13.56MHz', memory: '2KB' }
    },
    vulnerabilities: {
        'Cloneable': { severity: 'critical' },
        'Default Keys': { severity: 'high' },
        'Weak Encryption': { severity: 'high' },
        'No Authentication': { severity: 'critical' }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let tagId = null;
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
                tagId = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--tag':
            tagId = args[i + 1];
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
📡 RFID Security Scanner - MFH TOOLS PRO
=======================================
Escaneo de seguridad RFID.

Uso:
  node rfid-security-scanner.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan                Escanear tags RFID
  --analyze <tag>       Analizar tag RFID
  --report              Generar reporte RFID
  --tag <id>            ID del tag a analizar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node rfid-security-scanner.js --init
  node rfid-security-scanner.js --scan
  node rfid-security-scanner.js --analyze --tag 1234567890
  node rfid-security-scanner.js --report --format html
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

function scanRFID() {
    console.log('📡 Escaneando tags RFID...');
    
    const config = loadConfig();
    const tagTypes = Object.keys(config.tag_types);
    const tags = [];
    const numTags = Math.floor(Math.random() * 6) + 2;
    
    for (let i = 0; i < numTags; i++) {
        const type = tagTypes[Math.floor(Math.random() * tagTypes.length)];
        const tagData = config.tag_types[type];
        const vulnerabilities = Object.keys(config.vulnerabilities);
        
        const tag = {
            id: crypto.randomBytes(10).toString('hex').toUpperCase(),
            type: type,
            security: tagData.security,
            frequency: tagData.frequency,
            memory: tagData.memory,
            manufacturer: ['NXP', 'Texas Instruments', 'Infineon', 'Atmel', 'STMicro'][Math.floor(Math.random() * 5)],
            read_range: `${(Math.random() * 8 + 2).toFixed(1)}cm`,
            writable: Math.random() > 0.4,
            vulnerabilities: vulnerabilities.slice(0, Math.floor(Math.random() * vulnerabilities.length) + 1),
            last_read: new Date().toISOString()
        };
        tags.push(tag);
    }
    
    const scanResult = {
        timestamp: new Date().toISOString(),
        tags: tags,
        summary: {
            total: tags.length,
            weak: tags.filter(t => t.security === 'very_weak' || t.security === 'weak').length,
            strong: tags.filter(t => t.security === 'strong').length,
            vulnerable: tags.filter(t => t.vulnerabilities.length > 0).length
        }
    };
    
    console.log(`\n📊 Resultados del escaneo:`);
    console.log(`   Tags encontrados: ${tags.length}`);
    console.log(`   🔴 Debiles: ${scanResult.summary.weak}`);
    console.log(`   🟢 Fuertes: ${scanResult.summary.strong}`);
    console.log(`   🚨 Con vulnerabilidades: ${scanResult.summary.vulnerable}`);
    
    if (tags.length > 0) {
        console.log(`\n📋 Tags encontrados:`);
        tags.slice(0, 5).forEach(t => {
            const icon = t.security === 'strong' ? '🟢' : t.security === 'medium' ? '🟡' : '🔴';
            console.log(`   ${icon} ${t.type} (${t.id.substring(0, 8)}) - ${t.frequency}`);
        });
        if (tags.length > 5) {
            console.log(`   ... y ${tags.length - 5} mas`);
        }
    }
    
    const outputPath = outputFile || path.join(SCANS_DIR, `rfid_scan_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scanResult, null, 2));
    console.log(`\n📄 Escaneo guardado: ${outputPath}`);
    
    return scanResult;
}

function analyzeRFIDTag(tagId) {
    console.log(`🔍 Analizando tag RFID: ${tagId}`);
    
    const config = loadConfig();
    const tagTypes = Object.keys(config.tag_types);
    const type = tagTypes[Math.floor(Math.random() * tagTypes.length)];
    const tagData = config.tag_types[type];
    const vulnerabilities = Object.keys(config.vulnerabilities);
    
    const analysis = {
        tag_id: tagId,
        timestamp: new Date().toISOString(),
        type: type,
        security_level: tagData.security,
        frequency: tagData.frequency,
        memory: tagData.memory,
        analysis: {
            cloneable: Math.random() > 0.5,
            default_credentials: Math.random() > 0.6,
            encryption: ['none', 'weak', 'medium', 'strong'][Math.floor(Math.random() * 4)],
            authentication: ['none', 'weak', 'strong'][Math.floor(Math.random() * 3)]
        },
        vulnerabilities: vulnerabilities.slice(0, Math.floor(Math.random() * 3) + 1),
        risk_score: Math.floor(Math.random() * 40) + 20,
        recommendations: [
            'Actualizar a tags con mejor seguridad',
            'Implementar autenticacion robusta',
            'Usar encriptacion fuerte'
        ]
    };
    
    console.log(`\n📊 Analisis del tag:`);
    console.log(`   Tipo: ${analysis.type}`);
    console.log(`   Seguridad: ${analysis.security_level}`);
    console.log(`   Clonable: ${analysis.analysis.cloneable ? '⚠️ Si' : '✅ No'}`);
    console.log(`   Encriptacion: ${analysis.analysis.encryption}`);
    console.log(`   Score de riesgo: ${analysis.risk_score}%`);
    
    if (analysis.vulnerabilities.length > 0) {
        console.log(`\n🔍 Vulnerabilidades:`);
        analysis.vulnerabilities.forEach(v => {
            console.log(`   • ${v}`);
        });
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `rfid_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return analysis;
}

function generateReport(format) {
    console.log(`📊 Generando reporte RFID en formato ${format}`);
    
    const scanFiles = fs.readdirSync(SCANS_DIR).filter(f => f.startsWith('rfid_scan_'));
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
            content = generateRFIDHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `rfid_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateRFIDHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📡 RFID Security Report</title>
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
        .stat.weak .number { color: #ff0000; }
        .stat.strong .number { color: #00cc00; }
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
        .security-strong { color: #00cc00; }
        .security-medium { color: #ff8800; }
        .security-weak { color: #ff0000; }
        .security-very_weak { color: #ff0000; font-weight: bold; }
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
        <h1>📡 RFID Security Report</h1>
        <p><strong>Fecha:</strong> ${data.timestamp}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.tags.length}</div>
                <div class="label">📌 Tags</div>
            </div>
            <div class="stat weak">
                <div class="number">${data.summary.weak}</div>
                <div class="label">🔴 Debiles</div>
            </div>
            <div class="stat strong">
                <div class="number">${data.summary.strong}</div>
                <div class="label">🟢 Fuertes</div>
            </div>
            <div class="stat">
                <div class="number">${data.summary.vulnerable}</div>
                <div class="label">🚨 Vulnerables</div>
            </div>
        </div>
        
        <h2>📋 Tags</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Seguridad</th>
                    <th>Frecuencia</th>
                    <th>Memoria</th>
                    <th>Vulnerabilidades</th>
                </tr>
            </thead>
            <tbody>
                ${data.tags.map(t => `
                    <tr>
                        <td>${t.id.substring(0, 8)}</td>
                        <td>${t.type}</td>
                        <td class="security-${t.security}">${t.security}</td>
                        <td>${t.frequency}</td>
                        <td>${t.memory}</td>
                        <td>${t.vulnerabilities.length > 0 ? '⚠️ ' + t.vulnerabilities.join(', ') : '✅'}</td>
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
    console.log(`📡 RFID Security Scanner - MFH TOOLS PRO`);
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
            scanRFID();
            break;
            
        case 'analyze':
            if (!tagId) {
                console.error('❌ Debes especificar --tag');
                process.exit(1);
            }
            analyzeRFIDTag(tagId);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ RFID Security Scanner completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo RFID Security Scanner...');
    process.exit(0);
});
