#!/usr/bin/env node

/**
 * Carbon Footprint Analyzer - MFH TOOLS PRO
 * Analiza la huella de carbono de infraestructura de seguridad
 * 
 * Uso: node carbon-footprint-analyzer.js [opciones]
 * Ejemplo: node carbon-footprint-analyzer.js --analyze --infra "Infraestructura"
 * Ejemplo: node carbon-footprint-analyzer.js --scope --type cloud
 * Ejemplo: node carbon-footprint-analyzer.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'carbon_config.json');
const CARBON_DIR = path.join(__dirname, 'carbon_data');
const REPORTS_DIR = path.join(__dirname, 'carbon_reports');

const DEFAULT_CONFIG = {
    emission_factors: {
        'cloud': { co2_per_kwh: 0.4, methane: 0.015, nitrous: 0.003 },
        'on_premise': { co2_per_kwh: 0.6, methane: 0.025, nitrous: 0.005 },
        'edge': { co2_per_kwh: 0.35, methane: 0.01, nitrous: 0.002 },
        'hybrid': { co2_per_kwh: 0.5, methane: 0.02, nitrous: 0.004 }
    },
    infrastructure_types: ['cloud', 'on_premise', 'edge', 'hybrid'],
    carbon_intensity_levels: ['low', 'medium', 'high', 'very_high']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let infraName = null;
let scopeType = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                infraName = args[i + 1];
                i++;
            }
            break;
        case '--scope':
            action = 'scope';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                scopeType = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--infra':
            infraName = args[i + 1];
            i++;
            break;
        case '--type':
            scopeType = args[i + 1];
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
🌍 Carbon Footprint Analyzer - MFH TOOLS PRO
=============================================
Analiza la huella de carbono de infraestructura de seguridad.

Uso:
  node carbon-footprint-analyzer.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --analyze <infra>         Analizar huella de carbono
  --scope <tipo>            Análisis por alcance (cloud, on_premise, edge, hybrid)
  --report                  Generar reporte de carbono
  --infra <nombre>          Nombre de la infraestructura
  --type <tipo>             Tipo de infraestructura
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node carbon-footprint-analyzer.js --init
  node carbon-footprint-analyzer.js --analyze --infra "Infraestructura AWS"
  node carbon-footprint-analyzer.js --scope --type cloud
  node carbon-footprint-analyzer.js --report --format html
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
    if (!fs.existsSync(CARBON_DIR)) {
        fs.mkdirSync(CARBON_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de carbono: ${CARBON_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function analyzeCarbonFootprint(infra) {
    console.log(`🌍 Analizando huella de carbono de: ${infra}`);
    
    const config = loadConfig();
    const types = config.infrastructure_types;
    const factors = config.emission_factors;
    const levels = config.carbon_intensity_levels;
    
    const infraType = types[Math.floor(Math.random() * types.length)];
    const factor = factors[infraType];
    
    // Simular consumo y emisiones
    const energyConsumed = Math.round((Math.random() * 500 + 200) * 10) / 10;
    const co2Emitted = Math.round((energyConsumed * factor.co2_per_kwh) * 10) / 10;
    const methaneEmitted = Math.round((energyConsumed * factor.methane) * 100) / 100;
    const nitrousEmitted = Math.round((energyConsumed * factor.nitrous) * 100) / 100;
    
    const totalCO2e = Math.round((co2Emitted + methaneEmitted * 28 + nitrousEmitted * 265) * 10) / 10;
    
    // Determinar intensidad
    let intensity;
    if (totalCO2e < 100) intensity = 'low';
    else if (totalCO2e < 200) intensity = 'medium';
    else if (totalCO2e < 350) intensity = 'high';
    else intensity = 'very_high';
    
    const analysis = {
        infrastructure: infra,
        type: infraType,
        timestamp: new Date().toISOString(),
        energy_consumed_kwh: energyConsumed,
        emissions: {
            co2_kg: co2Emitted,
            methane_kg: methaneEmitted,
            nitrous_oxide_kg: nitrousEmitted,
            total_co2e_kg: totalCO2e
        },
        intensity: intensity,
        equivalent: {
            cars_off_road: Math.round(totalCO2e / 4.6 * 10) / 10,
            trees_planted: Math.round(totalCO2e / 20 * 10) / 10,
            households_energy: Math.round(totalCO2e / 7 * 10) / 10
        },
        recommendations: []
    };
    
    // Recomendaciones
    if (intensity === 'very_high' || intensity === 'high') {
        analysis.recommendations.push('Reducir consumo energético mediante optimización');
        analysis.recommendations.push('Considerar migración a infraestructura más eficiente');
    }
    if (infraType === 'on_premise') {
        analysis.recommendations.push('Evaluar migración a cloud para reducir huella');
    }
    if (analysis.recommendations.length === 0) {
        analysis.recommendations.push('Mantener niveles actuales de emisiones');
    }
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Infraestructura: ${analysis.infrastructure}`);
    console.log(`   Tipo: ${analysis.type}`);
    console.log(`   Energía consumida: ${analysis.energy_consumed_kwh} kWh`);
    console.log(`   CO₂ total: ${analysis.emissions.total_co2e_kg} kg CO2e`);
    console.log(`   Intensidad: ${analysis.intensity}`);
    
    console.log(`\n📋 Desglose de emisiones:`);
    console.log(`   CO₂: ${analysis.emissions.co2_kg} kg`);
    console.log(`   Metano: ${analysis.emissions.methane_kg} kg (equivalente a ${(analysis.emissions.methane_kg * 28).toFixed(1)} kg CO2e)`);
    console.log(`   Óxido nitroso: ${analysis.emissions.nitrous_oxide_kg} kg (equivalente a ${(analysis.emissions.nitrous_oxide_kg * 265).toFixed(1)} kg CO2e)`);
    
    console.log(`\n🌍 Equivalentes:`);
    console.log(`   Autos fuera de circulación: ${analysis.equivalent.cars_off_road}`);
    console.log(`   Árboles plantados: ${analysis.equivalent.trees_planted}`);
    console.log(`   Hogares con energía: ${analysis.equivalent.households_energy}`);
    
    if (analysis.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        analysis.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(CARBON_DIR, `carbon_${infra}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return analysis;
}

function analyzeScope(type) {
    console.log(`🌍 Analizando huella por alcance: ${type}`);
    
    const config = loadConfig();
    const factors = config.emission_factors;
    const levels = config.carbon_intensity_levels;
    
    if (!factors[type]) {
        console.error(`❌ Tipo "${type}" no encontrado. Opciones: ${Object.keys(factors).join(', ')}`);
        return;
    }
    
    const factor = factors[type];
    
    // Simular datos por alcance
    const scope = {
        type: type,
        timestamp: new Date().toISOString(),
        scopes: {
            scope1: { // Emisiones directas
                energy_kwh: Math.round((Math.random() * 100 + 20) * 10) / 10,
                co2_kg: 0,
                description: 'Emisiones directas de operaciones'
            },
            scope2: { // Emisiones indirectas de energía
                energy_kwh: Math.round((Math.random() * 300 + 100) * 10) / 10,
                co2_kg: 0,
                description: 'Emisiones indirectas por consumo de energía'
            },
            scope3: { // Otras emisiones indirectas
                energy_kwh: Math.round((Math.random() * 200 + 50) * 10) / 10,
                co2_kg: 0,
                description: 'Otras emisiones indirectas (cadena de suministro)'
            }
        },
        total_co2e: 0,
        intensity: '',
        recommendations: []
    };
    
    // Calcular emisiones por alcance
    scope.scopes.scope1.co2_kg = Math.round((scope.scopes.scope1.energy_kwh * factor.co2_per_kwh * 0.3) * 10) / 10;
    scope.scopes.scope2.co2_kg = Math.round((scope.scopes.scope2.energy_kwh * factor.co2_per_kwh) * 10) / 10;
    scope.scopes.scope3.co2_kg = Math.round((scope.scopes.scope3.energy_kwh * factor.co2_per_kwh * 0.5) * 10) / 10;
    
    scope.total_co2e = Math.round((
        scope.scopes.scope1.co2_kg +
        scope.scopes.scope2.co2_kg +
        scope.scopes.scope3.co2_kg
    ) * 10) / 10;
    
    // Intensidad
    if (scope.total_co2e < 50) scope.intensity = 'low';
    else if (scope.total_co2e < 150) scope.intensity = 'medium';
    else if (scope.total_co2e < 300) scope.intensity = 'high';
    else scope.intensity = 'very_high';
    
    // Recomendaciones
    if (scope.scopes.scope1.co2_kg > 50) {
        scope.recommendations.push('Reducir emisiones directas (Scope 1)');
    }
    if (scope.scopes.scope2.co2_kg > 150) {
        scope.recommendations.push('Optimizar consumo energético (Scope 2)');
    }
    if (scope.scopes.scope3.co2_kg > 100) {
        scope.recommendations.push('Evaluar cadena de suministro (Scope 3)');
    }
    if (scope.recommendations.length === 0) {
        scope.recommendations.push('Mantener gestión de emisiones');
    }
    
    console.log(`\n📊 Resultados por alcance para ${type}:`);
    console.log(`   Total CO2e: ${scope.total_co2e} kg`);
    console.log(`   Intensidad: ${scope.intensity}`);
    
    console.log(`\n📋 Desglose por alcance:`);
    console.log(`   Scope 1 (Directas): ${scope.scopes.scope1.co2_kg} kg CO2e`);
    console.log(`   Scope 2 (Energía): ${scope.scopes.scope2.co2_kg} kg CO2e`);
    console.log(`   Scope 3 (Cadena): ${scope.scopes.scope3.co2_kg} kg CO2e`);
    
    if (scope.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        scope.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(CARBON_DIR, `scope_${type}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scope, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return scope;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de huella de carbono en formato ${format}`);
    
    const files = fs.readdirSync(CARBON_DIR).filter(f => f.startsWith('carbon_') || f.startsWith('scope_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --analyze o --scope primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(CARBON_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateCarbonHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `carbon_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateCarbonHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌍 Carbon Footprint Report</title>
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
        <h1>🌍 Carbon Footprint Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Análisis:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Infraestructuras Analizadas</h2>
        ${data.map(d => {
            if (d.infrastructure) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">🌍 ${d.infrastructure}</h3>
                        <p>CO2e: ${d.emissions.total_co2e_kg} kg | Intensidad: ${d.intensity}</p>
                        <p>Tipo: ${d.type}</p>
                    </div>
                `;
            }
            return '';
        }).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🌍 Carbon Footprint Analyzer - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'analyze':
            if (!infraName) {
                console.error('❌ Debes especificar --infra');
                process.exit(1);
            }
            analyzeCarbonFootprint(infraName);
            break;
            
        case 'scope':
            if (!scopeType) {
                console.error('❌ Debes especificar --type');
                process.exit(1);
            }
            analyzeScope(scopeType);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --scope, --report, --init');
            break;
    }
    
    console.log('\n✅ Carbon Footprint Analyzer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Carbon Footprint Analyzer...');
    process.exit(0);
});
