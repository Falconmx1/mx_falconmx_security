#!/usr/bin/env node

/**
 * HTTP Request Builder - MFH TOOLS PRO
 * Construye y envía peticiones HTTP personalizadas
 * 
 * Uso: node http-request-builder.js <url> [opciones]
 * Ejemplo: node http-request-builder.js https://google.com
 * Ejemplo: node http-request-builder.js https://api.example.com --method POST --body '{"key":"value"}'
 * Ejemplo: node http-request-builder.js https://google.com --headers '{"User-Agent":"Custom"}'
 */

const https = require('https');
const http = require('http');
const url = require('url');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let targetUrl = null;
let method = 'GET';
let body = null;
let headers = {};
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 HTTP Request Builder - MFH TOOLS PRO
=========================================
Construye y envía peticiones HTTP personalizadas.

Uso:
  node http-request-builder.js <url> [opciones]

Opciones:
  --method <GET|POST|PUT|DELETE|PATCH>  Método HTTP (default: GET)
  --body <texto>                        Cuerpo de la petición
  --headers <json>                      Cabeceras en formato JSON
  --verbose                             Mostrar más detalles
  --help                                Mostrar esta ayuda

Ejemplos:
  node http-request-builder.js https://google.com
  node http-request-builder.js https://api.example.com --method POST --body '{"key":"value"}'
  node http-request-builder.js https://google.com --headers '{"User-Agent":"Custom"}'
`);
    process.exit(1);
}

targetUrl = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--method' && args[i + 1]) {
        method = args[i + 1].toUpperCase();
        i++;
    } else if (args[i] === '--body' && args[i + 1]) {
        body = args[i + 1];
        i++;
    } else if (args[i] === '--headers' && args[i + 1]) {
        try {
            headers = JSON.parse(args[i + 1]);
        } catch (e) {
            console.error('❌ Error al parsear headers (deben ser JSON válido)');
            process.exit(1);
        }
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function sendRequest(targetUrl, method, headers, body) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(targetUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'User-Agent': 'MFH-HTTP-Request-Builder/1.0',
                'Accept': '*/*',
                ...headers
            }
        };
        
        if (body) {
            options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }
        
        const startTime = Date.now();
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const endTime = Date.now();
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers,
                    body: data,
                    time: endTime - startTime,
                    url: targetUrl,
                    method: method
                });
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        
        if (body) {
            req.write(body);
        }
        
        req.end();
    });
}

function formatHeaders(headers) {
    return Object.entries(headers)
        .map(([key, value]) => `   ${key}: ${value}`)
        .join('\n');
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 HTTP Request Builder - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📡 URL: ${targetUrl}`);
        console.log(`📝 Método: ${method}`);
        console.log('');
        
        if (verbose) {
            console.log('📋 CABECERAS:');
            console.log(formatHeaders(headers));
            console.log('');
        }
        
        console.log('🚀 Enviando petición...');
        const response = await sendRequest(targetUrl, method, headers, body);
        
        console.log('');
        console.log('📊 RESPUESTA:');
        console.log(`   Código: ${response.statusCode} ${response.statusMessage}`);
        console.log(`   Tiempo: ${response.time}ms`);
        console.log(`   Tamaño: ${response.body.length} caracteres`);
        
        console.log('\n📋 CABECERAS DE RESPUESTA:');
        console.log(formatHeaders(response.headers));
        
        if (response.body) {
            const preview = response.body.length > 500 ? response.body.substring(0, 500) + '...' : response.body;
            console.log('\n📝 CUERPO DE RESPUESTA (preview):');
            console.log('   ' + preview.replace(/\n/g, '\n   '));
        }
        
        console.log('\n✅ HTTP Request Builder completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
