#!/usr/bin/env node

/**
 * Threat Intelligence Platform - MFH TOOLS PRO
 * Plataforma de inteligencia de amenazas
 * 
 * Uso: node threat-intelligence-platform.js [opciones]
 * Ejemplo: node threat-intelligence-platform.js --feed --source alienvault
 * Ejemplo: node threat-intelligence-platform.js --iocs --ip 185.130.5.253
 * Ejemplo: node threat-intelligence-platform.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'tip_config.json');
const FEEDS_DIR = path.join(__dirname, 'tip_feeds');
const IOCS_DIR = path.join(__dirname, 'tip_iocs');
const REPORTS_DIR = path.join(__dirname, 'tip_reports');

const DEFAULT_CONFIG = {
    sources: {
        alienvault: { enabled: true, url: 'https://otx.alienvault.com/api/v1' },
        virustotal: { enabled: true, url: 'https://www.virustotal.com/api/v3' },
        abuseipdb: { enabled: true, url: 'https://api.abuseipdb.com/api/v2' },
        shodan: { enabled: false, url: 'https://api.shodan.io' }
    },
    ioc_types: ['ip', 'domain', 'hash', 'url', 'email'],
    auto_update: true,
    update_interval: 3600
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let source = null;
let iocValue = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--feed':
            action = 'feed';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                source = args[i + 1];
                i++;
            }
            break;
        case '--iocs':
            action = 'iocs';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                iocValue = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--source':
            source = args[i + 1];
            i++;
            break;
        case '--ip':
            iocValue = args[i + 1];
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
🛡️ Threat Intelligence Platform - MFH TOOLS PRO
================================================
Plataforma de inteligencia de amenazas.

Uso:
  node threat-intelligence-platform.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --feed [source]       Obtener feed de inteligencia
  --iocs [valor]        Buscar IoCs
  --report              Generar reporte de inteligencia
  --source <nombre>     Fuente de inteligencia
  --ip <ip>             IP a investigar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node threat-intelligence-platform.js --init
  node threat-intelligence-platform.js --feed --source alienvault
  node threat-intelligence-platform.js --iocs --ip 185.130.5.253
  node threat-intelligence-platform.js --report --format html
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
    if (!fs.existsSync(FEEDS_DIR)) {
        fs.mkdirSync(FEEDS_DIR, { recursive: true });
    }
    if (!fs.existsSync(IOCS_DIR)) {
        fs.mkdirSync(IOCS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Feeds: ${FEEDS_DIR}`);
    console.log(`📁 IoCs: ${IOCS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generateIOCData() {
    const iocs = [];
    const types = ['ip', 'domain', 'hash', 'url', 'email'];
    const sources = ['alienvault', 'virustotal', 'abuseipdb', 'misp'];
    const risks = ['low', 'medium', 'high', 'critical'];
    const ips = ['185.130.5.253', '103.230.15.20', '80.70.30.10', '45.33.22.11', '192.168.1.100'];
    const domains = ['malware.com', 'phishing-site.net', 'c2-server.org', 'ransomware.biz'];
    const hashes = [
        '5d41402abc4b2a76b9719d911017c592',
        'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    ];
    
    for (let i = 0; i < 20; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        let value = '';
        if (type === 'ip') value = ips[Math.floor(Math.random() * ips.length)];
        else if (type === 'domain') value = domains[Math.floor(Math.random() * domains.length)];
        else if (type === 'hash') value = hashes[Math.floor(Math.random() * hashes.length)];
        else if (type === 'url') value = `https://${domains[Math.floor(Math.random() * domains.length)]}/path/${i}`;
        else value = `attacker${i}@${domains[Math.floor(Math.random() * domains.length)]}`;
        
        iocs.push({
            id: crypto.randomBytes(8).toString('hex'),
            type: type,
            value: value,
            source: sources[Math.floor(Math.random() * sources.length)],
            risk: risks[Math.floor(Math.random() * risks.length)],
            first_seen: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
            last_seen: new Date().toISOString(),
            confidence: Math.random() * 0.5 + 0.5,
            tags: ['malicious', 'suspicious'].slice(0, Math.floor(Math.random() * 2) + 1)
        });
    }
    
    return iocs;
}

function getFeed(source) {
    console.log(`📡 Obteniendo feed de: ${source || 'todas las fuentes'}`);
    
    const config = loadConfig();
    const iocs = generateIOCData();
    
    let filtered = iocs;
    if (source) {
        filtered = iocs.filter(i => i.source === source);
    }
    
    const feed = {
        timestamp: new Date().toISOString(),
        source: source || 'all',
        total: filtered.length,
        iocs: filtered,
        summary: {
            by_type: {},
            by_risk: {},
            by_source: {}
        }
    };
    
    filtered.forEach(ioc => {
        feed.summary.by_type[ioc.type] = (feed.summary.by_type[ioc.type] || 0) + 1;
        feed.summary.by_risk[ioc.risk] = (feed.summary.by_risk[ioc.risk] || 0) + 1;
        feed.summary.by_source[ioc.source] = (feed.summary.by_source[ioc.source] || 0) + 1;
    });
    
    console.log(`\n📊 Resumen del feed:`);
    console.log(`   Total IoCs: ${feed.total}`);
    console.log(`\n   Por tipo:`);
    for (const [type, count] of Object.entries(feed.summary.by_type)) {
        console.log(`      • ${type}: ${count}`);
    }
    console.log(`\n   Por riesgo:`);
    for (const [risk, count] of Object.entries(feed.summary.by_risk)) {
        const icon = risk === 'critical' ? '🔴' : risk === 'high' ? '🟠' : risk === 'medium' ? '🟡' : '🟢';
        console.log(`      ${icon} ${risk}: ${count}`);
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(feed, null, 2));
        console.log(`\n📄 Feed guardado: ${outputFile}`);
    }
    
    return feed;
}

function searchIOC(iocValue) {
    console.log(`🔍 Buscando IoC: ${iocValue}`);
    
    const iocs = generateIOCData();
    const found = iocs.filter(i => i.value === iocValue || i.value.includes(iocValue));
    
    if (found.length === 0) {
        console.log('ℹ️ No se encontraron IoCs para este valor.');
        return;
    }
    
    console.log(`\n📋 ${found.length} IoCs encontrados:\n`);
    found.forEach(ioc => {
        const riskIcon = ioc.risk === 'critical' ? '🔴' : ioc.risk === 'high' ? '🟠' : ioc.risk === 'medium' ? '🟡' : '🟢';
        console.log(`   ${riskIcon} ${ioc.type}: ${ioc.value}`);
        console.log(`      Fuente: ${ioc.source}`);
        console.log(`      Riesgo: ${ioc.risk}`);
        console.log(`      Confianza: ${(ioc.confidence * 100).toFixed(1)}%`);
        console.log(`      Tags: ${ioc.tags.join(', ')}`);
        console.log('');
    });
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(found, null, 2));
        console.log(`📄 Resultado guardado: ${outputFile}`);
    }
}

function generateReport(format) {
    console.log(`📊 Generando reporte de inteligencia en formato ${format}`);
    
    const config = loadConfig();
    const iocs = generateIOCData();
    
    const report = {
        timestamp: new Date().toISOString(),
        total_iocs: iocs.length,
        sources: Object.keys(config.sources).filter(s => config.sources[s].enabled),
        summary: {
            by_type: {},
            by_risk: {},
            by_source: {}
        },
        top_iocs: iocs.slice(0, 10)
    };
    
    iocs.forEach(ioc => {
        report.summary.by_type[ioc.type] = (report.summary.by_type[ioc.type] || 0) + 1;
        report.summary.by_risk[ioc.risk] = (report.summary.by_risk[ioc.risk] || 0) + 1;
        report.summary.by_source[ioc.source] = (report.summary.by_source[ioc.source] || 0) + 1;
    });
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateTIPHTML(report);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(report, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `tip_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function generateTIPHTML(report) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Threat Intelligence Report</title>
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
        <h1>🛡️ Threat Intelligence Report</h1>
        <p><strong>Generado:</strong> ${report.timestamp}</p>
        <p><strong>Total IoCs:</strong> ${report.total_iocs}</p>
        <p><strong>Fuentes:</strong> ${report.sources.join(', ')}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${report.total_iocs}</div>
                <div class="label">📊 Total IoCs</div>
            </div>
            ${Object.entries(report.summary.by_risk).map(([risk, count]) => `
                <div class="stat">
                    <div class="number ${risk}">${count}</div>
                    <div class="label">${risk.toUpperCase()}</div>
                </div>
            `).join('')}
        </div>
        
        <h2>📋 Top IoCs</h2>
        <table>
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Fuente</th>
                    <th>Riesgo</th>
                    <th>Confianza</th>
                </tr>
            </thead>
            <tbody>
                ${report.top_iocs.map(ioc => `
                    <tr>
                        <td>${ioc.type}</td>
                        <td>${ioc.value}</td>
                        <td>${ioc.source}</td>
                        <td class="${ioc.risk}">${ioc.risk.toUpperCase()}</td>
                        <td>${(ioc.confidence * 100).toFixed(1)}%</td>
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
    console.log(`🛡️ Threat Intelligence Platform - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'feed':
            getFeed(source);
            break;
            
        case 'iocs':
            if (!iocValue) {
                console.error('❌ Debes especificar el IoC a buscar');
                process.exit(1);
            }
            searchIOC(iocValue);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --feed, --iocs, --report, --init');
            break;
    }
    
    console.log('\n✅ Threat Intelligence Platform completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Threat Intelligence Platform...');
    process.exit(0);
});
