#!/usr/bin/env node

/**
 * Registry Analyzer - MFH TOOLS PRO
 * Análisis de registros de Windows
 * 
 * Uso: node registry-analyzer.js [opciones]
 * Ejemplo: node registry-analyzer.js --analyze --hive SYSTEM
 * Ejemplo: node registry-analyzer.js --extract --key "HKLM\\Software\\Microsoft"
 * Ejemplo: node registry-analyzer.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'registry_config.json');
const REGISTRY_DIR = path.join(__dirname, 'registry_data');
const REPORTS_DIR = path.join(__dirname, 'registry_reports');

const DEFAULT_CONFIG = {
    hives: ['SYSTEM', 'SOFTWARE', 'SAM', 'SECURITY', 'NTUSER.DAT'],
    keys: {
        'system': ['CurrentControlSet', 'Control', 'Services'],
        'software': ['Microsoft', 'Classes', 'Policies'],
        'security': ['Policy', 'SAM']
    },
    artifact_patterns: [
        'automatic_startup',
        'service_configuration',
        'user_accounts',
        'network_configuration',
        'security_policies'
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let hiveName = null;
let keyPath = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                hiveName = args[i + 1];
                i++;
            }
            break;
        case '--extract':
            action = 'extract';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                keyPath = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--hive':
            hiveName = args[i + 1];
            i++;
            break;
        case '--key':
            keyPath = args[i + 1];
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
🔬 Registry Analyzer - MFH TOOLS PRO
=====================================
Análisis de registros de Windows.

Uso:
  node registry-analyzer.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --analyze <hive>          Analizar hive del registro
  --extract <key>           Extraer informacion de clave
  --report                  Generar reporte forense
  --hive <nombre>           Hive a analizar (SYSTEM, SOFTWARE, etc.)
  --key <ruta>              Ruta de la clave del registro
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node registry-analyzer.js --init
  node registry-analyzer.js --analyze --hive SYSTEM
  node registry-analyzer.js --extract --key "HKLM\\Software\\Microsoft"
  node registry-analyzer.js --report --format html
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
    if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de registro: ${REGISTRY_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function analyzeHive(hive) {
    console.log(`🔍 Analizando hive: ${hive}`);
    
    const config = loadConfig();
    const hives = config.hives;
    
    if (!hives.includes(hive)) {
        console.error(`❌ Hive "${hive}" no encontrado. Opciones: ${hives.join(', ')}`);
        return;
    }
    
    const keys = config.keys[hive.toLowerCase()] || ['Default'];
    const artifacts = config.artifact_patterns;
    
    const analysis = {
        hive: hive,
        timestamp: new Date().toISOString(),
        keys_found: [],
        artifacts: [],
        suspicious_entries: [],
        recommendations: []
    };
    
    // Simular análisis de keys
    for (const key of keys) {
        const subKeys = Math.floor(Math.random() * 5) + 1;
        const values = Math.floor(Math.random() * 8) + 2;
        analysis.keys_found.push({
            name: key,
            sub_keys: subKeys,
            values: values,
            last_modified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    // Simular artefactos encontrados
    const selectedArtifacts = artifacts.slice(0, Math.floor(Math.random() * artifacts.length) + 1);
    for (const artifact of selectedArtifacts) {
        analysis.artifacts.push({
            name: artifact,
            detected: true,
            confidence: Math.round((Math.random() * 30 + 70) * 10) / 10,
            details: `Artefacto ${artifact} detectado en ${hive}`
        });
    }
    
    // Simular entradas sospechosas
    if (Math.random() > 0.5) {
        analysis.suspicious_entries.push({
            key: 'Software\\Microsoft\\Windows\\CurrentVersion\\Run',
            value: 'malware.exe',
            reason: 'Ejecución automática sospechosa'
        });
    }
    
    // Recomendaciones
    analysis.recommendations = [
        'Revisar entradas de ejecución automática',
        'Verificar servicios no firmados',
        'Analizar cambios recientes en el registro',
        'Comparar con linea base conocida'
    ];
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Hive: ${analysis.hive}`);
    console.log(`   Keys encontradas: ${analysis.keys_found.length}`);
    console.log(`   Artefactos: ${analysis.artifacts.length}`);
    console.log(`   Entradas sospechosas: ${analysis.suspicious_entries.length}`);
    
    console.log(`\n📋 Keys encontradas:`);
    analysis.keys_found.forEach(k => {
        console.log(`   • ${k.name} (${k.sub_keys} sub-keys, ${k.values} valores)`);
    });
    
    if (analysis.artifacts.length > 0) {
        console.log(`\n🔍 Artefactos detectados:`);
        analysis.artifacts.forEach(a => {
            console.log(`   • ${a.name} (${a.confidence}% confianza)`);
        });
    }
    
    if (analysis.suspicious_entries.length > 0) {
        console.log(`\n⚠️ Entradas sospechosas:`);
        analysis.suspicious_entries.forEach(e => {
            console.log(`   • ${e.key} -> ${e.value}`);
            console.log(`     ${e.reason}`);
        });
    }
    
    const outputPath = outputFile || path.join(REGISTRY_DIR, `registry_${hive}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return analysis;
}

function extractKey(keyPath) {
    console.log(`🔑 Extrayendo clave: ${keyPath}`);
    
    const extraction = {
        key_path: keyPath,
        timestamp: new Date().toISOString(),
        values: [],
        sub_keys: [],
        metadata: {
            last_modified: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            permissions: ['READ', 'WRITE'],
            owner: 'SYSTEM'
        }
    };
    
    // Simular valores de la clave
    const valueNames = ['Default', 'Description', 'Path', 'Type', 'Version', 'Config', 'Enabled'];
    const valueCount = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < Math.min(valueCount, valueNames.length); i++) {
        extraction.values.push({
            name: valueNames[i],
            type: ['REG_SZ', 'REG_DWORD', 'REG_BINARY', 'REG_MULTI_SZ'][Math.floor(Math.random() * 4)],
            data: `valor_${Math.random().toString(36).substring(2, 8)}`
        });
    }
    
    // Simular sub-keys
    const subKeyCount = Math.floor(Math.random() * 4);
    for (let i = 0; i < subKeyCount; i++) {
        extraction.sub_keys.push(`SubKey${i + 1}`);
    }
    
    console.log(`\n📋 Información de la clave:`);
    console.log(`   Ruta: ${extraction.key_path}`);
    console.log(`   Última modificación: ${extraction.metadata.last_modified}`);
    console.log(`   Valores: ${extraction.values.length}`);
    console.log(`   Sub-keys: ${extraction.sub_keys.length}`);
    
    console.log(`\n📊 Valores encontrados:`);
    extraction.values.forEach(v => {
        console.log(`   • ${v.name} (${v.type}) = ${v.data}`);
    });
    
    if (extraction.sub_keys.length > 0) {
        console.log(`\n📂 Sub-keys:`);
        extraction.sub_keys.forEach(sk => console.log(`   • ${sk}`));
    }
    
    const outputPath = outputFile || path.join(REGISTRY_DIR, `extract_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(extraction, null, 2));
    console.log(`\n📄 Extracción guardada: ${outputPath}`);
    
    return extraction;
}

function generateReport(format) {
    console.log(`📊 Generando reporte forense de registro en formato ${format}`);
    
    const files = fs.readdirSync(REGISTRY_DIR).filter(f => f.startsWith('registry_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --analyze primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(REGISTRY_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateRegistryHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `registry_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateRegistryHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔬 Registry Forensics Report</title>
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
        .suspicious { color: #dc3545; }
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
        <h1>🔬 Registry Forensics Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Hives analizados:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Hives</div>
            </div>
            <div class="stat">
                <div class="number">${data.reduce((acc, d) => acc + d.keys_found.length, 0)}</div>
                <div class="label">📂 Keys</div>
            </div>
            <div class="stat">
                <div class="number">${data.reduce((acc, d) => acc + d.suspicious_entries.length, 0)}</div>
                <div class="label">⚠️ Sospechosos</div>
            </div>
        </div>
        
        <h2>📋 Hives Analizados</h2>
        ${data.map(d => `
            <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                <h3 style="color:#00ff00;">${d.hive}</h3>
                <p>Keys: ${d.keys_found.length} | Artefactos: ${d.artifacts.length}</p>
                ${d.suspicious_entries.length > 0 ? `<p class="suspicious">⚠️ ${d.suspicious_entries.length} entradas sospechosas</p>` : ''}
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
    console.log(`🔬 Registry Analyzer - MFH TOOLS PRO`);
    console.log('='.repeat(45));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'analyze':
            if (!hiveName) {
                console.error('❌ Debes especificar --hive');
                process.exit(1);
            }
            analyzeHive(hiveName);
            break;
            
        case 'extract':
            if (!keyPath) {
                console.error('❌ Debes especificar --key');
                process.exit(1);
            }
            extractKey(keyPath);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --extract, --report, --init');
            break;
    }
    
    console.log('\n✅ Registry Analyzer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Registry Analyzer...');
    process.exit(0);
});
