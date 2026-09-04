#!/usr/bin/env node

/**
 * International Security Standards - MFH TOOLS PRO
 * Estándares de seguridad internacionales
 * 
 * Uso: node international-security-standards.js [opciones]
 * Ejemplo: node international-security-standards.js --check --standard ISO-27001
 * Ejemplo: node international-security-standards.js --compare --standards ISO-27001,NIST-CSF
 * Ejemplo: node international-security-standards.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'iss_config.json');
const STANDARDS_DIR = path.join(__dirname, 'iss_standards');
const REPORTS_DIR = path.join(__dirname, 'iss_reports');

const DEFAULT_CONFIG = {
    standards: {
        'ISO-27001': { name: 'ISO/IEC 27001', version: '2022', category: 'ISMS' },
        'NIST-CSF': { name: 'NIST Cybersecurity Framework', version: '1.1', category: 'Cybersecurity' },
        'PCI-DSS': { name: 'PCI Data Security Standard', version: '3.2.1', category: 'Payment Security' },
        'HIPAA': { name: 'HIPAA Security Rule', version: '2013', category: 'Healthcare' },
        'SOC2': { name: 'SOC 2', version: '2017', category: 'Service Organization' }
    },
    compliance_levels: ['compliant', 'partial', 'in_progress', 'non_compliant']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let standardId = null;
let standardsList = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--check':
            action = 'check';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                standardId = args[i + 1];
                i++;
            }
            break;
        case '--compare':
            action = 'compare';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                standardsList = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--standard':
            standardId = args[i + 1];
            i++;
            break;
        case '--standards':
            standardsList = args[i + 1];
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
📋 International Security Standards - MFH TOOLS PRO
===================================================
Estándares de seguridad internacionales.

Uso:
  node international-security-standards.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --check <standard>        Verificar cumplimiento de estándar
  --compare <standards>     Comparar estándares
  --report                  Generar reporte de cumplimiento
  --standard <id>           ID del estándar (ISO-27001, NIST-CSF, etc)
  --standards <lista>       Lista de estándares separados por coma
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node international-security-standards.js --init
  node international-security-standards.js --check --standard ISO-27001
  node international-security-standards.js --compare --standards ISO-27001,NIST-CSF
  node international-security-standards.js --report --format html
`);
            process.exit(0);
            break;
    }
}

// ==================== FUNCIONES ====================

function initConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.log('✅ Configuracion por defecto creada.');
    }
    
    const dirs = [STANDARDS_DIR, REPORTS_DIR];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 ${path.basename(dir)}: ${dir}`);
        }
    });
}

function checkStandard(standardId) {
    console.log(`📋 Verificando estándar: ${standardId}`);
    
    const standardFile = path.join(STANDARDS_DIR, `${standardId.toLowerCase()}.json`);
    let standardData = null;
    
    if (fs.existsSync(standardFile)) {
        standardData = JSON.parse(fs.readFileSync(standardFile, 'utf8'));
    } else {
        // Datos de ejemplo si no existe
        const standardInfo = DEFAULT_CONFIG.standards[standardId] || { name: standardId, version: '1.0', category: 'General' };
        standardData = {
            standard: {
                id: standardId,
                name: standardInfo.name,
                version: standardInfo.version,
                category: standardInfo.category
            },
            requirements: [
                { id: 'REQ-001', name: 'Requirement 1', status: 'partial' },
                { id: 'REQ-002', name: 'Requirement 2', status: 'in_progress' },
                { id: 'REQ-003', name: 'Requirement 3', status: 'compliant' }
            ],
            compliance_score: 60
        };
    }
    
    const total = standardData.requirements.length;
    const compliant = standardData.requirements.filter(r => r.status === 'compliant').length;
    const partial = standardData.requirements.filter(r => r.status === 'partial').length;
    const inProgress = standardData.requirements.filter(r => r.status === 'in_progress').length;
    const nonCompliant = standardData.requirements.filter(r => r.status === 'non_compliant').length;
    
    const result = {
        standard: standardData.standard,
        status: calculateOverallStatus(compliant, total),
        statistics: {
            total,
            compliant,
            partial,
            in_progress: inProgress,
            non_compliant: nonCompliant,
            compliance_rate: Math.round((compliant / total) * 100)
        },
        requirements: standardData.requirements,
        timestamp: new Date().toISOString()
    };
    
    return result;
}

function calculateOverallStatus(compliant, total) {
    const rate = compliant / total;
    if (rate === 1) return 'compliant';
    if (rate >= 0.7) return 'partial';
    if (rate >= 0.4) return 'in_progress';
    return 'non_compliant';
}

function compareStandards(standardsStr) {
    const standardList = standardsStr.split(',').map(s => s.trim());
    console.log(`📊 Comparando estándares: ${standardList.join(', ')}`);
    
    const results = [];
    for (const standard of standardList) {
        const result = checkStandard(standard);
        results.push(result);
    }
    
    const totalStandards = results.length;
    const compliant = results.filter(r => r.status === 'compliant').length;
    const partial = results.filter(r => r.status === 'partial').length;
    const inProgress = results.filter(r => r.status === 'in_progress').length;
    const nonCompliant = results.filter(r => r.status === 'non_compliant').length;
    
    const comparison = {
        standards: results,
        summary: {
            total_standards: totalStandards,
            compliant,
            partial,
            in_progress: inProgress,
            non_compliant: nonCompliant,
            average_compliance: Math.round(results.reduce((acc, r) => acc + r.statistics.compliance_rate, 0) / totalStandards)
        },
        timestamp: new Date().toISOString()
    };
    
    return comparison;
}

function generateReport(inputData, format) {
    console.log(`📝 Generando reporte en formato ${format}`);
    
    let report = {
        timestamp: new Date().toISOString(),
        data: inputData
    };
    
    if (format === 'html') {
        const html = generateHTMLReport(report);
        const outputPath = path.join(REPORTS_DIR, `iss_report_${Date.now()}.html`);
        fs.writeFileSync(outputPath, html);
        console.log(`📄 Reporte guardado: ${outputPath}`);
        return outputPath;
    } else {
        const outputPath = path.join(REPORTS_DIR, `iss_report_${Date.now()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`📄 Reporte guardado: ${outputPath}`);
        return outputPath;
    }
}

function generateHTMLReport(report) {
    const data = report.data;
    let content = '';
    
    if (data.standards) {
        // Comparación de estándares
        content = `
            <h2>📊 Comparación de Estándares</h2>
            <p>Total de estándares: ${data.summary.total_standards}</p>
            <ul>
                <li>Compliant: ${data.summary.compliant}</li>
                <li>Partial: ${data.summary.partial}</li>
                <li>In Progress: ${data.summary.in_progress}</li>
                <li>Non-Compliant: ${data.summary.non_compliant}</li>
            </ul>
            <p>Average Compliance: ${data.summary.average_compliance}%</p>
            <h3>Detalles por estándar:</h3>
            ${data.standards.map(s => `
                <div style="background: #141e2b; padding: 10px; margin: 10px 0; border-radius: 5px;">
                    <h4>${s.standard.name} (${s.standard.id})</h4>
                    <p>Status: ${s.status}</p>
                    <p>Compliance Rate: ${s.statistics.compliance_rate}%</p>
                </div>
            `).join('')}
        `;
    } else if (data.standard) {
        // Estándar individual
        content = `
            <h2>📍 ${data.standard.name}</h2>
            <p><strong>ID:</strong> ${data.standard.id}</p>
            <p><strong>Versión:</strong> ${data.standard.version}</p>
            <p><strong>Categoría:</strong> ${data.standard.category}</p>
            <p><strong>Status:</strong> ${data.status}</p>
            <p><strong>Tasa de cumplimiento:</strong> ${data.statistics.compliance_rate}%</p>
            <h3>Requisitos:</h3>
            ${data.requirements.map(r => `
                <div style="display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #1a2a3a;">
                    <span>${r.name}</span>
                    <span>${r.status}</span>
                </div>
            `).join('')}
        `;
    }
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>International Security Standards Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0e1a; color: #e0e0e0; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a2332, #0d1520); padding: 20px; border-radius: 10px; margin-bottom: 20px; border-bottom: 3px solid #00d4ff; }
        .header h1 { color: #00d4ff; }
        .section { background: #141e2b; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #1a2a3a; }
        .footer { text-align: center; color: #667788; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 International Security Standards Report</h1>
        <p>${report.timestamp}</p>
    </div>
    <div class="section">
        ${content}
    </div>
    <div class="footer">
        🚀 Standards Compliance v1.0
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================

function main() {
    // Inicializar
    if (init) {
        initConfig();
        console.log('✅ Inicializacion completada.');
        return;
    }
    
    // Verificar configuracion
    if (!fs.existsSync(CONFIG_FILE)) {
        initConfig();
    }
    
    let result = null;
    let inputData = null;
    
    // Ejecutar accion
    switch (action) {
        case 'check':
            if (!standardId) {
                console.log('❌ Debes especificar --standard');
                return;
            }
            result = checkStandard(standardId);
            inputData = result;
            console.log(`✅ Estándar verificado: ${standardId}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Compliance Rate: ${result.statistics.compliance_rate}%`);
            break;
            
        case 'compare':
            if (!standardsList) {
                console.log('❌ Debes especificar --standards');
                return;
            }
            result = compareStandards(standardsList);
            inputData = result;
            console.log(`✅ Comparación completada`);
            console.log(`   Average Compliance: ${result.summary.average_compliance}%`);
            break;
            
        case 'report':
            // Buscar archivos de datos para reporte
            const files = fs.readdirSync(STANDARDS_DIR).filter(f => f.endsWith('.json'));
            if (files.length === 0) {
                console.log('ℹ️ No hay datos disponibles para generar reporte.');
                console.log('💡 Ejecuta --check o --compare primero.');
                return;
            }
            // Usar el primer archivo como ejemplo
            const data = JSON.parse(fs.readFileSync(path.join(STANDARDS_DIR, files[0]), 'utf8'));
            result = generateReport(data, format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --check, --compare, --report, --init');
            break;
    }
    
    // Guardar resultado si se especificó output
    if (result && outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`📄 Resultado guardado: ${outputFile}`);
    }
    
    console.log('\n✅ International Security Standards completado');
}

// Ejecutar
if (require.main === module) {
    main();
}
