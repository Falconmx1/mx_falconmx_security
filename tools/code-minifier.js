#!/usr/bin/env node

/**
 * Code Minifier - MFH TOOLS PRO
 * Minifica código JS/CSS/HTML
 * 
 * Uso: node code-minifier.js <archivo> [opciones]
 * Ejemplo: node code-minifier.js script.js
 * Ejemplo: node code-minifier.js style.css --output style.min.css
 * Ejemplo: node code-minifier.js index.html --type html
 */

const fs = require('fs');
const path = require('path');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let type = 'auto';
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Code Minifier - MFH TOOLS PRO
=================================
Minifica código JS/CSS/HTML.

Uso:
  node code-minifier.js <archivo> [opciones]

Opciones:
  --type <js|css|html>  Tipo de archivo (auto detectado por defecto)
  --output <archivo>    Archivo de salida minificado
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node code-minifier.js script.js
  node code-minifier.js style.css --output style.min.css
  node code-minifier.js index.html --type html
`);
    process.exit(1);
}

inputFile = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
        type = args[i + 1].toLowerCase();
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime,
            ext: path.extname(filePath).toLowerCase()
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

function detectType(filePath, content) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.js') return 'js';
    if (ext === '.css') return 'css';
    if (ext === '.html' || ext === '.htm') return 'html';
    
    // Intentar detectar por contenido
    if (content.includes('function') || content.includes('var ') || content.includes('const ')) {
        return 'js';
    }
    if (content.includes('{') && content.includes('}') && content.includes(':')) {
        return 'css';
    }
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        return 'html';
    }
    
    return 'js'; // Default
}

function minifyJS(code) {
    // Eliminar comentarios de línea y bloque
    code = code.replace(/\/\/.*$/gm, '');
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Eliminar espacios en blanco innecesarios
    code = code.replace(/\n/g, ' ');
    code = code.replace(/\s{2,}/g, ' ');
    
    // Eliminar espacios alrededor de operadores y llaves
    code = code.replace(/ \s?/g, '');
    code = code.replace(/ \s?/g, '');
    
    // Eliminar espacios entre ; y }
    code = code.replace(/; /g, ';');
    code = code.replace(/ }/g, '}');
    code = code.replace(/{ /g, '{');
    code = code.replace(/ }/g, '}');
    
    // Eliminar espacios entre , y siguiente token
    code = code.replace(/, /g, ',');
    
    // Eliminar ; innecesarios
    code = code.replace(/;;/g, ';');
    
    // Eliminar espacios entre paréntesis
    code = code.replace(/\( /g, '(');
    code = code.replace(/ \)/g, ')');
    
    return code.trim();
}

function minifyCSS(code) {
    // Eliminar comentarios
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Eliminar espacios en blanco innecesarios
    code = code.replace(/\n/g, ' ');
    code = code.replace(/\s{2,}/g, ' ');
    
    // Eliminar espacios alrededor de { } : ;
    code = code.replace(/ {/g, '{');
    code = code.replace(/ }/g, '}');
    code = code.replace(/{ /g, '{');
    code = code.replace(/; /g, ';');
    code = code.replace(/: /g, ':');
    code = code.replace(/ ,/g, ',');
    
    // Eliminar ; final innecesario
    code = code.replace(/;}/g, '}');
    
    return code.trim();
}

function minifyHTML(code) {
    // Eliminar comentarios HTML
    code = code.replace(/<!--[\s\S]*?-->/g, '');
    
    // Eliminar espacios en blanco innecesarios
    code = code.replace(/\n/g, ' ');
    code = code.replace(/\s{2,}/g, ' ');
    
    // Eliminar espacios entre tags
    code = code.replace(/> </g, '><');
    
    // Eliminar atributos innecesarios
    code = code.replace(/ type="text\/javascript"/g, '');
    code = code.replace(/ type="text\/css"/g, '');
    
    // Eliminar espacios en atributos
    code = code.replace(/=" "/g, '=""');
    
    return code.trim();
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Code Minifier - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📁 Archivo: ${inputFile}`);
        
        // Verificar archivo
        if (!fs.existsSync(inputFile)) {
            console.error(`❌ Archivo no encontrado: ${inputFile}`);
            process.exit(1);
        }
        
        const fileInfo = getFileInfo(inputFile);
        console.log(`📏 Tamaño: ${fileInfo.sizeFormatted}`);
        console.log(`📅 Última modificación: ${fileInfo.modified.toLocaleString()}`);
        
        // Leer archivo
        console.log('📖 Leyendo archivo...');
        const content = fs.readFileSync(inputFile, 'utf8');
        const originalSize = content.length;
        console.log(`📏 Longitud: ${originalSize} caracteres`);
        console.log('');
        
        // Detectar tipo
        if (type === 'auto') {
            type = detectType(inputFile, content);
        }
        console.log(`📋 Tipo detectado: ${type.toUpperCase()}`);
        console.log('');
        
        // Minificar
        console.log(`🔍 Minificando ${type.toUpperCase()}...`);
        let minified;
        let minifiedSize;
        
        switch(type) {
            case 'js':
                minified = minifyJS(content);
                minifiedSize = minified.length;
                break;
            case 'css':
                minified = minifyCSS(content);
                minifiedSize = minified.length;
                break;
            case 'html':
                minified = minifyHTML(content);
                minifiedSize = minified.length;
                break;
            default:
                console.error(`❌ Tipo no soportado: ${type}`);
                process.exit(1);
        }
        
        console.log(`✅ Minificación completada`);
        console.log(`   📏 Original: ${originalSize} caracteres`);
        console.log(`   📏 Minificado: ${minifiedSize} caracteres`);
        console.log(`   📊 Reducción: ${((1 - minifiedSize / originalSize) * 100).toFixed(2)}%`);
        console.log('');
        
        // Guardar
        if (!outputFile) {
            const baseName = path.basename(inputFile, path.extname(inputFile));
            const ext = path.extname(inputFile);
            outputFile = `${baseName}.min${ext}`;
        }
        
        console.log(`💾 Guardando archivo minificado en: ${outputFile}`);
        fs.writeFileSync(outputFile, minified);
        
        const outputInfo = getFileInfo(outputFile);
        console.log(`✅ Archivo guardado exitosamente (${outputInfo.sizeFormatted})`);
        
        // Mostrar preview
        console.log('\n📋 PREVIEW DEL CÓDIGO MINIFICADO:');
        const preview = minified.slice(0, 500);
        console.log(preview + (minified.length > 500 ? '...' : ''));
        
        console.log('\n✅ Code Minifier completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
