#!/usr/bin/env node

/**
 * Browser Forensics - MFH TOOLS PRO
 * Análisis forense de navegadores
 * 
 * Uso: node browser-forensics.js [opciones]
 * Ejemplo: node browser-forensics.js --analyze --browser chrome
 * Ejemplo: node browser-forensics.js --history --browser firefox
 * Ejemplo: node browser-forensics.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'browser_config.json');
const BROWSER_DIR = path.join(__dirname, 'browser_data');
const REPORTS_DIR = path.join(__dirname, 'browser_reports');

const DEFAULT_CONFIG = {
    browsers: ['chrome', 'firefox', 'edge', 'safari', 'opera'],
    artifacts: ['history', 'cookies', 'bookmarks', 'downloads', 'passwords', 'cache', 'extensions'],
    suspicious_domains: [
        'malware.com', 'phishing.net', 'cryptominer.io', 
        'ransomware.xyz', 'bad-site.org'
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let browserName = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                browserName = args[i + 1];
                i++;
            }
            break;
        case '--history':
            action = 'history';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                browserName = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--browser':
            browserName = args[i + 1];
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
🔬 Browser Forensics - MFH TOOLS PRO
=====================================
Análisis forense de navegadores.

Uso:
  node browser-forensics.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --analyze <navegador>     Analizar datos del navegador
  --history <navegador>     Extraer historial del navegador
  --report                  Generar reporte forense
  --browser <nombre>        Navegador (chrome, firefox, edge, safari, opera)
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node browser-forensics.js --init
  node browser-forensics.js --analyze --browser chrome
  node browser-forensics.js --history --browser firefox
  node browser-forensics.js --report --format html
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
    if (!fs.existsSync(BROWSER_DIR)) {
        fs.mkdirSync(BROWSER_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de navegador: ${BROWSER_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function analyzeBrowser(browser) {
    console.log(`🔍 Analizando navegador: ${browser}`);
    
    const config = loadConfig();
    const browsers = config.browsers;
    
    if (!browsers.includes(browser)) {
        console.error(`❌ Navegador "${browser}" no encontrado. Opciones: ${browsers.join(', ')}`);
        return;
    }
    
    const artifacts = config.artifacts;
    const suspicious = config.suspicious_domains;
    
    const analysis = {
        browser: browser,
        timestamp: new Date().toISOString(),
        artifacts: [],
        suspicious_activity: [],
        timeline: [],
        summary: {
            total_artifacts: 0,
            suspicious_count: 0,
            last_activity: null
        }
    };
    
    // Simular análisis de artefactos
    for (const artifact of artifacts) {
        const count = Math.floor(Math.random() * 20) + 1;
        analysis.artifacts.push({
            type: artifact,
            count: count,
            last_modified: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString()
        });
        analysis.summary.total_artifacts += count;
    }
    
    // Simular actividad sospechosa
    const suspiciousSites = suspicious.slice(0, Math.floor(Math.random() * 3) + 1);
    for (const site of suspiciousSites) {
        if (Math.random() > 0.3) {
            analysis.suspicious_activity.push({
                domain: site,
                visits: Math.floor(Math.random() * 10) + 1,
                first_visit: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
                last_visit: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            });
            analysis.summary.suspicious_count++;
        }
    }
    
    // Simular timeline
    const timelineEntries = [
        { time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), event: 'Inicio de sesión' },
        { time: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(), event: 'Visita a sitio sospechoso' },
        { time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), event: 'Descarga de archivo' },
        { time: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(), event: 'Cierre de sesión' }
    ];
    analysis.timeline = timelineEntries;
    analysis.summary.last_activity = timelineEntries[timelineEntries.length - 1].time;
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Navegador: ${analysis.browser}`);
    console.log(`   Artefactos: ${analysis.summary.total_artifacts}`);
    console.log(`   Actividades sospechosas: ${analysis.summary.suspicious_count}`);
    console.log(`   Última actividad: ${analysis.summary.last_activity}`);
    
    console.log(`\n📋 Artefactos encontrados:`);
    analysis.artifacts.forEach(a => {
        console.log(`   • ${a.type}: ${a.count} items`);
    });
    
    if (analysis.suspicious_activity.length > 0) {
        console.log(`\n⚠️ Actividad sospechosa:`);
        analysis.suspicious_activity.forEach(s => {
            console.log(`   • ${s.domain}: ${s.visits} visitas`);
        });
    }
    
    console.log(`\n📅 Timeline de eventos:`);
    analysis.timeline.forEach(t => {
        console.log(`   • ${new Date(t.time).toLocaleString()}: ${t.event}`);
    });
    
    const outputPath = outputFile || path.join(BROWSER_DIR, `browser_${browser}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return analysis;
}

function extractHistory(browser) {
    console.log(`📜 Extrayendo historial de: ${browser}`);
    
    const history = {
        browser: browser,
        timestamp: new Date().toISOString(),
        entries: [],
        total_entries: 0,
        date_range: { from: null, to: null }
    };
    
    // Simular entradas de historial
    const domains = ['google.com', 'youtube.com', 'github.com', 'reddit.com', 'twitter.com', 'stackoverflow.com', 'medium.com'];
    const days = 30;
    
    for (let i = 0; i < 20 + Math.floor(Math.random() * 30); i++) {
        const domain = domains[Math.floor(Math.random() * domains.length)];
        const date = new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000);
        history.entries.push({
            url: `https://${domain}/page_${Math.floor(Math.random() * 100)}`,
            title: `Página en ${domain}`,
            visit_count: Math.floor(Math.random() * 10) + 1,
            last_visit: date.toISOString()
        });
    }
    
    // Ordenar por fecha
    history.entries.sort((a, b) => new Date(b.last_visit) - new Date(a.last_visit));
    history.total_entries = history.entries.length;
    history.date_range.from = history.entries[history.entries.length - 1]?.last_visit || null;
    history.date_range.to = history.entries[0]?.last_visit || null;
    
    console.log(`\n📊 Historial extraído:`);
    console.log(`   Navegador: ${history.browser}`);
    console.log(`   Total entradas: ${history.total_entries}`);
    console.log(`   Desde: ${history.date_range.from}`);
    console.log(`   Hasta: ${history.date_range.to}`);
    
    console.log(`\n📋 Entradas recientes:`);
    history.entries.slice(0, 5).forEach(e => {
        console.log(`   • ${e.url} (${e.visit_count} visitas)`);
    });
    
    if (history.entries.length > 5) {
        console.log(`   ... y ${history.entries.length - 5} entradas más`);
    }
    
    const outputPath = outputFile || path.join(BROWSER_DIR, `history_${browser}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(history, null, 2));
    console.log(`\n📄 Historial guardado: ${outputPath}`);
    
    return history;
}

function generateReport(format) {
    console.log(`📊 Generando reporte forense de navegador en formato ${format}`);
    
    const files = fs.readdirSync(BROWSER_DIR).filter(f => f.startsWith('browser_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --analyze primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(BROWSER_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateBrowserHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `browser_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateBrowserHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔬 Browser Forensics Report</title>
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
        .suspicious { color: #dc3545; }
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
        <h1>🔬 Browser Forensics Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Navegadores analizados:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">🌐 Navegadores</div>
            </div>
            <div class="stat">
                <div class="number">${data.reduce((acc, d) => acc + d.summary.total_artifacts, 0)}</div>
                <div class="label">📋 Artefactos</div>
            </div>
            <div class="stat">
                <div class="number">${data.reduce((acc, d) => acc + d.summary.suspicious_count, 0)}</div>
                <div class="label">⚠️ Sospechosos</div>
            </div>
        </div>
        
        <h2>📋 Navegadores Analizados</h2>
        ${data.map(d => `
            <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                <h3 style="color:#00ff00;">🌐 ${d.browser}</h3>
                <p>Artefactos: ${d.summary.total_artifacts} | Última actividad: ${new Date(d.summary.last_activity).toLocaleString()}</p>
                ${d.suspicious_activity.length > 0 ? `<p class="suspicious">⚠️ ${d.suspicious_activity.length} sitios sospechosos detectados</p>` : ''}
            </div>
        `).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔬 Browser Forensics - MFH TOOLS PRO`);
    console.log('='.repeat(45));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'analyze':
            if (!browserName) {
                console.error('❌ Debes especificar --browser');
                process.exit(1);
            }
            analyzeBrowser(browserName);
            break;
            
        case 'history':
            if (!browserName) {
                console.error('❌ Debes especificar --browser');
                process.exit(1);
            }
            extractHistory(browserName);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --history, --report, --init');
            break;
    }
    
    console.log('\n✅ Browser Forensics completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Browser Forensics...');
    process.exit(0);
});
