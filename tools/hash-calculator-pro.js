#!/usr/bin/env node

/**
 * Hash Calculator Pro - MFH TOOLS PRO
 * Herramienta avanzada de hashing y verificacion
 * 
 * Uso: node hash-calculator-pro.js [opciones]
 * Ejemplo: node hash-calculator-pro.js --hash --text "Hello World"
 * Ejemplo: node hash-calculator-pro.js --verify --hash abc123 --text "Hello"
 * Ejemplo: node hash-calculator-pro.js --file --path document.pdf
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'hash_pro_config.json');
const REPORTS_DIR = path.join(__dirname, 'hash_reports');

const DEFAULT_CONFIG = {
    algorithms: ['md5', 'sha1', 'sha256', 'sha384', 'sha512', 'blake2b', 'blake2s'],
    default_algorithm: 'sha256',
    output_format: 'hex',
    max_file_size: 104857600
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let text = null;
let hashValue = null;
let filePath = null;
let algorithm = 'sha256';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--hash':
            action = 'hash';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                text = args[i + 1];
                i++;
            }
            break;
        case '--verify':
            action = 'verify';
            break;
        case '--file':
            action = 'file';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                filePath = args[i + 1];
                i++;
            }
            break;
        case '--text':
            text = args[i + 1];
            i++;
            break;
        case '--hash-value':
            hashValue = args[i + 1];
            i++;
            break;
        case '--algo':
            algorithm = args[i + 1];
            i++;
            break;
        case '--path':
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
🔐 Hash Calculator Pro - MFH TOOLS PRO
=====================================
Herramienta avanzada de hashing y verificacion.

Uso:
  node hash-calculator-pro.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --hash [texto]        Calcular hash de un texto
  --verify              Verificar hash
  --file <archivo>      Calcular hash de un archivo
  --text <texto>        Texto a hashear
  --hash-value <hash>   Hash a verificar
  --algo <algoritmo>    Algoritmo (md5, sha1, sha256, sha512)
  --path <archivo>      Ruta del archivo
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node hash-calculator-pro.js --init
  node hash-calculator-pro.js --hash --text "Hello World"
  node hash-calculator-pro.js --verify --hash-value abc123 --text "Hello"
  node hash-calculator-pro.js --file --path document.pdf
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

function computeHash(data, algorithm) {
    try {
        const hash = crypto.createHash(algorithm);
        hash.update(data);
        return hash.digest('hex');
    } catch (error) {
        console.error(`❌ Error calculando hash ${algorithm}:`, error.message);
        return null;
    }
}

function hashText(text, algorithm) {
    console.log(`🔐 Calculando hash ${algorithm} de: ${text}`);
    
    const config = loadConfig();
    const algo = algorithm || config.default_algorithm;
    
    if (!config.algorithms.includes(algo)) {
        console.error(`❌ Algoritmo no soportado: ${algo}`);
        console.log(`   Soportados: ${config.algorithms.join(', ')}`);
        return;
    }
    
    const hash = computeHash(text, algo);
    
    if (!hash) return;
    
    const result = {
        text: text,
        algorithm: algo,
        hash: hash,
        length: hash.length,
        timestamp: new Date().toISOString()
    };
    
    console.log(`\n📋 Resultado:`);
    console.log(`   Algoritmo: ${result.algorithm}`);
    console.log(`   Hash: ${result.hash}`);
    console.log(`   Longitud: ${result.length} caracteres`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return result;
}

function hashFile(filePath, algorithm) {
    console.log(`📁 Calculando hash ${algorithm} de archivo: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo no encontrado: ${filePath}`);
        return;
    }
    
    const config = loadConfig();
    const algo = algorithm || config.default_algorithm;
    
    if (!config.algorithms.includes(algo)) {
        console.error(`❌ Algoritmo no soportado: ${algo}`);
        console.log(`   Soportados: ${config.algorithms.join(', ')}`);
        return;
    }
    
    try {
        const content = fs.readFileSync(filePath);
        const hash = computeHash(content, algo);
        
        if (!hash) return;
        
        const stats = fs.statSync(filePath);
        const result = {
            file: filePath,
            size: stats.size,
            algorithm: algo,
            hash: hash,
            timestamp: new Date().toISOString()
        };
        
        console.log(`\n📋 Resultado:`);
        console.log(`   Archivo: ${result.file}`);
        console.log(`   Tamaño: ${(result.size / 1024).toFixed(2)} KB`);
        console.log(`   Algoritmo: ${result.algorithm}`);
        console.log(`   Hash: ${result.hash}`);
        
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
            console.log(`\n📄 Reporte guardado: ${outputFile}`);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error leyendo archivo:', error.message);
    }
}

function verifyHash(text, hashValue, algorithm) {
    console.log(`✅ Verificando hash ${algorithm || 'sha256'}`);
    
    const config = loadConfig();
    const algo = algorithm || config.default_algorithm;
    
    if (!config.algorithms.includes(algo)) {
        console.error(`❌ Algoritmo no soportado: ${algo}`);
        console.log(`   Soportados: ${config.algorithms.join(', ')}`);
        return;
    }
    
    const computed = computeHash(text, algo);
    
    if (!computed) return;
    
    const matches = computed === hashValue;
    
    console.log(`\n📋 Resultado:`);
    console.log(`   Algoritmo: ${algo}`);
    console.log(`   Hash ingresado: ${hashValue}`);
    console.log(`   Hash calculado: ${computed}`);
    console.log(`   Coinciden: ${matches ? '✅ SI' : '❌ NO'}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify({ 
            input_hash: hashValue, 
            computed_hash: computed, 
            matches, 
            algorithm: algo 
        }, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return { matches, computed };
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔐 Hash Calculator Pro - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'hash':
            if (!text) {
                console.error('❌ Debes especificar --text');
                process.exit(1);
            }
            hashText(text, algorithm);
            break;
            
        case 'verify':
            if (!text || !hashValue) {
                console.error('❌ Debes especificar --text y --hash-value');
                process.exit(1);
            }
            verifyHash(text, hashValue, algorithm);
            break;
            
        case 'file':
            if (!filePath) {
                console.error('❌ Debes especificar --path');
                process.exit(1);
            }
            hashFile(filePath, algorithm);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --hash, --verify, --file, --init');
            break;
    }
    
    console.log('\n✅ Hash Calculator Pro completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Hash Calculator Pro...');
    process.exit(0);
});
