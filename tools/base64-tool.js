#!/usr/bin/env node

/**
 * Base64 Encoder/Decoder - MFH TOOLS PRO
 * Codifica y decodifica Base64
 * 
 * Uso: node base64-tool.js <texto> [opciones]
 * Ejemplo: node base64-tool.js encode "Hola mundo"
 * Ejemplo: node base64-tool.js decode "SG9sYSBtdW5kbw=="
 * Ejemplo: node base64-tool.js --file archivo.txt
 */

const fs = require('fs');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let mode = 'encode';
let input = null;
let filePath = null;

if (args.length < 2) {
    console.error(`
🔍 Base64 Encoder/Decoder - MFH TOOLS PRO
==========================================
Codifica y decodifica Base64.

Uso:
  node base64-tool.js encode <texto>
  node base64-tool.js decode <base64>
  node base64-tool.js --file <archivo> [encode|decode]

Ejemplos:
  node base64-tool.js encode "Hola mundo"
  node base64-tool.js decode "SG9sYSBtdW5kbw=="
  node base64-tool.js --file archivo.txt encode
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === 'encode' || args[i] === 'decode') {
        mode = args[i];
    } else if (args[i] === '--file' && args[i + 1]) {
        filePath = args[i + 1];
        i++;
    } else if (!args[i].startsWith('--') && args[i] !== mode) {
        input = args[i];
    }
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Base64 Tool - ${mode}`);
        console.log('='.repeat(60));
        
        let text = input;
        
        // Leer desde archivo
        if (filePath) {
            if (!fs.existsSync(filePath)) {
                console.error(`❌ Archivo no encontrado: ${filePath}`);
                process.exit(1);
            }
            text = fs.readFileSync(filePath, 'utf8');
            console.log(`📁 Archivo: ${filePath}`);
            console.log(`📏 Tamaño: ${text.length} caracteres`);
            console.log('');
        }
        
        if (!text) {
            console.error('❌ No se proporcionó texto');
            process.exit(1);
        }
        
        let result;
        
        if (mode === 'encode') {
            result = Buffer.from(text, 'utf8').toString('base64');
            console.log('📝 TEXTO ORIGINAL:');
            console.log(`   ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
            console.log('');
            console.log('🔐 BASE64 ENCODED:');
            console.log(`   ${result}`);
        } else {
            try {
                result = Buffer.from(text, 'base64').toString('utf8');
                console.log('🔐 BASE64 INPUT:');
                console.log(`   ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
                console.log('');
                console.log('📝 TEXTO DECODED:');
                console.log(`   ${result}`);
            } catch (error) {
                console.error('❌ Error al decodificar: Verifica que el texto sea Base64 válido');
                process.exit(1);
            }
        }
        
        console.log('\n✅ Base64 Tool completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
