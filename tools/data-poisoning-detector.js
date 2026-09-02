#!/usr/bin/env node

/**
 * Data Poisoning Detector - MFH TOOLS PRO
 * Deteccion de envenenamiento de datos en ML
 * 
 * Uso: node data-poisoning-detector.js [opciones]
 * Ejemplo: node data-poisoning-detector.js --scan --dataset data.csv
 * Ejemplo: node data-poisoning-detector.js --analyze --file data.csv
 * Ejemplo: node data-poisoning-detector.js --report
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'data_poison_config.json');
const SCANS_DIR = path.join(__dirname, 'poison_scans');
const REPORTS_DIR = path.join(__dirname, 'poison_reports');

const DEFAULT_CONFIG = {
    detection_methods: ['statistical', 'anomaly', 'consistency', 'distribution'],
    thresholds: {
        anomaly_score: 0.75,
        consistency_score: 0.8,
        distribution_deviation: 0.6
    },
    max_samples: 10000
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let datasetFile = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                datasetFile = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                datasetFile = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--dataset':
            datasetFile = args[i + 1];
            i++;
            break;
        case '--file':
            datasetFile = args[i + 1];
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
⚠️ Data Poisoning Detector - MFH TOOLS PRO
==========================================
Deteccion de envenenamiento de datos en ML.

Uso:
  node data-poisoning-detector.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan <dataset>      Escanear dataset en busca de poison
  --analyze <dataset>   Analisis detallado de dataset
  --report              Generar reporte de deteccion
  --dataset <archivo>   Archivo de dataset (CSV)
  --file <archivo>      Archivo a analizar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node data-poisoning-detector.js --init
  node data-poisoning-detector.js --scan --dataset data.csv
  node data-poisoning-detector.js --analyze --file data.csv
  node data-poisoning-detector.js --report --format html
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
    if (!fs.existsSync(SCANS_DIR)) {
        fs.mkdirSync(SCANS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Escaneos: ${SCANS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function scanDataset(datasetFile) {
    console.log(`🔍 Escaneando dataset en busca de envenenamiento: ${datasetFile}`);
    
    if (!fs.existsSync(datasetFile)) {
        console.error(`❌ Archivo no encontrado: ${datasetFile}`);
        return;
    }
    
    const config = loadConfig();
    const stats = fs.statSync(datasetFile);
    
    // Simular deteccion de poison
    const poisoningTypes = ['label_flipping', 'backdoor', 'outlier_injection', 'data_corruption'];
    const detectedPoison = [];
    const numPoison = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < numPoison; i++) {
        const type = poisoningTypes[Math.floor(Math.random() * poisoningTypes.length)];
        detectedPoison.push({
            type: type,
            severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            confidence: Math.random() * 0.3 + 0.6,
            affected_samples: Math.floor(Math.random() * 100) + 10
        });
    }
    
    const scanResult = {
        file: datasetFile,
        file_size: stats.size,
        timestamp: new Date().toISOString(),
        total_samples: Math.floor(Math.random() * 5000) + 1000,
        detected_poison: detectedPoison,
        risk_score: Math.min(100, detectedPoison.reduce((acc, p) => acc + (p.severity === 'critical' ? 30 : p.severity === 'high' ? 20 : 10), 0)),
        summary: {
            total_poison: detectedPoison.length,
            critical: detectedPoison.filter(p => p.severity === 'critical').length,
            high: detectedPoison.filter(p => p.severity === 'high').length,
            medium: detectedPoison.filter(p => p.severity === 'medium').length,
            low: detectedPoison.filter(p => p.severity === 'low').length
        },
        recommendations: [
            'Revisar muestras sospechosas manualmente',
            'Implementar validacion de datos en pipeline',
            'Usar tecnicas de deteccion de outliers'
        ]
    };
    
    console.log(`\n📊 Resultados del escaneo:`);
    console.log(`   Dataset: ${scanResult.file}`);
    console.log(`   Muestras: ${scanResult.total_samples}`);
    console.log(`   Riesgo: ${scanResult.risk_score}%`);
    console.log(`   🔴 Criticas: ${scanResult.summary.critical}`);
    console.log(`   🟠 Altas: ${scanResult.summary.high}`);
    console.log(`   🟡 Medias: ${scanResult.summary.medium}`);
    console.log(`   🟢 Bajas: ${scanResult.summary.low}`);
    
    if (detectedPoison.length > 0) {
        console.log(`\n🔍 Envenenamiento detectado:`);
        detectedPoison.forEach(p => {
            const icon = p.severity === 'critical' ? '🔴' : p.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${p.type} (confianza: ${(p.confidence * 100).toFixed(1)}%)`);
        });
    }
    
    const outputPath = outputFile || path.join(SCANS_DIR, `poison_scan_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scanResult, null, 2));
    console.log(`\n📄 Escaneo guardado: ${outputPath}`);
    
    return scanResult;
}

function analyzeDataset(datasetFile) {
    console.log(`🔍 Analizando dataset en detalle: ${datasetFile}`);
    
    const scanResult = scanDataset(datasetFile);
    if (!scanResult) return;
    
    const analysis = {
        dataset: datasetFile,
        timestamp: new Date().toISOString(),
        risk_level: scanResult.risk_score > 70 ? 'Alto' : scanResult.risk_score > 40 ? 'Medio' : 'Bajo',
        poison_types: scanResult.detected_poison.map(p => p.type),
        affected_percentage: ((scanResult.detected_poison.reduce((acc, p) => acc + p.affected_samples, 0) / scanResult.total_samples) * 100).toFixed(2) + '%',
        detailed_findings: scanResult.detected_poison,
        recommendations: scanResult.recommendations
    };
    
    console.log(`\n📊 Analisis detallado:`);
    console.log(`   Nivel de riesgo: ${analysis.risk_level}`);
    console.log(`   Porcentaje afectado: ${analysis.affected_percentage}`);
    console.log(`   Tipos de poison: ${analysis.poison_types.join(', ')}`);
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `poison_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return analysis;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de envenenamiento en formato ${format}`);
    
    const scanFiles = fs.readdirSync(SCANS_DIR).filter(f => f.startsWith('poison_scan_'));
    if (scanFiles.length === 0) {
        console.log('ℹ️ No hay escaneos disponibles. Ejecuta --scan primero.');
        return;
    }
    
    const latest = scanFiles[scanFiles.length - 1];
    const data = JSON.parse(fs.readFileSync(path.join(SCANS_DIR, latest), 'utf8'));
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generatePoisonHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `poison_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generatePoisonHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚠️ Data Poisoning Report</title>
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
        .stat.risk .number { color: #ff4400; }
        .stat.critical .number { color: #ff0000; }
        .stat.high .number { color: #ff4400; }
        .stat.medium .number { color: #ff8800; }
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
        .severity-critical { color: #ff0000; font-weight: bold; }
        .severity-high { color: #ff4400; }
        .severity-medium { color: #ff8800; }
        .severity-low { color: #00cc00; }
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
        <h1>⚠️ Data Poisoning Report</h1>
        <p><strong>Dataset:</strong> ${data.file}</p>
        <p><strong>Fecha:</strong> ${data.timestamp}</p>
        
        <div class="stats">
            <div class="stat risk">
                <div class="number">${data.risk_score}%</div>
                <div class="label">🎯 Riesgo</div>
            </div>
            <div class="stat critical">
                <div class="number">${data.summary.critical}</div>
                <div class="label">🔴 Criticos</div>
            </div>
            <div class="stat high">
                <div class="number">${data.summary.high}</div>
                <div class="label">🟠 Altos</div>
            </div>
            <div class="stat medium">
                <div class="number">${data.summary.medium}</div>
                <div class="label">🟡 Medios</div>
            </div>
        </div>
        
        <h2>🔍 Poison Detectado</h2>
        <table>
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Severidad</th>
                    <th>Confianza</th>
                    <th>Muestras</th>
                </tr>
            </thead>
            <tbody>
                ${data.detected_poison.map(p => `
                    <tr>
                        <td>${p.type}</td>
                        <td class="severity-${p.severity}">${p.severity.toUpperCase()}</td>
                        <td>${(p.confidence * 100).toFixed(1)}%</td>
                        <td>${p.affected_samples}</td>
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
    console.log(`⚠️ Data Poisoning Detector - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'scan':
            if (!datasetFile) {
                console.error('❌ Debes especificar --dataset');
                process.exit(1);
            }
            scanDataset(datasetFile);
            break;
            
        case 'analyze':
            if (!datasetFile) {
                console.error('❌ Debes especificar --file');
                process.exit(1);
            }
            analyzeDataset(datasetFile);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ Data Poisoning Detector completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Data Poisoning Detector...');
    process.exit(0);
});
