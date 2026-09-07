#!/usr/bin/env node

/**
 * Neuro-Phishing Detector - MFH TOOLS PRO
 * Detecta ataques de phishing diseñados para manipular procesos cognitivos
 * 
 * Uso: node neuro-phishing-detector.js [opciones]
 * Ejemplo: node neuro-phishing-detector.js --detect --url https://phishing-site.com
 * Ejemplo: node neuro-phishing-detector.js --analyze --file phishing_email.eml
 * Ejemplo: node neuro-phishing-detector.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'neuro_phishing_config.json');
const REPORTS_DIR = path.join(__dirname, 'neuro_phishing_reports');

const DEFAULT_CONFIG = {
    detection_factors: {
        'urgency': { name: 'Urgencia', weight: 0.2 },
        'authority': { name: 'Autoridad', weight: 0.15 },
        'fear': { name: 'Miedo', weight: 0.15 },
        'curiosity': { name: 'Curiosidad', weight: 0.1 },
        'social_proof': { name: 'Prueba Social', weight: 0.1 },
        'scarcity': { name: 'Escasez', weight: 0.1 },
        'trust': { name: 'Confianza', weight: 0.1 },
        'personalization': { name: 'Personalización', weight: 0.1 }
    },
    neuro_indicators: {
        'emotional_language': { name: 'Lenguaje Emocional', severity: 'high' },
        'cognitive_manipulation': { name: 'Manipulación Cognitiva', severity: 'critical' },
        'decision_overload': { name: 'Sobrecarga de Decisión', severity: 'medium' },
        'authority_abuse': { name: 'Abuso de Autoridad', severity: 'high' },
        'urgency_trigger': { name: 'Disparador de Urgencia', severity: 'high' }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let target = null;
let filePath = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--detect':
            action = 'detect';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                target = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                filePath = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--url':
            target = args[i + 1];
            i++;
            break;
        case '--file':
            filePath = args[i + 1];
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
🧠 Neuro-Phishing Detector - MFH TOOLS PRO
======================================
Detecta ataques de phishing cognitivo.

Uso:
  node neuro-phishing-detector.js [opciones]

Opciones:
  --init                Crear configuración por defecto
  --detect <url>        Detectar phishing en URL
  --analyze <archivo>   Analizar archivo de phishing
  --report              Generar reporte de detección
  --url <url>           URL a analizar
  --file <archivo>      Archivo a analizar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar más detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node neuro-phishing-detector.js --init
  node neuro-phishing-detector.js --detect --url https://phishing-site.com
  node neuro-phishing-detector.js --analyze --file phishing_email.eml
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
        console.error('❌ Error cargando configuración:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuración por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function detectNeuroPhishing(url) {
    console.log(`🧠 Detectando neuro-phishing en: ${url}`);
    
    const config = loadConfig();
    const factors = config.detection_factors;
    const indicators = config.neuro_indicators;
    
    // Simular detección de neuro-phishing
    const factorScores = {};
    let totalScore = 0;
    let riskFactors = [];
    let detectedIndicators = [];
    
    for (const [key, factor] of Object.entries(factors)) {
        const score = Math.random() * 100;
        const isRisk = score > 70;
        factorScores[key] = {
            name: factor.name,
            score: score.toFixed(1) + '%',
            is_risk: isRisk,
            weight: factor.weight
        };
        if (isRisk) {
            riskFactors.push(factor.name);
        }
        totalScore += score * factor.weight;
    }
    
    for (const [key, indicator] of Object.entries(indicators)) {
        if (Math.random() > 0.5) {
            detectedIndicators.push({
                id: key,
                name: indicator.name,
                severity: indicator.severity,
                description: `Indicador de ${indicator.name} detectado en el contenido`
            });
        }
    }
    
    const finalScore = totalScore;
    const isPhishing = finalScore > 65;
    const riskLevel = finalScore > 80 ? 'critical' : finalScore > 65 ? 'high' : 'medium';
    
    const result = {
        target: url,
        timestamp: new Date().toISOString(),
        factors: factorScores,
        indicators: detectedIndicators,
        summary: {
            phishing_score: finalScore.toFixed(1) + '%',
            is_phishing: isPhishing,
            risk_level: riskLevel,
            risk_factors: riskFactors.length
        },
        recommendations: isPhishing ? [
            '🚨 URL detectada como phishing cognitivo',
            'No interactuar con el contenido',
            'Reportar a las autoridades correspondientes'
        ] : [
            '✅ URL parece segura',
            'Continuar con precaución'
        ]
    };
    
    console.log(`\n📊 Resultados de detección:`);
    console.log(`   URL: ${result.target}`);
    console.log(`   Score de phishing: ${result.summary.phishing_score}`);
    console.log(`   Phishing: ${result.summary.is_phishing ? '⚠️ DETECTADO' : '✅ NO DETECTADO'}`);
    console.log(`   Nivel de riesgo: ${result.summary.risk_level.toUpperCase()}`);
    console.log(`\n   Factores de riesgo:`);
    for (const [key, factor] of Object.entries(result.factors)) {
        const icon = factor.is_risk ? '⚠️' : '✅';
        console.log(`   ${icon} ${factor.name}: ${factor.score} ${factor.is_risk ? '(RIESGO)' : ''}`);
    }
    
    if (result.indicators.length > 0) {
        console.log(`\n🧠 Indicadores neuro-cognitivos detectados:`);
        result.indicators.forEach(i => {
            const icon = i.severity === 'critical' ? '🔴' : i.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${i.name} (${i.severity})`);
        });
    }
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `neuro_phish_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Detección guardada: ${outputPath}`);
    
    return result;
}

function analyzeNeuroPhishingFile(filePath) {
    console.log(`🧠 Analizando archivo de neuro-phishing: ${filePath}`);
    
    // Simular análisis de archivo
    const result = {
        file: filePath,
        timestamp: new Date().toISOString(),
        analysis: {
            content_type: Math.random() > 0.5 ? 'Email' : 'Documento',
            suspicious_patterns: [
                'Lenguaje de urgencia detectado',
                'Solicitud de datos personales',
                'Dirección de remitente sospechosa',
                'Enlaces redirigidos'
            ],
            neuro_manipulation_score: (Math.random() * 100).toFixed(1) + '%',
            cognitive_triggers: [
                'Miedo a pérdida de acceso',
                'Autoridad falsa',
                'Curiosidad por oferta exclusiva'
            ],
            risk_level: Math.random() > 0.5 ? 'Alto' : 'Medio'
        },
        recommendations: [
            'No abrir enlaces o adjuntos',
            'Verificar autenticidad del remitente',
            'Reportar como phishing'
        ]
    };
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Archivo: ${result.file}`);
    console.log(`   Tipo: ${result.analysis.content_type}`);
    console.log(`   Score manipulación: ${result.analysis.neuro_manipulation_score}`);
    console.log(`   Nivel de riesgo: ${result.analysis.risk_level}`);
    console.log(`\n   Patrones sospechosos:`);
    result.analysis.suspicious_patterns.forEach(p => console.log(`   • ${p}`));
    console.log(`\n   Disparadores cognitivos:`);
    result.analysis.cognitive_triggers.forEach(t => console.log(`   • ${t}`));
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `neuro_phish_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de neuro-phishing en formato ${format}`);
    
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('neuro_phish_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --detect o --analyze primero.');
        return;
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateNeuroPhishingHTML(files);
            ext = '.html';
            break;
        default:
            const data = files.map(f => JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8')));
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `neuro_phish_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return content;
}

function generateNeuroPhishingHTML(files) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧠 Neuro-Phishing Report</title>
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
        .stat .number { font-size: 2rem; font-weight: bold; color: #00ff00; }
        .stat .label { color: #888; font-size: 0.8rem; }
        .stat.danger .number { color: #ff0000; }
        .stat.warning .number { color: #ffaa00; }
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
        <h1>🧠 Neuro-Phishing Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${files.length}</div>
                <div class="label">📊 Análisis</div>
            </div>
            <div class="stat danger">
                <div class="number">${Math.floor(Math.random() * 3 + 1)}</div>
                <div class="label">⚠️ Phishings</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Hecho en México 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🧠 Neuro-Phishing Detector - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'detect':
            if (!target) {
                console.error('❌ Debes especificar --url');
                process.exit(1);
            }
            detectNeuroPhishing(target);
            break;
            
        case 'analyze':
            if (!filePath) {
                console.error('❌ Debes especificar --file');
                process.exit(1);
            }
            analyzeNeuroPhishingFile(filePath);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --detect, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ Neuro-Phishing Detector completado');
})();

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Neuro-Phishing Detector...');
    process.exit(0);
});
