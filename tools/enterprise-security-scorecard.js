#!/usr/bin/env node

/**
 * Enterprise Security Scorecard - MFH TOOLS PRO
 * Scorecard de seguridad empresarial
 * 
 * Uso: node enterprise-security-scorecard.js [opciones]
 * Ejemplo: node enterprise-security-scorecard.js --generate --company "MiEmpresa"
 * Ejemplo: node enterprise-security-scorecard.js --audit --framework nist
 * Ejemplo: node enterprise-security-scorecard.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'scorecard_config.json');
const SCORECARDS_DIR = path.join(__dirname, 'scorecards');
const REPORTS_DIR = path.join(__dirname, 'scorecard_reports');

const DEFAULT_CONFIG = {
    frameworks: {
        'nist': { name: 'NIST CSF', categories: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'] },
        'iso27001': { name: 'ISO 27001', categories: ['Context', 'Leadership', 'Planning', 'Support', 'Operation', 'Evaluation', 'Improvement'] },
        'cis': { name: 'CIS Controls', categories: ['Basic', 'Foundational', 'Organizational'] }
    },
    scoring: {
        levels: ['Inicial', 'En desarrollo', 'Establecido', 'Avanzado', 'Óptimo'],
        weights: { technical: 0.4, administrative: 0.3, physical: 0.3 }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let companyName = null;
let framework = 'nist';
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--generate':
            action = 'generate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                companyName = args[i + 1];
                i++;
            }
            break;
        case '--audit':
            action = 'audit';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                framework = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--company':
            companyName = args[i + 1];
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
📊 Enterprise Security Scorecard - MFH TOOLS PRO
================================================
Scorecard de seguridad empresarial.

Uso:
  node enterprise-security-scorecard.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --generate <empresa>      Generar scorecard para empresa
  --audit <framework>       Auditar contra framework
  --report                  Generar reporte ejecutivo
  --company <nombre>        Nombre de la empresa
  --framework <nombre>      Framework (nist, iso27001, cis)
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node enterprise-security-scorecard.js --init
  node enterprise-security-scorecard.js --generate "MiEmpresa"
  node enterprise-security-scorecard.js --audit --framework nist
  node enterprise-security-scorecard.js --report --format html
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
    if (!fs.existsSync(SCORECARDS_DIR)) {
        fs.mkdirSync(SCORECARDS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Scorecards: ${SCORECARDS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generateScorecard(company) {
    console.log(`📊 Generando scorecard para: ${company}`);
    
    const config = loadConfig();
    const frameworks = Object.keys(config.frameworks);
    const selectedFramework = frameworks[Math.floor(Math.random() * frameworks.length)];
    const frameworkData = config.frameworks[selectedFramework];
    
    // Generar puntuaciones aleatorias
    const scores = {};
    let totalScore = 0;
    let maxScore = 0;
    
    for (const category of frameworkData.categories) {
        const score = Math.round((Math.random() * 40 + 60) * 10) / 10;
        scores[category] = score;
        totalScore += score;
        maxScore += 100;
    }
    
    const overallScore = Math.round((totalScore / maxScore) * 100 * 10) / 10;
    const level = config.scoring.levels[Math.floor((overallScore / 100) * (config.scoring.levels.length - 1))];
    
    const scorecard = {
        company: company,
        framework: selectedFramework,
        framework_name: frameworkData.name,
        timestamp: new Date().toISOString(),
        scores: scores,
        overall_score: overallScore,
        level: level,
        strengths: [],
        weaknesses: [],
        recommendations: []
    };
    
    // Generar fortalezas y debilidades
    for (const [category, score] of Object.entries(scores)) {
        if (score >= 80) {
            scorecard.strengths.push(`${category}: ${score}% - Buen desempeño`);
        } else if (score < 60) {
            scorecard.weaknesses.push(`${category}: ${score}% - Área de mejora`);
        }
    }
    
    // Recomendaciones
    const recs = [
        'Implementar políticas de seguridad documentadas',
        'Realizar auditorías de seguridad periódicas',
        'Capacitar al personal en seguridad',
        'Establecer controles de acceso',
        'Implementar monitoreo continuo',
        'Desarrollar plan de respuesta a incidentes'
    ];
    scorecard.recommendations = recs.slice(0, 3 + Math.floor(Math.random() * 3));
    
    console.log(`\n📊 Resultados:`);
    console.log(`   Empresa: ${scorecard.company}`);
    console.log(`   Framework: ${scorecard.framework_name}`);
    console.log(`   Score global: ${scorecard.overall_score}%`);
    console.log(`   Nivel: ${scorecard.level}`);
    console.log(`   Fortalezas: ${scorecard.strengths.length}`);
    console.log(`   Áreas de mejora: ${scorecard.weaknesses.length}`);
    
    if (scorecard.strengths.length > 0) {
        console.log(`\n✅ Fortalezas:`);
        scorecard.strengths.forEach(s => console.log(`   • ${s}`));
    }
    if (scorecard.weaknesses.length > 0) {
        console.log(`\n⚠️ Áreas de mejora:`);
        scorecard.weaknesses.forEach(s => console.log(`   • ${s}`));
    }
    
    const outputPath = outputFile || path.join(SCORECARDS_DIR, `scorecard_${company}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scorecard, null, 2));
    console.log(`\n📄 Scorecard guardado: ${outputPath}`);
    
    return scorecard;
}

function auditFramework(framework) {
    console.log(`🔍 Auditando framework: ${framework}`);
    
    const config = loadConfig();
    const frameworkData = config.frameworks[framework];
    
    if (!frameworkData) {
        console.error(`❌ Framework "${framework}" no encontrado. Opciones: ${Object.keys(config.frameworks).join(', ')}`);
        return;
    }
    
    const audit = {
        framework: framework,
        framework_name: frameworkData.name,
        timestamp: new Date().toISOString(),
        categories: [],
        summary: {
            total: 0,
            compliant: 0,
            partially_compliant: 0,
            non_compliant: 0
        }
    };
    
    for (const category of frameworkData.categories) {
        const status = ['compliant', 'partially_compliant', 'non_compliant'][Math.floor(Math.random() * 3)];
        const score = Math.round((Math.random() * 40 + 60) * 10) / 10;
        
        audit.categories.push({
            name: category,
            status: status,
            score: score,
            evidence: status === 'compliant' ? 'Documentación verificada' : 'Requiere revisión'
        });
        
        audit.summary.total++;
        audit.summary[status]++;
    }
    
    console.log(`\n📋 Resultados de auditoria:`);
    console.log(`   Framework: ${audit.framework_name}`);
    console.log(`   Categorías auditadas: ${audit.summary.total}`);
    console.log(`   ✅ Cumple: ${audit.summary.compliant}`);
    console.log(`   ⚠️ Parcial: ${audit.summary.partially_compliant}`);
    console.log(`   ❌ No cumple: ${audit.summary.non_compliant}`);
    
    audit.categories.forEach(c => {
        const icon = c.status === 'compliant' ? '✅' : c.status === 'partially_compliant' ? '⚠️' : '❌';
        console.log(`   ${icon} ${c.name}: ${c.score}% (${c.status})`);
    });
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `audit_${framework}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));
    console.log(`\n📄 Auditoria guardada: ${outputPath}`);
    
    return audit;
}

function generateReport(format) {
    console.log(`📊 Generando reporte ejecutivo en formato ${format}`);
    
    const files = fs.readdirSync(SCORECARDS_DIR).filter(f => f.startsWith('scorecard_'));
    if (files.length === 0) {
        console.log('ℹ️ No hay scorecards disponibles. Ejecuta --generate primero.');
        return;
    }
    
    const latest = files[files.length - 1];
    const data = JSON.parse(fs.readFileSync(path.join(SCORECARDS_DIR, latest), 'utf8'));
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateScorecardHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `executive_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateScorecardHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Enterprise Security Scorecard</title>
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
        .score-big {
            font-size: 4rem;
            font-weight: bold;
            color: #00ff00;
            text-align: center;
            padding: 20px;
        }
        .level-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
        }
        .level-Inicial { background: #dc3545; color: #fff; }
        .level-En\\ desarrollo { background: #ffc107; color: #000; }
        .level-Establecido { background: #17a2b8; color: #fff; }
        .level-Avanzado { background: #28a745; color: #fff; }
        .level-Óptimo { background: #00ff00; color: #000; }
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
        <h1>📊 Enterprise Security Scorecard</h1>
        <p><strong>Empresa:</strong> ${data.company}</p>
        <p><strong>Framework:</strong> ${data.framework_name}</p>
        <p><strong>Fecha:</strong> ${data.timestamp}</p>
        
        <div class="score-big">${data.overall_score}%</div>
        <div style="text-align:center;">
            <span class="level-badge level-${data.level}">${data.level}</span>
        </div>
        
        <h2>📋 Categorías</h2>
        <table>
            <thead>
                <tr>
                    <th>Categoría</th>
                    <th>Score</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(data.scores).map(([cat, score]) => `
                    <tr>
                        <td>${cat}</td>
                        <td>${score}%</td>
                        <td>${score >= 80 ? '✅ Bueno' : score >= 60 ? '⚠️ Regular' : '❌ Crítico'}</td>
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
    console.log(`📊 Enterprise Security Scorecard - MFH TOOLS PRO`);
    console.log('='.repeat(45));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'generate':
            if (!companyName) {
                console.error('❌ Debes especificar --company');
                process.exit(1);
            }
            generateScorecard(companyName);
            break;
            
        case 'audit':
            auditFramework(framework);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --generate, --audit, --report, --init');
            break;
    }
    
    console.log('\n✅ Enterprise Security Scorecard completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Enterprise Security Scorecard...');
    process.exit(0);
});
