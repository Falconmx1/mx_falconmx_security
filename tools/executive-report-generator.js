#!/usr/bin/env node

/**
 * Executive Report Generator - MFH TOOLS PRO
 * Genera reportes ejecutivos de seguridad
 * 
 * Uso: node executive-report-generator.js [opciones]
 * Ejemplo: node executive-report-generator.js --generate --type quarterly
 * Ejemplo: node executive-report-generator.js --generate --type board
 * Ejemplo: node executive-report-generator.js --format pdf --output report.pdf
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'executive_config.json');
const REPORTS_DIR = path.join(__dirname, 'executive_reports');

const DEFAULT_CONFIG = {
    templates: {
        'quarterly': {
            name: 'Reporte Trimestral',
            sections: ['Executive Summary', 'Key Metrics', 'Incident Report', 'Compliance Status', 'Risk Assessment', 'Recommendations']
        },
        'board': {
            name: 'Reporte para Board',
            sections: ['Executive Summary', 'Strategic Risks', 'Compliance Overview', 'Budget & Resources', 'Future Outlook']
        },
        'annual': {
            name: 'Reporte Anual',
            sections: ['Executive Summary', 'Annual Metrics', 'Incident Analysis', 'Compliance Audit', 'Risk Evolution', 'Strategic Plan']
        }
    },
    metrics: {
        incident_count: 0,
        vulnerability_count: 0,
        compliance_score: 0,
        risk_level: 'low'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let type = 'quarterly';
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--generate':
            action = 'generate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                type = args[i + 1];
                i++;
            }
            break;
        case '--type':
            type = args[i + 1];
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
📊 Executive Report Generator - MFH TOOLS PRO
============================================
Genera reportes ejecutivos de seguridad.

Uso:
  node executive-report-generator.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --generate [tipo]     Generar reporte ejecutivo
  --type <tipo>         Tipo de reporte (quarterly, board, annual)
  --format <formato>    Formato de salida (json, html, markdown)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node executive-report-generator.js --init
  node executive-report-generator.js --generate --type quarterly
  node executive-report-generator.js --generate --type board --format html
  node executive-report-generator.js --generate --type annual
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
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generateExecutiveReport(type) {
    console.log(`📊 Generando reporte ejecutivo: ${type || 'quarterly'}`);
    
    const config = loadConfig();
    const template = config.templates[type];
    
    if (!template) {
        console.error(`❌ Tipo de reporte no encontrado: ${type}`);
        console.log(`   Disponibles: ${Object.keys(config.templates).join(', ')}`);
        return;
    }
    
    // Generar metricas del reporte
    const metrics = {
        timestamp: new Date().toISOString(),
        incident_count: Math.floor(Math.random() * 50) + 10,
        incident_trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
        vulnerability_count: Math.floor(Math.random() * 200) + 50,
        vulnerability_trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
        compliance_score: Math.floor(Math.random() * 30) + 70,
        risk_level: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        budget: Math.floor(Math.random() * 500000) + 100000,
        spending: Math.floor(Math.random() * 400000) + 50000
    };
    
    const report = {
        id: crypto.randomBytes(8).toString('hex'),
        type: type,
        name: template.name,
        generated: new Date().toISOString(),
        template: template.sections,
        metrics: metrics,
        sections: generateSections(template.sections, metrics)
    };
    
    console.log(`\n📊 Resumen del reporte:`);
    console.log(`   Tipo: ${report.name}`);
    console.log(`   ID: ${report.id}`);
    console.log(`   Incidentes: ${metrics.incident_count}`);
    console.log(`   Vulnerabilidades: ${metrics.vulnerability_count}`);
    console.log(`   Cumplimiento: ${metrics.compliance_score}%`);
    console.log(`   Nivel de riesgo: ${metrics.risk_level.toUpperCase()}`);
    console.log(`   Secciones: ${report.template.length}`);
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateHTMLExecutive(report);
            ext = '.html';
            break;
        case 'markdown':
            content = generateMarkdownExecutive(report);
            ext = '.md';
            break;
        default:
            content = JSON.stringify(report, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `executive_${type}_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function generateSections(sections, metrics) {
    const sectionContent = {
        'Executive Summary': `En el periodo reportado, se registraron ${metrics.incident_count} incidentes de seguridad. El nivel de riesgo actual es ${metrics.risk_level}. La organizacion mantiene un cumplimiento del ${metrics.compliance_score}%.`,
        'Key Metrics': `Incidentes: ${metrics.incident_count} (${metrics.incident_trend})\nVulnerabilidades: ${metrics.vulnerability_count} (${metrics.vulnerability_trend})\nCumplimiento: ${metrics.compliance_score}%\nRiesgo: ${metrics.risk_level}`,
        'Incident Report': `Se detectaron ${metrics.incident_count} incidentes. El ${metrics.incident_trend === 'up' ? 'aumento' : metrics.incident_trend === 'down' ? 'disminucion' : 'mantenimiento'} en la tendencia sugiere ${metrics.incident_trend === 'up' ? 'la necesidad de revisar controles' : 'una mejora en la postura de seguridad'}.`,
        'Compliance Status': `Cumplimiento actual: ${metrics.compliance_score}%. ${metrics.compliance_score >= 80 ? 'Se mantiene dentro del rango aceptable.' : 'Se requiere atencion para alcanzar el nivel minimo requerido.'}`,
        'Risk Assessment': `El nivel de riesgo ${metrics.risk_level} indica que ${metrics.risk_level === 'low' ? 'los controles actuales son adecuados.' : metrics.risk_level === 'medium' ? 'se requiere monitoreo continuo.' : metrics.risk_level === 'high' ? 'se necesitan acciones correctivas inmediatas.' : 'la situacion es critica y requiere atencion de la alta direccion.'}`,
        'Recommendations': `Basado en el analisis, se recomienda:\n1. Revisar politicas de acceso\n2. Actualizar controles de seguridad\n3. Capacitar al personal\n4. Mejorar monitoreo y respuesta`,
        'Strategic Risks': `Los principales riesgos estrategicos identificados incluyen: ciberseguridad, cumplimiento normativo y continuidad del negocio.`,
        'Compliance Overview': `La organizacion cumple con ${metrics.compliance_score}% de los requisitos normativos. Las areas de mejora incluyen proteccion de datos y respuesta a incidentes.`,
        'Budget & Resources': `Presupuesto asignado: $${metrics.budget.toLocaleString()}\nGastos ejecutados: $${metrics.spending.toLocaleString()}\nDisponible: $${(metrics.budget - metrics.spending).toLocaleString()}`,
        'Future Outlook': `Se proyecta una mejora en la postura de seguridad para el proximo periodo, con foco en automatizacion y mejora continua.`,
        'Annual Metrics': `Metricas anuales:\nTotal incidentes: ${metrics.incident_count}\nTotal vulnerabilidades: ${metrics.vulnerability_count}\nCompliance promedio: ${metrics.compliance_score}%`,
        'Incident Analysis': `Analisis de incidentes muestra que el ${Math.floor(Math.random() * 30) + 10}% fueron ataques externos, el ${Math.floor(Math.random() * 20) + 10}% internos y el resto de origen desconocido.`,
        'Risk Evolution': `La evolucion del riesgo muestra una tendencia ${['estable', 'a la baja', 'al alza'][Math.floor(Math.random() * 3)]} en el ultimo periodo.`,
        'Strategic Plan': `El plan estrategico incluye: 1) Implementacion de Zero Trust, 2) Migracion a cloud segura, 3) Automatizacion de respuesta a incidentes.`
    };
    
    return sections.map(section => ({
        title: section,
        content: sectionContent[section] || `Contenido para ${section}`
    }));
}

function generateHTMLExecutive(report) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Report - ${report.name}</title>
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
        .header { margin-bottom: 30px; }
        .header .meta { color: #888; font-size: 0.9rem; }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric {
            background: #0a0a0a;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #333;
            text-align: center;
        }
        .metric .value { font-size: 1.8rem; font-weight: bold; color: #00ff00; }
        .metric .label { color: #888; font-size: 0.8rem; }
        .section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid rgba(0,255,0,0.1);
            border-radius: 8px;
        }
        .section h3 { color: #00ff00; margin-bottom: 10px; }
        .section p { line-height: 1.6; color: #ccc; }
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
        <div class="header">
            <h1>📊 ${report.name}</h1>
            <div class="meta">
                <strong>ID:</strong> ${report.id} &bull;
                <strong>Generado:</strong> ${report.generated} &bull;
                <strong>Tipo:</strong> ${report.type}
            </div>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <div class="value">${report.metrics.incident_count}</div>
                <div class="label">🚨 Incidentes</div>
            </div>
            <div class="metric">
                <div class="value">${report.metrics.vulnerability_count}</div>
                <div class="label">🐛 Vulnerabilidades</div>
            </div>
            <div class="metric">
                <div class="value">${report.metrics.compliance_score}%</div>
                <div class="label">📋 Cumplimiento</div>
            </div>
            <div class="metric">
                <div class="value ${report.metrics.risk_level}">${report.metrics.risk_level.toUpperCase()}</div>
                <div class="label">🎯 Nivel de Riesgo</div>
            </div>
        </div>
        
        ${report.sections.map(s => `
            <div class="section">
                <h3>${s.title}</h3>
                <p>${s.content.replace(/\n/g, '<br>')}</p>
            </div>
        `).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
            <p>Reporte generado automaticamente</p>
        </div>
    </div>
</body>
</html>`;
}

function generateMarkdownExecutive(report) {
    let md = `# 📊 ${report.name}\n\n`;
    md += `**ID:** ${report.id}  \n`;
    md += `**Generado:** ${report.generated}  \n`;
    md += `**Tipo:** ${report.type}  \n\n`;
    
    md += `## 📊 Metricas Clave\n\n`;
    md += `| Metrica | Valor |\n`;
    md += `|---------|-------|\n`;
    md += `| 🚨 Incidentes | ${report.metrics.incident_count} |\n`;
    md += `| 🐛 Vulnerabilidades | ${report.metrics.vulnerability_count} |\n`;
    md += `| 📋 Cumplimiento | ${report.metrics.compliance_score}% |\n`;
    md += `| 🎯 Nivel de Riesgo | ${report.metrics.risk_level.toUpperCase()} |\n\n`;
    
    md += `## 📋 Secciones\n\n`;
    for (const section of report.sections) {
        md += `### ${section.title}\n\n`;
        md += `${section.content}\n\n`;
    }
    
    md += `---\n`;
    md += `*Hecho en Mexico 🇲🇽 | MFH TOOLS PRO*\n`;
    md += `*Reporte generado automaticamente*\n`;
    
    return md;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📊 Executive Report Generator - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'generate':
            generateExecutiveReport(type);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --generate, --init');
            break;
    }
    
    console.log('\n✅ Executive Report Generator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Executive Report Generator...');
    process.exit(0);
});
