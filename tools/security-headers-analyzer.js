#!/usr/bin/env node

/**
 * Security Headers Analyzer - MFH TOOLS PRO
 * Analiza cabeceras de seguridad (CSP, HSTS, X-Frame-Options, etc.)
 * 
 * Uso: node security-headers-analyzer.js [opciones]
 * Ejemplo: node security-headers-analyzer.js --url https://example.com
 * Ejemplo: node security-headers-analyzer.js --url https://example.com --output report.json
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    userAgent: 'MFH-Security-Headers-Analyzer/1.0'
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
🔍 Security Headers Analyzer - MFH TOOLS PRO
============================================
Analiza cabeceras de seguridad (CSP, HSTS, X-Frame-Options, etc.)

Uso:
  node security-headers-analyzer.js [opciones]

Opciones:
  --url, -u <url>          URL a analizar
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node security-headers-analyzer.js --url https://example.com
  node security-headers-analyzer.js --url https://example.com --output report.json
`);
            process.exit(0);
    }
}

// ==================== DEFINICIÓN DE CABECERAS ====================
const HEADER_CHECKS = {
    'Strict-Transport-Security': {
        name: 'HSTS (HTTP Strict Transport Security)',
        importance: 'HIGH',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            if (value.includes('max-age=')) {
                const maxAge = parseInt(value.match(/max-age=(\d+)/)?.[1] || 0);
                if (maxAge >= 31536000) {
                    result.score += 2;
                    result.recommendations.push('✅ max-age configurado correctamente (1 año)');
                } else if (maxAge >= 2592000) {
                    result.score += 1;
                    result.recommendations.push('⚠️ max-age recomendado: 31536000 (1 año)');
                } else {
                    result.recommendations.push('🔴 max-age muy bajo');
                }
            }
            if (value.includes('includeSubDomains')) {
                result.score += 1;
            }
            if (value.includes('preload')) {
                result.score += 1;
            }
            result.maxScore = 4;
            return result;
        }
    },
    'Content-Security-Policy': {
        name: 'CSP (Content Security Policy)',
        importance: 'HIGH',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            if (value.includes("'unsafe-inline'")) {
                result.recommendations.push('🔴 Evitar unsafe-inline en script-src');
            }
            if (value.includes("'unsafe-eval'")) {
                result.recommendations.push('🔴 Evitar unsafe-eval en script-src');
            }
            if (value.includes('default-src')) {
                result.score += 1;
                result.recommendations.push('✅ default-src configurado');
            }
            if (value.includes('script-src')) {
                result.score += 1;
                result.recommendations.push('✅ script-src configurado');
            }
            if (value.includes('style-src')) {
                result.score += 1;
                result.recommendations.push('✅ style-src configurado');
            }
            if (value.includes('img-src')) {
                result.score += 1;
                result.recommendations.push('✅ img-src configurado');
            }
            result.maxScore = 4;
            return result;
        }
    },
    'X-Frame-Options': {
        name: 'X-Frame-Options (Clickjacking Protection)',
        importance: 'HIGH',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            if (value === 'DENY') {
                result.score = 2;
                result.recommendations.push('✅ DENY - Mejor protección');
            } else if (value === 'SAMEORIGIN') {
                result.score = 1;
                result.recommendations.push('⚠️ SAMEORIGIN - Permitido en el mismo origen');
            } else if (value === 'ALLOW-FROM') {
                result.score = 0;
                result.recommendations.push('🔴 ALLOW-FROM - Obsoleto, usar DENY o SAMEORIGIN');
            }
            result.maxScore = 2;
            return result;
        }
    },
    'X-Content-Type-Options': {
        name: 'X-Content-Type-Options (MIME Sniffing)',
        importance: 'HIGH',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            if (value === 'nosniff') {
                result.score = 2;
                result.recommendations.push('✅ nosniff - Previene MIME sniffing');
            } else {
                result.recommendations.push('🔴 Debe ser "nosniff"');
            }
            result.maxScore = 2;
            return result;
        }
    },
    'Referrer-Policy': {
        name: 'Referrer-Policy',
        importance: 'MEDIUM',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            const goodPolicies = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
            if (goodPolicies.includes(value)) {
                result.score = 2;
                result.recommendations.push(`✅ Política segura: ${value}`);
            } else if (value === 'unsafe-url') {
                result.score = 0;
                result.recommendations.push('🔴 unsafe-url - Expone información sensible');
            } else {
                result.score = 1;
                result.recommendations.push(`⚠️ Política: ${value} - Considerar una más restrictiva`);
            }
            result.maxScore = 2;
            return result;
        }
    },
    'Permissions-Policy': {
        name: 'Permissions-Policy (Feature-Policy)',
        importance: 'MEDIUM',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            const features = ['geolocation', 'microphone', 'camera', 'payment'];
            let configured = 0;
            for (const feature of features) {
                if (value.includes(feature)) {
                    configured++;
                }
            }
            if (configured >= 3) {
                result.score = 2;
                result.recommendations.push(`✅ Configuradas ${configured} políticas`);
            } else if (configured >= 1) {
                result.score = 1;
                result.recommendations.push(`⚠️ Solo ${configured} políticas configuradas`);
            } else {
                result.recommendations.push('⚠️ Considerar configurar políticas de características');
            }
            result.maxScore = 2;
            return result;
        }
    },
    'X-XSS-Protection': {
        name: 'X-XSS-Protection',
        importance: 'MEDIUM',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            if (value === '1; mode=block') {
                result.score = 2;
                result.recommendations.push('✅ XSS Protection activada');
            } else if (value === '0') {
                result.score = 0;
                result.recommendations.push('🔴 XSS Protection desactivada');
            } else {
                result.score = 1;
                result.recommendations.push(`⚠️ Configuración: ${value}`);
            }
            result.maxScore = 2;
            return result;
        }
    },
    'Clear-Site-Data': {
        name: 'Clear-Site-Data',
        importance: 'LOW',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            result.score = 1;
            result.recommendations.push('✅ Configurado para limpiar datos en logout');
            result.maxScore = 1;
            return result;
        }
    },
    'Cross-Origin-Resource-Policy': {
        name: 'Cross-Origin-Resource-Policy (CORP)',
        importance: 'LOW',
        check: (value) => {
            const result = { present: true, value, score: 0, recommendations: [] };
            if (value === 'same-origin' || value === 'same-site') {
                result.score = 2;
                result.recommendations.push(`✅ CORP: ${value}`);
            } else if (value === 'cross-origin') {
                result.score = 0;
                result.recommendations.push('⚠️ cross-origin - Considerar same-origin o same-site');
            }
            result.maxScore = 2;
            return result;
        }
    }
};

// ==================== FUNCIONES ====================
function makeRequest(url) {
    return new Promise((resolve, reject) => {
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

        const req = httpModule.request(options, (res) => {
            resolve({
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                headers: res.headers
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

function analyzeHeaders(headers) {
    const results = {};
    let totalScore = 0;
    let maxScore = 0;
    let presentCount = 0;

    for (const [key, check] of Object.entries(HEADER_CHECKS)) {
        const headerValue = headers[key.toLowerCase()] || headers[key];
        const result = {
            present: !!headerValue,
            importance: check.importance,
            score: 0,
            maxScore: 0,
            recommendations: []
        };

        if (headerValue) {
            presentCount++;
            const analysis = check.check(headerValue);
            result.score = analysis.score;
            result.maxScore = analysis.maxScore;
            result.value = headerValue;
            result.recommendations = analysis.recommendations || [];
            totalScore += analysis.score;
            maxScore += analysis.maxScore;
        } else {
            result.recommendations.push(`🔴 Cabecera ${check.name} no configurada`);
        }

        results[key] = result;
    }

    // Calcular puntuación general
    const totalPossible = Object.keys(HEADER_CHECKS).length;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    let grade;
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';
    else grade = 'F';

    return {
        headers: results,
        summary: {
            totalHeaders: Object.keys(HEADER_CHECKS).length,
            presentHeaders: presentCount,
            missingHeaders: Object.keys(HEADER_CHECKS).length - presentCount,
            score: totalScore,
            maxScore,
            percentage: Math.round(percentage),
            grade,
            recommendations: []
        }
    };
}

function formatResults(results, url) {
    let output = '';
    output += `🔍 Security Headers Analyzer - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    output += `📡 URL: ${url}\n`;
    output += `📋 Calificación: ${results.summary.grade}\n`;
    output += `📊 Puntuación: ${results.summary.percentage}%\n`;
    output += `📋 Cabeceras configuradas: ${results.summary.presentHeaders}/${results.summary.totalHeaders}\n\n`;

    // Resumen por importancia
    output += `📊 RESULTADOS POR IMPORTANCIA:\n`;
    const highHeaders = Object.entries(results.headers).filter(([_, h]) => h.importance === 'HIGH');
    const mediumHeaders = Object.entries(results.headers).filter(([_, h]) => h.importance === 'MEDIUM');
    const lowHeaders = Object.entries(results.headers).filter(([_, h]) => h.importance === 'LOW');

    output += `   🔴 Alta importancia (${highHeaders.filter(([_, h]) => h.present).length}/${highHeaders.length})\n`;
    output += `   🟡 Media importancia (${mediumHeaders.filter(([_, h]) => h.present).length}/${mediumHeaders.length})\n`;
    output += `   🟢 Baja importancia (${lowHeaders.filter(([_, h]) => h.present).length}/${lowHeaders.length})\n\n`;

    // Detalle por cabecera
    output += `📋 DETALLE DE CABECERAS:\n`;
    for (const [key, result] of Object.entries(results.headers)) {
        const icon = result.present ? '✅' : '❌';
        const importanceIcon = result.importance === 'HIGH' ? '🔴' : result.importance === 'MEDIUM' ? '🟡' : '🟢';
        output += `\n${icon} ${importanceIcon} ${HEADER_CHECKS[key].name}\n`;
        if (result.present) {
            output += `   📌 Valor: ${result.value}\n`;
            output += `   📊 Puntuación: ${result.score}/${result.maxScore}\n`;
            if (result.recommendations && result.recommendations.length > 0) {
                output += `   📝 Recomendaciones:\n`;
                for (const rec of result.recommendations) {
                    output += `      • ${rec}\n`;
                }
            }
        } else {
            output += `   📝 ${result.recommendations[0] || 'No configurada'}\n`;
        }
    }

    // Recomendaciones generales
    if (results.summary.missingHeaders > 0) {
        output += `\n💡 RECOMENDACIONES GENERALES:\n`;
        const missing = Object.entries(results.headers)
            .filter(([_, h]) => !h.present)
            .map(([key]) => HEADER_CHECKS[key].name);
        for (const name of missing) {
            output += `   • Configurar: ${name}\n`;
        }
    }

    if (results.summary.grade === 'A+' || results.summary.grade === 'A') {
        output += '\n🎉 Excelente configuración de seguridad!';
    } else if (results.summary.grade === 'B' || results.summary.grade === 'C') {
        output += '\n⚠️ Buena configuración, pero hay margen de mejora.';
    } else {
        output += '\n🔴 Configuración de seguridad insuficiente. Revisar recomendaciones.';
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Security Headers Analyzer - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!url) {
        console.error('❌ Debes especificar una URL con --url');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        console.log(`\n📡 Analizando: ${url}`);
        const response = await makeRequest(url);

        if (verbose) {
            console.log(`📋 Status: ${response.statusCode} ${response.statusMessage}`);
        }

        // Analizar cabeceras
        const results = analyzeHeaders(response.headers);
        results.url = url;
        results.statusCode = response.statusCode;

        // Mostrar resultados
        console.log(formatResults(results, url));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                url,
                statusCode: response.statusCode,
                ...results
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

    console.log('\n✅ Análisis completado');
})();
