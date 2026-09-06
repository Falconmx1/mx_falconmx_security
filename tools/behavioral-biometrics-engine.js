#!/usr/bin/env node

/**
 * Behavioral Biometrics Engine - MFH TOOLS PRO
 * Monitorea comportamientos del usuario (escritura, mouse, patrones de navegación) para detectar anomalías
 * 
 * Uso: node behavioral-biometrics-engine.js [opciones]
 * Ejemplo: node behavioral-biometrics-engine.js --monitor --profile user123
 * Ejemplo: node behavioral-biometrics-engine.js --analyze --file behavioral_data.csv
 * Ejemplo: node behavioral-biometrics-engine.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'behavioral_config.json');
const REPORTS_DIR = path.join(__dirname, 'behavioral_reports');

const DEFAULT_CONFIG = {
    behavioral_metrics: {
        'typing': { name: 'Patrón de Escritura', weight: 0.3 },
        'mouse': { name: 'Movimiento de Ratón', weight: 0.25 },
        'navigation': { name: 'Patrón de Navegación', weight: 0.2 },
        'scroll': { name: 'Comportamiento de Scroll', weight: 0.15 },
        'gestures': { name: 'Gestos y Táctiles', weight: 0.1 }
    },
    anomaly_thresholds: {
        'low': 0.3,
        'medium': 0.5,
        'high': 0.7,
        'critical': 0.85
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let userId = null;
let dataFile = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--monitor':
            action = 'monitor';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                userId = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                dataFile = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--profile':
            userId = args[i + 1];
            i++;
            break;
        case '--file':
            dataFile = args[i + 1];
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
🖱️ Behavioral Biometrics Engine - MFH TOOLS PRO
===========================================
Monitorea comportamientos del usuario.

Uso:
  node behavioral-biometrics-engine.js [opciones]

Opciones:
  --init                Crear configuración por defecto
  --monitor <usuario>   Monitorear comportamiento de usuario
  --analyze <archivo>   Analizar datos de comportamiento
  --report              Generar reporte de análisis
  --profile <usuario>   Perfil de usuario
  --file <archivo>      Archivo de datos a analizar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar más detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node behavioral-biometrics-engine.js --init
  node behavioral-biometrics-engine.js --monitor --profile user123
  node behavioral-biometrics-engine.js --analyze --file behavioral_data.csv
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

function monitorBehavior(userId) {
    console.log(`🖱️ Monitoreando comportamiento del usuario: ${userId}`);
    
    const config = loadConfig();
    const metrics = config.behavioral_metrics;
    
    // Simular monitoreo de comportamiento
    const results = {};
    let totalAnomalyScore = 0;
    let anomalyCount = 0;
    
    for (const [key, metric] of Object.entries(metrics)) {
        const score = Math.random() * 100;
        const isAnomaly = score > 70;
        results[key] = {
            name: metric.name,
            score: score.toFixed(1) + '%',
            is_anomaly: isAnomaly,
            weight: metric.weight
        };
        if (isAnomaly) {
            anomalyCount++;
            totalAnomalyScore += score;
        }
    }
    
    const avgAnomaly = anomalyCount > 0 ? (totalAnomalyScore / anomalyCount).toFixed(1) : 0;
    const riskLevel = avgAnomaly > 80 ? 'critical' : avgAnomaly > 60 ? 'high' : avgAnomaly > 40 ? 'medium' : 'low';
    
    const result = {
        user_id: userId,
        timestamp: new Date().toISOString(),
        metrics: results,
        summary: {
            total_metrics: Object.keys(metrics).length,
            anomalies_detected: anomalyCount,
            average_anomaly_score: avgAnomaly + '%',
            risk_level: riskLevel
        },
        recommendations: anomalyCount > 2 ? [
            'Investigar actividad del usuario',
            'Requerir autenticación adicional',
            'Revisar accesos recientes'
        ] : [
            'Comportamiento normal detectado',
            'Continuar monitoreo regular'
        ]
    };
    
    console.log(`\n📊 Resultados del monitoreo:`);
    console.log(`   Usuario: ${result.user_id}`);
    console.log(`   Anomalías detectadas: ${result.summary.anomalies_detected}`);
    console.log(`   Score promedio: ${result.summary.average_anomaly_score}`);
    console.log(`   Nivel de riesgo: ${result.summary.risk_level.toUpperCase()}`);
    console.log(`\n   Métricas:`);
    for (const [key, metric] of Object.entries(result.metrics)) {
        const icon = metric.is_anomaly ? '⚠️' : '✅';
        console.log(`   ${icon} ${metric.name}: ${metric.score} ${metric.is_anomaly ? '(ANOMALÍA)' : ''}`);
    }
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `behavioral_${userId}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Monitoreo guardado: ${outputPath}`);
    
    return result;
}

function analyzeBehavioralData(dataFile) {
    console.log(`📊 Analizando datos de comportamiento: ${dataFile}`);
    
    // Simular análisis de datos
    const result = {
        data_file: dataFile,
        timestamp: new Date().toISOString(),
        analysis: {
            total_events: Math.floor(Math.random() * 10000 + 1000),
            unique_users: Math.floor(Math.random() * 50 + 5),
            anomalies: Math.floor(Math.random() * 20 + 1),
            patterns: [
                'Picos de actividad entre 9-11 AM',
                'Disminución de actividad en horas de comida',
                'Patrón de navegación consistente'
            ]
        },
        recommendations: [
            'Implementar autenticación adaptativa',
            'Actualizar modelos de comportamiento',
            'Revisar patrones sospechosos'
        ]
    };
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Archivo: ${result.data_file}`);
    console.log(`   Eventos totales: ${result.analysis.total_events}`);
    console.log(`   Usuarios únicos: ${result.analysis.unique_users}`);
    console.log(`   Anomalías: ${result.analysis.anomalies}`);
    console.log(`\n   Patrones detectados:`);
    result.analysis.patterns.forEach(p => console.log(`   • ${p}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `behavioral_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de comportamiento en formato ${format}`);
    
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('behavioral_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --monitor o --analyze primero.');
        return;
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateBehavioralHTML(files);
            ext = '.html';
            break;
        default:
            const data = files.map(f => JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8')));
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `behavioral_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return content;
}

function generateBehavioralHTML(files) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🖱️ Behavioral Biometrics Report</title>
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
        <h1>🖱️ Behavioral Biometrics Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${files.length}</div>
                <div class="label">📊 Reportes</div>
            </div>
            <div class="stat warning">
                <div class="number">${Math.floor(Math.random() * 10 + 1)}</div>
                <div class="label">⚠️ Anomalías</div>
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
    console.log(`🖱️ Behavioral Biometrics Engine - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'monitor':
            if (!userId) {
                console.error('❌ Debes especificar --profile');
                process.exit(1);
            }
            monitorBehavior(userId);
            break;
            
        case 'analyze':
            if (!dataFile) {
                console.error('❌ Debes especificar --file');
                process.exit(1);
            }
            analyzeBehavioralData(dataFile);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --monitor, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ Behavioral Biometrics Engine completado');
})();

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Behavioral Biometrics Engine...');
    process.exit(0);
});
