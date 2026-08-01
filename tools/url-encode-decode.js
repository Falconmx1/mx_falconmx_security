#!/usr/bin/env node

/**
 * URL Encode/Decode - MFH TOOLS PRO
 * Codifica y decodifica URLs
 * 
 * Uso: node url-encode-decode.js <texto> [opciones]
 * Ejemplo: node url-encode-decode.js encode "Hola mundo"
 * Ejemplo: node url-encode-decode.js decode "Hola%20mundo"
 * Ejemplo: node url-encode-decode.js --file archivo.txt
 */

const fs = require('fs');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let mode = 'encode';
let input = null;
let filePath = null;
let verbose = false;

if (args.length < 2) {
    console.error(`
🔍 URL Encode/Decode - MFH TOOLS PRO
=====================================
Codifica y decodifica URLs.

Uso:
  node url-encode-decode.js encode <texto>
  node url-encode-decode.js decode <texto>
  node url-encode-decode.js --file <archivo> [encode|decode]

Opciones:
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node url-encode-decode.js encode "Hola mundo"
  node url-encode-decode.js decode "Hola%20mundo"
  node url-encode-decode.js --file texto.txt encode
  node url-encode-decode.js encode "https://ejemplo.com?q=hola mundo"
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === 'encode' || args[i] === 'decode') {
        mode = args[i];
    } else if (args[i] === '--file' && args[i + 1]) {
        filePath = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    } else if (!args[i].startsWith('--') && args[i] !== mode) {
        input = args[i];
    }
}

// ==================== FUNCIONES ====================
function urlEncode(text) {
    // Codificar completamente
    return encodeURIComponent(text);
}

function urlDecode(text) {
    try {
        return decodeURIComponent(text);
    } catch (error) {
        return null;
    }
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
        console.log(`🔍 URL Tool - ${mode}`);
        console.log('='.repeat(60));
        
        let text = input;
        let fileInfo = null;
        
        // Leer desde archivo
        if (filePath) {
            if (!fs.existsSync(filePath)) {
                console.error(`❌ Archivo no encontrado: ${filePath}`);
                process.exit(1);
            }
            fileInfo = getFileInfo(filePath);
            text = fs.readFileSync(filePath, 'utf8');
            console.log(`📁 Archivo: ${filePath}`);
            console.log(`📏 Tamaño: ${fileInfo.sizeFormatted} (${fileInfo.size} bytes)`);
            console.log(`📅 Última modificación: ${fileInfo.modified.toLocaleString()}`);
            console.log('');
        }
        
        if (!text) {
            console.error('❌ No se proporcionó texto');
            process.exit(1);
        }
        
        // Mostrar entrada
        if (!filePath) {
            console.log('📝 TEXTO ORIGINAL:');
            console.log(`   ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
            console.log('');
        }
        
        // Procesar
        let result;
        let operationName;
        
        if (mode === 'encode') {
            result = urlEncode(text);
            operationName = 'ENCODED';
        } else {
            result = urlDecode(text);
            operationName = 'DECODED';
            if (result === null) {
                console.error('❌ Error al decodificar: Verifica que el texto sea URL válido');
                process.exit(1);
            }
        }
        
        // Mostrar resultado
        console.log(`🔹 URL ${operationName}:`);
        console.log(`   ${result}`);
        
        // Mostrar estadísticas
        console.log('');
        console.log('📊 ESTADÍSTICAS:');
        console.log(`   Longitud original: ${text.length} caracteres`);
        console.log(`   Longitud resultante: ${result.length} caracteres`);
        console.log(`   Diferencia: ${result.length - text.length} caracteres`);
        
        // Calcular porcentaje
        if (text.length > 0) {
            const percent = ((result.length - text.length) / text.length * 100).toFixed(2);
            console.log(`   Cambio porcentual: ${percent}%`);
        }
        
        // Guardar resultado
        if (result) {
            const outputFile = `url_${mode}_${Date.now()}.txt`;
            fs.writeFileSync(outputFile, result);
            console.log(`\n📁 Resultado guardado en: ${outputFile}`);
        }
        
        console.log('\n✅ URL Tool completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
