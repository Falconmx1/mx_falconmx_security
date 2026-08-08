#!/usr/bin/env node

/**
 * CORS Misconfiguration Scanner - MFH TOOLS PRO
 * Detecta configuraciones CORS inseguras en dominios
 * 
 * Uso: node cors-scanner.js [opciones]
 * Ejemplo: node cors-scanner.js --url https://ejemplo.com
 * Ejemplo: node cors-scanner.js --url https://ejemplo.com --origins "https://malicioso.com,https://otro.com"
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let url = null;
let customOrigins = [];
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--url':
        case '-u':
            url = args[i + 1];
            i++;
            break;
        case '--origins':
        case '-o':
            customOrigins = args[i + 1].split(',').map(s => s.trim());
            i++;
            break;
        case '--output':
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
🔍 CORS Misconfiguration Scanner - MFH TOOLS PRO
=================================================
Detecta configuraciones CORS inseguras.

Uso:
  node cors-scanner.js [opciones]

Opciones:
  --url, -u <url>          URL del sitio a escanear
  --origins, -o <lista>    Orígenes personalizados (separados por coma)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node cors-scanner.js --url https://ejemplo.com
  node cors-scanner.js --url https://ejemplo.com --origins "https://malicioso.com,https://otro.com"
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
            path: parsed.pathname || '/',
            origin: `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`
        };
    } catch (error) {
        console.error(`❌ URL inválida: ${urlString}`);
        process.exit(1);
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
            method: options.method || 'GET',
            headers: {
                'User-Agent': CONFIG.userAgent,
                ...options.headers
            },
            timeout: CONFIG.timeout,
            rejectUnauthorized: false
        };

        if (verbose) {
            console.log(`📡 ${requestOptions.method} ${options.url}`);
        }

        const req = httpModule.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

function analyzeCORS(response) {
    const results = {
        url: response.url,
        vulnerabilities: [],
        misconfigurations: [],
        recommendations: []
    };

    const headers = response.headers || {};

    // Verificar Access-Control-Allow-Origin
    const acao = headers['access-control-allow-origin'];
    if (acao) {
        results.acaHeader = acao;

        if (acao === '*') {
            results.vulnerabilities.push({
                severity: 'HIGH',
                issue: 'Access-Control-Allow-Origin: *',
                description: 'Permite cualquier origen, lo que puede llevar a ataques de CSRF y exfiltración de datos',
                cwe: 'CWE-942'
            });
            results.recommendations.push('Especificar orígenes permitidos en lugar de "*"');
        } else if (acao.includes('null')) {
            results.vulnerabilities.push({
                severity: 'MEDIUM',
                issue: 'Access-Control-Allow-Origin: null',
                description: 'Permite orígenes nulos, que pueden ser explotados por iframes en sandbox',
                cwe: 'CWE-942'
            });
            results.recommendations.push('Eliminar "null" de los orígenes permitidos');
        } else if (acao.includes(response.hostname)) {
            results.misconfigurations.push({
                severity: 'LOW',
                issue: 'CORS permite el origen propio',
                description: 'El origen del dominio está permitido, lo cual es normal pero debe ser verificado'
            });
        }
    } else {
        results.misconfigurations.push({
            severity: 'LOW',
            issue: 'No se encontró Access-Control-Allow-Origin',
            description: 'El sitio no tiene configurado CORS, lo cual es seguro para la mayoría de los casos'
        });
        results.recommendations.push('Si necesitas CORS, configúralo explícitamente con los orígenes permitidos');
    }

    // Verificar Access-Control-Allow-Credentials
    const acac = headers['access-control-allow-credentials'];
    if (acac === 'true' && acao === '*') {
        results.vulnerabilities.push({
            severity: 'CRITICAL',
            issue: 'Access-Control-Allow-Credentials: true con ACAO: *',
            description: 'Permite credenciales con cualquier origen, combinación peligrosa',
            cwe: 'CWE-942'
        });
        results.recommendations.push('No usar Access-Control-Allow-Credentials con Access-Control-Allow-Origin: *');
    }

    // Verificar Access-Control-Allow-Methods
    const acam = headers['access-control-allow-methods'];
    if (acam && acam.includes('*')) {
        results.misconfigurations.push({
            severity: 'MEDIUM',
            issue: 'Access-Control-Allow-Methods: *',
            description: 'Permite todos los métodos HTTP, puede ser riesgoso',
            cwe: 'CWE-942'
        });
        results.recommendations.push('Especificar métodos permitidos explícitamente (GET, POST, etc.)');
    }

    // Verificar Access-Control-Expose-Headers
    const aceh = headers['access-control-expose-headers'];
    if (aceh && aceh.includes('*')) {
        results.misconfigurations.push({
            severity: 'LOW',
            issue: 'Access-Control-Expose-Headers: *',
            description: 'Expone todas las cabeceras, puede revelar información sensible'
        });
        results.recommendations.push('Especificar cabeceras a exponer explícitamente');
    }

    // Verificar Access-Control-Max-Age
    const acma = headers['access-control-max-age'];
    if (acma && parseInt(acma) > 86400) {
        results.misconfigurations.push({
            severity: 'LOW',
            issue: 'Access-Control-Max-Age muy alto',
            description: `Max-Age: ${acma} segundos, puede cachear configuraciones inseguras por mucho tiempo`
        });
        results.recommendations.push('Usar un Max-Age razonable (ej: 3600 segundos)');
    }

    // Calcular puntuación de riesgo
    const riskScores = {
        'CRITICAL': 10,
        'HIGH': 7,
        'MEDIUM': 4,
        'LOW': 1
    };

    let totalRisk = 0;
    for (const vuln of results.vulnerabilities) {
        totalRisk += riskScores[vuln.severity] || 0;
    }
    for (const misconfig of results.misconfigurations) {
        totalRisk += riskScores[misconfig.severity] || 0;
    }

    // Clasificar riesgo
    if (totalRisk >= 10) {
        results.riskLevel = 'CRITICAL';
    } else if (totalRisk >= 7) {
        results.riskLevel = 'HIGH';
    } else if (totalRisk >= 4) {
        results.riskLevel = 'MEDIUM';
    } else if (totalRisk >= 1) {
        results.riskLevel = 'LOW';
    } else {
        results.riskLevel = 'NONE';
    }

    return results;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 CORS Misconfiguration Scanner - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!url) {
        console.error('❌ Debes especificar una URL con --url');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        const parsed = parseUrl(url);

        // Primera petición (sin CORS)
        console.log(`\n📡 Escaneando: ${url}`);
        const response = await makeRequest({ url });

        if (verbose) {
            console.log(`📋 Status: ${response.statusCode}`);
            console.log(`📋 Headers:`, response.headers);
        }

        // Analizar CORS
        const results = analyzeCORS({
            ...response,
            url: url,
            hostname: parsed.hostname
        });

        // Mostrar resultados
        console.log('\n📊 RESULTADOS:');
        console.log(`   🔴 Nivel de riesgo: ${results.riskLevel}`);

        if (results.vulnerabilities.length > 0) {
            console.log('\n⚠️ VULNERABILIDADES ENCONTRADAS:');
            for (const vuln of results.vulnerabilities) {
                console.log(`   🔴 [${vuln.severity}] ${vuln.issue}`);
                console.log(`      ${vuln.description}`);
            }
        }

        if (results.misconfigurations.length > 0) {
            console.log('\n⚠️ MALAS CONFIGURACIONES:');
            for (const misconfig of results.misconfigurations) {
                console.log(`   ⚠️ [${misconfig.severity}] ${misconfig.issue}`);
                console.log(`      ${misconfig.description}`);
            }
        }

        if (results.recommendations.length > 0) {
            console.log('\n💡 RECOMENDACIONES:');
            for (const rec of results.recommendations) {
                console.log(`   ✅ ${rec}`);
            }
        }

        if (results.acaHeader) {
            console.log(`\n📋 Access-Control-Allow-Origin: ${results.acaHeader}`);
        }

        // Resumen
        console.log('\n📊 RESUMEN:');
        console.log(`   🔴 Vulnerabilidades: ${results.vulnerabilities.length}`);
        console.log(`   ⚠️ Malas configuraciones: ${results.misconfigurations.length}`);
        console.log(`   📋 Nivel de riesgo: ${results.riskLevel}`);

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                url,
                riskLevel: results.riskLevel,
                vulnerabilities: results.vulnerabilities,
                misconfigurations: results.misconfigurations,
                recommendations: results.recommendations,
                headers: response.headers,
                raw: results
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }

    console.log('\n✅ Escaneo completado');
})();
