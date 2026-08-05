#!/usr/bin/env node

/**
 * Network Traffic Analyzer - MFH TOOLS PRO
 * Analiza tráfico de red en tiempo real (simulado)
 * 
 * Uso: node network-traffic-analyzer.js [opciones]
 * Ejemplo: node network-traffic-analyzer.js --duration 10
 * Ejemplo: node network-traffic-analyzer.js --output reporte.txt
 * Ejemplo: node network-traffic-analyzer.js --verbose
 */

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    defaultDuration: 5,
    protocols: ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'SSH', 'FTP', 'SMTP', 'ICMP', 'ARP'],
    ports: {
        'TCP': [80, 443, 22, 21, 25, 53, 3306, 5432, 6379, 27017],
        'UDP': [53, 67, 68, 123, 161, 514, 500, 4500],
        'HTTP': [80, 8080, 8000],
        'HTTPS': [443, 8443],
        'SSH': [22],
        'FTP': [21],
        'SMTP': [25, 587],
        'DNS': [53]
    },
    countries: ['México', 'USA', 'España', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Alemania', 'Francia', 'Japón']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let duration = CONFIG.defaultDuration;
let outputFile = null;
let verbose = false;

if (args.length === 0) {
    console.error(`
🔍 Network Traffic Analyzer - MFH TOOLS PRO
============================================
Analiza tráfico de red en tiempo real (simulado).

Uso:
  node network-traffic-analyzer.js [opciones]

Opciones:
  --duration <seg>     Duración del análisis (default: 5 segundos)
  --output <archivo>   Guardar resultados en archivo
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node network-traffic-analyzer.js --duration 10
  node network-traffic-analyzer.js --output reporte.txt
  node network-traffic-analyzer.js --verbose
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration' && args[i + 1]) {
        duration = parseInt(args[i + 1]) || CONFIG.defaultDuration;
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function generateRandomIP() {
    const parts = [];
    for (let i = 0; i < 4; i++) {
        parts.push(Math.floor(Math.random() * 256));
    }
    return parts.join('.');
}

function generateRandomIPWithPrefix(prefix) {
    const parts = prefix.split('.');
    while (parts.length < 4) {
        parts.push(Math.floor(Math.random() * 256));
    }
    return parts.join('.');
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTraffic() {
    const protocol = randomItem(CONFIG.protocols);
    const srcIP = generateRandomIP();
    const dstIP = generateRandomIP();
    const srcPort = randomNumber(1024, 65535);
    const dstPort = randomItem(CONFIG.ports[protocol] || [randomNumber(1, 1023)]);
    const size = randomNumber(64, 1500);
    const duration = randomNumber(10, 500);
    const country = randomItem(CONFIG.countries);
    
    return {
        timestamp: new Date().toISOString(),
        protocol,
        srcIP,
        dstIP,
        srcPort,
        dstPort,
        size,
        duration,
        country,
        type: Math.random() > 0.8 ? 'SSL/TLS' : 'Normal'
    };
}

function generateTrafficBurst(count) {
    const traffic = [];
    for (let i = 0; i < count; i++) {
        traffic.push(generateTraffic());
    }
    return traffic;
}

function getProtocolColor(protocol) {
    const colors = {
        'TCP': '\x1b[36m',
        'UDP': '\x1b[35m',
        'HTTP': '\x1b[32m',
        'HTTPS': '\x1b[32m',
        'DNS': '\x1b[33m',
        'SSH': '\x1b[31m',
        'FTP': '\x1b[34m',
        'SMTP': '\x1b[35m',
        'ICMP': '\x1b[33m',
        'ARP': '\x1b[31m'
    };
    return colors[protocol] || '\x1b[37m';
}

function getProtocolEmoji(protocol) {
    const emojis = {
        'TCP': '🔗',
        'UDP': '📨',
        'HTTP': '🌐',
        'HTTPS': '🔒',
        'DNS': '🔍',
        'SSH': '🔑',
        'FTP': '📁',
        'SMTP': '📧',
        'ICMP': '📡',
        'ARP': '🔌'
    };
    return emojis[protocol] || '📦';
}

function analyzeTraffic(traffic) {
    const analysis = {
        totalPackets: traffic.length,
        totalSize: traffic.reduce((sum, p) => sum + p.size, 0),
        avgSize: 0,
        protocols: {},
        ports: {},
        countries: {},
        types: {},
        topSources: {},
        topDestinations: {},
        anomalies: []
    };
    
    if (traffic.length > 0) {
        analysis.avgSize = analysis.totalSize / traffic.length;
    }
    
    for (const packet of traffic) {
        // Protocolos
        analysis.protocols[packet.protocol] = (analysis.protocols[packet.protocol] || 0) + 1;
        
        // Puertos destino
        const portKey = `${packet.dstPort}`;
        analysis.ports[portKey] = (analysis.ports[portKey] || 0) + 1;
        
        // Países
        analysis.countries[packet.country] = (analysis.countries[packet.country] || 0) + 1;
        
        // Tipos
        analysis.types[packet.type] = (analysis.types[packet.type] || 0) + 1;
        
        // Orígenes
        analysis.topSources[packet.srcIP] = (analysis.topSources[packet.srcIP] || 0) + 1;
        
        // Destinos
        analysis.topDestinations[packet.dstIP] = (analysis.topDestinations[packet.dstIP] || 0) + 1;
    }
    
    // Detectar anomalías
    const threshold = traffic.length * 0.05;
    for (const [protocol, count] of Object.entries(analysis.protocols)) {
        if (count > threshold * 2) {
            analysis.anomalies.push(`Alto tráfico en protocolo ${protocol}: ${count} paquetes`);
        }
    }
    
    for (const [port, count] of Object.entries(analysis.ports)) {
        if (count > threshold * 2) {
            analysis.anomalies.push(`Alto tráfico en puerto ${port}: ${count} paquetes`);
        }
    }
    
    return analysis;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Network Traffic Analyzer - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📋 Duración: ${duration} segundos`);
        console.log('');
        
        console.log('📡 Capturando tráfico de red (simulado)...');
        console.log('   Presiona Ctrl+C para detener antes del tiempo');
        console.log('');
        
        const startTime = Date.now();
        const allTraffic = [];
        let packetCount = 0;
        
        // Simulación en tiempo real
        while ((Date.now() - startTime) / 1000 < duration) {
            const burst = generateTrafficBurst(randomNumber(1, 5));
            allTraffic.push(...burst);
            
            // Mostrar paquetes en tiempo real
            for (const packet of burst) {
                packetCount++;
                const emoji = getProtocolEmoji(packet.protocol);
                const color = getProtocolColor(packet.protocol);
                const progress = Math.round(((Date.now() - startTime) / 1000 / duration) * 100);
                process.stdout.write(`\r📊 Progreso: ${progress}% | 📦 Paquetes: ${packetCount}`);
                
                if (verbose) {
                    console.log(`\n   ${emoji} ${color}${packet.protocol}\x1b[0m ${packet.srcIP}:${packet.srcPort} → ${packet.dstIP}:${packet.dstPort} (${packet.size} bytes) [${packet.country}]`);
                }
            }
            
            // Esperar un poco
            await new Promise(r => setTimeout(r, 100));
        }
        
        console.log('\n');
        
        // Analizar tráfico
        console.log('📊 ANALIZANDO TRÁFICO...');
        const analysis = analyzeTraffic(allTraffic);
        
        console.log('');
        console.log('📊 RESULTADOS DEL ANÁLISIS');
        console.log('='.repeat(60));
        console.log(`📦 Paquetes capturados: ${analysis.totalPackets}`);
        console.log(`📦 Datos totales: ${(analysis.totalSize / 1024).toFixed(2)} KB`);
        console.log(`📦 Tamaño promedio: ${analysis.avgSize.toFixed(2)} bytes`);
        console.log('');
        
        // Protocolos
        console.log('🔹 PROTOCOLOS:');
        const sortedProtocols = Object.entries(analysis.protocols).sort((a, b) => b[1] - a[1]);
        for (const [protocol, count] of sortedProtocols) {
            const percent = ((count / analysis.totalPackets) * 100).toFixed(2);
            const bar = '█'.repeat(Math.round(count / analysis.totalPackets * 30));
            console.log(`   ${getProtocolEmoji(protocol)} ${protocol}: ${count} paquetes (${percent}%) ${bar}`);
        }
        console.log('');
        
        // Puertos
        console.log('🔹 PUERTOS MÁS USADOS:');
        const sortedPorts = Object.entries(analysis.ports).sort((a, b) => b[1] - a[1]).slice(0, 5);
        for (const [port, count] of sortedPorts) {
            const percent = ((count / analysis.totalPackets) * 100).toFixed(2);
            console.log(`   🔌 Puerto ${port}: ${count} paquetes (${percent}%)`);
        }
        console.log('');
        
        // Países
        console.log('🔹 PAÍSES ORIGEN:');
        const sortedCountries = Object.entries(analysis.countries).sort((a, b) => b[1] - a[1]).slice(0, 5);
        for (const [country, count] of sortedCountries) {
            const percent = ((count / analysis.totalPackets) * 100).toFixed(2);
            console.log(`   🌍 ${country}: ${count} paquetes (${percent}%)`);
        }
        console.log('');
        
        // Anomalías
        console.log('🔹 ANOMALÍAS DETECTADAS:');
        if (analysis.anomalies.length > 0) {
            for (const anomaly of analysis.anomalies) {
                console.log(`   ⚠️ ${anomaly}`);
            }
        } else {
            console.log('   ✅ No se detectaron anomalías en el tráfico');
        }
        console.log('');
        
        // Recomendaciones
        console.log('🔹 RECOMENDACIONES:');
        if (analysis.totalPackets > 100) {
            console.log('   ⚠️ Tráfico elevado detectado - Considerar monitoreo continuo');
        }
        if (analysis.protocols['HTTP'] > analysis.totalPackets * 0.3) {
            console.log('   🔒 Considerar migrar a HTTPS para mayor seguridad');
        }
        console.log('   💡 Utilizar análisis de tráfico para detectar patrones anómalos');
        
        // Guardar resultados
        if (outputFile) {
            const content = `
Network Traffic Analyzer - MFH TOOLS PRO
========================================
Fecha: ${new Date().toLocaleString()}
Duración: ${duration} segundos
Paquetes capturados: ${analysis.totalPackets}
Datos totales: ${(analysis.totalSize / 1024).toFixed(2)} KB

PROTOCOLOS:
${sortedProtocols.map(([protocol, count]) => `  ${protocol}: ${count} paquetes (${((count / analysis.totalPackets) * 100).toFixed(2)}%)`).join('\n')}

PUERTOS MÁS USADOS:
${sortedPorts.map(([port, count]) => `  Puerto ${port}: ${count} paquetes`).join('\n')}

PAÍSES ORIGEN:
${sortedCountries.map(([country, count]) => `  ${country}: ${count} paquetes`).join('\n')}

ANOMALÍAS:
${analysis.anomalies.join('\n') || '  Ninguna detectada'}
`;
            fs.writeFileSync(outputFile, content);
            console.log(`\n📁 Reporte guardado en: ${outputFile}`);
        }
        
        console.log('\n✅ Network Traffic Analyzer completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
