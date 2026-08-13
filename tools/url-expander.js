#!/usr/bin/env node

/**
 * URL Shortener Expander - MFH TOOLS PRO
 * Expande URLs acortadas y revela destino final
 * 
 * Uso: node url-expander.js [opciones]
 * Ejemplo: node url-expander.js --url https://bit.ly/2XyZ123
 * Ejemplo: node url-expander.js --list urls.txt
 * Ejemplo: node url-expander.js --url https://tinyurl.com/abc --output report.json
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    userAgent: 'MFH-URL-Expander/1.0',
    maxRedirects: 20
};

// ==================== SERVICIOS DE ACORTAMIENTO ====================
const SHORTENER_SERVICES = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co', 'is.gd', 'buff.ly',
    'short.link', 'tiny.cc', 'bitly.com', 'shorturl.at', 'rb.gy', 'short.io',
    'cutt.ly', 'shorte.st', 'rebrand.ly', 'tinyurl.uy', 'clck.ru', 'v.gd',
    '6t.co', 'u.nu', 'gg.gg', 'qspark.me', 'shor.by', 'kutt.it', 'urls.live'
];

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let url = null;
let listFile = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--url':
        case '-u':
            url = args[i + 1];
            i++;
            break;
        case '--list':
        case '-l':
            listFile = args[i + 1];
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
🔍 URL Shortener Expander - MFH TOOLS PRO
==========================================
Expande URLs acortadas y revela destino final.

Uso:
  node url-expander.js [opciones]

Opciones:
  --url, -u <url>          URL a expandir
  --list, -l <archivo>     Archivo con lista de URLs
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node url-expander.js --url https://bit.ly/2XyZ123
  node url-expander.js --list urls.txt
  node url-expander.js --url https://tinyurl.com/abc --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function expandURL(originalUrl) {
    return new Promise((resolve, reject) => {
        let redirects = [];
        let currentUrl = originalUrl;
        let redirectCount = 0;

        function followRedirect(url) {
            const parsedUrl = new URL(url);
            const httpModule = parsedUrl.protocol === 'https:' ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'HEAD',
                headers: {
                    'User-Agent': CONFIG.userAgent
                },
                timeout: CONFIG.timeout,
                rejectUnauthorized: false
            };

            if (verbose) {
                console.log(`📡 Siguiendo: ${url}`);
            }

            const req = httpModule.request(options, (res) => {
                // Guardar información de la redirección
                redirects.push({
                    url: url,
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers
                });

                // Verificar si hay redirección
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    redirectCount++;
                    if (redirectCount > CONFIG.maxRedirects) {
                        reject(new Error('Demasiadas redirecciones'));
                        return;
                    }

                    let location = res.headers.location;
                    // Resolver URL relativa
                    if (!location.startsWith('http')) {
                        const base = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
                        location = new URL(location, base).href;
                    }

                    currentUrl = location;
                    followRedirect(location);
                } else {
                    // URL final
                    let finalUrl = url;
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        // Verificar si hay Location aunque no sea redirección 3xx
                        if (res.headers.location) {
                            let location = res.headers.location;
                            if (!location.startsWith('http')) {
                                const base = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
                                location = new URL(location, base).href;
                            }
                            finalUrl = location;
                            redirects.push({
                                url: location,
                                statusCode: res.statusCode,
                                statusMessage: res.statusMessage,
                                headers: res.headers
                            });
                        }
                    }

                    resolve({
                        originalUrl,
                        finalUrl,
                        redirects,
                        redirectCount,
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        isShortened: isShortenedURL(originalUrl)
                    });
                }
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        }

        followRedirect(originalUrl);
    });
}

function isShortenedURL(url) {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
        return SHORTENER_SERVICES.some(service => hostname.includes(service));
    } catch (error) {
        return false;
    }
}

function detectPhishing(url) {
    const suspiciousPatterns = [
        /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, // IP en lugar de dominio
        /[\u0400-\u04FF]/, // Caracteres cirílicos (homoglyph)
        /[^a-zA-Z0-9-.]/, // Caracteres extraños
    ];

    const warnings = [];
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
            warnings.push(`URL contiene patrón sospechoso: ${pattern}`);
        }
    }

    return warnings;
}

function formatResults(results) {
    let output = '';
    output += `🔍 URL Shortener Expander - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';

    if (Array.isArray(results)) {
        output += `📋 Total URLs: ${results.length}\n\n`;
        for (const result of results) {
            output += formatSingleResult(result);
        }
    } else {
        output += formatSingleResult(results);
    }

    return output;
}

function formatSingleResult(result) {
    let output = '';
    output += `📌 URL Original: ${result.originalUrl}\n`;
    output += `📌 URL Final: ${result.finalUrl}\n`;
    output += `📊 Código de estado: ${result.statusCode} ${result.statusMessage || ''}\n`;
    output += `🔄 Redirecciones: ${result.redirectCount}\n`;
    output += `🔗 Acortada: ${result.isShortened ? 'Sí' : 'No'}\n`;

    if (result.redirectCount > 0) {
        output += `\n📋 CADENA DE REDIRECCIONES:\n`;
        for (let i = 0; i < result.redirects.length; i++) {
            const r = result.redirects[i];
            output += `   ${i + 1}. ${r.url} → ${r.statusCode} ${r.statusMessage || ''}\n`;
        }
    }

    // Detectar phishing
    const warnings = detectPhishing(result.finalUrl);
    if (warnings.length > 0) {
        output += `\n⚠️ ADVERTENCIAS:\n`;
        for (const warning of warnings) {
            output += `   • ${warning}\n`;
        }
    }

    // Verificar si el destino usa HTTPS
    if (result.finalUrl.startsWith('http://')) {
        output += `\n⚠️ El destino usa HTTP (no seguro)\n`;
    }

    output += '\n' + '-'.repeat(40) + '\n';
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 URL Shortener Expander - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    let urls = [];

    if (listFile) {
        try {
            const content = fs.readFileSync(listFile, 'utf8');
            urls = content.split('\n')
                .map(l => l.trim())
                .filter(l => l && l.startsWith('http'));
            console.log(`📋 Cargadas ${urls.length} URLs desde ${listFile}`);
        } catch (error) {
            console.error(`❌ Error cargando lista: ${error.message}`);
            process.exit(1);
        }
    } else if (url) {
        urls.push(url);
    } else {
        console.error('❌ Debes especificar --url o --list');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    const results = [];
    let processed = 0;

    for (const u of urls) {
        processed++;
        console.log(`\n[${processed}/${urls.length}] Expandiendo: ${u}`);
        
        try {
            const result = await expandURL(u);
            results.push(result);
            console.log(`   ✅ → ${result.finalUrl}`);
            if (result.redirectCount > 0) {
                console.log(`   🔄 ${result.redirectCount} redirecciones`);
            }
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            results.push({
                originalUrl: u,
                error: error.message
            });
        }

        // Pequeña pausa para no saturar
        await new Promise(r => setTimeout(r, 200));
    }

    // Mostrar resultados
    console.log(formatResults(results));

    // Guardar resultados
    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            total: results.length,
            results
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Expansión completada');
})();
