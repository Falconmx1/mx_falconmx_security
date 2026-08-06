#!/usr/bin/env node

/**
 * SQL Query Formatter - MFH TOOLS PRO
 * Formatea consultas SQL
 * 
 * Uso: node sql-formatter.js <archivo> [opciones]
 * Ejemplo: node sql-formatter.js query.sql
 * Ejemplo: node sql-formatter.js "SELECT * FROM users"
 * Ejemplo: node sql-formatter.js query.sql --output formatted.sql
 */

const fs = require('fs');
const path = require('path');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let input = null;
let inputFile = null;
let outputFile = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 SQL Query Formatter - MFH TOOLS PRO
=======================================
Formatea consultas SQL.

Uso:
  node sql-formatter.js <archivo.sql> [opciones]
  node sql-formatter.js "SELECT * FROM users" [opciones]

Opciones:
  --output <archivo>   Guardar SQL formateado en archivo
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node sql-formatter.js query.sql
  node sql-formatter.js "SELECT * FROM users WHERE id = 1"
  node sql-formatter.js query.sql --output formatted.sql
`);
    process.exit(1);
}

input = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
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

function formatSQL(sql) {
    let formatted = '';
    let indentLevel = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let i = 0;
    
    const keywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
        'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
        'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
        'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
        'TABLE', 'INDEX', 'VIEW', 'DROP', 'ALTER', 'ADD', 'COLUMN',
        'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT',
        'UNIQUE', 'CHECK', 'DEFAULT', 'CASCADE', 'RESTRICT'
    ];
    
    const keywordSet = new Set(keywords);
    
    while (i < sql.length) {
        const char = sql[i];
        
        // Manejar comentarios
        if (char === '-' && sql[i + 1] === '-') {
            inComment = true;
            i += 2;
            formatted += '--';
            continue;
        }
        if (char === '/' && sql[i + 1] === '*') {
            inComment = true;
            i += 2;
            formatted += '/*';
            continue;
        }
        if (inComment) {
            if (char === '*' && sql[i + 1] === '/') {
                inComment = false;
                i += 2;
                formatted += '*/';
                continue;
            }
            formatted += char;
            i++;
            continue;
        }
        
        // Manejar strings
        if ((char === "'" || char === '"') && !inString) {
            inString = true;
            stringChar = char;
            formatted += char;
            i++;
            continue;
        }
        if (inString && char === stringChar) {
            // Verificar si es escape
            if (sql[i - 1] === '\\') {
                formatted += char;
                i++;
                continue;
            }
            inString = false;
            formatted += char;
            i++;
            continue;
        }
        
        if (inString) {
            formatted += char;
            i++;
            continue;
        }
        
        // Manejar paréntesis
        if (char === '(') {
            indentLevel++;
            formatted += '(\n' + '  '.repeat(indentLevel);
            i++;
            continue;
        }
        if (char === ')') {
            indentLevel--;
            formatted += '\n' + '  '.repeat(indentLevel) + ')';
            i++;
            continue;
        }
        
        // Manejar comas
        if (char === ',') {
            formatted += ',\n' + '  '.repeat(indentLevel);
            i++;
            continue;
        }
        
        // Manejar punto y coma
        if (char === ';') {
            formatted += ';';
            i++;
            continue;
        }
        
        // Manejar palabras clave
        if (char.toUpperCase() !== char.toLowerCase()) {
            // Es una letra
            let word = '';
            let j = i;
            while (j < sql.length && (sql[j].toUpperCase() !== sql[j].toLowerCase() || sql[j] === '_' || sql[j] === '*')) {
                word += sql[j];
                j++;
            }
            
            const upperWord = word.toUpperCase();
            if (keywordSet.has(upperWord)) {
                if (formatted.length > 0 && formatted[formatted.length - 1] !== '\n') {
                    formatted += '\n';
                }
                formatted += '  '.repeat(indentLevel) + upperWord;
            } else {
                formatted += word;
            }
            i = j;
            continue;
        }
        
        // Manejar espacios
        if (char === ' ' || char === '\t' || char === '\n') {
            if (formatted.length > 0 && formatted[formatted.length - 1] !== '\n' && formatted[formatted.length - 1] !== ' ') {
                formatted += ' ';
            }
            i++;
            continue;
        }
        
        formatted += char;
        i++;
    }
    
    // Limpiar espacios extra
    formatted = formatted.replace(/ +/g, ' ');
    formatted = formatted.replace(/\n +/g, '\n');
    formatted = formatted.replace(/ +\n/g, '\n');
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted.trim();
}

function getSQLType(sql) {
    const upper = sql.toUpperCase();
    if (upper.includes('SELECT')) return 'SELECT';
    if (upper.includes('INSERT')) return 'INSERT';
    if (upper.includes('UPDATE')) return 'UPDATE';
    if (upper.includes('DELETE')) return 'DELETE';
    if (upper.includes('CREATE')) return 'CREATE';
    if (upper.includes('DROP')) return 'DROP';
    if (upper.includes('ALTER')) return 'ALTER';
    return 'UNKNOWN';
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 SQL Query Formatter - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        
        let sql;
        let isFile = false;
        
        // Verificar si es archivo
        if (fs.existsSync(input)) {
            isFile = true;
            inputFile = input;
            console.log(`📁 Archivo: ${inputFile}`);
            const fileInfo = getFileInfo(inputFile);
            console.log(`📏 Tamaño: ${fileInfo.sizeFormatted}`);
            console.log(`📅 Última modificación: ${fileInfo.modified.toLocaleString()}`);
            console.log('');
            
            sql = fs.readFileSync(inputFile, 'utf8');
        } else {
            sql = input;
            console.log(`📝 Consulta SQL directa:`);
            console.log(`   ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
            console.log('');
        }
        
        // Analizar SQL
        const type = getSQLType(sql);
        console.log(`📊 Tipo de consulta: ${type}`);
        console.log(`📏 Longitud: ${sql.length} caracteres`);
        console.log('');
        
        // Formatear
        console.log('🔍 Formateando SQL...');
        const formatted = formatSQL(sql);
        
        console.log('✅ SQL formateado exitosamente');
        console.log(`   📏 Longitud original: ${sql.length}`);
        console.log(`   📏 Longitud formateada: ${formatted.length}`);
        console.log('');
        
        // Mostrar resultado
        console.log('📋 SQL FORMATEADO:');
        console.log('='.repeat(60));
        console.log(formatted);
        
        // Guardar
        if (outputFile) {
            fs.writeFileSync(outputFile, formatted);
            console.log(`\n📁 SQL formateado guardado en: ${outputFile}`);
        } else if (isFile) {
            const baseName = path.basename(inputFile, path.extname(inputFile));
            outputFile = `${baseName}_formatted.sql`;
            fs.writeFileSync(outputFile, formatted);
            console.log(`\n📁 SQL formateado guardado en: ${outputFile}`);
        }
        
        console.log('\n✅ SQL Query Formatter completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
