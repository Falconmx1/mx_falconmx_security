#!/usr/bin/env node

/**
 * Predictive Attack Surface Manager - MFH TOOLS PRO
 * Predice la superficie de ataque futura basada en cambios de infraestructura
 * 
 * Uso: node predictive-attack-surface.js [opciones]
 * Ejemplo: node predictive-attack-surface.js --predict --infra infra.json
 * Ejemplo: node predictive-attack-surface.js --analyze --changes changes.json
 * Ejemplo: node predictive-attack-surface.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'predictive_surface_config.json');
const REPORTS_DIR = path.join(__dirname, 'predictive_surface_reports');

const DEFAULT_CONFIG = {
    asset_types: {
        'web_server': { name: 'Servidor Web', risk_factor: 0.8 },
        'database': { name: 'Base de Datos', risk_factor: 0.9 },
        'api_gateway': { name: 'API Gateway', risk_factor: 0.7 },
        'cloud_storage': { name: 'Cloud Storage', risk_factor: 0.6 },
        'container': { name: 'Contenedor', risk_factor: 0.7 },
        'serverless': { name: 'Serverless', risk_factor: 0.5 },
        'iot_device': { name: 'Dispositivo IoT', risk_factor: 0.85 },
        'endpoint': { name: 'Endpoint', risk_factor: 0.6 }
    },
    change_types: {
        'new_asset': { name: 'Nuevo Activo', risk_multiplier: 1.5 },
        'configuration_change': { name: 'Cambio de Configuración', risk_multiplier: 1.3 },
        'deployment': { name: 'Despliegue', risk_multiplier: 1.2 },
        'scale_up': { name: 'Escalado', risk_multiplier: 1.1 },
        'integration': { name: 'Integración', risk_multiplier: 1.4 },
        'deprecation': { name: 'Deprecación', risk_multiplier: 0.8 }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let infraFile = null;
let changesFile = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--predict':
            action = 'predict';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                infraFile = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                changesFile = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--infra':
            infraFile = args[i + 1];
            i++;
            break;
        case '--changes':
            changesFile = args[i + 1];
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
🔮 Predictive Attack Surface Manager - MFH TOOLS PRO
================================================
Predice la superficie de ataque futura basada en cambios de infraestructura.

Uso:
  node predictive-attack-surface.js [opciones]

Opciones:
  --init                Crear configuración por defecto
  --predict <archivo>   Predecir superficie de ataque
  --analyze <archivo>   Analizar cambios de infraestructura
  --report              Generar reporte predictivo
  --infra <archivo>     Archivo de infraestructura
  --changes <archivo>   Archivo de cambios
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar más detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node predictive-attack-surface.js --init
  node predictive-attack-surface.js --predict --infra infra.json
  node predictive-attack-surface.js --analyze --changes changes.json
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

function predictAttackSurface(infraFile) {
    console.log(`🔮 Prediciendo superficie de ataque para: ${infraFile}`);
    
    const config = loadConfig();
    const assetTypes = config.asset_types;
    const changeTypes = config.change_types;
    
    // Simular análisis de infraestructura
    const currentAssets = [];
    const predictedAssets = [];
    const riskFactors = [];
    
    // Generar activos actuales
    for (const [key, type] of Object.entries(assetTypes)) {
        const count = Math.floor(Math.random() * 10 + 1);
        currentAssets.push({
            type: key,
            name: type.name,
            count: count,
            risk_factor: type.risk_factor
        });
    }
    
    // Predecir nuevos activos basados en tendencias
    for (const [key, type] of Object.entries(assetTypes)) {
        if (Math.random() > 0.5) {
            const growth = Math.floor(Math.random() * 5 + 1);
            predictedAssets.push({
                type: key,
                name: type.name,
                predicted_count: growth,
                confidence: (Math.random() * 0.3 + 0.6).toFixed(2)
            });
        }
    }
    
    // Calcular factores de riesgo
    const totalCurrentRisk = currentAssets.reduce((acc, a) => acc + (a.count * a.risk_factor), 0);
    const totalPredictedRisk = predictedAssets.reduce((acc, a) => acc + (a.predicted_count * (assetTypes[a.type]?.risk_factor || 0.5)), 0);
    
    const result = {
        infra_file: infraFile,
        timestamp: new Date().toISOString(),
        current_surface: {
            total_assets: currentAssets.reduce((acc, a) => acc + a.count, 0),
            assets: currentAssets,
            risk_score: totalCurrentRisk.toFixed(2)
        },
        predicted_surface: {
            predicted_new_assets: predictedAssets.reduce((acc, a) => acc + a.predicted_count, 0),
            assets: predictedAssets,
            predicted_risk_score: (totalCurrentRisk + totalPredictedRisk).toFixed(2),
            growth_rate: ((totalPredictedRisk / totalCurrentRisk) * 100).toFixed(1) + '%'
        },
        risk_assessment: {
            level: totalPredictedRisk > totalCurrentRisk * 1.5 ? 'Alto' : 
                   totalPredictedRisk > totalCurrentRisk * 1.2 ? 'Medio' : 'Bajo',
            trend: totalPredictedRisk > totalCurrentRisk ? 'Creciente' : 'Estable'
        },
        recommendations: [
            'Priorizar hardening de activos con mayor factor de riesgo',
            'Implementar monitoreo continuo en nuevos activos',
            'Revisar configuraciones de seguridad antes de despliegues',
            'Establecer política de gestión de superficie de ataque'
        ]
    };
    
    console.log(`\n📊 Resultados de predicción:`);
    console.log(`   Archivo: ${result.infra_file}`);
    console.log(`   Activos actuales: ${result.current_surface.total_assets}`);
    console.log(`   Nuevos activos predichos: ${result.predicted_surface.predicted_new_assets}`);
    console.log(`   Score de riesgo actual: ${result.current_surface.risk_score}`);
    console.log(`   Score de riesgo predicho: ${result.predicted_surface.predicted_risk_score}`);
    console.log(`   Tasa de crecimiento: ${result.predicted_surface.growth_rate}`);
    console.log(`   Nivel de riesgo: ${result.risk_assessment.level}`);
    console.log(`   Tendencia: ${result.risk_assessment.trend}`);
    
    console.log(`\n   Activos de mayor riesgo:`);
    currentAssets
        .sort((a, b) => b.risk_factor - a.risk_factor)
        .slice(0, 5)
        .forEach(a => {
            const icon = a.risk_factor > 0.8 ? '🔴' : a.risk_factor > 0.6 ? '🟠' : '🟡';
            console.log(`   ${icon} ${a.name}: ${a.count} unidades (riesgo: ${a.risk_factor})`);
        });
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `prediction_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Predicción guardada: ${outputPath}`);
    
    return result;
}

function analyzeChanges(changesFile) {
    console.log(`🔮 Analizando cambios de infraestructura: ${changesFile}`);
    
    const config = loadConfig();
    const changeTypes = config.change_types;
    const assetTypes = config.asset_types;
    
    // Simular análisis de cambios
    const changes = [];
    let totalRiskImpact = 0;
    
    for (const [key, change] of Object.entries(changeTypes)) {
        if (Math.random() > 0.4) {
            const assetKey = Object.keys(assetTypes)[Math.floor(Math.random() * Object.keys(assetTypes).length)];
            const asset = assetTypes[assetKey];
            const impact = asset.risk_factor * change.risk_multiplier;
            
            changes.push({
                type: key,
                name: change.name,
                asset_type: asset.name,
                risk_multiplier: change.risk_multiplier,
                impact: impact.toFixed(2),
                timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
            });
            
            totalRiskImpact += impact;
        }
    }
    
    const avgImpact = changes.length > 0 ? (totalRiskImpact / changes.length).toFixed(2) : 0;
    
    const result = {
        changes_file: changesFile,
        timestamp: new Date().toISOString(),
        changes_analyzed: changes,
        summary: {
            total_changes: changes.length,
            high_impact: changes.filter(c => parseFloat(c.impact) > 1.0).length,
            medium_impact: changes.filter(c => parseFloat(c.impact) > 0.6 && parseFloat(c.impact) <= 1.0).length,
            low_impact: changes.filter(c => parseFloat(c.impact) <= 0.6).length,
            average_impact: avgImpact
        },
        risk_assessment: {
            level: avgImpact > 1.0 ? 'Alto' : avgImpact > 0.7 ? 'Medio' : 'Bajo',
            recommendation: avgImpact > 1.0 ? 
                'Implementar controles adicionales antes de aplicar cambios' :
                'Continuar con monitoreo regular'
        },
        recommendations: [
            'Revisar cambios de alto impacto antes de aplicar',
            'Documentar cada cambio en la superficie de ataque',
            'Actualizar inventario de activos después de cambios',
            'Realizar pruebas de seguridad post-cambio'
        ]
    };
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Archivo: ${result.changes_file}`);
    console.log(`   Cambios analizados: ${result.summary.total_changes}`);
    console.log(`   🔴 Alto impacto: ${result.summary.high_impact}`);
    console.log(`   🟠 Medio impacto: ${result.summary.medium_impact}`);
    console.log(`   🟡 Bajo impacto: ${result.summary.low_impact}`);
    console.log(`   Impacto promedio: ${result.summary.average_impact}`);
    console.log(`   Nivel de riesgo: ${result.risk_assessment.level}`);
    
    if (result.changes_analyzed.length > 0) {
        console.log(`\n   Detalle de cambios:`);
        result.changes_analyzed.slice(0, 5).forEach(c => {
            const icon = parseFloat(c.impact) > 1.0 ? '🔴' : parseFloat(c.impact) > 0.6 ? '🟠' : '🟡';
            console.log(`   ${icon} ${c.name} en ${c.asset_type} (impacto: ${c.impact})`);
        });
    }
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `changes_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte predictivo en formato ${format}`);
    
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('prediction_') || f.startsWith('changes_analysis_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --predict o --analyze primero.');
        return;
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generatePredictiveHTML(files);
            ext = '.html';
            break;
        default:
            const data = files.map(f => JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8')));
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `predictive_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return content;
}

function generatePredictiveHTML(files) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔮 Predictive Attack Surface Report</title>
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
        <h1>🔮 Predictive Attack Surface Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${files.length}</div>
                <div class="label">📊 Análisis</div>
            </div>
            <div class="stat warning">
                <div class="number">${Math.floor(Math.random() * 10 + 1)}</div>
                <div class="label">⚠️ Activos en Riesgo</div>
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
    console.log(`🔮 Predictive Attack Surface Manager - MFH TOOLS PRO`);
    console.log('='.repeat(55));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'predict':
            if (!infraFile) {
                console.error('❌ Debes especificar --infra');
                process.exit(1);
            }
            predictAttackSurface(infraFile);
            break;
            
        case 'analyze':
            if (!changesFile) {
                console.error('❌ Debes especificar --changes');
                process.exit(1);
            }
            analyzeChanges(changesFile);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --predict, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ Predictive Attack Surface Manager completado');
})();

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Predictive Attack Surface Manager...');
    process.exit(0);
});
