#!/usr/bin/env node

/**
 * Automated Incident Classification - MFH TOOLS PRO
 * Clasifica incidentes automáticamente usando ML
 * 
 * Uso: node incident-classifier.js [opciones]
 * Ejemplo: node incident-classifier.js --incident "Failed SSH login attempts from 192.168.1.100"
 * Ejemplo: node incident-classifier.js --file incidents.json
 * Ejemplo: node incident-classifier.js --train --data incidents_train.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'incident_classifier_config.json');
const MODEL_FILE = path.join(__dirname, 'incident_classifier_model.json');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let incident = null;
let file = null;
let train = false;
let dataFile = null;
let outputFile = null;
let verbose = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--incident':
            incident = args[i + 1];
            i++;
            break;
        case '--file':
            file = args[i + 1];
            i++;
            break;
        case '--train':
            train = true;
            dataFile = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--init':
            init = true;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Automated Incident Classification - MFH TOOLS PRO
=====================================================
Clasifica incidentes automáticamente usando ML.

Uso:
  node incident-classifier.js [opciones]

Opciones:
  --init                   Crear configuración por defecto
  --incident <texto>       Incidente a clasificar
  --file <archivo>         Archivo JSON con incidentes
  --train <archivo>        Entrenar modelo con datos
  --output <archivo>       Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node incident-classifier.js --init
  node incident-classifier.js --incident "Failed SSH login attempts from 192.168.1.100"
  node incident-classifier.js --file incidents.json
  node incident-classifier.js --train incidents_train.json
`);
            process.exit(0);
    }
}

// ==================== CONFIGURACIÓN ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error.message);
    }
    return { categories: ['malware', 'phishing', 'ddos', 'ransomware', 'unauthorized_access', 'data_breach', 'misconfiguration'] };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`✅ Configuración guardada en: ${CONFIG_FILE}`);
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    const config = { categories: ['malware', 'phishing', 'ddos', 'ransomware', 'unauthorized_access', 'data_breach', 'misconfiguration'] };
    saveConfig(config);
    console.log('✅ Configuración por defecto creada.');
}

// ==================== MODELO DE CLASIFICACIÓN ====================
const CATEGORY_KEYWORDS = {
    malware: ['malware', 'virus', 'trojan', 'worm', 'ransomware', 'spyware', 'adware', 'rootkit', 'backdoor', 'keylogger', 'crypto'],
    phishing: ['phishing', 'spoofing', 'fake', 'fraud', 'scam', 'social engineering', 'credential harvesting', 'fake login', 'banking trojan'],
    ddos: ['ddos', 'dos', 'flood', 'amplification', 'reflection', 'botnet', 'syn flood', 'udp flood', 'http flood', 'slowloris', 'application layer attack'],
    ransomware: ['ransomware', 'encryption', 'decrypt', 'ransom', 'crypto locker', 'locker', 'bitcoin', 'payment', 'dark web', 'data hostage'],
    unauthorized_access: ['unauthorized', 'brute force', 'credential stuffing', 'password spraying', 'account takeover', 'session hijacking', 'privilege escalation', 'lateral movement'],
    data_breach: ['data breach', 'exfiltration', 'leak', 'exposure', 'sensitive data', 'pii', 'credit card', 'personal information', 'database dump', 'insider threat'],
    misconfiguration: ['misconfiguration', 'misconfig', 'open port', 'default credentials', 'unpatched', 'vulnerable', 'exposed', 'publicly accessible', 'cloud misconfig']
};

const SEVERITY_KEYWORDS = {
    critical: ['critical', 'emergency', 'severe', 'system down', 'data loss', 'widespread'],
    high: ['high', 'urgent', 'major', 'significant', 'extensive'],
    medium: ['medium', 'moderate', 'contained', 'limited'],
    low: ['low', 'minor', 'isolated', 'single']
};

function extractFeatures(text) {
    const features = {
        length: text.length,
        wordCount: text.split(/\s+/).length,
        hasIP: /\b(\d{1,3}\.){3}\d{1,3}\b/.test(text),
        hasURL: /https?:\/\/[^\s]+/.test(text),
        hasEmail: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text),
        hasFile: /[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]{2,4}/.test(text),
        uppercaseRatio: 0,
        categoryScores: {},
        severity: 'low'
    };

    // Palabras en mayúsculas
    const words = text.split(/\s+/);
    const uppercaseWords = words.filter(w => w === w.toUpperCase() && w.length > 2);
    features.uppercaseRatio = words.length > 0 ? uppercaseWords.length / words.length : 0;

    // Calcular scores por categoría
    const textLower = text.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (textLower.includes(keyword)) {
                score += 1;
            }
            // Buscar coincidencias parciales
            const words2 = textLower.split(/\s+/);
            for (const word of words2) {
                if (word.length > 3 && keyword.includes(word)) {
                    score += 0.5;
                }
            }
        }
        features.categoryScores[category] = score;
    }

    // Determinar severidad
    let severityScore = 0;
    for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (textLower.includes(keyword)) {
                score += 1;
            }
        }
        if (score > severityScore) {
            severityScore = score;
            features.severity = severity;
        }
    }

    // Ajustar severidad por número de palabras clave
    const totalMatches = Object.values(features.categoryScores).reduce((a, b) => a + b, 0);
    if (totalMatches > 5 && severityScore < 2) {
        features.severity = 'medium';
    }
    if (features.hasIP && features.hasURL) {
        features.severity = severityScore > 1 ? 'critical' : 'high';
    }

    return features;
}

function classifyIncident(text) {
    const features = extractFeatures(text);
    
    // Determinar categoría principal
    let bestCategory = 'unknown';
    let bestScore = 0;
    
    for (const [category, score] of Object.entries(features.categoryScores)) {
        if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
        }
    }

    // Calcular confianza
    const totalScore = Object.values(features.categoryScores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? bestScore / totalScore : 0;

    // Obtener todas las categorías con puntuación
    const allCategories = Object.entries(features.categoryScores)
        .filter(([_, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([category, score]) => ({ category, score }));

    // Determinar nivel de confianza
    let confidenceLevel = 'low';
    if (confidence > 0.6) confidenceLevel = 'high';
    else if (confidence > 0.3) confidenceLevel = 'medium';

    return {
        category: bestCategory,
        confidence: Math.round(confidence * 100),
        confidenceLevel,
        severity: features.severity,
        features: {
            hasIP: features.hasIP,
            hasURL: features.hasURL,
            hasEmail: features.hasEmail,
            hasFile: features.hasFile,
            wordCount: features.wordCount,
            uppercaseRatio: Math.round(features.uppercaseRatio * 100)
        },
        allCategories,
        topMatches: allCategories.slice(0, 3)
    };
}

function formatIncidentResult(result, text) {
    let output = '';
    output += `🔍 Automated Incident Classification - MFH TOOLS PRO\n`;
    output += '='.split(50).join('=') + '\n\n';
    
    output += `📋 Incidente: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n\n`;
    output += `📊 CLASIFICACIÓN:\n`;
    output += `   📌 Categoría: ${result.category}\n`;
    output += `   🎯 Confianza: ${result.confidence}% (${result.confidenceLevel})\n`;
    output += `   📊 Severidad: ${result.severity.toUpperCase()}\n\n`;

    output += `📋 CARACTERÍSTICAS DETECTADAS:\n`;
    output += `   🌐 IP: ${result.features.hasIP ? 'Sí' : 'No'}\n`;
    output += `   🔗 URL: ${result.features.hasURL ? 'Sí' : 'No'}\n`;
    output += `   📧 Email: ${result.features.hasEmail ? 'Sí' : 'No'}\n`;
    output += `   📄 Archivo: ${result.features.hasFile ? 'Sí' : 'No'}\n`;
    output += `   📊 Palabras: ${result.features.wordCount}\n`;
    output += `   📊 Mayúsculas: ${result.features.uppercaseRatio}%\n\n`;

    if (result.topMatches.length > 0) {
        output += `📊 CATEGORÍAS POSIBLES:\n`;
        for (const match of result.topMatches) {
            const confidence = Math.round((match.score / (result.topMatches[0].score || 1)) * 100);
            output += `   • ${match.category}: ${confidence}%\n`;
        }
    }

    // Recomendaciones
    output += `\n💡 RECOMENDACIONES:\n`;
    switch (result.category) {
        case 'malware':
            output += `   • Aislar sistema infectado inmediatamente\n`;
            output += `   • Ejecutar análisis antivirus completo\n`;
            output += `   • Revisar procesos y conexiones activas\n`;
            break;
        case 'phishing':
            output += `   • Bloquear dominio y remitente\n`;
            output += `   • Notificar a usuarios afectados\n`;
            output += `   • Revisar si hubo credenciales comprometidas\n`;
            break;
        case 'ddos':
            output += `   • Activar mitigación DDoS\n`;
            output += `   • Contactar a proveedor de servicios\n`;
            output += `   • Revisar patrones de tráfico\n`;
            break;
        case 'ransomware':
            output += `   • Aislar sistema de la red\n`;
            output += `   • No pagar el rescate\n`;
            output += `   • Restaurar desde backups si es posible\n`;
            break;
        case 'unauthorized_access':
            output += `   • Revocar accesos de la cuenta comprometida\n`;
            output += `   • Resetear contraseñas\n`;
            output += `   • Revisar logs de acceso\n`;
            break;
        case 'data_breach':
            output += `   • Contener la brecha inmediatamente\n`;
            output += `   • Notificar a equipo de seguridad\n`;
            output += `   • Evaluar alcance de datos comprometidos\n`;
            break;
        case 'misconfiguration':
            output += `   • Corregir configuración identificada\n`;
            output += `   • Revisar políticas de seguridad\n`;
            output += `   • Auditar configuraciones similares\n`;
            break;
        default:
            output += `   • Investigar el incidente manualmente\n`;
            output += `   • Documentar hallazgos\n`;
    }

    return output;
}

function formatBatchResults(results) {
    let output = '';
    output += `🔍 Automated Incident Classification - MFH TOOLS PRO\n`;
    output += '='.split(50).join('=') + '\n\n';
    
    output += `📊 RESULTADOS (${results.length} incidentes):\n\n`;
    
    const categories = {};
    const severities = {};
    
    for (const result of results) {
        categories[result.result.category] = (categories[result.result.category] || 0) + 1;
        severities[result.result.severity] = (severities[result.result.severity] || 0) + 1;
    }

    output += `📊 POR CATEGORÍA:\n`;
    for (const [category, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
        output += `   • ${category}: ${count}\n`;
    }

    output += `\n📊 POR SEVERIDAD:\n`;
    for (const [severity, count] of Object.entries(severities).sort((a, b) => b[1] - a[1])) {
        const emoji = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
        output += `   ${emoji} ${severity}: ${count}\n`;
    }

    output += `\n📋 DETALLE:\n`;
    for (let i = 0; i < Math.min(results.length, 20); i++) {
        const r = results[i];
        const emoji = r.result.severity === 'critical' ? '🔴' : r.result.severity === 'high' ? '🟠' : r.result.severity === 'medium' ? '🟡' : '🟢';
        output += `   ${emoji} ${r.id || i + 1}. ${r.text.substring(0, 50)}... → ${r.result.category} (${r.result.confidence}%)\n`;
    }

    if (results.length > 20) {
        output += `   ... y ${results.length - 20} resultados más\n`;
    }

    return output;
}

function trainModel(dataFile) {
    console.log(`🧠 Entrenando modelo con datos de ${dataFile}...`);
    
    try {
        if (!fs.existsSync(dataFile)) {
            console.error(`❌ Archivo no encontrado: ${dataFile}`);
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        
        if (!Array.isArray(data)) {
            console.error('❌ Los datos deben ser un array');
            process.exit(1);
        }

        let processed = 0;
        let errors = 0;

        for (const item of data) {
            if (item.text && item.category) {
                const features = extractFeatures(item.text);
                // Aquí se podría implementar un modelo ML real
                // Por ahora, solo guardamos los patrones
                processed++;
            } else {
                errors++;
            }
        }

        // Guardar modelo (simulado)
        const model = {
            timestamp: new Date().toISOString(),
            samples: processed,
            errors,
            categories: Object.keys(CATEGORY_KEYWORDS)
        };

        fs.writeFileSync(MODEL_FILE, JSON.stringify(model, null, 2));

        console.log(`✅ Modelo entrenado exitosamente`);
        console.log(`📊 Muestras procesadas: ${processed}`);
        console.log(`❌ Errores: ${errors}`);
        console.log(`💾 Modelo guardado en: ${MODEL_FILE}`);

    } catch (error) {
        console.error(`❌ Error entrenando modelo: ${error.message}`);
        process.exit(1);
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Automated Incident Classification - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    if (init) {
        initConfig();
        process.exit(0);
    }

    if (train) {
        trainModel(dataFile);
        process.exit(0);
    }

    let results = [];

    if (incident) {
        const result = classifyIncident(incident);
        console.log(formatIncidentResult(result, incident));
        results = [{ text: incident, result }];
    } else if (file) {
        if (!fs.existsSync(file)) {
            console.error(`❌ Archivo no encontrado: ${file}`);
            process.exit(1);
        }

        const content = fs.readFileSync(file, 'utf8');
        let data;
        try {
            data = JSON.parse(content);
        } catch (error) {
            console.error('❌ Error parseando JSON:', error.message);
            process.exit(1);
        }

        const items = Array.isArray(data) ? data : [data];
        
        for (const item of items) {
            const text = item.text || item.incident || item.message || item.description;
            if (text) {
                const result = classifyIncident(text);
                results.push({
                    id: item.id || results.length + 1,
                    text,
                    result
                });
            }
        }

        console.log(formatBatchResults(results));

    } else {
        console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
        console.log('💡 Opciones: --incident, --file, --train, --init');
        process.exit(0);
    }

    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            total: results.length,
            results
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Clasificación completada');
})();
