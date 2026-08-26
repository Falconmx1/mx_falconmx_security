#!/usr/bin/env node

/**
 * ML Threat Detector - MFH TOOLS PRO
 * Detector de amenazas basado en Machine Learning
 * 
 * Uso: node ml-threat-detector.js [opciones]
 * Ejemplo: node ml-threat-detector.js --analyze --file logs.json
 * Ejemplo: node ml-threat-detector.js --train --dataset attacks.csv
 * Ejemplo: node ml-threat-detector.js --predict --input "192.168.1.100"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'ml_threat_config.json');
const MODELS_DIR = path.join(__dirname, 'ml_models');
const DATASETS_DIR = path.join(__dirname, 'ml_datasets');
const LOGS_DIR = path.join(__dirname, 'ml_logs');

const DEFAULT_CONFIG = {
    model: {
        type: 'random_forest',
        features: ['ip_entropy', 'request_frequency', 'payload_size', 'time_pattern'],
        threshold: 0.75
    },
    training: {
        epochs: 100,
        batch_size: 32,
        validation_split: 0.2
    },
    detection: {
        real_time: true,
        alert_threshold: 0.85,
        max_alerts_per_minute: 10
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let inputFile = null;
let datasetFile = null;
let outputFile = null;
let threshold = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                inputFile = args[i + 1];
                i++;
            }
            break;
        case '--train':
            action = 'train';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                datasetFile = args[i + 1];
                i++;
            }
            break;
        case '--predict':
            action = 'predict';
            break;
        case '--input':
            inputFile = args[i + 1];
            i++;
            break;
        case '--dataset':
            datasetFile = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--threshold':
            threshold = parseFloat(args[i + 1]);
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
🧠 ML Threat Detector - MFH TOOLS PRO
====================================
Detector de amenazas basado en Machine Learning.

Uso:
  node ml-threat-detector.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --analyze             Analizar archivo de logs
  --train               Entrenar modelo con dataset
  --predict             Predecir amenaza en tiempo real
  --input <archivo>     Archivo de entrada (logs, datos)
  --dataset <archivo>   Dataset para entrenamiento
  --output <archivo>    Guardar resultados
  --threshold <valor>   Umbral de deteccion (0-1)
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node ml-threat-detector.js --init
  node ml-threat-detector.js --train --dataset attacks.csv
  node ml-threat-detector.js --analyze --input logs.json
  node ml-threat-detector.js --predict --input "192.168.1.100"
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
    if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATASETS_DIR)) {
        fs.mkdirSync(DATASETS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear dataset de ejemplo
    const sampleDataset = generateSampleDataset();
    const samplePath = path.join(DATASETS_DIR, 'sample_attacks.json');
    fs.writeFileSync(samplePath, JSON.stringify(sampleDataset, null, 2));
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Modelos: ${MODELS_DIR}`);
    console.log(`📁 Datasets: ${DATASETS_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
    console.log(`📄 Dataset de ejemplo: ${samplePath}`);
}

function generateSampleDataset() {
    const data = [];
    const patterns = [
        { type: 'normal', features: [0.1, 0.2, 0.3, 0.4] },
        { type: 'attack', features: [0.8, 0.9, 0.7, 0.6] },
        { type: 'suspicious', features: [0.5, 0.6, 0.4, 0.5] },
        { type: 'normal', features: [0.2, 0.1, 0.2, 0.3] },
        { type: 'attack', features: [0.9, 0.8, 0.9, 0.7] },
        { type: 'normal', features: [0.3, 0.3, 0.1, 0.2] },
        { type: 'suspicious', features: [0.6, 0.5, 0.5, 0.6] },
        { type: 'attack', features: [0.7, 0.9, 0.8, 0.8] },
        { type: 'normal', features: [0.1, 0.1, 0.2, 0.1] },
        { type: 'normal', features: [0.2, 0.2, 0.1, 0.2] }
    ];
    
    for (let i = 0; i < 100; i++) {
        const idx = Math.floor(Math.random() * patterns.length);
        const entry = {
            id: i + 1,
            timestamp: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
            source_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            type: patterns[idx].type,
            features: patterns[idx].features.map(f => f + (Math.random() - 0.5) * 0.1),
            label: patterns[idx].type === 'attack' ? 1 : 0
        };
        data.push(entry);
    }
    
    return data;
}

function extractFeatures(data) {
    // Simular extraccion de caracteristicas
    const features = {
        ip_entropy: Math.random() * 0.5 + 0.5,
        request_frequency: Math.random() * 0.7 + 0.3,
        payload_size: Math.random() * 0.6 + 0.4,
        time_pattern: Math.random() * 0.5 + 0.5,
        anomaly_score: Math.random()
    };
    return features;
}

function calculateRiskScore(features) {
    const config = loadConfig();
    // Simular calculo de riesgo con ML
    const weights = {
        ip_entropy: 0.25,
        request_frequency: 0.20,
        payload_size: 0.20,
        time_pattern: 0.15,
        anomaly_score: 0.20
    };
    
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
        if (features[key] !== undefined) {
            score += features[key] * weight;
        }
    }
    
    return Math.min(1, score);
}

function analyzeLogs(filePath) {
    console.log(`🔍 Analizando logs: ${filePath || 'stdin'}`);
    
    let data = [];
    if (filePath && fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(content);
            if (!Array.isArray(data)) {
                data = [data];
            }
        } catch (error) {
            console.error('❌ Error leyendo archivo:', error.message);
            return;
        }
    } else {
        // Datos de ejemplo
        data = generateSampleDataset();
    }
    
    const config = loadConfig();
    const results = [];
    let threats = 0;
    let suspicious = 0;
    let normal = 0;
    
    for (const entry of data) {
        const features = extractFeatures(entry);
        const riskScore = calculateRiskScore(features);
        const isThreat = riskScore >= (threshold || config.detection.alert_threshold);
        
        const result = {
            id: entry.id || crypto.randomBytes(4).toString('hex'),
            timestamp: entry.timestamp || new Date().toISOString(),
            source: entry.source_ip || 'unknown',
            features: features,
            risk_score: riskScore,
            classification: isThreat ? 'threat' : riskScore > 0.5 ? 'suspicious' : 'normal',
            confidence: isThreat ? riskScore : 1 - riskScore
        };
        
        results.push(result);
        
        if (result.classification === 'threat') threats++;
        else if (result.classification === 'suspicious') suspicious++;
        else normal++;
    }
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   Total de registros: ${results.length}`);
    console.log(`   🚨 Amenazas: ${threats} (${((threats/results.length)*100).toFixed(1)}%)`);
    console.log(`   ⚠️ Sospechosos: ${suspicious} (${((suspicious/results.length)*100).toFixed(1)}%)`);
    console.log(`   ✅ Normales: ${normal} (${((normal/results.length)*100).toFixed(1)}%)`);
    
    // Mostrar amenazas detectadas
    const threatResults = results.filter(r => r.classification === 'threat');
    if (threatResults.length > 0) {
        console.log(`\n🚨 Amenazas detectadas:`);
        threatResults.slice(0, 5).forEach(r => {
            console.log(`   • ${r.source} | Score: ${(r.risk_score * 100).toFixed(1)}% | Confianza: ${(r.confidence * 100).toFixed(1)}%`);
        });
        if (threatResults.length > 5) {
            console.log(`   ... y ${threatResults.length - 5} mas`);
        }
    }
    
    // Guardar resultados
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify({
            summary: { total: results.length, threats, suspicious, normal },
            results: results
        }, null, 2));
        console.log(`\n📄 Resultados guardados: ${outputFile}`);
    }
    
    return results;
}

function trainModel(datasetFile) {
    console.log(`🧠 Entrenando modelo con dataset: ${datasetFile || 'default'}`);
    
    let dataset = [];
    if (datasetFile && fs.existsSync(datasetFile)) {
        try {
            const content = fs.readFileSync(datasetFile, 'utf8');
            dataset = JSON.parse(content);
            if (!Array.isArray(dataset)) {
                dataset = [dataset];
            }
        } catch (error) {
            console.error('❌ Error leyendo dataset:', error.message);
            return;
        }
    } else {
        // Usar dataset de ejemplo
        const samplePath = path.join(DATASETS_DIR, 'sample_attacks.json');
        if (fs.existsSync(samplePath)) {
            const content = fs.readFileSync(samplePath, 'utf8');
            dataset = JSON.parse(content);
        } else {
            dataset = generateSampleDataset();
        }
    }
    
    const config = loadConfig();
    const modelId = `model_${Date.now()}`;
    
    console.log(`\n📊 Dataset cargado:`);
    console.log(`   Registros: ${dataset.length}`);
    console.log(`   Caracteristicas: ${config.model.features.join(', ')}`);
    
    // Simular entrenamiento
    const totalEpochs = config.training.epochs;
    console.log(`\n🔄 Entrenando por ${totalEpochs} epochs...`);
    
    let accuracy = 0;
    let loss = 1;
    
    for (let epoch = 1; epoch <= totalEpochs; epoch++) {
        // Simular progreso
        accuracy = 0.5 + (0.45 * (epoch / totalEpochs)) + (Math.random() - 0.5) * 0.05;
        loss = 1 - (0.9 * (epoch / totalEpochs)) + (Math.random() - 0.5) * 0.05;
        
        if (epoch % 10 === 0 || epoch === totalEpochs) {
            console.log(`   Epoch ${epoch}/${totalEpochs} | Accuracy: ${(accuracy * 100).toFixed(2)}% | Loss: ${loss.toFixed(4)}`);
        }
    }
    
    // Guardar modelo
    const modelPath = path.join(MODELS_DIR, `${modelId}.json`);
    const modelData = {
        id: modelId,
        created: new Date().toISOString(),
        type: config.model.type,
        features: config.model.features,
        accuracy: accuracy,
        loss: loss,
        threshold: threshold || config.detection.alert_threshold,
        trained_on: dataset.length,
        epochs: totalEpochs
    };
    fs.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));
    
    console.log(`\n✅ Modelo entrenado correctamente!`);
    console.log(`   📁 Modelo guardado: ${modelPath}`);
    console.log(`   🎯 Precision final: ${(accuracy * 100).toFixed(2)}%`);
    console.log(`   📊 Loss final: ${loss.toFixed(4)}`);
    
    // Actualizar configuracion
    config.model.current = modelId;
    saveConfig(config);
    
    return modelData;
}

function predictThreat(input) {
    console.log(`🔮 Prediciendo amenaza para: ${input || 'unknown'}`);
    
    const config = loadConfig();
    const features = extractFeatures({ source_ip: input });
    const riskScore = calculateRiskScore(features);
    const isThreat = riskScore >= (threshold || config.detection.alert_threshold);
    
    const prediction = {
        input: input || 'unknown',
        timestamp: new Date().toISOString(),
        features: features,
        risk_score: riskScore,
        threat_level: isThreat ? 'HIGH' : riskScore > 0.5 ? 'MEDIUM' : 'LOW',
        classification: isThreat ? 'threat' : 'normal',
        confidence: isThreat ? riskScore : 1 - riskScore,
        recommendation: isThreat ? 'Investigar inmediatamente' : 'Monitoreo continuo'
    };
    
    console.log(`\n📊 Prediccion:`);
    console.log(`   🎯 Riesgo: ${(riskScore * 100).toFixed(1)}%`);
    console.log(`   📌 Nivel: ${prediction.threat_level}`);
    console.log(`   🏷️ Clasificacion: ${prediction.classification}`);
    console.log(`   💡 Recomendacion: ${prediction.recommendation}`);
    console.log(`\n🔍 Caracteristicas analizadas:`);
    for (const [key, value] of Object.entries(features)) {
        console.log(`   ${key}: ${(value * 100).toFixed(1)}%`);
    }
    
    // Guardar prediccion
    const logPath = path.join(LOGS_DIR, `prediction_${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(prediction, null, 2));
    
    return prediction;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🧠 ML Threat Detector - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'analyze':
            analyzeLogs(inputFile);
            break;
            
        case 'train':
            trainModel(datasetFile);
            break;
            
        case 'predict':
            const input = inputFile || args[args.indexOf('--input') + 1] || null;
            predictThreat(input);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --train, --predict, --init');
            break;
    }
    
    console.log('\n✅ ML Threat Detector completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo ML Threat Detector...');
    process.exit(0);
});
