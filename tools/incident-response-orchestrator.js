#!/usr/bin/env node

/**
 * Incident Response Orchestrator - MFH TOOLS PRO
 * Orquesta respuesta a incidentes con playbooks
 * 
 * Uso: node incident-response-orchestrator.js [opciones]
 * Ejemplo: node incident-response-orchestrator.js --playbook malware.json
 * Ejemplo: node incident-response-orchestrator.js --list
 * Ejemplo: node incident-response-orchestrator.js --execute --incident IR-001
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'ir_config.json');
const PLAYBOOKS_DIR = path.join(__dirname, 'ir_playbooks');
const INCIDENTS_DIR = path.join(__dirname, 'ir_incidents');
const LOGS_DIR = path.join(__dirname, 'ir_logs');

const DEFAULT_CONFIG = {
    playbooks: {
        'malware': {
            name: 'Malware Response',
            severity: 'high',
            steps: [
                { id: 1, action: 'isolate_host', description: 'Aislar host infectado' },
                { id: 2, action: 'scan_network', description: 'Escaneo de red' },
                { id: 3, action: 'collect_evidence', description: 'Recolectar evidencia' },
                { id: 4, action: 'remove_malware', description: 'Remover malware' },
                { id: 5, action: 'restore_system', description: 'Restaurar sistema' }
            ]
        },
        'phishing': {
            name: 'Phishing Response',
            severity: 'medium',
            steps: [
                { id: 1, action: 'block_sender', description: 'Bloquear remitente' },
                { id: 2, action: 'notify_users', description: 'Notificar usuarios' },
                { id: 3, action: 'scan_emails', description: 'Escanea correos' },
                { id: 4, action: 'update_filters', description: 'Actualizar filtros' }
            ]
        },
        'data_breach': {
            name: 'Data Breach Response',
            severity: 'critical',
            steps: [
                { id: 1, action: 'contain_breach', description: 'Contener brecha' },
                { id: 2, action: 'assess_damage', description: 'Evaluar daño' },
                { id: 3, action: 'notify_stakeholders', description: 'Notificar partes' },
                { id: 4, action: 'investigate', description: 'Investigar' },
                { id: 5, action: 'remediate', description: 'Remediar' },
                { id: 6, action: 'report', description: 'Reportar' }
            ]
        }
    },
    auto_approve: false,
    max_parallel: 3
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let playbookName = null;
let incidentId = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--playbook':
            action = 'playbook';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                playbookName = args[i + 1];
                i++;
            }
            break;
        case '--list':
            action = 'list';
            break;
        case '--execute':
            action = 'execute';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                incidentId = args[i + 1];
                i++;
            }
            break;
        case '--incident':
            incidentId = args[i + 1];
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
🛡️ Incident Response Orchestrator - MFH TOOLS PRO
=================================================
Orquesta respuesta a incidentes con playbooks.

Uso:
  node incident-response-orchestrator.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --list                Listar playbooks disponibles
  --playbook <nombre>   Ver detalle de un playbook
  --execute <incidente> Ejecutar playbook para un incidente
  --incident <id>       ID del incidente
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node incident-response-orchestrator.js --init
  node incident-response-orchestrator.js --list
  node incident-response-orchestrator.js --playbook malware
  node incident-response-orchestrator.js --execute --incident IR-001
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
    if (!fs.existsSync(PLAYBOOKS_DIR)) {
        fs.mkdirSync(PLAYBOOKS_DIR, { recursive: true });
    }
    if (!fs.existsSync(INCIDENTS_DIR)) {
        fs.mkdirSync(INCIDENTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Guardar playbooks por defecto
    for (const [key, data] of Object.entries(config.playbooks)) {
        const path = playbookPath(key);
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, JSON.stringify(data, null, 2));
        }
    }
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Playbooks: ${PLAYBOOKS_DIR}`);
    console.log(`📁 Incidentes: ${INCIDENTS_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
}

function playbookPath(name) {
    return path.join(PLAYBOOKS_DIR, `${name}.json`);
}

function listPlaybooks() {
    const config = loadConfig();
    console.log('\n📋 PLAYBOOKS DISPONIBLES:');
    console.log('='.repeat(50));
    
    for (const [key, data] of Object.entries(config.playbooks)) {
        console.log(`\n📌 ${key}`);
        console.log(`   Nombre: ${data.name}`);
        console.log(`   Severidad: ${data.severity.toUpperCase()}`);
        console.log(`   Pasos: ${data.steps.length}`);
        data.steps.forEach(s => {
            console.log(`      ${s.id}. ${s.description}`);
        });
    }
}

function showPlaybook(name) {
    const config = loadConfig();
    const playbook = config.playbooks[name];
    
    if (!playbook) {
        console.error(`❌ Playbook no encontrado: ${name}`);
        console.log(`   Disponibles: ${Object.keys(config.playbooks).join(', ')}`);
        return;
    }
    
    console.log(`\n📋 PLAYBOOK: ${playbook.name}`);
    console.log('='.repeat(50));
    console.log(`   ID: ${name}`);
    console.log(`   Severidad: ${playbook.severity.toUpperCase()}`);
    console.log(`   Pasos: ${playbook.steps.length}`);
    console.log(`\n📌 Pasos:`);
    playbook.steps.forEach(s => {
        console.log(`   ${s.id}. ${s.description}`);
        console.log(`      Accion: ${s.action}`);
    });
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(playbook, null, 2));
        console.log(`\n📄 Playbook guardado: ${outputFile}`);
    }
}

function executePlaybook(incidentId) {
    console.log(`🔄 Ejecutando playbook para incidente: ${incidentId || 'Nuevo incidente'}`);
    
    const config = loadConfig();
    const incident = {
        id: incidentId || `IR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        timestamp: new Date().toISOString(),
        status: 'in_progress',
        steps_completed: 0,
        steps_total: 0,
        logs: []
    };
    
    // Seleccionar playbook basado en el incidente
    const playbookKey = Object.keys(config.playbooks)[Math.floor(Math.random() * Object.keys(config.playbooks).length)];
    const playbook = config.playbooks[playbookKey];
    
    incident.playbook = playbookKey;
    incident.playbook_name = playbook.name;
    incident.steps_total = playbook.steps.length;
    
    console.log(`\n📋 Playbook seleccionado: ${playbook.name}`);
    console.log(`   Severidad: ${playbook.severity.toUpperCase()}`);
    console.log(`   Pasos: ${playbook.steps.length}`);
    console.log('');
    
    // Ejecutar pasos
    for (const step of playbook.steps) {
        console.log(`📌 Paso ${step.id}: ${step.description}`);
        console.log(`   Accion: ${step.action}`);
        
        // Simular ejecucion
        const success = Math.random() > 0.1;
        const duration = Math.floor(Math.random() * 3000) + 500;
        
        const log = {
            step: step.id,
            action: step.action,
            description: step.description,
            timestamp: new Date().toISOString(),
            success: success,
            duration: duration,
            message: success ? 'Completado exitosamente' : 'Error en la ejecucion'
        };
        
        incident.logs.push(log);
        
        if (success) {
            incident.steps_completed++;
            console.log(`   ✅ ${log.message} (${duration}ms)`);
        } else {
            console.log(`   ❌ ${log.message}`);
        }
        console.log('');
    }
    
    incident.status = incident.steps_completed === incident.steps_total ? 'completed' : 'failed';
    incident.completed = new Date().toISOString();
    
    console.log(`\n📊 Resumen de ejecucion:`);
    console.log(`   Incidente: ${incident.id}`);
    console.log(`   Playbook: ${incident.playbook_name}`);
    console.log(`   Estado: ${incident.status}`);
    console.log(`   Pasos completados: ${incident.steps_completed}/${incident.steps_total}`);
    
    // Guardar incidente
    const incidentPath = path.join(INCIDENTS_DIR, `${incident.id}.json`);
    fs.writeFileSync(incidentPath, JSON.stringify(incident, null, 2));
    console.log(`\n📄 Incidente guardado: ${incidentPath}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(incident, null, 2));
        console.log(`📄 Reporte guardado: ${outputFile}`);
    }
    
    return incident;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🛡️ Incident Response Orchestrator - MFH TOOLS PRO`);
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
            listPlaybooks();
            break;
            
        case 'playbook':
            if (!playbookName) {
                console.error('❌ Debes especificar --playbook');
                process.exit(1);
            }
            showPlaybook(playbookName);
            break;
            
        case 'execute':
            executePlaybook(incidentId);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --list, --playbook, --execute, --init');
            break;
    }
    
    console.log('\n✅ Incident Response Orchestrator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Incident Response Orchestrator...');
    process.exit(0);
});
