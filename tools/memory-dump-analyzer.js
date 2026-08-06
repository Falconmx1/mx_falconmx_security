#!/usr/bin/env node

/**
 * Memory Dump Analyzer - MFH TOOLS PRO
 * Analiza volcados de memoria
 * 
 * Uso: node memory-dump-analyzer.js <archivo> [opciones]
 * Ejemplo: node memory-dump-analyzer.js dump.bin
 * Ejemplo: node memory-dump-analyzer.js dump.bin --format hex
 * Ejemplo: node memory-dump-analyzer.js dump.bin --output reporte.txt
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    chunkSize: 4096,
    signatures: {
        // Cabeceras de archivos comunes
        'FF D8 FF E0': 'JPEG',
        '89 50 4E 47': 'PNG',
        '25 50 44 46': 'PDF',
        '50 4B 03 04': 'ZIP',
        '7F 45 4C 46': 'ELF',
        '4D 5A 90 00': 'PE (Windows EXE)',
        '1F 8B 08': 'GZIP',
        '52 61 72 21': 'RAR',
        '42 4D': 'BMP',
        '49 49 2A 00': 'TIFF (Little Endian)',
        '4D 4D 00 2A': 'TIFF (Big Endian)',
        '00 00 01 00': 'ICO',
        // Strings comunes
        'This program cannot be run in DOS mode': 'Windows PE',
        'ELF': 'Linux ELF',
        'Mach-O': 'macOS Mach-O'
    },
    hexPatterns: {
        'password': 'Contraseña',
        'passwd': 'Contraseña',
        'secret': 'Secreto',
        'api_key': 'API Key',
        'token': 'Token',
        'jwt': 'JWT',
        'ssh': 'SSH',
        'https?://': 'URL HTTP',
        '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b': 'Dirección IP',
        '\\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}\\b': 'Correo electrónico',
        '\\b[0-9a-fA-F]{32}\\b': 'Hash MD5',
        '\\b[0-9a-fA-F]{40}\\b': 'Hash SHA1',
        '\\b[0-9a-fA-F]{64}\\b': 'Hash SHA256'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let format = 'hex';
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Memory Dump Analyzer - MFH TOOLS PRO
========================================
Analiza volcados de memoria.

Uso:
  node memory-dump-analyzer.js <archivo> [opciones]

Opciones:
  --format <hex|ascii|both>  Formato de salida (default: hex)
  --output <archivo>         Guardar reporte en archivo
  --verbose                  Mostrar más detalles
  --help                     Mostrar esta ayuda

Ejemplos:
  node memory-dump-analyzer.js dump.bin
  node memory-dump-analyzer.js dump.bin --format hex
  node memory-dump-analyzer.js dump.bin --output reporte.txt
`);
    process.exit(1);
}

inputFile = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) {
        format = args[i + 1].toLowerCase();
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

function detectFileSignature(buffer) {
    const hex = buffer.toString('hex').toUpperCase();
    const signatures = CONFIG.signatures;
    
    for (const [sig, name] of Object.entries(signatures)) {
        const cleanSig = sig.replace(/\s/g, '');
        if (hex.startsWith(cleanSig)) {
            return name;
        }
    }
    
    // Buscar strings
    const str = buffer.toString('ascii');
    for (const [pattern, name] of Object.entries(signatures)) {
        if (typeof pattern === 'string' && str.includes(pattern)) {
            return name;
        }
    }
    
    return 'Desconocido';
}

function findStrings(buffer, minLength = 4) {
    const strings = [];
    let current = '';
    let currentPos = 0;
    let startPos = 0;
    
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        const isPrintable = byte >= 32 && byte <= 126;
        
        if (isPrintable) {
            if (current.length === 0) startPos = i;
            current += String.fromCharCode(byte);
        } else {
            if (current.length >= minLength) {
                strings.push({ string: current, offset: startPos, length: current.length });
            }
            current = '';
        }
    }
    
    if (current.length >= minLength) {
        strings.push({ string: current, offset: startPos, length: current.length });
    }
    
    return strings;
}

function findHexPatterns(buffer) {
    const patterns = [];
    const hex = buffer.toString('hex').toUpperCase();
    
    for (const [pattern, name] of Object.entries(CONFIG.hexPatterns)) {
        try {
            const regex = new RegExp(pattern, 'gi');
            const matches = hex.match(regex);
            if (matches) {
                patterns.push({ pattern: name, count: matches.length });
            }
        } catch (e) {
            // Ignorar patrones inválidos
        }
    }
    
    return patterns;
}

function analyzeMemory(buffer) {
    const analysis = {
        size: buffer.length,
        sizeFormatted: formatFileSize(buffer.length),
        fileSignature: detectFileSignature(buffer),
        strings: findStrings(buffer),
        hexPatterns: findHexPatterns(buffer),
        entropy: calculateEntropy(buffer),
        firstBytes: buffer.slice(0, 64).toString('hex').toUpperCase(),
        hasNullBytes: buffer.includes(0x00),
        hasNonPrintable: false
    };
    
    // Verificar caracteres no imprimibles
    let nonPrintableCount = 0;
    for (let i = 0; i < Math.min(buffer.length, 10000); i++) {
        if (buffer[i] < 32 && buffer[i] !== 10 && buffer[i] !== 13) {
            nonPrintableCount++;
        }
    }
    analysis.hasNonPrintable = nonPrintableCount > 0;
    analysis.nonPrintableRatio = (nonPrintableCount / Math.min(buffer.length, 10000) * 100).toFixed(2);
    
    return analysis;
}

function calculateEntropy(buffer) {
    const freq = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
        freq[buffer[i]]++;
    }
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
        if (freq[i] > 0) {
            const p = freq[i] / buffer.length;
            entropy -= p * Math.log2(p);
        }
    }
    return parseFloat(entropy.toFixed(4));
}

function formatHexDump(buffer, offset = 0, length = 256) {
    const end = Math.min(offset + length, buffer.length);
    let result = '';
    let ascii = '';
    
    for (let i = offset; i < end; i++) {
        if (i % 16 === 0 && i > offset) {
            result += `  ${ascii}\n`;
            ascii = '';
        }
        if (i % 16 === 0) {
            result += `${i.toString(16).padStart(8, '0')}: `;
        }
        const byte = buffer[i];
        result += `${byte.toString(16).padStart(2, '0').toUpperCase()} `;
        ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
    }
    
    // Completar última línea
    const remaining = 16 - (end - offset) % 16;
    if (remaining < 16) {
        result += '   '.repeat(remaining);
        result += `  ${ascii}`;
    }
    
    return result;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Memory Dump Analyzer - MFH TOOLS PRO`);
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
        console.log('📖 Leyendo volcado de memoria...');
        const buffer = fs.readFileSync(inputFile);
        console.log(`📏 Tamaño del buffer: ${formatFileSize(buffer.length)}`);
        console.log('');
        
        // Analizar
        console.log('🔍 Analizando volcado de memoria...');
        const analysis = analyzeMemory(buffer);
        
        console.log('📊 ANÁLISIS DEL VOLCADO');
        console.log('='.repeat(60));
        console.log(`📏 Tamaño: ${analysis.sizeFormatted}`);
        console.log(`🔢 Entropía: ${analysis.entropy} (${analysis.entropy > 7 ? 'Alta' : analysis.entropy > 5 ? 'Media' : 'Baja'})`);
        console.log(`📄 Firma detectada: ${analysis.fileSignature}`);
        console.log(`🔲 Bytes nulos: ${analysis.hasNullBytes ? '✅ Presentes' : '❌ Ausentes'}`);
        console.log(`📝 Caracteres imprimibles: ${analysis.nonPrintableRatio > 50 ? 'Bajo' : 'Normal'}`);
        console.log('');
        
        // Strings encontrados
        if (analysis.strings.length > 0) {
            console.log('🔤 STRINGS ENCONTRADOS:');
            const sortedStrings = analysis.strings.sort((a, b) => b.length - a.length).slice(0, 20);
            for (const str of sortedStrings) {
                console.log(`   📍 Offset ${str.offset.toString(16).padStart(8, '0')}: "${str.string}" (${str.length} chars)`);
            }
            if (analysis.strings.length > 20) {
                console.log(`   ... y ${analysis.strings.length - 20} strings más`);
            }
            console.log('');
        }
        
        // Patrones
        if (analysis.hexPatterns.length > 0) {
            console.log('🔍 PATRONES DETECTADOS:');
            for (const pattern of analysis.hexPatterns) {
                console.log(`   🔹 ${pattern.pattern}: ${pattern.count} ocurrencias`);
            }
            console.log('');
        }
        
        // Hex dump (primeros 256 bytes)
        console.log('📋 HEX DUMP (primeros 256 bytes):');
        console.log('='.repeat(60));
        console.log(formatHexDump(buffer, 0, 256));
        console.log('');
        
        // Recomendaciones
        console.log('🔹 RECOMENDACIONES:');
        if (analysis.entropy > 7) {
            console.log('   ⚠️ Entropía alta - El archivo puede estar comprimido o cifrado');
        }
        if (analysis.strings.length > 0) {
            console.log('   💡 Se encontraron strings legibles - Revisar por información sensible');
        }
        if (analysis.hasNullBytes) {
            console.log('   💡 Presencia de bytes nulos - Posible archivo binario o estructura de datos');
        }
        
        // Guardar resultados
        if (outputFile) {
            const content = `
Memory Dump Analyzer - MFH TOOLS PRO
====================================
Archivo: ${inputFile}
Tamaño: ${analysis.sizeFormatted}
Fecha: ${new Date().toLocaleString()}
Entropía: ${analysis.entropy}
Firma: ${analysis.fileSignature}

STRINGS ENCONTRADOS:
${analysis.strings.map(s => `  ${s.offset.toString(16)}: "${s.string}"`).join('\n')}

PATRONES DETECTADOS:
${analysis.hexPatterns.map(p => `  ${p.pattern}: ${p.count}`).join('\n')}
`;
            fs.writeFileSync(outputFile, content);
            console.log(`\n📁 Reporte guardado en: ${outputFile}`);
        }
        
        console.log('\n✅ Memory Dump Analyzer completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
