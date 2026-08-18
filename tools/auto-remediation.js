#!/usr/bin/env node

/**
 * Automated Remediation - MFH TOOLS PRO
 * Ejecuta acciones correctivas automáticas
 * 
 * Uso: node auto-remediation.js [opciones]
 * Ejemplo: node auto-remediation.js --playbook malware.json --incident INC-001
 * Ejemplo: node auto-remediation.js --action block_ip --target 192.168.1.100
 * Ejemplo: node auto-remediation.js --list
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const PLAYBOOKS_DIR = path.join(__dirname, 'remediation_playbooks');
const LOG_FILE = path.join(__dirname, 'remediation.log');
const BACKUP_DIR = path.join(__dirname, 'remediation_backups');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let playbook = null;
let target = null;
let incidentId = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--playbook':
        case '-p':
            playbook = args[i + 1];
            i++;
            break;
        case '--action':
        case '-a':
            action = args[i + 1];
            i++;
            break;
        case '--target':
        case '-t':
            target = args[i + 1];
            i++;
            break;
        case '--incident':
        case '-i':
            incidentId = args[i + 1];
            i++;
            break;
        case '--list':
            action = 'list';
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Automated Remediation - MFH TOOLS PRO
=========================================
Ejecuta acciones correctivas automáticas.

Uso:
  node auto-remediation.js [opciones]

Opciones:
  --playbook, -p <archivo>  Playbook de remediación
  --action, -a <acción>     Acción a ejecutar (block_ip, allow_ip, restart_service, patch)
  --target, -t <objetivo>   Objetivo de la acción
  --incident, -i <id>       ID del incidente
  --list                    Listar playbooks disponibles
  --verbose, -v             Mostrar más detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node auto-remediation.js --playbook malware.json --incident INC-001
  node auto-remediation.js --action block_ip --target 192.168.1.100
  node auto-remediation.js --list
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function logRemediation(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    } catch (error) {
        // Si no se puede escribir, solo mostrar en consola
    }
    console.log(message);
}

function backupFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const backupName = path.basename(filePath) + '.' + Date.now() + '.bak';
    const backupPath = path.join(BACKUP_DIR, backupName);
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        if (verbose) {
            console.log(`🔧 Ejecutando: ${command}`);
        }
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

async function executeAction(action, target) {
    logRemediation(`🔄 Ejecutando acción: ${action} sobre ${target}`, 'info');
    
    let result = { success: false, message: '', details: null };
    
    switch (action) {
        case 'block_ip':
            try {
                const backup = backupFile('/etc/hosts.deny');
                const command = `echo "ALL: ${target}" >> /etc/hosts.deny`;
                await executeCommand(command);
                result = {
                    success: true,
                    message: `IP ${target} bloqueada exitosamente`,
                    details: { backup: backup || 'No backup created' }
                };
                logRemediation(`✅ IP ${target} bloqueada`, 'success');
            } catch (error) {
                result = {
                    success: false,
                    message: `Error bloqueando IP ${target}`,
                    details: { error: error.message }
                };
                logRemediation(`❌ Error bloqueando IP: ${error.message}`, 'error');
            }
            break;

        case 'allow_ip':
            try {
                const command = `sed -i '/${target}/d' /etc/hosts.deny`;
                await executeCommand(command);
                result = {
                    success: true,
                    message: `IP ${target} permitida exitosamente`
                };
                logRemediation(`✅ IP ${target} permitida`, 'success');
            } catch (error) {
                result = {
                    success: false,
                    message: `Error permitiendo IP ${target}`,
                    details: { error: error.message }
                };
                logRemediation(`❌ Error permitiendo IP: ${error.message}`, 'error');
            }
            break;

        case 'restart_service':
            try {
                const command = `systemctl restart ${target}`;
                await executeCommand(command);
                result = {
                    success: true,
                    message: `Servicio ${target} reiniciado exitosamente`
                };
                logRemediation(`✅ Servicio ${target} reiniciado`, 'success');
            } catch (error) {
                result = {
                    success: false,
                    message: `Error reiniciando servicio ${target}`,
                    details: { error: error.message }
                };
                logRemediation(`❌ Error reiniciando servicio: ${error.message}`, 'error');
            }
            break;

        case 'patch':
            try {
                const backup = backupFile(target);
                const command = `patch -b ${target}`;
                await executeCommand(command);
                result = {
                    success: true,
                    message: `Parche aplicado a ${target}`,
                    details: { backup: backup || 'No backup created' }
                };
                logRemediation(`✅ Parche aplicado a ${target}`, 'success');
            } catch (error) {
                result = {
                    success: false,
                    message: `Error aplicando parche a ${target}`,
                    details: { error: error.message }
                };
                logRemediation(`❌ Error aplicando parche: ${error.message}`, 'error');
            }
            break;

        default:
            result = {
                success: false,
                message: `Acción desconocida: ${action}`,
                details: { available: ['block_ip', 'allow_ip', 'restart_service', 'patch'] }
            };
            logRemediation(`❌ Acción desconocida: ${action}`, 'error');
    }
    
    return result;
}

function loadPlaybook(playbookFile) {
    try {
        const fullPath = path.isAbsolute(playbookFile) ? playbookFile : path.join(PLAYBOOKS_DIR, playbookFile);
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Playbook no encontrado: ${fullPath}`);
            console.log('💡 Usa --list para ver los playbooks disponibles');
            process.exit(1);
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Error cargando playbook: ${error.message}`);
        process.exit(1);
    }
}

async function executePlaybook(playbookFile, incidentId) {
    const playbook = loadPlaybook(playbookFile);
    
    console.log(`\n📋 EJECUTANDO PLAYBOOK: ${playbook.name || playbookFile}`);
    console.log(`📝 ${playbook.description || 'Sin descripción'}`);
    console.log(`📋 Incidente: ${incidentId || 'N/A'}`);
    console.log(`📊 Pasos: ${playbook.steps ? playbook.steps.length : 0}`);
    console.log('='.repeat(60));
    
    logRemediation(`Iniciando playbook: ${playbook.name || playbookFile}`, 'info');
    
    const steps = playbook.steps || [];
    let results = [];
    
    for (const step of steps) {
        console.log(`\n🔹 ${step.description || step.action}`);
        logRemediation(`Ejecutando paso: ${step.action}`, 'info');
        
        const result = await executeAction(step.action, step.target || '');
        
        results.push({
            step: step.action,
            description: step.description,
            result
        });
        
        if (result.success) {
            console.log(`   ✅ ${result.message}`);
        } else {
            console.log(`   ❌ ${result.message}`);
            if (step.required !== false) {
                console.log(`   ⚠️ Paso requerido falló - deteniendo playbook`);
                logRemediation(`Playbook detenido - paso requerido falló: ${step.action}`, 'error');
                break;
            }
        }
    }
    
    // Resumen
    console.log('\n📊 RESUMEN DE EJECUCIÓN:');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.result.success).length;
    const failed = results.filter(r => !r.result.success).length;
    
    console.log(`   ✅ Exitosos: ${successful}`);
    console.log(`   ❌ Fallidos: ${failed}`);
    console.log(`   📊 Total: ${results.length}`);
    console.log(`   📋 Estado: ${failed === 0 ? '✅ COMPLETADO' : '⚠️ COMPLETADO CON ERRORES'}`);
    
    logRemediation(`Playbook completado: ${successful}/${results.length} exitosos`, 'info');
    
    return { results, successful, failed };
}

function listPlaybooks() {
    if (!fs.existsSync(PLAYBOOKS_DIR)) {
        fs.mkdirSync(PLAYBOOKS_DIR, { recursive: true });
        console.log('📁 No hay playbooks disponibles.');
        console.log('💡 Crea un playbook en formato JSON en la carpeta:', PLAYBOOKS_DIR);
        console.log('\n📋 Ejemplo de playbook:');
        console.log(JSON.stringify({
            name: 'Ejemplo de Playbook',
            description: 'Descripción del playbook',
            steps: [
                { action: 'block_ip', target: '192.168.1.100', description: 'Bloquear IP maliciosa' },
                { action: 'restart_service', target: 'nginx', description: 'Reiniciar servicio' }
            ]
        }, null, 2));
        return;
    }
    
    const files = fs.readdirSync(PLAYBOOKS_DIR);
    if (files.length === 0) {
        console.log('📭 No hay playbooks disponibles');
        return;
    }
    
    console.log(`\n📋 PLAYBOOKS DISPONIBLES (${files.length}):`);
    console.log('='.repeat(60));
    
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(PLAYBOOKS_DIR, file), 'utf8');
                const playbook = JSON.parse(content);
                console.log(`\n📌 ${playbook.name || file}`);
                console.log(`   📋 Archivo: ${file}`);
                console.log(`   📝 ${playbook.description || 'Sin descripción'}`);
                console.log(`   📊 Pasos: ${playbook.steps ? playbook.steps.length : 0}`);
            } catch (error) {
                console.log(`\n❌ ${file}: Error cargando playbook`);
            }
        }
    }
}

function createExamplePlaybook() {
    if (!fs.existsSync(PLAYBOOKS_DIR)) {
        fs.mkdirSync(PLAYBOOKS_DIR, { recursive: true });
    }
    
    const example = {
        name: 'Ejemplo de Remediation',
        description: 'Playbook de ejemplo para demostración',
        steps: [
            { action: 'block_ip', target: '192.168.1.100', description: 'Bloquear IP maliciosa', required: true },
            { action: 'restart_service', target: 'nginx', description: 'Reiniciar servicio web', required: false },
            { action: 'patch', target: '/etc/hosts', description: 'Aplicar parche de seguridad', required: true }
        ]
    };
    
    const filePath = path.join(PLAYBOOKS_DIR, 'example.json');
    fs.writeFileSync(filePath, JSON.stringify(example, null, 2));
    console.log(`✅ Playbook de ejemplo creado: ${filePath}`);
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Automated Remediation - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Crear directorios necesarios
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    switch (action) {
        case 'list':
            listPlaybooks();
            break;
        default:
            if (playbook) {
                await executePlaybook(playbook, incidentId);
            } else if (action && target) {
                const result = await executeAction(action, target);
                console.log(`\n📊 Resultado: ${result.success ? '✅ Éxito' : '❌ Fallo'}`);
                console.log(`📝 ${result.message}`);
                if (result.details) {
                    console.log(`📋 Detalles:`, result.details);
                }
            } else if (action === 'init') {
                createExamplePlaybook();
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
                console.log('\n💡 Acciones disponibles: block_ip, allow_ip, restart_service, patch');
                console.log('💡 O usa --playbook para ejecutar un playbook completo');
                console.log('💡 Usa --init para crear un playbook de ejemplo');
            }
            break;
    }

    console.log('\n✅ Automated Remediation completado');
})();
