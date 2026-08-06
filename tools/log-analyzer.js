#!/usr/bin/env node

/**
 * Log File Analyzer - MFH TOOLS PRO
 * Analiza archivos de log en busca de patrones
 * 
 * Uso: node log-analyzer.js <archivo.log> [opciones]
 * Ejemplo: node log-analyzer.js access.log
 * Ejemplo: node log-analyzer.js access.log --patterns IP,ERROR,HTTP
 * Ejemplo: node log-analyzer.js access.log --output reporte.txt
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    patterns: {
        'IP': /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
        'EMAIL': /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
        'URL': /https?:\/\/[^\s]+/g,
        'ERROR': /\b(ERROR|ERR|FAIL|FATAL|CRITICAL)\b/gi,
        'WARNING': /\b(WARNING|WARN|ALERT)\b/gi,
        'SUCCESS': /\b(SUCCESS|OK|SUCCESSFUL|PASSED)\b/gi,
        'HTTP_CODE': /\b\d{3}\b/g,
        'TIMESTAMP': /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?/g,
        'DATE': /\b\d{4}-\d{2}-\d{2}\b/g,
        'TIME': /\b\d{2}:\d{2}:\d{2}\b/g,
        'USER': /\b(user|username|usr|login|auth)\s*[:=]\s*[^\s,]+/gi,
        'PATH': /\b\/[a-zA-Z0-9._/-]+/g,
        'JSON': /\{.*\}/g,
        'HASH': /\b[0-9a-fA-F]{32,64}\b/g,
        'IP_RANGE': /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b\.\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b\.\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b\.\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let selectedPatterns = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Log File Analyzer - MFH TOOLS PRO
=====================================
Analiza archivos de log en busca de patrones.

Uso:
  node log-analyzer.js <archivo.log> [opciones]

Opciones:
  --patterns <lista>   Patrones a buscar (IP,EMAIL,URL,ERROR,WARNING,SUCCESS,HTTP_CODE)
  --output <archivo>   Guardar reporte en archivo
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node log-analyzer.js access.log
  node log-analyzer.js access.log --patterns IP,ERROR,HTTP_CODE
  node log-analyzer.js access.log --output reporte.txt
`);
    process.exit(1);
}

inputFile = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--patterns' && args[i + 1]) {
        selectedPatterns = args[i + 1].split(',').map(p => p.trim().toUpperCase());
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
            lines: 0
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

function analyzeLog(content, patterns) {
    const lines = content.split('\n');
    const results = {};
    const lineResults = [];
    let totalLines = lines.length;
    let emptyLines = 0;
    let errorLines = 0;
    let warningLines = 0;
    
    // Inicializar resultados
    for (const [key, regex] of Object.entries(patterns)) {
        results[key] = {
            count: 0,
            unique: new Set(),
            lines: []
        };
    }
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (trimmed === '') {
            emptyLines++;
            continue;
        }
        
        let lineMatches = {};
        let hasMatch = false;
        
        for (const [key, regex] of Object.entries(patterns)) {
            const matches = line.match(regex);
            if (matches) {
                hasMatch = true;
                results[key].count += matches.length;
                matches.forEach(m => results[key].unique.add(m));
                results[key].lines.push(i + 1);
                lineMatches[key] = matches;
            }
        }
        
        if (hasMatch) {
            lineResults.push({
                line: i + 1,
                content: trimmed,
                matches: lineMatches
            });
        }
        
        // Detectar errores y warnings
        if (trimmed.match(/ERROR|ERR|FAIL|FATAL/gi)) errorLines++;
        if (trimmed.match(/WARNING|WARN/gi)) warningLines++;
    }
    
    return {
        totalLines,
        emptyLines,
        errorLines,
        warningLines,
        results,
        lineResults,
        matchedLines: lineResults.length
    };
}

function detectLogType(lines) {
    const sample = lines.slice(0, 100).join('\n');
    if (sample.includes(' GET ') || sample.includes(' POST ')) return 'HTTP Access Log';
    if (sample.includes('ERROR') && sample.includes('WARNING')) return 'Application Log';
    if (sample.includes('System') || sample.includes('kernel')) return 'System Log';
    if (sample.includes('sshd') || sample.includes('Failed password')) return 'SSH Log';
    if (sample.includes('mysql') || sample.includes('database')) return 'Database Log';
    return 'General Log';
}

function getRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.errorLines > analysis.totalLines * 0.05) {
        recommendations.push('⚠️ Alto número de errores - Revisar configuración del sistema');
    }
    if (analysis.warningLines > analysis.totalLines * 0.1) {
        recommendations.push('⚠️ Muchas advertencias - Considerar optimización');
    }
    if (analysis.emptyLines > analysis.totalLines * 0.2) {
        recommendations.push('💡 Muchas líneas vacías - Verificar formato del log');
    }
    if (analysis.matchedLines < analysis.totalLines * 0.1) {
        recommendations.push('💡 Pocos patrones encontrados - Considerar ampliar búsqueda');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('✅ Log saludable - Sin anomalías significativas');
    }
    
    return recommendations;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Log File Analyzer - MFH TOOLS PRO`);
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
        console.log('📖 Leyendo archivo de log...');
        const content = fs.readFileSync(inputFile, 'utf8');
        const lines = content.split('\n');
        console.log(`📏 Líneas: ${lines.length}`);
        console.log('');
        
        // Detectar tipo de log
        const logType = detectLogType(lines);
        console.log(`📋 Tipo de log detectado: ${logType}`);
        console.log('');
        
        // Seleccionar patrones
        let patterns = CONFIG.patterns;
        if (selectedPatterns) {
            patterns = {};
            for (const p of selectedPatterns) {
                if (CONFIG.patterns[p]) {
                    patterns[p] = CONFIG.patterns[p];
                }
            }
            if (Object.keys(patterns).length === 0) {
                console.error('❌ No se encontraron patrones válidos');
                console.error(`   Patrones disponibles: ${Object.keys(CONFIG.patterns).join(', ')}`);
                process.exit(1);
            }
        }
        
        // Analizar
        console.log('🔍 Analizando log...');
        const analysis = analyzeLog(content, patterns);
        
        console.log('📊 RESULTADOS DEL ANÁLISIS');
        console.log('='.repeat(60));
        console.log(`📝 Total de líneas: ${analysis.totalLines}`);
        console.log(`📝 Líneas vacías: ${analysis.emptyLines}`);
        console.log(`🔴 Errores: ${analysis.errorLines}`);
        console.log(`🟡 Advertencias: ${analysis.warningLines}`);
        console.log(`✅ Líneas con coincidencias: ${analysis.matchedLines}`);
        console.log('');
        
        // Patrones encontrados
        console.log('🔍 PATRONES ENCONTRADOS:');
        for (const [key, data] of Object.entries(analysis.results)) {
            if (data.count > 0) {
                console.log(`   🔹 ${key}: ${data.count} ocurrencias, ${data.unique.size} únicas`);
                if (verbose && data.unique.size > 0) {
                    const uniqueArray = Array.from(data.unique).slice(0, 5);
                    console.log(`      Ejemplos: ${uniqueArray.join(', ')}${data.unique.size > 5 ? ` ... (${data.unique.size} total)` : ''}`);
                }
            }
        }
        console.log('');
        
        // Líneas con coincidencias (primeras 10)
        if (analysis.lineResults.length > 0) {
            console.log('📋 LÍNEAS CON COINCIDENCIAS (primeras 10):');
            const previewLines = analysis.lineResults.slice(0, 10);
            for (const line of previewLines) {
                const matchInfo = Object.keys(line.matches).join(', ');
                console.log(`   ${String(line.line).padStart(6)}: ${line.content.substring(0, 80)}${line.content.length > 80 ? '...' : ''}`);
                console.log(`      → Patrones: ${matchInfo}`);
            }
            if (analysis.lineResults.length > 10) {
                console.log(`   ... y ${analysis.lineResults.length - 10} líneas más`);
            }
            console.log('');
        }
        
        // Recomendaciones
        console.log('🔹 RECOMENDACIONES:');
        const recommendations = getRecommendations(analysis);
        for (const rec of recommendations) {
            console.log(`   ${rec}`);
        }
        
        // Guardar resultados
        if (outputFile) {
            const content = `
Log File Analyzer - MFH TOOLS PRO
================================
Archivo: ${inputFile}
Tipo: ${logType}
Fecha: ${new Date().toLocaleString()}

RESUMEN:
  Total líneas: ${analysis.totalLines}
  Líneas vacías: ${analysis.emptyLines}
  Errores: ${analysis.errorLines}
  Advertencias: ${analysis.warningLines}
  Líneas con coincidencias: ${analysis.matchedLines}

PATRONES:
${Object.entries(analysis.results).map(([key, data]) => `  ${key}: ${data.count} ocurrencias, ${data.unique.size} únicas`).join('\n')}

RECOMENDACIONES:
${recommendations.map(r => `  ${r}`).join('\n')}
`;
            fs.writeFileSync(outputFile, content);
            console.log(`\n📁 Reporte guardado en: ${outputFile}`);
        }
        
        console.log('\n✅ Log File Analyzer completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
