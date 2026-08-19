#!/usr/bin/env node

/**
 * Log Anomaly Analyzer - MFH TOOLS PRO
 * Analiza logs y detecta comportamientos anómalos con ML
 * 
 * Uso: node log-anomaly-analyzer.js [opciones]
 * Ejemplo: node log-anomaly-analyzer.js --file auth.log
 * Ejemplo: node log-anomaly-analyzer.js --file auth.log --pattern "Failed password"
 * Ejemplo: node log-anomaly-analyzer.js --file auth.log --output report.json
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    windowSize: 100,
    anomalyThreshold: 2.5,
    maxLines: 10000
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let file = null;
let pattern = null;
let outputFile = null;
let verbose = false;
let threshold = CONFIG.anomalyThreshold;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            file = args[i + 1];
            i++;
            break;
        case '--pattern':
        case '-p':
            pattern = args[i + 1];
            i++;
            break;
        case '--output':
        case '-o':
            outputFile = args[i + 1];
            i++;
            break;
        case '--threshold':
        case '-t':
            threshold = parseFloat(args[i + 1]);
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Log Anomaly Analyzer - MFH TOOLS PRO
========================================
Analiza logs y detecta comportamientos anómalos con ML.

Uso:
  node log-anomaly-analyzer.js [opciones]

Opciones:
  --file, -f <archivo>     Archivo de log a analizar
  --pattern, -p <patrón>   Patrón de búsqueda (opcional)
  --output, -o <archivo>   Guardar resultados en JSON
  --threshold, -t <n>      Umbral de anomalía (default: 2.5)
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node log-anomaly-analyzer.js --file auth.log
  node log-anomaly-analyzer.js --file auth.log --pattern "Failed password"
  node log-anomaly-analyzer.js --file auth.log --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function parseLogFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        return lines.slice(0, CONFIG.maxLines);
    } catch (error) {
        throw new Error(`Error leyendo archivo: ${error.message}`);
    }
}

function extractLogFeatures(lines, pattern) {
    const features = [];
    const timestamps = [];
    const ips = {};
    const users = {};
    const events = {};
    
    // Patrones comunes para extraer IPs y usuarios
    const ipPattern = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
    const userPattern = /user\s+([a-zA-Z0-9_]+)/gi;
    
    for (const line of lines) {
        // Extraer IPs
        const ipsFound = line.match(ipPattern) || [];
        for (const ip of ipsFound) {
            ips[ip] = (ips[ip] || 0) + 1;
        }
        
        // Extraer usuarios
        const usersFound = line.match(userPattern) || [];
        for (const u of usersFound) {
            const username = u.replace(/user\s+/i, '').trim();
            if (username && !['root', 'admin', 'user'].includes(username.toLowerCase())) {
                users[username] = (users[username] || 0) + 1;
            }
        }
        
        // Buscar patrón específico
        if (pattern && line.includes(pattern)) {
            events[pattern] = (events[pattern] || 0) + 1;
        }
        
        // Extraer timestamp (si existe)
        const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/) || line.match(/\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/);
        if (dateMatch) {
            timestamps.push(dateMatch[0]);
        }
        
        // Características de la línea
        features.push({
            length: line.length,
            numWords: line.split(/\s+/).length,
            numIPs: (line.match(ipPattern) || []).length,
            hasError: line.toLowerCase().includes('error') || line.toLowerCase().includes('failed'),
            hasWarning: line.toLowerCase().includes('warning'),
            hasAuth: line.toLowerCase().includes('auth') || line.toLowerCase().includes('login'),
            timestamp: dateMatch ? dateMatch[0] : null
        });
    }
    
    return {
        features,
        ips,
        users,
        events,
        timestamps,
        totalLines: lines.length
    };
}

function detectAnomalies(features, threshold) {
    const anomalies = [];
    
    // Calcular estadísticas
    const lengths = features.map(f => f.length);
    const wordCounts = features.map(f => f.numWords);
    const ipCounts = features.map(f => f.numIPs);
    
    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = (arr) => {
        const m = mean(arr);
        return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length);
    };
    
    const lenMean = mean(lengths);
    const lenStd = stdDev(lengths);
    const wordMean = mean(wordCounts);
    const wordStd = stdDev(wordCounts);
    const ipMean = mean(ipCounts);
    const ipStd = stdDev(ipCounts);
    
    for (let i = 0; i < features.length; i++) {
        const f = features[i];
        let score = 0;
        let reasons = [];
        
        // Longitud anómala
        if (lenStd > 0) {
            const zScore = Math.abs((f.length - lenMean) / lenStd);
            if (zScore > threshold) {
                score += zScore;
                reasons.push(`longitud inusual (${f.length} caracteres, ${zScore.toFixed(2)}σ)`);
            }
        }
        
        // Número de palabras anómalo
        if (wordStd > 0) {
            const zScore = Math.abs((f.numWords - wordMean) / wordStd);
            if (zScore > threshold) {
                score += zScore;
                reasons.push(`palabras inusuales (${f.numWords}, ${zScore.toFixed(2)}σ)`);
            }
        }
        
        // IPs anómalas
        if (ipStd > 0) {
            const zScore = Math.abs((f.numIPs - ipMean) / ipStd);
            if (zScore > threshold) {
                score += zScore;
                reasons.push(`IPs inusuales (${f.numIPs}, ${zScore.toFixed(2)}σ)`);
            }
        }
        
        // Errores
        if (f.hasError) {
            score += 0.5;
            reasons.push('contiene errores');
        }
        
        if (score > 0) {
            anomalies.push({
                index: i,
                score,
                reasons,
                features: f
            });
        }
    }
    
    return anomalies;
}

function formatResults(lines, extracted, anomalies) {
    let output = '';
    output += `🔍 Log Anomaly Analyzer - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    output += `📊 RESUMEN:\n`;
    output += `   📋 Líneas analizadas: ${extracted.totalLines}\n`;
    output += `   🔴 Anomalías: ${anomalies.length}\n`;
    output += `   📊 Tasa: ${(anomalies.length / extracted.totalLines * 100).toFixed(1)}%\n\n`;
    
    // IPs detectadas
    const topIPs = Object.entries(extracted.ips)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (topIPs.length > 0) {
        output += `🌐 IPs DESTACADAS:\n`;
        for (const [ip, count] of topIPs) {
            const icon = count > 10 ? '🔴' : count > 5 ? '🟡' : '🟢';
            output += `   ${icon} ${ip}: ${count} veces\n`;
        }
        output += '\n';
    }
    
    // Usuarios detectados
    const topUsers = Object.entries(extracted.users)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (topUsers.length > 0) {
        output += `👤 USUARIOS DESTACADOS:\n`;
        for (const [user, count] of topUsers) {
            output += `   • ${user}: ${count} veces\n`;
        }
        output += '\n';
    }
    
    // Eventos
    if (Object.keys(extracted.events).length > 0) {
        output += `📋 EVENTOS:\n`;
        for (const [event, count] of Object.entries(extracted.events)) {
            output += `   • ${event}: ${count} veces\n`;
        }
        output += '\n';
    }
    
    // Anomalías
    if (anomalies.length > 0) {
        output += `🔴 ANOMALÍAS DETECTADAS:\n`;
        const topAnomalies = anomalies
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);
        
        for (const anomaly of topAnomalies) {
            const line = lines[anomaly.index] || 'N/A';
            const truncated = line.length > 100 ? line.substring(0, 100) + '...' : line;
            output += `   📍 Línea ${anomaly.index + 1}: ${truncated}\n`;
            output += `      📊 Score: ${anomaly.score.toFixed(2)}\n`;
            output += `      📝 Razones: ${anomaly.reasons.join(', ')}\n`;
        }
        
        if (topAnomalies.length < anomalies.length) {
            output += `   ... y ${anomalies.length - topAnomalies.length} anomalías más\n`;
        }
    } else {
        output += `✅ No se detectaron anomalías significativas\n`;
    }
    
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Log Anomaly Analyzer - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!file) {
        console.error('❌ Debes especificar un archivo con --file');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    if (!fs.existsSync(file)) {
        console.error(`❌ Archivo no encontrado: ${file}`);
        process.exit(1);
    }

    try {
        console.log(`📡 Analizando: ${file}`);
        const lines = parseLogFile(file);
        console.log(`📊 ${lines.length} líneas cargadas`);
        
        // Extraer características
        const extracted = extractLogFeatures(lines, pattern);
        
        // Detectar anomalías
        const anomalies = detectAnomalies(extracted.features, threshold);
        
        // Mostrar resultados
        console.log(formatResults(lines, extracted, anomalies));
        
        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                file,
                pattern: pattern || 'none',
                threshold,
                totalLines: extracted.totalLines,
                anomalies: anomalies.length,
                details: {
                    ips: extracted.ips,
                    users: extracted.users,
                    events: extracted.events,
                    anomalies: anomalies.slice(0, 100)
                }
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Análisis completado');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
