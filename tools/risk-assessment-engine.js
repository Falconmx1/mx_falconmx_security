#!/usr/bin/env node

/**
 * Risk Assessment Engine - MFH TOOLS PRO
 * Motor de evaluacion de riesgos de seguridad
 * 
 * Uso: node risk-assessment-engine.js [opciones]
 * Ejemplo: node risk-assessment-engine.js --assess --asset web-server
 * Ejemplo: node risk-assessment-engine.js --analyze --threat ransomware
 * Ejemplo: node risk-assessment-engine.js --matrix
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'risk_config.json');
const RISKS_DIR = path.join(__dirname, 'risk_assessments');
const REPORTS_DIR = path.join(__dirname, 'risk_reports');

const DEFAULT_CONFIG = {
    risk_matrix: {
        levels: ['low', 'medium', 'high', 'critical'],
        thresholds: {
            low: 0.25,
            medium: 0.50,
            high: 0.75,
            critical: 1.0
        }
    },
    default_asset: 'unknown',
    impact_criteria: ['financial', 'reputational', 'operational', 'regulatory']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let asset = null;
let threat = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--assess':
            action = 'assess';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                asset = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                threat = args[i + 1];
                i++;
            }
            break;
        case '--matrix':
            action = 'matrix';
            break;
        case '--asset':
            asset = args[i + 1];
            i++;
            break;
        case '--threat':
            threat = args[i + 1];
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
📊 Risk Assessment Engine - MFH TOOLS PRO
========================================
Motor de evaluacion de riesgos de seguridad.

Uso:
  node risk-assessment-engine.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --assess [asset]      Evaluar riesgos de un activo
  --analyze [threat]    Analizar una amenaza especifica
  --matrix              Mostrar matriz de riesgos
  --asset <nombre>      Nombre del activo a evaluar
  --threat <nombre>     Amenaza a analizar
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node risk-assessment-engine.js --init
  node risk-assessment-engine.js --assess --asset web-server
  node risk-assessment-engine.js --analyze --threat ransomware
  node risk-assessment-engine.js --matrix
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
    if (!fs.existsSync(RISKS_DIR)) {
        fs.mkdirSync(RISKS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Riesgos: ${RISKS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function showRiskMatrix() {
    const config = loadConfig();
    console.log('\n📊 MATRIZ DE RIESGOS:');
    console.log('='.repeat(60));
    console.log('');
    console.log('   Probabilidad →');
    console.log('   │  Baja   Media   Alta');
    console.log('   ├─────────────────────');
    console.log('   │  Bajo    Bajo    Medio');
    console.log('   │  Medio   Medio   Alto');
    console.log('   │  Alto    Alto    Critico');
    console.log('');
    console.log('📋 Niveles de riesgo:');
    Object.entries(config.risk_matrix.thresholds).forEach(([level, threshold]) => {
        console.log(`   ${level.toUpperCase()}: ${(threshold * 100)}%`);
    });
}

function assessRisk(asset) {
    console.log(`🔍 Evaluando riesgos para: ${asset || 'activo desconocido'}`);
    
    const config = loadConfig();
    const assessmentId = crypto.randomBytes(8).toString('hex');
    
    // Simular evaluacion de riesgos
    const threats = [
        { name: 'Ransomware', likelihood: Math.random(), impact: Math.random() },
        { name: 'Phishing', likelihood: Math.random(), impact: Math.random() },
        { name: 'Data Breach', likelihood: Math.random(), impact: Math.random() },
        { name: 'DDoS', likelihood: Math.random(), impact: Math.random() },
        { name: 'Insider Threat', likelihood: Math.random(), impact: Math.random() }
    ];
    
    const results = threats.map(t => {
        const score = (t.likelihood + t.impact) / 2;
        let level = 'low';
        for (const [lvl, threshold] of Object.entries(config.risk_matrix.thresholds)) {
            if (score <= threshold) {
                level = lvl;
                break;
            }
        }
        return {
            threat: t.name,
            likelihood: Math.round(t.likelihood * 100),
            impact: Math.round(t.impact * 100),
            score: Math.round(score * 100),
            level: level
        };
    });
    
    // Calcular riesgo general
    const avgScore = results.reduce((acc, r) => acc + r.score, 0) / results.length;
    let overallLevel = 'low';
    for (const [lvl, threshold] of Object.entries(config.risk_matrix.thresholds)) {
        if (avgScore / 100 <= threshold) {
            overallLevel = lvl;
            break;
        }
    }
    
    const assessment = {
        id: assessmentId,
        timestamp: new Date().toISOString(),
        asset: asset || 'unknown',
        overall_risk: {
            score: Math.round(avgScore),
            level: overallLevel
        },
        threats: results,
        summary: {
            critical: results.filter(r => r.level === 'critical').length,
            high: results.filter(r => r.level === 'high').length,
            medium: results.filter(r => r.level === 'medium').length,
            low: results.filter(r => r.level === 'low').length
        },
        recommendations: generateRecommendations(results)
    };
    
    console.log(`\n📊 Resultados de la evaluacion:`);
    console.log(`   Activo: ${assessment.asset}`);
    console.log(`   Score: ${assessment.overall_risk.score}%`);
    console.log(`   Nivel: ${assessment.overall_risk.level.toUpperCase()}`);
    console.log(`   🔴 Criticos: ${assessment.summary.critical}`);
    console.log(`   🟠 Altos: ${assessment.summary.high}`);
    console.log(`   🟡 Medios: ${assessment.summary.medium}`);
    console.log(`   🟢 Bajos: ${assessment.summary.low}`);
    
    console.log(`\n📋 Amenazas evaluadas:`);
    results.forEach(r => {
        const icon = r.level === 'critical' ? '🔴' : r.level === 'high' ? '🟠' : r.level === 'medium' ? '🟡' : '🟢';
        console.log(`   ${icon} ${r.threat}: ${r.score}% (${r.level})`);
    });
    
    if (assessment.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        assessment.recommendations.forEach(r => {
            console.log(`   • ${r}`);
        });
    }
    
    const outputPath = outputFile || path.join(RISKS_DIR, `risk_${assessmentId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(assessment, null, 2));
    console.log(`\n📄 Evaluacion guardada: ${outputPath}`);
    
    return assessment;
}

function generateRecommendations(results) {
    const recs = [];
    const critical = results.filter(r => r.level === 'critical');
    const high = results.filter(r => r.level === 'high');
    
    if (critical.length > 0) {
        recs.push('Implementar controles inmediatos para riesgos criticos');
        recs.push('Notificar a la direccion de seguridad');
    }
    if (high.length > 0) {
        recs.push('Desarrollar plan de mitigacion para riesgos altos');
        recs.push('Revisar controles existentes');
    }
    if (results.some(r => r.threat === 'Ransomware' && r.level !== 'low')) {
        recs.push('Implementar backups y plan de recuperacion ante ransomware');
    }
    if (results.some(r => r.threat === 'Phishing' && r.level !== 'low')) {
        recs.push('Capacitar al personal en deteccion de phishing');
    }
    if (results.some(r => r.threat === 'Data Breach' && r.level !== 'low')) {
        recs.push('Implementar encriptacion y controles de acceso');
    }
    
    return recs.slice(0, 5);
}

function analyzeThreat(threat) {
    console.log(`🔍 Analizando amenaza: ${threat || 'general'}`);
    
    const assessment = {
        threat: threat || 'unknown',
        timestamp: new Date().toISOString(),
        analysis: {
            type: getThreatType(threat),
            severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            impact: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            likelihood: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            vectors: ['email', 'network', 'web', 'physical', 'social'][Math.floor(Math.random() * 5)]
        },
        mitigation: [
            'Implementar controles de deteccion',
            'Establecer procesos de respuesta',
            'Capacitar al personal',
            'Realizar pruebas regulares'
        ],
        indicators: [
            'Actividad inusual en la red',
            'Alertas de seguridad',
            'Reportes de usuarios',
            'Cambios no autorizados'
        ]
    };
    
    console.log(`\n📊 Analisis de amenaza:`);
    console.log(`   Amenaza: ${assessment.threat}`);
    console.log(`   Tipo: ${assessment.analysis.type}`);
    console.log(`   Severidad: ${assessment.analysis.severity.toUpperCase()}`);
    console.log(`   Impacto: ${assessment.analysis.impact.toUpperCase()}`);
    console.log(`   Vectores: ${assessment.analysis.vectors.join(', ')}`);
    
    console.log(`\n🛡️ Mitigacion:`);
    assessment.mitigation.forEach(m => {
        console.log(`   • ${m}`);
    });
    
    console.log(`\n🔍 Indicadores:`);
    assessment.indicators.forEach(i => {
        console.log(`   • ${i}`);
    });
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `threat_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(assessment, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return assessment;
}

function getThreatType(threat) {
    const types = {
        'ransomware': 'Malware',
        'phishing': 'Social Engineering',
        'ddos': 'Network Attack',
        'data breach': 'Data Security',
        'insider': 'Insider Threat',
        'malware': 'Malware',
        'virus': 'Malware',
        'worm': 'Malware'
    };
    
    const lower = threat.toLowerCase();
    for (const [key, value] of Object.entries(types)) {
        if (lower.includes(key)) {
            return value;
        }
    }
    return 'General Threat';
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📊 Risk Assessment Engine - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'assess':
            assessRisk(asset);
            break;
            
        case 'analyze':
            analyzeThreat(threat);
            break;
            
        case 'matrix':
            showRiskMatrix();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --assess, --analyze, --matrix, --init');
            break;
    }
    
    console.log('\n✅ Risk Assessment Engine completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Risk Assessment Engine...');
    process.exit(0);
});
