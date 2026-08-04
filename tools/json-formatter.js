#!/usr/bin/env node

/**
 * JSON Formatter/Validator - MFH TOOLS PRO
 * Formatea y valida JSON
 * 
 * Uso: node json-formatter.js <archivo> [opciones]
 * Ejemplo: node json-formatter.js datos.json
 * Ejemplo: node json-formatter.js datos.json --pretty
 * Ejemplo: node json-formatter.js --validate datos.json
 * Ejemplo: node json-formatter.js --minify datos.json --output minificado.json
 */

const fs = require('fs');
const path = require('path');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let mode = 'pretty'; // pretty, minify, validate
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 JSON Formatter/Validator - MFH TOOLS PRO
===========================================
Formatea y valida JSON.

Uso:
  node json-formatter.js <archivo> [opciones]

Opciones:
  --pretty            Formatear JSON con indentación (default)
  --minify            Minificar JSON (eliminar espacios)
  --validate          Solo validar, no guardar
  --output <archivo>  Archivo de salida
  --verbose           Mostrar más detalles
  --help              Mostrar esta ayuda

Ejemplos:
  node json-formatter.js datos.json
  node json-formatter.js datos.json --pretty
  node json-formatter.js --validate datos.json
  node json-formatter.js --minify datos.json --output minificado.json
`);
    process.exit(1);
}

inputFile = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--pretty') {
        mode = 'pretty';
    } else if (args[i] === '--minify') {
        mode = 'minify';
    } else if (args[i] === '--validate') {
        mode = 'validate';
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

function validateAndParseJSON(content) {
    try {
        const data = JSON.parse(content);
        return { success: true, data };
    } catch (error) {
        const errorInfo = {
            position: error.message.match(/position (\d+)/),
            line: error.message.match(/line (\d+)/),
            column: error.message.match(/column (\d+)/)
        };
        return {
            success: false,
            error: error.message,
            position: errorInfo.position ? parseInt(errorInfo.position[1]) : null,
            line: errorInfo.line ? parseInt(errorInfo.line[1]) : null,
            column: errorInfo.column ? parseInt(errorInfo.column[1]) : null
        };
    }
}

function analyzeJSON(data, path = 'root') {
    const analysis = {
        type: Array.isArray(data) ? 'array' : typeof data,
        size: 0,
        keys: [],
        depth: 1,
        maxDepth: 1,
        totalItems: 0
    };
    
    if (analysis.type === 'object' && data !== null) {
        analysis.keys = Object.keys(data);
        analysis.size = analysis.keys.length;
        // Recursivo para profundidad
        let maxDepth = 1;
        for (const key of analysis.keys) {
            const value = data[key];
            if (typeof value === 'object' && value !== null) {
                const subAnalysis = analyzeJSON(value, `${path}.${key}`);
                maxDepth = Math.max(maxDepth, subAnalysis.maxDepth + 1);
            }
        }
        analysis.maxDepth = maxDepth;
        analysis.totalItems = analysis.keys.length;
    } else if (analysis.type === 'array') {
        analysis.size = data.length;
        analysis.totalItems = data.length;
        // Recursivo para profundidad
        let maxDepth = 1;
        for (const item of data) {
            if (typeof item === 'object' && item !== null) {
                const subAnalysis = analyzeJSON(item, `${path}[0]`);
                maxDepth = Math.max(maxDepth, subAnalysis.maxDepth + 1);
            }
        }
        analysis.maxDepth = maxDepth;
    }
    
    return analysis;
}

function getSizeInKB(data) {
    const jsonStr = JSON.stringify(data);
    return jsonStr.length / 1024;
}

function highlightJSON(jsonStr) {
    // Solo para mostrar en la consola con colores básicos
    let highlighted = jsonStr;
    // Resaltar strings
    highlighted = highlighted.replace(/"([^"]*)"/g, '\x1b[32m"$1"\x1b[0m');
    // Resaltar números
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '\x1b[33m$1\x1b[0m');
    // Resaltar booleanos y null
    highlighted = highlighted.replace(/\b(true|false|null)\b/g, '\x1b[36m$1\x1b[0m');
    // Resaltar llaves y corchetes
    highlighted = highlighted.replace(/([{}\[\]])/g, '\x1b[90m$1\x1b[0m');
    return highlighted;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 JSON Formatter/Validator - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📝 Modo: ${mode}`);
        console.log(`📁 Archivo: ${inputFile}`);
        
        // Verificar archivo
        if (!fs.existsSync(inputFile)) {
            console.error(`❌ Archivo no encontrado: ${inputFile}`);
            process.exit(1);
        }
        
        const fileInfo = getFileInfo(inputFile);
        console.log(`📏 Tamaño: ${fileInfo.sizeFormatted}`);
        console.log(`📅 Última modificación: ${fileInfo.modified.toLocaleString()}`);
        console.log('');
        
        // Leer archivo
        console.log('📖 Leyendo archivo JSON...');
        const content = fs.readFileSync(inputFile, 'utf8');
        console.log(`📏 Longitud: ${content.length} caracteres`);
        console.log('');
        
        // Validar y parsear
        console.log('🔍 Validando JSON...');
        const result = validateAndParseJSON(content);
        
        if (!result.success) {
            console.error('❌ JSON INVÁLIDO');
            console.error(`   Error: ${result.error}`);
            if (result.line) {
                console.error(`   Línea: ${result.line}, Columna: ${result.column}`);
                // Mostrar línea con error
                const lines = content.split('\n');
                if (result.line <= lines.length) {
                    const errorLine = lines[result.line - 1];
                    console.error(`   Línea: ${errorLine.trim()}`);
                    if (result.column) {
                        const pointer = ' '.repeat(result.column - 1) + '^';
                        console.error(`   ${pointer}`);
                    }
                }
            }
            process.exit(1);
        }
        
        console.log('✅ JSON VÁLIDO');
        console.log('');
        
        // Analizar JSON
        console.log('📊 ANÁLISIS DEL JSON:');
        const analysis = analyzeJSON(result.data);
        console.log(`   🔹 Tipo: ${analysis.type}`);
        console.log(`   🔹 Tamaño: ${analysis.size} elementos`);
        console.log(`   🔹 Profundidad máxima: ${analysis.maxDepth}`);
        if (analysis.type === 'object') {
            console.log(`   🔹 Llaves principales: ${analysis.keys.slice(0, 5).join(', ')}${analysis.keys.length > 5 ? ` ... (${analysis.keys.length} total)` : ''}`);
        }
        console.log(`   🔹 Tamaño en memoria: ${getSizeInKB(result.data).toFixed(2)} KB`);
        console.log('');
        
        // Mostrar estructura
        if (verbose) {
            console.log('📋 ESTRUCTURA:');
            console.log(JSON.stringify(result.data, null, 2).slice(0, 500) + '...');
            console.log('');
        }
        
        // Procesar según modo
        if (mode === 'validate') {
            console.log('✅ Validación completada exitosamente');
            console.log('   El archivo JSON es válido y está bien formado');
            process.exit(0);
        }
        
        // Determinar salida
        if (!outputFile && mode !== 'validate') {
            const baseName = path.basename(inputFile, path.extname(inputFile));
            const suffix = mode === 'pretty' ? '_formatted' : '_minified';
            outputFile = `${baseName}${suffix}.json`;
        }
        
        // Formatear JSON
        console.log(`🔍 ${mode === 'pretty' ? 'Formateando' : 'Minificando'} JSON...`);
        let jsonOutput;
        if (mode === 'pretty') {
            jsonOutput = JSON.stringify(result.data, null, 2);
        } else {
            jsonOutput = JSON.stringify(result.data);
        }
        
        // Guardar
        if (outputFile && mode !== 'validate') {
            fs.writeFileSync(outputFile, jsonOutput);
            const outputInfo = getFileInfo(outputFile);
            console.log(`💾 Archivo guardado: ${outputFile} (${outputInfo.sizeFormatted})`);
            console.log(`   Tamaño original: ${fileInfo.sizeFormatted}`);
            console.log(`   Compresión: ${((1 - outputInfo.size / fileInfo.size) * 100).toFixed(2)}%`);
        }
        
        // Mostrar preview
        console.log('\n📋 PREVIEW DEL JSON PROCESADO:');
        const preview = jsonOutput.slice(0, 500);
        if (mode === 'pretty') {
            console.log(highlightJSON(preview) + (jsonOutput.length > 500 ? '...' : ''));
        } else {
            console.log(preview + (jsonOutput.length > 500 ? '...' : ''));
        }
        
        console.log('\n✅ JSON Formatter/Validator completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
