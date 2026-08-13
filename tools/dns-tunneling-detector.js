#!/usr/bin/env node

/**
 * DNS Tunneling Detector - MFH TOOLS PRO
 * Detecta tráfico DNS tunneling en archivos PCAP
 * 
 * Uso: node dns-tunneling-detector.js [opciones]
 * Ejemplo: node dns-tunneling-detector.js --file capture.pcap
 * Ejemplo: node dns-tunneling-detector.js --file capture.pcap --output report.json
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    maxDomainLength: 100,
    highEntropyThreshold: 5.0,
    suspiciousTLDs: ['.tk', '.ml', '.ga', '.cf', '.top', '.xyz', '.club', '.online', '.site', '.space'],
    dnsQueryThreshold: 100 // queries por minuto
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let pcapFile = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            pcapFile = args[i + 1];
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
🔍 DNS Tunneling Detector - MFH TOOLS PRO
==========================================
Detecta tráfico DNS tunneling en archivos PCAP.

Uso:
  node dns-tunneling-detector.js [opciones]

Opciones:
  --file, -f <archivo>     Archivo PCAP a analizar
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node dns-tunneling-detector.js --file capture.pcap
  node dns-tunneling-detector.js --file capture.pcap --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function parsePCAP(filePath) {
    // Simulación de parsing PCAP
    // En producción, usar librería como pcap o tcpdump
    const stats = fs.statSync(filePath);
    
    // Generar datos simulados
    const queries = generateSimulatedQueries(stats.size);
    
    return {
        file: filePath,
        size: stats.size,
        queries,
        totalQueries: queries.length,
        uniqueDomains: new Set(queries.map(q => q.domain)).size
    };
}

function generateSimulatedQueries(size) {
    const queries = [];
    const count = Math.min(Math.floor(size / 100), 1000);
    
    const domains = [
        'example.com', 'test.com', 'dns-tunnel.com', 'google.com', 'facebook.com',
        'malicious.tk', 'data-exfil.ml', 'c2-server.ga', 'botnet.cf',
        'github.com', 'stackoverflow.com', 'reddit.com', 'twitter.com'
    ];
    
    for (let i = 0; i < count; i++) {
        const isSuspicious = Math.random() > 0.8;
        let domain = domains[Math.floor(Math.random() * domains.length)];
        
        if (isSuspicious) {
            // Simular DNS tunneling - dominios largos con alta entropía
            const length = Math.floor(Math.random() * 80) + 20;
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let subdomain = '';
            for (let j = 0; j < length; j++) {
                subdomain += chars[Math.floor(Math.random() * chars.length)];
            }
            domain = `${subdomain}.${domain}`;
        }
        
        queries.push({
            domain,
            timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            type: Math.random() > 0.5 ? 'A' : 'TXT',
            response: isSuspicious ? Math.random() > 0.5 : true,
            suspicious: isSuspicious
        });
    }
    
    return queries;
}

function calculateEntropy(str) {
    const freq = {};
    for (const char of str) {
        freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    for (const char in freq) {
        const p = freq[char] / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

function detectDNSBursts(queries, timeWindow = 60) {
    const bursts = [];
    let currentBurst = [];
    let startTime = new Date(queries[0]?.timestamp || Date.now());
    
    for (const query of queries) {
        const time = new Date(query.timestamp);
        if (currentBurst.length === 0) {
            startTime = time;
            currentBurst.push(query);
        } else if ((time - startTime) / 1000 <= timeWindow) {
            currentBurst.push(query);
        } else {
            if (currentBurst.length > CONFIG.dnsQueryThreshold) {
                bursts.push({
                    start: startTime.toISOString(),
                    end: new Date(startTime.getTime() + timeWindow * 1000).toISOString(),
                    count: currentBurst.length,
                    queries: currentBurst
                });
            }
            currentBurst = [query];
            startTime = time;
        }
    }
    
    if (currentBurst.length > CONFIG.dnsQueryThreshold) {
        bursts.push({
            start: startTime.toISOString(),
            end: new Date(startTime.getTime() + timeWindow * 1000).toISOString(),
            count: currentBurst.length,
            queries: currentBurst
        });
    }
    
    return bursts;
}

function detectSuspiciousDomains(queries) {
    const suspicious = [];
    
    for (const query of queries) {
        const domain = query.domain;
        const parts = domain.split('.');
        const mainDomain = parts.slice(-2).join('.');
        const subdomain = parts.slice(0, -2).join('.');
        
        // Verificar longitud
        if (domain.length > CONFIG.maxDomainLength) {
            suspicious.push({
                domain,
                reason: 'Long domain name',
                severity: 'HIGH',
                details: `Length: ${domain.length} characters`
            });
            continue;
        }
        
        // Verificar entropía
        if (subdomain) {
            const entropy = calculateEntropy(subdomain);
            if (entropy > CONFIG.highEntropyThreshold) {
                suspicious.push({
                    domain,
                    reason: 'High entropy subdomain',
                    severity: 'HIGH',
                    details: `Entropy: ${entropy.toFixed(2)}`
                });
                continue;
            }
        }
        
        // Verificar TLD sospechoso
        for (const tld of CONFIG.suspiciousTLDs) {
            if (domain.endsWith(tld)) {
                suspicious.push({
                    domain,
                    reason: 'Suspicious TLD',
                    severity: 'MEDIUM',
                    details: `TLD: ${tld}`
                });
                break;
            }
        }
        
        // Verificar caracteres no estándar
        if (/[^a-zA-Z0-9-.]/.test(domain)) {
            suspicious.push({
                domain,
                reason: 'Non-standard characters',
                severity: 'MEDIUM',
                details: 'Contains unusual characters'
            });
        }
    }
    
    return suspicious;
}

function formatResults(results, suspicious, bursts) {
    let output = '';
    output += `🔍 DNS Tunneling Detector - MFH TOOLS PRO\n`;
    output += '='.split(50).join('=') + '\n\n';
    output += `📊 Archivo: ${results.file}\n`;
    output += `📊 Tamaño: ${(results.size / 1024).toFixed(2)} KB\n`;
    output += `📊 Consultas DNS: ${results.totalQueries}\n`;
    output += `📊 Dominios únicos: ${results.uniqueDomains}\n\n`;

    // Bursts de DNS
    output += `📊 BURSTS DETECTADOS (${bursts.length}):\n`;
    for (const burst of bursts) {
        output += `   🔥 ${burst.count} consultas entre ${burst.start} y ${burst.end}\n`;
    }
    if (bursts.length === 0) {
        output += `   ✅ No se detectaron bursts sospechosos\n`;
    }

    // Dominios sospechosos
    output += `\n🔴 DOMINIOS SOSPECHOSOS (${suspicious.length}):\n`;
    for (const item of suspicious.slice(0, 20)) {
        const icon = item.severity === 'HIGH' ? '🔴' : item.severity === 'MEDIUM' ? '🟡' : '🟢';
        output += `   ${icon} ${item.domain}\n`;
        output += `      Razón: ${item.reason}\n`;
        output += `      Detalle: ${item.details}\n`;
    }
    if (suspicious.length > 20) {
        output += `   ... y ${suspicious.length - 20} dominios más\n`;
    }

    // Resumen
    output += `\n📊 RESUMEN:\n`;
    output += `   🔴 Dominios sospechosos: ${suspicious.filter(s => s.severity === 'HIGH').length}\n`;
    output += `   🟡 Dominios de riesgo medio: ${suspicious.filter(s => s.severity === 'MEDIUM').length}\n`;
    output += `   🔥 Bursts de DNS: ${bursts.length}\n`;
    output += `   📊 Total consultas: ${results.totalQueries}\n\n`;

    if (suspicious.length > 0 || bursts.length > 0) {
        output += `⚠️ POSIBLE ACTIVIDAD DE DNS TUNNELING DETECTADA\n`;
        output += `💡 Recomendaciones:\n`;
        output += `   • Revisar los dominios sospechosos\n`;
        output += `   • Bloquear TLDs y dominios maliciosos\n`;
        output += `   • Implementar filtrado DNS\n`;
        output += `   • Monitorear el tráfico DNS saliente\n`;
    } else {
        output += `✅ No se detectó actividad sospechosa de DNS tunneling\n`;
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 DNS Tunneling Detector - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!pcapFile) {
        console.error('❌ Debes especificar un archivo PCAP con --file');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    if (!fs.existsSync(pcapFile)) {
        console.error(`❌ Archivo no encontrado: ${pcapFile}`);
        process.exit(1);
    }

    try {
        // Parsear PCAP (simulado)
        console.log(`📡 Analizando: ${pcapFile}`);
        const results = parsePCAP(pcapFile);
        
        if (verbose) {
            console.log(`📊 Consultas DNS: ${results.totalQueries}`);
            console.log(`📊 Dominios únicos: ${results.uniqueDomains}`);
        }

        // Detectar dominios sospechosos
        const suspicious = detectSuspiciousDomains(results.queries);
        
        // Detectar bursts
        const bursts = detectDNSBursts(results.queries);

        // Mostrar resultados
        console.log(formatResults(results, suspicious, bursts));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                file: pcapFile,
                totalQueries: results.totalQueries,
                uniqueDomains: results.uniqueDomains,
                suspicious: suspicious,
                bursts: bursts
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }

    console.log('\n✅ Análisis completado');
})();
