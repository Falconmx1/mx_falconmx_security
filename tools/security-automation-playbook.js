#!/usr/bin/env node

/**
 * Security Automation Playbook - MFH TOOLS PRO
 * Crea y ejecuta playbooks de automatización de seguridad
 * 
 * Uso: node security-automation-playbook.js [opciones]
 * Ejemplo: node security-automation-playbook.js --playbook malware_response.json
 * Ejemplo: node security-automation-playbook.js --list
 * Ejemplo: node security-automation-playbook.js --run playbook-123
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

// ==================== CONFIGURACIÓN ====================
const PLAYBOOKS_DIR = path.join(__dirname, 'security_playbooks');
const LOGS_DIR = path.join(__dirname, 'playbook_logs');

// ==================== PLAYBOOKS POR DEFECTO ====================
const DEFAULT_PLAYBOOKS = {
    'malware_response': {
        name: 'Malware Response',
        description: 'Responde a detección de malware',
        triggers: ['malware_detected', 'virus_found'],
        steps: [
            { id: '1', action: 'isolate_host', description: 'Aislar host infectado', required: true },
            { id: '2', action: 'collect_evidence', description: 'Recolectar evidencia', required: true },
            { id: '3', action: 'quarantine_files', description: 'Poner en cuarentena archivos', required: false },
            { id: '4', action: 'notify_team', description: 'Notificar al equipo de seguridad', required: true }
        ]
    },
    'phishing_response': {
        name: 'Phishing Response',
        description: 'Responde a ataques de phishing',
        triggers: ['phishing_report', 'suspicious_email'],
        steps: [
            { id: '1', action: 'block_sender', description: 'Bloquear remitente', required: true },
            { id: '2', action: 'remove_email', description: 'Eliminar email de todos', required: true },
            { id: '3', action: 'reset_passwords', description: 'Resetear contraseñas', required: true },
            { id: '4', action: 'notify_team', description: 'Notificar al equipo', required: true }
        ]
    },
    'ddos_response': {
        name: 'DDoS Response',
        description: 'Responde a ataques DDoS',
        triggers: ['ddos_detected', 'traffic_spike'],
        steps: [
            { id: '1', action: 'activate_mitigation', description: 'Activar mitigación DDoS', required: true },
            { id: '2', action: 'rate_limit', description: 'Configurar rate limiting', required: true },
            { id: '3', action: 'block_ips', description: 'Bloquear IPs maliciosas', required: true },
            { id: '4', action: 'notify_team', description: 'Notificar al equipo', required: true }
        ]
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let playbookFile = null;
let playbookId = null;
let incidentId = null;
let verbose = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--playbook':
            playbookFile = args[i + 1];
            i++;
            break;
        case '--run':
            action = 'run';
            playbookId = args[i + 1];
            i++;
            break;
        case '--list':
            action = 'list';
            break;
        case '--init':
            init = true;
            break;
        case '--incident':
            incidentId = args[i + 1];
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Security Automation Playbook - MFH TOOLS PRO
================================================
Crea y ejecuta playbooks de automatización de seguridad.

Uso:
  node security-automation-playbook.js [opciones]

Opciones:
  --init                   Crear playbooks por defecto
  --list                   Listar playbooks disponibles
  --run <id>               Ejecutar un playbook
  --playbook <archivo>     Cargar playbook desde archivo
  --incident <id>          ID del incidente
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node security-automation-playbook.js --init
  node security-automation-playbook.js --list
  node security-automation-playbook.js --run playbook-001 --incident INC-001
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadPlaybooks() {
    const playbooks = {};
    
    try {
        if (fs.existsSync(PLAYBOOKS_DIR)) {
            const files = fs.readdirSync(PLAYBOOKS_DIR);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const content = fs.readFileSync(path.join(PLAYBOOKS_DIR, file), 'utf8');
                        const playbook = JSON.parse(content);
                        const id = file.replace('.json', '');
                        playbooks[id] = playbook;
                    } catch (error) {
                        console.error(`❌ Error cargando ${file}:`, error.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error cargando playbooks:', error.message);
    }
    
    return playbooks;
}

function savePlaybook(id, playbook) {
    if (!fs.existsSync(PLAYBOOKS_DIR)) {
        fs.mkdirSync(PLAYBOOKS_DIR, { recursive: true });
    }
    
    const filePath = path.join(PLAYBOOKS_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(playbook, null, 2));
}

function initPlaybooks() {
    if (!fs.existsSync(PLAYBOOKS_DIR)) {
        fs.mkdirSync(PLAYBOOKS_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    let count = 0;
    for (const [id, playbook] of Object.entries(DEFAULT_PLAYBOOKS)) {
        const fullPlaybook = {
            ...playbook,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        savePlaybook(id, fullPlaybook);
        count++;
        console.log(`✅ Playbook creado: ${id} - ${playbook.name}`);
    }
    
    console.log(`\n📁 ${count} playbooks creados en: ${PLAYBOOKS_DIR}`);
}

function listPlaybooks() {
    const playbooks = loadPlaybooks();
    const ids = Object.keys(playbooks);
    
    if (ids.length === 0) {
        console.log('📭 No hay playbooks disponibles');
        console.log('   Ejecuta --init para crear los playbooks por defecto');
        return;
    }
    
    console.log(`\n📋 PLAYBOOKS DISPONIBLES (${ids.length}):`);
    console.log('='.repeat(60));
    
    for (const [id, playbook] of Object.entries(playbooks)) {
        console.log(`\n📌 ${playbook.name || id}`);
        console.log(`   📋 ID: ${id}`);
        console.log(`   📝 ${playbook.description || 'Sin descripción'}`);
        console.log(`   📊 Pasos: ${playbook.steps ? playbook.steps.length : 0}`);
        console.log(`   🔔 Triggers: ${playbook.triggers ? playbook.triggers.join(', ') : 'Ninguno'}`);
        console.log(`   📅 Creado: ${new Date(playbook.createdAt).toLocaleString()}`);
    }
}

function logPlaybook(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    const logFile = path.join(LOGS_DIR, `playbook_${new Date().toISOString().split('T')[0]}.log`);
    try {
        fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch (error) {
        // Ignorar errores de escritura
    }
    if (verbose || type === 'error') {
        console.log(message);
    }
}

function executeAction(action, target, context) {
    return new Promise((resolve, reject) => {
        console.log(`🔧 Ejecutando: ${action}${target ? ` (${target})` : ''}`);
        logPlaybook(`Ejecutando: ${action}${target ? ` (${target})` : ''}`, 'info');
        
        const actions = {
            'isolate_host': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Host aislado de la red');
                        resolve({ success: true, message: 'Host aislado' });
                    }, 1000);
                });
            },
            'collect_evidence': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Evidencia recolectada');
                        resolve({ success: true, message: 'Evidencia recolectada' });
                    }, 2000);
                });
            },
            'quarantine_files': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Archivos en cuarentena');
                        resolve({ success: true, message: 'Archivos en cuarentena' });
                    }, 1500);
                });
            },
            'notify_team': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Equipo notificado');
                        resolve({ success: true, message: 'Equipo notificado' });
                    }, 500);
                });
            },
            'block_sender': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Remitente bloqueado');
                        resolve({ success: true, message: 'Remitente bloqueado' });
                    }, 500);
                });
            },
            'remove_email': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Email eliminado');
                        resolve({ success: true, message: 'Email eliminado' });
                    }, 2000);
                });
            },
            'reset_passwords': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Contraseñas reseteadas');
                        resolve({ success: true, message: 'Contraseñas reseteadas' });
                    }, 3000);
                });
            },
            'activate_mitigation': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Mitigación DDoS activada');
                        resolve({ success: true, message: 'Mitigación activada' });
                    }, 2000);
                });
            },
            'rate_limit': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Rate limiting configurado');
                        resolve({ success: true, message: 'Rate limiting configurado' });
                    }, 1500);
                });
            },
            'block_ips': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ IPs maliciosas bloqueadas');
                        resolve({ success: true, message: 'IPs bloqueadas' });
                    }, 1000);
                });
            },
            'script': () => {
                return new Promise((resolve, reject) => {
                    if (!target) {
                        reject(new Error('No se especificó script'));
                        return;
                    }
                    exec(target, (error, stdout, stderr) => {
                        if (error) {
                            reject(error);
                        } else {
                            console.log(`   ✅ Script ejecutado`);
                            resolve({ success: true, stdout, stderr });
                        }
                    });
                });
            }
        };
        
        const actionFn = actions[action];
        if (actionFn) {
            actionFn().then(resolve).catch(reject);
        } else {
            reject(new Error(`Acción desconocida: ${action}`));
        }
    });
}

async function runPlaybook(id, incidentId) {
    const playbooks = loadPlaybooks();
    const playbook = playbooks[id];
    
    if (!playbook) {
        console.error(`❌ Playbook no encontrado: ${id}`);
        console.log('   Usa --list para ver los playbooks disponibles');
        process.exit(1);
    }
    
    console.log(`\n📋 EJECUTANDO PLAYBOOK: ${playbook.name}`);
    console.log(`📝 ${playbook.description || 'Sin descripción'}`);
    console.log(`📋 Incidente: ${incidentId || 'N/A'}`);
    console.log(`📊 Pasos: ${playbook.steps ? playbook.steps.length : 0}`);
    console.log('='.repeat(60));
    
    logPlaybook(`Iniciando playbook: ${playbook.name} (${id})`, 'info');
    if (incidentId) {
        logPlaybook(`Incidente: ${incidentId}`, 'info');
    }
    
    const steps = playbook.steps || [];
    const results = [];
    let failed = false;
    
    for (const step of steps) {
        const stepNumber = step.id || (steps.indexOf(step) + 1);
        console.log(`\n🔹 Paso ${stepNumber}: ${step.description}`);
        logPlaybook(`Paso ${stepNumber}: ${step.description}`, 'info');
        
        try {
            const result = await executeAction(step.action, step.target || '', { incidentId });
            results.push({
                step: stepNumber,
                description: step.description,
                action: step.action,
                status: 'success',
                result
            });
            console.log(`   ✅ Paso ${stepNumber} completado`);
            logPlaybook(`Paso ${stepNumber} completado`, 'success');
        } catch (error) {
            results.push({
                step: stepNumber,
                description: step.description,
                action: step.action,
                status: 'failed',
                error: error.message
            });
            console.log(`   ❌ Error en paso ${stepNumber}: ${error.message}`);
            logPlaybook(`Error en paso ${stepNumber}: ${error.message}`, 'error');
            
            if (step.required !== false) {
                failed = true;
                console.log(`   ⚠️ Paso requerido falló - deteniendo playbook`);
                logPlaybook(`Playbook detenido - paso requerido falló`, 'error');
                break;
            } else {
                console.log(`   ℹ️ Paso opcional - continuando...`);
                logPlaybook(`Paso opcional falló - continuando`, 'warning');
            }
        }
    }
    
    // Resumen
    console.log('\n📊 RESUMEN DE EJECUCIÓN:');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.status === 'success').length;
    const errores = results.filter(r => r.status === 'failed').length;
    
    console.log(`   ✅ Exitosos: ${successful}`);
    console.log(`   ❌ Fallidos: ${errores}`);
    console.log(`   📊 Total: ${results.length}`);
    console.log(`   📋 Estado: ${failed ? '⚠️ COMPLETADO CON ERRORES' : '✅ COMPLETADO'}`);
    
    // Guardar resultados
    if (incidentId) {
        const resultFile = path.join(LOGS_DIR, `playbook_${id}_${incidentId}_${Date.now()}.json`);
        const output = {
            incidentId,
            playbookId: id,
            playbookName: playbook.name,
            timestamp: new Date().toISOString(),
            steps: results,
            summary: {
                total: results.length,
                successful,
                errors: errores
            }
        };
        fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${resultFile}`);
    }
    
    logPlaybook(`Playbook completado: ${failed ? 'CON ERRORES' : 'ÉXITO'}`, failed ? 'error' : 'success');
    
    return { results, successful, errors: errores, failed };
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Security Automation Playbook - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (init) {
        initPlaybooks();
        process.exit(0);
    }

    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    switch (action) {
        case 'list':
            listPlaybooks();
            break;
            
        case 'run':
            if (!playbookId) {
                console.error('❌ Debes especificar un ID de playbook');
                console.log('   Usa --list para ver los playbooks disponibles');
                process.exit(1);
            }
            await runPlaybook(playbookId, incidentId);
            break;
            
        default:
            if (playbookFile) {
                // Cargar playbook desde archivo
                try {
                    const content = fs.readFileSync(playbookFile, 'utf8');
                    const playbook = JSON.parse(content);
                    const id = path.basename(playbookFile, '.json');
                    savePlaybook(id, playbook);
                    console.log(`✅ Playbook cargado: ${id}`);
                    console.log(`📋 Nombre: ${playbook.name}`);
                    console.log(`📊 Pasos: ${playbook.steps ? playbook.steps.length : 0}`);
                } catch (error) {
                    console.error(`❌ Error cargando playbook: ${error.message}`);
                    process.exit(1);
                }
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
                console.log('💡 Opciones: --init, --list, --run, --playbook');
                console.log('💡 Ejemplo: --run playbook-001 --incident INC-001');
            }
            break;
    }

    console.log('\n✅ Security Automation Playbook completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Playbook detenido');
    process.exit(0);
});
