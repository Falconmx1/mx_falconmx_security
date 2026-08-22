#!/usr/bin/env node

/**
 * Threat Hunting Console - MFH TOOLS PRO
 * Consola centralizada para threat hunting
 * 
 * Uso: node threat-hunting-console.js [opciones]
 * Ejemplo: node threat-hunting-console.js --query "ip:8.8.8.8"
 * Ejemplo: node threat-hunting-console.js --search "malware" --source logs
 * Ejemplo: node threat-hunting-console.js --interactive
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'hunting_config.json');

const DEFAULT_CONFIG = {
    sources: {
        logs: { enabled: true, path: './logs' },
        alerts: { enabled: true, path: './alerts' },
        iocs: { enabled: true, path: './iocs' },
        threatIntel: { enabled: false, feed: '' }
    },
    results: {
        maxResults: 100,
        format: 'table'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let query = null;
let searchTerm = null;
let source = null;
let outputFile = null;
let verbose = false;
let init = false;
let interactive = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--query':
            query = args[i + 1];
            i++;
            break;
        case '--search':
            searchTerm = args[i + 1];
            i++;
            break;
        case '--source':
            source = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--init':
            init = true;
            break;
        case '--interactive':
            interactive = true;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Threat Hunting Console - MFH TOOLS PRO
==========================================
Consola centralizada para threat hunting.

Uso:
  node threat-hunting-console.js [opciones]

Opciones:
  --init                   Crear configuración por defecto
  --interactive            Modo interactivo
  --query <consulta>       Consulta de búsqueda
  --search <término>       Buscar término en fuentes
  --source <fuente>        Fuente específica (logs, alerts, iocs)
  --output <archivo>       Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node threat-hunting-console.js --init
  node threat-hunting-console.js --interactive
  node threat-hunting-console.js --query "ip:8.8.8.8"
  node threat-hunting-console.js --search "malware" --source logs
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`✅ Configuración guardada en: ${CONFIG_FILE}`);
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    console.log('✅ Configuración por defecto creada.');
}

function generateMockData(type, count = 20) {
    const data = [];
    const ips = ['192.168.1.1', '192.168.1.2', '10.0.0.1', '8.8.8.8', '1.1.1.1', '208.67.222.222', '187.189.0.0', '200.33.0.0'];
    const domains = ['example.com', 'test.com', 'malicious.tk', 'evil.com', 'safe.com', 'google.com', 'facebook.com'];
    const hashes = ['5d41402abc4b2a76b9719d911017c592', '098f6bcd4621d373cade4e832627b4f6', '25f9e794323b453885f5181f1b624d0b'];
    const severities = ['critical', 'high', 'medium', 'low'];
    const statuses = ['new', 'investigating', 'resolved', 'false_positive'];

    for (let i = 0; i < count; i++) {
        const entry = {
            id: `${type}-${String(i + 1).padStart(3, '0')}`,
            timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            source: type
        };

        if (type === 'logs') {
            entry.message = `${ips[Math.floor(Math.random() * ips.length)]} - ${domains[Math.floor(Math.random() * domains.length)]}`;
            entry.level = Math.random() > 0.7 ? 'error' : 'info';
            entry.user = `user${Math.floor(Math.random() * 10) + 1}`;
        } else if (type === 'alerts') {
            entry.severity = severities[Math.floor(Math.random() * severities.length)];
            entry.status = statuses[Math.floor(Math.random() * statuses.length)];
            entry.title = `Alerta de ${['intrusión', 'malware', 'phishing', 'DDoS'][Math.floor(Math.random() * 4)]}`;
            entry.description = `Descripción de la alerta ${i + 1}`;
        } else if (type === 'iocs') {
            entry.type = ['ip', 'domain', 'hash', 'url'][Math.floor(Math.random() * 4)];
            entry.value = entry.type === 'ip' ? ips[Math.floor(Math.random() * ips.length)] :
                          entry.type === 'domain' ? domains[Math.floor(Math.random() * domains.length)] :
                          entry.type === 'hash' ? hashes[Math.floor(Math.random() * hashes.length)] :
                          `https://${domains[Math.floor(Math.random() * domains.length)]}/malware.exe`;
            entry.confidence = Math.floor(Math.random() * 100);
        }

        data.push(entry);
    }

    return data;
}

function searchData(data, term, source) {
    const results = [];
    const termLower = term.toLowerCase();

    for (const item of data) {
        if (source && item.source !== source) continue;

        const itemStr = JSON.stringify(item).toLowerCase();
        if (itemStr.includes(termLower)) {
            results.push(item);
        }
    }

    return results;
}

function queryData(data, query) {
    const results = [];
    const parts = query.split(' ');
    const conditions = {};

    for (const part of parts) {
        if (part.includes(':')) {
            const [key, value] = part.split(':');
            conditions[key] = value;
        }
    }

    for (const item of data) {
        let match = true;
        for (const [key, value] of Object.entries(conditions)) {
            const itemValue = item[key];
            if (itemValue === undefined || String(itemValue).toLowerCase() !== value.toLowerCase()) {
                match = false;
                break;
            }
        }
        if (match) {
            results.push(item);
        }
    }

    return results;
}

function formatResults(results, format = 'table') {
    if (results.length === 0) {
        return '📭 No se encontraron resultados';
    }

    if (format === 'json') {
        return JSON.stringify(results, null, 2);
    }

    // Formato tabla
    let output = `\n📊 RESULTADOS (${results.length}):\n`;
    output += '='.repeat(70) + '\n';

    const maxDisplay = Math.min(results.length, 20);
    const displayItems = results.slice(0, maxDisplay);

    for (const item of displayItems) {
        output += `\n📌 ${item.id || item.timestamp || 'N/A'}`;
        output += `\n   📋 Fuente: ${item.source || 'N/A'}`;
        
        if (item.message) {
            output += `\n   📝 ${item.message}`;
        }
        if (item.title) {
            output += `\n   📝 ${item.title}`;
        }
        if (item.severity) {
            const emoji = item.severity === 'critical' ? '🔴' :
                         item.severity === 'high' ? '🟠' :
                         item.severity === 'medium' ? '🟡' : '🟢';
            output += `\n   📊 Severidad: ${emoji} ${item.severity}`;
        }
        if (item.type && item.value) {
            output += `\n   🔍 Tipo: ${item.type} → ${item.value}`;
        }
        if (item.confidence) {
            output += `\n   🎯 Confianza: ${item.confidence}%`;
        }
        if (item.timestamp) {
            output += `\n   ⏱️ ${new Date(item.timestamp).toLocaleString()}`;
        }
        output += '\n' + '-'.repeat(50);
    }

    if (results.length > maxDisplay) {
        output += `\n... y ${results.length - maxDisplay} resultados más`;
    }

    return output;
}

function interactiveMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n🔍 THREAT HUNTING CONSOLE');
    console.log('='.repeat(50));
    console.log('📋 Comandos:');
    console.log('  search <término>  - Buscar en todas las fuentes');
    console.log('  query <key:value> - Consulta estructurada');
    console.log('  source <nombre>   - Cambiar fuente activa');
    console.log('  list              - Listar fuentes disponibles');
    console.log('  clear             - Limpiar pantalla');
    console.log('  help              - Mostrar ayuda');
    console.log('  exit              - Salir');
    console.log('='.repeat(50));

    const config = loadConfig();
    let activeSource = null;
    const allData = {
        logs: generateMockData('logs', 30),
        alerts: generateMockData('alerts', 20),
        iocs: generateMockData('iocs', 15)
    };

    function processCommand(input) {
        const trimmed = input.trim();
        if (!trimmed) return true;

        const parts = trimmed.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case 'exit':
            case 'quit':
                console.log('👋 Saliendo...');
                return false;

            case 'help':
                console.log('\n📋 Comandos disponibles:');
                console.log('  search <término>  - Buscar en todas las fuentes');
                console.log('  query <key:value> - Consulta estructurada');
                console.log('  source <nombre>   - Cambiar fuente activa');
                console.log('  list              - Listar fuentes disponibles');
                console.log('  clear             - Limpiar pantalla');
                console.log('  help              - Mostrar ayuda');
                console.log('  exit              - Salir');
                break;

            case 'list':
                console.log('\n📋 Fuentes disponibles:');
                for (const [name, data] of Object.entries(allData)) {
                    const active = activeSource === name ? ' 🟢' : '';
                    console.log(`   📂 ${name}: ${data.length} registros${active}`);
                }
                if (activeSource) {
                    console.log(`\n🔍 Fuente activa: ${activeSource}`);
                }
                break;

            case 'source':
                if (args.length === 0) {
                    console.log(`🔍 Fuente actual: ${activeSource || 'todas'}`);
                    break;
                }
                const sourceName = args[0];
                if (allData[sourceName]) {
                    activeSource = sourceName;
                    console.log(`✅ Fuente cambiada a: ${sourceName}`);
                } else {
                    console.log(`❌ Fuente no encontrada: ${sourceName}`);
                }
                break;

            case 'search':
                if (args.length === 0) {
                    console.log('❌ Debes especificar un término de búsqueda');
                    break;
                }
                const term = args.join(' ');
                console.log(`🔍 Buscando: "${term}"`);
                
                let searchResults = [];
                for (const [name, data] of Object.entries(allData)) {
                    if (activeSource && activeSource !== name) continue;
                    const results = searchData(data, term, name);
                    searchResults = searchResults.concat(results);
                }
                console.log(formatResults(searchResults));
                break;

            case 'query':
                if (args.length === 0) {
                    console.log('❌ Debes especificar una consulta (ej: severity:high)');
                    break;
                }
                const queryStr = args.join(' ');
                console.log(`🔍 Consulta: "${queryStr}"`);
                
                let queryResults = [];
                for (const [name, data] of Object.entries(allData)) {
                    if (activeSource && activeSource !== name) continue;
                    const results = queryData(data, queryStr);
                    queryResults = queryResults.concat(results);
                }
                console.log(formatResults(queryResults));
                break;

            case 'clear':
                console.clear();
                break;

            default:
                console.log(`❌ Comando desconocido: ${cmd}`);
                console.log('   Usa "help" para ver comandos disponibles');
                break;
        }

        return true;
    }

    function prompt() {
        rl.question(`\n${activeSource ? `[${activeSource}]` : '[all]'} > `, (input) => {
            const continueLoop = processCommand(input);
            if (continueLoop) {
                prompt();
            } else {
                rl.close();
            }
        });
    }

    prompt();
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Threat Hunting Console - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (init) {
        initConfig();
        process.exit(0);
    }

    if (interactive) {
        interactiveMode();
        return;
    }

    const config = loadConfig();
    const allData = {
        logs: generateMockData('logs', 50),
        alerts: generateMockData('alerts', 30),
        iocs: generateMockData('iocs', 20)
    };

    let results = [];

    if (query) {
        for (const [name, data] of Object.entries(allData)) {
            if (source && source !== name) continue;
            const r = queryData(data, query);
            results = results.concat(r);
        }
    } else if (searchTerm) {
        for (const [name, data] of Object.entries(allData)) {
            if (source && source !== name) continue;
            const r = searchData(data, searchTerm, name);
            results = results.concat(r);
        }
    } else {
        console.log('ℹ️ Debes especificar --query o --search');
        console.log('   Usa --help para ver opciones');
        console.log('   Usa --interactive para modo interactivo');
        process.exit(1);
    }

    console.log(formatResults(results));

    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Threat Hunting completado');
})();
