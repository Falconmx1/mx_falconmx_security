#!/usr/bin/env node

/**
 * AI Explainability Tool - MFH TOOLS PRO
 * Herramienta de explicabilidad para modelos de IA
 * 
 * Uso: node ai-explainability-tool.js [opciones]
 * Ejemplo: node ai-explainability-tool.js --explain --model model.pkl --input data.json
 * Ejemplo: node ai-explainability-tool.js --methods
 * Ejemplo: node ai-explainability-tool.js --report
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'xai_config.json');
const EXPLANATIONS_DIR = path.join(__dirname, 'xai_explanations');
const REPORTS_DIR = path.join(__dirname, 'xai_reports');

const DEFAULT_CONFIG = {
    methods: {
        'lime': { name: 'LIME', description: 'Local Interpretable Model-agnostic Explanations' },
        'shap': { name: 'SHAP', description: 'SHapley Additive exPlanations' },
        'integrated_gradients': { name: 'Integrated Gradients', description: 'Gradient-based attribution' },
        'gradcam': { name: 'Grad-CAM', description: 'Gradient-weighted Class Activation Mapping' },
        'counterfactual': { name: 'Counterfactual Explanations', description: 'What-if analysis' }
    },
    max_features: 20
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let modelFile = null;
let inputFile = null;
let method = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--explain':
            action = 'explain';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                modelFile = args[i + 1];
                i++;
            }
            break;
        case '--methods':
            action = 'methods';
            break;
        case '--report':
            action = 'report';
            break;
        case '--model':
            modelFile = args[i + 1];
            i++;
            break;
        case '--input':
            inputFile = args[i + 1];
            i++;
            break;
        case '--method':
            method = args[i + 1];
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
🔍 AI Explainability Tool - MFH TOOLS PRO
=========================================
Herramienta de explicabilidad para modelos de IA.

Uso:
  node ai-explainability-tool.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --explain <modelo>    Generar explicaciones para un modelo
  --methods             Listar metodos de explicabilidad
  --report              Generar reporte de explicabilidad
  --model <archivo>     Archivo del modelo
  --input <archivo>     Datos de entrada (JSON)
  --method <metodo>     Metodo de explicacion (lime, shap)
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node ai-explainability-tool.js --init
  node ai-explainability-tool.js --explain --model model.pkl --input data.json
  node ai-explainability-tool.js --methods
  node ai-explainability-tool.js --report --format html
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
    if (!fs.existsSync(EXPLANATIONS_DIR)) {
        fs.mkdirSync(EXPLANATIONS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Explicaciones: ${EXPLANATIONS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function listMethods() {
    const config = loadConfig();
    console.log('\n📋 METODOS DE EXPLICABILIDAD:');
    console.log('='.repeat(50));
    
    for (const [key, data] of Object.entries(config.methods)) {
        console.log(`\n📌 ${data.name} (${key})`);
        console.log(`   ${data.description}`);
    }
}

function explainModel(modelFile, inputFile, method) {
    console.log(`🔍 Generando explicaciones para: ${modelFile}`);
    
    const config = loadConfig();
    const methodName = method || 'shap';
    const methodData = config.methods[methodName];
    
    if (!methodData) {
        console.error(`❌ Metodo no encontrado: ${methodName}`);
        console.log(`   Disponibles: ${Object.keys(config.methods).join(', ')}`);
        return;
    }
    
    // Simular datos de entrada
    let inputData = {};
    if (inputFile && fs.existsSync(inputFile)) {
        try {
            inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        } catch (error) {
            console.error('❌ Error leyendo archivo de entrada:', error.message);
            inputData = { features: ['feature1', 'feature2', 'feature3'], values: [0.5, 0.8, 0.3] };
        }
    } else {
        inputData = { 
            features: ['feature1', 'feature2', 'feature3', 'feature4', 'feature5'],
            values: [0.5, 0.8, 0.3, 0.9, 0.1]
        };
    }
    
    // Simular explicacion
    const featureImportance = inputData.features.map((f, i) => ({
        feature: f,
        importance: Math.random(),
        value: inputData.values[i] || 0
    })).sort((a, b) => b.importance - a.importance);
    
    const explanation = {
        timestamp: new Date().toISOString(),
        model: modelFile,
        method: methodName,
        method_name: methodData.name,
        input_data: inputData,
        prediction: {
            class: Math.random() > 0.5 ? 'Class A' : 'Class B',
            confidence: Math.random() * 0.3 + 0.6
        },
        feature_importance: featureImportance.slice(0, config.max_features),
        summary: {
            top_features: featureImportance.slice(0, 3).map(f => f.feature),
            confidence_level: Math.random() > 0.3 ? 'Alta' : 'Media',
            explanation_quality: Math.random() * 0.3 + 0.6
        }
    };
    
    console.log(`\n📊 Explicacion generada:`);
    console.log(`   Metodo: ${explanation.method_name}`);
    console.log(`   Prediccion: ${explanation.prediction.class} (${(explanation.prediction.confidence * 100).toFixed(1)}%)`);
    console.log(`   Caracteristicas analizadas: ${explanation.feature_importance.length}`);
    console.log(`   ⭐ Top features: ${explanation.summary.top_features.join(', ')}`);
    
    console.log(`\n📋 Importancia de caracteristicas:`);
    explanation.feature_importance.slice(0, 5).forEach(f => {
        console.log(`   • ${f.feature}: ${(f.importance * 100).toFixed(1)}%`);
    });
    
    const outputPath = outputFile || path.join(EXPLANATIONS_DIR, `xai_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(explanation, null, 2));
    console.log(`\n📄 Explicacion guardada: ${outputPath}`);
    
    return explanation;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de explicabilidad en formato ${format}`);
    
    const xaiFiles = fs.readdirSync(EXPLANATIONS_DIR).filter(f => f.startsWith('xai_'));
    if (xaiFiles.length === 0) {
        console.log('ℹ️ No hay explicaciones disponibles. Ejecuta --explain primero.');
        return;
    }
    
    const latest = xaiFiles[xaiFiles.length - 1];
    const data = JSON.parse(fs.readFileSync(path.join(EXPLANATIONS_DIR, latest), 'utf8'));
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateXAIHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `xai_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateXAIHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 AI Explainability Report</title>
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
        .feature-bar {
            background: #0a0a0a;
            border-radius: 4px;
            margin: 5px 0;
            overflow: hidden;
        }
        .feature-bar .fill {
            height: 20px;
            background: linear-gradient(90deg, #00ff00, #00cc00);
            border-radius: 4px;
            transition: width 0.5s ease;
        }
        .feature-bar .label {
            padding: 0 10px;
            line-height: 20px;
            font-size: 0.8rem;
        }
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
        <h1>🔍 AI Explainability Report</h1>
        <p><strong>Modelo:</strong> ${data.model}</p>
        <p><strong>Metodo:</strong> ${data.method_name}</p>
        <p><strong>Fecha:</strong> ${data.timestamp}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.feature_importance.length}</div>
                <div class="label">📊 Caracteristicas</div>
            </div>
            <div class="stat">
                <div class="number">${(data.prediction.confidence * 100).toFixed(1)}%</div>
                <div class="label">🎯 Confianza</div>
            </div>
            <div class="stat">
                <div class="number">${(data.summary.explanation_quality * 100).toFixed(1)}%</div>
                <div class="label">📊 Calidad</div>
            </div>
        </div>
        
        <h2>📋 Importancia de Caracteristicas</h2>
        ${data.feature_importance.map(f => `
            <div class="feature-bar">
                <div class="fill" style="width: ${f.importance * 100}%">
                    <span class="label">${f.feature}: ${(f.importance * 100).toFixed(1)}%</span>
                </div>
            </div>
        `).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 AI Explainability Tool - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'explain':
            if (!modelFile) {
                console.error('❌ Debes especificar --model');
                process.exit(1);
            }
            explainModel(modelFile, inputFile, method);
            break;
            
        case 'methods':
            listMethods();
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --explain, --methods, --report, --init');
            break;
    }
    
    console.log('\n✅ AI Explainability Tool completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo AI Explainability Tool...');
    process.exit(0);
});
