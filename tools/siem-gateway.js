#!/usr/bin/env node

/**
 * SIEM Integration Gateway - MFH TOOLS PRO
 * Puente de integración con SIEMs (Splunk, ELK, QRadar)
 * Versión mejorada con modo simulación y respaldo local
 * 
 * Uso: node siem-gateway.js [opciones]
 * Ejemplo: node siem-gateway.js --config siem_config.json
 * Ejemplo: node siem-gateway.js --send scan_completed --data '{"target":"192.168.1.1"}'
 * Ejemplo: node siem-gateway.js --test
 * Ejemplo: node siem-gateway.js --simulate --send scan_completed --data '{"target":"192.168.1.1"}'
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'siem_config.json');
const LOG_FILE = path.join(__dirname, 'siem_gateway.log');
const LOCAL_BACKUP_DIR = path.join(__dirname, 'siem_backup');
const DEFAULT_CONFIG = {
    siem: {
        type: 'local',
        host: 'localhost',
        port: 9200,
        token: '',
        index: 'mfh-logs',
        source: 'mfh-tools',
        sourcetype: 'json'
    },
    local_backup: {
        enabled: true,
        format: 'json',
        maxFiles: 100,
        rotateSize: 50 // MB
    },
    simulate: false
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let configFile = null;
let eventType = null;
let eventData = null;
let source = null;
let filePath = null;
let verbose = false;
let simulate = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--config':
        case '-c':
            configFile = args[i + 1];
            i++;
            break;
        case '--send':
            action = 'send';
            eventType = args[i + 1];
            i++;
            break;
        case '--data':
            try {
                eventData = JSON.parse(args[i + 1]);
            } catch (error) {
                eventData = { message: args[i + 1] };
            }
            i++;
            break;
        case '--forward':
            action = 'forward';
            source = args[i + 1];
            i++;
            break;
        case '--path':
            filePath = args[i + 1];
            i++;
            break;
        case '--test':
            action = 'test';
            break;
        case '--simulate':
        case '-s':
            simulate = true;
            break;
        case '--init':
            init = true;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 SIEM Integration Gateway - MFH TOOLS PRO
============================================
Puente de integración con SIEMs (Splunk, ELK, QRadar, Local)

Uso:
  node siem-gateway.js [opciones]

Opciones:
  --config, -c <archivo>   Archivo de configuración
  --send <evento>          Enviar evento al SIEM
  --data <json>            Datos del evento (JSON o texto)
  --forward <tipo>         Reenviar logs (file, syslog)
  --path <ruta>            Ruta del archivo (para forward)
  --test                   Probar conexión con SIEM
  --simulate, -s           Modo simulación (no envía realmente)
  --init                   Crear configuración por defecto
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node siem-gateway.js --init
  node siem-gateway.js --simulate --send scan_completed --data '{"target":"192.168.1.1"}'
  node siem-gateway.js --send scan_completed --data '{"target":"192.168.1.1"}'
  node siem-gateway.js --test
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig(file) {
    try {
        const fullPath = file || CONFIG_FILE;
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const config = JSON.parse(content);
            // Asegurar que tiene todas las propiedades
            return { ...DEFAULT_CONFIG, ...config };
        }
        return { ...DEFAULT_CONFIG };
    } catch (error) {
        console.error(`❌ Error cargando configuración: ${error.message}`);
        return { ...DEFAULT_CONFIG };
    }
}

function saveConfig(config, file) {
    try {
        const fullPath = file || CONFIG_FILE;
        fs.writeFileSync(fullPath, JSON.stringify(config, null, 2));
        console.log(`✅ Configuración guardada en: ${fullPath}`);
    } catch (error) {
        console.error(`❌ Error guardando configuración: ${error.message}`);
    }
}

function initConfig() {
    console.log('🔧 Creando configuración por defecto...');
    const config = { ...DEFAULT_CONFIG };
    config.siem.type = 'local';
    config.local_backup.enabled = true;
    saveConfig(config);
    console.log('📝 Configuración creada. Edita el archivo si necesitas cambiar los valores.');
    console.log(`   Archivo: ${CONFIG_FILE}`);
    console.log('   Tipos soportados: local, splunk, elk, elasticsearch, qradar');
}

function logSIEM(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    } catch (error) {
        // Si no se puede escribir, solo mostrar en consola
    }
    if (verbose || type === 'error' || type === 'warning') {
        console.log(message);
    }
}

function getLocalBackupDir() {
    if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
        fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    }
    return LOCAL_BACKUP_DIR;
}

function saveLocalBackup(event, data) {
    const config = loadConfig();
    if (!config.local_backup.enabled) {
        return;
    }

    const backupDir = getLocalBackupDir();
    const date = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupDir, `siem_events_${date}.json`);
    
    let events = [];
    try {
        if (fs.existsSync(backupFile)) {
            const content = fs.readFileSync(backupFile, 'utf8');
            events = JSON.parse(content);
        }
    } catch (error) {
        // Si el archivo está corrupto, empezar de nuevo
        events = [];
    }

    const eventEntry = {
        timestamp: new Date().toISOString(),
        event: event,
        data: data,
        source: os.hostname()
    };

    events.push(eventEntry);

    // Mantener solo los últimos 10000 eventos
    if (events.length > 10000) {
        events = events.slice(-10000);
    }

    fs.writeFileSync(backupFile, JSON.stringify(events, null, 2));
    
    if (verbose) {
        console.log(`💾 Evento guardado en backup local: ${backupFile}`);
    }
}

function getLocalEvents(limit = 100) {
    const backupDir = getLocalBackupDir();
    const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('siem_events_') && f.endsWith('.json'))
        .sort()
        .reverse();
    
    let allEvents = [];
    for (const file of files.slice(0, 5)) {
        try {
            const content = fs.readFileSync(path.join(backupDir, file), 'utf8');
            const events = JSON.parse(content);
            allEvents = allEvents.concat(events);
        } catch (error) {
            // Ignorar archivos corruptos
        }
    }
    
    return allEvents.slice(-limit);
}

function sendToSplunk(config, event, data) {
    return new Promise((resolve, reject) => {
        if (simulate) {
            console.log(`🔬 [SIMULADO] Enviando a Splunk: ${event}`);
            resolve({ statusCode: 200, message: 'Simulado' });
            return;
        }

        const splunkConfig = config.siem;
        if (!splunkConfig.token) {
            reject(new Error('Token de Splunk no configurado'));
            return;
        }

        const eventData = {
            event: {
                ...data,
                event_type: event,
                source: splunkConfig.source,
                timestamp: new Date().toISOString()
            },
            sourcetype: splunkConfig.sourcetype,
            index: splunkConfig.index
        };

        const jsonData = JSON.stringify(eventData);
        const options = {
            hostname: splunkConfig.host,
            port: splunkConfig.port || 8088,
            path: '/services/collector/event',
            method: 'POST',
            headers: {
                'Authorization': `Splunk ${splunkConfig.token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonData)
            }
        };

        if (verbose) {
            console.log(`📡 Enviando a Splunk: ${splunkConfig.host}:${splunkConfig.port}`);
        }

        const req = https.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    logSIEM(`✅ Evento enviado a Splunk: ${event}`, 'success');
                    resolve({ statusCode: res.statusCode, response });
                } else {
                    logSIEM(`❌ Error enviando a Splunk: ${res.statusCode}`, 'error');
                    reject(new Error(`HTTP ${res.statusCode}: ${response}`));
                }
            });
        });

        req.on('error', (error) => {
            logSIEM(`❌ Error en conexión Splunk: ${error.message}`, 'error');
            // En caso de error, guardar localmente
            saveLocalBackup(event, data);
            reject(error);
        });

        req.write(jsonData);
        req.end();
    });
}

function sendToELK(config, event, data) {
    return new Promise((resolve, reject) => {
        if (simulate) {
            console.log(`🔬 [SIMULADO] Enviando a ELK: ${event}`);
            resolve({ statusCode: 200, message: 'Simulado' });
            return;
        }

        const elkConfig = config.siem;
        const eventData = {
            timestamp: new Date().toISOString(),
            event_type: event,
            ...data,
            source: elkConfig.source,
            host: os.hostname()
        };

        const jsonData = JSON.stringify(eventData);
        const options = {
            hostname: elkConfig.host,
            port: elkConfig.port || 9200,
            path: `/${elkConfig.index || 'mfh-logs'}/_doc`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonData)
            }
        };

        if (elkConfig.token) {
            options.headers['Authorization'] = `Bearer ${elkConfig.token}`;
        }

        if (verbose) {
            console.log(`📡 Enviando a ELK: ${elkConfig.host}:${elkConfig.port}`);
        }

        const httpModule = elkConfig.port === 443 || elkConfig.port === 8443 ? https : http;
        const req = httpModule.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    logSIEM(`✅ Evento enviado a ELK: ${event}`, 'success');
                    resolve({ statusCode: res.statusCode, response });
                } else {
                    // Si ELK no está disponible, guardar localmente
                    saveLocalBackup(event, data);
                    logSIEM(`⚠️ ELK no disponible, evento guardado localmente: ${res.statusCode}`, 'warning');
                    resolve({ statusCode: res.statusCode, response, localBackup: true });
                }
            });
        });

        req.on('error', (error) => {
            // En caso de error, guardar localmente
            saveLocalBackup(event, data);
            logSIEM(`⚠️ Error en conexión ELK, evento guardado localmente: ${error.message}`, 'warning');
            resolve({ statusCode: 503, error: error.message, localBackup: true });
        });

        req.write(jsonData);
        req.end();
    });
}

function sendToQRadar(config, event, data) {
    return new Promise((resolve, reject) => {
        if (simulate) {
            console.log(`🔬 [SIMULADO] Enviando a QRadar: ${event}`);
            resolve({ statusCode: 200, message: 'Simulado' });
            return;
        }

        const qradarConfig = config.siem;
        const eventData = {
            event_name: event,
            event_time: new Date().toISOString(),
            ...data,
            source: qradarConfig.source,
            host: os.hostname()
        };

        const jsonData = JSON.stringify(eventData);
        const options = {
            hostname: qradarConfig.host,
            port: qradarConfig.port || 443,
            path: '/api/events',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonData)
            }
        };

        if (qradarConfig.token) {
            options.headers['Authorization'] = `Bearer ${qradarConfig.token}`;
        }

        if (verbose) {
            console.log(`📡 Enviando a QRadar: ${qradarConfig.host}:${qradarConfig.port}`);
        }

        const req = https.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    logSIEM(`✅ Evento enviado a QRadar: ${event}`, 'success');
                    resolve({ statusCode: res.statusCode, response });
                } else {
                    saveLocalBackup(event, data);
                    logSIEM(`⚠️ QRadar no disponible, evento guardado localmente: ${res.statusCode}`, 'warning');
                    resolve({ statusCode: res.statusCode, response, localBackup: true });
                }
            });
        });

        req.on('error', (error) => {
            saveLocalBackup(event, data);
            logSIEM(`⚠️ Error en conexión QRadar, evento guardado localmente: ${error.message}`, 'warning');
            resolve({ statusCode: 503, error: error.message, localBackup: true });
        });

        req.write(jsonData);
        req.end();
    });
}

function sendToLocal(config, event, data) {
    return new Promise((resolve) => {
        const timestamp = new Date().toISOString();
        const eventEntry = {
            timestamp,
            event,
            data,
            source: config.siem.source || 'mfh-tools',
            host: os.hostname()
        };

        // Guardar en backup local
        saveLocalBackup(event, data);

        // Mostrar en consola
        console.log(`\n📌 EVENTO LOCAL: ${event}`);
        console.log(`📅 ${timestamp}`);
        console.log(`📦 Datos:`, JSON.stringify(data, null, 2));
        console.log('='.repeat(50));

        logSIEM(`✅ Evento guardado localmente: ${event}`, 'success');
        resolve({ statusCode: 200, local: true, timestamp });
    });
}

async function sendEvent(config, event, data) {
    const siemType = config.siem.type.toLowerCase();
    let parsedData = data;
    
    if (typeof data === 'string') {
        try {
            parsedData = JSON.parse(data);
        } catch (error) {
            parsedData = { message: data };
        }
    }

    // Si está en modo simulación o el tipo es local
    if (simulate || siemType === 'local') {
        return await sendToLocal(config, event, parsedData);
    }

    try {
        let result;
        switch (siemType) {
            case 'splunk':
                result = await sendToSplunk(config, event, parsedData);
                break;
            case 'elk':
            case 'elasticsearch':
                result = await sendToELK(config, event, parsedData);
                break;
            case 'qradar':
                result = await sendToQRadar(config, event, parsedData);
                break;
            default:
                // Si el tipo no es soportado, usar local
                result = await sendToLocal(config, event, parsedData);
                break;
        }
        
        // Si el resultado indica que se guardó localmente (fallback)
        if (result && result.localBackup) {
            console.log(`💾 Evento guardado en backup local debido a error de conexión`);
        }
        
        return result;
    } catch (error) {
        logSIEM(`❌ Error enviando evento: ${error.message}`, 'error');
        // Fallback a local
        console.log(`⚠️ Fallback a almacenamiento local debido a error`);
        return await sendToLocal(config, event, parsedData);
    }
}

function testConnection(config) {
    return new Promise((resolve) => {
        const siemType = config.siem.type.toLowerCase();
        
        if (simulate || siemType === 'local') {
            console.log(`✅ Modo local activo - Siempre disponible`);
            resolve(true);
            return;
        }

        const host = config.siem.host;
        const port = config.siem.port;
        
        console.log(`🔍 Probando conexión a ${siemType} en ${host}:${port}`);
        
        // Si es local, siempre funciona
        if (host === 'localhost' || host === '127.0.0.1') {
            console.log(`✅ Modo local - Conexión simulada exitosa`);
            resolve(true);
            return;
        }
        
        const options = {
            hostname: host,
            port: port,
            path: '/',
            method: 'HEAD',
            timeout: 5000
        };
        
        const httpModule = port === 443 || port === 8088 || port === 8443 ? https : http;
        const req = httpModule.request(options, (res) => {
            console.log(`✅ Conexión exitosa a ${siemType} (${res.statusCode})`);
            resolve(true);
        });
        
        req.on('error', (error) => {
            console.log(`⚠️ No se pudo conectar a ${siemType}: ${error.message}`);
            console.log(`ℹ️ Los eventos se guardarán en backup local`);
            resolve(false);
        });
        
        req.on('timeout', () => {
            console.log(`⚠️ Timeout conectando a ${siemType}`);
            console.log(`ℹ️ Los eventos se guardarán en backup local`);
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
}

function listLocalEvents() {
    const events = getLocalEvents(50);
    if (events.length === 0) {
        console.log('📭 No hay eventos locales guardados');
        return;
    }

    console.log(`\n📋 EVENTOS LOCALES (${events.length}):`);
    console.log('='.repeat(60));
    
    for (const event of events) {
        console.log(`📌 ${event.event} - ${event.timestamp}`);
        console.log(`   📦 ${JSON.stringify(event.data).substring(0, 100)}...`);
        console.log(`   💻 ${event.source}`);
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 SIEM Integration Gateway - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Inicializar configuración
    if (init) {
        initConfig();
        process.exit(0);
    }

    // Cargar configuración
    const config = loadConfig(configFile);
    
    // Crear directorio de backup
    getLocalBackupDir();

    // Mostrar estado
    console.log(`📋 Modo: ${simulate ? 'SIMULACIÓN' : 'REAL'}`);
    console.log(`📋 SIEM: ${config.siem.type.toUpperCase()}`);
    if (!simulate && config.siem.type !== 'local') {
        console.log(`📋 Host: ${config.siem.host}:${config.siem.port}`);
    }
    if (config.local_backup.enabled) {
        console.log(`💾 Backup local: ACTIVADO (${LOCAL_BACKUP_DIR})`);
    }

    // Ejecutar acción
    switch (action) {
        case 'test':
            await testConnection(config);
            break;
        case 'send':
            if (!eventType) {
                console.error('❌ Debes especificar un evento con --send');
                process.exit(1);
            }
            const eventDataObj = eventData || { message: `Evento: ${eventType}` };
            await sendEvent(config, eventType, eventDataObj);
            break;
        case 'forward':
            console.log('ℹ️ Modo forward: Reenviando logs...');
            if (filePath && fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(l => l.trim());
                let processed = 0;
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        await sendEvent(config, 'log_forward', data);
                        processed++;
                    } catch (error) {
                        await sendEvent(config, 'log_forward', { message: line });
                        processed++;
                    }
                    if (processed % 10 === 0) {
                        console.log(`📊 Procesados ${processed}/${lines.length} logs`);
                    }
                }
                console.log(`✅ ${processed} logs reenviados`);
            } else {
                console.log('ℹ️ Usa --path para especificar un archivo de logs');
            }
            break;
        case 'list':
            listLocalEvents();
            break;
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --test, --send, --forward, --list');
            console.log('💡 Usa --simulate para probar sin conexión real');
            console.log('💡 Usa --init para crear configuración');
            break;
    }

    console.log('\n✅ SIEM Gateway completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 SIEM Gateway detenido');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 SIEM Gateway detenido');
    process.exit(0);
});
