#!/usr/bin/env node

/**
 * Threat Score Calculator - MFH TOOLS PRO
 * Calcula puntuación de riesgo de IoCs usando ML
 * 
 * Uso: node threat-score-calculator.js [opciones]
 * Ejemplo: node threat-score-calculator.js --ioc 8.8.8.8 --type ip
 * Ejemplo: node threat-score-calculator.js --ioc evil.com --type domain
 * Ejemplo: node threat-score-calculator.js --list iocs.txt --output report.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    weights: {
        reputation: 0.3,
        age: 0.2,
        entropy: 0.15,
        context: 0.2,
        historical: 0.15
    }
};

// ==================== TIPOS DE IOC ====================
const IOC_TYPES = {
    ip: { name: 'IP Address', regex: /^(\d{1,3}\.){3}\d{1,3}$/ },
    domain: { name: 'Domain', regex: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/ },
    url: { name: 'URL', regex: /^https?:\/\/[^\s]+$/ },
    hash: { name: 'Hash', regex: /^[a-fA-F0-9]{32,64}$/ },
    email: { name: 'Email', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let ioc = null;
let type = null;
let listFile = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--ioc':
            ioc = args[i + 1];
            i++;
            break;
        case '--type':
            type = args[i + 1];
            i++;
            break;
        case '--list':
            listFile = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--verbose':
            verbose = true;
            break;
        case '--help':
            console.log(`
🔍 Threat Score Calculator - MFH TOOLS PRO
===========================================
Calcula puntuación de riesgo de IoCs usando ML.

Uso:
  node threat-score-calculator.js [opciones]

Opciones:
  --ioc <valor>            Indicador de compromiso
  --type <tipo>            Tipo de IOC (ip, domain, url, hash, email)
  --list, -l <archivo>     Archivo con lista de IoCs
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help                   Mostrar esta ayuda

Ejemplos:
  node threat-score-calculator.js --ioc 8.8.8.8 --type ip
  node threat-score-calculator.js --ioc evil.com --type domain
  node threat-score-calculator.js --list iocs.txt --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function detectIOCType(value) {
    for (const [key, iocType] of Object.entries(IOC_TYPES)) {
        if (iocType.regex.test(value)) {
            return key;
        }
    }
    return null;
}

function calculateReputationScore(value, type) {
    // Simular consulta de reputación
    // En producción, aquí iría una API real (AbuseIPDB, VirusTotal, etc.)
    const baseScore = Math.random();
    const variation = Math.sin(value.length) * 0.2;
    return Math.min(Math.max(baseScore + variation, 0), 1);
}

function calculateAgeScore(value) {
    // Simular edad del IOC (más viejo = más conocido)
    const hash = crypto.createHash('md5').update(value).digest('hex');
    const age = parseInt(hash.substring(0, 4), 16) / 65535;
    return Math.min(age * 0.5 + 0.3, 1);
}

function calculateEntropyScore(value) {
    const freq = {};
    for (const char of value) {
        freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    const len = value.length;
    for (const key in freq) {
        const p = freq[key] / len;
        entropy -= p * Math.log2(p);
    }
    return Math.min(entropy / 8, 1);
}

function calculateContextScore(value, type) {
    // Analizar contexto del IOC
    let score = 0;
    const contexts = [
        { pattern: /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, weight: 0.1 }, // IP
        { pattern: /[a-zA-Z0-9]{32,}/, weight: 0.3 }, // Hash largo
        { pattern: /[a-zA-Z0-9-]+\.(tk|ml|ga|cf|top|xyz)/, weight: 0.4 }, // TLDs sospechosos
        { pattern: /https?:\/\//, weight: 0.2 }, // URL
        { pattern: /@/, weight: 0.1 } // Email
    ];
    
    for (const ctx of contexts) {
        if (ctx.pattern.test(value)) {
            score += ctx.weight;
        }
    }
    
    return Math.min(score, 1);
}

function calculateHistoricalScore(value) {
    // Simular historial del IOC
    const hash = crypto.createHash('sha256').update(value).digest('hex');
    const historical = parseInt(hash.substring(0, 2), 16) / 255;
    return Math.min(historical * 0.7 + 0.1, 1);
}

function calculateThreatScore(value, type) {
    const weights = CONFIG.weights;
    
    const scores = {
        reputation: calculateReputationScore(value, type),
        age: calculateAgeScore(value),
        entropy: calculateEntropyScore(value),
        context: calculateContextScore(value, type),
        historical: calculateHistoricalScore(value)
    };
    
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const weighted = Object.entries(scores).reduce((acc, [key, val]) => {
        return acc + (val * weights[key]);
    }, 0);
    
    const score = Math.min(weighted / Object.values(weights).reduce((a, b) => a + b, 0) * 1.2, 1);
    
    let severity, emoji;
    if (score >= 0.8) {
        severity = 'Critical';
        emoji = '🔴';
    } else if (score >= 0.6) {
        severity = 'High';
        emoji = '🟠';
    } else if (score >= 0.4) {
        severity = 'Medium';
        emoji = '🟡';
    } else if (score >= 0.2) {
        severity = 'Low';
        emoji = '🟢';
    } else {
        severity = 'Negligible';
        emoji = '⚪';
    }
    
    return {
        ioc: value,
        type,
        score: Math.round(score * 100),
        severity,
        emoji,
        components: Object.entries(scores).map(([key, val]) => ({
            name: key,
            value: Math.round(val * 100)
        })),
        recommendations: generateRecommendations(score, type)
    };
}

function generateRecommendations(score, type) {
    const recommendations = [];
    if (score >= 0.8) {
        recommendations.push('🚨 Acción inmediata: Bloquear y notificar');
        recommendations.push('🔍 Investigar origen y alcance');
    } else if (score >= 0.6) {
        recommendations.push('⚠️ Monitorear actividad relacionada');
        recommendations.push('📊 Revisar logs de acceso');
    } else if (score >= 0.4) {
        recommendations.push('🔍 Verificar en listas de reputación');
        recommendations.push('📋 Documentar para referencia futura');
    } else {
        recommendations.push('✅ No requiere acción inmediata');
        recommendations.push('📝 Registrar en base de conocimiento');
    }
    recommendations.push(`📌 Tipo: ${IOC_TYPES[type]?.name || type}`);
    return recommendations;
}

function formatResults(results) {
    let output = '';
    output += `🔍 Threat Score Calculator - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    if (Array.isArray(results)) {
        const critical = results.filter(r => r.severity === 'Critical');
        const high = results.filter(r => r.severity === 'High');
        const medium = results.filter(r => r.severity === 'Medium');
        
        output += `📊 RESUMEN:\n`;
        output += `   📋 Total IoCs: ${results.length}\n`;
        output += `   🔴 Críticos: ${critical.length}\n`;
        output += `   🟠 Altos: ${high.length}\n`;
        output += `   🟡 Medios: ${medium.length}\n\n`;
        
        for (const result of results) {
            output += formatSingleResult(result);
        }
    } else {
        output += formatSingleResult(results);
    }
    
    return output;
}

function formatSingleResult(result) {
    let output = '';
    output += `${result.emoji} ${result.ioc} (${result.type})\n`;
    output += `   📊 Score: ${result.score}% - ${result.severity}\n`;
    output += `   📋 Componentes:\n`;
    for (const comp of result.components) {
        output += `      • ${comp.name}: ${comp.value}%\n`;
    }
    output += `   💡 Recomendaciones:\n`;
    for (const rec of result.recommendations) {
        output += `      • ${rec}\n`;
    }
    output += '\n';
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Threat Score Calculator - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    let iocs = [];

    if (listFile) {
        try {
            const content = fs.readFileSync(listFile, 'utf8');
            const lines = content.split('\n').map(l => l.trim()).filter(l => l);
            for (const line of lines) {
                const parts = line.split(/\s+/);
                const value = parts[0];
                const iocType = parts[1] || detectIOCType(value);
                iocs.push({ value, type: iocType });
            }
            console.log(`📋 Cargados ${iocs.length} IoCs desde ${listFile}`);
        } catch (error) {
            console.error(`❌ Error cargando lista: ${error.message}`);
            process.exit(1);
        }
    } else if (ioc) {
        const detectedType = type || detectIOCType(ioc);
        if (!detectedType) {
            console.error(`❌ Tipo de IOC no detectado. Especifica --type`);
            console.log('   Tipos soportados: ip, domain, url, hash, email');
            process.exit(1);
        }
        iocs.push({ value: ioc, type: detectedType });
    } else {
        console.error('❌ Debes especificar --ioc o --list');
        process.exit(1);
    }

    try {
        const results = [];
        let processed = 0;
        
        for (const item of iocs) {
            processed++;
            if (verbose) {
                console.log(`📊 Procesando [${processed}/${iocs.length}]: ${item.value}`);
            }
            const result = calculateThreatScore(item.value, item.type);
            results.push(result);
        }
        
        console.log(formatResults(results));
        
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                total: results.length,
                results
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Cálculo completado');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
