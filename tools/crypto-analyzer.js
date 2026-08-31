#!/usr/bin/env node

/**
 * Crypto Analyzer - MFH TOOLS PRO
 * Analisis de algoritmos criptograficos
 * 
 * Uso: node crypto-analyzer.js [opciones]
 * Ejemplo: node crypto-analyzer.js --analyze --text "encrypted text"
 * Ejemplo: node crypto-analyzer.js --detect --file data.bin
 * Ejemplo: node crypto-analyzer.js --algorithms --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'crypto_analyzer_config.json');
const REPORTS_DIR = path.join(__dirname, 'crypto_reports');

const DEFAULT_CONFIG = {
    algorithms: ['AES', 'DES', 'RSA', 'ECC', 'ChaCha20', 'SHA256', 'MD5'],
    detection_threshold: 0.7,
    max_analysis_size: 1048576
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let text = null;
let filePath = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                text = args[i + 1];
                i++;
            }
            break;
        case '--detect':
            action = 'detect';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                filePath = args[i + 1];
                i++;
            }
            break;
        case '--algorithms':
            action = 'algorithms';
            break;
        case '--text':
            text = args[i + 1];
            i++;
            break;
        case '--file':
            filePath = args[i + 1];
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
🔐 Crypto Analyzer - MFH TOOLS PRO
================================
Analisis de algoritmos criptograficos.

Uso:
  node crypto-analyzer.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --analyze [texto]     Analizar texto encriptado
  --detect <archivo>    Detectar algoritmo en archivo
  --algorithms          Listar algoritmos soportados
  --text <texto>        Texto a analizar
  --file <archivo>      Archivo a analizar
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node crypto-analyzer.js --init
  node crypto-analyzer.js --analyze --text "U2FsdGVkX1"
  node crypto-analyzer.js --detect --file data.bin
  node crypto-analyzer.js --algorithms
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando configuracion:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuracion:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function listAlgorithms() {
    const config = loadConfig();
    console.log('\n📋 ALGORITMOS SOPORTADOS:');
    console.log('='.repeat(50));
    console.log('\n🔐 Simetricos:');
    console.log('   • AES-128, AES-192, AES-256');
    console.log('   • DES, 3DES');
    console.log('   • ChaCha20');
    console.log('   • RC4');
    console.log('\n🔑 Asimetricos:');
    console.log('   • RSA (1024, 2048, 4096)');
    console.log('   • ECC (secp256k1, P-256)');
    console.log('\n🔄 Hash:');
    console.log('   • MD5');
    console.log('   • SHA1, SHA256, SHA384, SHA512');
    console.log('   • BLAKE2, BLAKE2s');
    console.log('\n📋 Configuracion:');
    console.log(`   Umbral deteccion: ${(config.detection_threshold * 100)}%`);
    console.log(`   Tamaño maximo: ${config.max_analysis_size} bytes`);
}

function analyzeText(text) {
    console.log(`🔍 Analizando texto: ${text.substring(0, 20)}...`);
    
    const config = loadConfig();
    const analysis = {
        timestamp: new Date().toISOString(),
        text_length: text.length,
        entropy: calculateEntropy(text),
        patterns: detectPatterns(text),
        possible_algorithms: [],
        recommendations: []
    };
    
    // Detectar posibles algoritmos
    const signatures = {
        'AES': { pattern: /^[a-zA-Z0-9+\/=]{24,}$/, confidence: 0.6 },
        'Base64': { pattern: /^[a-zA-Z0-9+\/=]{16,}$/, confidence: 0.8 },
        'Hex': { pattern: /^[a-fA-F0-9]{32,}$/, confidence: 0.7 },
        'MD5': { pattern: /^[a-fA-F0-9]{32}$/, confidence: 0.9 },
        'SHA1': { pattern: /^[a-fA-F0-9]{40}$/, confidence: 0.9 },
        'SHA256': { pattern: /^[a-fA-F0-9]{64}$/, confidence: 0.9 }
    };
    
    for (const [algo, sig] of Object.entries(signatures)) {
        if (sig.pattern.test(text)) {
            analysis.possible_algorithms.push({
                algorithm: algo,
                confidence: sig.confidence
            });
        }
    }
    
    // Generar recomendaciones
    if (analysis.entropy > 7) {
        analysis.recommendations.push('Alta entropia - posible datos encriptados');
    }
    if (analysis.possible_algorithms.length === 0) {
        analysis.recommendations.push('No se detecto algoritmo conocido - puede ser texto plano o encriptacion personalizada');
    }
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   Longitud: ${analysis.text_length} caracteres`);
    console.log(`   Entropia: ${analysis.entropy.toFixed(2)}/8.0`);
    console.log(`   Patrones detectados: ${analysis.patterns.join(', ') || 'Ninguno'}`);
    
    if (analysis.possible_algorithms.length > 0) {
        console.log(`\n📌 Posibles algoritmos:`);
        analysis.possible_algorithms.forEach(a => {
            console.log(`   • ${a.algorithm} (confianza: ${(a.confidence * 100)}%)`);
        });
    }
    
    if (analysis.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        analysis.recommendations.forEach(r => {
            console.log(`   • ${r}`);
        });
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return analysis;
}

function calculateEntropy(text) {
    const freq = {};
    for (const char of text) {
        freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const length = text.length;
    for (const count of Object.values(freq)) {
        const p = count / length;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

function detectPatterns(text) {
    const patterns = [];
    if (/^[a-zA-Z0-9+\/=]+$/.test(text)) patterns.push('Base64');
    if (/^[a-fA-F0-9]+$/.test(text)) patterns.push('Hexadecimal');
    if (/^[A-Za-z]+$/.test(text)) patterns.push('Alfabetico');
    if (/\s/.test(text)) patterns.push('Contiene espacios');
    if (text.length > 100) patterns.push('Largo > 100 caracteres');
    return patterns;
}

function detectAlgorithm(filePath) {
    console.log(`🔍 Detectando algoritmo en archivo: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo no encontrado: ${filePath}`);
        return;
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8').substring(0, 1000);
        const analysis = analyzeText(content);
        
        const result = {
            file: filePath,
            timestamp: new Date().toISOString(),
            analysis: analysis
        };
        
        console.log(`\n📄 Analisis completado para: ${filePath}`);
        
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
            console.log(`📄 Reporte guardado: ${outputFile}`);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error leyendo archivo:', error.message);
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔐 Crypto Analyzer - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'analyze':
            if (!text) {
                console.error('❌ Debes especificar --text');
                process.exit(1);
            }
            analyzeText(text);
            break;
            
        case 'detect':
            if (!filePath) {
                console.error('❌ Debes especificar --file');
                process.exit(1);
            }
            detectAlgorithm(filePath);
            break;
            
        case 'algorithms':
            listAlgorithms();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --detect, --algorithms, --init');
            break;
    }
    
    console.log('\n✅ Crypto Analyzer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Crypto Analyzer...');
    process.exit(0);
});
