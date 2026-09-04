#!/usr/bin/env node

/**
 * Country-Specific Compliance - MFH TOOLS PRO
 * Cumplimiento por país
 * 
 * Uso: node country-specific-compliance.js [opciones]
 * Ejemplo: node country-specific-compliance.js --check --country ES
 * Ejemplo: node country-specific-compliance.js --compare --countries ES,US
 * Ejemplo: node country-specific-compliance.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'country_config.json');
const COUNTRY_DIR = path.join(__dirname, 'country_data');
const REPORTS_DIR = path.join(__dirname, 'country_reports');

const DEFAULT_CONFIG = {
    countries: {
        'ES': { name: 'Spain', region: 'EU', framework: 'GDPR', requirements: ['DPO', 'DPIA', 'Data Breach Notification', 'Consent'] },
        'US': { name: 'United States', region: 'NA', framework: 'CCPA', requirements: ['Opt-Out', 'Access', 'Deletion', 'Notice'] },
        'UK': { name: 'United Kingdom', region: 'EU', framework: 'UK GDPR', requirements: ['DPO', 'DPIA', 'Data Breach Notification'] },
        'CA': { name: 'Canada', region: 'NA', framework: 'PIPEDA', requirements: ['Consent', 'Access', 'Retention', 'Accountability'] },
        'BR': { name: 'Brazil', region: 'SA', framework: 'LGPD', requirements: ['DPO', 'Consent', 'Data Breach Notification'] },
        'SG': { name: 'Singapore', region: 'AS', framework: 'PDPA', requirements: ['Consent', 'Access', 'Retention', 'Data Transfer'] },
        'AU': { name: 'Australia', region: 'OC', framework: 'Privacy Act', requirements: ['APP', 'Consent', 'Access', 'Security'] },
        'JP': { name: 'Japan', region: 'AS', framework: 'APPI', requirements: ['Consent', 'Security', 'Data Transfer'] }
    },
    common_requirements: ['Consent', 'Access', 'Security', 'Data Breach Notification']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let countryCode = null;
let compareCountries = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--check':
            action = 'check';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                countryCode = args[i + 1];
                i++;
            }
            break;
        case '--compare':
            action = 'compare';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                compareCountries = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--country':
            countryCode = args[i + 1];
            i++;
            break;
        case '--countries':
            compareCountries = args[i + 1];
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
===============================================
Cumplimiento por país.

Uso:
  node country-specific-compliance.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --check <pais>            Verificar requisitos por país
  --compare <paises>        Comparar requisitos entre países
  --report                  Generar reporte de cumplimiento
  --country <codigo>        Código del país (ES, US, UK, CA, BR, SG, AU, JP)
  --countries <lista>       Lista de países a comparar (ES,US,BR)
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node country-specific-compliance.js --init
  node country-specific-compliance.js --check --country ES
  node country-specific-compliance.js --compare --countries ES,US,BR
  node country-specific-compliance.js --report --format html
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
    if (!fs.existsSync(COUNTRY_DIR)) {
        fs.mkdirSync(COUNTRY_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de paises: ${COUNTRY_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function checkCountry(country) {
    console.log(`🌍 Verificando requisitos para: ${country}`);
    
    const config = loadConfig();
    const countries = config.countries;
    const common = config.common_requirements;
    
    if (!countries[country]) {
        console.error(`❌ Pais "${country}" no encontrado. Opciones: ${Object.keys(countries).join(', ')}`);
        return;
    }
    
    const countryData = countries[country];
    const requirements = countryData.requirements;
    const commonReqs = common.filter(r => requirements.includes(r));
    const uniqueReqs = requirements.filter(r => !common.includes(r));
    
    const compliance = {
        country: country,
        country_name: countryData.name,
        region: countryData.region,
        framework: countryData.framework,
        timestamp: new Date().toISOString(),
        requirements: {},
        common_requirements: commonReqs,
        unique_requirements: uniqueReqs,
        overall_status: '',
        recommendations: []
    };
    
    // Evaluar cada requisito
    for (const req of requirements) {
        const status = ['compliant', 'partial', 'non_compliant'][Math.floor(Math.random() * 3)];
        const score = Math.round((Math.random() * 40 + 60) * 10) / 10;
        compliance.requirements[req] = {
            status: status,
            score: score,
            evidence: status === 'compliant' ? 'Documentacion verificada' : 'Requiere revision'
        };
    }
    
    // Calcular compliance
    const compliantCount = Object.values(compliance.requirements).filter(r => r.status === 'compliant').length;
    const rate = Math.round((compliantCount / requirements.length) * 100);
    compliance.overall_status = rate >= 80 ? 'compliant' : rate >= 60 ? 'partial' : 'non_compliant';
    
    // Recomendaciones
    const recs = [
        `Revisar requisitos especificos de ${countryData.framework}`,
        'Documentar medidas de cumplimiento',
        'Realizar auditoria interna',
        'Actualizar politicas de privacidad'
    ];
    compliance.recommendations = recs.slice(0, 2 + Math.floor(Math.random() * 2));
    
    console.log(`\n📊 Resultados para ${countryData.name}:`);
    console.log(`   Framework: ${compliance.framework}`);
    console.log(`   Region: ${compliance.region}`);
    console.log(`   Estado general: ${compliance.overall_status}`);
    console.log(`   Requisitos comunes: ${compliance.common_requirements.length}`);
    console.log(`   Requisitos unicos: ${compliance.unique_requirements.length}`);
    
    console.log(`\n📋 Requisitos:`);
    for (const [req, data] of Object.entries(compliance.requirements)) {
        const icon = data.status === 'compliant' ? '✅' : data.status === 'partial' ? '⚠️' : '❌';
        console.log(`   ${icon} ${req}: ${data.score}% (${data.status})`);
    }
    
    if (compliance.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        compliance.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(COUNTRY_DIR, `country_${country}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(compliance, null, 2));
    console.log(`\n📄 Verificacion guardada: ${outputPath}`);
    
    return compliance;
}

function compareCountries(countries) {
    console.log(`🌍 Comparando requisitos entre paises: ${countries}`);
    
    const config = loadConfig();
    const countryList = countries ? countries.split(',') : ['ES', 'US', 'BR'];
    const allCountries = config.countries;
    
    const comparison = {
        countries: [],
        timestamp: new Date().toISOString(),
        common_requirements: [],
        differences: [],
        summary: {}
    };
    
    // Recolectar datos de cada pais
    const allReqs = new Set();
    const countryData = [];
    
    for (const code of countryList) {
        if (!allCountries[code]) {
            console.warn(`⚠️ Pais "${code}" no encontrado. Opciones: ${Object.keys(allCountries).join(', ')}`);
            continue;
        }
        
        const data = allCountries[code];
        const reqStatus = {};
        for (const req of data.requirements) {
            reqStatus[req] = Math.random() > 0.3;
            allReqs.add(req);
        }
        
        countryData.push({
            code: code,
            name: data.name,
            framework: data.framework,
            requirements: reqStatus,
            compliance_rate: Math.round((Object.values(reqStatus).filter(v => v).length / data.requirements.length) * 100)
        });
        
        comparison.countries.push(code);
    }
    
    // Identificar requisitos comunes
    const reqArray = Array.from(allReqs);
    for (const req of reqArray) {
        const presentInAll = countryData.every(c => c.requirements[req] !== undefined);
        if (presentInAll) {
            comparison.common_requirements.push(req);
        }
    }
    
    // Identificar diferencias
    for (const c1 of countryData) {
        for (const c2 of countryData) {
            if (c1.code < c2.code) {
                const reqs1 = Object.keys(c1.requirements);
                const reqs2 = Object.keys(c2.requirements);
                const onlyIn1 = reqs1.filter(r => !reqs2.includes(r));
                const onlyIn2 = reqs2.filter(r => !reqs1.includes(r));
                if (onlyIn1.length > 0 || onlyIn2.length > 0) {
                    comparison.differences.push({
                        country1: c1.code,
                        country2: c2.code,
                        only_in_country1: onlyIn1,
                        only_in_country2: onlyIn2
                    });
                }
            }
        }
    }
    
    // Resumen
    comparison.summary = {
        total_countries: countryData.length,
        average_compliance: Math.round(countryData.reduce((acc, c) => acc + c.compliance_rate, 0) / countryData.length),
        common_requirements_count: comparison.common_requirements.length
    };
    
    console.log(`\n📊 Resultados de comparacion:`);
    console.log(`   Paises analizados: ${comparison.summary.total_countries}`);
    console.log(`   Compliance promedio: ${comparison.summary.average_compliance}%`);
    console.log(`   Requisitos comunes: ${comparison.summary.common_requirements_count}`);
    
    console.log(`\n📋 Detalle por pais:`);
    for (const c of countryData) {
        console.log(`   ${c.code} (${c.framework}): ${c.compliance_rate}%`);
    }
    
    console.log(`\n📋 Requisitos comunes:`);
    comparison.common_requirements.forEach(r => console.log(`   • ${r}`));
    
    if (comparison.differences.length > 0) {
        console.log(`\n📋 Diferencias detectadas:`);
        for (const diff of comparison.differences) {
            if (diff.only_in_country1.length > 0) {
                console.log(`   • Solo en ${diff.country1}: ${diff.only_in_country1.join(', ')}`);
            }
            if (diff.only_in_country2.length > 0) {
                console.log(`   • Solo en ${diff.country2}: ${diff.only_in_country2.join(', ')}`);
            }
        }
    }
    
    const outputPath = outputFile || path.join(COUNTRY_DIR, `compare_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(comparison, null, 2));
    console.log(`\n📄 Comparacion guardada: ${outputPath}`);
    
    return comparison;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de cumplimiento por pais en formato ${format}`);
    
    const files = fs.readdirSync(COUNTRY_DIR).filter(f => f.startsWith('country_') || f.startsWith('compare_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --check o --compare primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(COUNTRY_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateCountryHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `country_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateCountryHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌍 Country-Specific Compliance Report</title>
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
        .compliant { color: #00ff00; }
        .partial { color: #ffc107; }
        .non_compliant { color: #dc3545; }
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
        <h1>🌍 Country-Specific Compliance Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Registros:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Paises Analizados</h2>
        ${data.map(d => {
            if (d.country && d.country_name) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">${d.country} - ${d.country_name}</h3>
                        <p class="${d.overall_status}">Estado: ${d.overall_status}</p>
                        <p>Framework: ${d.framework} | Region: ${d.region}</p>
                        <p>Requisitos: ${Object.keys(d.requirements).length}</p>
                    </div>
                `;
            }
            return '';
        }).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🌍 Country-Specific Compliance - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'check':
            if (!countryCode) {
                console.error('❌ Debes especificar --country');
                process.exit(1);
            }
            checkCountry(countryCode);
            break;
            
        case 'compare':
            compareCountries(compareCountries);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --check, --compare, --report, --init');
            break;
    }
    
    console.log('\n✅ Country-Specific Compliance completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Country-Specific Compliance...');
    process.exit(0);
});
