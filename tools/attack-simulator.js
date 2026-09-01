#!/usr/bin/env node

/**
 * Attack Simulator - MFH TOOLS PRO
 * Simulacion de ataques ciberneticos
 * 
 * Uso: node attack-simulator.js [opciones]
 * Ejemplo: node attack-simulator.js --simulate --type ddos
 * Ejemplo: node attack-simulator.js --scenario --file scenario.json
 * Ejemplo: node attack-simulator.js --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'attack_sim_config.json');
const SCENARIOS_DIR = path.join(__dirname, 'attack_scenarios');
const REPORTS_DIR = path.join(__dirname, 'attack_reports');

const DEFAULT_CONFIG = {
    attack_types: {
        ddos: { name: 'DDoS', severity: 'critical', duration: 300 },
        phishing: { name: 'Phishing', severity: 'high', duration: 180 },
        ransomware: { name: 'Ransomware', severity: 'critical', duration: 600 },
        mitm: { name: 'Man-in-the-Middle', severity: 'high', duration: 240 },
        sql_injection: { name: 'SQL Injection', severity: 'high', duration: 120 },
        xss: { name: 'Cross-Site Scripting', severity: 'medium', duration: 90 },
        brute_force: { name: 'Brute Force', severity: 'medium', duration: 300 }
    },
    simulation: {
        default_type: 'ddos',
        max_concurrent: 3,
        logging: true
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let attackType = null;
let scenarioFile = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--simulate':
            action = 'simulate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                attackType = args[i + 1];
                i++;
            }
            break;
        case '--scenario':
            action = 'scenario';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                scenarioFile = args[i + 1];
                i++;
            }
            break;
        case '--list':
            action = 'list';
            break;
        case '--type':
            attackType = args[i + 1];
            i++;
            break;
        case '--file':
            scenarioFile = args[i + 1];
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
🎯 Attack Simulator - MFH TOOLS PRO
==================================
Simulacion de ataques ciberneticos.

Uso:
  node attack-simulator.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --simulate [tipo]     Simular un ataque
  --scenario <archivo>  Ejecutar escenario personalizado
  --list                Listar tipos de ataques disponibles
  --type <tipo>         Tipo de ataque (ddos, phishing, ransomware)
  --file <archivo>      Archivo de escenario JSON
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node attack-simulator.js --init
  node attack-simulator.js --simulate --type ddos
  node attack-simulator.js --scenario --file scenario.json
  node attack-simulator.js --list
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
    if (!fs.existsSync(SCENARIOS_DIR)) {
        fs.mkdirSync(SCENARIOS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear escenario de ejemplo
    const sampleScenario = {
        name: 'Ataque Combinado',
        description: 'Simulacion de ataque en multiples fases',
        phases: [
            { type: 'phishing', duration: 120, intensity: 'medium' },
            { type: 'brute_force', duration: 180, intensity: 'high' },
            { type: 'ransomware', duration: 300, intensity: 'critical' }
        ]
    };
    const samplePath = path.join(SCENARIOS_DIR, 'sample_scenario.json');
    fs.writeFileSync(samplePath, JSON.stringify(sampleScenario, null, 2));
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Escenarios: ${SCENARIOS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
    console.log(`📄 Escenario de ejemplo: ${samplePath}`);
}

function listAttackTypes() {
    const config = loadConfig();
    console.log('\n📋 TIPOS DE ATAQUE DISPONIBLES:');
    console.log('='.repeat(50));
    
    for (const [key, data] of Object.entries(config.attack_types)) {
        const icon = data.severity === 'critical' ? '🔴' : data.severity === 'high' ? '🟠' : '🟡';
        console.log(`\n${icon} ${data.name} (${key})`);
        console.log(`   Severidad: ${data.severity.toUpperCase()}`);
        console.log(`   Duracion: ${data.duration}s`);
    }
}

function simulateAttack(attackType) {
    console.log(`🎯 Simulando ataque: ${attackType || 'ddos'}`);
    
    const config = loadConfig();
    const type = attackType || config.simulation.default_type;
    const attackData = config.attack_types[type];
    
    if (!attackData) {
        console.error(`❌ Tipo de ataque no encontrado: ${type}`);
        console.log(`   Tipos disponibles: ${Object.keys(config.attack_types).join(', ')}`);
        return;
    }
    
    console.log(`\n📊 Detalles del ataque:`);
    console.log(`   Tipo: ${attackData.name}`);
    console.log(`   Severidad: ${attackData.severity.toUpperCase()}`);
    console.log(`   Duracion: ${attackData.duration}s`);
    
    // Simular ejecucion del ataque
    const phases = [
        { phase: 1, name: 'Reconocimiento', duration: Math.floor(attackData.duration * 0.2) },
        { phase: 2, name: 'Explotacion', duration: Math.floor(attackData.duration * 0.3) },
        { phase: 3, name: 'Impacto', duration: Math.floor(attackData.duration * 0.3) },
        { phase: 4, name: 'Limpieza', duration: Math.floor(attackData.duration * 0.2) }
    ];
    
    console.log(`\n📋 Fases del ataque:`);
    phases.forEach(p => {
        console.log(`   Fase ${p.phase}: ${p.name} (${p.duration}s)`);
    });
    
    // Simular metricas de impacto
    const metrics = {
        targets: Math.floor(Math.random() * 10) + 3,
        success_rate: Math.floor(Math.random() * 30) + 60,
        data_exfiltrated: Math.floor(Math.random() * 1000) + 100,
        estimated_damage: Math.floor(Math.random() * 100000) + 10000,
        detection_time: Math.floor(Math.random() * 60) + 10
    };
    
    console.log(`\n📊 Metricas de impacto:`);
    console.log(`   Targets afectados: ${metrics.targets}`);
    console.log(`   Tasa de exito: ${metrics.success_rate}%`);
    console.log(`   Datos exfiltrados: ${metrics.data_exfiltrated}MB`);
    console.log(`   Daño estimado: $${metrics.estimated_damage.toLocaleString()}`);
    console.log(`   Tiempo de deteccion: ${metrics.detection_time}s`);
    
    // Generar recomendaciones
    const recommendations = generateRecommendations(type);
    console.log(`\n💡 Recomendaciones:`);
    recommendations.forEach(r => {
        console.log(`   • ${r}`);
    });
    
    const report = {
        timestamp: new Date().toISOString(),
        attack_type: type,
        attack_name: attackData.name,
        severity: attackData.severity,
        duration: attackData.duration,
        phases: phases,
        metrics: metrics,
        recommendations: recommendations
    };
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `attack_${type}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function generateRecommendations(attackType) {
    const recommendations = {
        ddos: [
            'Implementar rate limiting y WAF',
            'Configurar CDN para distribucion de trafico',
            'Establecer alertas de trafico anomalo',
            'Tener plan de respuesta a DDoS'
        ],
        phishing: [
            'Capacitar al personal en deteccion de phishing',
            'Implementar filtros de correo avanzados',
            'Usar MFA para todas las cuentas',
            'Establecer politicas de reporte de phishing'
        ],
        ransomware: [
            'Implementar backups offline regulares',
            'Segmentar la red para contener el malware',
            'Usar soluciones EDR avanzadas',
            'Tener plan de recuperacion ante ransomware'
        ],
        mitm: [
            'Implementar TLS/SSL en todas las comunicaciones',
            'Usar VPN para conexiones remotas',
            'Implementar certificados de cliente',
            'Monitorear alertas de certificados'
        ],
        sql_injection: [
            'Usar consultas parametrizadas',
            'Implementar WAF con reglas SQLi',
            'Realizar pruebas de penetracion regularmente',
            'Validar todas las entradas de usuario'
        ],
        xss: [
            'Implementar CSP (Content Security Policy)',
            'Validar y sanitizar todas las entradas',
            'Usar frameworks con proteccion XSS integrada',
            'Escape adecuado de salidas HTML'
        ],
        brute_force: [
            'Implementar bloqueo de IPs despues de intentos fallidos',
            'Usar MFA para autenticacion',
            'Implementar CAPTCHA en formularios de login',
            'Monitorear logs de autenticacion'
        ]
    };
    
    return recommendations[attackType] || ['Realizar analisis de riesgo detallado', 'Implementar controles de seguridad adecuados'];
}

function runScenario(scenarioFile) {
    console.log(`📋 Ejecutando escenario: ${scenarioFile || 'default'}`);
    
    let scenario = null;
    
    if (scenarioFile && fs.existsSync(scenarioFile)) {
        try {
            scenario = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
        } catch (error) {
            console.error('❌ Error leyendo archivo:', error.message);
            return;
        }
    } else {
        // Usar escenario de ejemplo
        const samplePath = path.join(SCENARIOS_DIR, 'sample_scenario.json');
        if (fs.existsSync(samplePath)) {
            scenario = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
        } else {
            console.error('❌ No se encontro el escenario');
            return;
        }
    }
    
    console.log(`\n📋 Escenario: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log(`   Fases: ${scenario.phases.length}`);
    
    const results = [];
    const config = loadConfig();
    
    for (const phase of scenario.phases) {
        const attackData = config.attack_types[phase.type];
        if (!attackData) {
            console.log(`   ⚠️ Tipo de ataque desconocido: ${phase.type}`);
            continue;
        }
        
        const result = {
            phase: phase.type,
            name: attackData.name,
            duration: phase.duration || attackData.duration,
            intensity: phase.intensity || 'medium',
            severity: attackData.severity,
            success: Math.random() > 0.3
        };
        
        results.push(result);
        const icon = result.success ? '✅' : '❌';
        const severityIcon = result.severity === 'critical' ? '🔴' : result.severity === 'high' ? '🟠' : '🟡';
        console.log(`\n   ${severityIcon} ${result.name}`);
        console.log(`      Duracion: ${result.duration}s`);
        console.log(`      Intensidad: ${result.intensity}`);
        console.log(`      ${icon} ${result.success ? 'Exitoso' : 'Fallido'}`);
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        scenario: scenario.name,
        description: scenario.description,
        phases: scenario.phases.length,
        results: results,
        summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        }
    };
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `scenario_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🎯 Attack Simulator - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'simulate':
            simulateAttack(attackType);
            break;
            
        case 'scenario':
            runScenario(scenarioFile);
            break;
            
        case 'list':
            listAttackTypes();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --simulate, --scenario, --list, --init');
            break;
    }
    
    console.log('\n✅ Attack Simulator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Attack Simulator...');
    process.exit(0);
});
