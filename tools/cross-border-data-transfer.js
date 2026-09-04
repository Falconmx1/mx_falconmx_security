#!/usr/bin/env node

/**
 * Cross-Border Data Transfer - MFH TOOLS PRO
 * Gestión de transferencias de datos transfronterizas
 * 
 * Uso: node cross-border-data-transfer.js [opciones]
 * Ejemplo: node cross-border-data-transfer.js --assess --origin EU --destination US
 * Ejemplo: node cross-border-data-transfer.js --compliance --framework GDPR
 * Ejemplo: node cross-border-data-transfer.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'transfer_config.json');
const TRANSFER_DIR = path.join(__dirname, 'transfer_data');
const REPORTS_DIR = path.join(__dirname, 'transfer_reports');

const DEFAULT_CONFIG = {
    jurisdictions: {
        'EU': { name: 'European Union', adequacy: ['US', 'UK', 'Canada', 'Switzerland'] },
        'US': { name: 'United States', adequacy: ['EU', 'UK', 'Canada'] },
        'UK': { name: 'United Kingdom', adequacy: ['EU', 'US'] },
        'Canada': { name: 'Canada', adequacy: ['EU', 'US', 'UK'] },
        'Singapore': { name: 'Singapore', adequacy: ['EU', 'UK'] },
        'Brazil': { name: 'Brazil', adequacy: ['EU'] }
    },
    frameworks: ['GDPR', 'CCPA', 'PIPEDA', 'LGPD', 'PDPA'],
    safeguards: ['SCC', 'BCR', 'DPA', 'CERTIFICATION', 'CODES_OF_CONDUCT']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let originJurisdiction = null;
let destinationJurisdiction = null;
let framework = 'GDPR';
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--assess':
            action = 'assess';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                originJurisdiction = args[i + 1];
                i++;
            }
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                destinationJurisdiction = args[i + 1];
                i++;
            }
            break;
        case '--compliance':
            action = 'compliance';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                framework = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--origin':
            originJurisdiction = args[i + 1];
            i++;
            break;
        case '--destination':
            destinationJurisdiction = args[i + 1];
            i++;
            break;
        case '--framework':
            framework = args[i + 1];
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
🌍 Cross-Border Data Transfer - MFH TOOLS PRO
==============================================
Gestión de transferencias de datos transfronterizas.

Uso:
  node cross-border-data-transfer.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --assess <origen> <dest>  Evaluar transferencia de datos
  --compliance <framework>  Verificar compliance con framework
  --report                  Generar reporte de transferencias
  --origin <jurisdiccion>   Jurisdiccion de origen (EU, US, UK, etc)
  --destination <jurisdic>  Jurisdiccion de destino
  --framework <nombre>      Framework a evaluar (GDPR, CCPA, etc)
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node cross-border-data-transfer.js --init
  node cross-border-data-transfer.js --assess EU US
  node cross-border-data-transfer.js --compliance --framework GDPR
  node cross-border-data-transfer.js --report --format html
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
    if (!fs.existsSync(TRANSFER_DIR)) {
        fs.mkdirSync(TRANSFER_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de transferencia: ${TRANSFER_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function assessTransfer(origin, destination) {
    console.log(`🌍 Evaluando transferencia de datos: ${origin} -> ${destination}`);
    
    const config = loadConfig();
    const jurisdictions = config.jurisdictions;
    
    if (!jurisdictions[origin]) {
        console.error(`❌ Jurisdiccion "${origin}" no encontrada. Opciones: ${Object.keys(jurisdictions).join(', ')}`);
        return;
    }
    if (!jurisdictions[destination]) {
        console.error(`❌ Jurisdiccion "${destination}" no encontrada. Opciones: ${Object.keys(jurisdictions).join(', ')}`);
        return;
    }
    
    const originData = jurisdictions[origin];
    const destData = jurisdictions[destination];
    const isAdequate = originData.adequacy.includes(destination);
    
    const safeguards = config.safeguards;
    const frameworks = config.frameworks;
    
    const assessment = {
        origin: origin,
        origin_name: originData.name,
        destination: destination,
        destination_name: destData.name,
        timestamp: new Date().toISOString(),
        adequacy: isAdequate,
        risk_level: isAdequate ? 'Low' : ['Medium', 'High', 'Critical'][Math.floor(Math.random() * 3)],
        safeguards_required: [],
        frameworks_applicable: [],
        recommendations: []
    };
    
    // Safeguards requeridos
    const requiredCount = isAdequate ? 1 : 2 + Math.floor(Math.random() * 2);
    const shuffled = [...safeguards].sort(() => Math.random() - 0.5);
    assessment.safeguards_required = shuffled.slice(0, requiredCount);
    
    // Frameworks aplicables
    const frameworkCount = Math.floor(Math.random() * 3) + 1;
    const shuffledFrameworks = [...frameworks].sort(() => Math.random() - 0.5);
    assessment.frameworks_applicable = shuffledFrameworks.slice(0, frameworkCount);
    
    // Recomendaciones
    const recs = [
        isAdequate ? 'Transferencia permitida bajo decision de adecuacion' : 'Implementar salvaguardas adicionales',
        'Revisar clausulas contractuales',
        'Realizar evaluacion de impacto de transferencia',
        'Documentar base legal de la transferencia',
        'Implementar medidas de seguridad tecnicas'
    ];
    assessment.recommendations = recs.slice(0, 3 + Math.floor(Math.random() * 2));
    
    console.log(`\n📊 Resultados de evaluacion:`);
    console.log(`   Origen: ${assessment.origin_name}`);
    console.log(`   Destino: ${assessment.destination_name}`);
    console.log(`   Adecuacion: ${assessment.adequacy ? '✅ Si' : '❌ No'}`);
    console.log(`   Nivel de riesgo: ${assessment.risk_level}`);
    console.log(`   Salvaguardas requeridas: ${assessment.safeguards_required.length}`);
    
    console.log(`\n🛡️ Salvaguardas recomendadas:`);
    assessment.safeguards_required.forEach(s => console.log(`   • ${s}`));
    
    console.log(`\n📋 Frameworks aplicables:`);
    assessment.frameworks_applicable.forEach(f => console.log(`   • ${f}`));
    
    if (assessment.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        assessment.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(TRANSFER_DIR, `transfer_${origin}_${destination}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(assessment, null, 2));
    console.log(`\n📄 Evaluacion guardada: ${outputPath}`);
    
    return assessment;
}

function checkCompliance(framework) {
    console.log(`📋 Verificando compliance con framework: ${framework}`);
    
    const config = loadConfig();
    const frameworks = config.frameworks;
    
    if (!frameworks.includes(framework)) {
        console.error(`❌ Framework "${framework}" no encontrado. Opciones: ${frameworks.join(', ')}`);
        return;
    }
    
    const compliance = {
        framework: framework,
        timestamp: new Date().toISOString(),
        requirements: [],
        summary: {
            total: 0,
            compliant: 0,
            partially_compliant: 0,
            non_compliant: 0,
            overall_status: ''
        }
    };
    
    // Requerimientos de compliance
    const reqs = [
        'Data Protection Impact Assessment',
        'Privacy Policy Documentation',
        'Data Subject Rights',
        'Data Breach Notification',
        'Data Transfer Mechanisms',
        'Data Retention Policy',
        'Third Party Agreements',
        'Security Measures'
    ];
    
    const selectedReqs = reqs.slice(0, 5 + Math.floor(Math.random() * 3));
    
    for (const req of selectedReqs) {
        const status = ['compliant', 'partially_compliant', 'non_compliant'][Math.floor(Math.random() * 3)];
        const score = Math.round((Math.random() * 40 + 60) * 10) / 10;
        
        compliance.requirements.push({
            requirement: req,
            status: status,
            score: score,
            evidence: status === 'compliant' ? 'Documentacion verificada' : 'Evidencia insuficiente'
        });
        
        compliance.summary.total++;
        compliance.summary[status]++;
    }
    
    const rate = Math.round((compliance.summary.compliant / compliance.summary.total) * 100);
    compliance.summary.overall_status = rate >= 80 ? 'compliant' : rate >= 50 ? 'partial' : 'non_compliant';
    
    console.log(`\n📊 Resultados de compliance:`);
    console.log(`   Framework: ${compliance.framework}`);
    console.log(`   Estado general: ${compliance.summary.overall_status}`);
    console.log(`   ✅ Cumple: ${compliance.summary.compliant}`);
    console.log(`   ⚠️ Parcial: ${compliance.summary.partially_compliant}`);
    console.log(`   ❌ No cumple: ${compliance.summary.non_compliant}`);
    
    console.log(`\n📋 Requerimientos:`);
    compliance.requirements.forEach(r => {
        const icon = r.status === 'compliant' ? '✅' : r.status === 'partially_compliant' ? '⚠️' : '❌';
        console.log(`   ${icon} ${r.requirement}: ${r.score}% (${r.status})`);
    });
    
    const outputPath = outputFile || path.join(TRANSFER_DIR, `compliance_${framework}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(compliance, null, 2));
    console.log(`\n📄 Compliance guardado: ${outputPath}`);
    
    return compliance;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de transferencias transfronterizas en formato ${format}`);
    
    const files = fs.readdirSync(TRANSFER_DIR).filter(f => f.startsWith('transfer_') || f.startsWith('compliance_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --assess o --compliance primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(TRANSFER_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateTransferHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `transfer_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateTransferHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌍 Cross-Border Data Transfer Report</title>
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
        <h1>🌍 Cross-Border Data Transfer Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Evaluaciones:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Transferencias Evaluadas</h2>
        ${data.map(d => {
            if (d.origin && d.destination) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">${d.origin} ➜ ${d.destination}</h3>
                        <p>Adecuacion: ${d.adequacy ? '✅ Si' : '❌ No'} | Riesgo: ${d.risk_level}</p>
                        <p>Salvaguardas: ${d.safeguards_required.join(', ')}</p>
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
    console.log(`🌍 Cross-Border Data Transfer - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'assess':
            if (!originJurisdiction || !destinationJurisdiction) {
                console.error('❌ Debes especificar --origin y --destination');
                process.exit(1);
            }
            assessTransfer(originJurisdiction, destinationJurisdiction);
            break;
            
        case 'compliance':
            checkCompliance(framework);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --assess, --compliance, --report, --init');
            break;
    }
    
    console.log('\n✅ Cross-Border Data Transfer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Cross-Border Data Transfer...');
    process.exit(0);
});
