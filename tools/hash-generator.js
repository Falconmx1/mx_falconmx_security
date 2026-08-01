#!/usr/bin/env node

/**
 * Hash Generator - MFH TOOLS PRO
 * Genera hashes MD5, SHA1, SHA256, SHA512
 * 
 * Uso: node hash-generator.js <texto> [opciones]
 * Ejemplo: node hash-generator.js "Hola mundo"
 * Ejemplo: node hash-generator.js --file archivo.txt
 * Ejemplo: node hash-generator.js "Hola mundo" --algorithms md5,sha256
 */

const crypto = require('crypto');
const fs = require('fs');

// ==================== CONFIGURACIÓN ====================
const ALGORITHMS = {
    md5: 'MD5',
    sha1: 'SHA1',
    sha256: 'SHA256',
    sha384: 'SHA384',
    sha512: 'SHA512'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let input = null;
let filePath = null;
let algorithms = ['md5', 'sha1', 'sha256', 'sha512'];
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Hash Generator - MFH TOOLS PRO
==================================
Genera hashes MD5, SHA1, SHA256, SHA512.

Uso:
  node hash-generator.js <texto> [opciones]
  node hash-generator.js --file <archivo> [opciones]

Opciones:
  --algorithms <tipos>  Algoritmos separados por coma (md5,sha1,sha256,sha512)
  --file <archivo>      Calcular hash de un archivo
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node hash-generator.js "Hola mundo"
  node hash-generator.js "Hola mundo" --algorithms md5,sha256
  node hash-generator.js --file documento.pdf
  node hash-generator.js --file imagen.jpg --algorithms sha256
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
        filePath = args[i + 1];
        i++;
    } else if (args[i] === '--algorithms' && args[i + 1]) {
        algorithms = args[i + 1].split(',').map(a => a.trim().toLowerCase());
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    } else if (!args[i].startsWith('--')) {
        input = args[i];
    }
}

// Validar algoritmos
algorithms = algorithms.filter(a => ALGORITHMS[a]);
if (algorithms.length === 0) {
    console.error('❌ No se especificaron algoritmos válidos');
    console.error(`   Algoritmos disponibles: ${Object.keys(ALGORITHMS).join(', ')}`);
    process.exit(1);
}

// ==================== FUNCIONES ====================
function generateHash(text, algorithm) {
    const hash = crypto.createHash(algorithm);
    hash.update(text, 'utf8');
    return hash.digest('hex');
}

function getFileHash(filePath, algorithm) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(algorithm);
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime
        };
    } catch (error) {
        return null;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Hash Generator - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📋 Algoritmos: ${algorithms.join(', ').toUpperCase()}`);
        console.log('');
        
        let text = input;
        let fileInfo = null;
        
        // Leer desde archivo
        if (filePath) {
            if (!fs.existsSync(filePath)) {
                console.error(`❌ Archivo no encontrado: ${filePath}`);
                process.exit(1);
            }
            fileInfo = getFileInfo(filePath);
            console.log(`📁 Archivo: ${filePath}`);
            console.log(`📏 Tamaño: ${fileInfo.sizeFormatted} (${fileInfo.size} bytes)`);
            console.log(`📅 Última modificación: ${fileInfo.modified.toLocaleString()}`);
            console.log('');
        } else if (!text) {
            console.error('❌ No se proporcionó texto');
            process.exit(1);
        }
        
        // Generar hashes
        const results = [];
        
        if (filePath) {
            // Hash de archivo
            console.log('🔐 Calculando hashes del archivo...');
            console.log('');
            for (const algo of algorithms) {
                try {
                    const hash = await getFileHash(filePath, algo);
                    results.push({ algorithm: algo, hash });
                    console.log(`   ${algo.toUpperCase()}: ${hash}`);
                } catch (error) {
                    console.error(`   ${algo.toUpperCase()}: ❌ Error - ${error.message}`);
                }
            }
        } else {
            // Hash de texto
            console.log('📝 TEXTO ORIGINAL:');
            console.log(`   ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
            console.log('');
            console.log('🔐 HASHS GENERADOS:');
            console.log('');
            for (const algo of algorithms) {
                const hash = generateHash(text, algo);
                results.push({ algorithm: algo, hash });
                console.log(`   ${algo.toUpperCase()}: ${hash}`);
            }
        }
        
        // Guardar resultados
        if (results.length > 0) {
            const outputFile = `hashes_${Date.now()}.txt`;
            let content = `Hash Generator - MFH TOOLS PRO\n`;
            content += `Fecha: ${new Date().toLocaleString()}\n`;
            content += `Archivo: ${filePath || 'Texto'}\n`;
            content += `${'='.repeat(60)}\n`;
            results.forEach(r => {
                content += `${r.algorithm.toUpperCase()}: ${r.hash}\n`;
            });
            fs.writeFileSync(outputFile, content);
            console.log(`\n📁 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Hash Generator completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
