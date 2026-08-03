#!/usr/bin/env node

/**
 * HTTP Status Checker - MFH TOOLS PRO
 * Verifica el estado HTTP de múltiples sitios web
 * 
 * Uso: node http-status-checker.js <url1> <url2> ... [opciones]
 * Ejemplo: node http-status-checker.js https://google.com https://github.com
 * Ejemplo: node http-status-checker.js --file urls.txt
 * Ejemplo: node http-status-checker.js https://google.com --timeout 3000
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const url = require('url');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    userAgent: 'MFH-HTTP-Status-Checker/1.0',
    maxConcurrent: 10
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let urls = [];
let filePath = null;
let timeout = CONFIG.timeout;
let outputFile = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 HTTP Status Checker - MFH TOOLS PRO
=======================================
Verifica el estado HTTP de múltiples sitios web.

Uso:
  node http-status-checker.js <url1> <url2> ... [opciones]
  node http-status-checker.js --file <archivo> [opciones]

Opciones:
  --file <archivo>      Archivo con lista de URLs (una por línea)
  --timeout <ms>        Timeout en milisegundos (default: 5000)
  --output <archivo>    Guardar resultados en archivo
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node http-status-checker.js https://google.com https://github.com
  node http-status-checker.js --file urls.txt --timeout 3000
  node http-status-checker.js https://google.com --output resultados.txt
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
        filePath = args[i + 1];
        i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
        timeout = parseInt(args[i + 1]) || CONFIG.timeout;
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    } else if (!args[i].startsWith('--')) {
        urls.push(args[i]);
    }
}

// ==================== FUNCIONES ====================
function loadUrlsFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo no encontrado: ${filePath}`);
        process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').map(u => u.trim()).filter(u => u);
}

function validateUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed;
    } catch (error) {
        return null;
    }
}

function normalizeUrl(urlString) {
    // Agregar protocolo si no tiene
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
        urlString = 'https://' + urlString;
    }
    return urlString;
}

function checkUrlStatus(urlString, timeoutMs, retries = 0) {
    return new Promise((resolve) => {
        const normalized = normalizeUrl(urlString);
        const parsed = validateUrl(normalized);
        
        if (!parsed) {
            return resolve({
                url: urlString,
                error: 'URL inválida',
                status: 'invalid'
            });
        }
        
        const isHttps = parsed.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'HEAD',
            timeout: timeoutMs,
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': '*/*'
            }
        };
        
        const startTime = Date.now();
        
        const req = client.request(options, (res) => {
            const endTime = Date.now();
            resolve({
                url: urlString,
                statusCode: res.statusCode,
                statusMessage: res.statusMessage || 'OK',
                headers: res.headers,
                time: endTime - startTime,
                ok: res.statusCode >= 200 && res.statusCode < 400,
                redirect: res.statusCode >= 300 && res.statusCode < 400,
                redirectLocation: res.headers.location || null
            });
        });
        
        req.on('error', (err) => {
            if (retries < 2) {
                // Reintentar
                setTimeout(() => {
                    checkUrlStatus(urlString, timeoutMs, retries + 1).then(resolve);
                }, 500);
            } else {
                resolve({
                    url: urlString,
                    error: err.message,
                    status: 'error'
                });
            }
        });
        
        req.on('timeout', () => {
            req.destroy();
            if (retries < 2) {
                setTimeout(() => {
                    checkUrlStatus(urlString, timeoutMs, retries + 1).then(resolve);
                }, 500);
            } else {
                resolve({
                    url: urlString,
                    error: 'Timeout',
                    status: 'timeout'
                });
            }
        });
        
        req.end();
    });
}

function getStatusEmoji(statusCode) {
    if (!statusCode) return '❓';
    if (statusCode >= 200 && statusCode < 300) return '🟢';
    if (statusCode >= 300 && statusCode < 400) return '🟡';
    if (statusCode >= 400 && statusCode < 500) return '🟠';
    if (statusCode >= 500 && statusCode < 600) return '🔴';
    return '❓';
}

function getStatusCategory(statusCode) {
    if (!statusCode) return 'Desconocido';
    if (statusCode >= 200 && statusCode < 300) return 'Éxito (2xx)';
    if (statusCode >= 300 && statusCode < 400) return 'Redirección (3xx)';
    if (statusCode >= 400 && statusCode < 500) return 'Error Cliente (4xx)';
    if (statusCode >= 500 && statusCode < 600) return 'Error Servidor (5xx)';
    return 'Desconocido';
}

function getStatusDescription(statusCode) {
    const descriptions = {
        200: 'OK',
        201: 'Creado',
        204: 'Sin contenido',
        301: 'Movido permanentemente',
        302: 'Encontrado',
        303: 'Ver otro',
        304: 'No modificado',
        307: 'Redirección temporal',
        308: 'Redirección permanente',
        400: 'Petición incorrecta',
        401: 'No autorizado',
        403: 'Prohibido',
        404: 'No encontrado',
        405: 'Método no permitido',
        408: 'Timeout',
        429: 'Demasiadas peticiones',
        500: 'Error interno del servidor',
        502: 'Bad Gateway',
        503: 'Servicio no disponible',
        504: 'Gateway Timeout'
    };
    return descriptions[statusCode] || 'Código desconocido';
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 HTTP Status Checker - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        
        // Cargar URLs
        let allUrls = [];
        if (filePath) {
            allUrls = loadUrlsFromFile(filePath);
            console.log(`📋 Cargadas ${allUrls.length} URLs desde ${filePath}`);
        } else if (urls.length > 0) {
            allUrls = urls;
            console.log(`📋 Verificando ${allUrls.length} URLs`);
        } else {
            console.error('❌ No se especificaron URLs');
            process.exit(1);
        }
        
        console.log(`⏱️ Timeout: ${timeout}ms`);
        console.log('');
        
        // Verificar cada URL
        const results = [];
        let online = 0;
        let offline = 0;
        let errors = 0;
        let redirects = 0;
        
        console.log('🔍 Verificando estados HTTP...');
        console.log('='.repeat(60));
        
        // Procesar en lotes para no sobrecargar
        for (let i = 0; i < allUrls.length; i += CONFIG.maxConcurrent) {
            const batch = allUrls.slice(i, i + CONFIG.maxConcurrent);
            const batchPromises = batch.map(url => checkUrlStatus(url, timeout));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Mostrar resultados en tiempo real
            batchResults.forEach(result => {
                const emoji = getStatusEmoji(result.statusCode);
                let statusText = '';
                if (result.error) {
                    statusText = `❌ ${result.error}`;
                } else {
                    statusText = `${result.statusCode} ${result.statusMessage}`;
                }
                
                console.log(`   ${emoji} ${result.url.substring(0, 50)}${result.url.length > 50 ? '...' : ''} → ${statusText}`);
            });
        }
        
        // Estadísticas
        const total = results.length;
        results.forEach(r => {
            if (r.error) errors++;
            else if (r.statusCode >= 200 && r.statusCode < 300) online++;
            else if (r.statusCode >= 300 && r.statusCode < 400) redirects++;
            else offline++;
        });
        
        console.log('');
        console.log('📊 RESUMEN');
        console.log('='.repeat(60));
        console.log(`   ✅ En línea (2xx): ${online}`);
        console.log(`   🟡 Redirecciones (3xx): ${redirects}`);
        console.log(`   ❌ Errores Cliente (4xx): ${offline}`);
        console.log(`   ❌ Errores Servidor (5xx): ${offline}`);
        console.log(`   ❌ Errores de conexión: ${errors}`);
        console.log(`   📡 Total verificadas: ${total}`);
        
        // Detalles
        if (online > 0 || redirects > 0) {
            console.log('\n📋 DETALLES DE URLs EXITOSAS:');
            results.filter(r => !r.error && r.statusCode < 400).forEach(r => {
                console.log(`   ✅ ${r.url} → ${r.statusCode} (${r.time}ms)`);
                if (r.redirect) {
                    console.log(`      🔄 Redirección a: ${r.redirectLocation}`);
                }
            });
        }
        
        if (offline > 0 || errors > 0) {
            console.log('\n📋 DETALLES DE URLs FALLIDAS:');
            results.filter(r => r.error || r.statusCode >= 400).forEach(r => {
                if (r.error) {
                    console.log(`   ❌ ${r.url} → ${r.error}`);
                } else {
                    console.log(`   ❌ ${r.url} → ${r.statusCode} ${getStatusDescription(r.statusCode)}`);
                }
            });
        }
        
        // Recomendaciones
        console.log('\n🔹 RECOMENDACIONES:');
        if (online > 0) {
            console.log(`   ✅ ${online} sitios en línea funcionando correctamente`);
        }
        if (redirects > 0) {
            console.log(`   🟡 ${redirects} sitios con redirecciones - Revisar que sean correctas`);
        }
        if (offline > 0) {
            console.log(`   🔴 ${offline} sitios con errores - Investigar causas`);
        }
        if (errors > 0) {
            console.log(`   🔴 ${errors} sitios no accesibles - Revisar conectividad`);
        }
        
        // Guardar resultados
        if (outputFile) {
            const content = results.map(r => {
                if (r.error) {
                    return `${r.url} | ERROR | ${r.error}`;
                }
                return `${r.url} | ${r.statusCode} | ${r.statusMessage} | ${r.time}ms`;
            }).join('\n');
            fs.writeFileSync(outputFile, content);
            console.log(`\n📁 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ HTTP Status Checker completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
