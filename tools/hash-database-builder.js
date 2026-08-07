#!/usr/bin/env node

/**
 * Hash Database Builder - MFH TOOLS PRO
 * Construye bases de datos de hashes
 * 
 * Uso: node hash-database-builder.js [opciones]
 * Ejemplo: node hash-database-builder.js --wordlist passwords.txt
 * Ejemplo: node hash-database-builder.js --directory /usr/share/wordlists/
 * Ejemplo: node hash-database-builder.js --output hash_db.json --algorithms md5,sha1,sha256
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    algorithms: ['md5', 'sha1', 'sha256'],
    chunkSize: 10000,
    maxFileSize: 100 * 1024 * 1024
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let wordlistFile = null;
let directory = null;
let outputFile = null;
let algorithms = CONFIG.algorithms;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Hash Database Builder - MFH TOOLS PRO
=========================================
Construye bases de datos de hashes.

Uso:
  node hash-database-builder.js [opciones]

Opciones:
  --wordlist <archivo>  Archivo con lista de palabras
  --directory <dir>     Directorio con wordlists
  --output <archivo>    Archivo de salida (default: hash_db.json)
  --algorithms <lista>  Algoritmos separados por coma (md5,sha1,sha256)
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node hash-database-builder.js --wordlist passwords.txt
  node hash-database-builder.js --directory /usr/share/wordlists/
  node hash-database-builder.js --output hash_db.json --algorithms md5,sha1,sha256
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--wordlist' && args[i + 1]) {
        wordlistFile = args[i + 1];
        i++;
    } else if (args[i] === '--directory' && args[i + 1]) {
        directory = args[i + 1];
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--algorithms' && args[i + 1]) {
        algorithms = args[i + 1].split(',').map(a => a.trim().toLowerCase());
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime,
            name: path.basename(filePath)
        };
    } catch (error) {
        return null;
    }
}

function generateHash(text, algorithm) {
    const hash = crypto.createHash(algorithm);
    hash.update(text);
    return hash.digest('hex');
}

function processWordlist(filePath, algorithms) {
    const content = fs.readFileSync(filePath, 'utf8');
    const words = content.split('\n').map(w => w.trim()).filter(w => w);
    const results = {};
    
    for (const algo of algorithms) {
        results[algo] = {};
    }
    
    let processed = 0;
    const total = words.length;
    
    for (const word of words) {
        for (const algo of algorithms) {
            const hash = generateHash(word, algo);
            results[algo][hash] = word;
        }
        processed++;
        if (processed % 1000 === 0) {
            process.stdout.write(`\r📊 Procesando: ${processed}/${total} palabras`);
        }
    }
    
    process.stdout.write('\n');
    return {
        words: words.length,
        results,
        algorithms
    };
}

function processDirectory(dirPath, algorithms) {
    const files = fs.readdirSync(dirPath);
    const allResults = {};
    let totalWords = 0;
    
    for (const algo of algorithms) {
        allResults[algo] = {};
    }
    
    let fileCount = 0;
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (!fs.statSync(filePath).isFile()) continue;
        
        fileCount++;
        console.log(`📖 Procesando: ${file}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const words = content.split('\n').map(w => w.trim()).filter(w => w);
        totalWords += words.length;
        
        for (const word of words) {
            for (const algo of algorithms) {
                const hash = generateHash(word, algo);
                allResults[algo][hash] = word;
            }
        }
    }
    
    return {
        words: totalWords,
        results: allResults,
        algorithms,
        files: fileCount
    };
}

function getDBStats(db) {
    const stats = {};
    for (const [algo, data] of Object.entries(db.results)) {
        stats[algo] = {
            entries: Object.keys(data).length,
            size: JSON.stringify(data).length,
            sizeFormatted: formatFileSize(JSON.stringify(data).length)
        };
    }
    return stats;
}

function mergeDBs(dbs) {
    const merged = {};
    const allAlgos = new Set();
    dbs.forEach(db => db.algorithms.forEach(a => allAlgos.add(a)));
    
    for (const algo of allAlgos) {
        merged[algo] = {};
        for (const db of dbs) {
            if (db.results[algo]) {
                Object.assign(merged[algo], db.results[algo]);
            }
        }
    }
    
    return {
        results: merged,
        algorithms: Array.from(allAlgos),
        words: Object.values(merged).reduce((sum, data) => sum + Object.keys(data).length, 0)
    };
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Hash Database Builder - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📋 Algoritmos: ${algorithms.join(', ')}`);
        console.log('');
        
        let db = null;
        let source = '';
        
        // Procesar wordlist
        if (wordlistFile) {
            if (!fs.existsSync(wordlistFile)) {
                console.error(`❌ Archivo no encontrado: ${wordlistFile}`);
                process.exit(1);
            }
            const fileInfo = getFileInfo(wordlistFile);
            console.log(`📁 Wordlist: ${fileInfo.name} (${fileInfo.sizeFormatted})`);
            console.log('');
            
            console.log('🔍 Procesando wordlist...');
            db = processWordlist(wordlistFile, algorithms);
            source = `wordlist: ${fileInfo.name}`;
            console.log(`✅ ${db.words} palabras procesadas`);
            
        } else if (directory) {
            if (!fs.existsSync(directory)) {
                console.error(`❌ Directorio no encontrado: ${directory}`);
                process.exit(1);
            }
            console.log(`📁 Directorio: ${directory}`);
            console.log('');
            
            console.log('🔍 Procesando wordlists en directorio...');
            db = processDirectory(directory, algorithms);
            source = `directorio: ${directory}`;
            console.log(`✅ ${db.words} palabras procesadas de ${db.files} archivos`);
            
        } else {
            console.error('❌ Debes especificar --wordlist o --directory');
            process.exit(1);
        }
        
        console.log('');
        
        // Estadísticas
        console.log('📊 ESTADÍSTICAS DE LA BASE DE DATOS:');
        const stats = getDBStats(db);
        let totalEntries = 0;
        for (const [algo, data] of Object.entries(stats)) {
            console.log(`   ${algo.toUpperCase()}: ${data.entries} entradas (${data.sizeFormatted})`);
            totalEntries += data.entries;
        }
        console.log(`   📝 Total de entradas: ${totalEntries}`);
        console.log('');
        
        // Guardar
        if (!outputFile) {
            outputFile = `hash_db_${Date.now()}.json`;
        }
        
        console.log(`💾 Guardando base de datos en: ${outputFile}`);
        const jsonData = {
            timestamp: new Date().toISOString(),
            source,
            algorithms: db.algorithms,
            totalWords: db.words,
            totalEntries: totalEntries,
            data: db.results
        };
        
        fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2));
        const outputInfo = getFileInfo(outputFile);
        console.log(`✅ Base de datos guardada (${outputInfo.sizeFormatted})`);
        
        // Mostrar ejemplo
        console.log('\n📋 EJEMPLO DE HASH (primeras 5 entradas):');
        const firstAlgo = db.algorithms[0];
        const entries = Object.entries(db.results[firstAlgo]).slice(0, 5);
        for (const [hash, word] of entries) {
            console.log(`   ${hash.substring(0, 16)}... → ${word}`);
        }
        
        // Recomendaciones
        console.log('\n🔹 RECOMENDACIONES:');
        console.log('   💡 Para usar la base de datos con el Hash Cracker:');
        console.log(`   node hash-cracker.js --file hashes.txt --wordlist ${outputFile}`);
        console.log('   💡 Para bases más grandes, considera usar SQLite en lugar de JSON');
        console.log('   💡 Ordenar los hashes para búsqueda más rápida (usando índices)');
        
        console.log('\n✅ Hash Database Builder completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
