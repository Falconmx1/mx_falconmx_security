#!/usr/bin/env node

/**
 * SSL/TLS Cipher Suite Analyzer - MFH TOOLS PRO
 * Analiza suites de cifrado soportadas por un servidor
 * 
 * Uso: node cipher-suite-analyzer.js [opciones]
 * Ejemplo: node cipher-suite-analyzer.js --host google.com
 * Ejemplo: node cipher-suite-analyzer.js --host example.com --port 8443
 */

const tls = require('tls');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    defaultPort: 443
};

// ==================== SUITES DE CIFRADO CONOCIDAS ====================
const CIPHER_SUITES = {
    'TLS_AES_256_GCM_SHA384': { strength: 'HIGH', type: 'AEAD' },
    'TLS_AES_128_GCM_SHA256': { strength: 'HIGH', type: 'AEAD' },
    'TLS_CHACHA20_POLY1305_SHA256': { strength: 'HIGH', type: 'AEAD' },
    'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384': { strength: 'HIGH', type: 'ECDHE' },
    'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256': { strength: 'HIGH', type: 'ECDHE' },
    'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384': { strength: 'HIGH', type: 'ECDHE' },
    'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256': { strength: 'HIGH', type: 'ECDHE' },
    'TLS_DHE_RSA_WITH_AES_256_GCM_SHA384': { strength: 'HIGH', type: 'DHE' },
    'TLS_DHE_RSA_WITH_AES_128_GCM_SHA256': { strength: 'HIGH', type: 'DHE' },
    'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256': { strength: 'HIGH', type: 'ECDHE' },
    'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256': { strength: 'HIGH', type: 'ECDHE' },
    
    'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384': { strength: 'MEDIUM', type: 'ECDHE' },
    'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384': { strength: 'MEDIUM', type: 'ECDHE' },
    'TLS_RSA_WITH_AES_256_GCM_SHA384': { strength: 'MEDIUM', type: 'RSA' },
    'TLS_RSA_WITH_AES_128_GCM_SHA256': { strength: 'MEDIUM', type: 'RSA' },
    'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA': { strength: 'MEDIUM', type: 'ECDHE' },
    'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA': { strength: 'MEDIUM', type: 'ECDHE' },
    
    'TLS_RSA_WITH_AES_256_CBC_SHA256': { strength: 'LOW', type: 'RSA' },
    'TLS_RSA_WITH_AES_128_CBC_SHA256': { strength: 'LOW', type: 'RSA' },
    'TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA': { strength: 'LOW', type: 'ECDHE' },
    'TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA': { strength: 'LOW', type: 'ECDHE' },
    'TLS_RSA_WITH_3DES_EDE_CBC_SHA': { strength: 'LOW', type: 'RSA' },
    'TLS_RSA_WITH_DES_CBC_SHA': { strength: 'WEAK', type: 'RSA' },
    'TLS_RSA_EXPORT_WITH_RC4_40_MD5': { strength: 'WEAK', type: 'RSA' },
    'TLS_RSA_WITH_RC4_128_MD5': { strength: 'WEAK', type: 'RSA' },
    'TLS_RSA_WITH_RC4_128_SHA': { strength: 'WEAK', type: 'RSA' }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let host = null;
let port = CONFIG.defaultPort;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--host':
        case '-h':
            host = args[i + 1];
            i++;
            break;
        case '--port':
        case '-p':
            port = parseInt(args[i + 1]);
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
            console.log(`
🔍 SSL/TLS Cipher Suite Analyzer - MFH TOOLS PRO
=================================================
Analiza suites de cifrado soportadas por un servidor.

Uso:
  node cipher-suite-analyzer.js [opciones]

Opciones:
  --host, -h <host>        Host a analizar
  --port, -p <puerto>      Puerto (default: 443)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help                   Mostrar esta ayuda

Ejemplos:
  node cipher-suite-analyzer.js --host google.com
  node cipher-suite-analyzer.js --host example.com --port 8443
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function getCipherSuites(host, port) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect({
            host,
            port,
            rejectUnauthorized: false,
            timeout: CONFIG.timeout,
            minVersion: 'TLSv1.2'
        });

        const ciphers = [];
        let connected = false;

        socket.once('secureConnect', () => {
            connected = true;
            const cipher = socket.getCipher();
            if (cipher) {
                ciphers.push({
                    name: cipher.name,
                    version: cipher.version
                });
            }
            
            // Obtener lista de suites soportadas
            const supportedCiphers = socket.getCiphers ? socket.getCiphers() : [];
            if (supportedCiphers.length > 0) {
                for (const c of supportedCiphers) {
                    if (!ciphers.find(ci => ci.name === c)) {
                        ciphers.push({
                            name: c,
                            version: 'TLSv1.2'
                        });
                    }
                }
            }

            socket.end();
            resolve({
                host,
                port,
                ciphers,
                selected: cipher
            });
        });

        socket.on('error', (err) => {
            if (!connected) {
                reject(err);
            }
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
        });
    });
}

function analyzeCiphers(ciphers) {
    const results = {
        total: ciphers.length,
        strong: 0,
        medium: 0,
        low: 0,
        weak: 0,
        unknown: 0,
        details: []
    };

    for (const cipher of ciphers) {
        const info = CIPHER_SUITES[cipher.name] || { strength: 'UNKNOWN', type: 'UNKNOWN' };
        const detail = {
            name: cipher.name,
            strength: info.strength || 'UNKNOWN',
            type: info.type || 'UNKNOWN',
            version: cipher.version || 'N/A'
        };

        if (info.strength === 'HIGH') results.strong++;
        else if (info.strength === 'MEDIUM') results.medium++;
        else if (info.strength === 'LOW') results.low++;
        else if (info.strength === 'WEAK') results.weak++;
        else results.unknown++;

        results.details.push(detail);
    }

    return results;
}

function formatResults(results, host, port) {
    let output = '';
    output += `🔍 SSL/TLS Cipher Suite Analyzer - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    output += `📡 Host: ${host}:${port}\n`;
    output += `📊 Total suites: ${results.total}\n\n`;

    output += `📊 RESULTADOS:\n`;
    output += `   🟢 Fuertes: ${results.strong}\n`;
    output += `   🟡 Medias: ${results.medium}\n`;
    output += `   🟠 Bajas: ${results.low}\n`;
    output += `   🔴 Débiles: ${results.weak}\n`;
    output += `   ⚪ Desconocidas: ${results.unknown}\n\n`;

    output += `📋 DETALLE DE SUITES:\n`;
    for (const detail of results.details) {
        const icon = detail.strength === 'HIGH' ? '🟢' : 
                     detail.strength === 'MEDIUM' ? '🟡' : 
                     detail.strength === 'LOW' ? '🟠' : 
                     detail.strength === 'WEAK' ? '🔴' : '⚪';
        output += `   ${icon} ${detail.name}\n`;
        output += `      Fuerza: ${detail.strength}, Tipo: ${detail.type}\n`;
    }

    // Recomendaciones
    if (results.weak > 0 || results.low > 0) {
        output += `\n💡 RECOMENDACIONES:\n`;
        if (results.weak > 0) {
            output += `   🔴 Deshabilitar suites débiles (RC4, DES, export)\n`;
        }
        if (results.low > 0) {
            output += `   🟠 Considerar deshabilitar suites bajas (3DES, CBC)\n`;
        }
        if (results.strong === 0) {
            output += `   ⚠️ No se encontraron suites fuertes (AES-GCM, ChaCha20)\n`;
        }
        output += `   ✅ Habilitar solo TLS 1.2 y 1.3\n`;
        output += `   ✅ Usar suites con Forward Secrecy (ECDHE, DHE)\n`;
    } else {
        output += `\n🎉 Buena configuración de cifrado!\n`;
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 SSL/TLS Cipher Suite Analyzer - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!host) {
        console.error('❌ Debes especificar un host con --host');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        console.log(`📡 Conectando a ${host}:${port}...`);
        const result = await getCipherSuites(host, port);
        
        if (verbose) {
            console.log(`✅ Conexión establecida`);
            console.log(`📋 Suites encontradas: ${result.ciphers.length}`);
        }

        // Analizar ciphers
        const analysis = analyzeCiphers(result.ciphers);

        // Mostrar resultados
        console.log(formatResults(analysis, host, port));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                host,
                port,
                ciphers: result.ciphers,
                analysis
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
