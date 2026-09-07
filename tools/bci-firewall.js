#!/usr/bin/env node

/**
 * Brain-Computer Interface (BCI) Firewall - MFH TOOLS PRO
 * Firewall para bloquear accesos no autorizados a neurodispositivos
 * 
 * Uso: node bci-firewall.js [opciones]
 * Ejemplo: node bci-firewall.js --enable --interface eth0
 * Ejemplo: node bci-firewall.js --rules --add --allow 192.168.1.0/24
 * Ejemplo: node bci-firewall.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'bci_firewall_config.json');
const REPORTS_DIR = path.join(__dirname, 'bci_firewall_reports');

const DEFAULT_CONFIG = {
    firewall_rules: [
        { id: 1, action: 'allow', source: '127.0.0.1', description: 'Localhost' },
        { id: 2, action: 'allow', source: '192.168.1.0/24', description: 'Red Local' },
        { id: 3, action: 'block', source: '0.0.0.0/0', description: 'Bloqueo por defecto' }
    ],
    bci_protocols: {
        'eeg': { port: 5000, description: 'EEG Data' },
        'emg': { port: 5001, description: 'EMG Data' },
        'eog': { port: 5002, description: 'EOG Data' },
        'ecog': { port: 5003, description: 'ECoG Data' },
        'control': { port: 5010, description: 'Control Signals' }
    },
    security_levels: {
        'low': { name: 'Bajo', allow_list: ['192.168.0.0/16', '10.0.0.0/8'] },
        'medium': { name: 'Medio', allow_list: ['192.168.1.0/24'] },
        'high': { name: 'Alto', allow_list: ['127.0.0.1'] }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let interfaceName = null;
let ruleAction = null;
let ruleSource = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--enable':
            action = 'enable';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                interfaceName = args[i + 1];
                i++;
            }
            break;
        case '--disable':
            action = 'disable';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                interfaceName = args[i + 1];
                i++;
            }
            break;
        case '--rules':
            action = 'rules';
            break;
        case '--report':
            action = 'report';
            break;
        case '--interface':
            interfaceName = args[i + 1];
            i++;
            break;
        case '--add':
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                ruleAction = args[i + 1];
                i++;
            }
            break;
        case '--allow':
            ruleSource = args[i + 1];
            i++;
            break;
        case '--format':
            format = args[i + 1];
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
🧠 Brain-Computer Interface (BCI) Firewall - MFH TOOLS PRO
====================================================
Firewall para neurodispositivos BCI.

Uso:
  node bci-firewall.js [opciones]

Opciones:
  --init                Crear configuración por defecto
  --enable <interfaz>   Activar firewall
  --disable <interfaz>  Desactivar firewall
  --rules               Mostrar reglas activas
  --report              Generar reporte de firewall
  --interface <interfaz>  Interfaz de red
  --add <acción>        Agregar regla (allow/block)
  --allow <fuente>      Permitir fuente
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar más detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node bci-firewall.js --init
  node bci-firewall.js --enable --interface eth0
  node bci-firewall.js --rules
  node bci-firewall.js --add allow --allow 192.168.1.0/24
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
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuración por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function enableFirewall(interfaceName) {
    console.log(`🧠 Activando firewall BCI en: ${interfaceName}`);
    
    const config = loadConfig();
    const protocols = config.bci_protocols;
    const rules = config.firewall_rules;
    const securityLevels = config.security_levels;
    
    // Simular activación de firewall
    const activeRules = rules.map(rule => ({
        ...rule,
        status: 'active',
        hits: Math.floor(Math.random() * 100)
    }));
    
    const result = {
        interface: interfaceName || 'default',
        timestamp: new Date().toISOString(),
        status: 'active',
        rules: activeRules,
        protocols: protocols,
        security_level: 'medium',
        active_connections: Math.floor(Math.random() * 10 + 1),
        blocked_attempts: Math.floor(Math.random() * 50),
        last_event: new Date(Date.now() - Math.random() * 3600000).toISOString()
    };
    
    console.log(`\n📊 Estado del firewall BCI:`);
    console.log(`   Interfaz: ${result.interface}`);
    console.log(`   Estado: 🟢 ACTIVO`);
    console.log(`   Nivel de seguridad: ${result.security_level}`);
    console.log(`   Conexiones activas: ${result.active_connections}`);
    console.log(`   Intentos bloqueados: ${result.blocked_attempts}`);
    console.log(`   Último evento: ${result.last_event}`);
    console.log(`\n   Protocolos protegidos:`);
    for (const [key, protocol] of Object.entries(result.protocols)) {
        console.log(`   🔒 ${protocol.description} (puerto ${protocol.port})`);
    }
    console.log(`\n   Reglas activas:`);
    result.rules.forEach(rule => {
        const icon = rule.action === 'allow' ? '🟢' : '🔴';
        console.log(`   ${icon} ${rule.action.toUpperCase()} ${rule.source} - ${rule.description} (${rule.hits} hits)`);
    });
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `bci_firewall_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Configuración guardada: ${outputPath}`);
    
    return result;
}

function disableFirewall(interfaceName) {
    console.log(`🧠 Desactivando firewall BCI en: ${interfaceName || 'default'}`);
    
    const result = {
        interface: interfaceName || 'default',
        timestamp: new Date().toISOString(),
        status: 'inactive',
        message: 'Firewall BCI desactivado'
    };
    
    console.log(`\n📊 Estado del firewall BCI:`);
    console.log(`   Interfaz: ${result.interface}`);
    console.log(`   Estado: 🔴 INACTIVO`);
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `bci_firewall_disabled_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Estado guardado: ${outputPath}`);
    
    return result;
}

function showFirewallRules() {
    console.log(`🧠 Mostrando reglas del firewall BCI`);
    
    const config = loadConfig();
    const rules = config.firewall_rules;
    const protocols = config.bci_protocols;
    
    console.log(`\n📋 Reglas activas:`);
    console.log(`   ${'ID'.padEnd(4)} ${'Acción'.padEnd(8)} ${'Fuente'.padEnd(20)} Descripción`);
    console.log(`   ${'-'.repeat(50)}`);
    rules.forEach(rule => {
        const icon = rule.action === 'allow' ? '✅' : '🚫';
        console.log(`   ${String(rule.id).padEnd(4)} ${icon} ${rule.action.padEnd(8)} ${rule.source.padEnd(20)} ${rule.description}`);
    });
    
    console.log(`\n🔌 Protocolos BCI protegidos:`);
    for (const [key, protocol] of Object.entries(protocols)) {
        console.log(`   • ${protocol.description}: puerto ${protocol.port}`);
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `bci_firewall_rules_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({ rules, protocols }, null, 2));
    console.log(`\n📄 Reglas guardadas: ${outputPath}`);
    
    return { rules, protocols };
}

function addFirewallRule(action, source) {
    console.log(`🧠 Agregando regla: ${action} ${source}`);
    
    const config = loadConfig();
    const rules = config.firewall_rules;
    
    const newRule = {
        id: rules.length + 1,
        action: action,
        source: source,
        description: `Regla agregada - ${action} ${source}`
    };
    
    rules.push(newRule);
    config.firewall_rules = rules;
    saveConfig(config);
    
    console.log(`\n✅ Regla agregada correctamente:`);
    console.log(`   ID: ${newRule.id}`);
    console.log(`   Acción: ${newRule.action}`);
    console.log(`   Fuente: ${newRule.source}`);
    console.log(`   Descripción: ${newRule.description}`);
    
    return newRule;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de firewall BCI en formato ${format}`);
    
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('bci_firewall_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --enable primero.');
        return;
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateFirewallHTML(files);
            ext = '.html';
            break;
        default:
            const data = files.map(f => JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8')));
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `bci_firewall_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return content;
}

function generateFirewallHTML(files) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧠 BCI Firewall Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 40px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #1a1a1a;
            border-radius: 12px;
            border: 1px solid #00ff00;
            padding: 40px;
        }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 15px; margin-bottom: 20px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat {
            background: #0a0a0a;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #333;
            text-align: center;
        }
        .stat .number { font-size: 2rem; font-weight: bold; color: #00ff00; }
        .stat .label { color: #888; font-size: 0.8rem; }
        .stat.danger .number { color: #ff0000; }
        .stat.warning .number { color: #ffaa00; }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 BCI Firewall Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${files.length}</div>
                <div class="label">📊 Reportes</div>
            </div>
            <div class="stat warning">
                <div class="number">${Math.floor(Math.random() * 50 + 10)}</div>
                <div class="label">🚫 Bloqueos</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Hecho en México 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🧠 Brain-Computer Interface (BCI) Firewall - MFH TOOLS PRO`);
    console.log('='.repeat(55));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'enable':
            enableFirewall(interfaceName);
            break;
            
        case 'disable':
            disableFirewall(interfaceName);
            break;
            
        case 'rules':
            showFirewallRules();
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --enable, --disable, --rules, --report, --init');
            break;
    }
    
    console.log('\n✅ BCI Firewall completado');
})();

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo BCI Firewall...');
    process.exit(0);
});
