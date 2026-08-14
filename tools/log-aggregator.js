#!/usr/bin/env node

/**
 * Log Aggregator - MFH TOOLS PRO
 * Agrega logs de múltiples fuentes en tiempo real
 * 
 * Uso: node log-aggregator.js [opciones]
 * Ejemplo: node log-aggregator.js --source file --path /var/log/auth.log
 * Ejemplo: node log-aggregator.js --source syslog --port 514
 * Ejemplo: node log-aggregator.js --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dgram = require('dgram');
const net = require('net');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'log_aggregator_config.json');
const LOG_DIR = path.join(__dirname, 'logs');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let source = null;
let sourcePath = null;
let sourcePort = null;
let sourceFormat = 'json';
let name = null;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--source':
            source = args[i + 1];
            i++;
            break;
        case '--path':
            sourcePath = args[i + 1];
            i++;
            break;
        case '--port':
            sourcePort = parseInt(args[i + 1]);
            i++;
            break;
        case '--format':
            sourceFormat = args[i + 1];
            i++;
            break;
        case '--name':
            name = args[i + 1];
            i++;
            break;
        case '--list':
            action = 'list';
            break;
        case '--start':
            action = 'start';
            break;
        case '--stop':
            action = 'stop';
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Log Aggregator - MFH TOOLS PRO
==================================
Agrega logs de múltiples fuentes en tiempo real.

Uso:
  node log-aggregator.js [opciones]

Opciones:
  --source <tipo>         Tipo de fuente (file, syslog, tcp, udp)
  --path <ruta>           Ruta del archivo (para file)
  --port <puerto>         Puerto (para syslog, tcp, udp)
  --format <formato>      Formato (json, plain, syslog)
  --name <nombre>         Nombre de la fuente
  --list                  Listar fuentes activas
  --start                 Iniciar el agregador
  --stop                  Detener el agregador
  --help, -h              Mostrar esta ayuda

Ejemplos:
  node log-aggregator.js --source file --path /var/log/auth.log --name "Auth Logs"
  node log-aggregator.js --source syslog --port 514 --name "Syslog"
  node log-aggregator.js --list
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
    return { sources: [], running: false };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function generateSourceId() {
    return 'src-' + crypto.randomBytes(6).toString('hex');
}

function logAggregator(message, source) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        source: source || 'unknown',
        message
    };
    
    // Guardar en archivo
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `logs_${date}.json`);
    
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    
    let logs = [];
    try {
        if (fs.existsSync(logFile)) {
            logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
    } catch (error) {
        // Si el archivo está corrupto, empezar de nuevo
    }
    
    logs.push(logEntry);
    
    // Mantener solo los últimos 10000 logs
    if (logs.length > 10000) {
        logs = logs.slice(-10000);
    }
    
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    // Mostrar en consola
    console.log(`📝 [${timestamp}] ${source}: ${message}`);
}

function setupFileSource(sourceConfig) {
    if (!sourceConfig.path || !fs.existsSync(sourceConfig.path)) {
        console.error(`❌ Archivo no encontrado: ${sourceConfig.path}`);
        return;
    }
    
    console.log(`📁 Monitoreando archivo: ${sourceConfig.path}`);
    
    let lastSize = 0;
    try {
        const stats = fs.statSync(sourceConfig.path);
        lastSize = stats.size;
    } catch (error) {
        // Ignorar
    }
    
    // Monitorear cambios
    const watcher = fs.watch(sourceConfig.path, (eventType) => {
        if (eventType === 'change') {
            try {
                const stats = fs.statSync(sourceConfig.path);
                if (stats.size > lastSize) {
                    const buffer = Buffer.alloc(stats.size - lastSize);
                    const fd = fs.openSync(sourceConfig.path, 'r');
                    fs.readSync(fd, buffer, 0, buffer.length, lastSize);
                    fs.closeSync(fd);
                    
                    const content = buffer.toString('utf8');
                    const lines = content.split('\n').filter(l => l.trim());
                    
                    for (const line of lines) {
                        logAggregator(line, sourceConfig.name || sourceConfig.path);
                    }
                    
                    lastSize = stats.size;
                }
            } catch (error) {
                // Ignorar errores de lectura
            }
        }
    });
    
    return watcher;
}

function setupSyslogSource(port) {
    console.log(`📡 Escuchando syslog en puerto ${port}`);
    
    const server = dgram.createSocket('udp4');
    
    server.on('message', (msg, info) => {
        const message = msg.toString('utf8');
        logAggregator(message, `syslog:${info.address}:${info.port}`);
    });
    
    server.bind(port);
    return server;
}

function setupTCPSource(port) {
    console.log(`🔌 Escuchando TCP en puerto ${port}`);
    
    const server = net.createServer((socket) => {
        const address = socket.remoteAddress;
        socket.on('data', (data) => {
            const message = data.toString('utf8');
            logAggregator(message, `tcp:${address}`);
        });
    });
    
    server.listen(port);
    return server;
}

function listSources() {
    const config = loadConfig();
    if (config.sources.length === 0) {
        console.log('📭 No hay fuentes configuradas');
        return;
    }
    
    console.log(`\n📋 FUENTES CONFIGURADAS (${config.sources.length}):`);
    console.log('='.repeat(60));
    
    for (const source of config.sources) {
        console.log(`\n📌 ${source.name || source.id}`);
        console.log(`   📋 ID: ${source.id}`);
        console.log(`   📋 Tipo: ${source.type}`);
        if (source.path) console.log(`   📁 Ruta: ${source.path}`);
        if (source.port) console.log(`   🔌 Puerto: ${source.port}`);
        console.log(`   📅 Creado: ${new Date(source.createdAt).toLocaleString()}`);
        console.log(`   📊 Estado: ${source.running ? '🟢 Activo' : '🔴 Inactivo'}`);
    }
}

function addSource() {
    if (!source) {
        console.error('❌ Debes especificar --source');
        process.exit(1);
    }
    
    const config = loadConfig();
    const newSource = {
        id: generateSourceId(),
        name: name || `${source}-${Date.now()}`,
        type: source,
        path: sourcePath,
        port: sourcePort,
        format: sourceFormat,
        createdAt: new Date().toISOString(),
        running: false
    };
    
    config.sources.push(newSource);
    saveConfig(config);
    
    console.log(`✅ Fuente agregada: ${newSource.name}`);
    console.log(`📋 ID: ${newSource.id}`);
    console.log(`📋 Tipo: ${newSource.type}`);
}

function startAggregator() {
    const config = loadConfig();
    const sources = config.sources;
    
    if (sources.length === 0) {
        console.error('❌ No hay fuentes configuradas');
        console.log('   Agrega una fuente con --source');
        process.exit(1);
    }
    
    console.log(`🚀 Iniciando agregador de logs...`);
    console.log(`📋 ${sources.length} fuentes configuradas`);
    
    const watchers = [];
    
    for (const source of sources) {
        try {
            let watcher = null;
            
            switch (source.type) {
                case 'file':
                    watcher = setupFileSource(source);
                    break;
                case 'syslog':
                    watcher = setupSyslogSource(source.port || 514);
                    break;
                case 'tcp':
                    watcher = setupTCPSource(source.port || 9000);
                    break;
                default:
                    console.log(`⚠️ Tipo de fuente no soportado: ${source.type}`);
                    break;
            }
            
            if (watcher) {
                source.running = true;
                watchers.push({ source, watcher });
                console.log(`✅ Fuente activa: ${source.name}`);
            }
        } catch (error) {
            console.error(`❌ Error iniciando fuente ${source.name}: ${error.message}`);
        }
    }
    
    // Guardar estado
    config.running = true;
    saveConfig(config);
    
    // Guardar watchers globalmente
    global.logWatchers = watchers;
    
    console.log('\n🔄 Agregador de logs ejecutándose. Presiona Ctrl+C para detener.');
    console.log('📁 Logs guardados en:', LOG_DIR);
}

function stopAggregator() {
    if (global.logWatchers) {
        for (const { source, watcher } of global.logWatchers) {
            try {
                if (watcher && typeof watcher.close === 'function') {
                    watcher.close();
                } else if (watcher && typeof watcher.stop === 'function') {
                    watcher.stop();
                }
                console.log(`⏹️ Detenido: ${source.name}`);
            } catch (error) {
                console.error(`❌ Error deteniendo fuente ${source.name}: ${error.message}`);
            }
        }
        global.logWatchers = [];
    }
    
    const config = loadConfig();
    for (const source of config.sources) {
        source.running = false;
    }
    config.running = false;
    saveConfig(config);
    
    console.log('🛑 Agregador de logs detenido');
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Log Aggregator - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Crear directorio de logs
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    switch (action) {
        case 'list':
            listSources();
            break;
        case 'start':
            startAggregator();
            break;
        case 'stop':
            stopAggregator();
            break;
        default:
            if (source) {
                addSource();
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            }
            break;
    }

    console.log('\n✅ Log Aggregator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    if (global.logWatchers) {
        console.log('\n🛑 Deteniendo agregador de logs...');
        for (const { source, watcher } of global.logWatchers) {
            try {
                if (watcher && typeof watcher.close === 'function') {
                    watcher.close();
                } else if (watcher && typeof watcher.stop === 'function') {
                    watcher.stop();
                }
            } catch (error) {
                // Ignorar
            }
        }
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    if (global.logWatchers) {
        console.log('\n🛑 Deteniendo agregador de logs...');
        for (const { source, watcher } of global.logWatchers) {
            try {
                if (watcher && typeof watcher.close === 'function') {
                    watcher.close();
                } else if (watcher && typeof watcher.stop === 'function') {
                    watcher.stop();
                }
            } catch (error) {
                // Ignorar
            }
        }
    }
    process.exit(0);
});
