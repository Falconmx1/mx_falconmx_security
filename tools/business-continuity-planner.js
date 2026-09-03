#!/usr/bin/env node

/**
 * Business Continuity Planner - MFH TOOLS PRO
 * Planificación de continuidad de negocio
 * 
 * Uso: node business-continuity-planner.js [opciones]
 * Ejemplo: node business-continuity-planner.js --plan --scenario "ransomware"
 * Ejemplo: node business-continuity-planner.js --drill
 * Ejemplo: node business-continuity-planner.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'bcp_config.json');
const PLANS_DIR = path.join(__dirname, 'bcp_plans');
const REPORTS_DIR = path.join(__dirname, 'bcp_reports');

const DEFAULT_CONFIG = {
    scenarios: ['ransomware', 'data_breach', 'system_failure', 'natural_disaster', 'power_outage', 'cyber_attack'],
    critical_functions: ['sistema_principal', 'base_datos', 'red_interna', 'aplicaciones_criticas', 'comunicaciones'],
    rto_defaults: { critical: 2, important: 8, normal: 24 }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let scenario = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--plan':
            action = 'plan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                scenario = args[i + 1];
                i++;
            }
            break;
        case '--drill':
            action = 'drill';
            break;
        case '--report':
            action = 'report';
            break;
        case '--scenario':
            scenario = args[i + 1];
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
🔄 Business Continuity Planner - MFH TOOLS PRO
===============================================
Planificación de continuidad de negocio.

Uso:
  node business-continuity-planner.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --plan <escenario>        Crear plan para escenario
  --drill                   Simular ejercicio de continuidad
  --report                  Generar reporte de continuidad
  --scenario <nombre>       Escenario (ransomware, data_breach, etc.)
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node business-continuity-planner.js --init
  node business-continuity-planner.js --plan --scenario ransomware
  node business-continuity-planner.js --drill
  node business-continuity-planner.js --report --format html
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
    if (!fs.existsSync(PLANS_DIR)) {
        fs.mkdirSync(PLANS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Planes: ${PLANS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function createPlan(scenario) {
    console.log(`📋 Creando plan de continuidad para: ${scenario}`);
    
    const config = loadConfig();
    const scenarios = config.scenarios;
    
    if (!scenarios.includes(scenario)) {
        console.error(`❌ Escenario "${scenario}" no encontrado. Opciones: ${scenarios.join(', ')}`);
        return;
    }
    
    const functions = config.critical_functions;
    const rtoDefaults = config.rto_defaults;
    
    const plan = {
        scenario: scenario,
        timestamp: new Date().toISOString(),
        business_impact: {
            financial: Math.round(Math.random() * 100 + 50),
            operational: Math.round(Math.random() * 100 + 50),
            reputational: Math.round(Math.random() * 100 + 50)
        },
        critical_functions: [],
        recovery_strategies: [],
        communication_plan: [],
        rto: rtoDefaults,
        steps: []
    };
    
    // Función crítica
    for (const func of functions) {
        const criticality = ['critical', 'important', 'normal'][Math.floor(Math.random() * 3)];
        plan.critical_functions.push({
            name: func,
            criticality: criticality,
            rto_hours: rtoDefaults[criticality] || 8,
            recovery_priority: criticality === 'critical' ? 1 : criticality === 'important' ? 2 : 3
        });
    }
    
    // Estrategias de recuperación
    const strategies = [
        'Activar plan de respuesta a incidentes',
        'Restaurar desde backup reciente',
        'Implementar sistema alternativo',
        'Activar equipo de crisis',
        'Notificar a stakeholders',
        'Activar servidores de respaldo',
        'Restaurar desde copia de seguridad'
    ];
    plan.recovery_strategies = strategies.slice(0, 3 + Math.floor(Math.random() * 3));
    
    // Plan de comunicación
    plan.communication_plan = [
        'Notificar al equipo de respuesta',
        'Informar a la alta dirección',
        'Comunicar a los empleados',
        'Actualizar a los clientes'
    ];
    
    // Pasos del plan
    plan.steps = [
        { order: 1, action: 'Activar equipo de crisis', owner: 'Equipo de respuesta' },
        { order: 2, action: 'Evaluar impacto y alcance', owner: 'Equipo técnico' },
        { order: 3, action: 'Implementar estrategia de recuperación', owner: 'Líder técnico' },
        { order: 4, action: 'Restaurar operaciones críticas', owner: 'Sistemas' },
        { order: 5, action: 'Validar integridad de sistemas', owner: 'QA' },
        { order: 6, action: 'Reanudar operaciones normales', owner: 'Dirección' }
    ];
    
    console.log(`\n📊 Plan creado:`);
    console.log(`   Escenario: ${plan.scenario}`);
    console.log(`   Impacto financiero: ${plan.business_impact.financial}%`);
    console.log(`   Impacto operacional: ${plan.business_impact.operational}%`);
    console.log(`   Impacto reputacional: ${plan.business_impact.reputational}%`);
    
    console.log(`\n📋 Funciones críticas:`);
    for (const f of plan.critical_functions) {
        const icon = f.criticality === 'critical' ? '🔴' : f.criticality === 'important' ? '🟡' : '🟢';
        console.log(`   ${icon} ${f.name} (${f.criticality}) - RTO: ${f.rto_hours}h`);
    }
    
    console.log(`\n🔄 Estrategias de recuperación:`);
    plan.recovery_strategies.forEach(s => console.log(`   • ${s}`));
    
    const outputPath = outputFile || path.join(PLANS_DIR, `bcp_${scenario}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
    console.log(`\n📄 Plan guardado: ${outputPath}`);
    
    return plan;
}

function runDrill() {
    console.log('🎯 Ejecutando drill de continuidad de negocio');
    console.log('='.repeat(45));
    
    const config = loadConfig();
    const scenarios = config.scenarios;
    const selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    const drill = {
        scenario: selectedScenario,
        timestamp: new Date().toISOString(),
        start_time: new Date().toISOString(),
        end_time: null,
        duration_minutes: 0,
        participants: Math.floor(Math.random() * 10) + 5,
        steps_completed: 0,
        total_steps: 6,
        success_rate: 0,
        observations: [],
        recommendations: []
    };
    
    // Simular drill
    const completed = Math.floor(Math.random() * 6) + 1;
    drill.steps_completed = completed;
    drill.success_rate = Math.round((completed / drill.total_steps) * 100);
    drill.end_time = new Date(Date.now() + completed * 5 * 60000).toISOString();
    drill.duration_minutes = completed * 5;
    
    // Observaciones
    const obs = [
        'Tiempo de respuesta adecuado',
        'Comunicación efectiva',
        'Algunos roles no claros',
        'Tiempo de recuperación aceptable',
        'Backup disponibles'
    ];
    drill.observations = obs.slice(0, 2 + Math.floor(Math.random() * 3));
    
    // Recomendaciones
    const recs = [
        'Mejorar tiempos de respuesta',
        'Actualizar documentación',
        'Realizar más drills',
        'Ampliar equipo de crisis',
        'Automatizar procedimientos'
    ];
    drill.recommendations = recs.slice(0, 2 + Math.floor(Math.random() * 3));
    
    console.log(`\n📊 Resultados del drill:`);
    console.log(`   Escenario: ${drill.scenario}`);
    console.log(`   Participantes: ${drill.participants}`);
    console.log(`   Pasos completados: ${drill.steps_completed}/${drill.total_steps}`);
    console.log(`   Tasa de éxito: ${drill.success_rate}%`);
    console.log(`   Duración: ${drill.duration_minutes} min`);
    
    console.log(`\n📋 Observaciones:`);
    drill.observations.forEach(o => console.log(`   • ${o}`));
    
    console.log(`\n💡 Recomendaciones:`);
    drill.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `drill_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(drill, null, 2));
    console.log(`\n📄 Drill guardado: ${outputPath}`);
    
    return drill;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de continuidad de negocio en formato ${format}`);
    
    const planFiles = fs.readdirSync(PLANS_DIR).filter(f => f.startsWith('bcp_'));
    const drillFiles = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('drill_'));
    
    if (planFiles.length === 0 && drillFiles.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --plan o --drill primero.');
        return;
    }
    
    const plans = [];
    for (const file of planFiles) {
        try {
            plans.push(JSON.parse(fs.readFileSync(path.join(PLANS_DIR, file), 'utf8')));
        } catch (e) {}
    }
    
    const drills = [];
    for (const file of drillFiles) {
        try {
            drills.push(JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf8')));
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateBCPHTML(plans, drills);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ plans, drills, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `bcp_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return { plans, drills };
}

function generateBCPHTML(plans, drills) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔄 Business Continuity Report</title>
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
        .stat .number { font-size: 2rem; font-weight: bold; }
        .stat .label { color: #888; font-size: 0.8rem; }
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
        <h1>🔄 Business Continuity Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${plans.length}</div>
                <div class="label">📋 Planes</div>
            </div>
            <div class="stat">
                <div class="number">${drills.length}</div>
                <div class="label">🎯 Drills</div>
            </div>
        </div>
        
        <h2>📋 Planes de Continuidad</h2>
        ${plans.map(p => `<p>• ${p.scenario} (${new Date(p.timestamp).toLocaleDateString()})</p>`).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔄 Business Continuity Planner - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'plan':
            if (!scenario) {
                console.error('❌ Debes especificar --scenario');
                process.exit(1);
            }
            createPlan(scenario);
            break;
            
        case 'drill':
            runDrill();
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --plan, --drill, --report, --init');
            break;
    }
    
    console.log('\n✅ Business Continuity Planner completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Business Continuity Planner...');
    process.exit(0);
});
