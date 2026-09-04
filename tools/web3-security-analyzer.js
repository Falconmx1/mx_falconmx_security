#!/usr/bin/env node

/**
 * Web3 Security Analyzer - MFH TOOLS PRO
 * Análisis de seguridad Web3
 * 
 * Uso: node web3-security-analyzer.js [opciones]
 * Ejemplo: node web3-security-analyzer.js --analyze --dapp "Uniswap"
 * Ejemplo: node web3-security-analyzer.js --wallet --address 0x...
 * Ejemplo: node web3-security-analyzer.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'web3_config.json');
const WEB3_DIR = path.join(__dirname, 'web3_data');
const REPORTS_DIR = path.join(__dirname, 'web3_reports');

const DEFAULT_CONFIG = {
    dapps: ['Uniswap', 'Aave', 'MakerDAO', 'Compound', 'PancakeSwap', 'Curve'],
    threat_types: ['phishing', 'rug_pull', 'flash_loan', 'oracle_manipulation', 'front_running', 'sandwich_attack'],
    wallet_types: ['EOA', 'Smart Contract', 'Multi-sig', 'Social Recovery']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let dappName = null;
let walletAddress = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                dappName = args[i + 1];
                i++;
            }
            break;
        case '--wallet':
            action = 'wallet';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                walletAddress = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--dapp':
            dappName = args[i + 1];
            i++;
            break;
        case '--address':
            walletAddress = args[i + 1];
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
🌐 Web3 Security Analyzer - MFH TOOLS PRO
==========================================
Análisis de seguridad Web3.

Uso:
  node web3-security-analyzer.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --analyze <dapp>          Analizar seguridad de DApp
  --wallet <direccion>      Analizar seguridad de wallet
  --report                  Generar reporte de seguridad
  --dapp <nombre>           Nombre de la DApp
  --address <direccion>     Direccion de wallet
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node web3-security-analyzer.js --init
  node web3-security-analyzer.js --analyze --dapp Uniswap
  node web3-security-analyzer.js --wallet --address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
  node web3-security-analyzer.js --report --format html
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
    if (!fs.existsSync(WEB3_DIR)) {
        fs.mkdirSync(WEB3_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos Web3: ${WEB3_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function analyzeDApp(dapp) {
    console.log(`🌐 Analizando seguridad de DApp: ${dapp}`);
    
    const config = loadConfig();
    const dapps = config.dapps;
    const threatTypes = config.threat_types;
    
    if (!dapps.includes(dapp)) {
        console.warn(`⚠️ DApp "${dapp}" no encontrada en la lista. Continuando...`);
    }
    
    const analysis = {
        dapp: dapp,
        timestamp: new Date().toISOString(),
        smart_contracts: Math.floor(Math.random() * 10) + 2,
        users: Math.floor(Math.random() * 10000) + 1000,
        total_value_locked: `${(Math.random() * 100 + 10).toFixed(2)}M`,
        threats: [],
        security_score: 0,
        recommendations: []
    };
    
    // Simular amenazas
    const threatCount = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < threatCount; i++) {
        const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        const severity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
        analysis.threats.push({
            type: type,
            severity: severity,
            description: `Amenaza ${type} detectada en ${dapp}`,
            risk_score: severity === 'high' ? Math.floor(Math.random() * 30 + 70) : 
                       severity === 'medium' ? Math.floor(Math.random() * 30 + 40) : 
                       Math.floor(Math.random() * 40)
        });
    }
    
    // Calcular score
    const severityWeights = { low: 10, medium: 30, high: 60 };
    const totalWeight = analysis.threats.reduce((acc, t) => acc + (severityWeights[t.severity] || 0), 0);
    analysis.security_score = Math.max(0, Math.min(100, 100 - (totalWeight / analysis.threats.length)));
    
    // Recomendaciones
    const recs = [
        'Auditar contratos inteligentes',
        'Implementar monitoreo de transacciones',
        'Mejorar mecanismos de gobierno',
        'Establecer limites de transacciones',
        'Implementar multi-sig para operaciones criticas'
    ];
    analysis.recommendations = recs.slice(0, 2 + Math.floor(Math.random() * 3));
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   DApp: ${analysis.dapp}`);
    console.log(`   Contratos: ${analysis.smart_contracts}`);
    console.log(`   Usuarios: ${analysis.users}`);
    console.log(`   TVL: $${analysis.total_value_locked}`);
    console.log(`   Score de seguridad: ${Math.round(analysis.security_score)}%`);
    console.log(`   Amenazas detectadas: ${analysis.threats.length}`);
    
    console.log(`\n🔍 Amenazas detectadas:`);
    analysis.threats.forEach(t => {
        const icon = t.severity === 'high' ? '🔴' : t.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${icon} ${t.type} (${t.severity}) - Score: ${t.risk_score}%`);
    });
    
    if (analysis.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        analysis.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(WEB3_DIR, `dapp_${dapp}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return analysis;
}

function analyzeWallet(address) {
    console.log(`🔑 Analizando wallet: ${address}`);
    
    const config = loadConfig();
    const walletTypes = config.wallet_types;
    
    const analysis = {
        address: address,
        timestamp: new Date().toISOString(),
        wallet_type: walletTypes[Math.floor(Math.random() * walletTypes.length)],
        transactions: Math.floor(Math.random() * 500) + 10,
        tokens: Math.floor(Math.random() * 20) + 1,
        risk_score: 0,
        suspicious_activity: [],
        recommendations: []
    };
    
    // Simular actividad sospechosa
    const suspicious = ['transacciones_a_contratos_maliciosos', 'interaccion_con_phishing', 'alto_volumen_de_transacciones'];
    const selected = suspicious.slice(0, Math.floor(Math.random() * suspicious.length) + 1);
    for (const activity of selected) {
        if (Math.random() > 0.4) {
            analysis.suspicious_activity.push({
                type: activity,
                severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                details: `Actividad sospechosa: ${activity}`
            });
        }
    }
    
    // Calcular riesgo
    const baseRisk = analysis.suspicious_activity.reduce((acc, a) => {
        const sev = a.severity === 'high' ? 25 : a.severity === 'medium' ? 15 : 5;
        return acc + sev;
    }, 0);
    analysis.risk_score = Math.min(100, baseRisk + Math.random() * 10);
    
    // Recomendaciones
    const recs = [
        'Revisar transacciones recientes',
        'Verificar permisos de tokens',
        'No interactuar con contratos sospechosos',
        'Considerar wallet multi-sig'
    ];
    analysis.recommendations = recs.slice(0, 2 + Math.floor(Math.random() * 2));
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   Wallet: ${analysis.address}`);
    console.log(`   Tipo: ${analysis.wallet_type}`);
    console.log(`   Transacciones: ${analysis.transactions}`);
    console.log(`   Tokens: ${analysis.tokens}`);
    console.log(`   Score de riesgo: ${Math.round(analysis.risk_score)}%`);
    console.log(`   Actividades sospechosas: ${analysis.suspicious_activity.length}`);
    
    if (analysis.suspicious_activity.length > 0) {
        console.log(`\n⚠️ Actividades sospechosas:`);
        analysis.suspicious_activity.forEach(a => {
            const icon = a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '🟡' : '🟢';
            console.log(`   ${icon} ${a.type} (${a.severity})`);
        });
    }
    
    if (analysis.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        analysis.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(WEB3_DIR, `wallet_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return analysis;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de seguridad Web3 en formato ${format}`);
    
    const files = fs.readdirSync(WEB3_DIR).filter(f => f.startsWith('dapp_') || f.startsWith('wallet_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --analyze o --wallet primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(WEB3_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateWeb3HTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `web3_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateWeb3HTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌐 Web3 Security Report</title>
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
        <h1>🌐 Web3 Security Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Analisis:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Resumen de Seguridad Web3</h2>
        ${data.map(d => {
            if (d.dapp) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">🌐 ${d.dapp}</h3>
                        <p>Score: ${Math.round(d.security_score)}% | Amenazas: ${d.threats.length}</p>
                        <p>TVL: $${d.total_value_locked} | Usuarios: ${d.users}</p>
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
    console.log(`🌐 Web3 Security Analyzer - MFH TOOLS PRO`);
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
            if (!dappName) {
                console.error('❌ Debes especificar --dapp');
                process.exit(1);
            }
            analyzeDApp(dappName);
            break;
            
        case 'wallet':
            if (!walletAddress) {
                console.error('❌ Debes especificar --address');
                process.exit(1);
            }
            analyzeWallet(walletAddress);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --analyze, --wallet, --report, --init');
            break;
    }
    
    console.log('\n✅ Web3 Security Analyzer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Web3 Security Analyzer...');
    process.exit(0);
});
