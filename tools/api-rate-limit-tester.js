#!/usr/bin/env node

/**
 * API Rate Limit Tester - MFH TOOLS PRO
 * Prueba límites de rate limiting en APIs
 * 
 * Uso: node api-rate-limit-tester.js [opciones]
 * Ejemplo: node api-rate-limit-tester.js --url https://api.example.com --requests 100
 * Ejemplo: node api-rate-limit-tester.js --url https://api.example.com --requests 50 --interval 100
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    defaultRequests: 50,
    defaultInterval: 100, // ms entre requests
    timeout: 5000,
    userAgent: 'MFH-API-Rate-Limit-Tester/1.0'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let url = null;
let method = 'GET';
let requests = CONFIG.defaultRequests;
let interval = CONFIG.defaultInterval;
let outputFile = null;
let verbose = false;
let headers = {};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--url':
        case '-u':
            url = args[i + 1];
            i++;
            break;
        case '--method':
        case '-m':
            method = args[i + 1].toUpperCase();
            i++;
            break;
        case '--requests':
        case '-r':
            requests = parseInt(args[i + 1]);
            i++;
            break;
        case '--interval':
        case '-i':
            interval = parseInt(args[i + 1]);
            i++;
            break;
        case '--headers':
        case '-h':
            try {
                headers = JSON.parse(args[i + 1]);
            } catch (error) {
                // Parsear formato key=value,key2=value2
                const pairs = args[i + 1].split(',');
                for (const pair of pairs) {
                    const [key, value] = pair.split('=').map(s => s.trim());
                    if (key && value) {
                        headers[key] = value;
                    }
                }
            }
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
🔍 API Rate Limit Tester - MFH TOOLS PRO
=========================================
Prueba límites de rate limiting en APIs.

Uso:
  node api-rate-limit-tester.js [opciones]

Opciones:
  --url, -u <url>          URL de la API
  --method, -m <método>    Método HTTP (GET, POST, etc.)
  --requests, -r <n>       Número de requests (default: 50)
  --interval, -i <ms>      Intervalo entre requests (default: 100ms)
  --headers, -h <json>     Headers en formato JSON o key=value,key2=value2
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help                   Mostrar esta ayuda

Ejemplos:
  node api-rate-limit-tester.js --url https://api.example.com --requests 100
  node api-rate-limit-tester.js --url https://api.example.com --requests 50 --interval 100
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function makeRequest(url, method, headers) {
    return new Promise((resolve) => {
        const parsedUrl = new URL(url);
        const httpModule = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'User-Agent': CONFIG.userAgent,
                ...headers
            },
            timeout: CONFIG.timeout
        };

        const startTime = Date.now();
        const req = httpModule.request(options, (res) => {
            const endTime = Date.now();
            
            // Leer headers de rate limiting
            const rateLimit = {
                limit: res.headers['x-ratelimit-limit'] || res.headers['ratelimit-limit'],
                remaining: res.headers['x-ratelimit-remaining'] || res.headers['ratelimit-remaining'],
                reset: res.headers['x-ratelimit-reset'] || res.headers['ratelimit-reset'],
                retryAfter: res.headers['retry-after']
            };

            resolve({
                success: true,
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                headers: res.headers,
                rateLimit,
                time: endTime - startTime
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message,
                time: Date.now() - startTime
            });
        });

        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatResults(results) {
    let output = '';
    output += `🔍 API Rate Limit Tester - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    output += `📡 URL: ${results.url}\n`;
    output += `📋 Método: ${results.method}\n`;
    output += `📊 Requests: ${results.totalRequests}\n`;
    output += `⏱️ Intervalo: ${results.interval}ms\n`;
    output += `📦 Headers: ${JSON.stringify(results.headers || {}, null, 2)}\n\n`;

    // Estadísticas
    const successful = results.results.filter(r => r.success);
    const failed = results.results.filter(r => !r.success);
    const statusCodes = {};
    
    for (const r of successful) {
        statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
    }

    output += `📊 ESTADÍSTICAS:\n`;
    output += `   ✅ Éxitos: ${successful.length}\n`;
    output += `   ❌ Fallos: ${failed.length}\n`;
    output += `   📋 Tasa de éxito: ${(successful.length / results.totalRequests * 100).toFixed(1)}%\n`;
    output += `   ⏱️ Tiempo promedio: ${(results.results.reduce((sum, r) => sum + r.time, 0) / results.results.length).toFixed(0)}ms\n`;
    
    if (Object.keys(statusCodes).length > 0) {
        output += `   📌 Códigos de estado:\n`;
        for (const [code, count] of Object.entries(statusCodes)) {
            const emoji = code < 300 ? '✅' : code < 400 ? '🔄' : '❌';
            output += `      ${emoji} ${code}: ${count}\n`;
        }
    }

    // Headers de rate limiting (del primer request)
    const firstSuccess = results.results.find(r => r.success && r.rateLimit);
    if (firstSuccess && firstSuccess.rateLimit) {
        output += `\n📋 RATE LIMITING DETECTADO:\n`;
        if (firstSuccess.rateLimit.limit) {
            output += `   📊 Límite: ${firstSuccess.rateLimit.limit}\n`;
        }
        if (firstSuccess.rateLimit.remaining) {
            output += `   📊 Restantes: ${firstSuccess.rateLimit.remaining}\n`;
        }
        if (firstSuccess.rateLimit.reset) {
            output += `   ⏰ Reset: ${new Date(parseInt(firstSuccess.rateLimit.reset) * 1000).toLocaleString()}\n`;
        }
        if (firstSuccess.rateLimit.retryAfter) {
            output += `   ⏳ Retry-After: ${firstSuccess.rateLimit.retryAfter}s\n`;
        }
    }

    // Análisis de rate limiting
    const rateLimited = results.results.filter(r => r.success && r.statusCode === 429);
    if (rateLimited.length > 0) {
        output += `\n🛑 RATE LIMITING ACTIVO:\n`;
        output += `   ${rateLimited.length} requests fueron rate-limited (429)\n`;
        output += `   🔴 Primer rate-limit en request #${results.results.indexOf(rateLimited[0]) + 1}\n`;
    }

    // Análisis de patrón
    output += `\n📈 ANÁLISIS DE PATRÓN:\n`;
    
    // Buscar degradación
    const times = results.results.filter(r => r.success).map(r => r.time);
    if (times.length > 1) {
        const avgFirst = times.slice(0, Math.min(10, times.length)).reduce((a, b) => a + b, 0) / Math.min(10, times.length);
        const avgLast = times.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, times.length);
        if (avgLast > avgFirst * 1.5) {
            output += `   ⚠️ Degradación detectada (${avgFirst.toFixed(0)}ms → ${avgLast.toFixed(0)}ms)\n`;
        } else {
            output += `   ✅ Rendimiento estable (${avgFirst.toFixed(0)}ms promedio)\n`;
        }
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 API Rate Limit Tester - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!url) {
        console.error('❌ Debes especificar una URL con --url');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    console.log(`\n🚀 Iniciando prueba de rate limiting`);
    console.log(`📡 URL: ${url}`);
    console.log(`📊 Requests: ${requests}`);
    console.log(`⏱️ Intervalo: ${interval}ms`);

    const results = {
        url,
        method,
        headers,
        interval,
        totalRequests: requests,
        results: []
    };

    let rateLimited = false;
    let rateLimitCount = 0;

    for (let i = 0; i < requests; i++) {
        // Verificar si hay que detenerse
        if (rateLimitCount > 10) {
            console.log(`\n🛑 Demasiados rate-limits (${rateLimitCount}), deteniendo prueba`);
            break;
        }

        if (verbose || i % 10 === 0) {
            console.log(`📡 Request ${i + 1}/${results.totalRequests}`);
        }

        const response = await makeRequest(url, method, headers);
        results.results.push(response);

        if (response.success && response.statusCode === 429) {
            rateLimited = true;
            rateLimitCount++;
            
            if (response.rateLimit && response.rateLimit.retryAfter) {
                const waitTime = parseInt(response.rateLimit.retryAfter) * 1000;
                if (verbose) {
                    console.log(`   ⏳ Rate limited, esperando ${waitTime}ms`);
                }
                await sleep(Math.min(waitTime, 5000));
            }
        }

        // Esperar antes del siguiente request (excepto el último)
        if (i < requests - 1) {
            await sleep(interval);
        }
    }

    // Mostrar resultados
    console.log(formatResults(results));

    // Guardar resultados
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Prueba completada');
})();
