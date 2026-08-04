#!/usr/bin/env node

/**
 * CSV to JSON Converter - MFH TOOLS PRO
 * Convierte archivos CSV a JSON
 * 
 * Uso: node csv-to-json.js <archivo.csv> [opciones]
 * Ejemplo: node csv-to-json.js datos.csv
 * Ejemplo: node csv-to-json.js datos.csv --output datos.json
 * Ejemplo: node csv-to-json.js datos.csv --delimiter ";" --pretty
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    defaultDelimiter: ',',
    maxFileSize: 10 * 1024 * 1024, // 10MB
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let delimiter = CONFIG.defaultDelimiter;
let pretty = false;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 CSV to JSON Converter - MFH TOOLS PRO
=========================================
Convierte archivos CSV a JSON.

Uso:
  node csv-to-json.js <archivo.csv> [opciones]

Opciones:
  --output <archivo>   Archivo de salida JSON (default: nombre_archivo.json)
  --delimiter <char>   Delimitador de columnas (default: ',')
  --pretty             Formatear JSON con indentación
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node csv-to-json.js datos.csv
  node csv-to-json.js datos.csv --output datos.json
  node csv-to-json.js datos.csv --delimiter ";" --pretty
`);
    process.exit(1);
}

inputFile = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--delimiter' && args[i + 1]) {
        delimiter = args[i + 1];
        i++;
    } else if (args[i] === '--pretty') {
        pretty = true;
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

function parseCSV(content, delimiter) {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 1) {
        return { error: 'El archivo CSV está vacío' };
    }
    
    // Parsear headers
    const headers = parseCSVLine(lines[0], delimiter);
    
    if (headers.length === 0) {
        return { error: 'No se encontraron encabezados en el CSV' };
    }
    
    // Limpiar headers
    const cleanHeaders = headers.map(h => h.trim().replace(/["']/g, ''));
    
    // Parsear datos
    const data = [];
    let totalRows = 0;
    let emptyRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) {
            emptyRows++;
            continue;
        }
        
        const values = parseCSVLine(line, delimiter);
        if (values.length === 0) continue;
        
        const row = {};
        cleanHeaders.forEach((header, idx) => {
            const value = values[idx] || '';
            row[header] = value.trim().replace(/["']/g, '');
        });
        data.push(row);
        totalRows++;
    }
    
    return {
        headers: cleanHeaders,
        data,
        totalRows,
        emptyRows,
        totalLines: lines.length
    };
}

function parseCSVLine(line, delimiter) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"' || char === "'") {
            if (inQuotes && line[i + 1] === char) {
                // Escapar comillas dobles
                current += char;
                i += 2;
            } else {
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === delimiter && !inQuotes) {
            values.push(current);
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    if (current !== '' || values.length > 0) {
        values.push(current);
    }
    
    return values;
}

function detectDelimiter(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return ',';
    
    const firstLine = lines[0];
    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let bestCount = 0;
    
    for (const delim of delimiters) {
        const count = (firstLine.match(new RegExp(delim, 'g')) || []).length;
        if (count > bestCount) {
            bestCount = count;
            bestDelimiter = delim;
        }
    }
    
    return bestDelimiter;
}

function getColumnTypes(data) {
    if (data.length === 0) return {};
    
    const types = {};
    const headers = Object.keys(data[0]);
    
    headers.forEach(header => {
        const values = data.map(row => row[header]).filter(v => v !== '');
        if (values.length === 0) {
            types[header] = 'empty';
            return;
        }
        
        // Verificar si todos son números
        const allNumbers = values.every(v => !isNaN(v) && v !== '');
        if (allNumbers) {
            types[header] = 'number';
            return;
        }
        
        // Verificar si son fechas
        const dateRegex = /^\d{4}-\d{2}-\d{2}/;
        const allDates = values.every(v => dateRegex.test(v));
        if (allDates) {
            types[header] = 'date';
            return;
        }
        
        // Verificar si son booleanos
        const boolValues = ['true', 'false', 'si', 'no', 'yes', 'no'];
        const allBooleans = values.every(v => boolValues.includes(v.toLowerCase()));
        if (allBooleans) {
            types[header] = 'boolean';
            return;
        }
        
        types[header] = 'string';
    });
    
    return types;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 CSV to JSON Converter - MFH TOOLS PRO`);
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
        console.log('📖 Leyendo archivo CSV...');
        let content = fs.readFileSync(inputFile, 'utf8');
        
        // Detectar delimitador automáticamente
        if (delimiter === CONFIG.defaultDelimiter) {
            const detected = detectDelimiter(content);
            if (detected !== ',') {
                console.log(`🔍 Delimitador detectado automáticamente: "${detected}"`);
                delimiter = detected;
            }
        }
        
        console.log(`📋 Delimitador: "${delimiter}"`);
        console.log('');
        
        // Parsear CSV
        console.log('🔍 Parseando CSV...');
        const result = parseCSV(content, delimiter);
        
        if (result.error) {
            console.error(`❌ ${result.error}`);
            process.exit(1);
        }
        
        console.log('✅ CSV parseado exitosamente');
        console.log(`   📊 Encabezados: ${result.headers.length} columnas`);
        console.log(`   📊 Filas de datos: ${result.totalRows}`);
        console.log(`   📊 Filas vacías: ${result.emptyRows}`);
        console.log(`   📊 Total líneas: ${result.totalLines}`);
        console.log('');
        
        // Mostrar primeros datos
        if (result.data.length > 0) {
            console.log('📋 PRIMEROS DATOS (vista previa):');
            const preview = result.data.slice(0, 3);
            preview.forEach((row, i) => {
                console.log(`   ${i + 1}. ${JSON.stringify(row)}`);
            });
            if (result.data.length > 3) {
                console.log(`   ... y ${result.data.length - 3} filas más`);
            }
            console.log('');
        }
        
        // Analizar tipos de columnas
        if (result.data.length > 0) {
            const types = getColumnTypes(result.data);
            console.log('📊 TIPOS DE COLUMNAS:');
            Object.entries(types).forEach(([col, type]) => {
                const emoji = type === 'number' ? '🔢' : 
                              type === 'date' ? '📅' : 
                              type === 'boolean' ? '✅' : 
                              type === 'empty' ? '⬜' : '📝';
                console.log(`   ${emoji} ${col}: ${type}`);
            });
            console.log('');
        }
        
        // Guardar JSON
        if (!outputFile) {
            const baseName = path.basename(inputFile, path.extname(inputFile));
            outputFile = `${baseName}.json`;
        }
        
        console.log(`💾 Guardando JSON en: ${outputFile}`);
        const jsonContent = pretty ? JSON.stringify(result.data, null, 2) : JSON.stringify(result.data);
        fs.writeFileSync(outputFile, jsonContent);
        
        const outputInfo = getFileInfo(outputFile);
        console.log(`✅ JSON guardado exitosamente (${outputInfo.sizeFormatted})`);
        
        console.log('\n✅ CSV to JSON Converter completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
