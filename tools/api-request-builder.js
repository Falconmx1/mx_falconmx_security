#!/usr/bin/env node

/**
 * API Request Builder - MFH TOOLS PRO
 * Construye y prueba APIs REST
 * 
 * Uso: node api-request-builder.js [opciones]
 * Ejemplo: node api-request-builder.js --url https://api.github.com/users/octocat
 * Ejemplo: node api-request-builder.js --url https://httpbin.org/post --method POST --body '{"name":"test"}'
 * Ejemplo: node api-request-builder.js --url https://api.example.com --headers '{"Authorization":"Bearer token"}'
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    method: 'GET',
    headers: {},
    body: null,
    timeout: 30000,
    followRedirects: true,
    maxRedirects: 5
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let url = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--url':
        case '-u':
            url = args[i + 1];
            i++;
            break;
        case '--method':
        case '-m':
            CONFIG.method = args[i + 1].toUpperCase();
            i++;
            break;
        case '--headers':
        case '-h':
            try {
                CONFIG.headers = JSON.parse(args[i + 1]);
            } catch (error) {
                // Si no es JSON, intentar parsear como key:value
                const pairs = args[i + 1].split(',');
                for (const pair of pairs) {
                    const [key, value] = pair.split(':').map(s => s.trim());
                    if (key && value) {
                        CONFIG.headers[key] = value;
                    }
                }
            }
            i++;
            break;
        case '--body':
        case '-b':
            try {
                CONFIG.body = JSON.parse(args[i + 1]);
            } catch (error) {
                CONFIG.body = args[i + 1];
            }
            i++;
            break;
        case '--body-file':
            const bodyFile = args[i + 1];
            try {
                CONFIG.body = JSON.parse(fs.readFileSync(bodyFile, 'utf8'));
            } catch (error) {
                CONFIG.body = fs.readFileSync(bodyFile, 'utf8');
            }
            i++;
            break;
        case '--timeout':
            CONFIG.timeout = parseInt(args[i + 1]) * 1000;
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
        case '--no-follow':
            CONFIG.followRedirects = false;
            break;
        case '--help':
            console.log(`
🔍 API Request Builder - MFH TOOLS PRO
=======================================
Construye y prueba APIs REST.

Uso:
  node api-request-builder.js [opciones]

Opciones:
  --url, -u <url>          URL de la API
  --method, -m <método>    Método HTTP (GET, POST, PUT, DELETE, etc.)
  --headers, -h <json>     Headers en formato JSON o key:value,key2:value2
  --body, -b <json>        Body en formato JSON o texto
  --body-file <archivo>    Body desde archivo
  --timeout <segundos>     Timeout en segundos
  --output, -o <archivo>   Guardar respuesta en archivo
  --verbose, -v            Mostrar más detalles
  --no-follow              No seguir redirecciones
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node api-request-builder.js --url https://api.github.com/users/octocat
  node api-request-builder.js --url https://httpbin.org/post --method POST --body '{"name":"test"}'
  node api-request-builder.js --url https://api.example.com --headers '{"Authorization":"Bearer token"}'
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function parseUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        return {
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            search: parsed.search,
            hash: parsed.hash
        };
    } catch (error) {
        console.error(`❌ URL inválida: ${urlString}`);
        process.exit(1);
    }
}

function formatHeaders(headers) {
    const formatted = {};
    for (const [key, value] of Object.entries(headers)) {
        // Convertir a formato HTTP header
        const headerKey = key.split('-').map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('-');
        formatted[headerKey] = value;
    }
    return formatted;
}

function formatResponse(response, raw = false) {
    if (raw) {
        return response;
    }
    
    try {
        // Intentar parsear como JSON
        return JSON.parse(response);
    } catch (error) {
        // Si no es JSON, devolver como texto
        return response;
    }
}

function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const parsed = parseUrl(options.url);
        const httpModule = parsed.protocol === 'https:' ? https : http;
        
        const requestOptions = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.path,
            method: options.method,
            headers: formatHeaders(options.headers),
            timeout: options.timeout,
            rejectUnauthorized: false // Permitir certificados autofirmados
        };
        
        if (verbose) {
            console.log(`📡 ${options.method} ${options.url}`);
            console.log(`📋 Headers:`, requestOptions.headers);
            if (options.body) {
                console.log(`📦 Body:`, options.body);
            }
        }
        
        const req = httpModule.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const response = {
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers,
                    body: data,
                    parsedBody: formatResponse(data)
                };
                
                // Seguir redirecciones
                if (options.followRedirects && 
                    [301, 302, 303, 307, 308].includes(res.statusCode) && 
                    res.headers.location) {
                    if (options.redirectCount >= options.maxRedirects) {
                        reject(new Error('Demasiadas redirecciones'));
                        return;
                    }
                    
                    let redirectUrl = res.headers.location;
                    if (!redirectUrl.startsWith('http')) {
                        // URL relativa
                        const base = `${parsed.protocol}//${parsed.hostname}`;
                        redirectUrl = new URL(redirectUrl, base).href;
                    }
                    
                    if (verbose) {
                        console.log(`↗️ Redirigiendo a: ${redirectUrl}`);
                    }
                    
                    makeRequest({
                        ...options,
                        url: redirectUrl,
                        redirectCount: (options.redirectCount || 0) + 1
                    }).then(resolve).catch(reject);
                    return;
                }
                
                resolve(response);
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout después de ${options.timeout}ms`));
        });
        
        // Enviar body
        if (options.body) {
            const bodyStr = typeof options.body === 'object' ? 
                JSON.stringify(options.body) : options.body;
            req.write(bodyStr);
        }
        
        req.end();
    });
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 API Request Builder - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (!url) {
        console.error('❌ Debes especificar una URL con --url');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }
    
    try {
        // Agregar headers por defecto
        if (!CONFIG.headers['User-Agent']) {
            CONFIG.headers['User-Agent'] = 'MFH-API-Request-Builder/1.0';
        }
        
        if (CONFIG.body && typeof CONFIG.body === 'object') {
            if (!CONFIG.headers['Content-Type']) {
                CONFIG.headers['Content-Type'] = 'application/json';
            }
        }
        
        const startTime = Date.now();
        const response = await makeRequest({
            url,
            method: CONFIG.method,
            headers: CONFIG.headers,
            body: CONFIG.body,
            timeout: CONFIG.timeout,
            followRedirects: CONFIG.followRedirects,
            maxRedirects: CONFIG.maxRedirects,
            redirectCount: 0
        });
        
        const duration = Date.now() - startTime;
        
        console.log(`\n✅ REQUEST COMPLETADA (${duration}ms)`);
        console.log('='.repeat(40));
        console.log(`📌 Status: ${response.statusCode} ${response.statusMessage}`);
        console.log(`📋 Headers:`);
        for (const [key, value] of Object.entries(response.headers)) {
            console.log(`   ${key}: ${value}`);
        }
        
        if (response.body) {
            console.log(`\n📦 Body:`);
            if (typeof response.parsedBody === 'object') {
                console.log(JSON.stringify(response.parsedBody, null, 2));
            } else {
                console.log(response.body);
            }
        }
        
        // Guardar salida
        if (outputFile) {
            const output = {
                request: {
                    url,
                    method: CONFIG.method,
                    headers: CONFIG.headers,
                    body: CONFIG.body
                },
                response: {
                    statusCode: response.statusCode,
                    statusMessage: response.statusMessage,
                    headers: response.headers,
                    body: response.body,
                    parsedBody: response.parsedBody,
                    duration
                }
            };
            
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Respuesta guardada en: ${outputFile}`);
        }
        
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
