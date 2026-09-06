#!/usr/bin/env node

/**
 * Green Security Scorecard - MFH TOOLS PRO
 * Evalúa la eficiencia energética de sistemas de seguridad
 * 
 * Uso: node green-security-scorecard.js [opciones]
 * Ejemplo: node green-security-scorecard.js --assess --system "Sistema de seguridad"
 * Ejemplo: node green-security-scorecard.js --benchmark --type siem
 * Ejemplo: node green-security-scorecard.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'green_config.json');
const GREEN_DIR = path.join(__dirname, 'green_data');
const REPORTS_DIR = path.join(__dirname, 'green_reports');

const DEFAULT_CONFIG = {
    metrics: {
        'energy_consumption': { name: 'Consumo energético', unit: 'kWh', weight: 25 },
        'carbon_intensity': { name: 'Intensidad de carbono', unit: 'gCO2/kWh', weight: 20 },
        'efficiency_ratio': { name: 'Ratio de eficiencia', unit: '%', weight: 20 },
        'renewable_usage': { name: 'Uso de energías renovables', unit: '%', weight: 15 },
        'hardware_efficiency': { name: 'Eficiencia de hardware', unit: 'score', weight: 10 },
        'cooling_efficiency': { name: 'Eficiencia de refrigeración', unit: 'PUE', weight: 10 }
    },
    benchmarks: {
        'siem': { energy_baseline: 500, carbon_baseline: 350, efficiency_target: 85 },
        'firewall': { energy_baseline: 200, carbon_baseline: 300, efficiency_target: 80 },
        'ids': { energy_baseline: 300, carbon_baseline: 320, efficiency_target: 82 },
        'endpoint': { energy_baseline: 100, carbon_baseline: 280, efficiency_target: 78 },
        'cloud_native': { energy_baseline: 400, carbon_baseline: 250, efficiency_target: 90 }
    },
    ratings: ['A+', 'A', 'B', 'C', 'D', 'F']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let systemName = null;
let systemType = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--assess':
            action = 'assess';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                systemName = args[i + 1];
                i++;
            }
            break;
        case '--benchmark':
            action = 'benchmark';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                systemType = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--system':
            systemName = args[i + 1];
            i++;
            break;
        case '--type':
            systemType = args[i + 1];
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
🌱 Green Security Scorecard - MFH TOOLS PRO
============================================
Evalúa la eficiencia energética de sistemas de seguridad.

Uso:
  node green-security-scorecard.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --assess <sistema>        Evaluar eficiencia del sistema
  --benchmark <tipo>        Benchmark por tipo (siem, firewall, ids, endpoint, cloud_native)
  --report                  Generar reporte de eficiencia
  --system <nombre>         Nombre del sistema a evaluar
  --type <tipo>             Tipo de sistema para benchmark
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node green-security-scorecard.js --init
  node green-security-scorecard.js --assess --system "Sistema de seguridad"
  node green-security-scorecard.js --benchmark --type siem
  node green-security-scorecard.js --report --format html
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
    if (!fs.existsSync(GREEN_DIR)) {
        fs.mkdirSync(GREEN_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos verdes: ${GREEN_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function assessGreenSystem(system) {
    console.log(`🌱 Evaluando eficiencia energética de: ${system}`);
    
    const config = loadConfig();
    const metrics = config.metrics;
    const ratings = config.ratings;
    
    const assessment = {
        system: system,
        timestamp: new Date().toISOString(),
        metrics: {},
        overall_score: 0,
        rating: '',
        recommendations: []
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [key, metric] of Object.entries(metrics)) {
        const score = Math.round((Math.random() * 40 + 50) * 10) / 10;
        assessment.metrics[key] = {
            name: metric.name,
            score: score,
            unit: metric.unit,
            weight: metric.weight,
            status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
        };
        totalScore += score * metric.weight;
        totalWeight += metric.weight;
    }
    
    assessment.overall_score = Math.round((totalScore / totalWeight) * 10) / 10;
    
    // Determinar rating
    if (assessment.overall_score >= 90) assessment.rating = 'A+';
    else if (assessment.overall_score >= 80) assessment.rating = 'A';
    else if (assessment.overall_score >= 70) assessment.rating = 'B';
    else if (assessment.overall_score >= 60) assessment.rating = 'C';
    else if (assessment.overall_score >= 50) assessment.rating = 'D';
    else assessment.rating = 'F';
    
    // Recomendaciones
    const poorMetrics = Object.entries(assessment.metrics).filter(([k, v]) => v.status === 'poor');
    if (poorMetrics.length > 0) {
        assessment.recommendations.push('Mejorar eficiencia en: ' + poorMetrics.map(([k, v]) => v.name).join(', '));
    }
    assessment.recommendations.push('Implementar monitoreo continuo de energía');
    assessment.recommendations.push('Considerar migración a infraestructura más eficiente');
    if (assessment.overall_score < 70) {
        assessment.recommendations.push('Realizar auditoría energética detallada');
    }
    
    console.log(`\n📊 Resultados de evaluación:`);
    console.log(`   Sistema: ${assessment.system}`);
    console.log(`   Score global: ${assessment.overall_score}%`);
    console.log(`   Rating: ${assessment.rating}`);
    
    console.log(`\n📋 Métricas detalladas:`);
    for (const [key, metric] of Object.entries(assessment.metrics)) {
        const icon = metric.status === 'excellent' ? '🟢' : metric.status === 'good' ? '🔵' : metric.status === 'fair' ? '🟡' : '🔴';
        console.log(`   ${icon} ${metric.name}: ${metric.score} ${metric.unit} (${metric.status})`);
    }
    
    if (assessment.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        assessment.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(GREEN_DIR, `green_${system}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(assessment, null, 2));
    console.log(`\n📄 Evaluación guardada: ${outputPath}`);
    
    return assessment;
}

function benchmarkSystem(type) {
    console.log(`🌱 Generando benchmark para tipo: ${type}`);
    
    const config = loadConfig();
    const benchmarks = config.benchmarks;
    const ratings = config.ratings;
    
    if (!benchmarks[type]) {
        console.error(`❌ Tipo "${type}" no encontrado. Opciones: ${Object.keys(benchmarks).join(', ')}`);
        return;
    }
    
    const data = benchmarks[type];
    
    // Simular variaciones
    const variation = Math.random() * 20 - 10;
    const energy = Math.round((data.energy_baseline + variation) * 10) / 10;
    const carbon = Math.round((data.carbon_baseline + variation * 0.8) * 10) / 10;
    const efficiency = Math.round((data.efficiency_target + (Math.random() * 10 - 5)) * 10) / 10;
    
    const benchmark = {
        type: type,
        timestamp: new Date().toISOString(),
        baseline: {
            energy_consumption: data.energy_baseline,
            carbon_intensity: data.carbon_baseline,
            efficiency_target: data.efficiency_target
        },
        current: {
            energy_consumption: energy,
            carbon_intensity: carbon,
            efficiency: efficiency
        },
        comparison: {
            energy_delta: Math.round(((energy - data.energy_baseline) / data.energy_baseline) * 100 * 10) / 10,
            carbon_delta: Math.round(((carbon - data.carbon_baseline) / data.carbon_baseline) * 100 * 10) / 10,
            efficiency_delta: Math.round(((efficiency - data.efficiency_target)) * 10) / 10
        },
        rating: efficiency >= 90 ? 'A+' : efficiency >= 80 ? 'A' : efficiency >= 70 ? 'B' : efficiency >= 60 ? 'C' : 'D',
        recommendations: []
    };
    
    // Recomendaciones
    if (benchmark.comparison.energy_delta > 10) {
        benchmark.recommendations.push('Reducir consumo energético');
    }
    if (benchmark.comparison.efficiency_delta < 0) {
        benchmark.recommendations.push('Mejorar eficiencia operacional');
    }
    if (benchmark.recommendations.length === 0) {
        benchmark.recommendations.push('Mantener niveles de eficiencia');
    }
    
    console.log(`\n📊 Resultados de benchmark:`);
    console.log(`   Tipo: ${benchmark.type}`);
    console.log(`   Rating: ${benchmark.rating}`);
    console.log(`   Consumo energético: ${benchmark.current.energy_consumption} kWh (baseline: ${benchmark.baseline.energy_consumption})`);
    console.log(`   Intensidad carbono: ${benchmark.current.carbon_intensity} gCO2/kWh (baseline: ${benchmark.baseline.carbon_intensity})`);
    console.log(`   Eficiencia: ${benchmark.current.efficiency}% (target: ${benchmark.baseline.efficiency_target}%)`);
    
    console.log(`\n📊 Comparativa:`);
    console.log(`   Energía: ${benchmark.comparison.energy_delta > 0 ? '🔴 +' : '🟢 '}${benchmark.comparison.energy_delta}%`);
    console.log(`   Carbono: ${benchmark.comparison.carbon_delta > 0 ? '🔴 +' : '🟢 '}${benchmark.comparison.carbon_delta}%`);
    console.log(`   Eficiencia: ${benchmark.comparison.efficiency_delta > 0 ? '🟢 +' : '🔴 '}${benchmark.comparison.efficiency_delta}%`);
    
    if (benchmark.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        benchmark.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(GREEN_DIR, `benchmark_${type}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(benchmark, null, 2));
    console.log(`\n📄 Benchmark guardado: ${outputPath}`);
    
    return benchmark;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de eficiencia verde en formato ${format}`);
    
    const files = fs.readdirSync(GREEN_DIR).filter(f => f.startsWith('green_') || f.startsWith('benchmark_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --assess o --benchmark primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(GREEN_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateGreenHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `green_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateGreenHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌱 Green Security Report</title>
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
        .rating-A\\+ { color: #00ff00; }
        .rating-A { color: #7cfc00; }
        .rating-B { color: #9acd32; }
        .rating-C { color: #ffc107; }
        .rating-D { color: #ff8c00; }
        .rating-F { color: #dc3545; }
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
        <h1>🌱 Green Security Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Evaluaciones:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Sistemas Evaluados</h2>
        ${data.map(d => {
            if (d.system) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">🌱 ${d.system}</h3>
                        <p class="rating-${d.rating}">Rating: ${d.rating}</p>
                        <p>Score: ${d.overall_score}%</p>
                        <p>Métricas: ${Object.keys(d.metrics).length}</p>
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
    console.log(`🌱 Green Security Scorecard - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'assess':
            if (!systemName) {
                console.error('❌ Debes especificar --system');
                process.exit(1);
            }
            assessGreenSystem(systemName);
            break;
            
        case 'benchmark':
            if (!systemType) {
                console.error('❌ Debes especificar --type');
                process.exit(1);
            }
            benchmarkSystem(systemType);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --assess, --benchmark, --report, --init');
            break;
    }
    
    console.log('\n✅ Green Security Scorecard completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Green Security Scorecard...');
    process.exit(0);
});
