#!/usr/bin/env node

/**
 * HTTP/2 Analyzer - MFH TOOLS PRO
 * Analiza cabeceras y rendimiento HTTP/2
 * 
 * Uso: node http2-analyzer.js <url> [opciones]
 * Ejemplo: node http2-analyzer.js https://google.com
 * Ejemplo: node http2-analyzer.js https://ejemplo.com --output reporte.json
 * Ejemplo: node http2-analyzer.js https://google.com --verbose
 */

const https = require('https');
const http2 = require('http2');
const fs = require('fs');
const url = require('url');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    userAgent: 'MFH-HTTP2-Analyzer/1.0'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let targetUrl = null;
let outputFile = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 HTTP/2 Analyzer - MFH TOOLS PRO
===================================
Analiza cabeceras y rendimiento HTTP/2.

Uso:
  node http2-analyzer.js <url> [opciones]

Opciones:
  --output <archivo>   Guardar resultados en archivo
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node http2-analyzer.js https://google.com
  node http2-analyzer.js https://ejemplo.com --output reporte.json
  node http2-analyzer.js https://google.com --verbose
`);
    process.exit(1);
}

targetUrl = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function getHttp2Info(urlString) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlString);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname || '/',
            method: 'GET',
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': '*/*'
            },
            timeout: CONFIG.timeout
        };
        
        const client = http2.connect(`https://${options.hostname}:${options.port}`);
        const startTime = Date.now();
        
        client.on('error', (err) => {
            reject(err);
        });
        
        const req = client.request(options);
        let data = '';
        const headers = {};
        
        req.on('response', (headers_, flags) => {
            for (const [key, value] of Object.entries(headers_)) {
                headers[key] = value;
            }
        });
        
        req.on('data', (chunk) => {
            data += chunk;
        });
        
        req.on('end', () => {
            const endTime = Date.now();
            client.close();
            resolve({
                headers,
                body: data,
                time: endTime - startTime,
                status: headers[':status'] || 0
            });
        });
        
        req.on('error', (err) => {
            client.close();
            reject(err);
        });
        
        req.end();
    });
}

function analyzeHttp2Headers(headers) {
    const analysis = {
        server: headers['server'] || 'Desconocido',
        contentType: headers['content-type'] || 'Desconocido',
        contentLength: headers['content-length'] || 'Desconocido',
        security: {
            hsts: headers['strict-transport-security'] || null,
            csp: headers['content-security-policy'] || null,
            xframe: headers['x-frame-options'] || null,
            xss: headers['x-xss-protection'] || null,
            referrer: headers['referrer-policy'] || null
        },
        caching: {
            cacheControl: headers['cache-control'] || null,
            etag: headers['etag'] || null,
            lastModified: headers['last-modified'] || null
        },
        compression: headers['content-encoding'] || 'none',
        language: headers['content-language'] || 'Desconocido',
        cors: {
            allowOrigin: headers['access-control-allow-origin'] || null,
            allowMethods: headers['access-control-allow-methods'] || null
        }
    };
    
    return analysis;
}

function getSecurityScore(analysis) {
    let score = 100;
    const security = analysis.security;
    
    if (!security.hsts) score -= 15;
    if (!security.csp) score -= 15;
    if (!security.xframe) score -= 10;
    if (!security.xss) score -= 10;
    if (!security.referrer) score -= 5;
    
    return Math.max(0, score);
}

function getGrade(score) {
    if (score >= 90) return { letter: 'A', emoji: '🟢', label: 'Excelente' };
    if (score >= 70) return { letter: 'B', emoji: '🟢', label: 'Bueno' };
    if (score >= 50) return { letter: 'C', emoji: '🟡', label: 'Regular' };
    if (score >= 30) return { letter: 'D', emoji: '🟠', label: 'Malo' };
    return { letter: 'F', emoji: '🔴', label: 'Crítico' };
}

function getRecommendations(analysis) {
    const recommendations = [];
    const security = analysis.security;
    
    if (!security.hsts) {
        recommendations.push('🟡 Agregar HSTS (Strict-Transport-Security) para forzar HTTPS');
    }
    if (!security.csp) {
        recommendations.push('🟡 Implementar CSP (Content-Security-Policy) para mitigar XSS');
    }
    if (!security.xframe) {
        recommendations.push('🟡 Configurar X-Frame-Options para prevenir clickjacking');
    }
    if (!security.xss) {
        recommendations.push('🟡 Configurar X-XSS-Protection para proteger contra ataques XSS');
    }
    if (!security.referrer) {
        recommendations.push('🟡 Configurar Referrer-Policy para controlar información de referer');
    }
    if (analysis.compression === 'none') {
        recommendations.push('🟡 Habilitar compresión (gzip o brotli) para mejorar rendimiento');
    }
    if (analysis.caching.cacheControl === null) {
        recommendations.push('🟡 Configurar Cache-Control para optimizar caché');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('✅ Buena configuración de seguridad y rendimiento');
    }
    
    return recommendations;
}

function getPerformanceMetrics(analysis, time, bodySize) {
    const metrics = {
        responseTime: time,
        bodySize: bodySize,
        estimatedThroughput: bodySize > 0 ? (bodySize / time).toFixed(2) : 0,
        compressionRatio: 0
    };
    
    if (analysis.compression !== 'none' && bodySize > 0) {
        metrics.compressionRatio = 100;
    }
    
    return metrics;
}

function formatHeaders(headers) {
    const formatted = [];
    for (const [key, value] of Object.entries(headers)) {
        if (typeof value === 'string' || typeof value === 'number') {
            formatted.push(`${key}: ${value}`);
        }
    }
    return formatted;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 HTTP/2 Analyzer - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`🎯 URL: ${targetUrl}`);
        console.log('');
        
        // Analizar HTTP/2
        console.log('🔍 Analizando HTTP/2...');
        const result = await getHttp2Info(targetUrl);
        
        if (!result.status) {
            console.error('❌ No se pudo obtener respuesta HTTP/2');
            process.exit(1);
        }
        
        console.log('✅ Conexión HTTP/2 establecida');
        console.log(`   📡 Protocolo: HTTP/2`);
        console.log(`   📊 Código de estado: ${result.status}`);
        console.log(`   ⏱️ Tiempo de respuesta: ${result.time}ms`);
        console.log(`   📏 Tamaño del cuerpo: ${result.body.length} bytes`);
        console.log('');
        
        // Analizar cabeceras
        const analysis = analyzeHttp2Headers(result.headers);
        const securityScore = getSecurityScore(analysis);
        const grade = getGrade(securityScore);
        const metrics = getPerformanceMetrics(analysis, result.time, result.body.length);
        
        // Mostrar análisis
        console.log('📊 ANÁLISIS DE CABECERAS');
        console.log('='.repeat(60));
        console.log(`   🖥️ Servidor: ${analysis.server}`);
        console.log(`   📄 Content-Type: ${analysis.contentType}`);
        console.log(`   📏 Content-Length: ${analysis.contentLength}`);
        console.log(`   🔄 Compresión: ${analysis.compression}`);
        console.log(`   🌐 Idioma: ${analysis.language}`);
        console.log('');
        
        // Seguridad
        console.log('🔹 SEGURIDAD:');
        console.log(`   🔒 HSTS: ${analysis.security.hsts ? '✅ Configurado' : '❌ No configurado'}`);
        console.log(`   🛡️ CSP: ${analysis.security.csp ? '✅ Configurado' : '❌ No configurado'}`);
        console.log(`   📦 X-Frame-Options: ${analysis.security.xframe ? '✅ Configurado' : '❌ No configurado'}`);
        console.log(`   🛡️ X-XSS-Protection: ${analysis.security.xss ? '✅ Configurado' : '❌ No configurado'}`);
        console.log(`   🔗 Referrer-Policy: ${analysis.security.referrer ? '✅ Configurado' : '❌ No configurado'}`);
        console.log(`   📊 Puntuación de seguridad: ${securityScore}/100`);
        console.log(`   📊 Calificación: ${grade.emoji} ${grade.letter} - ${grade.label}`);
        console.log('');
        
        // Rendimiento
        console.log('🔹 RENDIMIENTO:');
        console.log(`   ⏱️ Tiempo de respuesta: ${metrics.responseTime}ms`);
        console.log(`   📏 Tamaño del cuerpo: ${(metrics.bodySize / 1024).toFixed(2)} KB`);
        console.log(`   📊 Throughput estimado: ${metrics.estimatedThroughput} KB/s`);
        console.log(`   🔄 Compresión: ${metrics.compressionRatio > 0 ? '✅ Activada' : '❌ No activada'}`);
        console.log('');
        
        // Caché
        console.log('🔹 CACHÉ:');
        console.log(`   📦 Cache-Control: ${analysis.caching.cacheControl || 'No configurado'}`);
        console.log(`   🔖 ETag: ${analysis.caching.etag || 'No configurado'}`);
        console.log(`   📅 Last-Modified: ${analysis.caching.lastModified || 'No configurado'}`);
        console.log('');
        
        // CORS
        if (analysis.cors.allowOrigin) {
            console.log('🔹 CORS:');
            console.log(`   🌐 Allow-Origin: ${analysis.cors.allowOrigin}`);
            if (analysis.cors.allowMethods) {
                console.log(`   📋 Allow-Methods: ${analysis.cors.allowMethods}`);
            }
            console.log('');
        }
        
        // Cabeceras completas
        if (verbose) {
            console.log('📋 CABECERAS COMPLETAS:');
            const headersList = formatHeaders(result.headers);
            for (const header of headersList) {
                console.log(`   ${header}`);
            }
            console.log('');
        }
        
        // Recomendaciones
        console.log('🔹 RECOMENDACIONES:');
        const recommendations = getRecommendations(analysis);
        for (const rec of recommendations) {
            console.log(`   ${rec}`);
        }
        
        // Guardar resultados
        if (outputFile) {
            const exportData = {
                url: targetUrl,
                timestamp: new Date().toISOString(),
                status: result.status,
                time: result.time,
                headers: result.headers,
                analysis,
                securityScore,
                grade,
                metrics,
                recommendations
            };
            fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
            console.log(`\n📁 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ HTTP/2 Analyzer completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.message.includes('ECONNRESET')) {
            console.log('   💡 El sitio puede no soportar HTTP/2 o estar bloqueando la conexión');
        }
        process.exit(1);
    }
})();
