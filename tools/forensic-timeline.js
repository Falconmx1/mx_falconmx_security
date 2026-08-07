#!/usr/bin/env node

/**
 * Forensic Timeline Generator - MFH TOOLS PRO
 * Genera línea de tiempo forense a partir de logs y eventos
 * 
 * Uso: node forensic-timeline.js <archivo.log> [opciones]
 * Ejemplo: node forensic-timeline.js access.log
 * Ejemplo: node forensic-timeline.js --files log1.log,log2.log --output timeline.html
 * Ejemplo: node forensic-timeline.js --directory logs/ --format html
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    maxFileSize: 50 * 1024 * 1024,
    timePatterns: [
        /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?/g,
        /\d{2}\/[a-zA-Z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}/g,
        /\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/g,
        /\d{2}:\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}/g,
        /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g
    ],
    severity: {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡',
        'LOW': '🟢',
        'INFO': 'ℹ️'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFiles = [];
let directory = null;
let outputFile = null;
let format = 'text';
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Forensic Timeline Generator - MFH TOOLS PRO
===============================================
Genera línea de tiempo forense a partir de logs y eventos.

Uso:
  node forensic-timeline.js <archivo.log> [opciones]
  node forensic-timeline.js --files log1.log,log2.log [opciones]
  node forensic-timeline.js --directory logs/ [opciones]

Opciones:
  --files <lista>      Archivos separados por coma
  --directory <dir>    Directorio con archivos de log
  --output <archivo>   Archivo de salida (txt, html, json)
  --format <txt|html|json>  Formato de salida (default: txt)
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node forensic-timeline.js access.log
  node forensic-timeline.js --files log1.log,log2.log --output timeline.html
  node forensic-timeline.js --directory logs/ --format html
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--files' && args[i + 1]) {
        inputFiles = args[i + 1].split(',').map(f => f.trim());
        i++;
    } else if (args[i] === '--directory' && args[i + 1]) {
        directory = args[i + 1];
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--format' && args[i + 1]) {
        format = args[i + 1].toLowerCase();
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    } else if (!args[i].startsWith('--')) {
        inputFiles.push(args[i]);
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
            name: path.basename(filePath)
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

function extractTimestamps(line) {
    const timestamps = [];
    for (const pattern of CONFIG.timePatterns) {
        const matches = line.match(pattern);
        if (matches) {
            for (const match of matches) {
                const parsed = parseTimestamp(match);
                if (parsed) timestamps.push({ raw: match, parsed });
            }
        }
    }
    return timestamps;
}

function parseTimestamp(str) {
    try {
        // Intentar varios formatos
        let date = new Date(str);
        if (!isNaN(date.getTime())) return date;
        
        // Formato Apache: 01/Jan/2025:12:34:56
        const apacheMatch = str.match(/(\d{2})\/([a-zA-Z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/);
        if (apacheMatch) {
            const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                           'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
            date = new Date(parseInt(apacheMatch[3]), months[apacheMatch[2]] || 0, parseInt(apacheMatch[1]),
                          parseInt(apacheMatch[4]), parseInt(apacheMatch[5]), parseInt(apacheMatch[6]));
            if (!isNaN(date.getTime())) return date;
        }
        
        // Formato: 2025-01-01 12:34:56
        const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (isoMatch) {
            date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2])-1, parseInt(isoMatch[3]),
                          parseInt(isoMatch[4]), parseInt(isoMatch[5]), parseInt(isoMatch[6]));
            if (!isNaN(date.getTime())) return date;
        }
        
        return null;
    } catch (e) {
        return null;
    }
}

function detectSeverity(line) {
    const lower = line.toLowerCase();
    if (lower.includes('critical') || lower.includes('fatal')) return 'CRITICAL';
    if (lower.includes('high') || lower.includes('error') || lower.includes('fail')) return 'HIGH';
    if (lower.includes('medium') || lower.includes('warning') || lower.includes('warn')) return 'MEDIUM';
    if (lower.includes('low') || lower.includes('info')) return 'LOW';
    return 'INFO';
}

function detectEventType(line) {
    const lower = line.toLowerCase();
    if (lower.includes('login') || lower.includes('auth') || lower.includes('password')) return 'Autenticación';
    if (lower.includes('access') || lower.includes('request') || lower.includes('get') || lower.includes('post')) return 'Acceso';
    if (lower.includes('error') || lower.includes('fail') || lower.includes('timeout')) return 'Error';
    if (lower.includes('change') || lower.includes('modify') || lower.includes('update')) return 'Modificación';
    if (lower.includes('delete') || lower.includes('remove')) return 'Eliminación';
    if (lower.includes('create') || lower.includes('add') || lower.includes('new')) return 'Creación';
    if (lower.includes('ssh') || lower.includes('ftp') || lower.includes('telnet')) return 'Conexión';
    return 'Evento';
}

function extractIP(line) {
    const match = line.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    return match ? match[0] : null;
}

function extractUser(line) {
    const match = line.match(/(?:user|username|usr|login)\s*[:=]\s*([^\s,]+)/i);
    return match ? match[1] : null;
}

function processFile(filePath) {
    const events = [];
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let lineNumber = 0;
    
    for (const line of lines) {
        lineNumber++;
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const timestamps = extractTimestamps(trimmed);
        const timestamp = timestamps.length > 0 ? timestamps[0].parsed : null;
        const rawTimestamp = timestamps.length > 0 ? timestamps[0].raw : null;
        
        events.push({
            timestamp,
            rawTimestamp: rawTimestamp || 'Unknown',
            line: trimmed,
            lineNumber,
            source: path.basename(filePath),
            severity: detectSeverity(trimmed),
            type: detectEventType(trimmed),
            ip: extractIP(trimmed),
            user: extractUser(trimmed)
        });
    }
    
    return events;
}

function generateTimeline(events) {
    // Ordenar por timestamp
    const sorted = [...events].sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return a.timestamp - b.timestamp;
    });
    
    return sorted;
}

function formatText(timeline) {
    let output = '🔍 LÍNEA DE TIEMPO FORENSE\n';
    output += '='.repeat(60) + '\n';
    output += `Total de eventos: ${timeline.length}\n\n`;
    
    let lastDate = '';
    for (const event of timeline) {
        const dateStr = event.timestamp ? event.timestamp.toLocaleString() : 'Fecha desconocida';
        const sev = CONFIG.severity[event.severity] || 'ℹ️';
        const type = event.type || 'Evento';
        
        if (dateStr !== lastDate) {
            output += `\n📅 ${dateStr}\n`;
            output += '-'.repeat(50) + '\n';
            lastDate = dateStr;
        }
        
        output += `${sev} [${type}] ${event.line.substring(0, 150)}${event.line.length > 150 ? '...' : ''}\n`;
        if (event.ip) output += `   📍 IP: ${event.ip}\n`;
        if (event.user) output += `   👤 Usuario: ${event.user}\n`;
        output += `   📁 Fuente: ${event.source}:${event.lineNumber}\n`;
        output += '\n';
    }
    
    return output;
}

function formatHTML(timeline) {
    let output = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Línea de Tiempo Forense</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; background: #f5f5f5; color: #333; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        .stats { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .timeline { position: relative; padding-left: 30px; }
        .timeline::before { content: ''; position: absolute; left: 10px; top: 0; bottom: 0; width: 2px; background: #ddd; }
        .event { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #3498db; }
        .event.critical { border-left-color: #dc3545; }
        .event.high { border-left-color: #fd7e14; }
        .event.medium { border-left-color: #ffc107; }
        .event.low { border-left-color: #28a745; }
        .event.info { border-left-color: #17a2b8; }
        .event .date { font-weight: bold; color: #2c3e50; }
        .event .severity { font-size: 1.2rem; }
        .event .content { margin: 10px 0; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-break: break-all; }
        .event .meta { color: #6c757d; font-size: 0.9rem; }
        .event .meta span { margin-right: 15px; }
        .timeline-point { position: absolute; left: 6px; top: 20px; width: 10px; height: 10px; border-radius: 50%; background: #3498db; border: 2px solid white; box-shadow: 0 0 0 2px #3498db; }
    </style>
</head>
<body>
    <h1>🔍 Línea de Tiempo Forense</h1>
    <div class="stats">
        <strong>Total de eventos:</strong> ${timeline.length} |
        <strong>Fuentes:</strong> ${new Set(timeline.map(e => e.source)).size} |
        <strong>Generado:</strong> ${new Date().toLocaleString()}
    </div>
    <div class="timeline">`;
    
    let lastDate = '';
    let eventCount = 0;
    for (const event of timeline) {
        eventCount++;
        const dateStr = event.timestamp ? event.timestamp.toLocaleString() : 'Fecha desconocida';
        const sevClass = event.severity.toLowerCase();
        const sevEmoji = CONFIG.severity[event.severity] || 'ℹ️';
        
        if (dateStr !== lastDate) {
            output += `<div style="font-weight:bold;margin:20px 0 10px 0;color:#2c3e50;">📅 ${dateStr}</div>`;
            lastDate = dateStr;
        }
        
        output += `
    <div class="event ${sevClass}">
        <div class="timeline-point"></div>
        <div class="date">#${eventCount} ${sevEmoji} ${event.type || 'Evento'}</div>
        <div class="content">${escapeHTML(event.line.substring(0, 300))}${event.line.length > 300 ? '...' : ''}</div>
        <div class="meta">
            <span>📁 ${event.source}:${event.lineNumber}</span>
            ${event.ip ? `<span>📍 ${event.ip}</span>` : ''}
            ${event.user ? `<span>👤 ${event.user}</span>` : ''}
            <span>🕐 ${event.rawTimestamp || 'Desconocido'}</span>
        </div>
    </div>`;
    }
    
    output += `
    </div>
</body>
</html>`;
    return output;
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatJSON(timeline) {
    return JSON.stringify(timeline.map(e => ({
        timestamp: e.timestamp ? e.timestamp.toISOString() : null,
        rawTimestamp: e.rawTimestamp,
        line: e.line,
        source: e.source,
        lineNumber: e.lineNumber,
        severity: e.severity,
        type: e.type,
        ip: e.ip,
        user: e.user
    })), null, 2);
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Forensic Timeline Generator - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        
        // Recopilar archivos
        let files = [];
        if (directory) {
            if (!fs.existsSync(directory)) {
                console.error(`❌ Directorio no encontrado: ${directory}`);
                process.exit(1);
            }
            const entries = fs.readdirSync(directory);
            files = entries.filter(f => fs.statSync(path.join(directory, f)).isFile())
                          .map(f => path.join(directory, f));
            console.log(`📁 Directorio: ${directory} - ${files.length} archivos encontrados`);
        } else if (inputFiles.length > 0) {
            files = inputFiles;
            console.log(`📋 Archivos: ${files.join(', ')}`);
        } else {
            console.error('❌ No se especificaron archivos o directorio');
            process.exit(1);
        }
        console.log('');
        
        // Procesar archivos
        let allEvents = [];
        let processedFiles = 0;
        
        for (const file of files) {
            if (!fs.existsSync(file)) {
                console.warn(`⚠️ Archivo no encontrado: ${file}`);
                continue;
            }
            const fileInfo = getFileInfo(file);
            console.log(`📖 Procesando: ${fileInfo.name} (${fileInfo.sizeFormatted})`);
            const events = processFile(file);
            allEvents.push(...events);
            processedFiles++;
            console.log(`   ✅ ${events.length} eventos extraídos`);
        }
        console.log('');
        
        if (allEvents.length === 0) {
            console.error('❌ No se encontraron eventos en los archivos');
            process.exit(1);
        }
        
        // Generar timeline
        console.log(`🔍 Generando línea de tiempo (${allEvents.length} eventos)...`);
        const timeline = generateTimeline(allEvents);
        
        // Resumen
        const severityCount = {};
        const typeCount = {};
        for (const event of timeline) {
            severityCount[event.severity] = (severityCount[event.severity] || 0) + 1;
            typeCount[event.type] = (typeCount[event.type] || 0) + 1;
        }
        
        console.log('📊 RESUMEN:');
        console.log(`   📝 Total eventos: ${timeline.length}`);
        console.log(`   📁 Archivos procesados: ${processedFiles}`);
        console.log(`   🔹 Severidad: ${Object.entries(severityCount).map(([k,v]) => `${CONFIG.severity[k]||'ℹ️'} ${k}: ${v}`).join(', ')}`);
        console.log('');
        
        // Generar salida
        if (!outputFile) {
            const baseName = `timeline_${Date.now()}`;
            outputFile = `${baseName}.${format === 'html' ? 'html' : format === 'json' ? 'json' : 'txt'}`;
        }
        
        let content;
        if (format === 'html') {
            content = formatHTML(timeline);
        } else if (format === 'json') {
            content = formatJSON(timeline);
        } else {
            content = formatText(timeline);
        }
        
        console.log(`💾 Guardando en: ${outputFile}`);
        fs.writeFileSync(outputFile, content);
        console.log(`✅ Archivo guardado exitosamente`);
        
        console.log('\n✅ Forensic Timeline Generator completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
