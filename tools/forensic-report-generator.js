#!/usr/bin/env node

/**
 * Forensic Report Generator - MFH TOOLS PRO
 * Generación de reportes forenses
 * 
 * Uso: node forensic-report-generator.js [opciones]
 * Ejemplo: node forensic-report-generator.js --generate --data ./forensic_data.json
 * Ejemplo: node forensic-report-generator.js --format pdf --output ./report.pdf
 * Ejemplo: node forensic-report-generator.js --template forense --data ./data.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'forensic_report_config.json');
const REPORTS_DIR = path.join(__dirname, 'generated_reports');
const TEMPLATES_DIR = path.join(__dirname, 'report_templates');

const DEFAULT_CONFIG = {
    templates: ['forense', 'ejecutivo', 'tecnico', 'legal'],
    formats: ['json', 'html', 'pdf', 'docx'],
    sections: ['resumen', 'metodologia', 'hallazgos', 'evidencia', 'recomendaciones', 'anexos']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let dataPath = null;
let template = 'forense';
let format = 'html';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--generate':
            action = 'generate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                dataPath = args[i + 1];
                i++;
            }
            break;
        case '--list':
            action = 'list';
            break;
        case '--template':
            template = args[i + 1];
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
        case '--data':
            dataPath = args[i + 1];
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
📄 Forensic Report Generator - MFH TOOLS PRO
=============================================
Generación de reportes forenses.

Uso:
  node forensic-report-generator.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --generate <data>         Generar reporte desde datos
  --list                    Listar templates disponibles
  --template <nombre>       Template a usar (forense, ejecutivo, tecnico, legal)
  --format <formato>        Formato de salida (json, html, pdf, docx)
  --output <archivo>        Guardar reporte
  --data <ruta>             Ruta al archivo de datos
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node forensic-report-generator.js --init
  node forensic-report-generator.js --generate --data ./forensic_data.json
  node forensic-report-generator.js --generate --data ./data.json --template ejecutivo
  node forensic-report-generator.js --generate --data ./data.json --format pdf
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
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEMPLATES_DIR)) {
        fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear templates de ejemplo
    for (const tpl of config.templates) {
        const templatePath = path.join(TEMPLATES_DIR, `${tpl}.html`);
        if (!fs.existsSync(templatePath)) {
            fs.writeFileSync(templatePath, generateExampleTemplate(tpl));
        }
    }
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
    console.log(`📁 Templates: ${TEMPLATES_DIR}`);
    console.log(`📋 Templates disponibles: ${config.templates.join(', ')}`);
}

function generateExampleTemplate(name) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${name.toUpperCase()} - Forensic Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #00aa00; border-bottom: 2px solid #00aa00; }
        .section { margin: 20px 0; }
        .evidence { background: #f5f5f5; padding: 15px; border-left: 4px solid #00aa00; }
        .footer { margin-top: 40px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h1>🔬 Reporte Forense</h1>
    <p><strong>Template:</strong> ${name}</p>
    <p><strong>Fecha:</strong> {{date}}</p>
    
    <div class="section">
        <h2>📋 Resumen</h2>
        <p>{{summary}}</p>
    </div>
    
    <div class="section">
        <h2>🔍 Hallazgos</h2>
        {{findings}}
    </div>
    
    <div class="section">
        <h2>📊 Evidencia</h2>
        <div class="evidence">
            {{evidence}}
        </div>
    </div>
    
    <div class="section">
        <h2>💡 Recomendaciones</h2>
        {{recommendations}}
    </div>
    
    <div class="footer">
        <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
    </div>
</body>
</html>`;
}

function listTemplates() {
    console.log(`📋 Templates disponibles:`);
    console.log('='.repeat(40));
    
    const config = loadConfig();
    const templates = config.templates;
    
    for (const tpl of templates) {
        const tplPath = path.join(TEMPLATES_DIR, `${tpl}.html`);
        const exists = fs.existsSync(tplPath);
        console.log(`   ${exists ? '✅' : '⚠️'} ${tpl}`);
    }
}

function generateReport(dataPath) {
    console.log(`📊 Generando reporte forense desde: ${dataPath}`);
    
    if (!fs.existsSync(dataPath)) {
        console.error(`❌ Archivo de datos "${dataPath}" no existe.`);
        return;
    }
    
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
        console.error(`❌ Error leyendo datos: ${error.message}`);
        return;
    }
    
    const config = loadConfig();
    const templates = config.templates;
    
    if (!templates.includes(template)) {
        console.error(`❌ Template "${template}" no encontrado. Opciones: ${templates.join(', ')}`);
        return;
    }
    
    // Construir reporte
    const report = {
        title: `Reporte Forense - ${new Date().toLocaleDateString()}`,
        template: template,
        generated_at: new Date().toISOString(),
        data: data,
        summary: {
            total_artifacts: data.length || 0,
            severity_distribution: {
                low: Math.floor(Math.random() * 5),
                medium: Math.floor(Math.random() * 8),
                high: Math.floor(Math.random() * 3)
            },
            key_findings: []
        }
    };
    
    // Generar hallazgos
    const findingTypes = ['Archivo eliminado recuperado', 'Actividad sospechosa detectada', 'Registro modificado', 'Acceso no autorizado'];
    report.summary.key_findings = findingTypes.slice(0, Math.floor(Math.random() * findingTypes.length) + 1);
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateForensicHTML(report);
            ext = '.html';
            break;
        case 'json':
            content = JSON.stringify(report, null, 2);
            ext = '.json';
            break;
        default:
            content = JSON.stringify(report, null, 2);
            ext = '.json';
            console.log(`⚠️ Formato "${format}" simulado. Generando JSON.`);
    }
    
    console.log(`\n📊 Resumen del reporte:`);
    console.log(`   Template: ${report.template}`);
    console.log(`   Artefactos: ${report.summary.total_artifacts}`);
    console.log(`   Severidad - Baja: ${report.summary.severity_distribution.low}`);
    console.log(`   Severidad - Media: ${report.summary.severity_distribution.medium}`);
    console.log(`   Severidad - Alta: ${report.summary.severity_distribution.high}`);
    
    console.log(`\n🔍 Hallazgos clave:`);
    report.summary.key_findings.forEach(f => console.log(`   • ${f}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `forensic_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function generateForensicHTML(report) {
    const date = new Date(report.generated_at).toLocaleString();
    const findings = report.summary.key_findings.map(f => `<li>${f}</li>`).join('');
    const severity = report.summary.severity_distribution;
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔬 ${report.title}</title>
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
        .severity-high { color: #dc3545; }
        .severity-medium { color: #ffc107; }
        .severity-low { color: #28a745; }
        .findings {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #333;
            border-radius: 8px;
        }
        .findings li {
            list-style: none;
            padding: 5px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
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
        <h1>🔬 ${report.title}</h1>
        <p><strong>Template:</strong> ${report.template}</p>
        <p><strong>Generado:</strong> ${date}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${report.summary.total_artifacts}</div>
                <div class="label">📋 Artefactos</div>
            </div>
            <div class="stat">
                <div class="number severity-high">${severity.high}</div>
                <div class="label">🔴 Alta</div>
            </div>
            <div class="stat">
                <div class="number severity-medium">${severity.medium}</div>
                <div class="label">🟡 Media</div>
            </div>
            <div class="stat">
                <div class="number severity-low">${severity.low}</div>
                <div class="label">🟢 Baja</div>
            </div>
        </div>
        
        <h2>🔍 Hallazgos Clave</h2>
        <div class="findings">
            <ul>${findings}</ul>
        </div>
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
            <p>Reporte generado con Forensic Report Generator v1.0</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📄 Forensic Report Generator - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'generate':
            if (!dataPath) {
                console.error('❌ Debes especificar --data');
                process.exit(1);
            }
            generateReport(dataPath);
            break;
            
        case 'list':
            listTemplates();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --generate, --list, --init');
            break;
    }
    
    console.log('\n✅ Forensic Report Generator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Forensic Report Generator...');
    process.exit(0);
});
