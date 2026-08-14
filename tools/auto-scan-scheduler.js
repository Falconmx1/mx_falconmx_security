#!/usr/bin/env node

/**
 * Automated Scan Scheduler - MFH TOOLS PRO
 * Programa y orquesta escaneos automáticos (red, web, vulnerabilidades)
 * 
 * Uso: node auto-scan-scheduler.js [opciones]
 * Ejemplo: node auto-scan-scheduler.js --schedule "0 2 * * *" --targets targets.json --type nmap --name "Escaneo Diario"
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
let verbose = false;

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
        case '--verbose':
        case '-v':
            verbose = true;
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
  --type, -y <tipo>        Tipo de escaneo (nmap, nikto, openvas, port, web, vuln)
  --name, -n <nombre>      Nombre del escaneo
  --run <id>               Ejecutar un escaneo programado
  --list                   Listar escaneos programados
  --remove <id>            Eliminar un escaneo programado
  --verbose, -v            Mostrar más detalles
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
    try {
        fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    } catch (error) {
        // Si no se puede escribir, solo mostrar en consola
    }
    console.log(message);
}

function generateScanId() {
    return 'scan-' + crypto.randomBytes(8).toString('hex');
}

function loadTargets(file) {
    try {
        const fullPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Archivo de targets no encontrado: ${fullPath}`);
            console.log('💡 Crea un archivo targets.json con el siguiente formato:');
            console.log('   ["192.168.1.1", "192.168.1.2", "google.com"]');
            process.exit(1);
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
            console.error('❌ El archivo de targets debe ser un array JSON');
            process.exit(1);
        }
        return data;
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
            case 'port':
                command = `nmap -sS -p 1-1000 ${targetList}`;
                break;
            case 'web':
                command = `nikto -h ${targetList}`;
                break;
            case 'nikto':
                command = `nikto -h ${targetList}`;
                break;
            case 'openvas':
                command = `openvas-cli --target ${targetList}`;
                break;
            default:
                command = `echo "🔍 Ejecutando escaneo personalizado en ${targetList}"`;
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

function scheduleScan() {
    if (!schedule || !targets) {
        console.error('❌ Debes especificar --schedule y --targets');
        process.exit(1);
    }

    if (!cron.validate(schedule)) {
        console.error(`❌ Formato cron inválido: ${schedule}`);
        console.log('   Ejemplos válidos:');
        console.log('   "0 2 * * *"   → Todos los días a las 2:00 AM');
        console.log('   "0 0 * * 0"   → Todos los domingos a medianoche');
        console.log('   "*/30 * * * *" → Cada 30 minutos');
        process.exit(1);
    }

    // Cargar targets
    const targetList = loadTargets(targets);

    const config = loadConfig();
    const newScan = {
        id: generateScanId(),
        name: name || `Scan-${Date.now()}`,
        schedule: schedule,
        type: scanType || 'custom',
        targets: targetList,
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
    console.log(`🎯 Targets: ${newScan.targets.length} (${newScan.targets.join(', ')})`);
    console.log(`📋 Tipo: ${newScan.type}`);
    console.log('\n⏰ El scheduler se está ejecutando en segundo plano.');
    console.log('📌 Para ver los escaneos programados: node auto-scan-scheduler.js --list');
    console.log('📌 Para ejecutar un escaneo manualmente: node auto-scan-scheduler.js --run <ID>');
    console.log('📌 Los resultados se guardarán en: ' + RESULTS_DIR);
    
    // Programar
    const task = cron.schedule(schedule, () => {
        console.log(`\n🔄 Ejecutando escaneo programado: ${newScan.name}`);
        runScan(newScan).catch(error => {
            console.error(`❌ Error ejecutando escaneo programado: ${error.message}`);
        });
    });
    
    global.scheduledTasks = global.scheduledTasks || {};
    global.scheduledTasks[newScan.id] = task;
    
    // Mantener proceso vivo
    console.log('\n🔄 Scheduler activo. Presiona Ctrl+C para detener.');
    process.stdin.resume();
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
        console.log(`   🎯 Targets: ${scan.targets.length} (${scan.targets.join(', ')})`);
        console.log(`   📅 Creado: ${new Date(scan.createdAt).toLocaleString()}`);
        if (scan.lastRun) {
            console.log(`   ⏱️ Última ejecución: ${new Date(scan.lastRun).toLocaleString()}`);
        }
        console.log(`   📊 Estado: ${scan.status}`);
        if (scan.lastResult) {
            console.log(`   📁 Resultado: ${scan.lastResult}`);
        }
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

function createExampleTargets() {
    const examplePath = path.join(process.cwd(), 'targets.json');
    if (fs.existsSync(examplePath)) {
        console.log(`⚠️ Ya existe un archivo targets.json en ${examplePath}`);
        return;
    }
    
    const example = [
        "192.168.1.1",
        "192.168.1.2",
        "scanme.nmap.org",
        "google.com"
    ];
    
    fs.writeFileSync(examplePath, JSON.stringify(example, null, 2));
    console.log(`✅ Archivo de ejemplo creado: ${examplePath}`);
    console.log('📋 Contenido:');
    console.log(JSON.stringify(example, null, 2));
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
    let scheduledCount = 0;
    for (const scan of config.scans) {
        if (scan.enabled && cron.validate(scan.schedule)) {
            const task = cron.schedule(scan.schedule, () => {
                console.log(`\n🔄 Ejecutando escaneo programado: ${scan.name}`);
                runScan(scan).catch(error => {
                    console.error(`❌ Error ejecutando escaneo programado: ${error.message}`);
                });
            });
            global.scheduledTasks[scan.id] = task;
            scheduledCount++;
        }
    }
    
    if (scheduledCount > 0) {
        console.log(`⏰ ${scheduledCount} escaneos programados cargados`);
    }

    // Verificar si existe targets.json
    const targetPath = path.join(process.cwd(), 'targets.json');
    if (!fs.existsSync(targetPath) && !targets) {
        console.log('\n💡 No se encontró un archivo targets.json');
        console.log('   Para crear uno de ejemplo: node auto-scan-scheduler.js --init-targets');
    }

    // Ejecutar acción
    switch (action) {
        case 'init-targets':
            createExampleTargets();
            break;
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
            } else if (!action) {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
                if (config.scans.length > 0) {
                    console.log(`\n📊 ${config.scans.length} escaneos programados activos.`);
                    console.log('   Usa --list para verlos');
                }
            }
            break;
    }

    // Si hay escaneos programados, mantener proceso vivo
    if (Object.keys(global.scheduledTasks).length > 0 && !action) {
        console.log('\n🔄 Scheduler activo. Presiona Ctrl+C para detener.');
        process.stdin.resume();
    }
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo scheduler...');
    if (global.scheduledTasks) {
        for (const [id, task] of Object.entries(global.scheduledTasks)) {
            task.stop();
        }
        console.log(`✅ ${Object.keys(global.scheduledTasks).length} tareas detenidas`);
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
