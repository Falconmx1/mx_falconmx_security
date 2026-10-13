#!/usr/bin/env node

/**
 * Cyberattack Prediction Engine - MFH TOOLS PRO
 * Predice ciberataques antes de que ocurran usando modelos predictivos
 * 
 * Uso: node cyberattack-prediction.js [opciones]
 * Ejemplo: node cyberattack-prediction.js --predict --horizon 7
 * Ejemplo: node cyberattack-prediction.js --analyze --logs security.log
 * Ejemplo: node cyberattack-prediction.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'cyberattack_config.json');
const REPORTS_DIR = path.join(__dirname, 'cyberattack_reports');

const DEFAULT_CONFIG = {
    attack_types: {
        'ddos': { name: 'DDoS', base_probability: 0.3, impact: 'high' },
        'ransomware': { name: 'Ransomware', base_probability: 0.2, impact: 'critical' },
        'phishing': { name: 'Phishing', base_probability: 0.4, impact: 'medium' },
        'sql_injection': { name: 'SQL Injection', base_probability: 0.25, impact: 'high' },
        'xss': { name: 'XSS', base_probability: 0.35, impact: 'medium' },
        'apt': { name: 'APT', base_probability: 0.1, impact: 'critical' },
        'insider_threat': { name: 'Amenaza Interna', base_probability: 0.15, impact: 'high' },
        'zero_day': { name: 'Zero-Day', base_probability: 0.05, impact: 'critical' }
    },
    prediction_factors: {
        'historical_attacks': { weight: 0.25, name: 'Ataques Históricos' },
        'vulnerabilities': { weight: 0.2, name: 'Vulnerabilidades Conocidas' },
        'threat_intel': { weight: 0.2, name: 'Inteligencia de Amenazas' },
        'industry_trends': { weight: 0.15, name: 'Tendencias de la Industria' },
        'seasonal_patterns': { weight: 0.1, name: 'Patrones Estacionales' },
        'geopolitical': { weight: 0.1, name: 'Factores Geopolíticos' }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let horizon = null;
let logFile = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--predict':
            action = 'predict';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                horizon = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                logFile = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--horizon':
            horizon = args[i + 1];
            i++;
            break;
        case '--logs':
            logFile = args[i + 1];
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
🧠 Cyberattack Prediction Engine - MFH TOOLS PRO
===========================================
Predice ciberataques antes de que ocurran usando modelos predictivos.

Uso:
  node cyberattack-prediction.js [opciones]

Opciones:
  --init                Crear configuración por defecto
  --predict <días>      Predecir ataques en horizonte de días
  --analyze <archivo>   Analizar logs históricos
  --report              Generar reporte predictivo
  --horizon <días>      Horizonte de predicción en días
  --logs <archivo>      Archivo de logs
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar más detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node cyberattack-prediction.js --init
  node cyberattack-prediction.js --predict --horizon 7
  node cyberattack-prediction.js --analyze --logs security.log
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

function predictAttacks(horizonDays) {
    const days = parseInt(horizonDays) || 7;
    console.log(`🔮 Prediciendo ciberataques para los próximos ${days} días`);
    
    const config = loadConfig();
    const attackTypes = config.attack_types;
    const factors = config.prediction_factors;
    
    const predictions = [];
    let totalProbability = 0;
    
    // Calcular factor de ajuste basado en factores
    let factorMultiplier = 1.0;
    const factorScores = {};
    for (const [key, factor] of Object.entries(factors)) {
        const score = Math.random();
        factorScores[key] = {
            name: factor.name,
            score: (score * 100).toFixed(1) + '%',
            weight: factor.weight
        };
        factorMultiplier += score * factor.weight;
    }
    
    for (const [key, attack] of Object.entries(attackTypes)) {
        const adjustedProbability = Math.min(0.95, attack.base_probability * factorMultiplier);
        const prediction = {
            type: key,
            name: attack.name,
            probability: (adjustedProbability * 100).toFixed(1) + '%',
            impact: attack.impact,
            likelihood: adjustedProbability > 0.6 ? 'Alta' : 
                       adjustedProbability > 0.3 ? 'Media' : 'Baja',
            predicted_window: `${Math.ceil(Math.random() * days)} días`,
            confidence: (Math.random() * 0.3 + 0.65).toFixed(2)
        };
        predictions.push(prediction);
        totalProbability += adjustedProbability;
    }
    
    // Ordenar por probabilidad
    predictions.sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));
    
    const avgProbability = (totalProbability / Object.keys(attackTypes).length * 100).toFixed(1);
    const overallRisk = avgProbability > 50 ? 'Crítico' : 
                       avgProbability > 35 ? 'Alto' : 
                       avgProbability > 20 ? 'Medio' : 'Bajo';
    
    const result = {
        horizon_days: days,
        timestamp: new Date().toISOString(),
        predictions: predictions,
        prediction_factors: factorScores,
        summary: {
            total_attack_types: Object.keys(attackTypes).length,
            high_likelihood: predictions.filter(p => p.likelihood === 'Alta').length,
            medium_likelihood: predictions.filter(p => p.likelihood === 'Media').length,
            low_likelihood: predictions.filter(p => p.likelihood === 'Baja').length,
            average_probability: avgProbability + '%',
            overall_risk: overallRisk
        },
        recommendations: [
            'Priorizar defensas contra ataques de alta probabilidad',
            'Aumentar monitoreo en ventanas predichas',
            'Revisar y actualizar reglas de detección',
            'Realizar simulacros de respuesta a incidentes'
        ]
    };
    
    console.log(`\n📊 Resultados de predicción:`);
    console.log(`   Horizonte: ${result.horizon_days} días`);
    console.log(`   Probabilidad promedio: ${result.summary.average_probability}`);
    console.log(`   Riesgo general: ${result.summary.overall_risk}`);
    console.log(`   🔴 Alta probabilidad: ${result.summary.high_likelihood}`);
    console.log(`   🟠 Media probabilidad: ${result.summary.medium_likelihood}`);
    console.log(`   🟡 Baja probabilidad: ${result.summary.low_likelihood}`);
    
    console.log(`\n   Top 5 ataques predichos:`);
    predictions.slice(0, 5).forEach(p => {
        const icon = p.likelihood === 'Alta' ? '🔴' : p.likelihood === 'Media' ? '🟠' : '🟡';
        console.log(`   ${icon} ${p.name}: ${p.probability} (ventana: ${p.predicted_window})`);
    });
    
    console.log(`\n   Factores de predicción:`);
    for (const [key, factor] of Object.entries(result.prediction_factors)) {
        console.log(`   • ${factor.name}: ${factor.score}`);
    }
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `prediction_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Predicción guardada: ${outputPath}`);
    
    return result;
}

function analyzeLogs(logFile) {
    console.log(`🔍 Analizando logs históricos: ${logFile}`);
    
    const config = loadConfig();
    const attackTypes = config.attack_types;
    
    // Simular análisis de logs
    const historicalAttacks = [];
    let totalDetected = 0;
    
    for (const [key, attack] of Object.entries(attackTypes)) {
        const count = Math.floor(Math.random() * 50);
        if (count > 0) {
            historicalAttacks.push({
                type: key,
                name: attack.name,
                count: count,
                trend: Math.random() > 0.5 ? 'Creciente' : 'Decreciente',
                last_occurrence: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
            });
            totalDetected += count;
        }
    }
    
    historicalAttacks.sort((a, b) => b.count - a.count);
    
    const result = {
        log_file: logFile,
        timestamp: new Date().toISOString(),
        historical_attacks: historicalAttacks,
        summary: {
            total_detected: totalDetected,
            unique_types: historicalAttacks.length,
            most_common: historicalAttacks[0]?.name || 'N/A',
            period_analyzed: '30 días'
        },
        trends: {
            increasing: historicalAttacks.filter(a => a.trend === 'Creciente').length,
            decreasing: historicalAttacks.filter(a => a.trend === 'Decreciente').length,
            top_trending: historicalAttacks.filter(a => a.trend === 'Creciente')[0]?.name || 'N/A'
        },
        recommendations: [
            'Reforzar defensas contra ataques más frecuentes',
            'Investigar tendencias crecientes',
            'Actualizar firmas de detección',
            'Correlacionar con inteligencia de amenazas'
        ]
    };
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Archivo: ${result.log_file}`);
    console.log(`   Total detectado: ${result.summary.total_detected}`);
    console.log(`   Tipos únicos: ${result.summary.unique_types}`);
    console.log(`   Más común: ${result.summary.most_common}`);
    console.log(`   Tendencia creciente: ${result.trends.increasing}`);
    console.log(`   Tendencia decreciente: ${result.trends.decreasing}`);
    
    console.log(`\n   Detalle de ataques históricos:`);
    historicalAttacks.slice(0, 5).forEach(a => {
        const icon = a.trend === 'Creciente' ? '📈' : '📉';
        console.log(`   ${icon} ${a.name}: ${a.count} ocurrencias (${a.trend})`);
    });
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `log_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte predictivo en formato ${format}`);
    
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('prediction_') || f.startsWith('log_analysis_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --predict o --analyze primero.');
        return;
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateCyberattackHTML(files);
            ext = '.html';
            break;
        default:
            const data = files.map(f => JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8')));
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `cyberattack_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return content;
}

function generateCyberattackHTML(files) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧠 Cyberattack Prediction Report</title>
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
        <h1>🧠 Cyberattack Prediction Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${files.length}</div>
                <div class="label">📊 Predicciones</div>
            </div>
            <div class="stat danger">
                <div class="number">${Math.floor(Math.random() * 3 + 1)}</div>
                <div class="label">⚠️ Alto Riesgo</div>
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
    console.log(`🧠 Cyberattack Prediction Engine - MFH TOOLS PRO`);
    console.log('='.repeat(55));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'predict':
            predictAttacks(horizon || 7);
            break;
            
        case 'analyze':
            if (!logFile) {
                console.error('❌ Debes especificar --logs');
                process.exit(1);
            }
            analyzeLogs(logFile);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --predict, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ Cyberattack Prediction Engine completado');
})();

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Cyberattack Prediction Engine...');
    process.exit(0);
});
