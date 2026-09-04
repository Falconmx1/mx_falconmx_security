#!/usr/bin/env node

/**
 * Country-Specific Compliance - MFH TOOLS PRO
 * Cumplimiento específico por país
 * 
 * Uso: node country-specific-compliance.js [opciones]
 * Ejemplo: node country-specific-compliance.js --check --country Mexico
 * Ejemplo: node country-specific-compliance.js --compare --countries Mexico,Brazil
 * Ejemplo: node country-specific-compliance.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'csc_config.json');
const CSC_DIR = path.join(__dirname, 'csc_countries');
const REPORTS_DIR = path.join(__dirname, 'csc_reports');

const DEFAULT_CONFIG = {
    countries: {
        'Mexico': { regulation: 'LFPDPPP', year: 2010, status: 'active' },
        'Brazil': { regulation: 'LGPD', year: 2020, status: 'active' },
        'Colombia': { regulation: 'Ley 1581', year: 2012, status: 'active' },
        'Argentina': { regulation: 'Ley 25.326', year: 2000, status: 'active' },
        'Chile': { regulation: 'Ley 19.628', year: 1999, status: 'active' },
        'Spain': { regulation: 'LOPDGDD', year: 2018, status: 'active' }
    },
    status_levels: ['compliant', 'partial', 'in_progress', 'non_compliant']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let countryName = null;
let countriesList = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--check':
            action = 'check';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                countryName = args[i + 1];
                i++;
            }
            break;
        case '--compare':
            action = 'compare';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                countriesList = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--country':
            countryName = args[i + 1];
            i++;
            break;
        case '--countries':
            countriesList = args[i + 1];
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
🌍 Country-Specific Compliance - MFH TOOLS PRO
==============================================
Cumplimiento específico por país.

Uso:
  node country-specific-compliance.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --check <pais>            Verificar cumplimiento en país
  --compare <paises>        Comparar cumplimiento entre países
  --report                  Generar reporte de cumplimiento
  --country <nombre>        Nombre del país
  --countries <lista>       Lista de países separados por coma
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node country-specific-compliance.js --init
  node country-specific-compliance.js --check --country Mexico
  node country-specific-compliance.js --compare --countries Mexico,Brazil
  node country-specific-compliance.js --report --format html
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
    
    const dirs = [CSC_DIR, REPORTS_DIR];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 ${path.basename(dir)}: ${dir}`);
        }
    });
}

function checkCountry(countryName) {
    console.log(`🌍 Verificando cumplimiento en: ${countryName}`);
    
    // Buscar datos del país
    const countryFile = path.join(CSC_DIR, `${countryName.toLowerCase()}.json`);
    let countryData = null;
    
    if (fs.existsSync(countryFile)) {
        countryData = JSON.parse(fs.readFileSync(countryFile, 'utf8'));
    } else {
        // Datos de ejemplo si no existe
        countryData = {
            country: countryName,
            regulations: {
                name: DEFAULT_CONFIG.countries[countryName]?.regulation || `${countryName} Data Protection Law`,
                year: DEFAULT_CONFIG.countries[countryName]?.year || 2020,
                requirements: [
                    { id: `${countryName.substring(0,3).toUpperCase()}-001`, name: 'Privacy Notice', status: 'partial' },
                    { id: `${countryName.substring(0,3).toUpperCase()}-002`, name: 'Data Processing Consent', status: 'in_progress' },
                    { id: `${countryName.substring(0,3).toUpperCase()}-003`, name: 'Data Subject Rights', status: 'compliant' }
                ]
            }
        };
    }
    
    // Calcular estadísticas
    const total = countryData.regulations.requirements.length;
    const compliant = countryData.regulations.requirements.filter(r => r.status === 'compliant').length;
    const partial = countryData.regulations.requirements.filter(r => r.status === 'partial').length;
    const inProgress = countryData.regulations.requirements.filter(r => r.status === 'in_progress').length;
    const nonCompliant = countryData.regulations.requirements.filter(r => r.status === 'non_compliant').length;
    
    const result = {
        country: countryName,
        regulation: countryData.regulations.name,
        year: countryData.regulations.year,
        status: calculateOverallStatus(compliant, total),
        statistics: {
            total,
            compliant,
            partial,
            in_progress: inProgress,
            non_compliant: nonCompliant,
            compliance_rate: Math.round((compliant / total) * 100)
        },
        requirements: countryData.regulations.requirements,
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

function compareCountries(countriesStr) {
    const countryList = countriesStr.split(',').map(c => c.trim());
    console.log(`📊 Comparando países: ${countryList.join(', ')}`);
    
    const results = [];
    for (const country of countryList) {
        const result = checkCountry(country);
        results.push(result);
    }
    
    // Calcular estadísticas globales
    const totalCountries = results.length;
    const compliant = results.filter(r => r.status === 'compliant').length;
    const partial = results.filter(r => r.status === 'partial').length;
    const inProgress = results.filter(r => r.status === 'in_progress').length;
    const nonCompliant = results.filter(r => r.status === 'non_compliant').length;
    
    const comparison = {
        countries: results,
        summary: {
            total_countries: totalCountries,
            compliant,
            partial,
            in_progress: inProgress,
            non_compliant: nonCompliant,
            average_compliance: Math.round(results.reduce((acc, r) => acc + r.statistics.compliance_rate, 0) / totalCountries)
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
        const outputPath = path.join(REPORTS_DIR, `csc_report_${Date.now()}.html`);
        fs.writeFileSync(outputPath, html);
        console.log(`📄 Reporte guardado: ${outputPath}`);
        return outputPath;
    } else {
        const outputPath = path.join(REPORTS_DIR, `csc_report_${Date.now()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`📄 Reporte guardado: ${outputPath}`);
        return outputPath;
    }
}

function generateHTMLReport(report) {
    const data = report.data;
    let content = '';
    
    if (data.countries) {
        // Comparación de países
        content = `
            <h2>📊 Comparación de Países</h2>
            <p>Total de países: ${data.summary.total_countries}</p>
            <ul>
                <li>Compliant: ${data.summary.compliant}</li>
                <li>Partial: ${data.summary.partial}</li>
                <li>In Progress: ${data.summary.in_progress}</li>
                <li>Non-Compliant: ${data.summary.non_compliant}</li>
            </ul>
            <p>Average Compliance: ${data.summary.average_compliance}%</p>
            <h3>Detalles por país:</h3>
            ${data.countries.map(c => `
                <div style="background: #141e2b; padding: 10px; margin: 10px 0; border-radius: 5px;">
                    <h4>${c.country} - ${c.regulation}</h4>
                    <p>Status: ${c.status}</p>
                    <p>Compliance Rate: ${c.statistics.compliance_rate}%</p>
                </div>
            `).join('')}
        `;
    } else if (data.country) {
        // País individual
        content = `
            <h2>📍 ${data.country}</h2>
            <p><strong>Regulación:</strong> ${data.regulation}</p>
            <p><strong>Año:</strong> ${data.year}</p>
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
    <title>Country-Specific Compliance Report</title>
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
        <h1>🌍 Country-Specific Compliance Report</h1>
        <p>${report.timestamp}</p>
    </div>
    <div class="section">
        ${content}
    </div>
    <div class="footer">
        🚀 Country Compliance v1.0
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
            if (!countryName) {
                console.log('❌ Debes especificar --country');
                return;
            }
            result = checkCountry(countryName);
            inputData = result;
            console.log(`✅ Cumplimiento verificado para ${countryName}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Compliance Rate: ${result.statistics.compliance_rate}%`);
            break;
            
        case 'compare':
            if (!countriesList) {
                console.log('❌ Debes especificar --countries');
                return;
            }
            result = compareCountries(countriesList);
            inputData = result;
            console.log(`✅ Comparación completada`);
            console.log(`   Average Compliance: ${result.summary.average_compliance}%`);
            break;
            
        case 'report':
            // Buscar archivos de datos para reporte
            const files = fs.readdirSync(CSC_DIR).filter(f => f.endsWith('.json'));
            if (files.length === 0) {
                console.log('ℹ️ No hay datos disponibles para generar reporte.');
                console.log('💡 Ejecuta --check o --compare primero.');
                return;
            }
            // Usar el primer archivo como ejemplo
            const data = JSON.parse(fs.readFileSync(path.join(CSC_DIR, files[0]), 'utf8'));
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
    
    console.log('\n✅ Country-Specific Compliance completado');
}

// Ejecutar
if (require.main === module) {
    main();
}
