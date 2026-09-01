#!/usr/bin/env node

/**
 * Breach Attack Simulation - MFH TOOLS PRO
 * Simulacion de brechas de seguridad
 * 
 * Uso: node breach-attack-simulation.js [opciones]
 * Ejemplo: node breach-attack-simulation.js --simulate --type ransomware
 * Ejemplo: node breach-attack-simulation.js --scenario --file breach.json
 * Ejemplo: node breach-attack-simulation.js --report
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'breach_sim_config.json');
const SCENARIOS_DIR = path.join(__dirname, 'breach_scenarios');
const REPORTS_DIR = path.join(__dirname, 'breach_reports');

const DEFAULT_CONFIG = {
    breach_types: {
        ransomware: {
            name: 'Ransomware Attack',
            severity: 'critical',
            impact_duration: 7200,
            data_loss: 0.6
        },
        data_breach: {
            name: 'Data Breach',
            severity: 'critical',
            impact_duration: 3600,
            data_loss: 0.8
        },
        phishing: {
            name: 'Phishing Campaign',
            severity: 'high',
            impact_duration: 1800,
            data_loss: 0.2
        },
        insider_threat: {
            name: 'Insider Threat',
            severity: 'high',
            impact_duration: 5400,
            data_loss: 0.4
        }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let breachType = null;
let scenarioFile = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--simulate':
            action = 'simulate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                breachType = args[i + 1];
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
        case '--report':
            action = 'report';
            break;
        case '--type':
            breachType = args[i + 1];
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
🚨 Breach Attack Simulation - MFH TOOLS PRO
==========================================
Simulacion de brechas de seguridad.

Uso:
  node breach-attack-simulation.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --simulate [tipo]     Simular una brecha
  --scenario <archivo>  Ejecutar escenario personalizado
  --report              Generar reporte de simulacion
  --type <tipo>         Tipo de brecha (ransomware, data_breach)
  --file <archivo>      Archivo de escenario JSON
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node breach-attack-simulation.js --init
  node breach-attack-simulation.js --simulate --type ransomware
  node breach-attack-simulation.js --scenario --file breach.json
  node breach-attack-simulation.js --report
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
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Escenarios: ${SCENARIOS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function simulateBreach(breachType) {
    console.log(`🚨 Simulando brecha: ${breachType || 'ransomware'}`);
    
    const config = loadConfig();
    const type = breachType || 'ransomware';
    const breachData = config.breach_types[type];
    
    if (!breachData) {
        console.error(`❌ Tipo de brecha no encontrado: ${type}`);
        console.log(`   Disponibles: ${Object.keys(config.breach_types).join(', ')}`);
        return;
    }
    
    console.log(`\n📊 Detalles de la brecha:`);
    console.log(`   Tipo: ${breachData.name}`);
    console.log(`   Severidad: ${breachData.severity.toUpperCase()}`);
    console.log(`   Duracion estimada: ${breachData.impact_duration}s`);
    console.log(`   Perdida de datos: ${(breachData.data_loss * 100)}%`);
    
    // Simular impacto
    const impact = {
        systems_affected: Math.floor(Math.random() * 50) + 10,
        users_affected: Math.floor(Math.random() * 1000) + 100,
        data_compromised_mb: Math.floor(Math.random() * 10000) + 1000,
        downtime_hours: Math.floor(Math.random() * 24) + 4,
        financial_impact: Math.floor(Math.random() * 1000000) + 100000,
        recovery_time_hours: Math.floor(Math.random() * 48) + 8
    };
    
    const response = {
        detection_time: Math.floor(Math.random() * 60) + 10,
        response_time: Math.floor(Math.random() * 120) + 30,
        containment_time: Math.floor(Math.random() * 180) + 60,
        recovery_effectiveness: Math.floor(Math.random() * 30) + 60
    };
    
    console.log(`\n📊 Impacto:`);
    console.log(`   Sistemas afectados: ${impact.systems_affected}`);
    console.log(`   Usuarios afectados: ${impact.users_affected}`);
    console.log(`   Datos comprometidos: ${impact.data_compromised_mb}MB`);
    console.log(`   Tiempo inactividad: ${impact.downtime_hours}h`);
    console.log(`   Impacto financiero: $${impact.financial_impact.toLocaleString()}`);
    
    console.log(`\n📊 Respuesta:`);
    console.log(`   Tiempo de deteccion: ${response.detection_time}s`);
    console.log(`   Tiempo de respuesta: ${response.response_time}s`);
    console.log(`   Tiempo de contencion: ${response.containment_time}s`);
    console.log(`   Efectividad recuperacion: ${response.recovery_effectiveness}%`);
    
    const recommendations = [
        `Implementar backups offline para proteger contra ${breachData.name}`,
        'Mejorar capacidades de deteccion y respuesta',
        'Realizar ejercicios de simulacion de brechas regularmente',
        'Revisar politicas de acceso y privilegios',
        'Implementar soluciones de monitoreo avanzado'
    ];
    
    const report = {
        timestamp: new Date().toISOString(),
        breach_type: type,
        breach_name: breachData.name,
        severity: breachData.severity,
        impact: impact,
        response: response,
        recommendations: recommendations,
        summary: {
            criticality: breachData.severity,
            overall_score: Math.floor(Math.random() * 30) + 40,
            readiness: Math.floor(Math.random() * 30) + 40
        }
    };
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `breach_${type}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function runScenario(scenarioFile) {
    console.log(`📋 Ejecutando escenario de brecha: ${scenarioFile || 'default'}`);
    
    let scenario = null;
    
    if (scenarioFile && fs.existsSync(scenarioFile)) {
        try {
            scenario = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
        } catch (error) {
            console.error('❌ Error leyendo archivo:', error.message);
            return;
        }
    } else {
        // Escenario por defecto
        scenario = {
            name: 'Brecha de Datos Completa',
            description: 'Simulacion de brecha con multiples vectores',
            phases: [
                { type: 'phishing', duration: 300, targets: 50 },
                { type: 'data_breach', duration: 600, targets: 100 },
                { type: 'ransomware', duration: 900, targets: 200 }
            ]
        };
    }
    
    console.log(`\n📋 Escenario: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log(`   Fases: ${scenario.phases.length}`);
    
    const results = [];
    const config = loadConfig();
    
    for (const phase of scenario.phases) {
        const breachData = config.breach_types[phase.type];
        if (!breachData) {
            console.log(`   ⚠️ Tipo de brecha desconocido: ${phase.type}`);
            continue;
        }
        
        const success = Math.random() > 0.3;
        const result = {
            phase: phase.type,
            name: breachData.name,
            duration: phase.duration || breachData.impact_duration,
            targets: phase.targets || 10,
            severity: breachData.severity,
            success: success,
            impact: {
                data_loss: Math.floor(Math.random() * 1000) + 100,
                systems: Math.floor(Math.random() * 20) + 5
            }
        };
        
        results.push(result);
        const icon = result.success ? '✅' : '❌';
        const severityIcon = result.severity === 'critical' ? '🔴' : result.severity === 'high' ? '🟠' : '🟡';
        console.log(`\n   ${severityIcon} ${result.name}`);
        console.log(`      Duracion: ${result.duration}s`);
        console.log(`      Targets: ${result.targets}`);
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
            failed: results.filter(r => !r.success).length,
            critical: results.filter(r => r.severity === 'critical').length,
            high: results.filter(r => r.severity === 'high').length
        }
    };
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `breach_scenario_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function generateReport() {
    console.log('📊 Generando reporte de simulacion de brechas');
    
    const reportFiles = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('breach_'));
    if (reportFiles.length === 0) {
        console.log('ℹ️ No hay simulaciones disponibles. Ejecuta --simulate primero.');
        return;
    }
    
    const latest = reportFiles[reportFiles.length - 1];
    const data = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, latest), 'utf8'));
    
    console.log(`\n📊 Resumen del reporte:`);
    console.log(`   Brecha: ${data.breach_name || data.scenario || 'N/A'}`);
    console.log(`   Severidad: ${(data.severity || 'N/A').toUpperCase()}`);
    console.log(`   Sistemas afectados: ${data.impact?.systems_affected || 'N/A'}`);
    console.log(`   Usuarios afectados: ${data.impact?.users_affected || 'N/A'}`);
    console.log(`   Impacto financiero: $${data.impact?.financial_impact?.toLocaleString() || 'N/A'}`);
    
    if (data.recommendations) {
        console.log(`\n💡 Recomendaciones:`);
        data.recommendations.forEach(r => {
            console.log(`   • ${r}`);
        });
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `breach_report_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🚨 Breach Attack Simulation - MFH TOOLS PRO`);
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
            simulateBreach(breachType);
            break;
            
        case 'scenario':
            runScenario(scenarioFile);
            break;
            
        case 'report':
            generateReport();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --simulate, --scenario, --report, --init');
            break;
    }
    
    console.log('\n✅ Breach Attack Simulation completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Breach Attack Simulation...');
    process.exit(0);
});
