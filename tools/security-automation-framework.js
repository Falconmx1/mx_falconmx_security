#!/usr/bin/env node

/**
 * Security Automation Framework - MFH TOOLS PRO
 * Framework de automatización de tareas de seguridad
 * 
 * Uso: node security-automation-framework.js [opciones]
 * Ejemplo: node security-automation-framework.js --task scan-network
 * Ejemplo: node security-automation-framework.js --schedule --cron "0 2 * * *"
 * Ejemplo: node security-automation-framework.js --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec, execSync } = require('child_process');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'saf_config.json');
const TASKS_DIR = path.join(__dirname, 'saf_tasks');
const LOGS_DIR = path.join(__dirname, 'saf_logs');

const DEFAULT_CONFIG = {
    tasks: {
        'scan-network': {
            name: 'Escaneo de Red',
            description: 'Escanea la red en busca de dispositivos',
            command: 'nmap -sn 192.168.1.0/24',
            schedule: null,
            enabled: true
        },
        'vulnerability-scan': {
            name: 'Escaneo de Vulnerabilidades',
            description: 'Escanea vulnerabilidades en servidores',
            command: 'node vuln-scanner-lite.js --target 192.168.1.100',
            schedule: '0 3 * * *',
            enabled: true
        },
        'backup-logs': {
            name: 'Backup de Logs',
            description: 'Realiza backup de logs de seguridad',
            command: 'tar -czf logs_backup_$(date +%Y%m%d).tar.gz /var/log/',
            schedule: '0 1 * * *',
            enabled: true
        },
        'update-iocs': {
            name: 'Actualizacion de IoCs',
            description: 'Actualiza la base de datos de IoCs',
            command: 'node threat-intelligence-platform.js --feed',
            schedule: '0 */6 * * *',
            enabled: true
        }
    },
    max_concurrent: 3,
    timeout: 3600
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let taskName = null;
let cronExpression = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--task':
            action = 'run';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                taskName = args[i + 1];
                i++;
            }
            break;
        case '--list':
            action = 'list';
            break;
        case '--schedule':
            action = 'schedule';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                taskName = args[i + 1];
                i++;
            }
            break;
        case '--cron':
            cronExpression = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
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
🛡️ Security Automation Framework - MFH TOOLS PRO
================================================
Framework de automatización de tareas de seguridad.

Uso:
  node security-automation-framework.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --list                Listar tareas disponibles
  --run <tarea>         Ejecutar una tarea
  --schedule <tarea>    Programar una tarea
  --cron <expresion>    Expresion cron para programacion
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node security-automation-framework.js --init
  node security-automation-framework.js --list
  node security-automation-framework.js --run scan-network
  node security-automation-framework.js --schedule backup-logs --cron "0 2 * * *"
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
        console.error('❌ Error cargando configuracion:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuracion:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(TASKS_DIR)) {
        fs.mkdirSync(TASKS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Tareas: ${TASKS_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
}

function listTasks() {
    const config = loadConfig();
    console.log('\n📋 TAREAS DISPONIBLES:');
    console.log('='.repeat(50));
    
    for (const [key, data] of Object.entries(config.tasks)) {
        console.log(`\n📌 ${key}`);
        console.log(`   Nombre: ${data.name}`);
        console.log(`   Descripcion: ${data.description}`);
        console.log(`   Comando: ${data.command}`);
        console.log(`   Programacion: ${data.schedule || 'Manual'}`);
        console.log(`   Estado: ${data.enabled ? '✅ Activo' : '❌ Inactivo'}`);
    }
}

function runTask(taskName) {
    console.log(`⚡ Ejecutando tarea: ${taskName}`);
    
    const config = loadConfig();
    const task = config.tasks[taskName];
    
    if (!task) {
        console.error(`❌ Tarea no encontrada: ${taskName}`);
        console.log(`   Tareas disponibles: ${Object.keys(config.tasks).join(', ')}`);
        return;
    }
    
    if (!task.enabled) {
        console.error(`❌ Tarea deshabilitada: ${taskName}`);
        return;
    }
    
    const startTime = Date.now();
    console.log(`📌 Comando: ${task.command}`);
    console.log('🔄 Ejecutando...');
    
    try {
        const output = execSync(task.command, { 
            timeout: (config.timeout || 3600) * 1000,
            encoding: 'utf8',
            stdio: verbose ? 'inherit' : 'pipe'
        });
        
        const duration = (Date.now() - startTime) / 1000;
        
        const result = {
            task: taskName,
            timestamp: new Date().toISOString(),
            success: true,
            duration: duration,
            output: output || 'Completado exitosamente'
        };
        
        console.log(`✅ Tarea completada en ${duration.toFixed(2)}s`);
        
        // Guardar log
        const logFile = path.join(LOGS_DIR, `${taskName}_${Date.now()}.log`);
        fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
        console.log(`📄 Log guardado: ${logFile}`);
        
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
            console.log(`📄 Reporte guardado: ${outputFile}`);
        }
        
        return result;
        
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        
        const result = {
            task: taskName,
            timestamp: new Date().toISOString(),
            success: false,
            duration: duration,
            error: error.message
        };
        
        console.log(`❌ Tarea fallida: ${error.message}`);
        
        const logFile = path.join(LOGS_DIR, `${taskName}_${Date.now()}.log`);
        fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
        console.log(`📄 Log guardado: ${logFile}`);
        
        return result;
    }
}

function scheduleTask(taskName, cronExpression) {
    console.log(`📋 Programando tarea: ${taskName}`);
    
    const config = loadConfig();
    const task = config.tasks[taskName];
    
    if (!task) {
        console.error(`❌ Tarea no encontrada: ${taskName}`);
        console.log(`   Tareas disponibles: ${Object.keys(config.tasks).join(', ')}`);
        return;
    }
    
    if (!cronExpression) {
        console.error('❌ Debes especificar --cron');
        return;
    }
    
    task.schedule = cronExpression;
    task.enabled = true;
    saveConfig(config);
    
    console.log(`✅ Tarea programada correctamente`);
    console.log(`   Tarea: ${taskName}`);
    console.log(`   Programacion: ${cronExpression}`);
    console.log(`   Comando: ${task.command}`);
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🛡️ Security Automation Framework - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'list':
            listTasks();
            break;
            
        case 'run':
            if (!taskName) {
                console.error('❌ Debes especificar --task');
                process.exit(1);
            }
            runTask(taskName);
            break;
            
        case 'schedule':
            if (!taskName) {
                console.error('❌ Debes especificar --task');
                process.exit(1);
            }
            scheduleTask(taskName, cronExpression);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --list, --run, --schedule, --init');
            break;
    }
    
    console.log('\n✅ Security Automation Framework completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Security Automation Framework...');
    process.exit(0);
});
