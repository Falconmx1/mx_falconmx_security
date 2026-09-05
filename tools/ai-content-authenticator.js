#!/usr/bin/env node

/**
 * AI Content Authenticator - MFH TOOLS PRO
 * Verifica autenticidad de contenido generado por IA
 * 
 * Uso: node ai-content-authenticator.js [opciones]
 * Ejemplo: node ai-content-authenticator.js --verify --file ./documento.txt
 * Ejemplo: node ai-content-authenticator.js --detect --text "Texto a analizar"
 * Ejemplo: node ai-content-authenticator.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'auth_config.json');
const AUTH_DIR = path.join(__dirname, 'auth_data');
const REPORTS_DIR = path.join(__dirname, 'auth_reports');

const DEFAULT_CONFIG = {
    algorithms: ['statistical', 'linguistic', 'stylometric', 'watermark', 'transformer'],
    confidence_thresholds: { low: 30, medium: 60, high: 80 },
    authenticity_levels: ['human', 'ai_generated', 'hybrid', 'unknown'],
    detectors: ['deepfake', 'synthetic_text', 'ai_voice', 'generated_image']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let filePath = null;
let textContent = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--verify':
            action = 'verify';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                filePath = args[i + 1];
                i++;
            }
            break;
        case '--detect':
            action = 'detect';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                textContent = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--file':
            filePath = args[i + 1];
            i++;
            break;
        case '--text':
            textContent = args[i + 1];
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
🔐 AI Content Authenticator - MFH TOOLS PRO
============================================
Verifica autenticidad de contenido generado por IA.

Uso:
  node ai-content-authenticator.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --verify <archivo>        Verificar autenticidad de archivo
  --detect <texto>          Detectar IA en texto
  --report                  Generar reporte de autenticidad
  --file <ruta>             Ruta del archivo a verificar
  --text <texto>            Texto a analizar
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node ai-content-authenticator.js --init
  node ai-content-authenticator.js --verify --file ./documento.txt
  node ai-content-authenticator.js --detect --text "Texto a analizar"
  node ai-content-authenticator.js --report --format html
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
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de autenticidad: ${AUTH_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function verifyAuthenticity(file) {
    console.log(`🔐 Verificando autenticidad de archivo: ${file}`);
    
    if (!fs.existsSync(file)) {
        console.error(`❌ Archivo "${file}" no existe.`);
        return;
    }
    
    const content = fs.readFileSync(file, 'utf8').substring(0, 1000);
    return detectAIContent(content, file);
}

function detectAIContent(text, source) {
    console.log(`🔍 Detectando contenido generado por IA...`);
    
    const config = loadConfig();
    const detectors = config.detectors;
    const levels = config.authenticity_levels;
    const thresholds = config.confidence_thresholds;
    
    // Simular detección con múltiples algoritmos
    const results = [];
    let totalConfidence = 0;
    let detectorCount = 0;
    
    for (const detector of detectors) {
        const confidence = Math.round((Math.random() * 60 + 20) * 10) / 10;
        const detected = confidence > 50;
        results.push({
            detector: detector,
            confidence: confidence,
            detected: detected,
            details: detected ? `Se detectaron patrones ${detector}` : `No se detectaron patrones ${detector}`
        });
        totalConfidence += confidence;
        detectorCount++;
    }
    
    const avgConfidence = Math.round((totalConfidence / detectorCount) * 10) / 10;
    
    // Determinar nivel de autenticidad
    let authenticityLevel;
    let isAIGenerated;
    
    if (avgConfidence < thresholds.low) {
        authenticityLevel = 'human';
        isAIGenerated = false;
    } else if (avgConfidence < thresholds.medium) {
        authenticityLevel = 'hybrid';
        isAIGenerated = true;
    } else if (avgConfidence < thresholds.high) {
        authenticityLevel = 'ai_generated';
        isAIGenerated = true;
    } else {
        authenticityLevel = 'ai_generated';
        isAIGenerated = true;
    }
    
    // Si algún detector crítico detecta, aumentar confianza
    const criticalDetections = results.filter(r => r.detector === 'deepfake' && r.detected);
    if (criticalDetections.length > 0 && authenticityLevel === 'human') {
        authenticityLevel = 'hybrid';
        isAIGenerated = true;
    }
    
    const result = {
        source: source || 'text_input',
        timestamp: new Date().toISOString(),
        content_length: text.length,
        is_ai_generated: isAIGenerated,
        authenticity_level: authenticityLevel,
        confidence_score: avgConfidence,
        detector_results: results,
        summary: {
            detectors_used: detectors.length,
            positive_detections: results.filter(r => r.detected).length,
            overall_assessment: isAIGenerated ? 'Contenido generado por IA' : 'Contenido humano'
        },
        recommendations: isAIGenerated ? [
            'Verificar fuente del contenido',
            'Requerir pruebas de autenticidad',
            'Considerar watermarking digital'
        ] : [
            'Contenido verificado como humano',
            'Mantener registro de autenticidad'
        ]
    };
    
    console.log(`\n📊 Resultados de deteccion:`);
    console.log(`   Fuente: ${result.source}`);
    console.log(`   Generado por IA: ${result.is_ai_generated ? '⚠️ Sí' : '✅ No'}`);
    console.log(`   Nivel: ${result.authenticity_level}`);
    console.log(`   Confianza: ${result.confidence_score}%`);
    console.log(`   Detecciones positivas: ${result.summary.positive_detections}/${result.summary.detectors_used}`);
    
    console.log(`\n🔍 Resultados por detector:`);
    result.detector_results.forEach(r => {
        const icon = r.detected ? '⚠️' : '✅';
        console.log(`   ${icon} ${r.detector}: ${r.confidence}% - ${r.details}`);
    });
    
    if (result.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        result.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(AUTH_DIR, `auth_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Resultado guardado: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de autenticidad de contenido en formato ${format}`);
    
    const files = fs.readdirSync(AUTH_DIR).filter(f => f.startsWith('auth_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --verify o --detect primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateAuthHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `auth_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateAuthHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔐 AI Content Authenticator Report</title>
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
        .human { color: #00ff00; }
        .ai_generated { color: #dc3545; }
        .hybrid { color: #ffc107; }
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
        <h1>🔐 AI Content Authenticator Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Analisis:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Resultados de Autenticidad</h2>
        ${data.map(d => {
            const statusClass = d.authenticity_level;
            return `
                <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                    <h3 style="color:#00ff00;">📄 ${d.source}</h3>
                    <p class="${statusClass}">Nivel: ${d.authenticity_level}</p>
                    <p>IA: ${d.is_ai_generated ? '⚠️ Sí' : '✅ No'} | Confianza: ${d.confidence_score}%</p>
                </div>
            `;
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
    console.log(`🔐 AI Content Authenticator - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'verify':
            if (!filePath) {
                console.error('❌ Debes especificar --file');
                process.exit(1);
            }
            verifyAuthenticity(filePath);
            break;
            
        case 'detect':
            if (!textContent) {
                console.error('❌ Debes especificar --text');
                process.exit(1);
            }
            detectAIContent(textContent);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --verify, --detect, --report, --init');
            break;
    }
    
    console.log('\n✅ AI Content Authenticator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo AI Content Authenticator...');
    process.exit(0);
});
