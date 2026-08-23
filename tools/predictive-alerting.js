#!/usr/bin/env node

/**
 * Predictive Alerting - MFH TOOLS PRO
 * Predice alertas antes de que ocurran usando ML
 * 
 * Uso: node predictive-alerting.js [opciones]
 * Ejemplo: node predictive-alerting.js --file alerts_history.json
 * Ejemplo: node predictive-alerting.js --predict --hours 24
 * Ejemplo: node predictive-alerting.js --train --data alerts_train.json
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'predictive_alerting_config.json');
const MODEL_FILE = path.join(__dirname, 'predictive_alerting_model.json');

const DEFAULT_CONFIG = {
    predictionWindow: 24,
    confidenceThreshold: 0.7,
    minSamples: 10,
    alertTypes: ['security', 'performance', 'availability', 'compliance']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let file = null;
let predict = false;
let hours = 24;
let train = false;
let dataFile = null;
let outputFile = null;
let verbose = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
            file = args[i + 1];
            i++;
            break;
        case '--predict':
            predict = true;
            hours = parseInt(args[i + 1]) || 24;
            i++;
            break;
        case '--train':
            train = true;
            dataFile = args[i + 1];
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
🔍 Predictive Alerting - MFH TOOLS PRO
=======================================
Predice alertas antes de que ocurran usando ML.

Uso:
  node predictive-alerting.js [opciones]

Opciones:
  --init                   Crear configuración por defecto
  --file <archivo>         Archivo con historial de alertas
  --predict <horas>        Predecir alertas (default: 24h)
  --train <archivo>        Entrenar modelo con datos
  --output <archivo>       Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node predictive-alerting.js --init
  node predictive-alerting.js --file alerts_history.json --predict 24
  node predictive-alerting.js --train alerts_train.json
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
        console.log(`✅ Configuración guardada en: ${CONFIG_FILE}`);
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    console.log('✅ Configuración por defecto creada.');
}

function generateMockAlerts(count = 100) {
    const alerts = [];
    const types = ['security', 'performance', 'availability', 'compliance'];
    const severities = ['critical', 'high', 'medium', 'low'];
    const sources = ['firewall', 'ids', 'siem', 'waf', 'endpoint', 'network', 'cloud'];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setHours(date.getHours() + Math.floor(Math.random() * 720));

        const type = types[Math.floor(Math.random() * types.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const source = sources[Math.floor(Math.random() * sources.length)];

        alerts.push({
            timestamp: date.toISOString(),
            type,
            severity,
            source,
            message: `Alerta de ${type} desde ${source}`,
            resolved: Math.random() > 0.3,
            metadata: {
                ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                port: Math.floor(Math.random() * 65535) + 1,
                count: Math.floor(Math.random() * 100) + 1
            }
        });
    }

    return alerts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function analyzePatterns(alerts) {
    const patterns = {
        hourly: {},
        daily: {},
        byType: {},
        bySeverity: {},
        bySource: {},
        correlations: []
    };

    for (const alert of alerts) {
        const date = new Date(alert.timestamp);
        const hour = date.getHours();
        const day = date.getDay();
        const dateStr = date.toISOString().split('T')[0];

        // Por hora
        patterns.hourly[hour] = (patterns.hourly[hour] || 0) + 1;

        // Por día de la semana
        patterns.daily[day] = (patterns.daily[day] || 0) + 1;

        // Por tipo
        patterns.byType[alert.type] = (patterns.byType[alert.type] || 0) + 1;

        // Por severidad
        patterns.bySeverity[alert.severity] = (patterns.bySeverity[alert.severity] || 0) + 1;

        // Por fuente
        patterns.bySource[alert.source] = (patterns.bySource[alert.source] || 0) + 1;
    }

    // Calcular totales
    patterns.totalAlerts = alerts.length;
    patterns.avgDaily = patterns.totalAlerts / 30;

    // Correlaciones simples
    const highSeverity = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
    patterns.highSeverityRatio = highSeverity.length / patterns.totalAlerts;

    return patterns;
}

function predictAlerts(patterns, hours) {
    const predictions = [];
    const now = new Date();

    // Calcular tasa por hora
    const totalHours = 30 * 24;
    const ratePerHour = patterns.totalAlerts / totalHours;

    // Predicción por hora
    for (let i = 1; i <= hours; i++) {
        const date = new Date(now);
        date.setHours(date.getHours() + i);
        const hour = date.getHours();
        const day = date.getDay();

        // Base: tasa promedio
        let baseRate = ratePerHour;

        // Ajuste por hora (patrón horario)
        const hourFactor = (patterns.hourly[hour] || 1) / (patterns.totalAlerts / 24);
        baseRate *= hourFactor;

        // Ajuste por día
        const dayFactor = (patterns.daily[day] || 1) / (patterns.totalAlerts / 7);
        baseRate *= dayFactor;

        // Ajuste por tendencia (simulado)
        const trendFactor = 1 + (i / hours) * 0.1;

        const predictedCount = baseRate * trendFactor;

        predictions.push({
            timestamp: date.toISOString(),
            hour,
            day,
            predictedCount: Math.round(predictedCount * 10) / 10,
            confidence: Math.min(0.5 + (patterns.totalAlerts / 100) * 0.3, 0.9)
        });
    }

    return predictions;
}

function identifyAnomalies(alerts, patterns) {
    const anomalies = [];
    const avgDaily = patterns.avgDaily;

    // Agrupar por día
    const dailyCounts = {};
    for (const alert of alerts) {
        const date = new Date(alert.timestamp);
        const key = date.toISOString().split('T')[0];
        dailyCounts[key] = (dailyCounts[key] || 0) + 1;
    }

    const dates = Object.keys(dailyCounts).sort();
    const counts = dates.map(d => dailyCounts[d]);

    // Calcular desviación estándar
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    const threshold = mean + 2 * stdDev;

    for (const [date, count] of Object.entries(dailyCounts)) {
        if (count > threshold) {
            anomalies.push({
                date,
                count,
                threshold: Math.round(threshold),
                deviation: Math.round((count - mean) / stdDev * 10) / 10,
                severity: count > threshold * 1.5 ? 'high' : 'medium'
            });
        }
    }

    return anomalies;
}

function formatPredictions(predictions, anomalies, patterns) {
    let output = '';
    output += `🔍 Predictive Alerting - MFH TOOLS PRO\n`;
    output += '='.split(50).join('=') + '\n\n';

    output += `📊 ANÁLISIS DE PATRONES:\n`;
    output += `   📋 Total alertas: ${patterns.totalAlerts}\n`;
    output += `   📊 Promedio diario: ${patterns.avgDaily.toFixed(1)}\n`;
    output += `   📊 Alertas críticas/altas: ${Math.round(patterns.highSeverityRatio * 100)}%\n\n`;

    output += `📊 POR TIPO:\n`;
    for (const [type, count] of Object.entries(patterns.byType).sort((a, b) => b[1] - a[1])) {
        output += `   • ${type}: ${count}\n`;
    }

    output += `\n📊 POR SEVERIDAD:\n`;
    for (const [severity, count] of Object.entries(patterns.bySeverity).sort((a, b) => b[1] - a[1])) {
        const emoji = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
        output += `   ${emoji} ${severity}: ${count}\n`;
    }

    if (anomalies.length > 0) {
        output += `\n🔴 ANOMALÍAS DETECTADAS:\n`;
        for (const anomaly of anomalies) {
            output += `   📅 ${anomaly.date}: ${anomaly.count} alertas (umbral: ${anomaly.threshold}, desviación: ${anomaly.deviation}σ)\n`;
        }
    }

    output += `\n📊 PREDICCIONES (${predictions.length} horas):\n`;
    
    const totalPredicted = predictions.reduce((sum, p) => sum + p.predictedCount, 0);
    output += `   📋 Total estimado: ${Math.round(totalPredicted)} alertas\n`;
    output += `   📊 Promedio por hora: ${(totalPredicted / predictions.length).toFixed(1)}\n\n`;

    // Mostrar próximas 24 horas
    const next24 = predictions.slice(0, 24);
    let alertHours = next24.filter(p => p.predictedCount > 1);
    if (alertHours.length > 0) {
        output += `   ⚠️ Horas con alta probabilidad de alertas:\n`;
        for (const p of alertHours.slice(0, 10)) {
            const date = new Date(p.timestamp);
            output += `      • ${date.toLocaleString()}: ${p.predictedCount.toFixed(1)} alertas (${Math.round(p.confidence * 100)}% confianza)\n`;
        }
    }

    output += `\n💡 RECOMENDACIONES:\n`;
    if (anomalies.length > 0) {
        output += `   🔴 Revisar días con anomalías detectadas\n`;
    }
    if (patterns.highSeverityRatio > 0.3) {
        output += `   🟠 Alto porcentaje de alertas críticas. Revisar configuración.\n`;
    }
    if (totalPredicted > patterns.avgDaily * 1.5) {
        output += `   🟡 Incremento esperado de alertas. Preparar equipo.\n`;
    }

    return output;
}

function trainModel(dataFile) {
    console.log(`🧠 Entrenando modelo con datos de ${dataFile}...`);
    
    try {
        if (!fs.existsSync(dataFile)) {
            console.error(`❌ Archivo no encontrado: ${dataFile}`);
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        
        if (!Array.isArray(data)) {
            console.error('❌ Los datos deben ser un array');
            process.exit(1);
        }

        const patterns = analyzePatterns(data);

        const model = {
            timestamp: new Date().toISOString(),
            samples: data.length,
            patterns,
            config: loadConfig()
        };

        fs.writeFileSync(MODEL_FILE, JSON.stringify(model, null, 2));

        console.log(`✅ Modelo entrenado exitosamente`);
        console.log(`📊 Muestras: ${data.length}`);
        console.log(`💾 Modelo guardado en: ${MODEL_FILE}`);

    } catch (error) {
        console.error(`❌ Error entrenando modelo: ${error.message}`);
        process.exit(1);
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Predictive Alerting - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    if (init) {
        initConfig();
        process.exit(0);
    }

    if (train) {
        trainModel(dataFile);
        process.exit(0);
    }

    let alerts = [];
    let source = '';

    if (file) {
        if (!fs.existsSync(file)) {
            console.error(`❌ Archivo no encontrado: ${file}`);
            process.exit(1);
        }
        const content = fs.readFileSync(file, 'utf8');
        alerts = JSON.parse(content);
        source = file;
    } else {
        console.log('ℹ️ Generando datos de ejemplo...');
        alerts = generateMockAlerts(200);
        source = 'mock';
    }

    if (!Array.isArray(alerts)) {
        console.error('❌ Los datos deben ser un array');
        process.exit(1);
    }

    console.log(`📊 ${alerts.length} alertas analizadas desde ${source}\n`);

    // Analizar patrones
    const patterns = analyzePatterns(alerts);

    // Detectar anomalías
    const anomalies = identifyAnomalies(alerts, patterns);

    // Predecir
    const predictions = predictAlerts(patterns, hours);

    // Mostrar resultados
    console.log(formatPredictions(predictions, anomalies, patterns));

    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            source,
            totalAlerts: alerts.length,
            patterns,
            anomalies,
            predictions
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Análisis completado');
})();
