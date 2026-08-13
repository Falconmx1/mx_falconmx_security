#!/usr/bin/env node

/**
 * SSL Certificate Transparency Log - MFH TOOLS PRO
 * Busca certificados SSL en logs de transparencia
 * 
 * Uso: node cert-transparency-log.js [opciones]
 * Ejemplo: node cert-transparency-log.js --domain google.com
 * Ejemplo: node cert-transparency-log.js --domain example.com --limit 100
 * Ejemplo: node cert-transparency-log.js --domain google.com --output report.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    baseUrl: 'https://crt.sh',
    timeout: 15000,
    userAgent: 'MFH-Cert-Transparency-Log/1.0',
    defaultLimit: 50
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let domain = null;
let limit = CONFIG.defaultLimit;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--domain':
        case '-d':
            domain = args[i + 1];
            i++;
            break;
        case '--limit':
        case '-l':
            limit = parseInt(args[i + 1]);
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
🔍 SSL Certificate Transparency Log - MFH TOOLS PRO
====================================================
Busca certificados SSL en logs de transparencia.

Uso:
  node cert-transparency-log.js [opciones]

Opciones:
  --domain, -d <dominio>   Dominio a buscar
  --limit, -l <n>          Límite de resultados (default: 50)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node cert-transparency-log.js --domain google.com
  node cert-transparency-log.js --domain example.com --limit 100
  node cert-transparency-log.js --domain google.com --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function searchCertificates(domain, limit) {
    return new Promise((resolve, reject) => {
        const url = `${CONFIG.baseUrl}/?q=${encodeURIComponent(domain)}&output=json&exclude=expired&limit=${limit}`;
        const parsedUrl = new URL(url);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': CONFIG.userAgent
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
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (error) {
                        resolve({ error: 'Error parsing response' });
                    }
                } else {
                    reject(new Error(`HTTP Error ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

function processCertificates(data, domain) {
    if (!data || !Array.isArray(data)) {
        return { domain, total: 0, certificates: [], error: 'No data' };
    }

    // Filtrar solo los que contienen el dominio exacto en name_value
    const certs = data.filter(item => {
        if (!item.name_value) return false;
        const names = item.name_value.split('\n');
        return names.some(name => name.trim() === domain || name.trim() === `*.${domain}`);
    });

    const processed = certs.map(cert => ({
        id: cert.id,
        issuerName: cert.issuer_name || 'N/A',
        commonName: cert.name_value || 'N/A',
        notBefore: cert.not_before || 'N/A',
        notAfter: cert.not_after || 'N/A',
        serialNumber: cert.serial_number || 'N/A',
        isExpired: cert.not_after ? new Date(cert.not_after) < new Date() : false,
        daysUntilExpiry: cert.not_after ? 
            Math.floor((new Date(cert.not_after) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
        isWildcard: cert.name_value ? cert.name_value.includes('*') : false,
        isMatched: true
    }));

    // Agrupar por emisor
    const issuers = {};
    for (const cert of processed) {
        if (!issuers[cert.issuerName]) {
            issuers[cert.issuerName] = 0;
        }
        issuers[cert.issuerName]++;
    }

    return {
        domain,
        total: processed.length,
        certificates: processed,
        issuers
    };
}

function formatResults(result) {
    let output = '';
    output += `🔍 SSL Certificate Transparency Log - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    output += `📋 Dominio: ${result.domain}\n`;
    output += `📊 Total certificados: ${result.total}\n\n`;

    if (result.error) {
        output += `❌ Error: ${result.error}\n`;
        return output;
    }

    if (result.total === 0) {
        output += `✅ No se encontraron certificados para ${result.domain}\n`;
        return output;
    }

    // Emisores
    output += `📋 EMISORES:\n`;
    const sortedIssuers = Object.entries(result.issuers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    for (const [name, count] of sortedIssuers) {
        output += `   • ${name}: ${count} certificados\n`;
    }

    // Certificados recientes
    output += `\n📋 CERTIFICADOS RECIENTES (últimos 10):\n`;
    const sortedByDate = [...result.certificates]
        .sort((a, b) => new Date(b.notBefore) - new Date(a.notBefore))
        .slice(0, 10);

    for (const cert of sortedByDate) {
        const statusIcon = cert.isExpired ? '🔴' : '🟢';
        const wildcardIcon = cert.isWildcard ? '🔸' : '📄';
        const expiryDate = cert.notAfter !== 'N/A' ? new Date(cert.notAfter).toLocaleDateString() : 'N/A';
        
        output += `   ${statusIcon} ${wildcardIcon} ${cert.commonName}\n`;
        output += `      📅 Emitido: ${cert.notBefore !== 'N/A' ? new Date(cert.notBefore).toLocaleDateString() : 'N/A'}\n`;
        output += `      ⏰ Expira: ${expiryDate} ${cert.isExpired ? '⚠️ EXPIRADO' : `(${cert.daysUntilExpiry} días)`}\n`;
        output += `      🔑 Emisor: ${cert.issuerName}\n`;
        output += `      📌 Serial: ${cert.serialNumber.substring(0, 16)}...\n`;
        output += '\n';
    }

    if (result.total > 10) {
        output += `   ... y ${result.total - 10} certificados más\n`;
    }

    // Estadísticas
    const expired = result.certificates.filter(c => c.isExpired);
    const wildcards = result.certificates.filter(c => c.isWildcard);
    output += `\n📊 ESTADÍSTICAS:\n`;
    output += `   🔴 Expired: ${expired.length}\n`;
    output += `   🔸 Wildcard: ${wildcards.length}\n`;
    output += `   ✅ Válidos: ${result.total - expired.length}\n`;

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 SSL Certificate Transparency Log - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!domain) {
        console.error('❌ Debes especificar un dominio con --domain');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        console.log(`📡 Buscando certificados para: ${domain}`);
        const data = await searchCertificates(domain, limit);
        
        if (verbose) {
            console.log(`📊 Datos recibidos: ${data ? data.length : 0} entradas`);
        }

        const result = processCertificates(data, domain);
        
        // Mostrar resultados
        console.log(formatResults(result));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                domain,
                limit,
                total: result.total,
                certificates: result.certificates,
                issuers: result.issuers
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

        console.log('\n✅ Búsqueda completada');

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
