#!/usr/bin/env node

/**
 * SIEM Integration Gateway - MFH TOOLS PRO
 * Puente de integración con SIEMs (Splunk, ELK, QRadar)
 * 
 * Uso: node siem-gateway.js [opciones]
 * Ejemplo: node siem-gateway.js --config siem_config.json
 * Ejemplo: node siem-gateway.js --send --event scan_completed --data scan_results.json
 * Ejemplo: node siem-gateway.js --forward --source file --path /var/log/siem.log
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'siem_config.json');
const LOG_FILE = path.join(__dirname, 'siem_gateway.log');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let configFile = null;
let event = null;
let data = null;
let source = null;
let pathFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--config':
        case '-c':
            configFile = args[i + 1];
            i++;
            break;
        case '--send':
            action = 'send';
            event = args[i + 1];
            i++;
            break;
        case '--data':
            data = args[i + 1];
            i++;
            break;
        case '--forward':
            action = 'forward';
            source = args[i + 1];
            i++;
            break;
        case '--path':
            pathFile = args[i + 1];
            i++;
            break;
        case '--test':
            action = 'test';
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
Puente de integración con SIEMs.

Uso:
  node siem-gateway.js [opciones]

Opciones:
  --config, -c <archivo>   Archivo de configuración
  --send <evento>          Enviar evento al SIEM
  --data <json>            Datos del evento
  --forward <tipo>         Reenviar logs (file, syslog)
  --path <ruta>            Ruta del archivo (para forward)
  --test                   Probar conexión con SIEM
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node siem-gateway.js --config siem_config.json
  node siem-gateway.js --send scan_completed --data '{"target":"192.168.1.1"}'
  node siem-gateway.js --test
`);
            process.exit(0);
    }
}

// ==================== CONFIGURACIÓN POR DEFECTO ====================
const DEFAULT_CONFIG = {
    siem: {
        type: 'splunk',
        host: 'localhost',
        port: 8088,
        token: '',
        index: 'main',
        source: 'mfh-tools',
        sourcetype: 'json'
    },
    forwarding: {
        enabled: false,
        format: 'json',
        batchSize: 100,
        flushInterval: 60
    }
};

// ==================== FUNCIONES ====================
function loadConfig(file) {
    try {
        const fullPath = file || CONFIG_FILE;
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            return JSON.parse(content);
        }
        return DEFAULT_CONFIG;
    } catch (error) {
        console.error(`❌ Error cargando configuración: ${error.message}`);
        return DEFAULT_CONFIG;
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

function logSIEM(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    if (verbose || type === 'error') {
        console.log(message);
    }
}

function sendToSplunk(config, event, data) {
    return new Promise((resolve, reject) => {
        const splunkConfig = config.siem;
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
            port: splunkConfig.port,
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
            reject(error);
        });

        req.write(jsonData);
        req.end();
    });
}

function sendToELK(config, event, data) {
    return new Promise((resolve, reject) => {
        const elkConfig = config.siem;
        const eventData = {
            timestamp: new Date().toISOString(),
            event_type: event,
            ...data,
            source: elkConfig.source
        };

        const jsonData = JSON.stringify(eventData);
        const options = {
            hostname: elkConfig.host,
            port: elkConfig.port || 9200,
            path: `/${elkConfig.index || 'mfh'}/_doc`,
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

        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    logSIEM(`✅ Evento enviado a ELK: ${event}`, 'success');
                    resolve({ statusCode: res.statusCode, response });
                } else {
                    logSIEM(`❌ Error enviando a ELK: ${res.statusCode}`, 'error');
                    reject(new Error(`HTTP ${res.statusCode}: ${response}`));
                }
            });
        });

        req.on('error', (error) => {
            logSIEM(`❌ Error en conexión ELK: ${error.message}`, 'error');
            reject(error);
        });

        req.write(jsonData);
        req.end();
    });
}

function sendToQRadar(config, event, data) {
    return new Promise((resolve, reject) => {
        const qradarConfig = config.siem;
        const eventData = {
            event_name: event,
            event_time: new Date().toISOString(),
            ...data,
            source: qradarConfig.source
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
                    logSIEM(`❌ Error enviando a QRadar: ${res.statusCode}`, 'error');
                    reject(new Error(`HTTP ${res.statusCode}: ${response}`));
                }
            });
        });

        req.on('error', (error) => {
            logSIEM(`❌ Error en conexión QRadar: ${error.message}`, 'error');
            reject(error);
        });

        req.write(jsonData);
        req.end();
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

    try {
        switch (siemType) {
            case 'splunk':
                return await sendToSplunk(config, event, parsedData);
            case 'elk':
            case 'elasticsearch':
                return await sendToELK(config, event, parsedData);
            case 'qradar':
                return await sendToQRadar(config, event, parsedData);
            default:
                throw new Error(`SIEM no soportado: ${siemType}`);
        }
    } catch (error) {
        logSIEM(`❌ Error enviando evento: ${error.message}`, 'error');
        throw error;
    }
}

function testConnection(config) {
    return new Promise((resolve) => {
        const siemType = config.siem.type.toLowerCase();
        const host = config.siem.host;
        const port = config.siem.port;
        
        console.log(`🔍 Probando conexión a ${siemType} en ${host}:${port}`);
        
        const options = {
            hostname: host,
            port: port,
            path: '/',
            method: 'HEAD',
            timeout: 5000
        };
        
        const httpModule = port === 443 || port === 8088 ? https : http;
        const req = httpModule.request(options, (res) => {
            console.log(`✅ Conexión exitosa a ${siemType} (${res.statusCode})`);
            resolve(true);
        });
        
        req.on('error', (error) => {
            console.log(`❌ Error conectando a ${siemType}: ${error.message}`);
            resolve(false);
        });
        
        req.on('timeout', () => {
            console.log(`❌ Timeout conectando a ${siemType}`);
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 SIEM Integration Gateway - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    const config = loadConfig(configFile);

    switch (action) {
        case 'test':
            await testConnection(config);
            break;
        case 'send':
            if (!event) {
                console.error('❌ Debes especificar un evento con --send');
                process.exit(1);
            }
            const eventData = data ? JSON.parse(data) : { message: `Evento: ${event}` };
            await sendEvent(config, event, eventData);
            break;
        case 'forward':
            console.log('ℹ️ Modo forward no implementado aún');
            break;
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --test, --send, --forward');
            console.log('💡 Crea una configuración con: --init');
            break;
    }

    console.log('\n✅ SIEM Gateway completado');
})();
