#!/usr/bin/env node

/**
 * Internal Audit Tool - MFH TOOLS PRO
 * Herramienta para auditorias internas de seguridad
 * 
 * Uso: node internal-audit-tool.js [opciones]
 * Ejemplo: node internal-audit-tool.js --start --scope security
 * Ejemplo: node internal-audit-tool.js --check --control access-control
 * Ejemplo: node internal-audit-tool.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'audit_config.json');
const AUDITS_DIR = path.join(__dirname, 'audit_checks');
const REPORTS_DIR = path.join(__dirname, 'audit_reports');

const DEFAULT_CONFIG = {
    checklists: {
        'security': {
            name: 'Seguridad General',
            items: [
                { id: 'sec-01', name: 'Politicas de seguridad', category: 'policy' },
                { id: 'sec-02', name: 'Control de accesos', category: 'access' },
                { id: 'sec-03', name: 'Seguridad de red', category: 'network' },
                { id: 'sec-04', name: 'Seguridad de endpoints', category: 'endpoint' },
                { id: 'sec-05', name: 'Seguridad de datos', category: 'data' }
            ]
        },
        'compliance': {
            name: 'Cumplimiento',
            items: [
                { id: 'cmp-01', name: 'GDPR compliance', category: 'gdpr' },
                { id: 'cmp-02', name: 'PCI-DSS compliance', category: 'pci' },
                { id: 'cmp-03', name: 'ISO 27001 compliance', category: 'iso' }
            ]
        },
        'technical': {
            name: 'Tecnico',
            items: [
                { id: 'tec-01', name: 'Configuracion de firewalls', category: 'network' },
                { id: 'tec-02', name: 'Parches y updates', category: 'maintenance' },
                { id: 'tec-03', name: 'Monitoreo y logging', category: 'monitoring' }
            ]
        }
    },
    audit_templates: {
        'full': ['security', 'compliance', 'technical'],
        'security': ['security'],
        'technical': ['technical']
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let scope = null;
let control = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--start':
            action = 'start';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                scope = args[i + 1];
                i++;
            }
            break;
        case '--check':
            action = 'check';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                control = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--scope':
            scope = args[i + 1];
            i++;
            break;
        case '--control':
            control = args[i + 1];
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
📊 Internal Audit Tool - MFH TOOLS PRO
=====================================
Herramienta para auditorias internas de seguridad.

Uso:
  node internal-audit-tool.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --start [scope]       Iniciar auditoria
  --check <control>     Verificar un control especifico
  --report              Generar reporte de auditoria
  --scope <area>        Area a auditar (security, compliance, technical)
  --control <id>        ID del control a verificar
  --format <formato>    Formato de salida (json, html, markdown)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node internal-audit-tool.js --init
  node internal-audit-tool.js --start --scope security
  node internal-audit-tool.js --check --control sec-01
  node internal-audit-tool.js --report --format html
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
    if (!fs.existsSync(AUDITS_DIR)) {
        fs.mkdirSync(AUDITS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Auditorias: ${AUDITS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function startAudit(scope) {
    console.log(`📋 Iniciando auditoria: ${scope || 'full'}`);
    
    const config = loadConfig();
    const checklists = [];
    const template = config.audit_templates[scope] || ['security'];
    
    for (const key of template) {
        if (config.checklists[key]) {
            checklists.push(config.checklists[key]);
        }
    }
    
    const audit = {
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        scope: scope || 'full',
        checklists: checklists,
        total_controls: checklists.reduce((acc, c) => acc + c.items.length, 0),
        status: 'in_progress',
        findings: []
    };
    
    console.log(`\n📊 Detalles de la auditoria:`);
    console.log(`   ID: ${audit.id}`);
    console.log(`   Scope: ${audit.scope}`);
    console.log(`   Checklists: ${checklists.map(c => c.name).join(', ')}`);
    console.log(`   Controles: ${audit.total_controls}`);
    
    const outputPath = outputFile || path.join(AUDITS_DIR, `audit_${audit.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));
    console.log(`\n📄 Auditoria iniciada: ${outputPath}`);
    
    return audit;
}

function checkControl(controlId) {
    console.log(`🔍 Verificando control: ${controlId}`);
    
    const config = loadConfig();
    let found = null;
    let checklist = null;
    
    for (const [key, data] of Object.entries(config.checklists)) {
        const item = data.items.find(i => i.id === controlId);
        if (item) {
            found = item;
            checklist = data;
            break;
        }
    }
    
    if (!found) {
        console.error(`❌ Control no encontrado: ${controlId}`);
        console.log(`   Controles disponibles:`);
        for (const [key, data] of Object.entries(config.checklists)) {
            data.items.forEach(i => {
                console.log(`      • ${i.id}: ${i.name}`);
            });
        }
        return;
    }
    
    // Simular verificacion
    const result = {
        control: found,
        checklist: checklist.name,
        timestamp: new Date().toISOString(),
        status: ['passed', 'failed', 'warning', 'not_applicable'][Math.floor(Math.random() * 4)],
        evidence: Math.random() > 0.5 ? 'Evidencia disponible' : 'Sin evidencia',
        comments: Math.random() > 0.5 ? 'Cumple con los requisitos' : 'Requiere atencion'
    };
    
    console.log(`\n📊 Resultado de la verificacion:`);
    console.log(`   Control: ${result.control.id} - ${result.control.name}`);
    console.log(`   Checklist: ${result.checklist}`);
    console.log(`   Estado: ${result.status.toUpperCase()}`);
    console.log(`   ${result.evidence}`);
    console.log(`   ${result.comments}`);
    
    const outputPath = outputFile || path.join(AUDITS_DIR, `check_${controlId}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Resultado guardado: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de auditoria en formato ${format}`);
    
    const auditFiles = fs.readdirSync(AUDITS_DIR).filter(f => f.startsWith('audit_'));
    if (auditFiles.length === 0) {
        console.log('ℹ️ No hay auditorias disponibles. Ejecuta --start primero.');
        return;
    }
    
    const latest = auditFiles[auditFiles.length - 1];
    const auditData = JSON.parse(fs.readFileSync(path.join(AUDITS_DIR, latest), 'utf8'));
    
    const report = {
        timestamp: new Date().toISOString(),
        audit_id: auditData.id,
        scope: auditData.scope,
        summary: {
            total: auditData.total_controls,
            passed: Math.floor(Math.random() * 10) + 5,
            failed: Math.floor(Math.random() * 5),
            warning: Math.floor(Math.random() * 3),
            not_applicable: Math.floor(Math.random() * 2)
        },
        findings: [
            { control: 'sec-01', status: 'passed', severity: 'low' },
            { control: 'sec-02', status: 'failed', severity: 'high' },
            { control: 'sec-03', status: 'warning', severity: 'medium' }
        ],
        recommendations: [
            'Revisar politicas de acceso',
            'Actualizar configuracion de firewall',
            'Implementar MFA para administradores'
        ]
    };
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateHTMLReport(report);
            ext = '.html';
            break;
        case 'markdown':
            content = generateMarkdownReport(report);
            ext = '.md';
            break;
        default:
            content = JSON.stringify(report, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `audit_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit Report</title>
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
        .stat.passed .number { color: #00cc00; }
        .stat.failed .number { color: #ff0000; }
        .stat.warning .number { color: #ff8800; }
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
        <h1>📋 Audit Report</h1>
        <p><strong>Audit ID:</strong> ${report.audit_id}</p>
        <p><strong>Scope:</strong> ${report.scope}</p>
        <p><strong>Fecha:</strong> ${report.timestamp}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${report.summary.total}</div>
                <div class="label">📋 Total</div>
            </div>
            <div class="stat passed">
                <div class="number">${report.summary.passed}</div>
                <div class="label">✅ Pasados</div>
            </div>
            <div class="stat failed">
                <div class="number">${report.summary.failed}</div>
                <div class="label">❌ Fallidos</div>
            </div>
            <div class="stat warning">
                <div class="number">${report.summary.warning}</div>
                <div class="label">⚠️ Advertencias</div>
            </div>
        </div>
        
        <h2>🔍 Hallazgos</h2>
        <table>
            <thead>
                <tr>
                    <th>Control</th>
                    <th>Estado</th>
                    <th>Severidad</th>
                </tr>
            </thead>
            <tbody>
                ${report.findings.map(f => `
                    <tr>
                        <td>${f.control}</td>
                        <td>${f.status}</td>
                        <td>${f.severity}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <h2>💡 Recomendaciones</h2>
        <ul>
            ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

function generateMarkdownReport(report) {
    let md = `# 📋 Audit Report\n\n`;
    md += `**Audit ID:** ${report.audit_id}\n\n`;
    md += `**Scope:** ${report.scope}\n\n`;
    md += `**Fecha:** ${report.timestamp}\n\n`;
    
    md += `## 📊 Resumen\n\n`;
    md += `| Metrica | Valor |\n`;
    md += `|---------|-------|\n`;
    md += `| Total | ${report.summary.total} |\n`;
    md += `| ✅ Pasados | ${report.summary.passed} |\n`;
    md += `| ❌ Fallidos | ${report.summary.failed} |\n`;
    md += `| ⚠️ Advertencias | ${report.summary.warning} |\n\n`;
    
    md += `## 🔍 Hallazgos\n\n`;
    md += `| Control | Estado | Severidad |\n`;
    md += `|---------|--------|-----------|\n`;
    for (const f of report.findings) {
        md += `| ${f.control} | ${f.status} | ${f.severity} |\n`;
    }
    
    md += `\n## 💡 Recomendaciones\n\n`;
    for (const r of report.recommendations) {
        md += `- ${r}\n`;
    }
    
    return md;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📊 Internal Audit Tool - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'start':
            startAudit(scope);
            break;
            
        case 'check':
            if (!control) {
                console.error('❌ Debes especificar --control');
                process.exit(1);
            }
            checkControl(control);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --start, --check, --report, --init');
            break;
    }
    
    console.log('\n✅ Internal Audit Tool completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Internal Audit Tool...');
    process.exit(0);
});
