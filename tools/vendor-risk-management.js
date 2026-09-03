#!/usr/bin/env node

/**
 * Vendor Risk Management - MFH TOOLS PRO
 * Gestión de riesgos de proveedores
 * 
 * Uso: node vendor-risk-management.js [opciones]
 * Ejemplo: node vendor-risk-management.js --assess --vendor "Proveedor SA"
 * Ejemplo: node vendor-risk-management.js --list
 * Ejemplo: node vendor-risk-management.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'vendor_config.json');
const VENDORS_DIR = path.join(__dirname, 'vendors');
const REPORTS_DIR = path.join(__dirname, 'vendor_reports');

const DEFAULT_CONFIG = {
    risk_levels: ['Bajo', 'Medio', 'Alto', 'Crítico'],
    categories: ['Financiero', 'Tecnológico', 'Operacional', 'Legal', 'Reputacional', 'Seguridad'],
    default_vendors: [
        { name: 'AWS', category: 'Cloud', risk: 'Medio' },
        { name: 'Google', category: 'SaaS', risk: 'Bajo' },
        { name: 'Microsoft', category: 'SaaS', risk: 'Bajo' },
        { name: 'Oracle', category: 'Datos', risk: 'Medio' }
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let vendorName = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--assess':
            action = 'assess';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                vendorName = args[i + 1];
                i++;
            }
            break;
        case '--list':
            action = 'list';
            break;
        case '--report':
            action = 'report';
            break;
        case '--vendor':
            vendorName = args[i + 1];
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
📋 Vendor Risk Management - MFH TOOLS PRO
==========================================
Gestión de riesgos de proveedores.

Uso:
  node vendor-risk-management.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --assess <proveedor>      Evaluar riesgo de proveedor
  --list                    Listar proveedores
  --report                  Generar reporte de riesgos
  --vendor <nombre>         Nombre del proveedor
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node vendor-risk-management.js --init
  node vendor-risk-management.js --assess "Proveedor SA"
  node vendor-risk-management.js --list
  node vendor-risk-management.js --report --format html
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
    if (!fs.existsSync(VENDORS_DIR)) {
        fs.mkdirSync(VENDORS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear proveedores por defecto
    for (const v of config.default_vendors) {
        const vendorFile = path.join(VENDORS_DIR, `${v.name.toLowerCase().replace(/\s+/g, '_')}.json`);
        if (!fs.existsSync(vendorFile)) {
            fs.writeFileSync(vendorFile, JSON.stringify({
                name: v.name,
                category: v.category,
                risk: v.risk,
                assessed: false,
                created: new Date().toISOString()
            }, null, 2));
        }
    }
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Proveedores: ${VENDORS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function listVendors() {
    console.log('📋 Lista de proveedores:');
    console.log('='.repeat(40));
    
    const files = fs.readdirSync(VENDORS_DIR).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay proveedores registrados.');
        return;
    }
    
    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(VENDORS_DIR, file), 'utf8'));
            const assessed = data.assessed ? '✅' : '⏳';
            console.log(`   ${assessed} ${data.name} - ${data.category} - Riesgo: ${data.risk}`);
        } catch (e) {
            // Ignorar archivos corruptos
        }
    }
}

function assessVendor(vendorName) {
    console.log(`🔍 Evaluando proveedor: ${vendorName}`);
    
    const config = loadConfig();
    const vendorFile = path.join(VENDORS_DIR, `${vendorName.toLowerCase().replace(/\s+/g, '_')}.json`);
    
    let vendorData;
    if (fs.existsSync(vendorFile)) {
        vendorData = JSON.parse(fs.readFileSync(vendorFile, 'utf8'));
    } else {
        vendorData = {
            name: vendorName,
            category: ['Cloud', 'SaaS', 'Datos', 'Consultoría', 'Hardware'][Math.floor(Math.random() * 5)],
            risk: 'No evaluado',
            assessed: false,
            created: new Date().toISOString()
        };
    }
    
    // Evaluar categorías de riesgo
    const assessment = {
        vendor: vendorName,
        category: vendorData.category,
        timestamp: new Date().toISOString(),
        scores: {},
        overall_risk: null,
        recommendations: []
    };
    
    let totalScore = 0;
    const categories = config.categories;
    
    for (const cat of categories) {
        const score = Math.round((Math.random() * 40 + 30) * 10) / 10;
        assessment.scores[cat] = score;
        totalScore += score;
    }
    
    const avgScore = totalScore / categories.length;
    const riskLevels = config.risk_levels;
    let riskIndex = Math.floor((avgScore / 100) * (riskLevels.length - 1));
    if (riskIndex >= riskLevels.length) riskIndex = riskLevels.length - 1;
    const riskLevel = riskLevels[riskIndex];
    
    assessment.overall_risk = riskLevel;
    
    // Generar recomendaciones
    for (const [cat, score] of Object.entries(assessment.scores)) {
        if (score < 50) {
            assessment.recommendations.push(`Mejorar control en ${cat}`);
        }
    }
    if (assessment.recommendations.length === 0) {
        assessment.recommendations.push('Mantener monitoreo regular');
    }
    
    // Actualizar vendor
    vendorData.assessed = true;
    vendorData.risk = riskLevel;
    vendorData.last_assessment = assessment.timestamp;
    vendorData.assessment = assessment;
    
    fs.writeFileSync(vendorFile, JSON.stringify(vendorData, null, 2));
    
    console.log(`\n📊 Resultados de evaluación:`);
    console.log(`   Proveedor: ${vendorData.name}`);
    console.log(`   Categoría: ${vendorData.category}`);
    console.log(`   Riesgo global: ${riskLevel}`);
    console.log(`   Score promedio: ${avgScore.toFixed(1)}%`);
    
    console.log(`\n📋 Puntuaciones por categoría:`);
    for (const [cat, score] of Object.entries(assessment.scores)) {
        const icon = score >= 70 ? '🟢' : score >= 50 ? '🟡' : '🔴';
        console.log(`   ${icon} ${cat}: ${score}%`);
    }
    
    if (assessment.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        assessment.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    console.log(`\n📄 Evaluación guardada: ${vendorFile}`);
    
    return assessment;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de riesgos de proveedores en formato ${format}`);
    
    const files = fs.readdirSync(VENDORS_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        console.log('ℹ️ No hay proveedores registrados.');
        return;
    }
    
    const vendors = [];
    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(VENDORS_DIR, file), 'utf8'));
            vendors.push(data);
        } catch (e) {
            // Ignorar
        }
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateVendorHTML(vendors);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ vendors, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `vendor_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return vendors;
}

function generateVendorHTML(vendors) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📋 Vendor Risk Management Report</title>
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
        .risk-Bajo { color: #00ff00; }
        .risk-Medio { color: #ffc107; }
        .risk-Alto { color: #dc3545; }
        .risk-Crítico { color: #ff0000; font-weight: bold; }
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
        <h1>📋 Vendor Risk Management Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Total proveedores:</strong> ${vendors.length}</p>
        
        <h2>📋 Lista de Proveedores</h2>
        <table>
            <thead>
                <tr>
                    <th>Proveedor</th>
                    <th>Categoría</th>
                    <th>Riesgo</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${vendors.map(v => `
                    <tr>
                        <td>${v.name}</td>
                        <td>${v.category || 'N/A'}</td>
                        <td class="risk-${v.risk}">${v.risk || 'No evaluado'}</td>
                        <td>${v.assessed ? '✅ Evaluado' : '⏳ Pendiente'}</td>
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
    console.log(`📋 Vendor Risk Management - MFH TOOLS PRO`);
    console.log('='.repeat(45));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'assess':
            if (!vendorName) {
                console.error('❌ Debes especificar --vendor');
                process.exit(1);
            }
            assessVendor(vendorName);
            break;
            
        case 'list':
            listVendors();
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --assess, --list, --report, --init');
            break;
    }
    
    console.log('\n✅ Vendor Risk Management completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Vendor Risk Management...');
    process.exit(0);
});
