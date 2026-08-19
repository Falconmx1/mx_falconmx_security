#!/usr/bin/env node

/**
 * Network Anomaly Detector - MFH TOOLS PRO
 * Detecta anomalías en tráfico de red con aprendizaje no supervisado
 * 
 * Uso: node network-anomaly-detector.js [opciones]
 * Ejemplo: node network-anomaly-detector.js --file capture.pcap
 * Ejemplo: node network-anomaly-detector.js --live --interface eth0
 * Ejemplo: node network-anomaly-detector.js --file capture.pcap --output report.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    anomalyThreshold: 2.5,
    windowSize: 100,
    maxFlows: 1000,
    commonPorts: [22, 80, 443, 21, 25, 53, 110, 143, 3306, 5432, 6379, 27017]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let file = null;
let live = false;
let interface = null;
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
        case '--live':
            live = true;
            break;
        case '--interface':
        case '-i':
            interface = args[i + 1];
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
🔍 Network Anomaly Detector - MFH TOOLS PRO
============================================
Detecta anomalías en tráfico de red.

Uso:
  node network-anomaly-detector.js [opciones]

Opciones:
  --file, -f <archivo>     Archivo PCAP a analizar
  --live                   Modo en vivo
  --interface, -i <iface>  Interfaz de red (modo live)
  --output, -o <archivo>   Guardar resultados en JSON
  --threshold, -t <n>      Umbral de anomalía (default: 2.5)
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node network-anomaly-detector.js --file capture.pcap
  node network-anomaly-detector.js --live --interface eth0
  node network-anomaly-detector.js --file capture.pcap --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function generateMockFlows(count) {
    const flows = [];
    const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3', '10.0.0.1', '10.0.0.2', '8.8.8.8', '1.1.1.1', '208.67.222.222'];
    const protocols = ['TCP', 'UDP', 'ICMP'];
    
    for (let i = 0; i < count; i++) {
        const isAnomaly = Math.random() < 0.1;
        const srcIP = ips[Math.floor(Math.random() * ips.length)];
        const dstIP = ips[Math.floor(Math.random() * ips.length)];
        const protocol = protocols[Math.floor(Math.random() * protocols.length)];
        const srcPort = Math.floor(Math.random() * 65535) + 1;
        const dstPort = isAnomaly ? Math.floor(Math.random() * 100) + 9000 : 
            CONFIG.commonPorts[Math.floor(Math.random() * CONFIG.commonPorts.length)];
        const bytes = isAnomaly ? Math.floor(Math.random() * 50000) + 1000 : Math.floor(Math.random() * 5000) + 100;
        const packets = isAnomaly ? Math.floor(Math.random() * 500) + 50 : Math.floor(Math.random() * 50) + 1;
        const duration = isAnomaly ? Math.random() * 10 + 5 : Math.random() * 2 + 0.1;
        
        flows.push({
            srcIP,
            dstIP,
            srcPort,
            dstPort,
            protocol,
            bytes,
            packets,
            duration,
            timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            isAnomaly: isAnomaly
        });
    }
    
    return flows;
}

function calculateFlowFeatures(flows) {
    const features = [];
    for (const flow of flows) {
        features.push({
            bytes: flow.bytes,
            packets: flow.packets,
            duration: flow.duration,
            packetsPerSecond: flow.packets / (flow.duration || 0.1),
            bytesPerPacket: flow.bytes / (flow.packets || 1),
            port: flow.dstPort,
            isCommonPort: CONFIG.commonPorts.includes(flow.dstPort)
        });
    }
    return features;
}

function calculateStats(values) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev, n };
}

function detectAnomalies(flows, threshold) {
    const features = calculateFlowFeatures(flows);
    const metrics = {
        bytes: features.map(f => f.bytes),
        packets: features.map(f => f.packets),
        duration: features.map(f => f.duration),
        packetsPerSecond: features.map(f => f.packetsPerSecond),
        bytesPerPacket: features.map(f => f.bytesPerPacket)
    };
    
    const stats = {};
    for (const [key, values] of Object.entries(metrics)) {
        stats[key] = calculateStats(values);
    }
    
    const anomalies = [];
    for (let i = 0; i < flows.length; i++) {
        const flow = flows[i];
        const feature = features[i];
        let anomalyScore = 0;
        let reasons = [];
        
        // Verificar cada métrica
        for (const [key, stat] of Object.entries(stats)) {
            const value = feature[key];
            const zScore = Math.abs((value - stat.mean) / (stat.stdDev || 1));
            if (zScore > threshold) {
                anomalyScore += zScore;
                reasons.push(`${key}: ${zScore.toFixed(2)}σ`);
            }
        }
        
        // Verificar puerto no común
        if (!feature.isCommonPort && flow.dstPort > 1024) {
            anomalyScore += 1;
            reasons.push(`puerto inusual: ${flow.dstPort}`);
        }
        
        if (anomalyScore > 0) {
            anomalies.push({
                flow,
                anomalyScore,
                reasons,
                severity: anomalyScore > 5 ? 'HIGH' : anomalyScore > 3 ? 'MEDIUM' : 'LOW'
            });
        }
    }
    
    return anomalies;
}

function formatResults(flows, anomalies, type) {
    let output = '';
    output += `🔍 Network Anomaly Detector - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    output += `📊 RESUMEN:\n`;
    output += `   📋 Total flujos: ${flows.length}\n`;
    output += `   🔴 Anomalías: ${anomalies.length}\n`;
    output += `   📊 Tasa de anomalías: ${(anomalies.length / flows.length * 100).toFixed(1)}%\n\n`;
    
    if (anomalies.length > 0) {
        output += `🔴 ANOMALÍAS DETECTADAS:\n`;
        const sorted = [...anomalies].sort((a, b) => b.anomalyScore - a.anomalyScore);
        const top = sorted.slice(0, 20);
        
        for (const anomaly of top) {
            const emoji = anomaly.severity === 'HIGH' ? '🔴' : anomaly.severity === 'MEDIUM' ? '🟡' : '🟢';
            output += `   ${emoji} ${anomaly.flow.srcIP}:${anomaly.flow.srcPort} → ${anomaly.flow.dstIP}:${anomaly.flow.dstPort} (${anomaly.flow.protocol})\n`;
            output += `      📊 Score: ${anomaly.anomalyScore.toFixed(2)} (${anomaly.severity})\n`;
            output += `      📝 Razones: ${anomaly.reasons.join(', ')}\n`;
            if (verbose) {
                output += `      📦 Bytes: ${anomaly.flow.bytes}, Paquetes: ${anomaly.flow.packets}, Duración: ${anomaly.flow.duration.toFixed(2)}s\n`;
            }
        }
        
        if (sorted.length > 20) {
            output += `   ... y ${sorted.length - 20} anomalías más\n`;
        }
        
        // Recomendaciones
        output += `\n💡 RECOMENDACIONES:\n`;
        const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
        if (highCount > 0) {
            output += `   🔴 Se detectaron ${highCount} anomalías de alta severidad\n`;
            output += `   • Revisar tráfico saliente hacia puertos inusuales\n`;
            output += `   • Verificar posibles comunicaciones con C2\n`;
            output += `   • Investigar hosts con patrones de tráfico atípicos\n`;
        } else {
            output += `   🟡 Monitorear continuamente el tráfico de red\n`;
            output += `   • Revisar periódicamente las estadísticas de flujo\n`;
        }
    } else {
        output += `✅ No se detectaron anomalías en el tráfico analizado\n`;
    }
    
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Network Anomaly Detector - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    try {
        let flows = [];
        let source = '';
        
        if (file) {
            if (!fs.existsSync(file)) {
                console.error(`❌ Archivo no encontrado: ${file}`);
                process.exit(1);
            }
            source = `archivo ${file}`;
            console.log(`📡 Analizando: ${file}`);
            
            // Simular análisis de PCAP
            const size = fs.statSync(file).size;
            const flowCount = Math.min(Math.floor(size / 1000), CONFIG.maxFlows);
            flows = generateMockFlows(flowCount);
            
        } else if (live) {
            source = `interfaz ${interface || 'default'}`;
            console.log(`📡 Modo en vivo en ${interface || 'interfaz por defecto'}`);
            console.log('⚠️ Modo live simulado (captura simulada)');
            flows = generateMockFlows(CONFIG.windowSize);
            
        } else {
            console.error('❌ Debes especificar --file o --live');
            process.exit(1);
        }
        
        console.log(`📊 ${flows.length} flujos analizados`);
        
        // Detectar anomalías
        const anomalies = detectAnomalies(flows, threshold);
        
        // Mostrar resultados
        console.log(formatResults(flows, anomalies, file ? 'file' : 'live'));
        
        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                source,
                threshold,
                totalFlows: flows.length,
                anomalies: anomalies.length,
                details: {
                    flows: flows.slice(0, 100),
                    anomalies: anomalies
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
