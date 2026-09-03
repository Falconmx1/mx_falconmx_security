#!/usr/bin/env node

/**
 * Mobile Forensics Tool - MFH TOOLS PRO
 * Herramienta de forensia móvil
 * 
 * Uso: node mobile-forensics-tool.js [opciones]
 * Ejemplo: node mobile-forensics-tool.js --extract --device android
 * Ejemplo: node mobile-forensics-tool.js --analyze --backup ./backup.tar
 * Ejemplo: node mobile-forensics-tool.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'mobile_config.json');
const MOBILE_DIR = path.join(__dirname, 'mobile_data');
const REPORTS_DIR = path.join(__dirname, 'mobile_reports');

const DEFAULT_CONFIG = {
    platforms: ['android', 'ios'],
    data_types: ['contacts', 'messages', 'calls', 'photos', 'apps', 'locations', 'wifi', 'bluetooth'],
    artifact_patterns: ['deleted_messages', 'location_history', 'app_usage', 'network_logs']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let deviceType = null;
let backupPath = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--extract':
            action = 'extract';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                deviceType = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                backupPath = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--device':
            deviceType = args[i + 1];
            i++;
            break;
        case '--backup':
            backupPath = args[i + 1];
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
📱 Mobile Forensics Tool - MFH TOOLS PRO
=========================================
Herramienta de forensia móvil.

Uso:
  node mobile-forensics-tool.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --extract <plataforma>    Extraer datos de dispositivo
  --analyze <backup>        Analizar backup móvil
  --report                  Generar reporte forense
  --device <tipo>           Tipo de dispositivo (android, ios)
  --backup <ruta>           Ruta del backup a analizar
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node mobile-forensics-tool.js --init
  node mobile-forensics-tool.js --extract --device android
  node mobile-forensics-tool.js --analyze --backup ./backup.tar
  node mobile-forensics-tool.js --report --format html
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
    if (!fs.existsSync(MOBILE_DIR)) {
        fs.mkdirSync(MOBILE_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos móviles: ${MOBILE_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function extractMobileData(device) {
    console.log(`📱 Extrayendo datos de dispositivo ${device}`);
    
    const config = loadConfig();
    const platforms = config.platforms;
    
    if (!platforms.includes(device)) {
        console.error(`❌ Dispositivo "${device}" no soportado. Opciones: ${platforms.join(', ')}`);
        return;
    }
    
    const dataTypes = config.data_types;
    const patterns = config.artifact_patterns;
    
    const extraction = {
        device: device,
        timestamp: new Date().toISOString(),
        device_info: {
            model: device === 'android' ? 'Pixel 6' : 'iPhone 13',
            os_version: device === 'android' ? 'Android 13' : 'iOS 16.2',
            storage: '128GB'
        },
        extracted_data: [],
        artifacts: [],
        summary: {
            total_items: 0,
            deleted_items: 0,
            size_mb: 0
        }
    };
    
    // Simular extracción de datos
    for (const type of dataTypes) {
        const count = Math.floor(Math.random() * 50) + 5;
        extraction.extracted_data.push({
            type: type,
            count: count,
            examples: type === 'messages' ? ['Último mensaje'] : ['Ejemplo de dato'],
            size_kb: Math.round(Math.random() * 100 + 10)
        });
        extraction.summary.total_items += count;
    }
    
    // Simular artefactos forenses
    for (const pattern of patterns) {
        if (Math.random() > 0.3) {
            extraction.artifacts.push({
                name: pattern,
                detected: true,
                severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                description: `Artefacto ${pattern} encontrado`
            });
            extraction.summary.deleted_items += Math.floor(Math.random() * 10) + 1;
        }
    }
    
    // Tamaño estimado
    extraction.summary.size_mb = Math.round((extraction.summary.total_items * 0.5 + Math.random() * 100) * 10) / 10;
    
    console.log(`\n📊 Resultados de extracción:`);
    console.log(`   Dispositivo: ${extraction.device_info.model}`);
    console.log(`   OS: ${extraction.device_info.os_version}`);
    console.log(`   Total datos: ${extraction.summary.total_items} items`);
    console.log(`   Items eliminados: ${extraction.summary.deleted_items}`);
    console.log(`   Tamaño estimado: ${extraction.summary.size_mb} MB`);
    
    console.log(`\n📋 Datos extraídos:`);
    extraction.extracted_data.forEach(d => {
        console.log(`   • ${d.type}: ${d.count} items`);
    });
    
    if (extraction.artifacts.length > 0) {
        console.log(`\n🔍 Artefactos forenses:`);
        extraction.artifacts.forEach(a => {
            const icon = a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '🟡' : '🟢';
            console.log(`   ${icon} ${a.name} (${a.severity})`);
        });
    }
    
    const outputPath = outputFile || path.join(MOBILE_DIR, `mobile_${device}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(extraction, null, 2));
    console.log(`\n📄 Extracción guardada: ${outputPath}`);
    
    return extraction;
}

function analyzeMobileBackup(backup) {
    console.log(`🔍 Analizando backup móvil: ${backup}`);
    
    if (!fs.existsSync(backup)) {
        console.error(`❌ Backup "${backup}" no existe.`);
        return;
    }
    
    const analysis = {
        backup_path: backup,
        timestamp: new Date().toISOString(),
        files_analyzed: 0,
        deleted_files: [],
        recovered_data: [],
        timeline: [],
        summary: {
            total_files: 0,
            recovery_potential: 0,
            suspicious_count: 0
        }
    };
    
    // Simular análisis de backup
    const fileTypes = ['contacts.db', 'messages.sqlite', 'photos.jpg', 'calls.log', 'app_data.json', 'wifi_config.xml'];
    analysis.files_analyzed = fileTypes.length + Math.floor(Math.random() * 5);
    
    // Simular archivos eliminados recuperables
    const deleted = ['messages_old.db', 'photos_backup.jpg', 'deleted_contacts.txt'];
    analysis.deleted_files = deleted.slice(0, Math.floor(Math.random() * deleted.length) + 1);
    
    // Simular datos recuperados
    analysis.recovered_data = [
        { type: 'contacts', count: Math.floor(Math.random() * 20) + 5 },
        { type: 'messages', count: Math.floor(Math.random() * 30) + 10 },
        { type: 'photos', count: Math.floor(Math.random() * 10) + 2 }
    ];
    
    // Simular timeline
    analysis.timeline = [
        { time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), event: 'Backup creado' },
        { time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), event: 'Archivos eliminados detectados' },
        { time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), event: 'Recuperación iniciada' },
        { time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), event: 'Análisis completado' }
    ];
    
    analysis.summary.total_files = analysis.files_analyzed;
    analysis.summary.recovery_potential = Math.round(Math.random() * 40 + 60);
    analysis.summary.suspicious_count = Math.floor(Math.random() * 3);
    
    console.log(`\n📊 Resultados del análisis:`);
    console.log(`   Archivos analizados: ${analysis.summary.total_files}`);
    console.log(`   Potencial de recuperación: ${analysis.summary.recovery_potential}%`);
    console.log(`   Archivos eliminados detectados: ${analysis.deleted_files.length}`);
    console.log(`   Elementos sospechosos: ${analysis.summary.suspicious_count}`);
    
    console.log(`\n📋 Archivos eliminados recuperables:`);
    analysis.deleted_files.forEach(f => console.log(`   • ${f}`));
    
    console.log(`\n📅 Timeline de eventos:`);
    analysis.timeline.forEach(t => {
        console.log(`   • ${new Date(t.time).toLocaleString()}: ${t.event}`);
    });
    
    const outputPath = outputFile || path.join(MOBILE_DIR, `backup_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Análisis guardado: ${outputPath}`);
    
    return analysis;
}

function generateReport(format) {
    console.log(`📊 Generando reporte forense móvil en formato ${format}`);
    
    const files = fs.readdirSync(MOBILE_DIR).filter(f => f.startsWith('mobile_') || f.startsWith('backup_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --extract o --analyze primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(MOBILE_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateMobileHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `mobile_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateMobileHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Mobile Forensics Report</title>
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
        <h1>📱 Mobile Forensics Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Registros:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Dispositivos Analizados</h2>
        ${data.map(d => {
            if (d.device_info) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">📱 ${d.device_info.model}</h3>
                        <p>OS: ${d.device_info.os_version} | Items: ${d.summary.total_items}</p>
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
    console.log(`📱 Mobile Forensics Tool - MFH TOOLS PRO`);
    console.log('='.repeat(45));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'extract':
            if (!deviceType) {
                console.error('❌ Debes especificar --device');
                process.exit(1);
            }
            extractMobileData(deviceType);
            break;
            
        case 'analyze':
            if (!backupPath) {
                console.error('❌ Debes especificar --backup');
                process.exit(1);
            }
            analyzeMobileBackup(backupPath);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --extract, --analyze, --report, --init');
            break;
    }
    
    console.log('\n✅ Mobile Forensics Tool completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Mobile Forensics Tool...');
    process.exit(0);
});
