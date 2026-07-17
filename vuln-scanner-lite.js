#!/usr/bin/env node

/**
 * Vuln Scanner Lite - MFH TOOLS PRO
 * Detecta vulnerabilidades comunes en servicios web: SQLi, XSS, LFI, etc.
 * 
 * Uso: node vuln-scanner-lite.js <url>
 * Ejemplo: node vuln-scanner-lite.js https://ejemplo.com
 * Ejemplo: node vuln-scanner-lite.js http://192.168.1.100:8080
 */

const https = require('https');
const http = require('http');
const url = require('url');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    userAgent: 'MFH-VulnScanner/1.0',
    testPayloads: {
        sqli: ["'", "\"", "1' OR '1'='1", "1\" OR \"1\"=\"1", "' OR 1=1--", "' UNION SELECT NULL--"],
        xss: ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "javascript:alert(1)"],
        lfi: ["../../etc/passwd", "..\\..\\windows\\win.ini", "../../../etc/passwd"],
        openRedirect: ["//google.com", "https://google.com", "/\\google.com"],
        pathTraversal: ["../", "..\\", "../../", "..\\..\\"]
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error(`
🔍 Vuln Scanner Lite - MFH TOOLS PRO

Uso: node vuln-scanner-lite.js <url>

Ejemplos:
  node vuln-scanner-lite.js https://ejemplo.com
  node vuln-scanner-lite.js http://192.168.1.100:8080
  node vuln-scanner-lite.js https://target.com/page?id=1
`);
    process.exit(1);
}

const targetUrl = args[0];

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
                'User-Agent': CONFIG.userAgent
            }
        };
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data.slice(0, 2000),
                    url: testUrl.toString()
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
function detectVulnerabilities(response, payload, vulnType) {
    const indicators = {
        sqli: ['error in your sql syntax', 'mysql_fetch', 'sqlite3', 'sql error', 'odbc', 'microsoft ole db', 'db2', 'postgresql error'],
        xss: ['<script>alert(1)</script>', 'onerror=alert(1)'],
        lfi: ['root:x:', 'boot.ini', '[extensions]', '; for 16-bit app support'],
        openRedirect: ['location', 'redirect', 'href', 'window.location'],
        pathTraversal: ['No such file', 'File not found', 'Cannot find']
    };
    
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
        if (location.includes('google.com') || location.startsWith('//')) {
            return true;
        }
    }
    
    return false;
}

// ==================== ESCANEAR ====================
async function scan(target) {
    console.log(`🔍 Escaneando: ${target}`);
    console.log('='.repeat(50));
    
    const parsedUrl = new URL(target);
    const results = {
        target,
        vulnerabilities: [],
        info: {}
    };
    
    // Obtener información básica
    console.log('📡 Obteniendo información básica...');
    const baseResponse = await makeRequest(target, '', null);
    results.info.statusCode = baseResponse.statusCode || 'Error';
    results.info.server = baseResponse.headers?.['server'] || 'Desconocido';
    results.info.contentType = baseResponse.headers?.['content-type'] || 'Desconocido';
    
    console.log(`   Servidor: ${results.info.server}`);
    console.log(`   Código: ${results.info.statusCode}`);
    console.log(`   Content-Type: ${results.info.contentType}`);
    console.log('');
    
    // Obtener parámetros de la URL
    const params = [];
    for (const [key, value] of parsedUrl.searchParams) {
        params.push(key);
    }
    
    if (params.length === 0) {
        console.log('⚠️ No se encontraron parámetros en la URL');
        console.log('   Probando con parámetros comunes...');
        params.push('id', 'page', 'q', 's', 'search', 'cat', 'prod', 'user');
    }
    
    console.log(`📋 Parámetros a probar: ${params.join(', ')}`);
    console.log('');
    
    // Probar vulnerabilidades
    for (const vulnType of Object.keys(CONFIG.testPayloads)) {
        const payloads = CONFIG.testPayloads[vulnType];
        let detected = false;
        
        for (const param of params) {
            if (detected) break;
            
            for (const payload of payloads) {
                if (detected) break;
                
                const response = await makeRequest(target, payload, param);
                
                if (response.error) {
                    console.log(`   ⚠️ Error probando ${vulnType} en ${param}: ${response.error}`);
                    continue;
                }
                
                const isVulnerable = detectVulnerabilities(response, payload, vulnType);
                
                if (isVulnerable) {
                    results.vulnerabilities.push({
                        type: vulnType,
                        param,
                        payload,
                        url: response.url
                    });
                    detected = true;
                    console.log(`   🔴 ${vulnType.toUpperCase()} detectada en ${param}`);
                    console.log(`      Payload: ${payload}`);
                    console.log(`      URL: ${response.url}`);
                }
            }
        }
        
        if (!detected) {
            console.log(`   ✅ ${vulnType.toUpperCase()} no detectada`);
        }
    }
    
    // Resumen
    console.log('');
    console.log('='.repeat(50));
    console.log('📊 RESUMEN DEL ESCANEO');
    console.log('='.repeat(50));
    console.log(`🎯 Objetivo: ${target}`);
    console.log(`🔍 Vulnerabilidades encontradas: ${results.vulnerabilities.length}`);
    
    if (results.vulnerabilities.length > 0) {
        console.log('\n⚠️ VULNERABILIDADES DETECTADAS:');
        results.vulnerabilities.forEach(v => {
            console.log(`   - ${v.type.toUpperCase()} en ${v.param}`);
            console.log(`     Payload: ${v.payload}`);
        });
    } else {
        console.log('\n✅ No se detectaron vulnerabilidades comunes');
    }
    
    // Guardar reporte
    const fs = require('fs');
    const reportFile = `vuln_report_${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📁 Reporte guardado en: ${reportFile}`);
    
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
