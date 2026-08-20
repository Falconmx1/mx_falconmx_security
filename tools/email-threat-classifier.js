#!/usr/bin/env node

/**
 * Email Threat Classifier - MFH TOOLS PRO
 * Clasifica emails como phishing, spam o legítimos
 * 
 * Uso: node email-threat-classifier.js [opciones]
 * Ejemplo: node email-threat-classifier.js --file email.eml
 * Ejemplo: node email-threat-classifier.js --directory emails/
 * Ejemplo: node email-threat-classifier.js --file email.eml --output report.json
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    threshold: 0.5,
    maxFileSize: 10 * 1024 * 1024 // 10MB
};

// ==================== PATRONES DE PHISHING ====================
const PHISHING_PATTERNS = [
    // Palabras clave
    { pattern: /urgent/i, weight: 0.3 },
    { pattern: /verify your account/i, weight: 0.4 },
    { pattern: /update your information/i, weight: 0.35 },
    { pattern: /suspended/i, weight: 0.3 },
    { pattern: /unusual activity/i, weight: 0.35 },
    { pattern: /click here/i, weight: 0.25 },
    { pattern: /confirm your identity/i, weight: 0.4 },
    { pattern: /security alert/i, weight: 0.35 },
    { pattern: /reset your password/i, weight: 0.3 },
    { pattern: /limited time/i, weight: 0.25 },
    { pattern: /free/i, weight: 0.2 },
    { pattern: /win/i, weight: 0.2 },
    { pattern: /prize/i, weight: 0.25 },
    { pattern: /lottery/i, weight: 0.3 },
    { pattern: /inheritance/i, weight: 0.35 },
    { pattern: /nigerian prince/i, weight: 0.4 },
    { pattern: /bank/i, weight: 0.2 },
    { pattern: /paypal/i, weight: 0.25 },
    { pattern: /amazon/i, weight: 0.2 },
    { pattern: /apple/i, weight: 0.2 },
    { pattern: /microsoft/i, weight: 0.2 },
    { pattern: /google/i, weight: 0.15 },
    { pattern: /facebook/i, weight: 0.2 },
    { pattern: /instagram/i, weight: 0.2 },
    { pattern: /whatsapp/i, weight: 0.2 },
    { pattern: /netflix/i, weight: 0.2 },
    { pattern: /spotify/i, weight: 0.2 }
];

const SPAM_PATTERNS = [
    { pattern: /viagra/i, weight: 0.3 },
    { pattern: /cialis/i, weight: 0.3 },
    { pattern: /million dollars/i, weight: 0.35 },
    { pattern: /you have won/i, weight: 0.3 },
    { pattern: /guaranteed/i, weight: 0.2 },
    { pattern: /earn money/i, weight: 0.25 },
    { pattern: /work from home/i, weight: 0.25 },
    { pattern: /make money/i, weight: 0.25 },
    { pattern: /double your/i, weight: 0.3 },
    { pattern: /weight loss/i, weight: 0.25 },
    { pattern: /hair loss/i, weight: 0.25 },
    { pattern: /debt/i, weight: 0.2 },
    { pattern: /loans/i, weight: 0.2 },
    { pattern: /credit/i, weight: 0.15 },
    { pattern: /insurance/i, weight: 0.15 }
];

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let file = null;
let directory = null;
let outputFile = null;
let verbose = false;
let threshold = CONFIG.threshold;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            file = args[i + 1];
            i++;
            break;
        case '--directory':
        case '-d':
            directory = args[i + 1];
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
🔍 Email Threat Classifier - MFH TOOLS PRO
===========================================
Clasifica emails como phishing, spam o legítimos.

Uso:
  node email-threat-classifier.js [opciones]

Opciones:
  --file, -f <archivo>     Archivo de email (.eml, .msg)
  --directory, -d <dir>    Directorio con emails
  --output, -o <archivo>   Guardar resultados en JSON
  --threshold, -t <n>      Umbral de clasificación (default: 0.5)
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node email-threat-classifier.js --file email.eml
  node email-threat-classifier.js --directory emails/
  node email-threat-classifier.js --file email.eml --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function parseEmail(content) {
    const headers = {};
    let body = '';
    let currentHeader = null;
    const lines = content.split('\n');
    let headerEnd = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!headerEnd) {
            if (line.trim() === '') {
                headerEnd = true;
                continue;
            }
            if (line.match(/^\s/)) {
                // Línea continuada
                if (currentHeader) {
                    headers[currentHeader] += ' ' + line.trim();
                }
            } else {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    currentHeader = key.trim();
                    headers[currentHeader] = valueParts.join(':').trim();
                }
            }
        } else {
            body += line + '\n';
        }
    }
    
    return { headers, body: body.trim() };
}

function extractEmailFeatures(parsed) {
    const features = {
        bodyLength: parsed.body.length,
        wordCount: parsed.body.split(/\s+/).length,
        linkCount: (parsed.body.match(/https?:\/\/[^\s]+/g) || []).length,
        exclamationCount: (parsed.body.match(/!/g) || []).length,
        questionCount: (parsed.body.match(/\?/g) || []).length,
        uppercaseRatio: 0,
        suspiciousWords: 0,
        spamWords: 0,
        hasAttachment: false,
        hasHtml: false
    };
    
    // Palabras en mayúsculas
    const words = parsed.body.split(/\s+/);
    const uppercaseWords = words.filter(w => w === w.toUpperCase() && w.length > 3);
    features.uppercaseRatio = words.length > 0 ? uppercaseWords.length / words.length : 0;
    
    // Palabras sospechosas
    for (const pattern of PHISHING_PATTERNS) {
        if (pattern.pattern.test(parsed.body)) {
            features.suspiciousWords += pattern.weight;
        }
    }
    
    // Palabras de spam
    for (const pattern of SPAM_PATTERNS) {
        if (pattern.pattern.test(parsed.body)) {
            features.spamWords += pattern.weight;
        }
    }
    
    // HTML
    if (parsed.body.toLowerCase().includes('<html') || parsed.body.toLowerCase().includes('<!DOCTYPE html')) {
        features.hasHtml = true;
    }
    
    return features;
}

function classifyEmail(features) {
    let phishingScore = 0;
    let spamScore = 0;
    let maxScore = 0;
    
    // Phishing
    const phishFactors = [
        { value: features.suspiciousWords, max: 3 },
        { value: features.linkCount > 5 ? 1 : 0, max: 1 },
        { value: features.uppercaseRatio > 0.3 ? 1 : 0, max: 1 },
        { value: features.exclamationCount > 5 ? 0.5 : 0, max: 0.5 },
        { value: features.bodyLength < 500 ? 0.5 : 0, max: 0.5 }
    ];
    
    for (const factor of phishFactors) {
        phishingScore += factor.value;
        maxScore += factor.max;
    }
    
    // Spam
    const spamFactors = [
        { value: features.spamWords, max: 2 },
        { value: features.linkCount > 10 ? 1 : 0, max: 1 },
        { value: features.exclamationCount > 10 ? 0.5 : 0, max: 0.5 },
        { value: features.uppercaseRatio > 0.5 ? 0.5 : 0, max: 0.5 }
    ];
    
    for (const factor of spamFactors) {
        spamScore += factor.value;
        maxScore += factor.max;
    }
    
    const phishNormalized = maxScore > 0 ? phishingScore / maxScore : 0;
    const spamNormalized = maxScore > 0 ? spamScore / maxScore : 0;
    
    let classification, emoji, confidence;
    if (phishNormalized >= threshold) {
        classification = 'Phishing';
        emoji = '🔴';
        confidence = Math.min(phishNormalized, 1);
    } else if (spamNormalized >= threshold * 0.8) {
        classification = 'Spam';
        emoji = '🟡';
        confidence = Math.min(spamNormalized, 1);
    } else if (phishNormalized > 0.2 || spamNormalized > 0.2) {
        classification = 'Suspicious';
        emoji = '🟠';
        confidence = Math.max(phishNormalized, spamNormalized);
    } else {
        classification = 'Legitimate';
        emoji = '✅';
        confidence = 1 - Math.max(phishNormalized, spamNormalized);
    }
    
    return {
        classification,
        emoji,
        confidence,
        phishingScore: phishNormalized,
        spamScore: spamNormalized,
        details: features
    };
}

function analyzeEmail(content, filename) {
    const parsed = parseEmail(content);
    const features = extractEmailFeatures(parsed);
    const result = classifyEmail(features);
    
    return {
        filename,
        subject: parsed.headers.Subject || '(sin asunto)',
        from: parsed.headers.From || '(desconocido)',
        to: parsed.headers.To || '(desconocido)',
        ...result,
        details: {
            bodyLength: features.bodyLength,
            wordCount: features.wordCount,
            linkCount: features.linkCount,
            suspiciousWords: features.suspiciousWords.toFixed(2),
            spamWords: features.spamWords.toFixed(2),
            hasHtml: features.hasHtml
        }
    };
}

function formatResults(results) {
    let output = '';
    output += `🔍 Email Threat Classifier - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    if (Array.isArray(results)) {
        const phishing = results.filter(r => r.classification === 'Phishing');
        const spam = results.filter(r => r.classification === 'Spam');
        const suspicious = results.filter(r => r.classification === 'Suspicious');
        const legitimate = results.filter(r => r.classification === 'Legitimate');
        
        output += `📊 RESUMEN:\n`;
        output += `   📋 Total: ${results.length}\n`;
        output += `   🔴 Phishing: ${phishing.length}\n`;
        output += `   🟡 Spam: ${spam.length}\n`;
        output += `   🟠 Sospechosos: ${suspicious.length}\n`;
        output += `   ✅ Legítimos: ${legitimate.length}\n\n`;
        
        output += `📋 DETALLES:\n`;
        for (const result of results) {
            const confidence = (result.confidence * 100).toFixed(1);
            output += `   ${result.emoji} ${result.filename}\n`;
            output += `      📌 Asunto: ${result.subject}\n`;
            output += `      📌 De: ${result.from}\n`;
            output += `      📋 Clasificación: ${result.classification} (${confidence}%)\n`;
            if (result.classification !== 'Legitimate') {
                output += `      📊 Phishing: ${(result.phishingScore * 100).toFixed(1)}% - Spam: ${(result.spamScore * 100).toFixed(1)}%\n`;
            }
        }
    } else {
        const result = results;
        const confidence = (result.confidence * 100).toFixed(1);
        output += `📋 Archivo: ${result.filename}\n`;
        output += `📌 Asunto: ${result.subject}\n`;
        output += `📌 De: ${result.from}\n`;
        output += `📋 Clasificación: ${result.emoji} ${result.classification}\n`;
        output += `🎯 Confianza: ${confidence}%\n`;
        output += `📊 Phishing: ${(result.phishingScore * 100).toFixed(1)}%\n`;
        output += `📊 Spam: ${(result.spamScore * 100).toFixed(1)}%\n`;
        output += `\n📋 CARACTERÍSTICAS:\n`;
        output += `   📊 Longitud: ${result.details.bodyLength}\n`;
        output += `   📊 Palabras: ${result.details.wordCount}\n`;
        output += `   📊 Enlaces: ${result.details.linkCount}\n`;
        output += `   📊 HTML: ${result.details.hasHtml ? 'Sí' : 'No'}\n`;
    }
    
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Email Threat Classifier - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    try {
        let results = [];
        
        if (file) {
            if (!fs.existsSync(file)) {
                console.error(`❌ Archivo no encontrado: ${file}`);
                process.exit(1);
            }
            const content = fs.readFileSync(file, 'utf8');
            console.log(`📡 Analizando: ${file}`);
            const result = analyzeEmail(content, path.basename(file));
            results = result;
            
        } else if (directory) {
            if (!fs.existsSync(directory)) {
                console.error(`❌ Directorio no encontrado: ${directory}`);
                process.exit(1);
            }
            const files = fs.readdirSync(directory);
            console.log(`📡 Analizando directorio: ${directory}`);
            console.log(`📋 ${files.length} archivos encontrados`);
            
            let processed = 0;
            for (const f of files) {
                const filePath = path.join(directory, f);
                if (fs.statSync(filePath).isFile()) {
                    processed++;
                    if (verbose) {
                        console.log(`📊 Procesando [${processed}/${files.length}]: ${f}`);
                    }
                    const content = fs.readFileSync(filePath, 'utf8');
                    const result = analyzeEmail(content, f);
                    results.push(result);
                }
            }
            
        } else {
            console.error('❌ Debes especificar --file o --directory');
            console.log('   Usa --help para ver las opciones');
            process.exit(1);
        }
        
        console.log(formatResults(results));
        
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                threshold,
                total: Array.isArray(results) ? results.length : 1,
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
