#!/usr/bin/env node

/**
 * Firewall Rule Optimizer - MFH TOOLS PRO
 * Optimización y análisis de reglas de firewall
 * 
 * Uso: node firewall-rule-optimizer.js [opciones]
 * Ejemplo: node firewall-rule-optimizer.js --analyze --rules rules.json
 * Ejemplo: node firewall-rule-optimizer.js --optimize --input rules.json
 * Ejemplo: node firewall-rule-optimizer.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'firewall_config.json');
const RULES_DIR = path.join(__dirname, 'firewall_rules');
const REPORTS_DIR = path.join(__dirname, 'firewall_reports');

const DEFAULT_CONFIG = {
    default_action: 'deny',
    log_matches: true,
    max_rules: 1000,
    optimization: {
        merge_duplicates: true,
        remove_redundant: true,
        reorder_by_usage: true
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let rulesFile = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                rulesFile = args[i + 1];
                i++;
            }
            break;
        case '--optimize':
            action = 'optimize';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                rulesFile = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--rules':
            rulesFile = args[i + 1];
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
🔥 Firewall Rule Optimizer - MFH TOOLS PRO
=========================================
Optimización y análisis de reglas de firewall.

Uso:
  node firewall-rule-optimizer.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --analyze [rules]     Analizar reglas de firewall
  --optimize [rules]    Optimizar reglas de firewall
  --report              Generar reporte de optimizacion
  --rules <archivo>     Archivo de reglas JSON
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node firewall-rule-optimizer.js --init
  node firewall-rule-optimizer.js --analyze --rules rules.json
  node firewall-rule-optimizer.js --optimize --input rules.json
  node firewall-rule-optimizer.js --report --format html
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
    if (!fs.existsSync(RULES_DIR)) {
        fs.mkdirSync(RULES_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear reglas de ejemplo
    const sampleRules = generateSampleRules();
    const samplePath = path.join(RULES_DIR, 'sample_rules.json');
    fs.writeFileSync(samplePath, JSON.stringify(sampleRules, null, 2));
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Reglas: ${RULES_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
    console.log(`📄 Reglas de ejemplo: ${samplePath}`);
}

function generateSampleRules() {
    const rules = [];
    const actions = ['allow', 'deny', 'log'];
    const protocols = ['tcp', 'udp', 'icmp', 'any'];
    const sources = ['192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12', '0.0.0.0/0', '192.168.1.100'];
    const destinations = ['192.168.1.1', '8.8.8.8', '1.1.1.1', '0.0.0.0/0', '10.0.0.1'];
    const ports = ['22', '80', '443', '53', '3306', '5432', '8080', 'any'];
    
    for (let i = 0; i < 20; i++) {
        rules.push({
            id: `rule-${String(i + 1).padStart(3, '0')}`,
            action: actions[Math.floor(Math.random() * actions.length)],
            protocol: protocols[Math.floor(Math.random() * protocols.length)],
            source: sources[Math.floor(Math.random() * sources.length)],
            destination: destinations[Math.floor(Math.random() * destinations.length)],
            port: ports[Math.floor(Math.random() * ports.length)],
            description: `Regla ${i + 1}`,
            enabled: Math.random() > 0.2,
            hits: Math.floor(Math.random() * 1000)
        });
    }
    
    return rules;
}

function analyzeRules(rulesFile) {
    console.log(`🔍 Analizando reglas de firewall: ${rulesFile || 'default'}`);
    
    let rules = [];
    
    if (rulesFile && fs.existsSync(rulesFile)) {
        try {
            rules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
            if (!Array.isArray(rules)) {
                rules = [rules];
            }
        } catch (error) {
            console.error('❌ Error leyendo archivo:', error.message);
            return;
        }
    } else {
        // Usar reglas de ejemplo
        const samplePath = path.join(RULES_DIR, 'sample_rules.json');
        if (fs.existsSync(samplePath)) {
            rules = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
        } else {
            rules = generateSampleRules();
        }
    }
    
    const analysis = {
        timestamp: new Date().toISOString(),
        total_rules: rules.length,
        enabled: rules.filter(r => r.enabled !== false).length,
        disabled: rules.filter(r => r.enabled === false).length,
        by_action: {},
        by_protocol: {},
        stats: {
            duplicates: 0,
            redundant: 0,
            shadowed: 0,
            overlaps: 0
        },
        recommendations: []
    };
    
    // Analizar acciones
    rules.forEach(r => {
        analysis.by_action[r.action] = (analysis.by_action[r.action] || 0) + 1;
        analysis.by_protocol[r.protocol] = (analysis.by_protocol[r.protocol] || 0) + 1;
    });
    
    // Detectar duplicados
    const seen = new Set();
    rules.forEach(r => {
        const key = `${r.action}|${r.protocol}|${r.source}|${r.destination}|${r.port}`;
        if (seen.has(key)) {
            analysis.stats.duplicates++;
        }
        seen.add(key);
    });
    
    // Detectar reglas redundantes
    for (let i = 0; i < rules.length; i++) {
        for (let j = i + 1; j < rules.length; j++) {
            if (rules[i].action === rules[j].action &&
                rules[i].protocol === rules[j].protocol &&
                rules[i].source === rules[j].source &&
                rules[i].destination === rules[j].destination) {
                analysis.stats.redundant++;
            }
        }
    }
    
    // Generar recomendaciones
    if (analysis.stats.duplicates > 0) {
        analysis.recommendations.push(`Eliminar ${analysis.stats.duplicates} reglas duplicadas`);
    }
    if (analysis.stats.redundant > 0) {
        analysis.recommendations.push(`Revisar ${analysis.stats.redundant} reglas redundantes`);
    }
    if (analysis.disabled > 0) {
        analysis.recommendations.push(`Revisar ${analysis.disabled} reglas deshabilitadas`);
    }
    if (analysis.by_action.allow > analysis.by_action.deny * 2) {
        analysis.recommendations.push('Considerar politica de default deny con reglas allow especificas');
    }
    
    console.log(`\n📊 Analisis de reglas:`);
    console.log(`   Total reglas: ${analysis.total_rules}`);
    console.log(`   ✅ Habilitadas: ${analysis.enabled}`);
    console.log(`   ❌ Deshabilitadas: ${analysis.disabled}`);
    console.log(`\n   Por accion:`);
    for (const [action, count] of Object.entries(analysis.by_action)) {
        console.log(`      • ${action}: ${count}`);
    }
    console.log(`\n   Duplicados: ${analysis.stats.duplicates}`);
    console.log(`   Redundantes: ${analysis.stats.redundant}`);
    
    if (analysis.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        analysis.recommendations.forEach(r => {
            console.log(`   • ${r}`);
        });
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `fw_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return analysis;
}

function optimizeRules(rulesFile) {
    console.log(`⚡ Optimizando reglas de firewall: ${rulesFile || 'default'}`);
    
    let rules = [];
    
    if (rulesFile && fs.existsSync(rulesFile)) {
        try {
            rules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
            if (!Array.isArray(rules)) {
                rules = [rules];
            }
        } catch (error) {
            console.error('❌ Error leyendo archivo:', error.message);
            return;
        }
    } else {
        const samplePath = path.join(RULES_DIR, 'sample_rules.json');
        if (fs.existsSync(samplePath)) {
            rules = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
        } else {
            rules = generateSampleRules();
        }
    }
    
    const config = loadConfig();
    let optimized = [...rules];
    const stats = {
        original_count: rules.length,
        removed_duplicates: 0,
        removed_redundant: 0,
        reordered: 0
    };
    
    // Eliminar duplicados
    if (config.optimization.merge_duplicates) {
        const seen = new Set();
        optimized = optimized.filter(r => {
            const key = `${r.action}|${r.protocol}|${r.source}|${r.destination}|${r.port}`;
            if (seen.has(key)) {
                stats.removed_duplicates++;
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    
    // Eliminar reglas redundantes
    if (config.optimization.remove_redundant) {
        const newRules = [];
        for (const rule of optimized) {
            let isRedundant = false;
            for (const other of optimized) {
                if (rule === other) continue;
                if (rule.action === other.action &&
                    rule.protocol === other.protocol &&
                    rule.source === other.source &&
                    rule.destination === other.destination) {
                    isRedundant = true;
                    break;
                }
            }
            if (!isRedundant) {
                newRules.push(rule);
            } else {
                stats.removed_redundant++;
            }
        }
        optimized = newRules;
    }
    
    // Reordenar por hits
    if (config.optimization.reorder_by_usage) {
        optimized.sort((a, b) => (b.hits || 0) - (a.hits || 0));
        stats.reordered = optimized.length;
    }
    
    const result = {
        timestamp: new Date().toISOString(),
        original_count: stats.original_count,
        optimized_count: optimized.length,
        reduction: Math.round((1 - optimized.length / stats.original_count) * 100),
        stats: stats,
        rules: optimized
    };
    
    console.log(`\n📊 Resultados de optimizacion:`);
    console.log(`   Reglas originales: ${result.original_count}`);
    console.log(`   Reglas optimizadas: ${result.optimized_count}`);
    console.log(`   Reduccion: ${result.reduction}%`);
    console.log(`   Duplicados eliminados: ${stats.removed_duplicates}`);
    console.log(`   Redundantes eliminados: ${stats.removed_redundant}`);
    console.log(`   Reordenadas: ${stats.reordered}`);
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `fw_optimized_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Reglas optimizadas guardadas: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de firewall en formato ${format}`);
    
    const analysisFiles = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('fw_analysis_'));
    const optimizeFiles = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('fw_optimized_'));
    
    if (analysisFiles.length === 0 && optimizeFiles.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --analyze o --optimize primero.');
        return;
    }
    
    let latest = null;
    if (analysisFiles.length > 0) {
        latest = analysisFiles[analysisFiles.length - 1];
    }
    
    const data = latest ? JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, latest), 'utf8')) : {};
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateFirewallHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `fw_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateFirewallHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 Firewall Rule Report</title>
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
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #00ff00;
            color: #000;
            padding: 10px;
            text-align: left;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #333;
        }
        .action-allow { color: #00cc00; }
        .action-deny { color: #ff0000; }
        .action-log { color: #ff8800; }
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
        <h1>🔥 Firewall Rule Report</h1>
        <p><strong>Generado:</strong> ${data.timestamp || new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.total_rules || 0}</div>
                <div class="label">📋 Total Reglas</div>
            </div>
            <div class="stat">
                <div class="number">${data.enabled || 0}</div>
                <div class="label">✅ Habilitadas</div>
            </div>
            <div class="stat">
                <div class="number">${data.disabled || 0}</div>
                <div class="label">❌ Deshabilitadas</div>
            </div>
        </div>
        
        <h2>📋 Detalle por Accion</h2>
        <table>
            <thead>
                <tr>
                    <th>Accion</th>
                    <th>Cantidad</th>
                </tr>
            </thead>
            <tbody>
                ${data.by_action ? Object.entries(data.by_action).map(([action, count]) => `
                    <tr>
                        <td class="action-${action}">${action.toUpperCase()}</td>
                        <td>${count}</td>
                    </tr>
                `).join('') : '<tr><td colspan="2">No hay datos</td></tr>'}
            </tbody>
        </table>
        
        <h2>💡 Recomendaciones</h2>
        <ul>
            ${data.recommendations ? data.recommendations.map(r => `<li>${r}</li>`).join('') : '<li>Sin recomendaciones</li>'}
        </ul>
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔥 Firewall Rule Optimizer - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'analyze':
            analyzeRules(rulesFile);
            break;
            
        case 'optimize':
            optimizeRules(rulesFile);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --optimize, --report, --init');
            break;
    }
    
    console.log('\n✅ Firewall Rule Optimizer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Firewall Rule Optimizer...');
    process.exit(0);
});
