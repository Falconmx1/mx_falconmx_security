#!/usr/bin/env node

/**
 * ASN Lookup - MFH TOOLS PRO
 * Consulta información de ASN (Autonomous System Number)
 * 
 * Uso: node asn-lookup.js [opciones]
 * Ejemplo: node asn-lookup.js --ip 8.8.8.8
 * Ejemplo: node asn-lookup.js --ip 8.8.8.8 --output report.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    userAgent: 'MFH-ASN-Lookup/1.0',
    providers: {
        ipapi: 'https://ipapi.co',
        ipinfo: 'https://ipinfo.io'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let ip = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
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
  --ip, -i <dirección>     Dirección IP (ej: 8.8.8.8)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node asn-lookup.js --ip 8.8.8.8
  node asn-lookup.js --ip 8.8.8.8 --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function makeRequest(url) {
    return new Promise((resolve, reject) => {
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

async function lookupIP(ip) {
    let result = null;
    let errors = [];

    // Intentar con ipapi.co primero
    try {
        const url = `${CONFIG.providers.ipapi}/${ip}/json/`;
        const data = await makeRequest(url);
        
        if (data && !data.error) {
            result = {
                provider: 'ipapi.co',
                ip: data.ip || ip,
                asn: data.asn ? `AS${data.asn}` : 'N/A',
                asn_name: data.org || 'N/A',
                country: data.country_name || 'N/A',
                country_code: data.country || 'N/A',
                city: data.city || 'N/A',
                region: data.region || 'N/A',
                latitude: data.latitude || 'N/A',
                longitude: data.longitude || 'N/A',
                timezone: data.timezone || 'N/A',
                isp: data.org || 'N/A'
            };
            return result;
        }
    } catch (error) {
        errors.push(`ipapi.co: ${error.message}`);
        if (verbose) console.log(`⚠️ ipapi.co falló: ${error.message}`);
    }

    // Intentar con ipinfo.io como respaldo
    try {
        const url = `${CONFIG.providers.ipinfo}/${ip}/json`;
        const data = await makeRequest(url);
        
        if (data && !data.error) {
            const asnParts = data.org ? data.org.split(' ') : [];
            const asn = asnParts.find(p => p.startsWith('AS')) || 'N/A';
            const asnName = asnParts.filter(p => !p.startsWith('AS')).join(' ') || 'N/A';

            result = {
                provider: 'ipinfo.io',
                ip: data.ip || ip,
                asn: asn,
                asn_name: asnName,
                country: data.country || 'N/A',
                country_code: data.country || 'N/A',
                city: data.city || 'N/A',
                region: data.region || 'N/A',
                latitude: data.loc ? data.loc.split(',')[0] : 'N/A',
                longitude: data.loc ? data.loc.split(',')[1] : 'N/A',
                timezone: data.timezone || 'N/A',
                isp: data.org || 'N/A'
            };
            return result;
        }
    } catch (error) {
        errors.push(`ipinfo.io: ${error.message}`);
        if (verbose) console.log(`⚠️ ipinfo.io falló: ${error.message}`);
    }

    // Si todo falla
    throw new Error(`No se pudo obtener información de la IP ${ip}. Errores: ${errors.join('; ')}`);
}

function formatResults(data) {
    let output = '';
    output += `🔍 ASN Lookup - MFH TOOLS PRO\n`;
    output += '='.split(50).join('=') + '\n\n';

    output += `📋 IP: ${data.ip}\n`;
    output += `📋 ASN: ${data.asn}\n`;
    output += `📋 Nombre ASN: ${data.asn_name}\n`;
    output += `📋 País: ${data.country} (${data.country_code})\n`;
    output += `📋 Ciudad: ${data.city}\n`;
    output += `📋 Región: ${data.region}\n`;
    output += `📋 ISP: ${data.isp}\n`;
    output += `📋 Zona horaria: ${data.timezone}\n`;
    output += `📍 Coordenadas: ${data.latitude}, ${data.longitude}\n`;
    output += `📡 Proveedor: ${data.provider}\n`;

    // Enlaces útiles
    output += `\n🔗 ENLACES ÚTILES:\n`;
    output += `   • https://bgp.he.net/${data.asn}\n`;
    output += `   • https://whois.arin.net/rest/ip/${data.ip}\n`;
    output += `   • https://www.shodan.io/host/${data.ip}\n`;

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 ASN Lookup - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    if (!ip) {
        console.error('❌ Debes especificar una IP con --ip');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        console.log(`📡 Consultando IP: ${ip}`);
        const result = await lookupIP(ip);

        // Mostrar resultados
        console.log(formatResults(result));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                query: { ip },
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
