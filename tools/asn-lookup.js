#!/usr/bin/env node

/**
 * ASN Lookup - MFH TOOLS PRO
 * Consulta información de ASN (Autonomous System Number)
 * 
 * Uso: node asn-lookup.js [opciones]
 * Ejemplo: node asn-lookup.js --asn 15169
 * Ejemplo: node asn-lookup.js --ip 8.8.8.8
 * Ejemplo: node asn-lookup.js --asn 15169 --output report.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    baseUrl: 'https://api.bgpview.io',
    timeout: 10000,
    userAgent: 'MFH-ASN-Lookup/1.0'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let asn = null;
let ip = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--asn':
        case '-a':
            asn = args[i + 1];
            i++;
            break;
        case '--ip':
        case '-i':
            ip = args[i + 1];
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
🔍 ASN Lookup - MFH TOOLS PRO
==============================
Consulta información de ASN (Autonomous System Number).

Uso:
  node asn-lookup.js [opciones]

Opciones:
  --asn, -a <número>       Número de ASN (ej: 15169)
  --ip, -i <dirección>     Dirección IP (ej: 8.8.8.8)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node asn-lookup.js --asn 15169
  node asn-lookup.js --ip 8.8.8.8
  node asn-lookup.js --asn 15169 --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${CONFIG.baseUrl}${endpoint}`;
        const parsedUrl = new URL(url);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'application/json'
            },
            timeout: CONFIG.timeout
        };

        if (verbose) {
            console.log(`📡 Request: ${url}`);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`Error parsing JSON: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function lookupASN(asn) {
    const cleanAsn = asn.toString().replace(/^AS/i, '');
    const data = await makeRequest(`/asn/${cleanAsn}`);
    return data;
}

async function lookupIP(ip) {
    const data = await makeRequest(`/ip/${ip}`);
    return data;
}

function formatResults(data, type) {
    let output = '';
    output += `🔍 ASN Lookup - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';

    if (type === 'asn') {
        const asnData = data.data;
        if (!asnData) {
            output += '❌ No se encontró información para este ASN\n';
            return output;
        }

        output += `📋 ASN: ${asnData.asn || 'N/A'}\n`;
        output += `📋 Nombre: ${asnData.name || 'N/A'}\n`;
        output += `📋 Descripción: ${asnData.description || 'N/A'}\n`;
        output += `📋 País: ${asnData.country_code || 'N/A'}\n`;
        output += `📋 Rango de IPs: ${asnData.ipv4_prefixes ? asnData.ipv4_prefixes.length : 0} prefijos IPv4\n`;

        if (asnData.ipv4_prefixes && asnData.ipv4_prefixes.length > 0) {
            output += `\n📋 PREFIJOS IPv4 (${asnData.ipv4_prefixes.length}):\n`;
            const prefixes = asnData.ipv4_prefixes.slice(0, 10);
            for (const prefix of prefixes) {
                output += `   • ${prefix.prefix}\n`;
            }
            if (asnData.ipv4_prefixes.length > 10) {
                output += `   ... y ${asnData.ipv4_prefixes.length - 10} más\n`;
            }
        }

        if (asnData.ipv6_prefixes && asnData.ipv6_prefixes.length > 0) {
            output += `\n📋 PREFIJOS IPv6 (${asnData.ipv6_prefixes.length}):\n`;
            const prefixes = asnData.ipv6_prefixes.slice(0, 5);
            for (const prefix of prefixes) {
                output += `   • ${prefix.prefix}\n`;
            }
            if (asnData.ipv6_prefixes.length > 5) {
                output += `   ... y ${asnData.ipv6_prefixes.length - 5} más\n`;
            }
        }

    } else if (type === 'ip') {
        const ipData = data.data;
        if (!ipData) {
            output += '❌ No se encontró información para esta IP\n';
            return output;
        }

        output += `📋 IP: ${ipData.ip || 'N/A'}\n`;
        output += `📋 ASN: ${ipData.asn || 'N/A'}\n`;
        output += `📋 Nombre ASN: ${ipData.asn_name || 'N/A'}\n`;
        output += `📋 País: ${ipData.country_code || 'N/A'}\n`;
        output += `📋 Rango: ${ipData.prefix || 'N/A'}\n`;

        if (ipData.rdap) {
            output += `\n📋 INFORMACIÓN RDAP:\n`;
            if (ipData.rdap.name) output += `   • Nombre: ${ipData.rdap.name}\n`;
            if (ipData.rdap.type) output += `   • Tipo: ${ipData.rdap.type}\n`;
            if (ipData.rdap.country) output += `   • País: ${ipData.rdap.country}\n`;
        }
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 ASN Lookup - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!asn && !ip) {
        console.error('❌ Debes especificar --asn o --ip');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        let result = null;
        let type = null;

        if (asn) {
            console.log(`📡 Consultando ASN: ${asn}`);
            result = await lookupASN(asn);
            type = 'asn';
        } else if (ip) {
            console.log(`📡 Consultando IP: ${ip}`);
            result = await lookupIP(ip);
            type = 'ip';
        }

        // Mostrar resultados
        console.log(formatResults(result, type));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                query: { asn, ip },
                data: result
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

        console.log('\n✅ Consulta completada');

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
