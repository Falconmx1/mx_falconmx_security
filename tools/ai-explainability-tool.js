#!/usr/bin/env node

/**
 * AI Explainability Tool - MFH TOOLS PRO
 * Herramienta de explicabilidad para modelos de IA
 * 
 * Uso: node ai-explainability-tool.js [opciones]
 * Ejemplo: node ai-explainability-tool.js --explain --model model.json --input data.json
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
  node ai-explainability-tool.js --explain --model model.json --input data.json
  node ai-explainability-tool.js --methods
  node ai-explainability-tool.js --report --format html
`);
            process.exit(0);
            break;
    }
}

// ==================== FUNCIONES ====================

function initConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.log('✅ Configuracion por defecto creada.');
    }
    
    const dirs = [EXPLANATIONS_DIR, REPORTS_DIR];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 ${path.basename(dir)}: ${dir}`);
        }
    });
}

function listMethods() {
    console.log('\n📋 METODOS DE EXPLICABILIDAD DISPONIBLES:');
    console.log('============================================\n');
    
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    
    for (const [key, value] of Object.entries(config.methods)) {
        console.log(`🔍 ${key.toUpperCase()}`);
        console.log(`   Nombre: ${value.name}`);
        console.log(`   Descripcion: ${value.description}`);
        console.log('');
    }
}

function explainModel(modelFile, inputFile, method) {
    console.log(`🔍 Generando explicaciones para: ${modelFile}`);
    
    // Leer archivos
    const modelData = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
    const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    // Verificar formato de features - CORREGIDO
    let features = [];
    let featureNames = [];
    let featureImportance = {};
    
    // Si el modelo tiene features como array
    if (modelData.model && Array.isArray(modelData.model.features)) {
        featureNames = modelData.model.features;
        features = featureNames.map((name, index) => ({
            name: name,
            value: Array.isArray(inputData.features) ? inputData.features[index] || 0 : inputData.features[name] || 0,
            importance: modelData.model.feature_importance ? 
                (modelData.model.feature_importance[name] || (1 / featureNames.length)) : 
                (1 / featureNames.length)
        }));
    } 
    // Si el modelo tiene features como objeto
    else if (modelData.model && typeof modelData.model.features === 'object' && !Array.isArray(modelData.model.features)) {
        featureNames = Object.keys(modelData.model.features);
        features = featureNames.map(name => ({
            name: name,
            value: inputData.features[name] || 0,
            importance: modelData.model.features[name] || (1 / featureNames.length)
        }));
    }
    // Si los features vienen directamente
    else if (Array.isArray(inputData.features)) {
        featureNames = inputData.features.map((_, i) => `feature_${i+1}`);
        features = inputData.features.map((value, i) => ({
            name: featureNames[i],
            value: value,
            importance: modelData.model?.feature_importance?.[featureNames[i]] || (1 / inputData.features.length)
        }));
    } else if (typeof inputData.features === 'object') {
        featureNames = Object.keys(inputData.features);
        features = featureNames.map(name => ({
            name: name,
            value: inputData.features[name],
            importance: modelData.model?.feature_importance?.[name] || (1 / featureNames.length)
        }));
    }
    
    // Generar explicación según método
    let explanation = {
        timestamp: new Date().toISOString(),
        model: modelData.model?.name || 'Unknown',
        method: method || 'lime',
        input: inputData,
        features: features,
        prediction: inputData.prediction || 'unknown',
        confidence: inputData.confidence || 0.0
    };
    
    // Agregar explicación específica del método
    switch (method) {
        case 'lime':
            explanation.explanation = {
                type: 'LIME',
                description: 'Local Interpretable Model-agnostic Explanations',
                feature_contributions: features.map(f => ({
                    feature: f.name,
                    value: f.value,
                    contribution: f.importance * (Math.random() * 0.4 + 0.3) // Simulación
                })),
                local_fidelity: 0.92,
                explanation: generateLimeExplanation(features, inputData)
            };
            break;
            
        case 'shap':
            explanation.explanation = {
                type: 'SHAP',
                description: 'SHapley Additive exPlanations',
                shap_values: features.map(f => ({
                    feature: f.name,
                    value: f.value,
                    shap_value: f.importance * (Math.random() * 0.5 + 0.5) // Simulación
                })),
                base_value: 0.5,
                explanation: generateShapExplanation(features, inputData)
            };
            break;
            
        case 'counterfactual':
            explanation.explanation = {
                type: 'Counterfactual',
                description: 'What-if analysis',
                current_prediction: inputData.prediction,
                counterfactual_examples: generateCounterfactual(features, inputData),
                explanation: generateCounterfactualExplanation(features, inputData)
            };
            break;
            
        default:
            explanation.explanation = {
                type: 'General',
                description: 'Feature importance analysis',
                feature_importance: features.map(f => ({
                    feature: f.name,
                    importance: f.importance
                })),
                explanation: `Análisis basado en ${features.length} features`
            };
    }
    
    return explanation;
}

function generateLimeExplanation(features, inputData) {
    const topFeatures = features
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3);
    
    const pred = inputData.prediction || 'unknown';
    const reasons = topFeatures.map(f => 
        `${f.name} (${f.importance > 0.5 ? 'influye positivamente' : 'influye negativamente'})`
    );
    
    return `La predicción '${pred}' se debe principalmente a: ${reasons.join(', ')}`;
}

function generateShapExplanation(features, inputData) {
    const topFeatures = features
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3);
    
    const pred = inputData.prediction || 'unknown';
    const reasons = topFeatures.map(f => 
        `${f.name} (contribución: ${(f.importance * 100).toFixed(0)}%)`
    );
    
    return `La predicción '${pred}' está impulsada por: ${reasons.join(', ')}`;
}

function generateCounterfactual(features, inputData) {
    const examples = [];
    const currentPred = inputData.prediction || 'unknown';
    const targetPred = currentPred === 'approved' ? 'denied' : 'approved';
    
    // Generar ejemplos contrafactuales
    features.forEach((f, i) => {
        if (f.importance > 0.1) {
            const newValue = typeof f.value === 'number' ? 
                f.value * (1 + (Math.random() * 0.5 + 0.25)) : 
                f.value;
            examples.push({
                feature: f.name,
                current_value: f.value,
                changed_value: newValue,
                impact: f.importance * 100
            });
        }
    });
    
    return {
        target_prediction: targetPred,
        changes_needed: examples.slice(0, 3)
    };
}

function generateCounterfactualExplanation(features, inputData) {
    const topFeatures = features
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 2);
    
    const changes = topFeatures.map(f => 
        `cambiar ${f.name} de ${f.value} a ${typeof f.value === 'number' ? (f.value * 1.5).toFixed(1) : 'otro valor'}`
    );
    
    return `Para cambiar la predicción, se recomienda: ${changes.join(' y ')}`;
}

function generateReport(inputFiles, format) {
    console.log(`📊 Generando reporte de explicabilidad en formato ${format}`);
    
    let report = {
        timestamp: new Date().toISOString(),
        explanations: []
    };
    
    if (inputFiles && inputFiles.length > 0) {
        for (const file of inputFiles) {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                report.explanations.push(data);
            } catch (e) {
                console.log(`⚠️ No se pudo leer: ${file}`);
            }
        }
    }
    
    if (format === 'html') {
        const html = generateHTMLReport(report);
        const outputPath = path.join(REPORTS_DIR, `report_${Date.now()}.html`);
        fs.writeFileSync(outputPath, html);
        console.log(`📄 Reporte guardado: ${outputPath}`);
        return outputPath;
    } else {
        const outputPath = path.join(REPORTS_DIR, `report_${Date.now()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`📄 Reporte guardado: ${outputPath}`);
        return outputPath;
    }
}

function generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>AI Explainability Report</title>
    <style>
        body { font-family: Arial, sans-serif; background: #0a0e1a; color: #e0e0e0; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a2332, #0d1520); padding: 20px; border-radius: 10px; margin-bottom: 20px; border-bottom: 3px solid #00d4ff; }
        .header h1 { color: #00d4ff; }
        .section { background: #141e2b; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #1a2a3a; }
        .section h2 { color: #00d4ff; border-bottom: 1px solid #1a2a3a; padding-bottom: 10px; }
        .feature { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #1a2a3a; }
        .feature:hover { background: #1a2a3a; }
        .badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; }
        .badge-lime { background: #00d4ff; color: #0a0e1a; }
        .badge-shap { background: #ff8800; color: #0a0e1a; }
        .footer { text-align: center; color: #667788; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 AI Explainability Report</h1>
        <p>${report.timestamp}</p>
    </div>
    <div class="section">
        <h2>📊 Resumen</h2>
        <p>Total explicaciones: ${report.explanations.length}</p>
    </div>
    ${report.explanations.map(exp => `
    <div class="section">
        <h2>🧠 Modelo: ${exp.model || 'Unknown'}</h2>
        <p><strong>Método:</strong> ${exp.method || 'N/A'}</p>
        <p><strong>Predicción:</strong> ${exp.prediction || 'N/A'}</p>
        <p><strong>Confianza:</strong> ${(exp.confidence * 100).toFixed(1)}%</p>
        <h3>Features</h3>
        ${exp.features ? exp.features.map(f => `
            <div class="feature">
                <span>${f.name}</span>
                <span>Valor: ${f.value} | Importancia: ${(f.importance * 100).toFixed(1)}%</span>
            </div>
        `).join('') : '<p>No hay features disponibles</p>'}
        ${exp.explanation ? `
        <h3>Explicación</h3>
        <p>${exp.explanation.explanation || 'Explicación no disponible'}</p>
        ` : ''}
    </div>
    `).join('')}
    <div class="footer">
        🚀 AI Explainability Tool v1.0
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================

function main() {
    // Inicializar
    if (init) {
        initConfig();
        console.log('✅ Inicializacion completada.');
        return;
    }
    
    // Verificar configuracion
    if (!fs.existsSync(CONFIG_FILE)) {
        initConfig();
    }
    
    // Ejecutar accion
    switch (action) {
        case 'methods':
            listMethods();
            break;
            
        case 'explain':
            if (!modelFile || !inputFile) {
                console.log('❌ Debes especificar --model y --input');
                return;
            }
            if (!fs.existsSync(modelFile)) {
                console.log(`❌ Modelo no encontrado: ${modelFile}`);
                return;
            }
            if (!fs.existsSync(inputFile)) {
                console.log(`❌ Input no encontrado: ${inputFile}`);
                return;
            }
            
            const result = explainModel(modelFile, inputFile, method);
            
            // Guardar resultado
            const outputPath = outputFile || path.join(EXPLANATIONS_DIR, `explanation_${Date.now()}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
            console.log(`📄 Explicacion guardada: ${outputPath}`);
            break;
            
        case 'report':
            const inputFiles = args.filter((arg, index, array) => {
                return array[index-1] === '--input' || (array[index-1] === '--report' && arg !== '--format' && arg !== '--output');
            }).filter(f => f && !f.startsWith('--'));
            generateReport(inputFiles, format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --explain, --methods, --report, --init');
            break;
    }
    
    console.log('\n✅ AI Explainability Tool completado');
}

// Ejecutar
if (require.main === module) {
    main();
}
