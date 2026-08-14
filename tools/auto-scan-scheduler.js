#!/usr/bin/env node

/**
 * Automated Scan Scheduler - MFH TOOLS PRO
 * Programa y orquesta escaneos automáticos (red, web, vulnerabilidades)
 * 
 * Uso: node auto-scan-scheduler.js [opciones]
 * Ejemplo: node auto-scan-scheduler.js --schedule "0 2 * * *" --targets targets.json
 * Ejemplo: node auto-scan-scheduler.js --list
 * Ejemplo: node auto-scan-scheduler.js --run scan-123
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'scan_schedule.json');
const LOG_FILE = path.join(__dirname, 'scan_scheduler.log');
const RESULTS_DIR = path.join(__dirname, 'scan_results');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let schedule = null;
let targets = null;
let scanType = null;
let name = null;
let scanId = null;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--schedule':
        case '-s':
            schedule = args[i + 1];
            i++;
            break;
        case '--targets':
        case '-t':
            targets = args[i + 1];
            i++;
            break;
        case '--type':
        case '-y':
            scanType = args[i + 1];
            i++;
            break;
        case '--name':
        case '-n':
            name = args[i + 1];
            i++;
            break;
        case '--run':
            action = 'run';
            scanId = args[i + 1];
            i++;
            break;
        case '--list':
            action = 'list';
            break;
        case '--remove':
            action = 'remove';
            scanId = args[i + 1];
            i++;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Automated Scan Scheduler - MFH TOOLS PRO
============================================
Programa y orquesta escaneos automáticos.

Uso:
  node auto-scan-scheduler.js [opciones]

Opciones:
  --schedule, -s <cron>    Programación en formato cron
  --targets, -t <archivo>  Archivo con targets (JSON)
  --type, -y <tipo>        Tipo de escaneo (nmap, nikto, openvas, custom)
  --name, -n <nombre>      Nombre del escaneo
  --run <id>               Ejecutar un escaneo programado
  --list                   Listar escaneos programados
  --remove <id>            Eliminar un escaneo programado
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node auto-scan-scheduler.js --schedule "0 2 * * *" --targets targets.json --type nmap --name "Escaneo Diario"
  node auto-scan-scheduler.js --list
  node auto-scan-scheduler.js --run scan-123
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
    return { scans: [] };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function logMessage(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    console.log(message);
}

function generateScanId() {
    return 'scan-' + crypto.randomBytes(8).toString('hex');
}

function loadTargets(file) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Error cargando targets: ${error.message}`);
        process.exit(1);
    }
}

function executeScanCommand(type, targets) {
    return new Promise((resolve, reject) => {
        let command = '';
        const targetList = targets.join(' ');

        switch (type.toLowerCase()) {
            case 'nmap':
                command = `nmap -sS -sV -O ${targetList}`;
                break;
            case 'nikto':
                command = `nikto -h ${targetList}`;
                break;
            case 'openvas':
                command = `openvas-cli --target ${targetList}`;
                break;
            default:
                command = `echo "Ejecutando escaneo personalizado en ${targetList}"`;
                break;
        }

        logMessage(`🔍 Ejecutando: ${command}`);
        
        const child = exec(command, (error, stdout, stderr) => {
            if (error && !stderr) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });

        child.stdout.on('data', (data) => {
            process.stdout.write(data);
        });
        child.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}

async function runScan(scanConfig) {
    const scanId = generateScanId();
    const timestamp = new Date().toISOString();
    
    logMessage(`🔄 Iniciando escaneo: ${scanConfig.name || scanId}`);
    logMessage(`📋 Tipo: ${scanConfig.type}`);
    logMessage(`🎯 Targets: ${scanConfig.targets.join(', ')}`);

    try {
        const result = await executeScanCommand(scanConfig.type, scanConfig.targets);
        
        // Guardar resultados
        if (!fs.existsSync(RESULTS_DIR)) {
            fs.mkdirSync(RESULTS_DIR, { recursive: true });
        }
        
        const resultFile = path.join(RESULTS_DIR, `${scanId}_${Date.now()}.json`);
        const output = {
            scanId,
            name: scanConfig.name,
            type: scanConfig.type,
            targets: scanConfig.targets,
            timestamp,
            result: result.stdout,
            error: result.stderr,
            status: 'completed'
        };
        
        fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
        logMessage(`✅ Escaneo completado. Resultados guardados en: ${resultFile}`);
        
        // Actualizar estado del escaneo programado
        const config = loadConfig();
        const scan = config.scans.find(s => s.id === scanConfig.id);
        if (scan) {
            scan.lastRun = timestamp;
            scan.lastResult = resultFile;
            scan.status = 'completed';
            saveConfig(config);
        }
        
        return output;
        
    } catch (error) {
        logMessage(`❌ Error en escaneo: ${error.message}`);
        
        // Guardar error
        const resultFile = path.join(RESULTS_DIR, `${scanId}_${Date.now()}.error.json`);
        const output = {
            scanId,
            name: scanConfig.name,
            type: scanConfig.type,
            targets: scanConfig.targets,
            timestamp,
            error: error.message,
            status: 'failed'
        };
        fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
        
        // Actualizar estado del escaneo programado
        const config = loadConfig();
        const scan = config.scans.find(s => s.id === scanConfig.id);
        if (scan) {
            scan.lastRun = timestamp;
            scan.lastError = error.message;
            scan.status = 'failed';
            saveConfig(config);
        }
        
        throw error;
    }
}

function scheduleScan(scanConfig) {
    if (!cron.validate(schedule)) {
        console.error(`❌ Formato cron inválido: ${schedule}`);
        process.exit(1);
    }

    const config = loadConfig();
    const newScan = {
        id: generateScanId(),
        name: name || `Scan-${Date.now()}`,
        schedule: schedule,
        type: scanType || 'custom',
        targets: loadTargets(targets),
        createdAt: new Date().toISOString(),
        lastRun: null,
        status: 'scheduled',
        enabled: true
    };
    
    config.scans.push(newScan);
    saveConfig(config);
    
    console.log(`✅ Escaneo programado: ${newScan.name}`);
    console.log(`📋 ID: ${newScan.id}`);
    console.log(`🕐 Programación: ${schedule}`);
    console.log(`🎯 Targets: ${newScan.targets.length}`);
    console.log(`📋 Tipo: ${newScan.type}`);
    
    // Programar
    const task = cron.schedule(schedule, () => {
        runScan(newScan).catch(error => {
            console.error(`❌ Error ejecutando escaneo programado: ${error.message}`);
        });
    });
    
    global.scheduledTasks = global.scheduledTasks || {};
    global.scheduledTasks[newScan.id] = task;
    
    console.log('⏰ Escaneo programado exitosamente');
}

function listScans() {
    const config = loadConfig();
    if (config.scans.length === 0) {
        console.log('📭 No hay escaneos programados');
        return;
    }
    
    console.log(`\n📋 ESCANEOS PROGRAMADOS (${config.scans.length}):`);
    console.log('='.repeat(60));
    
    for (const scan of config.scans) {
        const statusIcon = scan.enabled ? '🟢' : '🔴';
        console.log(`\n${statusIcon} ${scan.name}`);
        console.log(`   📋 ID: ${scan.id}`);
        console.log(`   🕐 Programación: ${scan.schedule}`);
        console.log(`   📋 Tipo: ${scan.type}`);
        console.log(`   🎯 Targets: ${scan.targets.length}`);
        console.log(`   📅 Creado: ${new Date(scan.createdAt).toLocaleString()}`);
        if (scan.lastRun) {
            console.log(`   ⏱️ Última ejecución: ${new Date(scan.lastRun).toLocaleString()}`);
        }
        console.log(`   📊 Estado: ${scan.status}`);
    }
}

function removeScan(id) {
    const config = loadConfig();
    const initialLength = config.scans.length;
    config.scans = config.scans.filter(s => s.id !== id);
    
    if (config.scans.length === initialLength) {
        console.error(`❌ No se encontró el escaneo: ${id}`);
        process.exit(1);
    }
    
    saveConfig(config);
    
    // Detener tarea programada
    if (global.scheduledTasks && global.scheduledTasks[id]) {
        global.scheduledTasks[id].stop();
        delete global.scheduledTasks[id];
    }
    
    console.log(`✅ Escaneo eliminado: ${id}`);
}

function runScheduledScan(id) {
    const config = loadConfig();
    const scan = config.scans.find(s => s.id === id);
    
    if (!scan) {
        console.error(`❌ No se encontró el escaneo: ${id}`);
        process.exit(1);
    }
    
    console.log(`🔄 Ejecutando escaneo: ${scan.name}`);
    runScan(scan).catch(error => {
        console.error(`❌ Error: ${error.message}`);
    });
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Automated Scan Scheduler - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Crear directorio de resultados
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    // Cargar escaneos existentes
    const config = loadConfig();
    global.scheduledTasks = global.scheduledTasks || {};
    
    // Programar escaneos existentes
    for (const scan of config.scans) {
        if (scan.enabled && cron.validate(scan.schedule)) {
            const task = cron.schedule(scan.schedule, () => {
                runScan(scan).catch(error => {
                    console.error(`❌ Error ejecutando escaneo programado: ${error.message}`);
                });
            });
            global.scheduledTasks[scan.id] = task;
        }
    }

    // Ejecutar acción
    switch (action) {
        case 'run':
            if (!scanId) {
                console.error('❌ Debes especificar un ID de escaneo');
                process.exit(1);
            }
            await runScheduledScan(scanId);
            break;
        case 'list':
            listScans();
            break;
        case 'remove':
            if (!scanId) {
                console.error('❌ Debes especificar un ID de escaneo');
                process.exit(1);
            }
            removeScan(scanId);
            break;
        default:
            if (schedule && targets) {
                scheduleScan();
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            }
            break;
    }

    console.log('\n✅ Scheduler completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo scheduler...');
    if (global.scheduledTasks) {
        for (const [id, task] of Object.entries(global.scheduledTasks)) {
            task.stop();
        }
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo scheduler...');
    if (global.scheduledTasks) {
        for (const [id, task] of Object.entries(global.scheduledTasks)) {
            task.stop();
        }
    }
    process.exit(0);
});
