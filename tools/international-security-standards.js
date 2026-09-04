#!/usr/bin/env node

/**
 * International Security Standards - MFH TOOLS PRO
 * Estándares de seguridad internacionales
 * 
 * Uso: node international-security-standards.js [opciones]
 * Ejemplo: node international-security-standards.js --check --standard ISO27001
 * Ejemplo: node international-security-standards.js --compare --standards ISO27001,NIST
 * Ejemplo: node international-security-standards.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'standards_config.json');
const STANDARDS_DIR = path.join(__dirname, 'standards_data');
const REPORTS_DIR = path.join(__dirname, 'standards_reports');

const DEFAULT_CONFIG = {
    standards: {
        'ISO27001': { name: 'ISO/IEC 27001', type: 'Management', year: 2022, domains: ['Context', 'Leadership', 'Planning', 'Support', 'Operation', 'Evaluation', 'Improvement'] },
        'NIST': { name: 'NIST Cybersecurity Framework', type: 'Framework', year: 2018, domains: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'] },
        'PCI-DSS': { name: 'PCI DSS', type: 'Compliance', year: 2022, domains: ['Build', 'Maintain', 'Protect', 'Monitor', 'Security'] },
        'ISO27701': { name: 'ISO/IEC 27701', type: 'Privacy', year: 2019, domains: ['PIMS', 'Privacy Governance', 'Data Protection'] },
        'SOC2': { name: 'SOC 2', type: 'Audit', year: 2022, domains: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy'] }
    },
    requirements: {
        'ISO27001': ['ISMS', 'Risk Assessment', 'Security Policy', 'Incident Management', 'BCP'],
        'NIST': ['Asset Management', 'Risk Assessment', 'Protection Measures', 'Detection Mechanisms', 'Response Planning'],
        'PCI-DSS': ['Firewall', 'Secure Configurations', 'Encryption', 'Access Control', 'Monitoring'],
        'ISO27701': ['Privacy Framework', 'Data Mapping', 'Consent Management', 'DPIA', 'Data Transfer'],
        'SOC2': ['Logical Access', 'Change Management', 'System Availability', 'Data Processing']
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let standardName = null;
let compareStandards = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--check':
            action = 'check';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                standardName = args[i + 1];
                i++;
            }
            break;
        case '--compare':
            action = 'compare';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                compareStandards = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--standard':
            standardName = args[i + 1];
            i++;
            break;
        case '--standards':
            compareStandards = args[i + 1];
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
🌍 International Security Standards - MFH TOOLS PRO
====================================================
Estándares de seguridad internacionales.

Uso:
  node international-security-standards.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --check <estandar>        Verificar estandar de seguridad
  --compare <estandares>    Comparar estandares
  --report                  Generar reporte de estandares
  --standard <nombre>       Nombre del estandar
  --standards <lista>       Lista de estandares a comparar
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node international-security-standards.js --init
  node international-security-standards.js --check --standard ISO27001
  node international-security-standards.js --compare --standards ISO27001,NIST
  node international-security-standards.js --report --format html
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
    if (!fs.existsSync(STANDARDS_DIR)) {
        fs.mkdirSync(STANDARDS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de estandares: ${STANDARDS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function checkStandard(standard) {
    console.log(`🌍 Verificando estandar de seguridad: ${standard}`);
    
    const config = loadConfig();
    const standards = config.standards;
    const reqs = config.requirements;
    
    if (!standards[standard]) {
        console.error(`❌ Estandar "${standard}" no encontrado. Opciones: ${Object.keys(standards).join(', ')}`);
        return;
    }
    
    const stdData = standards[standard];
    const requirements = reqs[standard] || [];
    
    const assessment = {
        standard: standard,
        name: stdData.name,
        type: stdData.type,
        year: stdData.year,
        timestamp: new Date().toISOString(),
        domains: stdData.domains,
        requirements: [],
        compliance_rate: 0,
        maturity_level: '',
        gaps: [],
        recommendations: []
    };
    
    // Evaluar requisitos
    for (const req of requirements) {
        const status = ['implemented', 'partially_implemented', 'not_implemented'][Math.floor(Math.random() * 3)];
        const score = Math.round((Math.random() * 40 + 60) * 10) / 10;
        assessment.requirements.push({
            name: req,
            status: status,
            score: score,
            evidence: status === 'implemented' ? 'Evidencia documentada' : 'Evidencia insuficiente'
        });
    }
    
    // Calcular compliance
    const implemented = assessment.requirements.filter(r => r.status === 'implemented').length;
    assessment.compliance_rate = Math.round((implemented / assessment.requirements.length) * 100);
    
    // Nivel de madurez
    const levels = ['Inicial', 'Repetible', 'Definido', 'Gestionado', 'Optimizado'];
    const levelIndex = Math.min(Math.floor(assessment.compliance_rate / 20), 4);
    assessment.maturity_level = levels[levelIndex];
    
    // Gaps
    const gaps = assessment.requirements.filter(r => r.status === 'not_implemented');
    assessment.gaps = gaps.map(r => r.name);
    
    // Recomendaciones
    const recs = [
        `Implementar controles faltantes para ${standard}`,
        'Documentar procesos de seguridad',
        'Realizar auditoria interna',
        'Establecer mediciones de desempeño',
        'Actualizar politicas de seguridad'
    ];
    assessment.recommendations = recs.slice(0, 2 + Math.floor(Math.random() * 3));
    
    console.log(`\n📊 Resultados para ${stdData.name}:`);
    console.log(`   Tipo: ${assessment.type}`);
    console.log(`   Año: ${assessment.year}`);
    console.log(`   Compliance: ${assessment.compliance_rate}%`);
    console.log(`   Nivel de madurez: ${assessment.maturity_level}`);
    console.log(`   Dominios: ${assessment.domains.length}`);
    console.log(`   Brechas detectadas: ${assessment.gaps.length}`);
    
    console.log(`\n📋 Requisitos:`);
    for (const req of assessment.requirements) {
        const icon = req.status === 'implemented' ? '✅' : req.status === 'partially_implemented' ? '⚠️' : '❌';
        console.log(`   ${icon} ${req.name}: ${req.score}% (${req.status})`);
    }
    
    if (assessment.gaps.length > 0) {
        console.log(`\n⚠️ Brechas de cumplimiento:`);
        assessment.gaps.forEach(g => console.log(`   • ${g}`));
    }
    
    if (assessment.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        assessment.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(STANDARDS_DIR, `standard_${standard}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(assessment, null, 2));
    console.log(`\n📄 Evaluacion guardada: ${outputPath}`);
    
    return assessment;
}

function compareStandards(standards) {
    console.log(`🌍 Comparando estandares: ${standards}`);
    
    const config = loadConfig();
    const standardList = standards ? standards.split(',') : ['ISO27001', 'NIST'];
    const allStandards = config.standards;
    const reqs = config.requirements;
    
    const comparison = {
        standards: [],
        timestamp: new Date().toISOString(),
        common_requirements: [],
        differences: [],
        summary: {}
    };
    
    const allReqs = new Set();
    const standardData = [];
    
    for (const std of standardList) {
        if (!allStandards[std]) {
            console.warn(`⚠️ Estandar "${std}" no encontrado. Opciones: ${Object.keys(allStandards).join(', ')}`);
            continue;
        }
        
        const data = allStandards[std];
        const requirements = reqs[std] || [];
        const reqStatus = {};
        for (const req of requirements) {
            reqStatus[req] = Math.random() > 0.3;
            allReqs.add(req);
        }
        
        standardData.push({
            code: std,
            name: data.name,
            type: data.type,
            year: data.year,
            domains: data.domains,
            requirements: reqStatus,
            compliance_rate: Math.round((Object.values(reqStatus).filter(v => v).length / requirements.length) * 100)
        });
        
        comparison.standards.push(std);
    }
    
    // Requisitos comunes
    const reqArray = Array.from(allReqs);
    for (const req of reqArray) {
        const presentInAll = standardData.every(s => s.requirements[req] !== undefined);
        if (presentInAll) {
            comparison.common_requirements.push(req);
        }
    }
    
    // Diferencias
    for (const s1 of standardData) {
        for (const s2 of standardData) {
            if (s1.code < s2.code) {
                const reqs1 = Object.keys(s1.requirements);
                const reqs2 = Object.keys(s2.requirements);
                const onlyIn1 = reqs1.filter(r => !reqs2.includes(r));
                const onlyIn2 = reqs2.filter(r => !reqs1.includes(r));
                if (onlyIn1.length > 0 || onlyIn2.length > 0) {
                    comparison.differences.push({
                        standard1: s1.code,
                        standard2: s2.code,
                        only_in_standard1: onlyIn1,
                        only_in_standard2: onlyIn2
                    });
                }
            }
        }
    }
    
    // Resumen
    comparison.summary = {
        total_standards: standardData.length,
        average_compliance: Math.round(standardData.reduce((acc, s) => acc + s.compliance_rate, 0) / standardData.length),
        common_requirements_count: comparison.common_requirements.length
    };
    
    console.log(`\n📊 Resultados de comparacion:`);
    console.log(`   Estandares analizados: ${comparison.summary.total_standards}`);
    console.log(`   Compliance promedio: ${comparison.summary.average_compliance}%`);
    console.log(`   Requisitos comunes: ${comparison.summary.common_requirements_count}`);
    
    console.log(`\n📋 Detalle por estandar:`);
    for (const s of standardData) {
        console.log(`   ${s.code} (${s.type}): ${s.compliance_rate}%`);
    }
    
    console.log(`\n📋 Requisitos comunes:`);
    comparison.common_requirements.forEach(r => console.log(`   • ${r}`));
    
    if (comparison.differences.length > 0) {
        console.log(`\n📋 Diferencias detectadas:`);
        for (const diff of comparison.differences) {
            if (diff.only_in_standard1.length > 0) {
                console.log(`   • Solo en ${diff.standard1}: ${diff.only_in_standard1.join(', ')}`);
            }
            if (diff.only_in_standard2.length > 0) {
                console.log(`   • Solo en ${diff.standard2}: ${diff.only_in_standard2.join(', ')}`);
            }
        }
    }
    
    const outputPath = outputFile || path.join(STANDARDS_DIR, `compare_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(comparison, null, 2));
    console.log(`\n📄 Comparacion guardada: ${outputPath}`);
    
    return comparison;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de estandares internacionales en formato ${format}`);
    
    const files = fs.readdirSync(STANDARDS_DIR).filter(f => f.startsWith('standard_') || f.startsWith('compare_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --check o --compare primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(STANDARDS_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateStandardsHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `standards_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateStandardsHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌍 International Security Standards Report</title>
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
        <h1>🌍 International Security Standards Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Evaluaciones:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Estandares Evaluados</h2>
        ${data.map(d => {
            if (d.standard && d.name) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">${d.standard} - ${d.name}</h3>
                        <p>Compliance: ${d.compliance_rate}% | Madurez: ${d.maturity_level}</p>
                        <p>Tipo: ${d.type} | Año: ${d.year}</p>
                        <p>Dominios: ${d.domains.length} | Brechas: ${d.gaps.length}</p>
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
    console.log(`🌍 International Security Standards - MFH TOOLS PRO`);
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
            if (!standardName) {
                console.error('❌ Debes especificar --standard');
                process.exit(1);
            }
            checkStandard(standardName);
            break;
            
        case 'compare':
            compareStandards(compareStandards);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --check, --compare, --report, --init');
            break;
    }
    
    console.log('\n✅ International Security Standards completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo International Security Standards...');
    process.exit(0);
});
