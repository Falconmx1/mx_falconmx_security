#!/usr/bin/env node

/**
 * Task Scheduler - MFH TOOLS PRO
 * Programa tareas con cron
 * 
 * Uso: node task-scheduler.js [opciones]
 * Ejemplo: node task-scheduler.js --task "node scan.js" --schedule "0 2 * * *" --name "Escaneo Diario"
 * Ejemplo: node task-scheduler.js --list
 * Ejemplo: node task-scheduler.js --remove "Escaneo Diario"
 * Ejemplo: node task-scheduler.js --run "Escaneo Diario"
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const LOG_FILE = path.join(__dirname, 'scheduler.log');

// ==================== FUNCIONES DE ARCHIVOS ====================
function loadTasks() {
    try {
        if (fs.existsSync(TASKS_FILE)) {
            return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando tareas:', error.message);
    }
    return [];
}

function saveTasks(tasks) {
    try {
        fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
    } catch (error) {
        console.error('❌ Error guardando tareas:', error.message);
    }
}

function logMessage(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
}

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let taskName = null;
let taskCommand = null;
let schedule = null;
let description = '';

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--add':
        case '-a':
            action = 'add';
            break;
        case '--list':
        case '-l':
            action = 'list';
            break;
        case '--remove':
        case '-r':
            action = 'remove';
            taskName = args[i + 1];
            i++;
            break;
        case '--run':
        case '-x':
            action = 'run';
            taskName = args[i + 1];
            i++;
            break;
        case '--task':
        case '-t':
            taskCommand = args[i + 1];
            i++;
            break;
        case '--schedule':
        case '-s':
            schedule = args[i + 1];
            i++;
            break;
        case '--name':
        case '-n':
            taskName = args[i + 1];
            i++;
            break;
        case '--desc':
            description = args[i + 1];
            i++;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Task Scheduler - MFH TOOLS PRO
=================================
Programa tareas con cron.

Uso:
  node task-scheduler.js [opciones]

Opciones:
  --add, -a              Agregar una nueva tarea
  --list, -l             Listar todas las tareas
  --remove, -r <nombre>  Eliminar una tarea
  --run, -x <nombre>     Ejecutar una tarea inmediatamente
  --task, -t <comando>   Comando a ejecutar
  --schedule, -s <cron>  Programación en formato cron
  --name, -n <nombre>    Nombre de la tarea
  --desc <descripción>   Descripción de la tarea
  --help, -h             Mostrar esta ayuda

Ejemplos:
  node task-scheduler.js --add --task "node scan.js" --schedule "0 2 * * *" --name "Escaneo Diario"
  node task-scheduler.js --list
  node task-scheduler.js --remove "Escaneo Diario"
  node task-scheduler.js --run "Escaneo Diario"
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES PRINCIPALES ====================
function executeTask(command, name) {
    console.log(`▶️ Ejecutando tarea: ${name}`);
    logMessage(`Ejecutando: ${name} - ${command}`);
    
    const child = exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error: ${error.message}`);
            logMessage(`ERROR en ${name}: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ Stderr: ${stderr}`);
            logMessage(`Stderr en ${name}: ${stderr}`);
        }
        console.log(`✅ Tarea completada: ${name}`);
        logMessage(`Completada: ${name}`);
        console.log(stdout);
    });
    
    // Mostrar salida en tiempo real
    child.stdout.on('data', (data) => {
        process.stdout.write(data);
    });
    child.stderr.on('data', (data) => {
        process.stderr.write(data);
    });
}

function addTask() {
    if (!taskCommand) {
        console.error('❌ Debes especificar un comando con --task');
        process.exit(1);
    }
    if (!schedule) {
        console.error('❌ Debes especificar una programación con --schedule');
        process.exit(1);
    }
    if (!taskName) {
        taskName = `task-${Date.now()}`;
    }
    
    const tasks = loadTasks();
    
    // Verificar si ya existe
    if (tasks.find(t => t.name === taskName)) {
        console.error(`❌ Ya existe una tarea con el nombre: ${taskName}`);
        process.exit(1);
    }
    
    // Validar formato cron
    if (!cron.validate(schedule)) {
        console.error(`❌ Formato cron inválido: ${schedule}`);
        console.log('   Formato: * * * * * (minuto hora día mes día_semana)');
        process.exit(1);
    }
    
    const newTask = {
        id: Date.now().toString(),
        name: taskName,
        command: taskCommand,
        schedule: schedule,
        description: description,
        createdAt: new Date().toISOString(),
        lastRun: null,
        status: 'active'
    };
    
    tasks.push(newTask);
    saveTasks(tasks);
    
    console.log(`✅ Tarea agregada: ${taskName}`);
    console.log(`   📋 Comando: ${taskCommand}`);
    console.log(`   🕐 Programación: ${schedule}`);
    
    // Iniciar el scheduler
    startScheduler(tasks);
}

function listTasks() {
    const tasks = loadTasks();
    if (tasks.length === 0) {
        console.log('📭 No hay tareas programadas');
        return;
    }
    
    console.log(`\n📋 TAREAS PROGRAMADAS (${tasks.length}):`);
    console.log('='.repeat(60));
    
    for (const task of tasks) {
        const statusColor = task.status === 'active' ? '🟢' : '🔴';
        console.log(`\n${statusColor} ${task.name}`);
        console.log(`   📋 Comando: ${task.command}`);
        console.log(`   🕐 Programación: ${task.schedule}`);
        if (task.description) {
            console.log(`   📝 Descripción: ${task.description}`);
        }
        console.log(`   📅 Creada: ${new Date(task.createdAt).toLocaleString()}`);
        if (task.lastRun) {
            console.log(`   ⏱️ Última ejecución: ${new Date(task.lastRun).toLocaleString()}`);
        }
        console.log(`   📌 ID: ${task.id}`);
    }
}

function removeTask(name) {
    let tasks = loadTasks();
    const initialLength = tasks.length;
    tasks = tasks.filter(t => t.name !== name);
    
    if (tasks.length === initialLength) {
        console.error(`❌ No se encontró la tarea: ${name}`);
        process.exit(1);
    }
    
    saveTasks(tasks);
    console.log(`✅ Tarea eliminada: ${name}`);
}

function runTask(name) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.name === name);
    
    if (!task) {
        console.error(`❌ No se encontró la tarea: ${name}`);
        process.exit(1);
    }
    
    // Actualizar última ejecución
    task.lastRun = new Date().toISOString();
    saveTasks(tasks);
    
    executeTask(task.command, task.name);
}

function startScheduler(tasks) {
    // Detener schedules previos si existen
    if (global.scheduledTasks) {
        for (const task of global.scheduledTasks) {
            task.stop();
        }
    }
    
    global.scheduledTasks = [];
    
    for (const task of tasks) {
        if (task.status === 'active') {
            const scheduledTask = cron.schedule(task.schedule, () => {
                console.log(`🔄 Ejecutando tarea programada: ${task.name}`);
                executeTask(task.command, task.name);
                // Actualizar última ejecución
                const tasks = loadTasks();
                const found = tasks.find(t => t.id === task.id);
                if (found) {
                    found.lastRun = new Date().toISOString();
                    saveTasks(tasks);
                }
            });
            global.scheduledTasks.push(scheduledTask);
            console.log(`⏰ Tarea programada: ${task.name} (${task.schedule})`);
        }
    }
}

// ==================== MAIN ====================
(function main() {
    console.log(`🔍 Task Scheduler - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    // Cargar tareas existentes
    const tasks = loadTasks();
    
    // Iniciar scheduler si hay tareas
    if (tasks.length > 0) {
        startScheduler(tasks);
        console.log(`✅ ${tasks.length} tareas cargadas`);
    }
    
    // Ejecutar acción
    switch (action) {
        case 'add':
            addTask();
            break;
        case 'list':
            listTasks();
            break;
        case 'remove':
            if (!taskName) {
                console.error('❌ Debes especificar el nombre de la tarea');
                process.exit(1);
            }
            removeTask(taskName);
            break;
        case 'run':
            if (!taskName) {
                console.error('❌ Debes especificar el nombre de la tarea');
                process.exit(1);
            }
            runTask(taskName);
            break;
        default:
            if (action === null) {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            }
            break;
    }
    
    // Mantener el proceso vivo si hay tareas programadas
    if (tasks.length > 0 && !action) {
        console.log('🔄 Scheduler activo. Presiona Ctrl+C para detener.');
        process.stdin.resume();
    }
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo scheduler...');
    if (global.scheduledTasks) {
        for (const task of global.scheduledTasks) {
            task.stop();
        }
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo scheduler...');
    if (global.scheduledTasks) {
        for (const task of global.scheduledTasks) {
            task.stop();
        }
    }
    process.exit(0);
});
