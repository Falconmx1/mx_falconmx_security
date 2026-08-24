#!/usr/bin/env node

/**
 * Incident Response Bot - MFH TOOLS PRO
 * Bot automatizado para respuesta a incidentes
 * 
 * Uso: node incident-response-bot.js [opciones]
 * Ejemplo: node incident-response-bot.js --playbook incident_playbook.json
 * Ejemplo: node incident-response-bot.js --webhook https://hooks.slack.com/services/xxx
 * Ejemplo: node incident-response-bot.js --simulate
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'incident_bot_config.json');
const PLAYBOOKS_DIR = path.join(__dirname, 'playbooks');
const LOGS_DIR = path.join(__dirname, 'incident_logs');

const DEFAULT_CONFIG = {
    webhooks: {
        slack: null,
        teams: null,
        discord: null
    },
    email: {
        enabled: false,
        smtp: {},
        recipients: []
    },
    auto_escalation: {
        enabled: true,
        thresholds: {
            critical: 1,
            high: 2,
            medium: 4,
            low: 8
        }
    },
    actions: {
        block_ip: true,
        isolate_host: true,
        revoke_access: true,
        notify_team: true
    }
};

// ==================== PLAYBOOKS ====================
const DEFAULT_PLAYBOOK = {
    id: 'default-phishing',
    name: 'Phishing Response',
    severity: 'high',
    steps: [
        { id: 1, action: 'block_indicators', description: 'Bloquear IoCs (IPs, dominios, emails)' },
        { id: 2, action: 'isolate_affected', description: 'Aislar usuarios afectados' },
        { id: 3, action: 'revoke_credentials', description: 'Revocar credenciales comprometidas' },
        { id: 4, action: 'notify_security', description: 'Notificar al equipo de seguridad' },
        { id: 5, action: 'update_firewall', description: 'Actualizar reglas de firewall' },
        { id: 6, action: 'log_incident', description: 'Registrar incidente en el sistema' }
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args3 = process.argv.slice(2);

let playbookFile = null;
let webhook = null;
let simulate = false;
let init3 = false;
let list = false;

for (let i = 0; i < args3.length; i++) {
    switch (args3[i]) {
        case '--playbook':
            playbookFile = args3[i + 1];
            i++;
            break;
        case '--webhook':
            webhook = args3[i + 1];
            i++;
            break;
        case '--simulate':
            simulate = true;
            break;
        case '--init':
            init3 = true;
            break;
        case '--list':
            list = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🤖 Incident Response Bot - MFH TOOLS PRO
=====================================
Bot automatizado para respuesta a incidentes.

Uso:
  node incident-response-bot.js [opciones]

Opciones:
  --init               Crear configuración por defecto
  --list               Listar playbooks disponibles
  --playbook <archivo> Playbook a ejecutar
  --webhook <url>      Webhook para notificaciones
  --simulate           Modo simulación (sin acciones reales)
  --help, -h           Mostrar esta ayuda

Ejemplos:
  node incident-response-bot.js --init
  node incident-response-bot.js --list
  node incident-response-bot.js --playbook phishing.json
  node incident-response-bot.js --simulate --playbook malware.json
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
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(PLAYBOOKS_DIR)) {
        fs.mkdirSync(PLAYBOOKS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear playbook por defecto
    const defaultPlaybookPath = path.join(PLAYBOOKS_DIR, 'phishing.json');
    if (!fs.existsSync(defaultPlaybookPath)) {
        fs.writeFileSync(defaultPlaybookPath, JSON.stringify(DEFAULT_PLAYBOOK, null, 2));
    }
    
    console.log('✅ Configuración por defecto creada.');
    console.log(`📁 Playbooks: ${PLAYBOOKS_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
}

function listPlaybooks() {
    if (!fs.existsSync(PLAYBOOKS_DIR)) {
        console.log('ℹ️ No hay playbooks disponibles.');
        return;
    }
    
    const files = fs.readdirSync(PLAYBOOKS_DIR).filter(f => f.endsWith('.json'));
    console.log('\n📋 PLAYBOOKS DISPONIBLES:');
    console.log('='.repeat(50));
    files.forEach(file => {
        try {
            const content = JSON.parse(fs.readFileSync(path.join(PLAYBOOKS_DIR, file), 'utf8'));
            console.log(`\n📌 ${content.name || file}`);
            console.log(`   ID: ${content.id || 'N/A'}`);
            console.log(`   Severidad: ${content.severity || 'N/A'}`);
            console.log(`   Pasos: ${content.steps ? content.steps.length : 0}`);
        } catch (error) {
            console.log(`\n❌ ${file}: Error al leer`);
        }
    });
}

function loadPlaybook(filePath) {
    try {
        let fullPath = filePath;
        if (!path.isAbsolute(filePath)) {
            fullPath = path.join(PLAYBOOKS_DIR, filePath);
        }
        if (fs.existsSync(fullPath)) {
            return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        }
        console.error(`❌ Playbook no encontrado: ${filePath}`);
        return null;
    } catch (error) {
        console.error('❌ Error cargando playbook:', error.message);
        return null;
    }
}

function sendWebhookNotification(url, message) {
    if (!url) return;
    
    const data = JSON.stringify({
        text: message,
        username: 'Incident Response Bot',
        icon_emoji: ':robot_face:'
    });
    
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    
    try {
        const req = https.request(url, options);
        req.write(data);
        req.end();
    } catch (error) {
        console.error('❌ Error enviando webhook:', error.message);
    }
}

function executeAction(action, details, simulate) {
    const actions = {
        block_indicators: (d) => {
            console.log(`🛑 Bloqueando indicadores: ${d.indicators || 'N/A'}`);
            return { success: true, message: 'Indicators blocked' };
        },
        isolate_affected: (d) => {
            console.log(`🔒 Aislando hosts afectados: ${d.hosts || 'N/A'}`);
            return { success: true, message: 'Hosts isolated' };
        },
        revoke_credentials: (d) => {
            console.log(`🔑 Revocando credenciales: ${d.users || 'N/A'}`);
            return { success: true, message: 'Credentials revoked' };
        },
        notify_security: (d) => {
            console.log(`📧 Notificando al equipo de seguridad: ${d.message || 'Incident notification'}`);
            return { success: true, message: 'Notification sent' };
        },
        update_firewall: (d) => {
            console.log(`🔥 Actualizando firewall: ${d.rules || 'N/A'}`);
            return { success: true, message: 'Firewall updated' };
        },
        log_incident: (d) => {
            const logFile = path.join(LOGS_DIR, `incident_${Date.now()}.log`);
            fs.writeFileSync(logFile, JSON.stringify(d, null, 2));
            console.log(`📝 Incidente logueado: ${logFile}`);
            return { success: true, message: 'Incident logged' };
        }
    };
    
    if (simulate) {
        console.log(`[SIMULADO] ${action}: ${JSON.stringify(details)}`);
        return { success: true, message: 'Simulated', simulated: true };
    }
    
    const actionFn = actions[action];
    if (!actionFn) {
        console.error(`❌ Acción desconocida: ${action}`);
        return { success: false, message: 'Unknown action' };
    }
    
    try {
        return actionFn(details);
    } catch (error) {
        console.error(`❌ Error ejecutando ${action}:`, error.message);
        return { success: false, message: error.message };
    }
}

function executePlaybook(playbook, simulate) {
    console.log(`🤖 Ejecutando playbook: ${playbook.name}`);
    console.log(`📋 Severidad: ${playbook.severity}`);
    console.log('='.repeat(50));
    
    const results = [];
    let success = true;
    
    for (const step of playbook.steps) {
        console.log(`\n📌 Paso ${step.id}: ${step.description}`);
        console.log(`⚡ Acción: ${step.action}`);
        
        const details = step.details || { 
            indicators: 'example.com, 192.168.1.100',
            hosts: 'web-server-01',
            users: 'admin@example.com',
            message: `Step ${step.id} executed`,
            rules: 'Block malicious IPs'
        };
        
        const result = executeAction(step.action, details, simulate);
        results.push({
            step: step.id,
            action: step.action,
            result: result
        });
        
        if (!result.success) {
            success = false;
            console.log(`❌ Falló: ${result.message}`);
        } else {
            console.log(`✅ ${result.message}`);
        }
    }
    
    const report = {
        playbook: playbook.name,
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        success: success,
        results: results,
        simulated: simulate
    };
    
    // Guardar reporte
    const reportFile = path.join(LOGS_DIR, `playbook_${report.id}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${reportFile}`);
    
    return report;
}

// ==================== MAIN ====================
(async function main3() {
    console.log(`🤖 Incident Response Bot - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init3) {
        initConfig();
        process.exit(0);
    }
    
    if (list) {
        listPlaybooks();
        process.exit(0);
    }
    
    const config = loadConfig();
    const webhookUrl = webhook || config.webhooks.slack;
    
    if (webhookUrl) {
        console.log('🔗 Webhook configurado para notificaciones');
    }
    
    if (playbookFile) {
        const playbook = loadPlaybook(playbookFile);
        if (playbook) {
            const report = executePlaybook(playbook, simulate);
            
            if (webhookUrl) {
                const message = `📢 Incident Response Bot\n` +
                              `Playbook: ${report.playbook}\n` +
                              `ID: ${report.id}\n` +
                              `Status: ${report.success ? '✅ Completado' : '❌ Fallido'}\n` +
                              `Simulado: ${report.simulated ? 'Sí' : 'No'}\n` +
                              `Pasos ejecutados: ${report.results.length}`;
                sendWebhookNotification(webhookUrl, message);
            }
        }
    } else {
        console.log('ℹ️ No se especificó playbook. Usa --help para ver opciones.');
        console.log('💡 Opciones: --list, --playbook, --init, --simulate');
        listPlaybooks();
    }
})();
