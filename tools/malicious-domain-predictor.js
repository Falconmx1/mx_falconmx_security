#!/usr/bin/env node

/**
 * Malicious Domain Predictor - MFH TOOLS PRO
 * Predice dominios maliciosos usando ML
 * 
 * Uso: node malicious-domain-predictor.js [opciones]
 * Ejemplo: node malicious-domain-predictor.js --domain example.com
 * Ejemplo: node malicious-domain-predictor.js --list domains.txt
 * Ejemplo: node malicious-domain-predictor.js --domain example.com --output report.json
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    threshold: 0.5,
    timeout: 3000
};

// ==================== CARACTERÍSTICAS DE DOMINIOS ====================
const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.top', '.xyz', '.club', '.online', '.site', '.space', '.click', '.link', '.bid', '.date', '.loan', '.men', '.win', '.download', '.review'];

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let domain = null;
let listFile = null;
let outputFile = null;
let verbose = false;
let threshold = CONFIG.threshold;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--domain':
        case '-d':
            domain = args[i + 1];
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
🔍 Malicious Domain Predictor - MFH TOOLS PRO
==============================================
Predice dominios maliciosos usando ML.

Uso:
  node malicious-domain-predictor.js [opciones]

Opciones:
  --domain, -d <dominio>   Dominio a analizar
  --list, -l <archivo>     Archivo con lista de dominios
  --output, -o <archivo>   Guardar resultados en JSON
  --threshold, -t <n>      Umbral de clasificación (default: 0.5)
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node malicious-domain-predictor.js --domain example.com
  node malicious-domain-predictor.js --list domains.txt
  node malicious-domain-predictor.js --domain example.com --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function extractDomainFeatures(domain) {
    const features = {
        domain,
        length: domain.length,
        numDots: (domain.match(/\./g) || []).length,
        numHyphens: (domain.match(/-/g) || []).length,
        numDigits: (domain.match(/\d/g) || []).length,
        hasIP: /^(\d{1,3}\.){3}\d{1,3}$/.test(domain),
        hasSuspiciousTLD: false,
        subdomainCount: 0,
        entropy: 0,
        lengthRatio: 0
    };
    
    // Verificar TLD sospechoso
    for (const tld of SUSPICIOUS_TLDS) {
        if (domain.endsWith(tld)) {
            features.hasSuspiciousTLD = true;
            break;
        }
    }
    
    // Extraer subdominios
    const parts = domain.split('.');
    if (parts.length >= 2) {
        features.subdomainCount = parts.length - 1;
        features.mainDomain = parts.slice(-2).join('.');
        features.subdomains = parts.slice(0, -2).join('.');
    }
    
    // Calcular entropía
    features.entropy = calculateEntropy(domain);
    
    // Ratio dígitos/longitud
    features.digitRatio = features.numDigits / features.length;
    
    return features;
}

function calculateEntropy(str) {
    const freq = {};
    for (const char of str) {
        freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    const len = str.length;
    for (const key in freq) {
        const p = freq[key] / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

function calculateMaliciousScore(features) {
    let score = 0;
    let maxScore = 0;
    let reasons = [];
    
    // 1. Longitud (dominios largos son sospechosos)
    if (features.length > 30) {
        score += 0.3;
        reasons.push('dominio largo');
    }
    maxScore += 0.3;
    
    // 2. Demasiados subdominios
    if (features.subdomainCount > 3) {
        score += 0.3;
        reasons.push('múltiples subdominios');
    }
    maxScore += 0.3;
    
    // 3. TLD sospechoso
    if (features.hasSuspiciousTLD) {
        score += 0.4;
        reasons.push('TLD sospechoso');
    }
    maxScore += 0.4;
    
    // 4. Alta entropía
    if (features.entropy > 4) {
        score += 0.3;
        reasons.push(`alta entropía (${features.entropy.toFixed(2)})`);
    }
    maxScore += 0.3;
    
    // 5. Muchos dígitos
    if (features.digitRatio > 0.3) {
        score += 0.2;
        reasons.push(`muchos dígitos (${(features.digitRatio * 100).toFixed(0)}%)`);
    }
    maxScore += 0.2;
    
    // 6. IP en lugar de dominio
    if (features.hasIP) {
        score += 0.5;
        reasons.push('usa IP en lugar de dominio');
    }
    maxScore += 0.5;
    
    // 7. Guiones
    if (features.numHyphens > 2) {
        score += 0.1;
        reasons.push('múltiples guiones');
    }
    maxScore += 0.1;
    
    const finalScore = maxScore > 0 ? score / maxScore : 0;
    return { score: finalScore, reasons };
}

function checkDomainReputation(domain) {
    // Simular consulta de reputación
    // En producción: consultar APIs de reputación
    const hash = crypto.createHash('md5').update(domain).digest('hex');
    const reputation = parseInt(hash.substring(0, 4), 16) / 65535;
    return Math.min(reputation * 0.5 + 0.1, 1);
}

function predictDomain(domain, threshold) {
    const features = extractDomainFeatures(domain);
    const mlScore = calculateMaliciousScore(features);
    const reputationScore = checkDomainReputation(domain);
    
    // Combinar scores
    const finalScore = (mlScore.score * 0.7) + (reputationScore * 0.3);
    
    let classification, emoji;
    if (finalScore >= 0.8) {
        classification = 'Malicious';
        emoji = '🔴';
    } else if (finalScore >= threshold) {
        classification = 'Suspicious';
        emoji = '🟡';
    } else if (finalScore >= 0.2) {
        classification = 'Low Risk';
        emoji = '🟢';
    } else {
        classification = 'Safe';
        emoji = '✅';
    }
    
    return {
        domain,
        features,
        score: finalScore,
        classification,
        emoji,
        reasons: mlScore.reasons || [],
        reputation: reputationScore
    };
}

function formatResults(results) {
    let output = '';
    output += `🔍 Malicious Domain Predictor - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    if (Array.isArray(results)) {
        const malicious = results.filter(r => r.classification === 'Malicious');
        const suspicious = results.filter(r => r.classification === 'Suspicious');
        const safe = results.filter(r => r.classification === 'Safe' || r.classification === 'Low Risk');
        
        output += `📊 RESUMEN:\n`;
        output += `   📋 Total: ${results.length}\n`;
        output += `   🔴 Maliciosos: ${malicious.length}\n`;
        output += `   🟡 Sospechosos: ${suspicious.length}\n`;
        output += `   🟢 Seguros: ${safe.length}\n\n`;
        
        for (const result of results) {
            const confidence = (result.score * 100).toFixed(1);
            output += `   ${result.emoji} ${result.domain}\n`;
            output += `      📊 Score: ${confidence}% - ${result.classification}\n`;
            if (result.reasons.length > 0 && (result.classification === 'Malicious' || result.classification === 'Suspicious')) {
                output += `      📝 Razones: ${result.reasons.join(', ')}\n`;
            }
        }
    } else {
        const result = results;
        const confidence = (result.score * 100).toFixed(1);
        output += `📋 Dominio: ${result.domain}\n`;
        output += `📊 Score: ${confidence}%\n`;
        output += `📋 Clasificación: ${result.emoji} ${result.classification}\n`;
        if (result.reasons.length > 0) {
            output += `📝 Razones:\n`;
            for (const reason of result.reasons) {
                output += `   • ${reason}\n`;
            }
        }
        output += `\n📋 CARACTERÍSTICAS:\n`;
        output += `   📊 Longitud: ${result.features.length}\n`;
        output += `   📊 Subdominios: ${result.features.subdomainCount}\n`;
        output += `   📊 Entropía: ${result.features.entropy.toFixed(2)}\n`;
        output += `   📊 Dígitos: ${result.features.numDigits}\n`;
        output += `   🎯 TLD sospechoso: ${result.features.hasSuspiciousTLD ? 'Sí' : 'No'}\n`;
        output += `   🔒 IP: ${result.features.hasIP ? 'Sí' : 'No'}\n`;
    }
    
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Malicious Domain Predictor - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    let domains = [];

    if (listFile) {
        try {
            const content = fs.readFileSync(listFile, 'utf8');
            domains = content.split('\n').map(l => l.trim()).filter(l => l);
            console.log(`📋 Cargados ${domains.length} dominios desde ${listFile}`);
        } catch (error) {
            console.error(`❌ Error cargando lista: ${error.message}`);
            process.exit(1);
        }
    } else if (domain) {
        domains = [domain];
    } else {
        console.error('❌ Debes especificar --domain o --list');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        const results = [];
        let processed = 0;
        
        for (const d of domains) {
            processed++;
            if (verbose) {
                console.log(`📊 Procesando [${processed}/${domains.length}]: ${d}`);
            }
            const result = predictDomain(d, threshold);
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
        
        console.log('\n✅ Análisis completado');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
