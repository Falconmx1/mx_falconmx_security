#!/usr/bin/env node

/**
 * Alert Manager - MFH TOOLS PRO
 * Sistema centralizado de alertas con reglas y filtros
 * 
 * Uso: node alert-manager.js [opciones]
 * Ejemplo: node alert-manager.js --add --name "Alerta SSH" --rule "port:22 AND status:failed"
 * Ejemplo: node alert-manager.js --list
 * Ejemplo: node alert-manager.js --trigger alert-123
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'alerts_config.json');
const ALERT_LOG = path.join(__dirname, 'alerts.log');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let alertName = null;
let alertRule = null;
let alertSeverity = 'medium';
let alertChannel = 'console';
let alertId = null;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--add':
            action = 'add';
            break;
        case '--list':
            action = 'list';
            break;
        case '--trigger':
            action = 'trigger';
            alertId = args[i + 1];
            i++;
            break;
        case '--remove':
            action = 'remove';
            alertId = args[i + 1];
            i++;
            break;
        case '--name':
        case '-n':
            alertName = args[i + 1];
            i++;
            break;
        case '--rule':
        case '-r':
            alertRule = args[i + 1];
            i++;
            break;
        case '--severity':
        case '-s':
            alertSeverity = args[i + 1];
            i++;
            break;
        case '--channel':
        case '-c':
            alertChannel = args[i + 1];
            i++;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Alert Manager - MFH TOOLS PRO
=================================
Sistema centralizado de alertas con reglas y filtros.

Uso:
  node alert-manager.js [opciones]

Opciones:
  --add                   Agregar una nueva alerta
  --list                  Listar todas las alertas
  --trigger <id>          Disparar una alerta
  --remove <id>           Eliminar una alerta
  --name, -n <nombre>     Nombre de la alerta
  --rule, -r <regla>      Regla de la alerta (ej: "port:22 AND status:failed")
  --severity, -s <nivel>  Severidad (critical, high, medium, low)
  --channel, -c <canal>   Canal (console, email, slack, telegram)
  --help, -h              Mostrar esta ayuda

Ejemplos:
  node alert-manager.js --add --name "Alerta SSH" --rule "port:22 AND status:failed" --severity high
  node alert-manager.js --list
  node alert-manager.js --trigger alert-123
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
    return { alerts: [] };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function logAlert(message, severity = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${severity.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(ALERT_LOG, logEntry, 'utf8');
    console.log(`🔔 ${message}`);
}

function generateAlertId() {
    return 'alert-' + crypto.randomBytes(6).toString('hex');
}

function evaluateRule(rule, data) {
    // Parsear regla simple (ej: "port:22 AND status:failed")
    const conditions = rule.split(/\s+AND\s+|\s+OR\s+/);
    const operator = rule.includes(' AND ') ? 'AND' : rule.includes(' OR ') ? 'OR' : 'AND';
    
    const results = conditions.map(cond => {
        const [key, value] = cond.split(':').map(s => s.trim());
        return data[key] === value;
    });
    
    if (operator === 'AND') {
        return results.every(r => r);
    } else {
        return results.some(r => r);
    }
}

function sendAlert(alert, data) {
    const message = `🚨 ALERTA: ${alert.name}\n📋 Regla: ${alert.rule}\n📊 Severidad: ${alert.severity}\n📅 Fecha: ${new Date().toISOString()}\n📦 Datos: ${JSON.stringify(data, null, 2)}`;
    
    switch (alert.channel) {
        case 'console':
            console.log('\n' + '='.repeat(60));
            console.log(message);
            console.log('='.repeat(60) + '\n');
            break;
        case 'email':
            console.log(`📧 Enviando email: ${message}`);
            // Aquí iría integración con email
            break;
        case 'slack':
            console.log(`💬 Enviando a Slack: ${message}`);
            // Aquí iría integración con Slack
            break;
        case 'telegram':
            console.log(`📱 Enviando a Telegram: ${message}`);
            // Aquí iría integración con Telegram
            break;
        default:
            console.log(message);
            break;
    }
    
    logAlert(`Alerta disparada: ${alert.name} (${alert.severity})`, alert.severity);
}

function addAlert() {
    if (!alertName || !alertRule) {
        console.error('❌ Debes especificar --name y --rule');
        process.exit(1);
    }
    
    const config = loadConfig();
    const newAlert = {
        id: generateAlertId(),
        name: alertName,
        rule: alertRule,
        severity: alertSeverity,
        channel: alertChannel,
        createdAt: new Date().toISOString(),
        triggered: 0,
        enabled: true
    };
    
    config.alerts.push(newAlert);
    saveConfig(config);
    
    console.log(`✅ Alerta agregada: ${newAlert.name}`);
    console.log(`📋 ID: ${newAlert.id}`);
    console.log(`📋 Regla: ${newAlert.rule}`);
    console.log(`📊 Severidad: ${newAlert.severity}`);
    console.log(`📡 Canal: ${newAlert.channel}`);
}

function listAlerts() {
    const config = loadConfig();
    if (config.alerts.length === 0) {
        console.log('📭 No hay alertas configuradas');
        return;
    }
    
    console.log(`\n📋 ALERTAS CONFIGURADAS (${config.alerts.length}):`);
    console.log('='.repeat(60));
    
    for (const alert of config.alerts) {
        const statusIcon = alert.enabled ? '🟢' : '🔴';
        const severityIcons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };
        
        console.log(`\n${statusIcon} ${severityIcons[alert.severity] || '⚪'} ${alert.name}`);
        console.log(`   📋 ID: ${alert.id}`);
        console.log(`   📋 Regla: ${alert.rule}`);
        console.log(`   📊 Severidad: ${alert.severity}`);
        console.log(`   📡 Canal: ${alert.channel}`);
        console.log(`   📅 Creado: ${new Date(alert.createdAt).toLocaleString()}`);
        console.log(`   📊 Disparada: ${alert.triggered} veces`);
    }
}

function triggerAlert(id) {
    const config = loadConfig();
    const alert = config.alerts.find(a => a.id === id);
    
    if (!alert) {
        console.error(`❌ No se encontró la alerta: ${id}`);
        process.exit(1);
    }
    
    if (!alert.enabled) {
        console.error(`❌ La alerta está deshabilitada: ${id}`);
        process.exit(1);
    }
    
    // Simular datos para la regla
    const mockData = {
        port: '22',
        status: 'failed',
        source: '192.168.1.100',
        destination: '10.0.0.1',
        protocol: 'tcp',
        event: 'scan'
    };
    
    if (evaluateRule(alert.rule, mockData)) {
        alert.triggered++;
        saveConfig(config);
        sendAlert(alert, mockData);
    } else {
        console.log(`ℹ️ La regla no coincidió con los datos de prueba`);
    }
}

function removeAlert(id) {
    const config = loadConfig();
    const initialLength = config.alerts.length;
    config.alerts = config.alerts.filter(a => a.id !== id);
    
    if (config.alerts.length === initialLength) {
        console.error(`❌ No se encontró la alerta: ${id}`);
        process.exit(1);
    }
    
    saveConfig(config);
    console.log(`✅ Alerta eliminada: ${id}`);
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Alert Manager - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    switch (action) {
        case 'add':
            addAlert();
            break;
        case 'list':
            listAlerts();
            break;
        case 'trigger':
            if (!alertId) {
                console.error('❌ Debes especificar un ID de alerta');
                process.exit(1);
            }
            triggerAlert(alertId);
            break;
        case 'remove':
            if (!alertId) {
                console.error('❌ Debes especificar un ID de alerta');
                process.exit(1);
            }
            removeAlert(alertId);
            break;
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            break;
    }

    console.log('\n✅ Alert Manager completado');
})();
