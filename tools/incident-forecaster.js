#!/usr/bin/env node

/**
 * Security Incident Forecaster - MFH TOOLS PRO
 * Predice incidentes de seguridad usando series temporales
 * 
 * Uso: node incident-forecaster.js [opciones]
 * Ejemplo: node incident-forecaster.js --file incidents.json
 * Ejemplo: node incident-forecaster.js --file incidents.json --forecast 30
 * Ejemplo: node incident-forecaster.js --file incidents.json --output report.json
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    forecastDays: 30,
    minSamples: 7
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let file = null;
let forecastDays = CONFIG.forecastDays;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            file = args[i + 1];
            i++;
            break;
        case '--forecast':
        case '-fc':
            forecastDays = parseInt(args[i + 1]);
            i++;
            break;
        case '--output':
        case '-o':
            outputFile = args[i + 1];
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Security Incident Forecaster - MFH TOOLS PRO
================================================
Predice incidentes de seguridad usando series temporales.

Uso:
  node incident-forecaster.js [opciones]

Opciones:
  --file, -f <archivo>     Archivo JSON con incidentes históricos
  --forecast, -fc <días>   Días a pronosticar (default: 30)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node incident-forecaster.js --file incidents.json
  node incident-forecaster.js --file incidents.json --forecast 30
  node incident-forecaster.js --file incidents.json --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function generateMockIncidents() {
    const types = ['Malware', 'Phishing', 'DDoS', 'Data Breach', 'Ransomware', 'Insider Threat', 'Zero-Day', 'Configuration Error'];
    const severities = ['Critical', 'High', 'Medium', 'Low'];
    
    const incidents = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    // Crear patrón estacional (más incidentes en ciertos meses)
    for (let i = 0; i < 365; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Patrón estacional: más incidentes en fin de año y días específicos
        const month = date.getMonth();
        const day = date.getDate();
        let baseRate = 0.3;
        
        if (month === 11 || month === 0 || month === 1) baseRate += 0.2; // Fin de año
        if (day === 15 || day === 30) baseRate += 0.1; // Quincena
        if (date.getDay() === 5 || date.getDay() === 6) baseRate += 0.1; // Fin de semana
        
        const count = Math.floor(Math.random() * (baseRate * 3)) + (Math.random() > 0.5 ? 1 : 0);
        
        for (let j = 0; j < count; j++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const severity = severities[Math.floor(Math.random() * severities.length)];
            
            incidents.push({
                date: date.toISOString().split('T')[0],
                type,
                severity,
                description: `Incidente de ${type}`,
                impact: Math.floor(Math.random() * 100) + 1,
                resolved: Math.random() > 0.3
            });
        }
    }
    
    return incidents.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function analyzeTimeSeries(incidents) {
    const series = {};
    const types = {};
    const severities = {};
    
    for (const incident of incidents) {
        const date = incident.date;
        series[date] = (series[date] || 0) + 1;
        types[incident.type] = (types[incident.type] || 0) + 1;
        severities[incident.severity] = (severities[incident.severity] || 0) + 1;
    }
    
    // Convertir a array ordenado
    const dates = Object.keys(series).sort();
    const values = dates.map(d => series[d]);
    
    // Calcular estadísticas
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Calcular tendencia (regresión lineal simple)
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Descomposición estacional (promedio por día de la semana)
    const dayOfWeek = {};
    for (const incident of incidents) {
        const date = new Date(incident.date);
        const dow = date.getDay();
        dayOfWeek[dow] = (dayOfWeek[dow] || 0) + 1;
    }
    
    const avgPerDay = total / 7;
    const seasonalFactors = {};
    for (let i = 0; i < 7; i++) {
        const count = dayOfWeek[i] || 0;
        seasonalFactors[i] = count / (avgPerDay || 1);
    }
    
    return {
        series,
        dates,
        values,
        total,
        avg,
        max,
        min,
        slope,
        intercept,
        seasonalFactors,
        types,
        severities,
        count: incidents.length
    };
}

function forecastIncidents(analysis, days) {
    const forecast = {
        days,
        predictions: [],
        total: 0,
        byDay: {},
        byType: {},
        bySeverity: {},
        confidence: 'MEDIUM'
    };
    
    const lastDate = new Date(analysis.dates[analysis.dates.length - 1]);
    
    for (let i = 1; i <= days; i++) {
        const date = new Date(lastDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        
        // Predicción base con tendencia
        const x = analysis.dates.length + i - 1;
        const trendPrediction = analysis.slope * x + analysis.intercept;
        
        // Ajuste estacional
        const seasonalFactor = analysis.seasonalFactors[dayOfWeek] || 1;
        const prediction = Math.max(0, trendPrediction * seasonalFactor);
        
        const rounded = Math.round(prediction);
        forecast.predictions.push({
            date: dateStr,
            dayOfWeek,
            predicted: rounded,
            trend: trendPrediction,
            seasonal: seasonalFactor
        });
        
        forecast.byDay[dateStr] = rounded;
        forecast.total += rounded;
    }
    
    // Distribuir por tipo según proporciones históricas
    const totalTypes = Object.values(analysis.types).reduce((a, b) => a + b, 0);
    for (const [type, count] of Object.entries(analysis.types)) {
        const ratio = count / totalTypes;
        forecast.byType[type] = Math.round(ratio * forecast.total);
    }
    
    // Distribuir por severidad según proporciones históricas
    const totalSeverities = Object.values(analysis.severities).reduce((a, b) => a + b, 0);
    for (const [severity, count] of Object.entries(analysis.severities)) {
        const ratio = count / totalSeverities;
        forecast.bySeverity[severity] = Math.round(ratio * forecast.total);
    }
    
    // Confianza basada en datos históricos
    if (analysis.count > 100) forecast.confidence = 'HIGH';
    else if (analysis.count > 30) forecast.confidence = 'MEDIUM';
    else forecast.confidence = 'LOW';
    
    return forecast;
}

function formatResults(analysis, forecast) {
    let output = '';
    output += `🔍 Security Incident Forecaster - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    output += `📊 ANÁLISIS HISTÓRICO:\n`;
    output += `   📋 Total incidentes: ${analysis.count}\n`;
    output += `   📊 Promedio diario: ${analysis.avg.toFixed(2)}\n`;
    output += `   📊 Máximo diario: ${analysis.max}\n`;
    output += `   📊 Mínimo diario: ${analysis.min}\n`;
    output += `   📊 Tendencia: ${analysis.slope > 0 ? '⬆️ Creciente' : '⬇️ Decreciente'}\n\n`;
    
    output += `📊 POR TIPO:\n`;
    const sortedTypes = Object.entries(analysis.types).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes.slice(0, 5)) {
        output += `   • ${type}: ${count}\n`;
    }
    
    output += `\n📊 POR SEVERIDAD:\n`;
    for (const [severity, count] of Object.entries(analysis.severities)) {
        const emoji = severity === 'Critical' ? '🔴' : severity === 'High' ? '🟠' : severity === 'Medium' ? '🟡' : '🟢';
        output += `   ${emoji} ${severity}: ${count}\n`;
    }
    
    output += `\n📊 PRONÓSTICO (${forecast.days} días):\n`;
    output += `   📋 Estimación total: ${forecast.total}\n`;
    output += `   📊 Promedio diario: ${(forecast.total / forecast.days).toFixed(2)}\n`;
    output += `   📊 Confianza: ${forecast.confidence}\n\n`;
    
    output += `   📋 DETALLE POR DÍA:\n`;
    const lastDays = forecast.predictions.slice(-7);
    for (const pred of lastDays) {
        output += `      • ${pred.date}: ${pred.predicted} incidentes (factor estacional: ${pred.seasonal.toFixed(2)})\n`;
    }
    if (forecast.predictions.length > 7) {
        output += `      ... y ${forecast.predictions.length - 7} días más\n`;
    }
    
    output += `\n   📋 DESGLOSE POR TIPO:\n`;
    const sortedPredTypes = Object.entries(forecast.byType).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedPredTypes.slice(0, 3)) {
        output += `      • ${type}: ${count}\n`;
    }
    
    output += `\n   📋 DESGLOSE POR SEVERIDAD:\n`;
    for (const [severity, count] of Object.entries(forecast.bySeverity)) {
        const emoji = severity === 'Critical' ? '🔴' : severity === 'High' ? '🟠' : severity === 'Medium' ? '🟡' : '🟢';
        output += `      ${emoji} ${severity}: ${count}\n`;
    }
    
    output += `\n💡 RECOMENDACIONES:\n`;
    const dailyAvg = forecast.total / forecast.days;
    if (dailyAvg > analysis.avg * 1.5) {
        output += `   🔴 Aumento significativo esperado (${(dailyAvg / analysis.avg * 100).toFixed(0)}% del promedio)\n`;
        output += `   • Reforzar medidas de seguridad\n`;
        output += `   • Aumentar personal de monitoreo\n`;
        output += `   • Revisar planes de respuesta\n`;
    } else if (dailyAvg > analysis.avg) {
        output += `   🟡 Aumento moderado esperado (${(dailyAvg / analysis.avg * 100).toFixed(0)}% del promedio)\n`;
        output += `   • Mantener monitoreo reforzado\n`;
        output += `   • Revisar protocolos de seguridad\n`;
    } else {
        output += `   🟢 Nivel normal o decreciente esperado\n`;
        output += `   • Mantener monitoreo estándar\n`;
        output += `   • Continuar con mejoras continuas\n`;
    }
    
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Security Incident Forecaster - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    try {
        let incidents = [];
        
        if (file) {
            if (!fs.existsSync(file)) {
                console.error(`❌ Archivo no encontrado: ${file}`);
                process.exit(1);
            }
            const content = fs.readFileSync(file, 'utf8');
            incidents = JSON.parse(content);
            console.log(`📋 Cargados ${incidents.length} incidentes desde ${file}`);
        } else {
            console.log('ℹ️ Generando datos de ejemplo...');
            incidents = generateMockIncidents();
            console.log(`📋 Generados ${incidents.length} incidentes de ejemplo`);
        }
        
        // Analizar series temporales
        const analysis = analyzeTimeSeries(incidents);
        
        // Pronosticar
        const forecast = forecastIncidents(analysis, forecastDays);
        
        // Mostrar resultados
        console.log(formatResults(analysis, forecast));
        
        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                totalIncidents: incidents.length,
                analysis,
                forecast
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Pronóstico completado');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
