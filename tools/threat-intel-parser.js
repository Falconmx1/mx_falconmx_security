#!/usr/bin/env node

/**
 * Threat Intelligence Feed Parser - MFH TOOLS PRO
 * Parsea y analiza feeds de inteligencia de amenazas (STIX/TAXII)
 * 
 * Uso: node threat-intel-parser.js [opciones]
 * Ejemplo: node threat-intel-parser.js --file threat_data.json
 * Ejemplo: node threat-intel-parser.js --file threat_data.json --format stix
 * Ejemplo: node threat-intel-parser.js --file threat_data.json --output report.json
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    supportedFormats: ['stix', 'json', 'csv', 'txt']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let format = 'json';
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            inputFile = args[i + 1];
            i++;
            break;
        case '--format':
        case '-fmt':
            format = args[i + 1].toLowerCase();
            i++;
            break;
        case '--output':
        case '-o':
            outputFile = args[i + 1];
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Threat Intelligence Feed Parser - MFH TOOLS PRO
===================================================
Parsea y analiza feeds de inteligencia de amenazas.

Uso:
  node threat-intel-parser.js [opciones]

Opciones:
  --file, -f <archivo>     Archivo de feed a parsear
  --format, -fmt <formato> Formato del feed (stix, json, csv, txt)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node threat-intel-parser.js --file threat_data.json
  node threat-intel-parser.js --file threat_data.json --format stix
  node threat-intel-parser.js --file threat_data.json --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function detectFormat(content) {
    // Detectar formato automáticamente
    if (content.trim().startsWith('{')) {
        try {
            const json = JSON.parse(content);
            if (json.objects || json.stix) return 'stix';
            if (json.indicators || json.observables) return 'stix';
            if (Array.isArray(json) || json.type === 'bundle') return 'stix';
            return 'json';
        } catch (error) {
            return 'json';
        }
    }
    if (content.includes(',')) {
        return 'csv';
    }
    return 'txt';
}

function parseSTIX(content) {
    try {
        const data = typeof content === 'string' ? JSON.parse(content) : content;
        const iocs = [];
        let objects = [];

        // Buscar objetos STIX
        if (data.objects) {
            objects = data.objects;
        } else if (data.stix) {
            objects = data.stix;
        } else if (data.indicators) {
            objects = data.indicators;
        } else if (Array.isArray(data)) {
            objects = data;
        } else {
            // Intentar encontrar objetos en el JSON
            for (const key of Object.keys(data)) {
                if (Array.isArray(data[key])) {
                    objects = data[key];
                    break;
                }
            }
        }

        for (const obj of objects) {
            if (obj.type === 'indicator' || obj.type === 'observable') {
                const ioc = {
                    type: obj.type,
                    pattern: obj.pattern || obj.value || obj.observable?.value || null,
                    description: obj.description || null,
                    labels: obj.labels || [],
                    created: obj.created || obj.created_at || null,
                    modified: obj.modified || obj.updated_at || null,
                    valid_from: obj.valid_from || null,
                    valid_until: obj.valid_until || null,
                    confidence: obj.confidence || null,
                    severity: obj.severity || null,
                    source: obj.source || null
                };
                iocs.push(ioc);
            }
        }

        return {
            type: 'stix',
            total: iocs.length,
            indicators: iocs,
            raw: data
        };
    } catch (error) {
        return {
            type: 'stix',
            error: `Error parsing STIX: ${error.message}`,
            indicators: []
        };
    }
}

function parseJSON(content) {
    try {
        const data = typeof content === 'string' ? JSON.parse(content) : content;
        const iocs = [];
        let items = Array.isArray(data) ? data : [data];

        for (const item of items) {
            const ioc = {
                type: 'indicator',
                pattern: item.indicator || item.value || item.ip || item.domain || item.url || item.hash || null,
                description: item.description || item.title || null,
                labels: item.labels || item.tags || [],
                created: item.created || item.created_at || null,
                modified: item.modified || item.updated_at || null,
                severity: item.severity || item.risk || null,
                source: item.source || null
            };
            iocs.push(ioc);
        }

        return {
            type: 'json',
            total: iocs.length,
            indicators: iocs,
            raw: data
        };
    } catch (error) {
        return {
            type: 'json',
            error: `Error parsing JSON: ${error.message}`,
            indicators: []
        };
    }
}

function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
        return {
            type: 'csv',
            error: 'No data found',
            indicators: []
        };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const iocs = [];

    for (let i = 1; i < Math.min(lines.length, 10000); i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const item = {};
        for (let j = 0; j < headers.length && j < values.length; j++) {
            item[headers[j]] = values[j];
        }

        const ioc = {
            type: 'indicator',
            pattern: item.indicator || item.value || item.ip || item.domain || item.url || item.hash || null,
            description: item.description || item.title || null,
            labels: item.labels || item.tags ? item.labels || item.tags : [],
            created: item.created || item.date || null,
            severity: item.severity || item.risk || null,
            source: item.source || null
        };
        iocs.push(ioc);
    }

    return {
        type: 'csv',
        total: iocs.length,
        indicators: iocs,
        headers
    };
}

function parseTXT(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const iocs = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
            iocs.push({
                type: 'indicator',
                pattern: trimmed,
                description: null,
                labels: [],
                created: null,
                severity: null,
                source: null
            });
        }
    }

    return {
        type: 'txt',
        total: iocs.length,
        indicators: iocs
    };
}

function parseFeed(content, format) {
    if (format === 'stix') {
        return parseSTIX(content);
    } else if (format === 'json') {
        return parseJSON(content);
    } else if (format === 'csv') {
        return parseCSV(content);
    } else if (format === 'txt') {
        return parseTXT(content);
    } else {
        // Auto-detectar
        const detected = detectFormat(content);
        return parseFeed(content, detected);
    }
}

function formatResults(result) {
    let output = '';
    output += `🔍 Threat Intelligence Feed Parser - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';

    if (result.error) {
        output += `❌ Error: ${result.error}\n`;
        return output;
    }

    output += `📋 Formato detectado: ${result.type.toUpperCase()}\n`;
    output += `📊 Total IoCs: ${result.total}\n\n`;

    if (result.total === 0) {
        output += '⚠️ No se encontraron IoCs en el feed\n';
        return output;
    }

    // Estadísticas
    const severityCount = {};
    const labelCount = {};
    const typeCount = {};

    for (const ioc of result.indicators) {
        // Severidad
        if (ioc.severity) {
            const severity = ioc.severity.toLowerCase();
            severityCount[severity] = (severityCount[severity] || 0) + 1;
        }

        // Labels
        if (ioc.labels && ioc.labels.length > 0) {
            for (const label of ioc.labels) {
                labelCount[label] = (labelCount[label] || 0) + 1;
            }
        }

        // Tipo (detectar automáticamente)
        if (ioc.pattern) {
            const pattern = ioc.pattern.toLowerCase();
            if (pattern.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)) {
                typeCount.ip = (typeCount.ip || 0) + 1;
            } else if (pattern.match(/^[a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}$/)) {
                typeCount.domain = (typeCount.domain || 0) + 1;
            } else if (pattern.startsWith('http')) {
                typeCount.url = (typeCount.url || 0) + 1;
            } else if (pattern.match(/^[a-fA-F0-9]{32,64}$/)) {
                typeCount.hash = (typeCount.hash || 0) + 1;
            } else {
                typeCount.other = (typeCount.other || 0) + 1;
            }
        }
    }

    output += `📊 TIPOS DE IoC:\n`;
    const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes) {
        output += `   • ${type}: ${count}\n`;
    }

    if (Object.keys(severityCount).length > 0) {
        output += `\n📊 POR SEVERIDAD:\n`;
        const sortedSeverity = Object.entries(severityCount).sort((a, b) => b[1] - a[1]);
        for (const [severity, count] of sortedSeverity) {
            const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
            output += `   ${icon} ${severity}: ${count}\n`;
        }
    }

    if (Object.keys(labelCount).length > 0) {
        output += `\n📊 ETIQUETAS:\n`;
        const sortedLabels = Object.entries(labelCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        for (const [label, count] of sortedLabels) {
            output += `   • ${label}: ${count}\n`;
        }
    }

    // Mostrar ejemplos
    output += `\n📋 EJEMPLOS DE IoC (primeros 10):\n`;
    for (let i = 0; i < Math.min(10, result.indicators.length); i++) {
        const ioc = result.indicators[i];
        const severityIcon = ioc.severity === 'high' ? '🔴' : 
                           ioc.severity === 'medium' ? '🟡' : 
                           ioc.severity === 'low' ? '🟢' : '⚪';
        output += `   ${i + 1}. ${severityIcon} ${ioc.pattern || 'N/A'}\n`;
        if (ioc.description) {
            output += `      📝 ${ioc.description.substring(0, 80)}${ioc.description.length > 80 ? '...' : ''}\n`;
        }
        if (ioc.labels && ioc.labels.length > 0) {
            output += `      🏷️ ${ioc.labels.join(', ')}\n`;
        }
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Threat Intelligence Feed Parser - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!inputFile) {
        console.error('❌ Debes especificar un archivo con --file');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Archivo no encontrado: ${inputFile}`);
        process.exit(1);
    }

    try {
        const content = fs.readFileSync(inputFile, 'utf8');
        console.log(`📋 Archivo cargado: ${inputFile}`);
        console.log(`📊 Tamaño: ${(content.length / 1024).toFixed(2)} KB`);

        // Parsear feed
        const result = parseFeed(content, format);

        if (result.error) {
            console.error(`❌ Error en el parseo: ${result.error}`);
            process.exit(1);
        }

        // Mostrar resultados
        console.log(formatResults(result));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                inputFile,
                format: result.type,
                total: result.total,
                indicators: result.indicators
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

        console.log('\n✅ Parseo completado');

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
