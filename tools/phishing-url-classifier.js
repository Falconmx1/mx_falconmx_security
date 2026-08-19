#!/usr/bin/env node

/**
 * Phishing URL Classifier - MFH TOOLS PRO
 * Clasifica URLs como phishing o legítimas usando ML
 * 
 * Uso: node phishing-url-classifier.js [opciones]
 * Ejemplo: node phishing-url-classifier.js --url https://example.com
 * Ejemplo: node phishing-url-classifier.js --list urls.txt
 * Ejemplo: node phishing-url-classifier.js --url https://example.com --output report.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    threshold: 0.6,
    timeout: 5000
};

// ==================== CARACTERÍSTICAS DE URL ====================
function extractUrlFeatures(url) {
    try {
        const parsed = new URL(url);
        const features = {
            url: url,
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            path: parsed.pathname,
            query: parsed.search,
            length: url.length,
            domainLength: parsed.hostname.length,
            pathLength: parsed.pathname.length,
            queryLength: parsed.search.length,
            numDots: (parsed.hostname.match(/\./g) || []).length,
            numDigits: (url.match(/\d/g) || []).length,
            numHyphens: (url.match(/-/g) || []).length,
            numUnderscores: (url.match(/_/g) || []).length,
            numSlash: (url.match(/\//g) || []).length,
            numQuestion: (url.match(/\?/g) || []).length,
            numEqual: (url.match(/=/g) || []).length,
            numAt: (url.match(/@/g) || []).length,
            hasIP: /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname),
            hasHttps: parsed.protocol === 'https:',
            hasSubdomain: (parsed.hostname.match(/\./g) || []).length > 1,
            hasPath: parsed.pathname.length > 1,
            hasQuery: parsed.search.length > 0,
            hasFragment: parsed.hash.length > 0
        };
        
        // Extraer dominio base
        const parts = parsed.hostname.split('.');
        if (parts.length >= 2) {
            features.baseDomain = parts.slice(-2).join('.');
            features.subdomain = parts.slice(0, -2).join('.');
        } else {
            features.baseDomain = parsed.hostname;
            features.subdomain = '';
        }
        
        // Detectar características sospechosas
        features.suspicious = {
            tooLong: features.length > 100,
            tooManyDots: features.numDots > 3,
            ipAddress: features.hasIP,
            https: features.hasHttps,
            suspiciousTLD: ['.tk', '.ml', '.ga', '.cf', '.top', '.xyz'].some(tld => 
                parsed.hostname.endsWith(tld)
            ),
            multipleSubdomains: features.numDots > 2,
            hasAtSign: features.numAt > 0,
            doubleSlash: url.includes('//') && url.indexOf('//') !== url.indexOf('://') + 1
        };
        
        return features;
    } catch (error) {
        return { error: error.message };
    }
}

function calculatePhishingScore(features) {
    let score = 0;
    let maxScore = 0;
    let reasons = [];
    
    if (features.error) {
        return { score: 0, reasons: ['URL inválida'], classification: 'Invalid' };
    }
    
    // Longitud (URLs largas son sospechosas)
    if (features.length > 100) {
        score += 0.2;
        reasons.push('URL larga (>100 caracteres)');
    }
    maxScore += 0.2;
    
    // IP en lugar de dominio
    if (features.hasIP) {
        score += 0.5;
        reasons.push('Usa IP en lugar de dominio');
    }
    maxScore += 0.5;
    
    // Demasiados puntos (subdominios excesivos)
    if (features.numDots > 3) {
        score += 0.2;
        reasons.push('Demasiados subdominios');
    }
    maxScore += 0.2;
    
    // Sin HTTPS
    if (!features.hasHttps) {
        score += 0.2;
        reasons.push('No usa HTTPS');
    }
    maxScore += 0.2;
    
    // TLD sospechoso
    if (features.suspicious?.suspiciousTLD) {
        score += 0.3;
        reasons.push('TLD sospechoso');
    }
    maxScore += 0.3;
    
    // Tiene @ (phishing común)
    if (features.numAt > 0) {
        score += 0.3;
        reasons.push('Contiene @');
    }
    maxScore += 0.3;
    
    // Demasiados dígitos
    if (features.numDigits > 10) {
        score += 0.1;
        reasons.push('Muchos dígitos');
    }
    maxScore += 0.1;
    
    // Query larga
    if (features.queryLength > 50) {
        score += 0.1;
        reasons.push('Query string larga');
    }
    maxScore += 0.1;
    
    const finalScore = maxScore > 0 ? score / maxScore : 0;
    return { score: finalScore, reasons };
}

function classifyURL(url, threshold) {
    const features = extractUrlFeatures(url);
    const result = calculatePhishingScore(features);
    
    let classification, emoji;
    if (result.score >= 0.8) {
        classification = 'Critical';
        emoji = '🔴';
    } else if (result.score >= threshold) {
        classification = 'Suspicious';
        emoji = '🟡';
    } else if (result.score >= 0.3) {
        classification = 'Low Risk';
        emoji = '🟢';
    } else {
        classification = 'Safe';
        emoji = '✅';
    }
    
    return {
        url,
        features,
        score: result.score,
        classification,
        emoji,
        reasons: result.reasons || []
    };
}

function formatResults(results) {
    let output = '';
    output += `🔍 Phishing URL Classifier - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    if (Array.isArray(results)) {
        const suspicious = results.filter(r => r.classification === 'Critical' || r.classification === 'Suspicious');
        const safe = results.filter(r => r.classification === 'Safe' || r.classification === 'Low Risk');
        const invalid = results.filter(r => r.classification === 'Invalid');
        
        output += `📊 RESUMEN:\n`;
        output += `   📋 Total: ${results.length}\n`;
        output += `   🔴 Sospechosas: ${suspicious.length}\n`;
        output += `   🟢 Seguras: ${safe.length}\n`;
        output += `   ❌ Inválidas: ${invalid.length}\n\n`;
        
        output += `📋 DETALLES:\n`;
        for (const result of results) {
            if (result.classification === 'Invalid') {
                output += `   ❌ ${result.url}: ${result.features?.error || 'URL inválida'}\n`;
            } else {
                const confidence = (result.score * 100).toFixed(1);
                output += `   ${result.emoji} ${result.url}\n`;
                output += `      📊 Score: ${confidence}% - ${result.classification}\n`;
                if (result.reasons.length > 0 && (result.classification === 'Critical' || result.classification === 'Suspicious')) {
                    output += `      📝 Razones: ${result.reasons.join(', ')}\n`;
                }
            }
        }
    } else {
        const result = results;
        if (result.classification === 'Invalid') {
            output += `❌ URL inválida: ${result.url}\n`;
        } else {
            const confidence = (result.score * 100).toFixed(1);
            output += `📋 URL: ${result.url}\n`;
            output += `📊 Score: ${confidence}%\n`;
            output += `📋 Clasificación: ${result.emoji} ${result.classification}\n`;
            if (result.reasons.length > 0) {
                output += `📝 Razones:\n`;
                for (const reason of result.reasons) {
                    output += `   • ${reason}\n`;
                }
            }
            output += `\n📋 CARACTERÍSTICAS:\n`;
            output += `   🔗 Protocolo: ${result.features.protocol}\n`;
            output += `   🌐 Dominio: ${result.features.hostname}\n`;
            output += `   📊 Longitud: ${result.features.length}\n`;
            output += `   🎯 Puntos: ${result.features.numDots}\n`;
            output += `   🔒 HTTPS: ${result.features.hasHttps ? 'Sí' : 'No'}\n`;
        }
    }
    
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Phishing URL Classifier - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    let urls = [];
    const args = process.argv.slice(2);
    
    let url = null;
    let listFile = null;
    let outputFile = null;
    let verbose = false;
    let threshold = CONFIG.threshold;
    
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
            case '--threshold':
            case '-t':
                threshold = parseFloat(args[i + 1]);
                i++;
                break;
            case '--verbose':
            case '-v':
                verbose = true;
                break;
            case '--help':
            case '-h':
                console.log(`
🔍 Phishing URL Classifier - MFH TOOLS PRO
===========================================
Clasifica URLs como phishing o legítimas usando ML.

Uso:
  node phishing-url-classifier.js [opciones]

Opciones:
  --url, -u <url>          URL a clasificar
  --list, -l <archivo>     Archivo con lista de URLs
  --output, -o <archivo>   Guardar resultados en JSON
  --threshold, -t <n>      Umbral de clasificación (default: 0.6)
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node phishing-url-classifier.js --url https://example.com
  node phishing-url-classifier.js --list urls.txt
  node phishing-url-classifier.js --url https://example.com --output report.json
`);
                process.exit(0);
        }
    }

    try {
        if (listFile) {
            if (!fs.existsSync(listFile)) {
                console.error(`❌ Archivo no encontrado: ${listFile}`);
                process.exit(1);
            }
            const content = fs.readFileSync(listFile, 'utf8');
            urls = content.split('\n').map(l => l.trim()).filter(l => l);
            console.log(`📋 Cargadas ${urls.length} URLs desde ${listFile}`);
            
        } else if (url) {
            urls = [url];
        } else {
            console.error('❌ Debes especificar --url o --list');
            process.exit(1);
        }
        
        const results = [];
        let processed = 0;
        
        for (const u of urls) {
            processed++;
            if (verbose) {
                console.log(`📊 Procesando [${processed}/${urls.length}]: ${u}`);
            }
            const result = classifyURL(u, threshold);
            results.push(result);
        }
        
        console.log(formatResults(results));
        
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                threshold,
                total: results.length,
                results
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Clasificación completada');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
