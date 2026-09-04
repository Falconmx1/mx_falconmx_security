#!/usr/bin/env node

/**
 * Quantum Key Distribution (QKD) - MFH TOOLS PRO
 * Distribución de llaves cuánticas
 * 
 * Uso: node quantum-key-distribution.js [opciones]
 * Ejemplo: node quantum-key-distribution.js --generate --protocol BB84
 * Ejemplo: node quantum-key-distribution.js --exchange --alice --bob
 * Ejemplo: node quantum-key-distribution.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'qkd_config.json');
const QKD_DIR = path.join(__dirname, 'qkd_data');
const REPORTS_DIR = path.join(__dirname, 'qkd_reports');

const DEFAULT_CONFIG = {
    protocols: ['BB84', 'E91', 'B92', 'BBM92', 'SARG04'],
    bases: ['rectilinear', 'diagonal', 'circular'],
    security_levels: ['standard', 'high', 'quantum_safe'],
    key_lengths: [128, 256, 512, 1024]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let protocol = 'BB84';
let keyLength = 256;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--generate':
            action = 'generate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                protocol = args[i + 1];
                i++;
            }
            break;
        case '--exchange':
            action = 'exchange';
            break;
        case '--report':
            action = 'report';
            break;
        case '--protocol':
            protocol = args[i + 1];
            i++;
            break;
        case '--keylength':
            keyLength = parseInt(args[i + 1]) || 256;
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
🔐 Quantum Key Distribution - MFH TOOLS PRO
============================================
Distribución de llaves cuánticas.

Uso:
  node quantum-key-distribution.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --generate <protocolo>    Generar llave cuántica
  --exchange                Simular intercambio cuántico
  --report                  Generar reporte QKD
  --protocol <nombre>       Protocolo (BB84, E91, B92, BBM92, SARG04)
  --keylength <bits>        Longitud de llave (128, 256, 512, 1024)
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node quantum-key-distribution.js --init
  node quantum-key-distribution.js --generate --protocol BB84
  node quantum-key-distribution.js --exchange
  node quantum-key-distribution.js --report --format html
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
    if (!fs.existsSync(QKD_DIR)) {
        fs.mkdirSync(QKD_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos QKD: ${QKD_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generateQuantumKey(protocol) {
    console.log(`🔐 Generando llave cuántica con protocolo: ${protocol}`);
    
    const config = loadConfig();
    const protocols = config.protocols;
    
    if (!protocols.includes(protocol)) {
        console.error(`❌ Protocolo "${protocol}" no encontrado. Opciones: ${protocols.join(', ')}`);
        return;
    }
    
    const bases = config.bases;
    const levels = config.security_levels;
    
    // Simular generación de llave cuántica
    const key = crypto.randomBytes(Math.ceil(keyLength / 8)).toString('hex').slice(0, keyLength);
    const basis = bases[Math.floor(Math.random() * bases.length)];
    const securityLevel = levels[Math.floor(Math.random() * levels.length)];
    
    // Simular tasa de error cuántico (QBER)
    const qber = (Math.random() * 5 + 0.1).toFixed(2);
    const eavesdroppingDetected = parseFloat(qber) > 3.5;
    
    const result = {
        protocol: protocol,
        timestamp: new Date().toISOString(),
        key: key,
        key_length: keyLength,
        basis: basis,
        security_level: securityLevel,
        qber: `${qber}%`,
        eavesdropping_detected: eavesdroppingDetected,
        key_rate: `${(Math.random() * 100 + 50).toFixed(1)} kbps`,
        distance_km: (Math.random() * 200 + 10).toFixed(1),
        status: eavesdroppingDetected ? 'compromised' : 'secure',
        recommendations: []
    };
    
    // Recomendaciones
    if (eavesdroppingDetected) {
        result.recommendations = [
            'Detectada posible escucha cuantica',
            'Descartar llave y regenerar',
            'Verificar integridad del canal',
            'Considerar protocolo mas robusto'
        ];
    } else {
        result.recommendations = [
            'Llave generada exitosamente',
            'Adecuada para comunicaciones seguras',
            'Monitorear continuamente el QBER'
        ];
    }
    
    console.log(`\n📊 Resultados de generacion:`);
    console.log(`   Protocolo: ${result.protocol}`);
    console.log(`   Longitud: ${result.key_length} bits`);
    console.log(`   Base: ${result.basis}`);
    console.log(`   Nivel de seguridad: ${result.security_level}`);
    console.log(`   QBER: ${result.qber}`);
    console.log(`   Distancia: ${result.distance_km} km`);
    console.log(`   Estado: ${result.status === 'secure' ? '✅ Segura' : '⚠️ Comprometida'}`);
    console.log(`   Llave: ${result.key}`);
    
    if (result.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        result.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(QKD_DIR, `qkd_${protocol}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Llave guardada: ${outputPath}`);
    
    return result;
}

function simulateExchange() {
    console.log('🔄 Simulando intercambio cuántico Alice ↔ Bob');
    console.log('='.repeat(50));
    
    const config = loadConfig();
    const protocols = config.protocols;
    const selectedProtocol = protocols[Math.floor(Math.random() * protocols.length)];
    
    // Simular fotones enviados
    const photons = Math.floor(Math.random() * 1000) + 500;
    const detected = Math.floor(photons * (Math.random() * 0.3 + 0.6));
    const matchedBases = Math.floor(detected * (Math.random() * 0.3 + 0.6));
    const errors = Math.floor(matchedBases * (Math.random() * 0.1));
    const qber = ((errors / matchedBases) * 100).toFixed(2);
    
    const exchange = {
        protocol: selectedProtocol,
        timestamp: new Date().toISOString(),
        alice: {
            photons_sent: photons,
            basis_used: ['rectilinear', 'diagonal'][Math.floor(Math.random() * 2)]
        },
        bob: {
            photons_detected: detected,
            basis_used: ['rectilinear', 'diagonal'][Math.floor(Math.random() * 2)]
        },
        results: {
            total_photons: photons,
            detected: detected,
            matched_bases: matchedBases,
            errors: errors,
            qber: `${qber}%`,
            key_rate: `${(Math.random() * 50 + 20).toFixed(1)} kbps`
        },
        security: {
            eavesdropping_detected: parseFloat(qber) > 4,
            privacy_amplification: parseFloat(qber) < 3 ? 'Aplicada' : 'No aplicada',
            key_length_generated: Math.floor(matchedBases * 0.8)
        },
        status: parseFloat(qber) > 4 ? 'warning' : 'success'
    };
    
    console.log(`\n📊 Resultados del intercambio:`);
    console.log(`   Protocolo: ${exchange.protocol}`);
    console.log(`   Fotones totales: ${exchange.results.total_photons}`);
    console.log(`   Detectados: ${exchange.results.detected}`);
    console.log(`   Bases coincidentes: ${exchange.results.matched_bases}`);
    console.log(`   Errores: ${exchange.results.errors}`);
    console.log(`   QBER: ${exchange.results.qber}`);
    console.log(`   Tasa de llave: ${exchange.results.key_rate}`);
    console.log(`   Escuchas detectadas: ${exchange.security.eavesdropping_detected ? '⚠️ Sí' : '✅ No'}`);
    console.log(`   Llave generada: ${exchange.security.key_length_generated} bits`);
    console.log(`   Estado: ${exchange.status === 'success' ? '✅ Exitoso' : '⚠️ Con advertencias'}`);
    
    const outputPath = outputFile || path.join(QKD_DIR, `qkd_exchange_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(exchange, null, 2));
    console.log(`\n📄 Intercambio guardado: ${outputPath}`);
    
    return exchange;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de QKD en formato ${format}`);
    
    const files = fs.readdirSync(QKD_DIR).filter(f => f.startsWith('qkd_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --generate o --exchange primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(QKD_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateQKDHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `qkd_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateQKDHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔐 Quantum Key Distribution Report</title>
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
        .secure { color: #00ff00; }
        .compromised { color: #dc3545; }
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
        <h1>🔐 Quantum Key Distribution Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Registros:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Llaves Generadas</h2>
        ${data.map(d => {
            if (d.protocol && d.key) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">🔐 ${d.protocol}</h3>
                        <p class="${d.status}">Estado: ${d.status}</p>
                        <p>Longitud: ${d.key_length} bits | QBER: ${d.qber}</p>
                        <p>Llave: <code style="color:#00ff00;font-size:0.8rem;">${d.key}</code></p>
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
    console.log(`🔐 Quantum Key Distribution - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'generate':
            generateQuantumKey(protocol);
            break;
            
        case 'exchange':
            simulateExchange();
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --generate, --exchange, --report, --init');
            break;
    }
    
    console.log('\n✅ Quantum Key Distribution completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Quantum Key Distribution...');
    process.exit(0);
});
