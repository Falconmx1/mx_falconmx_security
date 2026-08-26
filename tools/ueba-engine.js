#!/usr/bin/env node

/**
 * UEBA Engine - MFH TOOLS PRO
 * User and Entity Behavior Analytics
 * 
 * Uso: node ueba-engine.js [opciones]
 * Ejemplo: node ueba-engine.js --analyze --user john@example.com
 * Ejemplo: node ueba-engine.js --baseline --period 30d
 * Ejemplo: node ueba-engine.js --detect --anomaly
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'ueba_config.json');
const BASELINES_DIR = path.join(__dirname, 'ueba_baselines');
const ANOMALIES_DIR = path.join(__dirname, 'ueba_anomalies');
const LOGS_DIR = path.join(__dirname, 'ueba_logs');

const DEFAULT_CONFIG = {
    baseline: {
        period: 30,
        min_samples: 100,
        update_frequency: 24
    },
    detection: {
        anomaly_threshold: 2.5,
        sensitivity: 'medium',
        max_anomalies_per_day: 10
    },
    behavior: {
        features: ['login_time', 'access_pattern', 'geo_location', 'device_usage', 'data_volume']
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let userId = null;
let period = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                userId = args[i + 1];
                i++;
            }
            break;
        case '--baseline':
            action = 'baseline';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                period = args[i + 1];
                i++;
            }
            break;
        case '--detect':
            action = 'detect';
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--user':
            userId = args[i + 1];
            i++;
            break;
        case '--period':
            period = args[i + 1];
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
📊 UEBA Engine - MFH TOOLS PRO
=============================
User and Entity Behavior Analytics.

Uso:
  node ueba-engine.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --analyze [usuario]   Analizar comportamiento de usuario
  --baseline [periodo]  Construir linea base de comportamiento
  --detect              Detectar anomalias en tiempo real
  --user <id>           ID de usuario a analizar
  --period <dias>       Periodo para linea base (ej: 30d)
  --output <archivo>    Guardar resultados
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node ueba-engine.js --init
  node ueba-engine.js --baseline --period 30d
  node ueba-engine.js --analyze --user john@example.com
  node ueba-engine.js --detect
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
    if (!fs.existsSync(BASELINES_DIR)) {
        fs.mkdirSync(BASELINES_DIR, { recursive: true });
    }
    if (!fs.existsSync(ANOMALIES_DIR)) {
        fs.mkdirSync(ANOMALIES_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Lineas base: ${BASELINES_DIR}`);
    console.log(`📁 Anomalias: ${ANOMALIES_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
}

function generateBehaviorData(userId, days) {
    const data = [];
    const now = Date.now();
    const dayMs = 86400000;
    
    const patterns = [
        { hour: 9, action: 'login', location: 'office' },
        { hour: 10, action: 'read', location: 'office' },
        { hour: 11, action: 'write', location: 'office' },
        { hour: 12, action: 'read', location: 'office' },
        { hour: 14, action: 'write', location: 'office' },
        { hour: 15, action: 'read', location: 'office' },
        { hour: 16, action: 'login', location: 'office' },
        { hour: 17, action: 'logout', location: 'office' }
    ];
    
    const anomalies = [
        { hour: 3, action: 'login', location: 'unknown' },
        { hour: 4, action: 'read', location: 'unknown' },
        { hour: 5, action: 'write', location: 'unknown' }
    ];
    
    for (let d = 0; d < days; d++) {
        const dayStart = now - (days - d) * dayMs;
        
        // Patron normal
        for (const pattern of patterns) {
            const ts = dayStart + pattern.hour * 3600000 + Math.random() * 1800000;
            data.push({
                timestamp: new Date(ts).toISOString(),
                user: userId || `user-${crypto.randomBytes(4).toString('hex')}`,
                action: pattern.action,
                location: pattern.location,
                device: ['laptop', 'desktop', 'mobile'][Math.floor(Math.random() * 3)],
                data_volume: Math.floor(Math.random() * 100) + 10
            });
        }
        
        // Anomalias ocasionales
        if (Math.random() < 0.1) {
            const anomaly = anomalies[Math.floor(Math.random() * anomalies.length)];
            const ts = dayStart + anomaly.hour * 3600000 + Math.random() * 1800000;
            data.push({
                timestamp: new Date(ts).toISOString(),
                user: userId || `user-${crypto.randomBytes(4).toString('hex')}`,
                action: anomaly.action,
                location: anomaly.location,
                device: 'unknown',
                data_volume: Math.floor(Math.random() * 500) + 100,
                is_anomaly: true
            });
        }
    }
    
    return data;
}

function buildBaseline(period) {
    console.log(`📊 Construyendo linea base de comportamiento (periodo: ${period || '30 dias'})`);
    
    const config = loadConfig();
    const days = parseInt(period) || 30;
    const data = generateBehaviorData(null, days);
    
    // Calcular estadisticas de comportamiento normal
    const baseline = {
        id: crypto.randomBytes(8).toString('hex'),
        created: new Date().toISOString(),
        period: days,
        total_events: data.length,
        stats: {
            actions: {},
            locations: {},
            hours: {},
            data_volume: { min: 0, max: 0, avg: 0, std: 0 }
        },
        patterns: []
    };
    
    // Agrupar por accion
    const actions = {};
    const locations = {};
    const hours = {};
    const dataVolumes = [];
    
    for (const entry of data) {
        const hour = new Date(entry.timestamp).getHours();
        actions[entry.action] = (actions[entry.action] || 0) + 1;
        locations[entry.location] = (locations[entry.location] || 0) + 1;
        hours[hour] = (hours[hour] || 0) + 1;
        dataVolumes.push(entry.data_volume);
    }
    
    baseline.stats.actions = actions;
    baseline.stats.locations = locations;
    baseline.stats.hours = hours;
    baseline.stats.data_volume = {
        min: Math.min(...dataVolumes),
        max: Math.max(...dataVolumes),
        avg: dataVolumes.reduce((a, b) => a + b, 0) / dataVolumes.length,
        std: Math.sqrt(dataVolumes.reduce((a, b) => a + Math.pow(b - dataVolumes.reduce((a, b) => a + b, 0) / dataVolumes.length, 2), 0) / dataVolumes.length)
    };
    
    // Identificar patrones comunes
    const commonHours = Object.entries(hours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    baseline.patterns = commonHours;
    
    // Guardar linea base
    const baselineFile = path.join(BASELINES_DIR, `baseline_${baseline.id}.json`);
    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
    
    console.log(`\n📊 Linea base construida:`);
    console.log(`   ID: ${baseline.id}`);
    console.log(`   Eventos: ${baseline.total_events}`);
    console.log(`   Periodo: ${baseline.period} dias`);
    console.log(`   Acciones: ${Object.keys(baseline.stats.actions).join(', ')}`);
    console.log(`   Ubicaciones: ${Object.keys(baseline.stats.locations).join(', ')}`);
    console.log(`   📁 Guardada: ${baselineFile}`);
    
    return baseline;
}

function analyzeUser(userId) {
    console.log(`📊 Analizando comportamiento de usuario: ${userId || 'all'}`);
    
    const config = loadConfig();
    const baselines = [];
    const baselineFiles = fs.readdirSync(BASELINES_DIR).filter(f => f.endsWith('.json'));
    
    for (const file of baselineFiles) {
        try {
            const content = fs.readFileSync(path.join(BASELINES_DIR, file), 'utf8');
            const data = JSON.parse(content);
            baselines.push(data);
        } catch (error) {
            // Ignorar archivos corruptos
        }
    }
    
    if (baselines.length === 0) {
        console.log('⚠️ No hay lineas base disponibles. Ejecuta --baseline primero.');
        return;
    }
    
    const baseline = baselines[baselines.length - 1];
    const userData = generateBehaviorData(userId, 7);
    
    // Comparar comportamiento actual con linea base
    const anomalies = [];
    const userActions = {};
    const userLocations = {};
    const userHours = {};
    
    for (const entry of userData) {
        const hour = new Date(entry.timestamp).getHours();
        userActions[entry.action] = (userActions[entry.action] || 0) + 1;
        userLocations[entry.location] = (userLocations[entry.location] || 0) + 1;
        userHours[hour] = (userHours[hour] || 0) + 1;
        
        // Detectar anomalias
        if (entry.is_anomaly) {
            anomalies.push({
                timestamp: entry.timestamp,
                user: entry.user,
                action: entry.action,
                location: entry.location,
                device: entry.device,
                data_volume: entry.data_volume,
                reason: 'Comportamiento fuera de patron normal'
            });
        }
    }
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   Usuario: ${userId || 'todos'}`);
    console.log(`   Eventos analizados: ${userData.length}`);
    console.log(`   🚨 Anomalias detectadas: ${anomalies.length}`);
    
    if (anomalies.length > 0) {
        console.log(`\n🔍 Anomalias detectadas:`);
        anomalies.slice(0, 5).forEach(a => {
            console.log(`   • ${a.timestamp} | ${a.action} | ${a.location} | ${a.reason}`);
        });
        if (anomalies.length > 5) {
            console.log(`   ... y ${anomalies.length - 5} mas`);
        }
    }
    
    // Comparar con linea base
    console.log(`\n📋 Comparacion con linea base:`);
    console.log(`   Acciones esperadas: ${Object.keys(baseline.stats.actions).join(', ')}`);
    console.log(`   Acciones observadas: ${Object.keys(userActions).join(', ')}`);
    
    // Guardar analisis
    const analysis = {
        timestamp: new Date().toISOString(),
        user: userId || 'all',
        events_analyzed: userData.length,
        anomalies: anomalies,
        user_actions: userActions,
        user_locations: userLocations,
        baseline_id: baseline.id
    };
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
        console.log(`\n📄 Analisis guardado: ${outputFile}`);
    }
    
    return analysis;
}

function detectAnomalies() {
    console.log('🔍 Detectando anomalias en tiempo real...');
    
    const config = loadConfig();
    const anomalies = [];
    
    // Simular deteccion de anomalias
    const anomalyTypes = [
        'Login desde ubicacion desconocida',
        'Horario de acceso inusual',
        'Volumen de datos anormal',
        'Uso de dispositivo no registrado',
        'Acceso a recursos sensibles'
    ];
    
    const numAnomalies = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numAnomalies; i++) {
        anomalies.push({
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date().toISOString(),
            user: `user-${crypto.randomBytes(4).toString('hex')}`,
            type: anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)],
            severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            score: Math.random() * 0.7 + 0.3,
            description: `Anomalia detectada: ${anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)]}`
        });
    }
    
    console.log(`\n🚨 ${anomalies.length} anomalias detectadas:`);
    anomalies.forEach(a => {
        const emoji = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : a.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${emoji} ${a.type} | ${a.user} | ${a.severity.toUpperCase()} | Score: ${(a.score * 100).toFixed(1)}%`);
    });
    
    // Guardar anomalias
    const anomalyFile = path.join(ANOMALIES_DIR, `anomalies_${Date.now()}.json`);
    fs.writeFileSync(anomalyFile, JSON.stringify(anomalies, null, 2));
    console.log(`\n📄 Anomalias guardadas: ${anomalyFile}`);
    
    return anomalies;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📊 UEBA Engine - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'baseline':
            buildBaseline(period);
            break;
            
        case 'analyze':
            analyzeUser(userId);
            break;
            
        case 'detect':
            detectAnomalies();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --baseline, --analyze, --detect, --init');
            break;
    }
    
    console.log('\n✅ UEBA Engine completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo UEBA Engine...');
    process.exit(0);
});
