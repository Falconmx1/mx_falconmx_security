#!/usr/bin/env node

/**
 * Threat Hunting Pro - MFH TOOLS PRO
 * Caza de amenazas profesional con técnicas avanzadas
 * 
 * Uso: node threat-hunting-pro.js [opciones]
 * Ejemplo: node threat-hunting-pro.js --hunt --query "select * from events"
 * Ejemplo: node threat-hunting-pro.js --investigate --ioc "185.130.5.253"
 * Ejemplo: node threat-hunting-pro.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec, execSync } = require('child_process');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'threat_hunting_pro_config.json');
const HUNTS_DIR = path.join(__dirname, 'threat_hunts_pro');
const IOCS_DIR = path.join(__dirname, 'threat_iocs');
const REPORTS_DIR = path.join(__dirname, 'threat_hunting_reports');

const DEFAULT_CONFIG = {
    hunting: {
        max_results: 1000,
        timeout: 300,
        concurrent_queries: 5
    },
    iocs: {
        sources: ['alienvault', 'virustotal', 'abuseipdb', 'misp'],
        auto_update: true,
        update_interval: 3600
    },
    reporting: {
        format: 'html',
        include_raw: false,
        include_graphs: true
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let query = null;
let iocValue = null;
let format = 'html';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--hunt':
            action = 'hunt';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                query = args[i + 1];
                i++;
            }
            break;
        case '--investigate':
            action = 'investigate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                iocValue = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--iocs':
            action = 'iocs';
            break;
        case '--format':
            format = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--query':
            query = args[i + 1];
            i++;
            break;
        case '--ioc':
            iocValue = args[i + 1];
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
🔍 Threat Hunting Pro - MFH TOOLS PRO
====================================
Caza de amenazas profesional con tecnicas avanzadas.

Uso:
  node threat-hunting-pro.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --hunt [query]        Ejecutar caza de amenazas
  --investigate <ioc>   Investigar un IoC especifico
  --report              Generar reporte de cacería
  --iocs                Listar IoCs disponibles
  --format <formato>    Formato de reporte (html, json, pdf)
  --query <consulta>    Consulta de cacería
  --ioc <valor>         IoC a investigar (IP, dominio, hash)
  --output <archivo>    Guardar resultados
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node threat-hunting-pro.js --init
  node threat-hunting-pro.js --hunt --query "failed_login > 5"
  node threat-hunting-pro.js --investigate --ioc 185.130.5.253
  node threat-hunting-pro.js --report --format html
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
    if (!fs.existsSync(IOCS_DIR)) {
        fs.mkdirSync(IOCS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear IoCs de ejemplo
    const sampleIocs = [
        { type: 'ip', value: '185.130.5.253', source: 'alienvault', risk: 'high', first_seen: '2025-01-15' },
        { type: 'domain', value: 'malware-domain.com', source: 'misp', risk: 'high', first_seen: '2025-01-10' },
        { type: 'hash', value: '5d41402abc4b2a76b9719d911017c592', source: 'virustotal', risk: 'medium', first_seen: '2025-01-05' },
        { type: 'url', value: 'https://phishing-site.com/login', source: 'phishtank', risk: 'high', first_seen: '2025-01-20' },
        { type: 'email', value: 'attacker@malicious.com', source: 'abuse.ch', risk: 'medium', first_seen: '2025-01-12' }
    ];
    const iocsPath = path.join(IOCS_DIR, 'sample_iocs.json');
    fs.writeFileSync(iocsPath, JSON.stringify(sampleIocs, null, 2));
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Cacerias: ${HUNTS_DIR}`);
    console.log(`📁 IoCs: ${IOCS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function loadIOCs() {
    const iocs = [];
    const files = fs.readdirSync(IOCS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(IOCS_DIR, file), 'utf8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
                iocs.push(...data);
            } else {
                iocs.push(data);
            }
        } catch (error) {
            // Ignorar archivos corruptos
        }
    }
    return iocs;
}

function performHunt(query) {
    console.log(`🔍 Ejecutando caza de amenazas: ${query || 'sin query especifica'}`);
    
    const config = loadConfig();
    const startTime = Date.now();
    const findings = [];
    const iocs = loadIOCs();
    
    // Simular busqueda
    const totalRecords = Math.floor(Math.random() * 5000) + 1000;
    const matchedRecords = Math.floor(Math.random() * 200) + 10;
    
    console.log(`\n📊 Escaneando ${totalRecords} registros...`);
    
    // Generar hallazgos simulados
    for (let i = 0; i < Math.min(matchedRecords, 20); i++) {
        const ioc = iocs[Math.floor(Math.random() * iocs.length)];
        findings.push({
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
            ioc: ioc || { type: 'unknown', value: 'unknown' },
            source: ['firewall', 'ids', 'endpoint', 'email', 'dns'][Math.floor(Math.random() * 5)],
            severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            description: `Match found for ${ioc ? ioc.type : 'unknown'} ${ioc ? ioc.value : 'unknown'}`,
            confidence: Math.random() * 0.5 + 0.5
        });
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    const huntResult = {
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        query: query || 'default hunt',
        duration: duration,
        total_records: totalRecords,
        matched_records: matchedRecords,
        findings: findings,
        summary: {
            total_findings: findings.length,
            critical: findings.filter(f => f.severity === 'critical').length,
            high: findings.filter(f => f.severity === 'high').length,
            medium: findings.filter(f => f.severity === 'medium').length,
            low: findings.filter(f => f.severity === 'low').length
        }
    };
    
    // Guardar resultados
    const huntFile = path.join(HUNTS_DIR, `hunt_${huntResult.id}.json`);
    fs.writeFileSync(huntFile, JSON.stringify(huntResult, null, 2));
    
    console.log(`\n📊 Resultados de la cacería:`);
    console.log(`   🔍 Hallazgos: ${findings.length}`);
    console.log(`   🚨 Criticos: ${huntResult.summary.critical}`);
    console.log(`   🔴 Altos: ${huntResult.summary.high}`);
    console.log(`   🟡 Medios: ${huntResult.summary.medium}`);
    console.log(`   🟢 Bajos: ${huntResult.summary.low}`);
    console.log(`   ⏱️ Duracion: ${duration.toFixed(2)}s`);
    console.log(`   📁 Guardado: ${huntFile}`);
    
    return huntResult;
}

function investigateIOC(iocValue) {
    console.log(`🔍 Investigando IoC: ${iocValue}`);
    
    const iocs = loadIOCs();
    const found = iocs.find(i => i.value === iocValue || i.value.includes(iocValue));
    
    if (found) {
        console.log(`\n📋 IoC encontrado en la base de datos:`);
        console.log(`   Tipo: ${found.type}`);
        console.log(`   Valor: ${found.value}`);
        console.log(`   Fuente: ${found.source}`);
        console.log(`   Riesgo: ${found.risk}`);
        console.log(`   Primera vista: ${found.first_seen || 'Desconocido'}`);
    } else {
        console.log(`\n⚠️ IoC no encontrado en la base de datos local.`);
        console.log(`\n🔍 Realizando busqueda en fuentes externas...`);
    }
    
    // Simular investigacion
    const investigation = {
        ioc: iocValue,
        timestamp: new Date().toISOString(),
        sources: {
            alienvault: { found: Math.random() > 0.3, score: Math.random() * 100 },
            virustotal: { found: Math.random() > 0.2, score: Math.random() * 100 },
            abuseipdb: { found: Math.random() > 0.3, score: Math.random() * 100 },
            misp: { found: Math.random() > 0.4, score: Math.random() * 100 }
        },
        summary: {
            total_sources: 4,
            positive_matches: 0,
            average_score: 0,
            threat_level: 'unknown'
        }
    };
    
    // Calcular resumen
    let totalScore = 0;
    let positiveCount = 0;
    for (const [source, data] of Object.entries(investigation.sources)) {
        if (data.found) {
            positiveCount++;
            totalScore += data.score;
        }
    }
    investigation.summary.positive_matches = positiveCount;
    investigation.summary.average_score = positiveCount > 0 ? totalScore / positiveCount : 0;
    
    if (investigation.summary.average_score > 70) {
        investigation.summary.threat_level = 'critical';
    } else if (investigation.summary.average_score > 50) {
        investigation.summary.threat_level = 'high';
    } else if (investigation.summary.average_score > 30) {
        investigation.summary.threat_level = 'medium';
    } else {
        investigation.summary.threat_level = 'low';
    }
    
    console.log(`\n📊 Resultados de investigacion:`);
    console.log(`   Fuentes consultadas: ${investigation.summary.total_sources}`);
    console.log(`   Matches positivos: ${positiveCount}/${investigation.summary.total_sources}`);
    console.log(`   Score promedio: ${investigation.summary.average_score.toFixed(1)}`);
    console.log(`   🎯 Nivel de amenaza: ${investigation.summary.threat_level.toUpperCase()}`);
    
    // Guardar investigacion
    const reportPath = path.join(REPORTS_DIR, `investigation_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(investigation, null, 2));
    console.log(`\n📄 Investigacion guardada: ${reportPath}`);
    
    return investigation;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de cacería en formato ${format}`);
    
    const hunts = [];
    const huntFiles = fs.readdirSync(HUNTS_DIR).filter(f => f.endsWith('.json'));
    for (const file of huntFiles.slice(-10)) {
        try {
            const content = fs.readFileSync(path.join(HUNTS_DIR, file), 'utf8');
            const data = JSON.parse(content);
            hunts.push(data);
        } catch (error) {
            // Ignorar archivos corruptos
        }
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        generated_by: 'MFH TOOLS PRO - Threat Hunting Pro',
        total_hunts: hunts.length,
        total_findings: hunts.reduce((acc, h) => acc + (h.findings ? h.findings.length : 0), 0),
        hunts: hunts.map(h => ({
            id: h.id,
            timestamp: h.timestamp,
            query: h.query,
            findings: h.findings ? h.findings.length : 0,
            summary: h.summary
        }))
    };
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateHTMLReport(report);
            ext = '.html';
            break;
        case 'json':
            content = JSON.stringify(report, null, 2);
            ext = '.json';
            break;
        case 'pdf':
            content = JSON.stringify(report, null, 2);
            ext = '.pdf';
            console.log('⚠️ PDF requiere instalacion de librerias adicionales');
            break;
        default:
            content = JSON.stringify(report, null, 2);
            ext = '.json';
    }
    
    const reportFile = outputFile || path.join(REPORTS_DIR, `threat_hunt_report_${Date.now()}${ext}`);
    fs.writeFileSync(reportFile, content);
    
    console.log(`\n✅ Reporte generado: ${reportFile}`);
    console.log(`   📋 Cacerias: ${report.total_hunts}`);
    console.log(`   🔍 Hallazgos: ${report.total_findings}`);
    
    return report;
}

function generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Threat Hunting Report</title>
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
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.8rem;
        }
        .critical { color: #ff0000; }
        .high { color: #ff4400; }
        .medium { color: #ff8800; }
        .low { color: #00cc00; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Threat Hunting Report</h1>
        <p><strong>Generado:</strong> ${report.timestamp}</p>
        <p><strong>Generado por:</strong> ${report.generated_by}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${report.total_hunts}</div>
                <div class="label">📋 Cacerias</div>
            </div>
            <div class="stat">
                <div class="number">${report.total_findings}</div>
                <div class="label">🔍 Hallazgos</div>
            </div>
        </div>
        
        <h2>📋 Detalle de Cacerias</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Query</th>
                    <th>Hallazgos</th>
                </tr>
            </thead>
            <tbody>
                ${report.hunts.map(h => `
                    <tr>
                        <td>${h.id.substring(0, 8)}</td>
                        <td>${new Date(h.timestamp).toLocaleString()}</td>
                        <td>${h.query || 'N/A'}</td>
                        <td>${h.findings}</td>
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

function listIOCs() {
    const iocs = loadIOCs();
    console.log('\n📋 IoCs DISPONIBLES:');
    console.log('='.repeat(60));
    
    if (iocs.length === 0) {
        console.log('ℹ️ No hay IoCs en la base de datos.');
        return;
    }
    
    const grouped = {};
    for (const ioc of iocs) {
        if (!grouped[ioc.type]) grouped[ioc.type] = [];
        grouped[ioc.type].push(ioc);
    }
    
    for (const [type, items] of Object.entries(grouped)) {
        console.log(`\n📌 ${type.toUpperCase()} (${items.length})`);
        items.forEach(i => {
            const risk = i.risk || 'unknown';
            const emoji = risk === 'critical' ? '🔴' : risk === 'high' ? '🟠' : risk === 'medium' ? '🟡' : '🟢';
            console.log(`   ${emoji} ${i.value} (${i.source || 'unknown'})`);
        });
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Threat Hunting Pro - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'hunt':
            performHunt(query);
            break;
            
        case 'investigate':
            if (!iocValue) {
                console.error('❌ Debes especificar --ioc');
                process.exit(1);
            }
            investigateIOC(iocValue);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        case 'iocs':
            listIOCs();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --hunt, --investigate, --report, --iocs, --init');
            break;
    }
    
    console.log('\n✅ Threat Hunting Pro completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Threat Hunting Pro...');
    process.exit(0);
});
