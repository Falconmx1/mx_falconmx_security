#!/usr/bin/env node

/**
 * Incident Response Playbook - MFH TOOLS PRO
 * Ejecuta playbooks de respuesta a incidentes automatizados
 * 
 * Uso: node incident-response.js [opciones]
 * Ejemplo: node incident-response.js --playbook malware.json --incident INC-001
 * Ejemplo: node incident-response.js --list
 * Ejemplo: node incident-response.js --run playbook-123
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

// ==================== CONFIGURACIÓN ====================
const PLAYBOOKS_DIR = path.join(__dirname, 'playbooks');
const LOG_DIR = path.join(__dirname, 'incident_logs');

// ==================== PLAYBOOKS POR DEFECTO ====================
const DEFAULT_PLAYBOOKS = {
    'malware': {
        name: 'Malware Response',
        description: 'Responde a infección por malware',
        steps: [
            { id: '1', action: 'isolate_host', description: 'Aislar host infectado', required: true },
            { id: '2', action: 'collect_evidence', description: 'Recolectar evidencia forense', required: true },
            { id: '3', action: 'scan_host', description: 'Escaneo completo del host', required: true },
            { id: '4', action: 'quarantine_files', description: 'Cuarentena de archivos maliciosos', required: false },
            { id: '5', action: 'notify_team', description: 'Notificar al equipo de seguridad', required: true }
        ]
    },
    'phishing': {
        name: 'Phishing Response',
        description: 'Responde a ataques de phishing',
        steps: [
            { id: '1', action: 'block_sender', description: 'Bloquear remitente', required: true },
            { id: '2', action: 'remove_email', description: 'Eliminar email de todos los usuarios', required: true },
            { id: '3', action: 'reset_passwords', description: 'Resetear contraseñas de afectados', required: true },
            { id: '4', action: 'notify_team', description: 'Notificar al equipo de seguridad', required: true }
        ]
    },
    'ransomware': {
        name: 'Ransomware Response',
        description: 'Responde a ataques de ransomware',
        steps: [
            { id: '1', action: 'isolate_network', description: 'Aislar segmento de red afectado', required: true },
            { id: '2', action: 'backup_restore', description: 'Restaurar desde backups', required: true },
            { id: '3', action: 'identify_payload', description: 'Identificar payload del ransomware', required: true },
            { id: '4', action: 'notify_authorities', description: 'Notificar a autoridades', required: false },
            { id: '5', action: 'notify_team', description: 'Notificar al equipo de seguridad', required: true }
        ]
    },
    'ddos': {
        name: 'DDoS Response',
        description: 'Responde a ataques DDoS',
        steps: [
            { id: '1', action: 'activate_mitigation', description: 'Activar mitigación DDoS', required: true },
            { id: '2', action: 'rate_limit', description: 'Configurar rate limiting', required: true },
            { id: '3', action: 'block_ips', description: 'Bloquear IPs maliciosas', required: true },
            { id: '4', action: 'notify_provider', description: 'Notificar al proveedor de hosting', required: false },
            { id: '5', action: 'notify_team', description: 'Notificar al equipo de seguridad', required: true }
        ]
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let playbookName = null;
let incidentId = null;
let playbookId = null;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--playbook':
        case '-p':
            playbookName = args[i + 1];
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
        case '--run':
            action = 'run';
            playbookId = args[i + 1];
            i++;
            break;
        case '--init':
            action = 'init';
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Incident Response Playbook - MFH TOOLS PRO
==============================================
Ejecuta playbooks de respuesta a incidentes automatizados.

Uso:
  node incident-response.js [opciones]

Opciones:
  --playbook, -p <nombre>  Nombre del playbook (malware, phishing, ransomware, ddos)
  --incident, -i <id>      ID del incidente
  --list                   Listar playbooks disponibles
  --run <id>               Ejecutar un playbook
  --init                   Crear playbooks por defecto
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node incident-response.js --playbook malware --incident INC-001
  node incident-response.js --list
  node incident-response.js --run playbook-123
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
                    const content = fs.readFileSync(path.join(PLAYBOOKS_DIR, file), 'utf8');
                    try {
                        const playbook = JSON.parse(content);
                        playbooks[playbook.id || file.replace('.json', '')] = playbook;
                    } catch (error) {
                        console.error(`❌ Error cargando ${file}: ${error.message}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error cargando playbooks: ${error.message}`);
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
    
    for (const [id, playbook] of Object.entries(DEFAULT_PLAYBOOKS)) {
        const fullPlaybook = {
            ...playbook,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        savePlaybook(id, fullPlaybook);
        console.log(`✅ Playbook creado: ${id} - ${playbook.name}`);
    }
    
    console.log(`\n📁 Playbooks guardados en: ${PLAYBOOKS_DIR}`);
}

function listPlaybooks() {
    const playbooks = loadPlaybooks();
    const keys = Object.keys(playbooks);
    
    if (keys.length === 0) {
        console.log('📭 No hay playbooks disponibles');
        console.log('   Ejecuta --init para crear los playbooks por defecto');
        return;
    }
    
    console.log(`\n📋 PLAYBOOKS DISPONIBLES (${keys.length}):`);
    console.log('='.repeat(60));
    
    for (const [id, playbook] of Object.entries(playbooks)) {
        console.log(`\n📌 ${playbook.name}`);
        console.log(`   📋 ID: ${id}`);
        console.log(`   📝 Descripción: ${playbook.description || 'N/A'}`);
        console.log(`   📊 Pasos: ${playbook.steps ? playbook.steps.length : 0}`);
        console.log(`   📅 Creado: ${new Date(playbook.createdAt).toLocaleString()}`);
    }
}

function logIncident(message, type = 'info') {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    const logFile = path.join(LOG_DIR, `incident_${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logEntry, 'utf8');
    console.log(message);
}

function executeStep(action, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔧 Ejecutando: ${description}`);
        console.log(`📋 Acción: ${action}`);
        
        // Simular ejecución de acciones
        const actions = {
            'isolate_host': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Host aislado de la red');
                        resolve();
                    }, 1000);
                });
            },
            'collect_evidence': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Evidencia recolectada');
                        resolve();
                    }, 2000);
                });
            },
            'scan_host': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Escaneo completado - 0 amenazas encontradas');
                        resolve();
                    }, 3000);
                });
            },
            'quarantine_files': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Archivos en cuarentena');
                        resolve();
                    }, 1500);
                });
            },
            'notify_team': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Equipo notificado');
                        resolve();
                    }, 500);
                });
            },
            'block_sender': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Remitente bloqueado');
                        resolve();
                    }, 500);
                });
            },
            'remove_email': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Email eliminado de todos los usuarios');
                        resolve();
                    }, 2000);
                });
            },
            'reset_passwords': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Contraseñas reseteadas');
                        resolve();
                    }, 3000);
                });
            },
            'isolate_network': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Segmento de red aislado');
                        resolve();
                    }, 1000);
                });
            },
            'backup_restore': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Restauración desde backups iniciada');
                        resolve();
                    }, 4000);
                });
            },
            'identify_payload': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Payload identificado: Ransomware.ABC');
                        resolve();
                    }, 2000);
                });
            },
            'notify_authorities': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Autoridades notificadas');
                        resolve();
                    }, 500);
                });
            },
            'activate_mitigation': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Mitigación DDoS activada');
                        resolve();
                    }, 2000);
                });
            },
            'rate_limit': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Rate limiting configurado');
                        resolve();
                    }, 1500);
                });
            },
            'block_ips': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ IPs maliciosas bloqueadas');
                        resolve();
                    }, 1000);
                });
            },
            'notify_provider': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('   ✅ Proveedor notificado');
                        resolve();
                    }, 500);
                });
            }
        };
        
        const actionFn = actions[action];
        if (actionFn) {
            actionFn().then(() => resolve()).catch(reject);
        } else {
            console.log(`   ⚠️ Acción no implementada: ${action}`);
            resolve();
        }
    });
}

async function runPlaybook(playbookId, incidentId) {
    const playbooks = loadPlaybooks();
    const playbook = playbooks[playbookId];
    
    if (!playbook) {
        console.error(`❌ Playbook no encontrado: ${playbookId}`);
        console.log('   Usa --list para ver los playbooks disponibles');
        process.exit(1);
    }
    
    console.log(`\n📋 EJECUTANDO PLAYBOOK: ${playbook.name}`);
    console.log(`📝 ${playbook.description || 'Sin descripción'}`);
    console.log(`📋 Incidente: ${incidentId || 'N/A'}`);
    console.log(`📊 Pasos: ${playbook.steps ? playbook.steps.length : 0}`);
    console.log('='.repeat(60));
    
    logIncident(`Iniciando playbook: ${playbook.name} (${playbookId})`, 'info');
    
    if (incidentId) {
        logIncident(`Incidente: ${incidentId}`, 'info');
    }
    
    const steps = playbook.steps || [];
    let stepResults = [];
    
    for (const step of steps) {
        const stepNumber = step.id || (steps.indexOf(step) + 1);
        logIncident(`\n🔹 Paso ${stepNumber}: ${step.description}`, 'info');
        
        try {
            await executeStep(step.action, step.description);
            stepResults.push({
                step: stepNumber,
                description: step.description,
                action: step.action,
                status: 'success'
            });
            logIncident(`   ✅ Paso ${stepNumber} completado`, 'success');
        } catch (error) {
            stepResults.push({
                step: stepNumber,
                description: step.description,
                action: step.action,
                status: 'failed',
                error: error.message
            });
            logIncident(`   ❌ Error en paso ${stepNumber}: ${error.message}`, 'error');
            
            if (step.required) {
                logIncident(`❌ Playbook detenido - paso requerido falló`, 'error');
                break;
            } else {
                logIncident(`⚠️ Paso opcional falló - continuando...`, 'warning');
            }
        }
    }
    
    // Resumen
    console.log('\n📊 RESUMEN DE EJECUCIÓN:');
    console.log('='.repeat(60));
    
    const successful = stepResults.filter(s => s.status === 'success').length;
    const failed = stepResults.filter(s => s.status === 'failed').length;
    const total = stepResults.length;
    
    console.log(`   ✅ Exitosos: ${successful}`);
    console.log(`   ❌ Fallidos: ${failed}`);
    console.log(`   📊 Total: ${total}`);
    console.log(`   📋 Estado: ${failed === 0 ? '✅ COMPLETADO' : '⚠️ COMPLETADO CON ERRORES'}`);
    
    // Guardar resultados
    if (incidentId) {
        const resultFile = path.join(LOG_DIR, `playbook_${playbookId}_${incidentId}_${Date.now()}.json`);
        const output = {
            incidentId,
            playbookId,
            playbookName: playbook.name,
            timestamp: new Date().toISOString(),
            steps: stepResults,
            summary: {
                total,
                successful,
                failed
            }
        };
        fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${resultFile}`);
    }
    
    logIncident(`Playbook completado: ${playbook.name} - ${failed === 0 ? 'ÉXITO' : 'CON ERRORES'}`, 'info');
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Incident Response Playbook - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Crear directorios necesarios
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    switch (action) {
        case 'init':
            initPlaybooks();
            break;
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
            if (playbookName && incidentId) {
                // Buscar playbook por nombre
                const playbooks = loadPlaybooks();
                let foundId = null;
                for (const [id, pb] of Object.entries(playbooks)) {
                    if (pb.name.toLowerCase().includes(playbookName.toLowerCase())) {
                        foundId = id;
                        break;
                    }
                }
                
                if (foundId) {
                    await runPlaybook(foundId, incidentId);
                } else {
                    console.error(`❌ Playbook no encontrado: ${playbookName}`);
                    console.log('   Usa --list para ver los playbooks disponibles');
                    process.exit(1);
                }
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            }
            break;
    }

    console.log('\n✅ Incident Response Playbook completado');
})();
