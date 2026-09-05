#!/usr/bin/env node

/**
 * Post-Quantum Crypto Analyzer - MFH TOOLS PRO
 * Analiza resistencia de algoritmos criptográficos frente a computación cuántica
 * 
 * Uso: node post-quantum-crypto-analyzer.js [opciones]
 * Ejemplo: node post-quantum-crypto-analyzer.js --analyze --algorithm RSA-2048
 * Ejemplo: node post-quantum-crypto-analyzer.js --compare --algorithms RSA-2048,ECC-256,AES-256
 * Ejemplo: node post-quantum-crypto-analyzer.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'pqc_config.json');
const PQC_DIR = path.join(__dirname, 'pqc_data');
const REPORTS_DIR = path.join(__dirname, 'pqc_reports');

const DEFAULT_CONFIG = {
    algorithms: {
        'RSA-2048': { type: 'RSA', bits: 2048, quantum_risk: 'high', estimated_break: 2030, classical_strength: 112 },
        'RSA-4096': { type: 'RSA', bits: 4096, quantum_risk: 'medium', estimated_break: 2045, classical_strength: 152 },
        'ECC-256': { type: 'ECC', bits: 256, quantum_risk: 'high', estimated_break: 2028, classical_strength: 128 },
        'ECC-384': { type: 'ECC', bits: 384, quantum_risk: 'medium', estimated_break: 2040, classical_strength: 192 },
        'AES-256': { type: 'Symmetric', bits: 256, quantum_risk: 'low', estimated_break: 2070, classical_strength: 256 },
        'AES-128': { type: 'Symmetric', bits: 128, quantum_risk: 'medium', estimated_break: 2050, classical_strength: 128 },
        'Kyber-512': { type: 'Lattice', bits: 512, quantum_risk: 'none', estimated_break: 2100, classical_strength: 128 },
        'Kyber-1024': { type: 'Lattice', bits: 1024, quantum_risk: 'none', estimated_break: 2150, classical_strength: 256 },
        'Dilithium-2': { type: 'Lattice', bits: 512, quantum_risk: 'none', estimated_break: 2100, classical_strength: 128 },
        'Dilithium-5': { type: 'Lattice', bits: 1024, quantum_risk: 'none', estimated_break: 2150, classical_strength: 256 },
        'SPHINCS+': { type: 'Hash-based', bits: 256, quantum_risk: 'none', estimated_break: 2150, classical_strength: 256 },
        'Falcon-512': { type: 'Lattice', bits: 512, quantum_risk: 'none', estimated_break: 2100, classical_strength: 128 },
        'Falcon-1024': { type: 'Lattice', bits: 1024, quantum_risk: 'none', estimated_break: 2150, classical_strength: 256 }
    },
    quantum_attacks: ['Grover', 'Shor', 'Quantum_Annealing', 'Bernstein_Algorithm'],
    risk_levels: ['none', 'low', 'medium', 'high', 'critical']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let algorithmName = null;
let compareList = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                algorithmName = args[i + 1];
                i++;
            }
            break;
        case '--compare':
            action = 'compare';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                compareList = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--algorithm':
            algorithmName = args[i + 1];
            i++;
            break;
        case '--algorithms':
            compareList = args[i + 1];
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
🔮 Post-Quantum Crypto Analyzer - MFH TOOLS PRO
================================================
Analiza resistencia de algoritmos criptográficos frente a computación cuántica.

Uso:
  node post-quantum-crypto-analyzer.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --analyze <algoritmo>     Analizar resistencia de algoritmo
  --compare <algoritmos>    Comparar algoritmos (RSA-2048,ECC-256,AES-256)
  --report                  Generar reporte de seguridad cuántica
  --algorithm <nombre>      Nombre del algoritmo a analizar
  --algorithms <lista>      Lista de algoritmos a comparar
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node post-quantum-crypto-analyzer.js --init
  node post-quantum-crypto-analyzer.js --analyze --algorithm RSA-2048
  node post-quantum-crypto-analyzer.js --compare --algorithms RSA-2048,ECC-256,AES-256
  node post-quantum-crypto-analyzer.js --report --format html
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
    if (!fs.existsSync(PQC_DIR)) {
        fs.mkdirSync(PQC_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos PQC: ${PQC_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function analyzeAlgorithm(algorithm) {
    console.log(`🔮 Analizando algoritmo: ${algorithm}`);
    
    const config = loadConfig();
    const algorithms = config.algorithms;
    const attacks = config.quantum_attacks;
    const levels = config.risk_levels;
    
    if (!algorithms[algorithm]) {
        console.error(`❌ Algoritmo "${algorithm}" no encontrado. Opciones: ${Object.keys(algorithms).join(', ')}`);
        return;
    }
    
    const algoData = algorithms[algorithm];
    
    // Calcular resistencia cuántica
    const quantumResistance = {
        algorithm: algorithm,
        type: algoData.type,
        bits: algoData.bits,
        timestamp: new Date().toISOString(),
        quantum_risk: algoData.quantum_risk,
        estimated_break_year: algoData.estimated_break,
        classical_strength: algoData.classical_strength,
        quantum_strength: algoData.quantum_risk === 'none' ? 'Alta' : algoData.quantum_risk === 'low' ? 'Media' : 'Baja',
        vulnerable_attacks: [],
        recommendations: []
    };
    
    // Determinar ataques cuánticos a los que es vulnerable
    if (algoData.type === 'RSA' || algoData.type === 'ECC') {
        quantumResistance.vulnerable_attacks.push('Shor Algorithm');
    }
    if (algoData.type === 'Symmetric') {
        quantumResistance.vulnerable_attacks.push('Grover Algorithm');
    }
    if (algoData.quantum_risk === 'high') {
        quantumResistance.vulnerable_attacks.push('Quantum Annealing');
    }
    
    // Score de resistencia (0-100, donde 100 es inmune)
    let resistanceScore = 100;
    const riskWeights = { none: 0, low: 20, medium: 50, high: 80, critical: 100 };
    const riskScore = riskWeights[algoData.quantum_risk] || 0;
    resistanceScore = Math.max(0, Math.min(100, 100 - riskScore));
    
    quantumResistance.resistance_score = resistanceScore;
    
    // Recomendaciones
    if (algoData.quantum_risk === 'high') {
        quantumResistance.recommendations = [
            `Reemplazar ${algorithm} por un algoritmo post-cuantico`,
            'Planificar migración a criptografía resistente a cuántica',
            'Implementar soluciones híbridas (clásico + post-cuántico)',
            'Monitorear avances en computación cuántica'
        ];
    } else if (algoData.quantum_risk === 'medium') {
        quantumResistance.recommendations = [
            `Evaluar migración a ${algorithm.replace(/-[0-9]+$/, '')}-${algoData.bits * 2}`,
            'Planificar estrategia de transición',
            'Mantener opciones de migración'
        ];
    } else if (algoData.quantum_risk === 'none') {
        quantumResistance.recommendations = [
            `✅ ${algorithm} es resistente a computación cuántica`,
            'Mantener implementación actual',
            'Monitorear avances en criptoanálisis cuántico'
        ];
    } else {
        quantumResistance.recommendations = [
            'Considerar actualización a versiones más seguras',
            'Implementar medidas de mitigación',
            'Evaluar riesgos específicos'
        ];
    }
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Algoritmo: ${quantumResistance.algorithm}`);
    console.log(`   Tipo: ${quantumResistance.type}`);
    console.log(`   Bits: ${quantumResistance.bits}`);
    console.log(`   Riesgo cuántico: ${quantumResistance.quantum_risk}`);
    console.log(`   Score de resistencia: ${quantumResistance.resistance_score}%`);
    console.log(`   Año estimado de compromiso: ${quantumResistance.estimated_break_year}`);
    console.log(`   Ataques vulnerables: ${quantumResistance.vulnerable_attacks.length > 0 ? quantumResistance.vulnerable_attacks.join(', ') : 'Ninguno'}`);
    
    if (quantumResistance.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        quantumResistance.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(PQC_DIR, `pqc_${algorithm}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(quantumResistance, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return quantumResistance;
}

function compareAlgorithms(algorithms) {
    console.log(`🔮 Comparando algoritmos: ${algorithms}`);
    
    const config = loadConfig();
    const algoList = algorithms ? algorithms.split(',') : ['RSA-2048', 'ECC-256', 'AES-256', 'Kyber-512'];
    const allAlgos = config.algorithms;
    
    const comparison = {
        algorithms: [],
        timestamp: new Date().toISOString(),
        summary: {
            total: 0,
            quantum_resistant: 0,
            vulnerable: 0,
            average_resistance: 0
        }
    };
    
    let totalResistance = 0;
    
    for (const algo of algoList) {
        if (!allAlgos[algo]) {
            console.warn(`⚠️ Algoritmo "${algo}" no encontrado. Opciones: ${Object.keys(allAlgos).join(', ')}`);
            continue;
        }
        
        const data = allAlgos[algo];
        const riskWeights = { none: 0, low: 20, medium: 50, high: 80, critical: 100 };
        const riskScore = riskWeights[data.quantum_risk] || 0;
        const resistance = 100 - riskScore;
        
        comparison.algorithms.push({
            name: algo,
            type: data.type,
            bits: data.bits,
            quantum_risk: data.quantum_risk,
            resistance_score: resistance,
            estimated_break: data.estimated_break,
            quantum_resistant: data.quantum_risk === 'none'
        });
        
        comparison.summary.total++;
        if (data.quantum_risk === 'none') comparison.summary.quantum_resistant++;
        else comparison.summary.vulnerable++;
        totalResistance += resistance;
    }
    
    comparison.summary.average_resistance = Math.round(totalResistance / comparison.summary.total);
    
    console.log(`\n📊 Resultados de comparacion:`);
    console.log(`   Algoritmos analizados: ${comparison.summary.total}`);
    console.log(`   🛡️ Resistentes a cuántica: ${comparison.summary.quantum_resistant}`);
    console.log(`   ⚠️ Vulnerables: ${comparison.summary.vulnerable}`);
    console.log(`   Score promedio: ${comparison.summary.average_resistance}%`);
    
    console.log(`\n📋 Detalle por algoritmo:`);
    comparison.algorithms.forEach(a => {
        const icon = a.quantum_resistant ? '🛡️' : '⚠️';
        console.log(`   ${icon} ${a.name} (${a.type}) - Resistencia: ${a.resistance_score}% - Break: ${a.estimated_break}`);
    });
    
    const outputPath = outputFile || path.join(PQC_DIR, `pqc_compare_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(comparison, null, 2));
    console.log(`\n📄 Comparacion guardada: ${outputPath}`);
    
    return comparison;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de seguridad post-cuántica en formato ${format}`);
    
    const files = fs.readdirSync(PQC_DIR).filter(f => f.startsWith('pqc_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --analyze o --compare primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(PQC_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generatePQCHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `pqc_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generatePQCHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔮 Post-Quantum Security Report</title>
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
        .resistant { color: #00ff00; }
        .vulnerable { color: #dc3545; }
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
        <h1>🔮 Post-Quantum Security Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Algoritmos:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Algoritmos Analizados</h2>
        ${data.map(d => {
            if (d.algorithm) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">🔐 ${d.algorithm}</h3>
                        <p>Resistencia: ${d.resistance_score}% | Riesgo: ${d.quantum_risk}</p>
                        <p class="${d.quantum_risk === 'none' ? 'resistant' : 'vulnerable'}">${d.quantum_risk === 'none' ? '🛡️ Resistente' : '⚠️ Vulnerable'}</p>
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
    console.log(`🔮 Post-Quantum Crypto Analyzer - MFH TOOLS PRO`);
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
            if (!algorithmName) {
                console.error('❌ Debes especificar --algorithm');
                process.exit(1);
            }
            analyzeAlgorithm(algorithmName);
            break;
            
        case 'compare':
            compareAlgorithms(compareList);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --compare, --report, --init');
            break;
    }
    
    console.log('\n✅ Post-Quantum Crypto Analyzer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Post-Quantum Crypto Analyzer...');
    process.exit(0);
});
